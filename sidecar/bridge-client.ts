/**
 * Bridge 客戶端：sidecar 透過 discovery 檔找到編輯器內的 bridge 並轉發請求。
 * 執行環境：系統 Node >= 18（有全域 fetch / AbortSignal.timeout）。
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export interface BridgeInfo {
    port: number;
    token: string;
    pid: number;
    editorVersion: string;
    projectPath: string;
    startedAt: string;
}

export interface McpToolSpec {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export type RpcResponse =
    | { ok: true; data: unknown }
    | { ok: false; error: { code: string; message: string; hint?: string } };

export class BridgeUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BridgeUnavailableError';
    }
}

const TOOLS_TIMEOUT_MS = 5000;
const RPC_TIMEOUT_MS = 30000;

export class BridgeClient {
    private cachedInfo: BridgeInfo | null = null;

    constructor(readonly projectPath: string) {}

    private bridgeInfoPath(): string {
        return join(this.projectPath, 'temp', 'cocos-mcp', 'bridge.json');
    }

    private toolsCachePath(): string {
        return join(this.projectPath, 'temp', 'cocos-mcp', 'tools.json');
    }

    readDiscovery(): BridgeInfo | null {
        try {
            const file = this.bridgeInfoPath();
            if (!existsSync(file)) return null;
            const info = JSON.parse(readFileSync(file, 'utf-8')) as BridgeInfo;
            if (!info || typeof info.port !== 'number' || typeof info.token !== 'string') {
                return null;
            }
            this.cachedInfo = info;
            return info;
        } catch {
            return null;
        }
    }

    private async request(info: BridgeInfo, path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
        return fetch(`http://127.0.0.1:${info.port}${path}`, {
            ...init,
            headers: {
                Authorization: `Bearer ${info.token}`,
                'Content-Type': 'application/json',
                ...(init.headers ?? {}),
            },
            signal: AbortSignal.timeout(timeoutMs),
        });
    }

    /** 編輯器是否在線（bridge 可達） */
    async healthy(): Promise<boolean> {
        const info = this.readDiscovery();
        if (!info) return false;
        try {
            const res = await fetch(`http://127.0.0.1:${info.port}/health`, {
                signal: AbortSignal.timeout(2000),
            });
            if (!res.ok) return false;
            const body = (await res.json()) as { name?: string };
            return body.name === 'cocos-mcp-bridge';
        } catch {
            return false;
        }
    }

    /** 即時抓工具目錄（bridge 必須在線） */
    async fetchTools(): Promise<McpToolSpec[]> {
        const info = this.readDiscovery();
        if (!info) {
            throw new BridgeUnavailableError('No bridge discovery file found');
        }
        const res = await this.request(info, '/tools', { method: 'GET' }, TOOLS_TIMEOUT_MS);
        if (!res.ok) {
            throw new BridgeUnavailableError(`GET /tools failed: HTTP ${res.status}`);
        }
        const body = (await res.json()) as { tools?: McpToolSpec[] };
        return body.tools ?? [];
    }

    /** 離線快取（bridge 啟動時寫入的 tools.json） */
    readToolsCache(): McpToolSpec[] | null {
        try {
            const file = this.toolsCachePath();
            if (!existsSync(file)) return null;
            const body = JSON.parse(readFileSync(file, 'utf-8')) as { tools?: McpToolSpec[] };
            return body.tools ?? null;
        } catch {
            return null;
        }
    }

    /**
     * 呼叫 bridge RPC。
     * 連線失敗 / token 失效（編輯器重啟過）時重讀 discovery 再試一次。
     */
    async rpc(tool: string, action: string, args: Record<string, unknown>): Promise<RpcResponse> {
        let info = this.cachedInfo ?? this.readDiscovery();
        if (!info) {
            throw new BridgeUnavailableError('No bridge discovery file found');
        }
        const doCall = async (target: BridgeInfo): Promise<Response> =>
            this.request(
                target,
                '/rpc',
                { method: 'POST', body: JSON.stringify({ tool, action, args }) },
                RPC_TIMEOUT_MS,
            );

        let res: Response;
        try {
            res = await doCall(info);
        } catch (err) {
            // 連不上：編輯器可能重啟過、埠變了 → 重讀 discovery 再試一次
            const fresh = this.readDiscovery();
            if (!fresh) {
                throw new BridgeUnavailableError(`Bridge not reachable: ${String(err)}`);
            }
            info = fresh;
            try {
                res = await doCall(info);
            } catch (err2) {
                throw new BridgeUnavailableError(`Bridge not reachable: ${String(err2)}`);
            }
        }

        if (res.status === 401) {
            // token 過期（編輯器重啟）→ 重讀 discovery 再試一次
            const fresh = this.readDiscovery();
            if (fresh && fresh.token !== info.token) {
                res = await doCall(fresh);
            }
        }

        if (!res.ok && res.status !== 200) {
            const text = await res.text().catch(() => '');
            try {
                return JSON.parse(text) as RpcResponse;
            } catch {
                throw new BridgeUnavailableError(`Bridge RPC failed: HTTP ${res.status} ${text}`);
            }
        }
        return (await res.json()) as RpcResponse;
    }
}
