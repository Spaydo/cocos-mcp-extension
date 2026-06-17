/**
 * 擴展主進程入口：生命週期 + 面板訊息。
 */
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { clearBridgeInfo, writeBridgeInfo, writeSidecarInfo, writeToolsCache } from './bridge/discovery';
import { BridgeServer } from './bridge/server';
import { readSettings } from './settings';
import { ToolRegistry } from './tools/registry';
import { BridgeSettings, EditorEnv, ToolContext } from './types';
import { detectEditorEnv } from './version';

let env: EditorEnv | null = null;
let settings: BridgeSettings | null = null;
let registry: ToolRegistry | null = null;
let bridge: BridgeServer | null = null;

function buildRegistry(): ToolRegistry {
    const reg = new ToolRegistry();
    // 動態 require（非頂層 import）：讓 dev.reload_tools 清掉 require cache 後能載入新代碼，
    // 工具清單由 tools/index.ts 維護（新增工具也可熱載入）
    /* eslint-disable @typescript-eslint/no-var-requires */
    for (const def of require('./tools').createAllTools()) {
        reg.register(def);
    }
    /* eslint-enable @typescript-eslint/no-var-requires */
    reg.register({
        name: 'dev',
        description: 'Development helpers for the cocos-mcp extension itself.',
        actions: {
            reload_tools: {
                description:
                    'Hot-reload tool modules from dist/ (run after rebuilding the extension) without restarting the editor. ' +
                    'Does NOT reload bridge/main process code.',
                handler: async () => devReloadTools(),
            },
        },
    });
    return reg;
}

/** 清掉工具層模組的 require cache 並重建註冊表（bridge/main 本身不受影響） */
function devReloadTools(): { tools: string[] } {
    const prefixes = [join(__dirname, 'tools'), join(__dirname, 'adapters.js')];
    for (const key of Object.keys(require.cache)) {
        if (prefixes.some((p) => key.startsWith(p))) {
            delete require.cache[key];
        }
    }
    registry = buildRegistry();
    writeToolsCache(Editor.Project.path, registry.catalog());
    console.log('[cocos-mcp] tools hot-reloaded:', registry.toolNames().join(', '));
    return { tools: registry.toolNames() };
}

function context(): ToolContext {
    if (!env || !settings) {
        throw new Error('cocos-mcp extension not initialized');
    }
    return { env, settings };
}

export interface ServerStatus {
    running: boolean;
    port: number | null;
    projectPath: string;
    editorVersion: string;
    toolCount: number;
    sidecarEntry: string;
    /** sidecar 的 npm 相依（@modelcontextprotocol/sdk）是否已安裝；未裝時 sidecar 無法啟動。 */
    depsInstalled: boolean;
}

export interface InstallResult {
    ok: boolean;
    code: number | null;
    /** npm 輸出末段，供面板顯示成功/失敗訊息。 */
    tail: string;
}

/** 擴展根目錄（__dirname = <擴展>/dist，故往上一層）。 */
function extensionRoot(): string {
    return join(__dirname, '..');
}

/** sidecar 入口的絕對路徑（__dirname = <擴展>/dist） */
function sidecarEntry(): string {
    return join(__dirname, '..', 'dist-sidecar', 'index.js');
}

/** sidecar 的 runtime 相依是否已安裝。 */
function depsInstalled(): boolean {
    return existsSync(join(extensionRoot(), 'node_modules', '@modelcontextprotocol', 'sdk'));
}

/** 在擴展根目錄跑 `npm install`（shell:true 以相容 Windows 的 npm.cmd），收集輸出末段回報。 */
function runNpmInstall(): Promise<InstallResult> {
    return new Promise((resolve) => {
        const root = extensionRoot();
        console.log('[cocos-mcp] npm install in', root);
        const child = spawn('npm install', { cwd: root, shell: true });
        let buf = '';
        const cap = (d: Buffer) => {
            buf += d.toString();
            if (buf.length > 8000) buf = buf.slice(-8000);   // 只留末段，避免吃記憶體
        };
        child.stdout?.on('data', cap);
        child.stderr?.on('data', cap);
        child.on('error', (err) => resolve({ ok: false, code: null, tail: String((err && err.message) || err) }));
        child.on('close', (code) => {
            const tail = buf.split(/\r?\n/).filter(Boolean).slice(-12).join('\n');
            console.log(`[cocos-mcp] npm install exited code=${code}`);
            resolve({ ok: code === 0, code, tail });
        });
    });
}

function extensionVersion(): string {
    try {
        return String(require('../package.json').version);
    } catch {
        return 'unknown';
    }
}

function getStatus(): ServerStatus {
    return {
        running: Boolean(bridge && bridge.running),
        port: bridge && bridge.running ? bridge.currentPort : null,
        projectPath: Editor.Project.path,
        editorVersion: env ? env.version.raw : Editor.App.version,
        toolCount: registry ? registry.toolNames().length : 0,
        sidecarEntry: sidecarEntry(),
        depsInstalled: depsInstalled(),
    };
}

async function startBridge(): Promise<ServerStatus> {
    if (!env || !settings || !registry) {
        throw new Error('cocos-mcp extension not initialized');
    }
    if (bridge && bridge.running) {
        return getStatus();
    }
    // 動態取用模組層 registry（dev.reload_tools 會替換它）
    bridge = new BridgeServer({
        preferredPort: settings.port,
        projectPath: Editor.Project.path,
        editorVersion: env.version.raw,
        catalog: () => registry!.catalog(),
        invoke: (req) => registry!.invoke(req, context()),
    });
    const { port, token } = await bridge.start();
    writeBridgeInfo(Editor.Project.path, {
        port,
        token,
        pid: process.pid,
        editorVersion: env.version.raw,
        projectPath: Editor.Project.path,
        startedAt: new Date().toISOString(),
    });
    writeToolsCache(Editor.Project.path, registry.catalog());
    writeSidecarInfo(Editor.Project.path, sidecarEntry(), extensionVersion());
    console.log(`[cocos-mcp] bridge started: 127.0.0.1:${port} (editor ${env.version.raw})`);
    return getStatus();
}

async function stopBridge(): Promise<ServerStatus> {
    if (bridge) {
        await bridge.stop();
        clearBridgeInfo(Editor.Project.path);
        console.log('[cocos-mcp] bridge stopped');
    }
    return getStatus();
}

/** package.json contributions.messages 對應的方法 */
export const methods: Record<string, (...args: any[]) => any> = {
    openPanel() {
        Editor.Panel.open('cocos-mcp-extension');
    },
    async startServer(): Promise<ServerStatus> {
        return startBridge();
    },
    async stopServer(): Promise<ServerStatus> {
        return stopBridge();
    },
    getServerStatus(): ServerStatus {
        return getStatus();
    },
    async installDeps(): Promise<InstallResult> {
        return runNpmInstall();
    },
};

export async function load(): Promise<void> {
    env = detectEditorEnv();
    settings = readSettings(Editor.Project.path);
    registry = buildRegistry();
    console.log(
        `[cocos-mcp] loaded (editor ${env.version.raw}, ` +
        `caps: ${JSON.stringify(env.capabilities)})`,
    );
    if (settings.autoStart) {
        try {
            await startBridge();
        } catch (err) {
            console.error('[cocos-mcp] bridge auto-start failed:', err);
            // 啟動失敗時清掉殘留的 discovery，避免 sidecar 連到舊埠（可能已被其他編輯器接手）
            clearBridgeInfo(Editor.Project.path);
        }
    }
}

export async function unload(): Promise<void> {
    await stopBridge();
    env = null;
    settings = null;
    registry = null;
    bridge = null;
}
