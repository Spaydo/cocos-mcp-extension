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
        var _a, _b;
        const settings = (0, settings_1.readSettings)();
        return {
            running: (_a = mcpServer === null || mcpServer === void 0 ? void 0 : mcpServer.isRunning()) !== null && _a !== void 0 ? _a : false,
            port: settings.port,
            tools: (_b = mcpServer === null || mcpServer === void 0 ? void 0 : mcpServer.getToolCount()) !== null && _b !== void 0 ? _b : 0,
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
    // 2. Listen for editor-level broadcast messages
    const msg = Editor.Message;
    if (msg.addBroadcastListener) {
        msg.addBroadcastListener('log:log', editorLogHandler);
        msg.addBroadcastListener('log:warn', editorWarnHandler);
        msg.addBroadcastListener('log:error', editorErrorHandler);
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
    }
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
    console.log('[MCP] Cocos MCP Extension unloaded');
    // Restore original console
    unhookConsole();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQW9EQSw0Q0FFQztBQXVERCxvQkF3Q0M7QUFLRCx3QkFrQkM7QUE1S0QsYUFBYTtBQUNiLG1FQUEwQztBQUMxQyw2Q0FBeUM7QUFDekMseUNBQXdEO0FBRXhELHFEQUFpRDtBQUNqRCxtREFBK0M7QUFDL0MsNkRBQXlEO0FBQ3pELHFEQUFpRDtBQUNqRCx1REFBbUQ7QUFDbkQseURBQXFEO0FBQ3JELHFEQUF5RDtBQUN6RCwrREFBMEQ7QUFDMUQsdURBQW1EO0FBQ25ELHlFQUFvRTtBQUNwRSw2REFBeUQ7QUFFekQsSUFBSSxTQUFTLEdBQXFCLElBQUksQ0FBQztBQUN2QyxJQUFJLGFBQWEsR0FBVyxFQUFFLENBQUM7QUFFL0IsMEJBQTBCO0FBQzFCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFDN0IsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMvQixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBRWpDLFNBQVMsV0FBVztJQUNoQixPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTtRQUM3QixRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QixJQUFBLG9CQUFNLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDO0lBQ0YsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUU7UUFDOUIsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBQSxvQkFBTSxFQUFDLE1BQU0sRUFBRSxJ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QyxPQUFjLENBQUM7SUFDbEMsSUFBSSxHQUFHLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztRQUM5QixHQUFHLENBQUMsdUJBQXVCLENBQUMsU0FBUyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDekQsR0FBRyxDQUFDLHVCQUF1QixDQUFDLFVBQVUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQixTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7SUFFbEQsMkJBQTJCO0lBQzNCLGFBQWEsRUFBRSxDQUFDO0FBQ3BCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtaWdub3JlXG5pbXBvcnQgcGFja2FnZUpTT04gZnJvbSAnLi4vcGFja2FnZS5qc29uJztcbmltcG9ydCB7IE1DUFNlcnZlciB9IGZyb20gJy4vbWNwLXNlcnZlcic7XG5pbXBvcnQgeyByZWFkU2V0dGluZ3MsIHNhdmVTZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuaW1wb3J0IHsgTUNQU2VydmVyU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFNjZW5lVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLXRvb2xzJztcbmltcG9ydCB7IE5vZGVUb29scyB9IGZyb20gJy4vdG9vbHMvbm9kZS10b29scyc7XG5pbXBvcnQgeyBDb21wb25lbnRUb29scyB9IGZyb20gJy4vdG9vbHMvY29tcG9uZW50LXRvb2xzJztcbmltcG9ydCB7IEFzc2V0VG9vbHMgfSBmcm9tICcuL3Rvb2xzL2Fzc2V0LXRvb2xzJztcbmltcG9ydCB7IFByZWZhYlRvb2xzIH0gZnJvbSAnLi90b29scy9wcmVmYWItdG9vbHMnO1xuaW1wb3J0IHsgUHJvamVjdFRvb2xzIH0gZnJvbSAnLi90b29scy9wcm9qZWN0LXRvb2xzJztcbmltcG9ydCB7IERlYnVnVG9vbHMsIGFkZExvZyB9IGZyb20gJy4vdG9vbHMvZGVidWctdG9vbHMnO1xuaW1wb3J0IHsgU2NlbmVWaWV3VG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLXZpZXctdG9vbHMnO1xuaW1wb3J0IHsgRWRpdG9yVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2VkaXRvci10b29scyc7XG5pbXBvcnQgeyBSZWZlcmVuY2VJbWFnZVRvb2xzIH0gZnJvbSAnLi90b29scy9yZWZlcmVuY2UtaW1hZ2UtdG9vbHMnO1xuaW1wb3J0IHsgQW5pbWF0aW9uVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2FuaW1hdGlvbi10b29scyc7XG5cbmxldCBtY3BTZXJ2ZXI6IE1DUFNlcnZlciB8IG51bGwgPSBudWxsO1xubGV0IGVkaXRvclZlcnNpb246IHN0cmluZyA9ICcnO1xuXG4vLyA9PT0gQ29uc29sZSBjYXB0dXJlID09PVxuY29uc3QgX29yaWdMb2cgPSBjb25zb2xlLmxvZztcbmNvbnN0IF9vcmlnV2FybiA9IGNvbnNvbGUud2FybjtcbmNvbnN0IF9vcmlnRXJyb3IgPSBjb25zb2xlLmVycm9yO1xuXG5mdW5jdGlvbiBob29rQ29uc29sZSgpIHtcbiAgICBjb25zb2xlLmxvZyA9ICguLi5hcmdzOiBhbnlbXSkgPT4ge1xuICAgICAgICBfb3JpZ0xvZy5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgICAgICAgYWRkTG9nKCdsb2cnLCBhcmdzLm1hcChTdHJpbmcpLmpvaW4oJyAnKSk7XG4gICAgfTtcbiAgICBjb25zb2xlLndhcm4gPSAoLi4uYXJnczogYW55W10pID0+IHtcbiAgICAgICAgX29yaWdXYXJuLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgICAgICBhZGRMb2coJ3dhcm4nLCBhcmdzLm1hcChTdHJpbmcpLmpvaW4oJyAnKSk7XG4gICAgfTtcbiAgICBjb25zb2xlLmVycm9yID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG4gICAgICAgIF9vcmlnRXJyb3IuYXBwbHkoY29uc29sZSwgYXJncyk7XG4gICAgICAgIGFkZExvZygnZXJyb3InLCBhcmdzLm1hcChTdHJpbmcpLmpvaW4oJyAnKSk7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gdW5ob29rQ29uc29sZSgpIHtcbiAgICBjb25zb2xlLmxvZyA9IF9vcmlnTG9nO1xuICAgIGNvbnNvbGUud2FybiA9IF9vcmlnV2FybjtcbiAgICBjb25zb2xlLmVycm9yID0gX29yaWdFcnJvcjtcbn1cblxuLy8gPT09IEVkaXRvciBtZXNzYWdlIGxpc3RlbmVyIGZvciBjYXB0dXJpbmcgZWRpdG9yLWxldmVsIGxvZ3MgPT09XG5jb25zdCBlZGl0b3JMb2dIYW5kbGVyID0gKG1zZzogYW55KSA9PiBhZGRMb2coJ2VkaXRvci1sb2cnLCBTdHJpbmcobXNnKSk7XG5jb25zdCBlZGl0b3JXYXJuSGFuZGxlciA9IChtc2c6IGFueSkgPT4gYWRkTG9nKCdlZGl0b3Itd2FybicsIFN0cmluZyhtc2cpKTtcbmNvbnN0IGVkaXRvckVycm9ySGFuZGxlciA9IChtc2c6IGFueSkgPT4gYWRkTG9nKCdlZGl0b3ItZXJyb3InLCBTdHJpbmcobXNnKSk7XG5cbi8qKiBHZXQgdGhlIGRldGVjdGVkIENvY29zIENyZWF0b3IgZWRpdG9yIHZlcnNpb24gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRFZGl0b3JWZXJzaW9uKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGVkaXRvclZlcnNpb247XG59XG5cbmV4cG9ydCBjb25zdCBtZXRob2RzOiB7IFtrZXk6IHN0cmluZ106ICguLi5hbnk6IGFueSkgPT4gYW55IH0gPSB7XG5cbiAgICBvcGVuUGFuZWwoKSB7XG4gICAgICAgIEVkaXRvci5QYW5lbC5vcGVuKHBhY2thZ2VKU09OLm5hbWUpO1xuICAgIH0sXG5cbiAgICBhc3luYyBzdGFydFNlcnZlcigpOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgZXJyb3I/OiBzdHJpbmcgfT4ge1xuICAgICAgICBpZiAoIW1jcFNlcnZlcikge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTUNQU2VydmVyIG5vdCBpbml0aWFsaXplZCcgfTtcbiAgICAgICAgfVxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgYXdhaXQgbWNwU2VydmVyLnN0YXJ0KCk7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgc3RvcFNlcnZlcigpOiB7IHN1Y2Nlc3M6IGJvb2xlYW4gfSB7XG4gICAgICAgIGlmIChtY3BTZXJ2ZXIpIHtcbiAgICAgICAgICAgIG1jcFNlcnZlci5zdG9wKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgIH0sXG5cbiAgICBnZXRTZXJ2ZXJTdGF0dXMoKSB7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gcmVhZFNldHRpbmdzKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBydW5uaW5nOiBtY3BTZXJ2ZXI/LmlzUnVubmluZygpID8/IGZhbHNlLFxuICAgICAgICAgICAgcG9ydDogc2V0dGluZ3MucG9ydCxcbiAgICAgICAgICAgIHRvb2xzOiBtY3BTZXJ2ZXI/LmdldFRvb2xDb3VudCgpID8/IDAsXG4gICAgICAgICAgICBhdXRvU3RhcnQ6IHNldHRpbmdzLmF1dG9TdGFydCxcbiAgICAgICAgICAgIGVuYWJsZWRDYXRlZ29yaWVzOiBzZXR0aW5ncy5lbmFibGVkQ2F0ZWdvcmllcyxcbiAgICAgICAgICAgIGVuYWJsZWRUb29sczogc2V0dGluZ3MuZW5hYmxlZFRvb2xzLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBnZXRDYXRlZ29yaWVzKCkge1xuICAgICAgICByZXR1cm4gbWNwU2VydmVyPy5nZXRBbGxUb29sc0luZm8oKSA/PyBbXTtcbiAgICB9LFxuXG4gICAgdXBkYXRlU2V0dGluZ3Moc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKTogeyBzdWNjZXNzOiBib29sZWFuIH0ge1xuICAgICAgICBzYXZlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICBtY3BTZXJ2ZXIudXBkYXRlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBFeHRlbnNpb24gbG9hZCAtIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBpcyBlbmFibGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkge1xuICAgIC8vIDEuIEhvb2sgY29uc29sZSB0byBjYXB0dXJlIGxvZ3NcbiAgICBob29rQ29uc29sZSgpO1xuXG4gICAgLy8gMi4gTGlzdGVuIGZvciBlZGl0b3ItbGV2ZWwgYnJvYWRjYXN0IG1lc3NhZ2VzXG4gICAgY29uc3QgbXNnID0gRWRpdG9yLk1lc3NhZ2UgYXMgYW55O1xuICAgIGlmIChtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIpIHtcbiAgICAgICAgbXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKCdsb2c6bG9nJywgZWRpdG9yTG9nSGFuZGxlcik7XG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignbG9nOndhcm4nLCBlZGl0b3JXYXJuSGFuZGxlcik7XG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignbG9nOmVycm9yJywgZWRpdG9yRXJyb3JIYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvLyAzLiBEZXRlY3QgZWRpdG9yIHZlcnNpb25cbiAgICBlZGl0b3JWZXJzaW9uID0gRWRpdG9yLkFwcC52ZXJzaW9uIHx8ICd1bmtub3duJztcblxuICAgIC8vIDQuIFJlYWQgc2V0dGluZ3NcbiAgICBjb25zdCBzZXR0aW5ncyA9IHJlYWRTZXR0aW5ncygpO1xuXG4gICAgLy8gNS4gQ3JlYXRlIE1DUCBzZXJ2ZXIgaW5zdGFuY2UgYW5kIHJlZ2lzdGVyIHRvb2xzXG4gICAgbWNwU2VydmVyID0gbmV3IE1DUFNlcnZlcihzZXR0aW5ncyk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdzY2VuZScsIG5ldyBTY2VuZVRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnbm9kZScsIG5ldyBOb2RlVG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdjb21wb25lbnQnLCBuZXcgQ29tcG9uZW50VG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdhc3NldCcsIG5ldyBBc3NldFRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgncHJlZmFiJywgbmV3IFByZWZhYlRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgncHJvamVjdCcsIG5ldyBQcm9qZWN0VG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdkZWJ1ZycsIG5ldyBEZWJ1Z1Rvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnc2NlbmVfdmlldycsIG5ldyBTY2VuZVZpZXdUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2VkaXRvcicsIG5ldyBFZGl0b3JUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ3JlZmVyZW5jZV9pbWFnZScsIG5ldyBSZWZlcmVuY2VJbWFnZVRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnYW5pbWF0aW9uJywgbmV3IEFuaW1hdGlvblRvb2xzKCkpO1xuXG4gICAgLy8gNi4gQXV0by1zdGFydCBpZiBjb25maWd1cmVkXG4gICAgaWYgKHNldHRpbmdzLmF1dG9TdGFydCkge1xuICAgICAgICBtY3BTZXJ2ZXIuc3RhcnQoKS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBbTUNQXSBBdXRvLXN0YXJ0IGZhaWxlZDogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coYFtNQ1BdIENvY29zIE1DUCBFeHRlbnNpb24gbG9hZGVkIChFZGl0b3IgdiR7ZWRpdG9yVmVyc2lvbn0pYCk7XG59XG5cbi8qKlxuICogRXh0ZW5zaW9uIHVubG9hZCAtIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBpcyBkaXNhYmxlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5sb2FkKCkge1xuICAgIC8vIFJlbW92ZSBlZGl0b3IgYnJvYWRjYXN0IGxpc3RlbmVyc1xuICAgIGNvbnN0IG1zZyA9IEVkaXRvci5NZXNzYWdlIGFzIGFueTtcbiAgICBpZiAobXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKSB7XG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignbG9nOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzp3YXJuJywgZWRpdG9yV2FybkhhbmRsZXIpO1xuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzplcnJvcicsIGVkaXRvckVycm9ySGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKG1jcFNlcnZlcikge1xuICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xuICAgICAgICBtY3BTZXJ2ZXIgPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKCdbTUNQXSBDb2NvcyBNQ1AgRXh0ZW5zaW9uIHVubG9hZGVkJyk7XG5cbiAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIGNvbnNvbGVcbiAgICB1bmhvb2tDb25zb2xlKCk7XG59XG4iXX0=