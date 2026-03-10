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
import { DebugTools } from './tools/debug-tools';

let mcpServer: MCPServer | null = null;
let editorVersion: string = '';

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

    getServerStatus(): { running: boolean; port: number; tools: number; autoStart: boolean } {
        const settings = readSettings();
        return {
            running: mcpServer?.isRunning() ?? false,
            port: settings.port,
            tools: mcpServer?.getToolCount() ?? 0,
            autoStart: settings.autoStart,
        };
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
    // 1. Detect editor version
    editorVersion = Editor.App.version || 'unknown';

    // 2. Read settings
    const settings = readSettings();

    // 3. Create MCP server instance and register tools
    mcpServer = new MCPServer(settings);
    mcpServer.registerToolCategory('scene', new SceneTools());
    mcpServer.registerToolCategory('node', new NodeTools());
    mcpServer.registerToolCategory('component', new ComponentTools());
    mcpServer.registerToolCategory('asset', new AssetTools());
    mcpServer.registerToolCategory('prefab', new PrefabTools());
    mcpServer.registerToolCategory('project', new ProjectTools());
    mcpServer.registerToolCategory('debug', new DebugTools());

    // 4. Auto-start if configured
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
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
    console.log('[MCP] Cocos MCP Extension unloaded');
}
