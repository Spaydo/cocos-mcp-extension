"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.getEditorVersion = getEditorVersion;
exports.load = load;
exports.unload = unload;
// @ts-ignore
const package_json_1 = __importDefault(require("../package.json"));
const mcp_server_1 = require("./mcp-server");
const settings_1 = require("./settings");
const scene_tools_1 = require("./tools/scene-tools");
const node_tools_1 = require("./tools/node-tools");
const component_tools_1 = require("./tools/component-tools");
const asset_tools_1 = require("./tools/asset-tools");
const prefab_tools_1 = require("./tools/prefab-tools");
const project_tools_1 = require("./tools/project-tools");
const debug_tools_1 = require("./tools/debug-tools");
const scene_view_tools_1 = require("./tools/scene-view-tools");
const editor_tools_1 = require("./tools/editor-tools");
const reference_image_tools_1 = require("./tools/reference-image-tools");
const animation_tools_1 = require("./tools/animation-tools");
let mcpServer = null;
let editorVersion = '';
// === Console capture ===
const _origLog = console.log;
const _origWarn = console.warn;
const _origError = console.error;
function hookConsole() {
    console.log = (...args) => {
        _origLog.apply(console, args);
        (0, debug_tools_1.addLog)('log', args.map(String).join(' '));
    };
    console.warn = (...args) => {
        _origWarn.apply(console, args);
        (0, debug_tools_1.addLog)('warn', args.map(String).join(' '));
    };
    console.error = (...args) => {
        _origError.apply(console, args);
        (0, debug_tools_1.addLog)('error', args.map(String).join(' '));
    };
}
function unhookConsole() {
    console.log = _origLog;
    console.warn = _origWarn;
    console.error = _origError;
}
// === Editor message listener for capturing editor-level logs ===
const editorLogHandler = (msg) => (0, debug_tools_1.addLog)('editor-log', String(msg));
const editorWarnHandler = (msg) => (0, debug_tools_1.addLog)('editor-warn', String(msg));
const editorErrorHandler = (msg) => (0, debug_tools_1.addLog)('editor-error', String(msg));
const sceneLogHandler = (msg) => (0, debug_tools_1.addLog)('scene-log', String(msg));
const sceneWarnHandler = (msg) => (0, debug_tools_1.addLog)('scene-warn', String(msg));
const sceneErrorHandler = (msg) => (0, debug_tools_1.addLog)('scene-error', String(msg));
/** Get the detected Cocos Creator editor version */
function getEditorVersion() {
    return editorVersion;
}
exports.methods = {
    openPanel() {
        Editor.Panel.open(package_json_1.default.name);
    },
    async startServer() {
        if (!mcpServer) {
            return { success: false, error: 'MCPServer not initialized' };
        }
        try {
            await mcpServer.start();
            return { success: true };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    },
    stopServer() {
        if (mcpServer) {
            mcpServer.stop();
        }
        return { success: true };
    },
    getServerStatus() {
        var _a, _b, _c;
        const settings = (0, settings_1.readSettings)();
        return {
            running: (_a = mcpServer === null || mcpServer === void 0 ? void 0 : mcpServer.isRunning()) !== null && _a !== void 0 ? _a : false,
            port: settings.port,
            tools: (_b = mcpServer === null || mcpServer === void 0 ? void 0 : mcpServer.getToolCount()) !== null && _b !== void 0 ? _b : 0,
            actions: (_c = mcpServer === null || mcpServer === void 0 ? void 0 : mcpServer.getActionCount()) !== null && _c !== void 0 ? _c : 0,
            autoStart: settings.autoStart,
            enabledCategories: settings.enabledCategories,
            enabledTools: settings.enabledTools,
        };
    },
    getCategories() {
        var _a;
        return (_a = mcpServer === null || mcpServer === void 0 ? void 0 : mcpServer.getAllToolsInfo()) !== null && _a !== void 0 ? _a : [];
    },
    updateSettings(settings) {
        (0, settings_1.saveSettings)(settings);
        if (mcpServer) {
            mcpServer.updateSettings(settings);
        }
        return { success: true };
    },
};
/**
 * Extension load - called when extension is enabled
 */
function load() {
    // 1. Hook console to capture logs
    hookConsole();
    // 2. Listen for editor-level broadcast messages (multiple channels for coverage)
    const msg = Editor.Message;
    if (msg.addBroadcastListener) {
        // Editor console events
        msg.addBroadcastListener('log:log', editorLogHandler);
        msg.addBroadcastListener('log:warn', editorWarnHandler);
        msg.addBroadcastListener('log:error', editorErrorHandler);
        // Scene-level events
        msg.addBroadcastListener('scene:log', sceneLogHandler);
        msg.addBroadcastListener('scene:warn', sceneWarnHandler);
        msg.addBroadcastListener('scene:error', sceneErrorHandler);
        // Console panel events (alternate naming)
        msg.addBroadcastListener('console:log', editorLogHandler);
        msg.addBroadcastListener('console:warn', editorWarnHandler);
        msg.addBroadcastListener('console:error', editorErrorHandler);
    }
    // 3. Detect editor version
    editorVersion = Editor.App.version || 'unknown';
    // 4. Read settings
    const settings = (0, settings_1.readSettings)();
    // 5. Create MCP server instance and register tools
    mcpServer = new mcp_server_1.MCPServer(settings);
    mcpServer.registerToolCategory('scene', new scene_tools_1.SceneTools());
    mcpServer.registerToolCategory('node', new node_tools_1.NodeTools());
    mcpServer.registerToolCategory('component', new component_tools_1.ComponentTools());
    mcpServer.registerToolCategory('asset', new asset_tools_1.AssetTools());
    mcpServer.registerToolCategory('prefab', new prefab_tools_1.PrefabTools());
    mcpServer.registerToolCategory('project', new project_tools_1.ProjectTools());
    mcpServer.registerToolCategory('debug', new debug_tools_1.DebugTools());
    mcpServer.registerToolCategory('scene_view', new scene_view_tools_1.SceneViewTools());
    mcpServer.registerToolCategory('editor', new editor_tools_1.EditorTools());
    mcpServer.registerToolCategory('reference_image', new reference_image_tools_1.ReferenceImageTools());
    mcpServer.registerToolCategory('animation', new animation_tools_1.AnimationTools());
    // 6. Auto-start if configured
    if (settings.autoStart) {
        mcpServer.start().catch((err) => {
            console.warn(`[MCP] Auto-start failed: ${err.message}`);
        });
    }
    console.log(`[MCP] Cocos MCP Extension loaded (Editor v${editorVersion})`);
}
/**
 * Extension unload - called when extension is disabled
 */
function unload() {
    // Remove editor broadcast listeners
    const msg = Editor.Message;
    if (msg.removeBroadcastListener) {
        msg.removeBroadcastListener('log:log', editorLogHandler);
        msg.removeBroadcastListener('log:warn', editorWarnHandler);
        msg.removeBroadcastListener('log:error', editorErrorHandler);
        msg.removeBroadcastListener('scene:log', sceneLogHandler);
        msg.removeBroadcastListener('scene:warn', sceneWarnHandler);
        msg.removeBroadcastListener('scene:error', sceneErrorHandler);
        msg.removeBroadcastListener('console:log', editorLogHandler);
        msg.removeBroadcastListener('console:warn', editorWarnHandler);
        msg.removeBroadcastListener('console:error', editorErrorHandler);
    }
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
    console.log('[MCP] Cocos MCP Extension unloaded');
    // Restore original console
    unhookConsole();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQXVEQSw0Q0FFQztBQXdERCxvQkFpREM7QUFLRCx3QkF3QkM7QUEvTEQsYUFBYTtBQUNiLG1FQUEwQztBQUMxQyw2Q0FBeUM7QUFDekMseUNBQXdEO0FBRXhELHFEQUFpRDtBQUNqRCxtREFBK0M7QUFDL0MsNkRBQXlEO0FBQ3pELHFEQUFpRDtBQUNqRCx1REFBbUQ7QUFDbkQseURBQXFEO0FBQ3JELHFEQUF5RDtBQUN6RCwrREFBMEQ7QUFDMUQsdURBQW1EO0FBQ25ELHlFQUFvRTtBQUNwRSw2REFBeUQ7QUFFekQsSUFBSSxTQUFTLEdBQXFCLElBQUksQ0FBQztBQUN2QyxJQUFJLGFBQWEsR0FBVyxFQUFFLENBQUM7QUFFL0IsMEJBQTBCO0FBQzFCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFDN0IsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMvQixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBRWpDLFNBQVMsV0FBVztJQUNoQixPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTtRQUM3QixRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QixJQUFBLG9CQUFNLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDO0lBQ0YsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUU7UUFDOUIsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBQSxvQkFBTSxFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUMsQ0FBQztJQUNGLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQVcsRUFBRSxFQUFFO1FBQy9CLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUEsb0JBQU0sRUFBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUM7QUFDTixDQUFDO0FBRUQsU0FBUyxhQUFhO0lBQ2xCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDO0lBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO0lBQ3pCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDO0FBQy9CLENBQUM7QUFFRCxrRUFBa0U7QUFDbEUsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEdBQVEsRUFBRSxFQUFFLENBQUMsSUFBQSxvQkFBTSxFQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN6RSxNQUFNLGlCQUFpQixHQUFHLENBQUMsR0FBUSxFQUFFLEVBQUUsQ0FBQyxJQUFBLG9CQUFNLEVBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzNFLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxHQUFRLEVBQUUsRUFBRSxDQUFDLElBQUEsb0JBQU0sRUFBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDN0UsTUFBTSxlQUFlLEdBQUcsQ0FBQyxHQUFRLEVBQUUsRUFBRSxDQUFDLElBQUEsb0JBQU0sRUFBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdkUsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEdBQVEsRUFBRSxFQUFFLENBQUMsSUFBQSxvQkFBTSxFQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN6RSxNQUFNLGlCQUFpQixHQUFHLENBQUMsR0FBUSxFQUFFLEVBQUUsQ0FBQyxJQUFBLG9CQUFNLEVBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRTNFLG9EQUFvRDtBQUNwRCxTQUFnQixnQkFBZ0I7SUFDNUIsT0FBTyxhQUFhLENBQUM7QUFDekIsQ0FBQztBQUVZLFFBQUEsT0FBTyxHQUE0QztJQUU1RCxTQUFTO1FBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsc0JBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVc7UUFDYixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDYixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQztRQUNsRSxDQUFDO1FBQ0QsSUFBSSxDQUFDO1lBQ0QsTUFBTSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRUQsVUFBVTtRQUNOLElBQUksU0FBUyxFQUFFLENBQUM7WUFDWixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDckIsQ0FBQztRQUNELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELGVBQWU7O1FBQ1gsTUFBTSxRQUFRLEdBQUcsSUFBQSx1QkFBWSxHQUFFLENBQUM7UUFDaEMsT0FBTztZQUNILE9BQU8sRUFBRSxNQUFBLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxTQUFTLEVBQUUsbUNBQUksS0FBSztZQUN4QyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsS0FBSyxFQUFFLE1BQUEsU0FBUyxhQUFULFNBQVMsdUJBQVQsU0FBUyxDQUFFLFlBQVksRUFBRSxtQ0FBSSxDQUFDO1lBQ3JDLE9BQU8sRUFBRSxNQUFBLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxjQUFjLEVBQUUsbUNBQUksQ0FBQztZQUN6QyxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVM7WUFDN0IsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLGlCQUFpQjtZQUM3QyxZQUFZLEVBQUUsUUFBUSxDQUFDLFlBQVk7U0FDdEMsQ0FBQztJQUNOLENBQUM7SUFFRCxhQUFhOztRQUNULE9BQU8sTUFBQSxTQUFTLGFBQVQsU0FBUyx1QkFBVCxTQUFTLENBQUUsZUFBZSxFQUFFLG1DQUFJLEVBQUUsQ0FBQztJQUM5QyxDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQTJCO1FBQ3RDLElBQUEsdUJBQVksRUFBQyxRQUFRLENBQUMsQ0FBQztRQUN2QixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ1osU0FBUyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUM3QixDQUFDO0NBQ0osQ0FBQztBQUVGOztHQUVHO0FBQ0gsU0FBZ0IsSUFBSTtJQUNoQixrQ0FBa0M7SUFDbEMsV0FBVyxFQUFFLENBQUM7SUFFZCxpRkFBaUY7SUFDakYsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQWMsQ0FBQztJQUNsQyxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzNCLHdCQUF3QjtRQUN4QixHQUFHLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDdEQsR0FBRyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3hELEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUMxRCxxQkFBcUI7UUFDckIsR0FBRyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN2RCxHQUFHLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDekQsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNELDBDQUEwQztRQUMxQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDMUQsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzVELEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQsMkJBQTJCO0lBQzNCLGFBQWEsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxTQUFTLENBQUM7SUFFaEQsbUJBQW1CO0lBQ25CLE1BQU0sUUFBUSxHQUFHLElBQUEsdUJBQVksR0FBRSxDQUFDO0lBRWhDLG1EQUFtRDtJQUNuRCxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSx3QkFBVSxFQUFFLENBQUMsQ0FBQztJQUMxRCxTQUFTLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLElBQUksc0JBQVMsRUFBRSxDQUFDLENBQUM7SUFDeEQsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxJQUFJLGdDQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSx3QkFBVSxFQUFFLENBQUMsQ0FBQztJQUMxRCxTQUFTLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLElBQUksMEJBQVcsRUFBRSxDQUFDLENBQUM7SUFDNUQsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxJQUFJLDRCQUFZLEVBQUUsQ0FBQyxDQUFDO0lBQzlELFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSx3QkFBVSxFQUFFLENBQUMsQ0FBQztJQUMxRCxTQUFTLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLElBQUksaUNBQWMsRUFBRSxDQUFDLENBQUM7SUFDbkUsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxJQUFJLDBCQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzVELFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLDJDQUFtQixFQUFFLENBQUMsQ0FBQztJQUM3RSxTQUFTLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLElBQUksZ0NBQWMsRUFBRSxDQUFDLENBQUM7SUFFbEUsOEJBQThCO0lBQzlCLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3JCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRTtZQUNuQyxPQUFPLENBQUMsSUFBSSxDQUFDLDRCQUE0QixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUM1RCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLDZDQUE2QyxhQUFhLEdBQUcsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLE1BQU07SUFDbEIsb0NBQW9DO0lBQ3BDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFjLENBQUM7SUFDbEMsSUFBSSxHQUFHLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUM5QixHQUFHLENBQUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDekQsR0FBRyxDQUFDLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUM3RCxHQUFHLENBQUMsdUJBQXVCLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzFELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUM1RCxHQUFHLENBQUMsdUJBQXVCLENBQUMsYUFBYSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDOUQsR0FBRyxDQUFDLHVCQUF1QixDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzdELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMvRCxHQUFHLENBQUMsdUJBQXVCLENBQUMsZUFBZSxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELElBQUksU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakIsU0FBUyxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0lBRWxELDJCQUEyQjtJQUMzQixhQUFhLEVBQUUsQ0FBQztBQUNwQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWlnbm9yZVxyXG5pbXBvcnQgcGFja2FnZUpTT04gZnJvbSAnLi4vcGFja2FnZS5qc29uJztcclxuaW1wb3J0IHsgTUNQU2VydmVyIH0gZnJvbSAnLi9tY3Atc2VydmVyJztcclxuaW1wb3J0IHsgcmVhZFNldHRpbmdzLCBzYXZlU2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJztcclxuaW1wb3J0IHsgTUNQU2VydmVyU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcclxuaW1wb3J0IHsgU2NlbmVUb29scyB9IGZyb20gJy4vdG9vbHMvc2NlbmUtdG9vbHMnO1xyXG5pbXBvcnQgeyBOb2RlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL25vZGUtdG9vbHMnO1xyXG5pbXBvcnQgeyBDb21wb25lbnRUb29scyB9IGZyb20gJy4vdG9vbHMvY29tcG9uZW50LXRvb2xzJztcclxuaW1wb3J0IHsgQXNzZXRUb29scyB9IGZyb20gJy4vdG9vbHMvYXNzZXQtdG9vbHMnO1xyXG5pbXBvcnQgeyBQcmVmYWJUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmFiLXRvb2xzJztcclxuaW1wb3J0IHsgUHJvamVjdFRvb2xzIH0gZnJvbSAnLi90b29scy9wcm9qZWN0LXRvb2xzJztcclxuaW1wb3J0IHsgRGVidWdUb29scywgYWRkTG9nIH0gZnJvbSAnLi90b29scy9kZWJ1Zy10b29scyc7XHJcbmltcG9ydCB7IFNjZW5lVmlld1Rvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS12aWV3LXRvb2xzJztcclxuaW1wb3J0IHsgRWRpdG9yVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2VkaXRvci10b29scyc7XHJcbmltcG9ydCB7IFJlZmVyZW5jZUltYWdlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3JlZmVyZW5jZS1pbWFnZS10b29scyc7XHJcbmltcG9ydCB7IEFuaW1hdGlvblRvb2xzIH0gZnJvbSAnLi90b29scy9hbmltYXRpb24tdG9vbHMnO1xyXG5cclxubGV0IG1jcFNlcnZlcjogTUNQU2VydmVyIHwgbnVsbCA9IG51bGw7XHJcbmxldCBlZGl0b3JWZXJzaW9uOiBzdHJpbmcgPSAnJztcclxuXHJcbi8vID09PSBDb25zb2xlIGNhcHR1cmUgPT09XHJcbmNvbnN0IF9vcmlnTG9nID0gY29uc29sZS5sb2c7XHJcbmNvbnN0IF9vcmlnV2FybiA9IGNvbnNvbGUud2FybjtcclxuY29uc3QgX29yaWdFcnJvciA9IGNvbnNvbGUuZXJyb3I7XHJcblxyXG5mdW5jdGlvbiBob29rQ29uc29sZSgpIHtcclxuICAgIGNvbnNvbGUubG9nID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB7XHJcbiAgICAgICAgX29yaWdMb2cuYXBwbHkoY29uc29sZSwgYXJncyk7XHJcbiAgICAgICAgYWRkTG9nKCdsb2cnLCBhcmdzLm1hcChTdHJpbmcpLmpvaW4oJyAnKSk7XHJcbiAgICB9O1xyXG4gICAgY29uc29sZS53YXJuID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB7XHJcbiAgICAgICAgX29yaWdXYXJuLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xyXG4gICAgICAgIGFkZExvZygnd2FybicsIGFyZ3MubWFwKFN0cmluZykuam9pbignICcpKTtcclxuICAgIH07XHJcbiAgICBjb25zb2xlLmVycm9yID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB7XHJcbiAgICAgICAgX29yaWdFcnJvci5hcHBseShjb25zb2xlLCBhcmdzKTtcclxuICAgICAgICBhZGRMb2coJ2Vycm9yJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xyXG4gICAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gdW5ob29rQ29uc29sZSgpIHtcclxuICAgIGNvbnNvbGUubG9nID0gX29yaWdMb2c7XHJcbiAgICBjb25zb2xlLndhcm4gPSBfb3JpZ1dhcm47XHJcbiAgICBjb25zb2xlLmVycm9yID0gX29yaWdFcnJvcjtcclxufVxyXG5cclxuLy8gPT09IEVkaXRvciBtZXNzYWdlIGxpc3RlbmVyIGZvciBjYXB0dXJpbmcgZWRpdG9yLWxldmVsIGxvZ3MgPT09XHJcbmNvbnN0IGVkaXRvckxvZ0hhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnZWRpdG9yLWxvZycsIFN0cmluZyhtc2cpKTtcclxuY29uc3QgZWRpdG9yV2FybkhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnZWRpdG9yLXdhcm4nLCBTdHJpbmcobXNnKSk7XHJcbmNvbnN0IGVkaXRvckVycm9ySGFuZGxlciA9IChtc2c6IGFueSkgPT4gYWRkTG9nKCdlZGl0b3ItZXJyb3InLCBTdHJpbmcobXNnKSk7XHJcbmNvbnN0IHNjZW5lTG9nSGFuZGxlciA9IChtc2c6IGFueSkgPT4gYWRkTG9nKCdzY2VuZS1sb2cnLCBTdHJpbmcobXNnKSk7XHJcbmNvbnN0IHNjZW5lV2FybkhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnc2NlbmUtd2FybicsIFN0cmluZyhtc2cpKTtcclxuY29uc3Qgc2NlbmVFcnJvckhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnc2NlbmUtZXJyb3InLCBTdHJpbmcobXNnKSk7XHJcblxyXG4vKiogR2V0IHRoZSBkZXRlY3RlZCBDb2NvcyBDcmVhdG9yIGVkaXRvciB2ZXJzaW9uICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRFZGl0b3JWZXJzaW9uKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gZWRpdG9yVmVyc2lvbjtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFueTogYW55KSA9PiBhbnkgfSA9IHtcclxuXHJcbiAgICBvcGVuUGFuZWwoKSB7XHJcbiAgICAgICAgRWRpdG9yLlBhbmVsLm9wZW4ocGFja2FnZUpTT04ubmFtZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGFzeW5jIHN0YXJ0U2VydmVyKCk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBlcnJvcj86IHN0cmluZyB9PiB7XHJcbiAgICAgICAgaWYgKCFtY3BTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTUNQU2VydmVyIG5vdCBpbml0aWFsaXplZCcgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgbWNwU2VydmVyLnN0YXJ0KCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBzdG9wU2VydmVyKCk6IHsgc3VjY2VzczogYm9vbGVhbiB9IHtcclxuICAgICAgICBpZiAobWNwU2VydmVyKSB7XHJcbiAgICAgICAgICAgIG1jcFNlcnZlci5zdG9wKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcclxuICAgIH0sXHJcblxyXG4gICAgZ2V0U2VydmVyU3RhdHVzKCkge1xyXG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gcmVhZFNldHRpbmdzKCk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgcnVubmluZzogbWNwU2VydmVyPy5pc1J1bm5pbmcoKSA/PyBmYWxzZSxcclxuICAgICAgICAgICAgcG9ydDogc2V0dGluZ3MucG9ydCxcclxuICAgICAgICAgICAgdG9vbHM6IG1jcFNlcnZlcj8uZ2V0VG9vbENvdW50KCkgPz8gMCxcclxuICAgICAgICAgICAgYWN0aW9uczogbWNwU2VydmVyPy5nZXRBY3Rpb25Db3VudCgpID8/IDAsXHJcbiAgICAgICAgICAgIGF1dG9TdGFydDogc2V0dGluZ3MuYXV0b1N0YXJ0LFxyXG4gICAgICAgICAgICBlbmFibGVkQ2F0ZWdvcmllczogc2V0dGluZ3MuZW5hYmxlZENhdGVnb3JpZXMsXHJcbiAgICAgICAgICAgIGVuYWJsZWRUb29sczogc2V0dGluZ3MuZW5hYmxlZFRvb2xzLFxyXG4gICAgICAgIH07XHJcbiAgICB9LFxyXG5cclxuICAgIGdldENhdGVnb3JpZXMoKSB7XHJcbiAgICAgICAgcmV0dXJuIG1jcFNlcnZlcj8uZ2V0QWxsVG9vbHNJbmZvKCkgPz8gW107XHJcbiAgICB9LFxyXG5cclxuICAgIHVwZGF0ZVNldHRpbmdzKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncyk6IHsgc3VjY2VzczogYm9vbGVhbiB9IHtcclxuICAgICAgICBzYXZlU2V0dGluZ3Moc2V0dGluZ3MpO1xyXG4gICAgICAgIGlmIChtY3BTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgbWNwU2VydmVyLnVwZGF0ZVNldHRpbmdzKHNldHRpbmdzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xyXG4gICAgfSxcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFeHRlbnNpb24gbG9hZCAtIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBpcyBlbmFibGVkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9hZCgpIHtcclxuICAgIC8vIDEuIEhvb2sgY29uc29sZSB0byBjYXB0dXJlIGxvZ3NcclxuICAgIGhvb2tDb25zb2xlKCk7XHJcblxyXG4gICAgLy8gMi4gTGlzdGVuIGZvciBlZGl0b3ItbGV2ZWwgYnJvYWRjYXN0IG1lc3NhZ2VzIChtdWx0aXBsZSBjaGFubmVscyBmb3IgY292ZXJhZ2UpXHJcbiAgICBjb25zdCBtc2cgPSBFZGl0b3IuTWVzc2FnZSBhcyBhbnk7XHJcbiAgICBpZiAobXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKSB7XHJcbiAgICAgICAgLy8gRWRpdG9yIGNvbnNvbGUgZXZlbnRzXHJcbiAgICAgICAgbXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKCdsb2c6bG9nJywgZWRpdG9yTG9nSGFuZGxlcik7XHJcbiAgICAgICAgbXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKCdsb2c6d2FybicsIGVkaXRvcldhcm5IYW5kbGVyKTtcclxuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzplcnJvcicsIGVkaXRvckVycm9ySGFuZGxlcik7XHJcbiAgICAgICAgLy8gU2NlbmUtbGV2ZWwgZXZlbnRzXHJcbiAgICAgICAgbXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKCdzY2VuZTpsb2cnLCBzY2VuZUxvZ0hhbmRsZXIpO1xyXG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignc2NlbmU6d2FybicsIHNjZW5lV2FybkhhbmRsZXIpO1xyXG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignc2NlbmU6ZXJyb3InLCBzY2VuZUVycm9ySGFuZGxlcik7XHJcbiAgICAgICAgLy8gQ29uc29sZSBwYW5lbCBldmVudHMgKGFsdGVybmF0ZSBuYW1pbmcpXHJcbiAgICAgICAgbXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKCdjb25zb2xlOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xyXG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignY29uc29sZTp3YXJuJywgZWRpdG9yV2FybkhhbmRsZXIpO1xyXG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignY29uc29sZTplcnJvcicsIGVkaXRvckVycm9ySGFuZGxlcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gMy4gRGV0ZWN0IGVkaXRvciB2ZXJzaW9uXHJcbiAgICBlZGl0b3JWZXJzaW9uID0gRWRpdG9yLkFwcC52ZXJzaW9uIHx8ICd1bmtub3duJztcclxuXHJcbiAgICAvLyA0LiBSZWFkIHNldHRpbmdzXHJcbiAgICBjb25zdCBzZXR0aW5ncyA9IHJlYWRTZXR0aW5ncygpO1xyXG5cclxuICAgIC8vIDUuIENyZWF0ZSBNQ1Agc2VydmVyIGluc3RhbmNlIGFuZCByZWdpc3RlciB0b29sc1xyXG4gICAgbWNwU2VydmVyID0gbmV3IE1DUFNlcnZlcihzZXR0aW5ncyk7XHJcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ3NjZW5lJywgbmV3IFNjZW5lVG9vbHMoKSk7XHJcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ25vZGUnLCBuZXcgTm9kZVRvb2xzKCkpO1xyXG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdjb21wb25lbnQnLCBuZXcgQ29tcG9uZW50VG9vbHMoKSk7XHJcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2Fzc2V0JywgbmV3IEFzc2V0VG9vbHMoKSk7XHJcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ3ByZWZhYicsIG5ldyBQcmVmYWJUb29scygpKTtcclxuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgncHJvamVjdCcsIG5ldyBQcm9qZWN0VG9vbHMoKSk7XHJcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2RlYnVnJywgbmV3IERlYnVnVG9vbHMoKSk7XHJcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ3NjZW5lX3ZpZXcnLCBuZXcgU2NlbmVWaWV3VG9vbHMoKSk7XHJcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2VkaXRvcicsIG5ldyBFZGl0b3JUb29scygpKTtcclxuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgncmVmZXJlbmNlX2ltYWdlJywgbmV3IFJlZmVyZW5jZUltYWdlVG9vbHMoKSk7XHJcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2FuaW1hdGlvbicsIG5ldyBBbmltYXRpb25Ub29scygpKTtcclxuXHJcbiAgICAvLyA2LiBBdXRvLXN0YXJ0IGlmIGNvbmZpZ3VyZWRcclxuICAgIGlmIChzZXR0aW5ncy5hdXRvU3RhcnQpIHtcclxuICAgICAgICBtY3BTZXJ2ZXIuc3RhcnQoKS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYFtNQ1BdIEF1dG8tc3RhcnQgZmFpbGVkOiAke2Vyci5tZXNzYWdlfWApO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbTUNQXSBDb2NvcyBNQ1AgRXh0ZW5zaW9uIGxvYWRlZCAoRWRpdG9yIHYke2VkaXRvclZlcnNpb259KWApO1xyXG59XHJcblxyXG4vKipcclxuICogRXh0ZW5zaW9uIHVubG9hZCAtIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBpcyBkaXNhYmxlZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHVubG9hZCgpIHtcclxuICAgIC8vIFJlbW92ZSBlZGl0b3IgYnJvYWRjYXN0IGxpc3RlbmVyc1xyXG4gICAgY29uc3QgbXNnID0gRWRpdG9yLk1lc3NhZ2UgYXMgYW55O1xyXG4gICAgaWYgKG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcikge1xyXG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignbG9nOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xyXG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignbG9nOndhcm4nLCBlZGl0b3JXYXJuSGFuZGxlcik7XHJcbiAgICAgICAgbXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKCdsb2c6ZXJyb3InLCBlZGl0b3JFcnJvckhhbmRsZXIpO1xyXG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignc2NlbmU6bG9nJywgc2NlbmVMb2dIYW5kbGVyKTtcclxuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ3NjZW5lOndhcm4nLCBzY2VuZVdhcm5IYW5kbGVyKTtcclxuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ3NjZW5lOmVycm9yJywgc2NlbmVFcnJvckhhbmRsZXIpO1xyXG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignY29uc29sZTpsb2cnLCBlZGl0b3JMb2dIYW5kbGVyKTtcclxuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ2NvbnNvbGU6d2FybicsIGVkaXRvcldhcm5IYW5kbGVyKTtcclxuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ2NvbnNvbGU6ZXJyb3InLCBlZGl0b3JFcnJvckhhbmRsZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChtY3BTZXJ2ZXIpIHtcclxuICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xyXG4gICAgICAgIG1jcFNlcnZlciA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coJ1tNQ1BdIENvY29zIE1DUCBFeHRlbnNpb24gdW5sb2FkZWQnKTtcclxuXHJcbiAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIGNvbnNvbGVcclxuICAgIHVuaG9va0NvbnNvbGUoKTtcclxufVxyXG4iXX0=