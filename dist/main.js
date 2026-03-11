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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQXVEQSw0Q0FFQztBQXdERCxvQkFpREM7QUFLRCx3QkF3QkM7QUEvTEQsYUFBYTtBQUNiLG1FQUEwQztBQUMxQyw2Q0FBeUM7QUFDekMseUNBQXdEO0FBRXhELHFEQUFpRDtBQUNqRCxtREFBK0M7QUFDL0MsNkRBQXlEO0FBQ3pELHFEQUFpRDtBQUNqRCx1REFBbUQ7QUFDbkQseURBQXFEO0FBQ3JELHFEQUF5RDtBQUN6RCwrREFBMEQ7QUFDMUQsdURBQW1EO0FBQ25ELHlFQUFvRTtBQUNwRSw2REFBeUQ7QUFFekQsSUFBSSxTQUFTLEdBQXFCLElBQUksQ0FBQztBQUN2QyxJQUFJLGFBQWEsR0FBVyxFQUFFLENBQUM7QUFFL0IsMEJBQTBCO0FBQzFCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFDN0IsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMvQixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBRWpDLFNBQVMsV0FBVztJQUNoQixPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTtRQUM3QixRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QixJQUFBLG9CQUFNLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDO0lBQ0YsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUU7UUFDOUIsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBQSxvQkFBTSxFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUMsQ0FBQztJQUNGLE9BQU8sQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQVcsRUFBRSxFQUFFO1FBQy9CLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hDLElBQUEsb0JBQU0sRUFBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNoRCxDQUFDLENBQUM7QUFDTixDQUFDO0FBRUQsU0FBUyxhQUFhO0lBQ2xCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDO0lBQ3ZCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsU0FBUyxDQUFDO0lBQ3pCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDO0FBQy9CLENBQUM7QUFFRCxrRUFBa0U7QUFDbEUsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEdBQVEsRUFBRSxFQUFFLENBQUMsSUFBQSxvQkFBTSxFQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN6RSxNQUFNLGlCQUFpQixHQUFHLENBQUMsR0FBUSxFQUFFLEVBQUUsQ0FBQyxJQUFBLG9CQUFNLEVBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzNFLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxHQUFRLEVBQUUsRUFBRSxDQUFDLElBQUEsb0JBQU0sRUFBQyxjQUFjLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDN0UsTUFBTSxlQUFlLEdBQUcsQ0FBQyxHQUFRLEVBQUUsRUFBRSxDQUFDLElBQUEsb0JBQU0sRUFBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdkUsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLEdBQVEsRUFBRSxFQUFFLENBQUMsSUFBQSxvQkFBTSxFQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN6RSxNQUFNLGlCQUFpQixHQUFHLENBQUMsR0FBUSxFQUFFLEVBQUUsQ0FBQyxJQUFBLG9CQUFNLEVBQUMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBRTNFLG9EQUFvRDtBQUNwRCxTQUFnQixnQkFBZ0I7SUFDNUIsT0FBTyxhQUFhLENBQUM7QUFDekIsQ0FBQztBQUVZLFFBQUEsT0FBTyxHQUE0QztJQUU1RCxTQUFTO1FBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsc0JBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVc7UUFDYixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDYixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQztRQUNsRSxDQUFDO1FBQ0QsSUFBSSxDQUFDO1lBQ0QsTUFBTSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRUQsVUFBVTtRQUNOLElBQUksU0FBUyxFQUFFLENBQUM7WUFDWixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDckIsQ0FBQztRQUNELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELGVBQWU7O1FBQ1gsTUFBTSxRQUFRLEdBQUcsSUFBQSx1QkFBWSxHQUFFLENBQUM7UUFDaEMsT0FBTztZQUNILE9BQU8sRUFBRSxNQUFBLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxTQUFTLEVBQUUsbUNBQUksS0FBSztZQUN4QyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsS0FBSyxFQUFFLE1BQUEsU0FBUyxhQUFULFNBQVMsdUJBQVQsU0FBUyxDQUFFLFlBQVksRUFBRSxtQ0FBSSxDQUFDO1lBQ3JDLE9BQU8sRUFBRSxNQUFBLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxjQUFjLEVBQUUsbUNBQUksQ0FBQztZQUN6QyxTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVM7WUFDN0IsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLGlCQUFpQjtZQUM3QyxZQUFZLEVBQUUsUUFBUSxDQUFDLFlBQVk7U0FDdEMsQ0FBQztJQUNOLENBQUM7SUFFRCxhQUFhOztRQUNULE9BQU8sTUFBQSxTQUFTLGFBQVQsU0FBUyx1QkFBVCxTQUFTLENBQUUsZUFBZSxFQUFFLG1DQUFJLEVBQUUsQ0FBQztJQUM5QyxDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQTJCO1FBQ3RDLElBQUEsdUJBQVksRUFBQyxRQUFRLENBQUMsQ0FBQztRQUN2QixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ1osU0FBUyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztJQUM3QixDQUFDO0NBQ0osQ0FBQztBQUVGOztHQUVHO0FBQ0gsU0FBZ0IsSUFBSTtJQUNoQixrQ0FBa0M7SUFDbEMsV0FBVyxFQUFFLENBQUM7SUFFZCxpRkFBaUY7SUFDakYsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQWMsQ0FBQztJQUNsQyxJQUFJLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzNCLHdCQUF3QjtRQUN4QixHQUFHLENBQUMsb0JBQW9CLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDdEQsR0FBRyxDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3hELEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUMxRCxxQkFBcUI7UUFDckIsR0FBRyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxlQUFlLENBQUMsQ0FBQztRQUN2RCxHQUFHLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDekQsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGFBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNELDBDQUEwQztRQUMxQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDMUQsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzVELEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUNsRSxDQUFDO0lBRUQsMkJBQTJCO0lBQzNCLGFBQWEsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxTQUFTLENBQUM7SUFFaEQsbUJBQW1CO0lBQ25CLE1BQU0sUUFBUSxHQUFHLElBQUEsdUJBQVksR0FBRSxDQUFDO0lBRWhDLG1EQUFtRDtJQUNuRCxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSx3QkFBVSxFQUFFLENBQUMsQ0FBQztJQUMxRCxTQUFTLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLElBQUksc0JBQVMsRUFBRSxDQUFDLENBQUM7SUFDeEQsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxJQUFJLGdDQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSx3QkFBVSxFQUFFLENBQUMsQ0FBQztJQUMxRCxTQUFTLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLElBQUksMEJBQVcsRUFBRSxDQUFDLENBQUM7SUFDNUQsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxJQUFJLDRCQUFZLEVBQUUsQ0FBQyxDQUFDO0lBQzlELFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSx3QkFBVSxFQUFFLENBQUMsQ0FBQztJQUMxRCxTQUFTLENBQUMsb0JBQW9CLENBQUMsWUFBWSxFQUFFLElBQUksaUNBQWMsRUFBRSxDQUFDLENBQUM7SUFDbkUsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxJQUFJLDBCQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQzVELFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLDJDQUFtQixFQUFFLENBQUMsQ0FBQztJQUM3RSxTQUFTLENBQUMsb0JBQW9CLENBQUMsV0FBVyxFQUFFLElBQUksZ0NBQWMsRUFBRSxDQUFDLENBQUM7SUFFbEUsOEJBQThCO0lBQzlCLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ3JCLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFVLEVBQUUsRUFBRTtZQUNuQyxPQUFPLENBQUMsSUFBSSxDQUFDLDRCQUE0QixHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUM1RCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLDZDQUE2QyxhQUFhLEdBQUcsQ0FBQyxDQUFDO0FBQy9FLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLE1BQU07SUFDbEIsb0NBQW9DO0lBQ3BDLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxPQUFjLENBQUM7SUFDbEMsSUFBSSxHQUFHLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUM5QixHQUFHLENBQUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDekQsR0FBRyxDQUFDLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUM3RCxHQUFHLENBQUMsdUJBQXVCLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzFELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUM1RCxHQUFHLENBQUMsdUJBQXVCLENBQUMsYUFBYSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDOUQsR0FBRyxDQUFDLHVCQUF1QixDQUFDLGFBQWEsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzdELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMvRCxHQUFHLENBQUMsdUJBQXVCLENBQUMsZUFBZSxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELElBQUksU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakIsU0FBUyxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0lBRWxELDJCQUEyQjtJQUMzQixhQUFhLEVBQUUsQ0FBQztBQUNwQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWlnbm9yZVxuaW1wb3J0IHBhY2thZ2VKU09OIGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5pbXBvcnQgeyBNQ1BTZXJ2ZXIgfSBmcm9tICcuL21jcC1zZXJ2ZXInO1xuaW1wb3J0IHsgcmVhZFNldHRpbmdzLCBzYXZlU2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IE1DUFNlcnZlclNldHRpbmdzIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBTY2VuZVRvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS10b29scyc7XG5pbXBvcnQgeyBOb2RlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL25vZGUtdG9vbHMnO1xuaW1wb3J0IHsgQ29tcG9uZW50VG9vbHMgfSBmcm9tICcuL3Rvb2xzL2NvbXBvbmVudC10b29scyc7XG5pbXBvcnQgeyBBc3NldFRvb2xzIH0gZnJvbSAnLi90b29scy9hc3NldC10b29scyc7XG5pbXBvcnQgeyBQcmVmYWJUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmFiLXRvb2xzJztcbmltcG9ydCB7IFByb2plY3RUb29scyB9IGZyb20gJy4vdG9vbHMvcHJvamVjdC10b29scyc7XG5pbXBvcnQgeyBEZWJ1Z1Rvb2xzLCBhZGRMb2cgfSBmcm9tICcuL3Rvb2xzL2RlYnVnLXRvb2xzJztcbmltcG9ydCB7IFNjZW5lVmlld1Rvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS12aWV3LXRvb2xzJztcbmltcG9ydCB7IEVkaXRvclRvb2xzIH0gZnJvbSAnLi90b29scy9lZGl0b3ItdG9vbHMnO1xuaW1wb3J0IHsgUmVmZXJlbmNlSW1hZ2VUb29scyB9IGZyb20gJy4vdG9vbHMvcmVmZXJlbmNlLWltYWdlLXRvb2xzJztcbmltcG9ydCB7IEFuaW1hdGlvblRvb2xzIH0gZnJvbSAnLi90b29scy9hbmltYXRpb24tdG9vbHMnO1xuXG5sZXQgbWNwU2VydmVyOiBNQ1BTZXJ2ZXIgfCBudWxsID0gbnVsbDtcbmxldCBlZGl0b3JWZXJzaW9uOiBzdHJpbmcgPSAnJztcblxuLy8gPT09IENvbnNvbGUgY2FwdHVyZSA9PT1cbmNvbnN0IF9vcmlnTG9nID0gY29uc29sZS5sb2c7XG5jb25zdCBfb3JpZ1dhcm4gPSBjb25zb2xlLndhcm47XG5jb25zdCBfb3JpZ0Vycm9yID0gY29uc29sZS5lcnJvcjtcblxuZnVuY3Rpb24gaG9va0NvbnNvbGUoKSB7XG4gICAgY29uc29sZS5sb2cgPSAoLi4uYXJnczogYW55W10pID0+IHtcbiAgICAgICAgX29yaWdMb2cuYXBwbHkoY29uc29sZSwgYXJncyk7XG4gICAgICAgIGFkZExvZygnbG9nJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG4gICAgY29uc29sZS53YXJuID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG4gICAgICAgIF9vcmlnV2Fybi5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgICAgICAgYWRkTG9nKCd3YXJuJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG4gICAgY29uc29sZS5lcnJvciA9ICguLi5hcmdzOiBhbnlbXSkgPT4ge1xuICAgICAgICBfb3JpZ0Vycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgICAgICBhZGRMb2coJ2Vycm9yJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHVuaG9va0NvbnNvbGUoKSB7XG4gICAgY29uc29sZS5sb2cgPSBfb3JpZ0xvZztcbiAgICBjb25zb2xlLndhcm4gPSBfb3JpZ1dhcm47XG4gICAgY29uc29sZS5lcnJvciA9IF9vcmlnRXJyb3I7XG59XG5cbi8vID09PSBFZGl0b3IgbWVzc2FnZSBsaXN0ZW5lciBmb3IgY2FwdHVyaW5nIGVkaXRvci1sZXZlbCBsb2dzID09PVxuY29uc3QgZWRpdG9yTG9nSGFuZGxlciA9IChtc2c6IGFueSkgPT4gYWRkTG9nKCdlZGl0b3ItbG9nJywgU3RyaW5nKG1zZykpO1xuY29uc3QgZWRpdG9yV2FybkhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnZWRpdG9yLXdhcm4nLCBTdHJpbmcobXNnKSk7XG5jb25zdCBlZGl0b3JFcnJvckhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnZWRpdG9yLWVycm9yJywgU3RyaW5nKG1zZykpO1xuY29uc3Qgc2NlbmVMb2dIYW5kbGVyID0gKG1zZzogYW55KSA9PiBhZGRMb2coJ3NjZW5lLWxvZycsIFN0cmluZyhtc2cpKTtcbmNvbnN0IHNjZW5lV2FybkhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnc2NlbmUtd2FybicsIFN0cmluZyhtc2cpKTtcbmNvbnN0IHNjZW5lRXJyb3JIYW5kbGVyID0gKG1zZzogYW55KSA9PiBhZGRMb2coJ3NjZW5lLWVycm9yJywgU3RyaW5nKG1zZykpO1xuXG4vKiogR2V0IHRoZSBkZXRlY3RlZCBDb2NvcyBDcmVhdG9yIGVkaXRvciB2ZXJzaW9uICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RWRpdG9yVmVyc2lvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiBlZGl0b3JWZXJzaW9uO1xufVxuXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnkpID0+IGFueSB9ID0ge1xuXG4gICAgb3BlblBhbmVsKCkge1xuICAgICAgICBFZGl0b3IuUGFuZWwub3BlbihwYWNrYWdlSlNPTi5uYW1lKTtcbiAgICB9LFxuXG4gICAgYXN5bmMgc3RhcnRTZXJ2ZXIoKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKCFtY3BTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01DUFNlcnZlciBub3QgaW5pdGlhbGl6ZWQnIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IG1jcFNlcnZlci5zdGFydCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHN0b3BTZXJ2ZXIoKTogeyBzdWNjZXNzOiBib29sZWFuIH0ge1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxuXG4gICAgZ2V0U2VydmVyU3RhdHVzKCkge1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHJlYWRTZXR0aW5ncygpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcnVubmluZzogbWNwU2VydmVyPy5pc1J1bm5pbmcoKSA/PyBmYWxzZSxcbiAgICAgICAgICAgIHBvcnQ6IHNldHRpbmdzLnBvcnQsXG4gICAgICAgICAgICB0b29sczogbWNwU2VydmVyPy5nZXRUb29sQ291bnQoKSA/PyAwLFxuICAgICAgICAgICAgYWN0aW9uczogbWNwU2VydmVyPy5nZXRBY3Rpb25Db3VudCgpID8/IDAsXG4gICAgICAgICAgICBhdXRvU3RhcnQ6IHNldHRpbmdzLmF1dG9TdGFydCxcbiAgICAgICAgICAgIGVuYWJsZWRDYXRlZ29yaWVzOiBzZXR0aW5ncy5lbmFibGVkQ2F0ZWdvcmllcyxcbiAgICAgICAgICAgIGVuYWJsZWRUb29sczogc2V0dGluZ3MuZW5hYmxlZFRvb2xzLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBnZXRDYXRlZ29yaWVzKCkge1xuICAgICAgICByZXR1cm4gbWNwU2VydmVyPy5nZXRBbGxUb29sc0luZm8oKSA/PyBbXTtcbiAgICB9LFxuXG4gICAgdXBkYXRlU2V0dGluZ3Moc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKTogeyBzdWNjZXNzOiBib29sZWFuIH0ge1xuICAgICAgICBzYXZlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICBtY3BTZXJ2ZXIudXBkYXRlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBFeHRlbnNpb24gbG9hZCAtIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBpcyBlbmFibGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkge1xuICAgIC8vIDEuIEhvb2sgY29uc29sZSB0byBjYXB0dXJlIGxvZ3NcbiAgICBob29rQ29uc29sZSgpO1xuXG4gICAgLy8gMi4gTGlzdGVuIGZvciBlZGl0b3ItbGV2ZWwgYnJvYWRjYXN0IG1lc3NhZ2VzIChtdWx0aXBsZSBjaGFubmVscyBmb3IgY292ZXJhZ2UpXG4gICAgY29uc3QgbXNnID0gRWRpdG9yLk1lc3NhZ2UgYXMgYW55O1xuICAgIGlmIChtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIpIHtcbiAgICAgICAgLy8gRWRpdG9yIGNvbnNvbGUgZXZlbnRzXG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignbG9nOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzp3YXJuJywgZWRpdG9yV2FybkhhbmRsZXIpO1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzplcnJvcicsIGVkaXRvckVycm9ySGFuZGxlcik7XG4gICAgICAgIC8vIFNjZW5lLWxldmVsIGV2ZW50c1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ3NjZW5lOmxvZycsIHNjZW5lTG9nSGFuZGxlcik7XG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignc2NlbmU6d2FybicsIHNjZW5lV2FybkhhbmRsZXIpO1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ3NjZW5lOmVycm9yJywgc2NlbmVFcnJvckhhbmRsZXIpO1xuICAgICAgICAvLyBDb25zb2xlIHBhbmVsIGV2ZW50cyAoYWx0ZXJuYXRlIG5hbWluZylcbiAgICAgICAgbXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKCdjb25zb2xlOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ2NvbnNvbGU6d2FybicsIGVkaXRvcldhcm5IYW5kbGVyKTtcbiAgICAgICAgbXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKCdjb25zb2xlOmVycm9yJywgZWRpdG9yRXJyb3JIYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvLyAzLiBEZXRlY3QgZWRpdG9yIHZlcnNpb25cbiAgICBlZGl0b3JWZXJzaW9uID0gRWRpdG9yLkFwcC52ZXJzaW9uIHx8ICd1bmtub3duJztcblxuICAgIC8vIDQuIFJlYWQgc2V0dGluZ3NcbiAgICBjb25zdCBzZXR0aW5ncyA9IHJlYWRTZXR0aW5ncygpO1xuXG4gICAgLy8gNS4gQ3JlYXRlIE1DUCBzZXJ2ZXIgaW5zdGFuY2UgYW5kIHJlZ2lzdGVyIHRvb2xzXG4gICAgbWNwU2VydmVyID0gbmV3IE1DUFNlcnZlcihzZXR0aW5ncyk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdzY2VuZScsIG5ldyBTY2VuZVRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnbm9kZScsIG5ldyBOb2RlVG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdjb21wb25lbnQnLCBuZXcgQ29tcG9uZW50VG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdhc3NldCcsIG5ldyBBc3NldFRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgncHJlZmFiJywgbmV3IFByZWZhYlRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgncHJvamVjdCcsIG5ldyBQcm9qZWN0VG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdkZWJ1ZycsIG5ldyBEZWJ1Z1Rvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnc2NlbmVfdmlldycsIG5ldyBTY2VuZVZpZXdUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2VkaXRvcicsIG5ldyBFZGl0b3JUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ3JlZmVyZW5jZV9pbWFnZScsIG5ldyBSZWZlcmVuY2VJbWFnZVRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnYW5pbWF0aW9uJywgbmV3IEFuaW1hdGlvblRvb2xzKCkpO1xuXG4gICAgLy8gNi4gQXV0by1zdGFydCBpZiBjb25maWd1cmVkXG4gICAgaWYgKHNldHRpbmdzLmF1dG9TdGFydCkge1xuICAgICAgICBtY3BTZXJ2ZXIuc3RhcnQoKS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBbTUNQXSBBdXRvLXN0YXJ0IGZhaWxlZDogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coYFtNQ1BdIENvY29zIE1DUCBFeHRlbnNpb24gbG9hZGVkIChFZGl0b3IgdiR7ZWRpdG9yVmVyc2lvbn0pYCk7XG59XG5cbi8qKlxuICogRXh0ZW5zaW9uIHVubG9hZCAtIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBpcyBkaXNhYmxlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5sb2FkKCkge1xuICAgIC8vIFJlbW92ZSBlZGl0b3IgYnJvYWRjYXN0IGxpc3RlbmVyc1xuICAgIGNvbnN0IG1zZyA9IEVkaXRvci5NZXNzYWdlIGFzIGFueTtcbiAgICBpZiAobXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKSB7XG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignbG9nOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzp3YXJuJywgZWRpdG9yV2FybkhhbmRsZXIpO1xuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzplcnJvcicsIGVkaXRvckVycm9ySGFuZGxlcik7XG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignc2NlbmU6bG9nJywgc2NlbmVMb2dIYW5kbGVyKTtcbiAgICAgICAgbXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKCdzY2VuZTp3YXJuJywgc2NlbmVXYXJuSGFuZGxlcik7XG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignc2NlbmU6ZXJyb3InLCBzY2VuZUVycm9ySGFuZGxlcik7XG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignY29uc29sZTpsb2cnLCBlZGl0b3JMb2dIYW5kbGVyKTtcbiAgICAgICAgbXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKCdjb25zb2xlOndhcm4nLCBlZGl0b3JXYXJuSGFuZGxlcik7XG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignY29uc29sZTplcnJvcicsIGVkaXRvckVycm9ySGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKG1jcFNlcnZlcikge1xuICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xuICAgICAgICBtY3BTZXJ2ZXIgPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKCdbTUNQXSBDb2NvcyBNQ1AgRXh0ZW5zaW9uIHVubG9hZGVkJyk7XG5cbiAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIGNvbnNvbGVcbiAgICB1bmhvb2tDb25zb2xlKCk7XG59XG4iXX0=