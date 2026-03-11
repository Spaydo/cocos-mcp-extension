// @ts-ignore
import packageJSON from '../package.json';
import { MCPServer } from './mcp-server';
import { readSettings, saveSettings } from './settings';
import { MCPServerSettings } from './types';
import { SceneTools } from './tools/scene-tools';
import { NodeTools } from './tools/node-tools';
import { ComponentTools } from './tools/component-tools';
import { AssetTools } from './tools/asset-tools';
import { PrefabTools } from './tools/prefab-tools';
import { ProjectTools } from './tools/project-tools';
import { DebugTools, addLog } from './tools/debug-tools';
import { SceneViewTools } from './tools/scene-view-tools';
import { EditorTools } from './tools/editor-tools';
import { ReferenceImageTools } from './tools/reference-image-tools';
import { AnimationTools } from './tools/animation-tools';

let mcpServer: MCPServer | null = null;
let editorVersion: string = '';

// === Console capture ===
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;

function hookConsole() {
    console.log = (...args: any[]) => {
        _origLog.apply(console, args);
        addLog('log', args.map(String).join(' '));
    };
    console.warn = (...args: any[]) => {
        _origWarn.apply(console, args);
        addLog('warn', args.map(String).join(' '));
    };
    console.error = (...args: any[]) => {
        _origError.apply(console, args);
        addLog('error', args.map(String).join(' '));
    };
}

function unhookConsole() {
    console.log = _origLog;
    console.warn = _origWarn;
    console.error = _origError;
}

// === Editor message listener for capturing editor-level logs ===
const editorLogHandler = (msg: any) => addLog('editor-log', String(msg));
const editorWarnHandler = (msg: any) => addLog('editor-warn', String(msg));
const editorErrorHandler = (msg: any) => addLog('editor-error', String(msg));

/** Get the detected Cocos Creator editor version */
export function getEditorVersion(): string {
    return editorVersion;
}

export const methods: { [key: string]: (...any: any) => any } = {

    openPanel() {
        Editor.Panel.open(packageJSON.name);
    },

    async startServer(): Promise<{ success: boolean; error?: string }> {
        if (!mcpServer) {
            return { success: false, error: 'MCPServer not initialized' };
        }
        try {
            await mcpServer.start();
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    },

    stopServer(): { success: boolean } {
        if (mcpServer) {
            mcpServer.stop();
        }
        return { success: true };
    },

    getServerStatus() {
        const settings = readSettings();
        return {
            running: mcpServer?.isRunning() ?? false,
            port: settings.port,
            tools: mcpServer?.getToolCount() ?? 0,
            actions: mcpServer?.getActionCount() ?? 0,
            autoStart: settings.autoStart,
            enabledCategories: settings.enabledCategories,
            enabledTools: settings.enabledTools,
        };
    },

    getCategories() {
        return mcpServer?.getAllToolsInfo() ?? [];
    },

    updateSettings(settings: MCPServerSettings): { success: boolean } {
        saveSettings(settings);
        if (mcpServer) {
            mcpServer.updateSettings(settings);
        }
        return { success: true };
    },
};

/**
 * Extension load - called when extension is enabled
 */
export function load() {
    // 1. Hook console to capture logs
    hookConsole();

    // 2. Listen for editor-level broadcast messages
    const msg = Editor.Message as any;
    if (msg.addBroadcastListener) {
        msg.addBroadcastListener('log:log', editorLogHandler);
        msg.addBroadcastListener('log:warn', editorWarnHandler);
        msg.addBroadcastListener('log:error', editorErrorHandler);
    }

    // 3. Detect editor version
    editorVersion = Editor.App.version || 'unknown';

    // 4. Read settings
    const settings = readSettings();

    // 5. Create MCP server instance and register tools
    mcpServer = new MCPServer(settings);
    mcpServer.registerToolCategory('scene', new SceneTools());
    mcpServer.registerToolCategory('node', new NodeTools());
    mcpServer.registerToolCategory('component', new ComponentTools());
    mcpServer.registerToolCategory('asset', new AssetTools());
    mcpServer.registerToolCategory('prefab', new PrefabTools());
    mcpServer.registerToolCategory('project', new ProjectTools());
    mcpServer.registerToolCategory('debug', new DebugTools());
    mcpServer.registerToolCategory('scene_view', new SceneViewTools());
    mcpServer.registerToolCategory('editor', new EditorTools());
    mcpServer.registerToolCategory('reference_image', new ReferenceImageTools());
    mcpServer.registerToolCategory('animation', new AnimationTools());

    // 6. Auto-start if configured
    if (settings.autoStart) {
        mcpServer.start().catch((err: Error) => {
            console.warn(`[MCP] Auto-start failed: ${err.message}`);
        });
    }

    console.log(`[MCP] Cocos MCP Extension loaded (Editor v${editorVersion})`);
}

/**
 * Extension unload - called when extension is disabled
 */
export function unload() {
    // Remove editor broadcast listeners
    const msg = Editor.Message as any;
    if (msg.removeBroadcastListener) {
        msg.removeBroadcastListener('log:log', editorLogHandler);
        msg.removeBroadcastListener('log:warn', editorWarnHandler);
        msg.removeBroadcastListener('log:error', editorErrorHandler);
    }

    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }

    console.log('[MCP] Cocos MCP Extension unloaded');

    // Restore original console
    unhookConsole();
}
