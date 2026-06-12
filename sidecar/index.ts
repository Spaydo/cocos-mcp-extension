#!/usr/bin/env node
/**
 * Cocos MCP sidecar：標準 MCP server（stdio transport）。
 * 由 MCP 客戶端（Claude Code / Cursor 等）啟動。
 *
 * 專案定位（支援一條 user-scope 設定通用所有專案）：
 *   1. --project <path> / COCOS_MCP_PROJECT（固定指定）
 *   2. 情境 A：從 cwd 向上找 Cocos 專案（Claude Code 開在專案資料夾內）
 *   3. 情境 B：從 cwd 向下掃描（Claude Code 開在多專案的上層根目錄），
 *      優先挑「bridge 活著」的專案，多個都活著時挑最新啟動的
 *   連線失效時會自動重新定位 → 之後才開的編輯器也能被接上。
 *
 * 注意：stdio transport 下 stdout 只能輸出 MCP 協議訊息，日誌一律走 stderr。
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BridgeClient, BridgeUnavailableError, McpToolSpec, RpcResponse } from './bridge-client';
import {
    findProjectsDownwards,
    readBridgeInfo,
    resolveProjectPath,
} from './project-resolver';

const SIDECAR_VERSION = '2.0.0';

function log(...args: unknown[]): void {
    console.error('[cocos-mcp]', ...args);
}

async function quickHealthCheck(port: number): Promise<boolean> {
    try {
        const res = await fetch(`http://127.0.0.1:${port}/health`, {
            signal: AbortSignal.timeout(800),
        });
        if (!res.ok) return false;
        const body = (await res.json()) as { name?: string };
        return body.name === 'cocos-mcp-bridge';
    } catch {
        return false;
    }
}

interface ActiveTarget {
    projectPath: string;
    source: string;
}

/** 依優先序定位目標專案（情境 A 向上、情境 B 向下） */
async function pickProject(): Promise<ActiveTarget> {
    const fixed = resolveProjectPath(process.argv.slice(2), process.env, process.cwd());
    if (fixed.source !== 'cwd-fallback') {
        return fixed;
    }
    // 情境 B：向下掃描
    const candidates = findProjectsDownwards(process.cwd(), 2);
    if (candidates.length > 0) {
        const withBridge = candidates
            .map((p) => ({ p, info: readBridgeInfo(p) }))
            .filter((c): c is { p: string; info: NonNullable<ReturnType<typeof readBridgeInfo>> } => c.info !== null)
            .sort((a, b) => String(b.info.startedAt ?? '').localeCompare(String(a.info.startedAt ?? '')));
        for (const c of withBridge) {
            if (await quickHealthCheck(c.info.port)) {
                return { projectPath: c.p, source: 'detected-down-live' };
            }
        }
        if (withBridge.length > 0) {
            return { projectPath: withBridge[0].p, source: 'detected-down' };
        }
        return { projectPath: candidates[0], source: 'detected-down' };
    }
    return fixed; // cwd-fallback
}

function offlineMessage(target: ActiveTarget): string {
    const base =
        'Cocos Creator editor is not reachable. ' +
        `Open the project (${target.projectPath}) in Cocos Creator and make sure the ` +
        '"Cocos MCP" extension bridge is running (panel: Extension > Cocos MCP).';
    if (target.source === 'cwd-fallback') {
        return (
            'No Cocos Creator project was found from the current working directory ' +
            `(${target.projectPath}). Start your MCP client inside (or one level above) a ` +
            'Cocos project folder, or pass an explicit --project <path> argument ' +
            '(or COCOS_MCP_PROJECT env var) to the sidecar. The target project must have ' +
            'the "Cocos MCP" extension installed and the editor open.'
        );
    }
    return base;
}

async function main(): Promise<void> {
    let active = await pickProject();
    let client = new BridgeClient(active.projectPath);
    log(`sidecar starting (project: ${active.projectPath}, resolved via: ${active.source})`);

    /** 重新定位專案；目標改變時換掉 client，回傳是否改變 */
    async function relocate(): Promise<boolean> {
        const next = await pickProject();
        if (next.projectPath !== active.projectPath) {
            log(`project switched: ${active.projectPath} → ${next.projectPath} (via: ${next.source})`);
            active = next;
            client = new BridgeClient(next.projectPath);
            return true;
        }
        active = next;
        return false;
    }

    const server = new Server(
        { name: 'cocos-mcp', version: SIDECAR_VERSION },
        { capabilities: { tools: { listChanged: true } } },
    );

    let lastListWasLive = false;
    let notifiedSinceOnline = true;

    server.setRequestHandler(ListToolsRequestSchema, async () => {
        let tools: McpToolSpec[] | null = null;
        try {
            tools = await client.fetchTools();
        } catch {
            await relocate();
            try {
                tools = await client.fetchTools();
            } catch {
                tools = null;
            }
        }
        if (tools) {
            lastListWasLive = true;
            return { tools };
        }
        lastListWasLive = false;
        const cached = client.readToolsCache();
        if (cached && cached.length > 0) {
            log('editor offline; serving cached tool list', `(${cached.length} tools)`);
            return { tools: cached };
        }
        log('editor offline and no cached tool list');
        return { tools: [] };
    });

    /** 呼叫 bridge；連不上時重新定位一次再試 */
    async function callBridge(
        name: string,
        action: string,
        args: Record<string, unknown>,
    ): Promise<RpcResponse> {
        try {
            return await client.rpc(name, action, args);
        } catch (err) {
            if (!(err instanceof BridgeUnavailableError)) throw err;
            const changed = await relocate();
            if (!changed) throw err;
            return client.rpc(name, action, args);
        }
    }

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const name = request.params.name;
        const rawArgs = (request.params.arguments ?? {}) as Record<string, unknown>;
        const { action, ...args } = rawArgs;

        if (typeof action !== 'string' || action.length === 0) {
            return {
                isError: true,
                content: [
                    {
                        type: 'text',
                        text: `Missing required argument "action" for tool "${name}".`,
                    },
                ],
            };
        }

        try {
            const res = await callBridge(name, action, args);
            if (res.ok) {
                return {
                    content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }],
                };
            }
            const hint = res.error.hint ? `\nHint: ${res.error.hint}` : '';
            return {
                isError: true,
                content: [
                    { type: 'text', text: `${res.error.code}: ${res.error.message}${hint}` },
                ],
            };
        } catch (err) {
            const text =
                err instanceof BridgeUnavailableError
                    ? offlineMessage(active)
                    : `Unexpected sidecar error: ${String(err)}`;
            return { isError: true, content: [{ type: 'text', text }] };
        }
    });

    await server.connect(new StdioServerTransport());
    log(`sidecar ready (project: ${active.projectPath}, resolved via: ${active.source})`);

    // 編輯器上線偵測：上一次 tools/list 不是即時資料時，bridge 恢復（或新專案編輯器開啟）
    // 後通知客戶端刷新工具列表
    setInterval(async () => {
        if (lastListWasLive) {
            notifiedSinceOnline = false;
            return;
        }
        await relocate();
        const ok = await client.healthy();
        if (ok && !notifiedSinceOnline) {
            notifiedSinceOnline = true;
            try {
                await server.notification({ method: 'notifications/tools/list_changed' });
                log('bridge online; sent tools/list_changed');
            } catch {
                // 客戶端不支援通知時忽略
            }
        } else if (!ok) {
            notifiedSinceOnline = false;
        }
    }, 5000).unref();
}

main().catch((err) => {
    log('fatal:', err);
    process.exit(1);
});
