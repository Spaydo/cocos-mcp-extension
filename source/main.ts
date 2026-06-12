/**
 * 擴展主進程入口：生命週期 + 面板訊息。
 */
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
    // 動態 require（非頂層 import）：讓 dev.reload_tools 清掉 require cache 後能載入新代碼
    /* eslint-disable @typescript-eslint/no-var-requires */
    reg.register(require('./tools/project').createProjectTool());
    reg.register(require('./tools/scene').createSceneTool());
    reg.register(require('./tools/node').createNodeTool());
    reg.register(require('./tools/component').createComponentTool());
    reg.register(require('./tools/asset').createAssetTool());
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
}

/** sidecar 入口的絕對路徑（__dirname = <擴展>/dist） */
function sidecarEntry(): string {
    return join(__dirname, '..', 'dist-sidecar', 'index.js');
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
