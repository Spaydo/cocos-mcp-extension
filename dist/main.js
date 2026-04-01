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
const validation_tools_1 = require("./tools/validation-tools");
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
    mcpServer.registerToolCategory('validation', new validation_tools_1.ValidationTools());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQXdEQSw0Q0FFQztBQXdERCxvQkFrREM7QUFLRCx3QkF3QkM7QUFqTUQsYUFBYTtBQUNiLG1FQUEwQztBQUMxQyw2Q0FBeUM7QUFDekMseUNBQXdEO0FBRXhELHFEQUFpRDtBQUNqRCxtREFBK0M7QUFDL0MsNkRBQXlEO0FBQ3pELHFEQUFpRDtBQUNqRCx1REFBbUQ7QUFDbkQseURBQXFEO0FBQ3JELHFEQUF5RDtBQUN6RCwrREFBMEQ7QUFDMUQsdURBQW1EO0FBQ25ELHlFQUFvRTtBQUNwRSw2REFBeUQ7QUFDekQsK0RBQTJEO0FBRTNELElBQUksU0FBUyxHQUFxQixJQUFJLENBQUM7QUFDdkMsSUFBSSxhQUFhLEdBQVcsRUFBRSxDQUFDO0FBRS9CLDBCQUEwQjtBQUMxQixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO0FBQzdCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUM7QUFDL0IsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQztBQUVqQyxTQUFTLFdBQVc7SUFDaEIsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUU7UUFDN0IsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDOUIsSUFBQSxvQkFBTSxFQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzlDLENBQUMsQ0FBQztJQUNGLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQVcsRUFBRSxFQUFFO1FBQzlCLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQy9CLElBQUEsb0JBQU0sRUFB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Q0FBQyxTQUFTLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUN6RCxHQUFHLENBQUMsdUJBQXVCLENBQUMsVUFBVSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDM0QsR0FBRyxDQUFDLHVCQUF1QixDQUFDLFdBQVcsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzdELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxXQUFXLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDMUQsR0FBRyxDQUFDLHVCQUF1QixDQUFDLFlBQVksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzVELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxhQUFhLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUM5RCxHQUFHLENBQUMsdUJBQXVCLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDN0QsR0FBRyxDQUFDLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQy9ELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBRUQsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNaLFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQixTQUFTLEdBQUcsSUFBSSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7SUFFbEQsMkJBQTJCO0lBQzNCLGFBQWEsRUFBRSxDQUFDO0FBQ3BCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAdHMtaWdub3JlXG5pbXBvcnQgcGFja2FnZUpTT04gZnJvbSAnLi4vcGFja2FnZS5qc29uJztcbmltcG9ydCB7IE1DUFNlcnZlciB9IGZyb20gJy4vbWNwLXNlcnZlcic7XG5pbXBvcnQgeyByZWFkU2V0dGluZ3MsIHNhdmVTZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuaW1wb3J0IHsgTUNQU2VydmVyU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFNjZW5lVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLXRvb2xzJztcbmltcG9ydCB7IE5vZGVUb29scyB9IGZyb20gJy4vdG9vbHMvbm9kZS10b29scyc7XG5pbXBvcnQgeyBDb21wb25lbnRUb29scyB9IGZyb20gJy4vdG9vbHMvY29tcG9uZW50LXRvb2xzJztcbmltcG9ydCB7IEFzc2V0VG9vbHMgfSBmcm9tICcuL3Rvb2xzL2Fzc2V0LXRvb2xzJztcbmltcG9ydCB7IFByZWZhYlRvb2xzIH0gZnJvbSAnLi90b29scy9wcmVmYWItdG9vbHMnO1xuaW1wb3J0IHsgUHJvamVjdFRvb2xzIH0gZnJvbSAnLi90b29scy9wcm9qZWN0LXRvb2xzJztcbmltcG9ydCB7IERlYnVnVG9vbHMsIGFkZExvZyB9IGZyb20gJy4vdG9vbHMvZGVidWctdG9vbHMnO1xuaW1wb3J0IHsgU2NlbmVWaWV3VG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLXZpZXctdG9vbHMnO1xuaW1wb3J0IHsgRWRpdG9yVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2VkaXRvci10b29scyc7XG5pbXBvcnQgeyBSZWZlcmVuY2VJbWFnZVRvb2xzIH0gZnJvbSAnLi90b29scy9yZWZlcmVuY2UtaW1hZ2UtdG9vbHMnO1xuaW1wb3J0IHsgQW5pbWF0aW9uVG9vbHMgfSBmcm9tICcuL3Rvb2xzL2FuaW1hdGlvbi10b29scyc7XG5pbXBvcnQgeyBWYWxpZGF0aW9uVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3ZhbGlkYXRpb24tdG9vbHMnO1xuXG5sZXQgbWNwU2VydmVyOiBNQ1BTZXJ2ZXIgfCBudWxsID0gbnVsbDtcbmxldCBlZGl0b3JWZXJzaW9uOiBzdHJpbmcgPSAnJztcblxuLy8gPT09IENvbnNvbGUgY2FwdHVyZSA9PT1cbmNvbnN0IF9vcmlnTG9nID0gY29uc29sZS5sb2c7XG5jb25zdCBfb3JpZ1dhcm4gPSBjb25zb2xlLndhcm47XG5jb25zdCBfb3JpZ0Vycm9yID0gY29uc29sZS5lcnJvcjtcblxuZnVuY3Rpb24gaG9va0NvbnNvbGUoKSB7XG4gICAgY29uc29sZS5sb2cgPSAoLi4uYXJnczogYW55W10pID0+IHtcbiAgICAgICAgX29yaWdMb2cuYXBwbHkoY29uc29sZSwgYXJncyk7XG4gICAgICAgIGFkZExvZygnbG9nJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG4gICAgY29uc29sZS53YXJuID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG4gICAgICAgIF9vcmlnV2Fybi5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgICAgICAgYWRkTG9nKCd3YXJuJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG4gICAgY29uc29sZS5lcnJvciA9ICguLi5hcmdzOiBhbnlbXSkgPT4ge1xuICAgICAgICBfb3JpZ0Vycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgICAgICBhZGRMb2coJ2Vycm9yJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHVuaG9va0NvbnNvbGUoKSB7XG4gICAgY29uc29sZS5sb2cgPSBfb3JpZ0xvZztcbiAgICBjb25zb2xlLndhcm4gPSBfb3JpZ1dhcm47XG4gICAgY29uc29sZS5lcnJvciA9IF9vcmlnRXJyb3I7XG59XG5cbi8vID09PSBFZGl0b3IgbWVzc2FnZSBsaXN0ZW5lciBmb3IgY2FwdHVyaW5nIGVkaXRvci1sZXZlbCBsb2dzID09PVxuY29uc3QgZWRpdG9yTG9nSGFuZGxlciA9IChtc2c6IGFueSkgPT4gYWRkTG9nKCdlZGl0b3ItbG9nJywgU3RyaW5nKG1zZykpO1xuY29uc3QgZWRpdG9yV2FybkhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnZWRpdG9yLXdhcm4nLCBTdHJpbmcobXNnKSk7XG5jb25zdCBlZGl0b3JFcnJvckhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnZWRpdG9yLWVycm9yJywgU3RyaW5nKG1zZykpO1xuY29uc3Qgc2NlbmVMb2dIYW5kbGVyID0gKG1zZzogYW55KSA9PiBhZGRMb2coJ3NjZW5lLWxvZycsIFN0cmluZyhtc2cpKTtcbmNvbnN0IHNjZW5lV2FybkhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnc2NlbmUtd2FybicsIFN0cmluZyhtc2cpKTtcbmNvbnN0IHNjZW5lRXJyb3JIYW5kbGVyID0gKG1zZzogYW55KSA9PiBhZGRMb2coJ3NjZW5lLWVycm9yJywgU3RyaW5nKG1zZykpO1xuXG4vKiogR2V0IHRoZSBkZXRlY3RlZCBDb2NvcyBDcmVhdG9yIGVkaXRvciB2ZXJzaW9uICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RWRpdG9yVmVyc2lvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiBlZGl0b3JWZXJzaW9uO1xufVxuXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnkpID0+IGFueSB9ID0ge1xuXG4gICAgb3BlblBhbmVsKCkge1xuICAgICAgICBFZGl0b3IuUGFuZWwub3BlbihwYWNrYWdlSlNPTi5uYW1lKTtcbiAgICB9LFxuXG4gICAgYXN5bmMgc3RhcnRTZXJ2ZXIoKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKCFtY3BTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01DUFNlcnZlciBub3QgaW5pdGlhbGl6ZWQnIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IG1jcFNlcnZlci5zdGFydCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHN0b3BTZXJ2ZXIoKTogeyBzdWNjZXNzOiBib29sZWFuIH0ge1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxuXG4gICAgZ2V0U2VydmVyU3RhdHVzKCkge1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHJlYWRTZXR0aW5ncygpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcnVubmluZzogbWNwU2VydmVyPy5pc1J1bm5pbmcoKSA/PyBmYWxzZSxcbiAgICAgICAgICAgIHBvcnQ6IHNldHRpbmdzLnBvcnQsXG4gICAgICAgICAgICB0b29sczogbWNwU2VydmVyPy5nZXRUb29sQ291bnQoKSA/PyAwLFxuICAgICAgICAgICAgYWN0aW9uczogbWNwU2VydmVyPy5nZXRBY3Rpb25Db3VudCgpID8/IDAsXG4gICAgICAgICAgICBhdXRvU3RhcnQ6IHNldHRpbmdzLmF1dG9TdGFydCxcbiAgICAgICAgICAgIGVuYWJsZWRDYXRlZ29yaWVzOiBzZXR0aW5ncy5lbmFibGVkQ2F0ZWdvcmllcyxcbiAgICAgICAgICAgIGVuYWJsZWRUb29sczogc2V0dGluZ3MuZW5hYmxlZFRvb2xzLFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBnZXRDYXRlZ29yaWVzKCkge1xuICAgICAgICByZXR1cm4gbWNwU2VydmVyPy5nZXRBbGxUb29sc0luZm8oKSA/PyBbXTtcbiAgICB9LFxuXG4gICAgdXBkYXRlU2V0dGluZ3Moc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKTogeyBzdWNjZXNzOiBib29sZWFuIH0ge1xuICAgICAgICBzYXZlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICBtY3BTZXJ2ZXIudXBkYXRlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBFeHRlbnNpb24gbG9hZCAtIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBpcyBlbmFibGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkge1xuICAgIC8vIDEuIEhvb2sgY29uc29sZSB0byBjYXB0dXJlIGxvZ3NcbiAgICBob29rQ29uc29sZSgpO1xuXG4gICAgLy8gMi4gTGlzdGVuIGZvciBlZGl0b3ItbGV2ZWwgYnJvYWRjYXN0IG1lc3NhZ2VzIChtdWx0aXBsZSBjaGFubmVscyBmb3IgY292ZXJhZ2UpXG4gICAgY29uc3QgbXNnID0gRWRpdG9yLk1lc3NhZ2UgYXMgYW55O1xuICAgIGlmIChtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIpIHtcbiAgICAgICAgLy8gRWRpdG9yIGNvbnNvbGUgZXZlbnRzXG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignbG9nOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzp3YXJuJywgZWRpdG9yV2FybkhhbmRsZXIpO1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzplcnJvcicsIGVkaXRvckVycm9ySGFuZGxlcik7XG4gICAgICAgIC8vIFNjZW5lLWxldmVsIGV2ZW50c1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ3NjZW5lOmxvZycsIHNjZW5lTG9nSGFuZGxlcik7XG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignc2NlbmU6d2FybicsIHNjZW5lV2FybkhhbmRsZXIpO1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ3NjZW5lOmVycm9yJywgc2NlbmVFcnJvckhhbmRsZXIpO1xuICAgICAgICAvLyBDb25zb2xlIHBhbmVsIGV2ZW50cyAoYWx0ZXJuYXRlIG5hbWluZylcbiAgICAgICAgbXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKCdjb25zb2xlOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ2NvbnNvbGU6d2FybicsIGVkaXRvcldhcm5IYW5kbGVyKTtcbiAgICAgICAgbXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKCdjb25zb2xlOmVycm9yJywgZWRpdG9yRXJyb3JIYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvLyAzLiBEZXRlY3QgZWRpdG9yIHZlcnNpb25cbiAgICBlZGl0b3JWZXJzaW9uID0gRWRpdG9yLkFwcC52ZXJzaW9uIHx8ICd1bmtub3duJztcblxuICAgIC8vIDQuIFJlYWQgc2V0dGluZ3NcbiAgICBjb25zdCBzZXR0aW5ncyA9IHJlYWRTZXR0aW5ncygpO1xuXG4gICAgLy8gNS4gQ3JlYXRlIE1DUCBzZXJ2ZXIgaW5zdGFuY2UgYW5kIHJlZ2lzdGVyIHRvb2xzXG4gICAgbWNwU2VydmVyID0gbmV3IE1DUFNlcnZlcihzZXR0aW5ncyk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdzY2VuZScsIG5ldyBTY2VuZVRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnbm9kZScsIG5ldyBOb2RlVG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdjb21wb25lbnQnLCBuZXcgQ29tcG9uZW50VG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdhc3NldCcsIG5ldyBBc3NldFRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgncHJlZmFiJywgbmV3IFByZWZhYlRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgncHJvamVjdCcsIG5ldyBQcm9qZWN0VG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdkZWJ1ZycsIG5ldyBEZWJ1Z1Rvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnc2NlbmVfdmlldycsIG5ldyBTY2VuZVZpZXdUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2VkaXRvcicsIG5ldyBFZGl0b3JUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ3JlZmVyZW5jZV9pbWFnZScsIG5ldyBSZWZlcmVuY2VJbWFnZVRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnYW5pbWF0aW9uJywgbmV3IEFuaW1hdGlvblRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgndmFsaWRhdGlvbicsIG5ldyBWYWxpZGF0aW9uVG9vbHMoKSk7XG5cbiAgICAvLyA2LiBBdXRvLXN0YXJ0IGlmIGNvbmZpZ3VyZWRcbiAgICBpZiAoc2V0dGluZ3MuYXV0b1N0YXJ0KSB7XG4gICAgICAgIG1jcFNlcnZlci5zdGFydCgpLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYFtNQ1BdIEF1dG8tc3RhcnQgZmFpbGVkOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgW01DUF0gQ29jb3MgTUNQIEV4dGVuc2lvbiBsb2FkZWQgKEVkaXRvciB2JHtlZGl0b3JWZXJzaW9ufSlgKTtcbn1cblxuLyoqXG4gKiBFeHRlbnNpb24gdW5sb2FkIC0gY2FsbGVkIHdoZW4gZXh0ZW5zaW9uIGlzIGRpc2FibGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmxvYWQoKSB7XG4gICAgLy8gUmVtb3ZlIGVkaXRvciBicm9hZGNhc3QgbGlzdGVuZXJzXG4gICAgY29uc3QgbXNnID0gRWRpdG9yLk1lc3NhZ2UgYXMgYW55O1xuICAgIGlmIChtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIpIHtcbiAgICAgICAgbXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKCdsb2c6bG9nJywgZWRpdG9yTG9nSGFuZGxlcik7XG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignbG9nOndhcm4nLCBlZGl0b3JXYXJuSGFuZGxlcik7XG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignbG9nOmVycm9yJywgZWRpdG9yRXJyb3JIYW5kbGVyKTtcbiAgICAgICAgbXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKCdzY2VuZTpsb2cnLCBzY2VuZUxvZ0hhbmRsZXIpO1xuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ3NjZW5lOndhcm4nLCBzY2VuZVdhcm5IYW5kbGVyKTtcbiAgICAgICAgbXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKCdzY2VuZTplcnJvcicsIHNjZW5lRXJyb3JIYW5kbGVyKTtcbiAgICAgICAgbXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKCdjb25zb2xlOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ2NvbnNvbGU6d2FybicsIGVkaXRvcldhcm5IYW5kbGVyKTtcbiAgICAgICAgbXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKCdjb25zb2xlOmVycm9yJywgZWRpdG9yRXJyb3JIYW5kbGVyKTtcbiAgICB9XG5cbiAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgIG1jcFNlcnZlci5zdG9wKCk7XG4gICAgICAgIG1jcFNlcnZlciA9IG51bGw7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coJ1tNQ1BdIENvY29zIE1DUCBFeHRlbnNpb24gdW5sb2FkZWQnKTtcblxuICAgIC8vIFJlc3RvcmUgb3JpZ2luYWwgY29uc29sZVxuICAgIHVuaG9va0NvbnNvbGUoKTtcbn1cbiJdfQ==