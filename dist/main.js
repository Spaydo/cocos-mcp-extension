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
        };
    },
    getCategories() {
        var _a;
        return (_a = mcpServer === null || mcpServer === void 0 ? void 0 : mcpServer.getRegisteredCategories()) !== null && _a !== void 0 ? _a : [];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQW9EQSw0Q0FFQztBQXNERCxvQkF3Q0M7QUFLRCx3QkFrQkM7QUEzS0QsYUFBYTtBQUNiLG1FQUEwQztBQUMxQyw2Q0FBeUM7QUFDekMseUNBQXdEO0FBRXhELHFEQUFpRDtBQUNqRCxtREFBK0M7QUFDL0MsNkRBQXlEO0FBQ3pELHFEQUFpRDtBQUNqRCx1REFBbUQ7QUFDbkQseURBQXFEO0FBQ3JELHFEQUF5RDtBQUN6RCwrREFBMEQ7QUFDMUQsdURBQW1EO0FBQ25ELHlFQUFvRTtBQUNwRSw2REFBeUQ7QUFFekQsSUFBSSxTQUFTLEdBQXFCLElBQUksQ0FBQztBQUN2QyxJQUFJLGFBQWEsR0FBVyxFQUFFLENBQUM7QUFFL0IsMEJBQTBCO0FBQzFCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7QUFDN0IsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQztBQUMvQixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBRWpDLFNBQVMsV0FBVztJQUNoQixPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTtRQUM3QixRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM5QixJQUFBLG9CQUFNLEVBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQyxDQUFDO0lBQ0YsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBVyxFQUFFLEVBQUU7UUFDOUIsU0FBUyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDL0IsSUFBQSxvQkFBTSxFQUFDLE1BQU0sRUFBRSxJ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QUFDLHVCQUF1QixFQUFFLENBQUM7UUFDOUIsR0FBRyxDQUFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3pELEdBQUcsQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUMzRCxHQUFHLENBQUMsdUJBQXVCLENBQUMsV0FBVyxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDakUsQ0FBQztJQUVELElBQUksU0FBUyxFQUFFLENBQUM7UUFDWixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakIsU0FBUyxHQUFHLElBQUksQ0FBQztJQUNyQixDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0lBRWxELDJCQUEyQjtJQUMzQixhQUFhLEVBQUUsQ0FBQztBQUNwQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWlnbm9yZVxuaW1wb3J0IHBhY2thZ2VKU09OIGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5pbXBvcnQgeyBNQ1BTZXJ2ZXIgfSBmcm9tICcuL21jcC1zZXJ2ZXInO1xuaW1wb3J0IHsgcmVhZFNldHRpbmdzLCBzYXZlU2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IE1DUFNlcnZlclNldHRpbmdzIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBTY2VuZVRvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS10b29scyc7XG5pbXBvcnQgeyBOb2RlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL25vZGUtdG9vbHMnO1xuaW1wb3J0IHsgQ29tcG9uZW50VG9vbHMgfSBmcm9tICcuL3Rvb2xzL2NvbXBvbmVudC10b29scyc7XG5pbXBvcnQgeyBBc3NldFRvb2xzIH0gZnJvbSAnLi90b29scy9hc3NldC10b29scyc7XG5pbXBvcnQgeyBQcmVmYWJUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmFiLXRvb2xzJztcbmltcG9ydCB7IFByb2plY3RUb29scyB9IGZyb20gJy4vdG9vbHMvcHJvamVjdC10b29scyc7XG5pbXBvcnQgeyBEZWJ1Z1Rvb2xzLCBhZGRMb2cgfSBmcm9tICcuL3Rvb2xzL2RlYnVnLXRvb2xzJztcbmltcG9ydCB7IFNjZW5lVmlld1Rvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS12aWV3LXRvb2xzJztcbmltcG9ydCB7IEVkaXRvclRvb2xzIH0gZnJvbSAnLi90b29scy9lZGl0b3ItdG9vbHMnO1xuaW1wb3J0IHsgUmVmZXJlbmNlSW1hZ2VUb29scyB9IGZyb20gJy4vdG9vbHMvcmVmZXJlbmNlLWltYWdlLXRvb2xzJztcbmltcG9ydCB7IEFuaW1hdGlvblRvb2xzIH0gZnJvbSAnLi90b29scy9hbmltYXRpb24tdG9vbHMnO1xuXG5sZXQgbWNwU2VydmVyOiBNQ1BTZXJ2ZXIgfCBudWxsID0gbnVsbDtcbmxldCBlZGl0b3JWZXJzaW9uOiBzdHJpbmcgPSAnJztcblxuLy8gPT09IENvbnNvbGUgY2FwdHVyZSA9PT1cbmNvbnN0IF9vcmlnTG9nID0gY29uc29sZS5sb2c7XG5jb25zdCBfb3JpZ1dhcm4gPSBjb25zb2xlLndhcm47XG5jb25zdCBfb3JpZ0Vycm9yID0gY29uc29sZS5lcnJvcjtcblxuZnVuY3Rpb24gaG9va0NvbnNvbGUoKSB7XG4gICAgY29uc29sZS5sb2cgPSAoLi4uYXJnczogYW55W10pID0+IHtcbiAgICAgICAgX29yaWdMb2cuYXBwbHkoY29uc29sZSwgYXJncyk7XG4gICAgICAgIGFkZExvZygnbG9nJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG4gICAgY29uc29sZS53YXJuID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG4gICAgICAgIF9vcmlnV2Fybi5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgICAgICAgYWRkTG9nKCd3YXJuJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG4gICAgY29uc29sZS5lcnJvciA9ICguLi5hcmdzOiBhbnlbXSkgPT4ge1xuICAgICAgICBfb3JpZ0Vycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgICAgICBhZGRMb2coJ2Vycm9yJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHVuaG9va0NvbnNvbGUoKSB7XG4gICAgY29uc29sZS5sb2cgPSBfb3JpZ0xvZztcbiAgICBjb25zb2xlLndhcm4gPSBfb3JpZ1dhcm47XG4gICAgY29uc29sZS5lcnJvciA9IF9vcmlnRXJyb3I7XG59XG5cbi8vID09PSBFZGl0b3IgbWVzc2FnZSBsaXN0ZW5lciBmb3IgY2FwdHVyaW5nIGVkaXRvci1sZXZlbCBsb2dzID09PVxuY29uc3QgZWRpdG9yTG9nSGFuZGxlciA9IChtc2c6IGFueSkgPT4gYWRkTG9nKCdlZGl0b3ItbG9nJywgU3RyaW5nKG1zZykpO1xuY29uc3QgZWRpdG9yV2FybkhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnZWRpdG9yLXdhcm4nLCBTdHJpbmcobXNnKSk7XG5jb25zdCBlZGl0b3JFcnJvckhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnZWRpdG9yLWVycm9yJywgU3RyaW5nKG1zZykpO1xuXG4vKiogR2V0IHRoZSBkZXRlY3RlZCBDb2NvcyBDcmVhdG9yIGVkaXRvciB2ZXJzaW9uICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RWRpdG9yVmVyc2lvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiBlZGl0b3JWZXJzaW9uO1xufVxuXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnkpID0+IGFueSB9ID0ge1xuXG4gICAgb3BlblBhbmVsKCkge1xuICAgICAgICBFZGl0b3IuUGFuZWwub3BlbihwYWNrYWdlSlNPTi5uYW1lKTtcbiAgICB9LFxuXG4gICAgYXN5bmMgc3RhcnRTZXJ2ZXIoKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKCFtY3BTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01DUFNlcnZlciBub3QgaW5pdGlhbGl6ZWQnIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IG1jcFNlcnZlci5zdGFydCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHN0b3BTZXJ2ZXIoKTogeyBzdWNjZXNzOiBib29sZWFuIH0ge1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxuXG4gICAgZ2V0U2VydmVyU3RhdHVzKCkge1xuICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHJlYWRTZXR0aW5ncygpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcnVubmluZzogbWNwU2VydmVyPy5pc1J1bm5pbmcoKSA/PyBmYWxzZSxcbiAgICAgICAgICAgIHBvcnQ6IHNldHRpbmdzLnBvcnQsXG4gICAgICAgICAgICB0b29sczogbWNwU2VydmVyPy5nZXRUb29sQ291bnQoKSA/PyAwLFxuICAgICAgICAgICAgYXV0b1N0YXJ0OiBzZXR0aW5ncy5hdXRvU3RhcnQsXG4gICAgICAgICAgICBlbmFibGVkQ2F0ZWdvcmllczogc2V0dGluZ3MuZW5hYmxlZENhdGVnb3JpZXMsXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIGdldENhdGVnb3JpZXMoKSB7XG4gICAgICAgIHJldHVybiBtY3BTZXJ2ZXI/LmdldFJlZ2lzdGVyZWRDYXRlZ29yaWVzKCkgPz8gW107XG4gICAgfSxcblxuICAgIHVwZGF0ZVNldHRpbmdzKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncyk6IHsgc3VjY2VzczogYm9vbGVhbiB9IHtcbiAgICAgICAgc2F2ZVNldHRpbmdzKHNldHRpbmdzKTtcbiAgICAgICAgaWYgKG1jcFNlcnZlcikge1xuICAgICAgICAgICAgbWNwU2VydmVyLnVwZGF0ZVNldHRpbmdzKHNldHRpbmdzKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gICAgfSxcbn07XG5cbi8qKlxuICogRXh0ZW5zaW9uIGxvYWQgLSBjYWxsZWQgd2hlbiBleHRlbnNpb24gaXMgZW5hYmxlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9hZCgpIHtcbiAgICAvLyAxLiBIb29rIGNvbnNvbGUgdG8gY2FwdHVyZSBsb2dzXG4gICAgaG9va0NvbnNvbGUoKTtcblxuICAgIC8vIDIuIExpc3RlbiBmb3IgZWRpdG9yLWxldmVsIGJyb2FkY2FzdCBtZXNzYWdlc1xuICAgIGNvbnN0IG1zZyA9IEVkaXRvci5NZXNzYWdlIGFzIGFueTtcbiAgICBpZiAobXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKSB7XG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignbG9nOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzp3YXJuJywgZWRpdG9yV2FybkhhbmRsZXIpO1xuICAgICAgICBtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzplcnJvcicsIGVkaXRvckVycm9ySGFuZGxlcik7XG4gICAgfVxuXG4gICAgLy8gMy4gRGV0ZWN0IGVkaXRvciB2ZXJzaW9uXG4gICAgZWRpdG9yVmVyc2lvbiA9IEVkaXRvci5BcHAudmVyc2lvbiB8fCAndW5rbm93bic7XG5cbiAgICAvLyA0LiBSZWFkIHNldHRpbmdzXG4gICAgY29uc3Qgc2V0dGluZ3MgPSByZWFkU2V0dGluZ3MoKTtcblxuICAgIC8vIDUuIENyZWF0ZSBNQ1Agc2VydmVyIGluc3RhbmNlIGFuZCByZWdpc3RlciB0b29sc1xuICAgIG1jcFNlcnZlciA9IG5ldyBNQ1BTZXJ2ZXIoc2V0dGluZ3MpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnc2NlbmUnLCBuZXcgU2NlbmVUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ25vZGUnLCBuZXcgTm9kZVRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnY29tcG9uZW50JywgbmV3IENvbXBvbmVudFRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnYXNzZXQnLCBuZXcgQXNzZXRUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ3ByZWZhYicsIG5ldyBQcmVmYWJUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ3Byb2plY3QnLCBuZXcgUHJvamVjdFRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnZGVidWcnLCBuZXcgRGVidWdUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ3NjZW5lX3ZpZXcnLCBuZXcgU2NlbmVWaWV3VG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdlZGl0b3InLCBuZXcgRWRpdG9yVG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdyZWZlcmVuY2VfaW1hZ2UnLCBuZXcgUmVmZXJlbmNlSW1hZ2VUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2FuaW1hdGlvbicsIG5ldyBBbmltYXRpb25Ub29scygpKTtcblxuICAgIC8vIDYuIEF1dG8tc3RhcnQgaWYgY29uZmlndXJlZFxuICAgIGlmIChzZXR0aW5ncy5hdXRvU3RhcnQpIHtcbiAgICAgICAgbWNwU2VydmVyLnN0YXJ0KCkuY2F0Y2goKGVycjogRXJyb3IpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgW01DUF0gQXV0by1zdGFydCBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKGBbTUNQXSBDb2NvcyBNQ1AgRXh0ZW5zaW9uIGxvYWRlZCAoRWRpdG9yIHYke2VkaXRvclZlcnNpb259KWApO1xufVxuXG4vKipcbiAqIEV4dGVuc2lvbiB1bmxvYWQgLSBjYWxsZWQgd2hlbiBleHRlbnNpb24gaXMgZGlzYWJsZWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVubG9hZCgpIHtcbiAgICAvLyBSZW1vdmUgZWRpdG9yIGJyb2FkY2FzdCBsaXN0ZW5lcnNcbiAgICBjb25zdCBtc2cgPSBFZGl0b3IuTWVzc2FnZSBhcyBhbnk7XG4gICAgaWYgKG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcikge1xuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzpsb2cnLCBlZGl0b3JMb2dIYW5kbGVyKTtcbiAgICAgICAgbXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKCdsb2c6d2FybicsIGVkaXRvcldhcm5IYW5kbGVyKTtcbiAgICAgICAgbXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKCdsb2c6ZXJyb3InLCBlZGl0b3JFcnJvckhhbmRsZXIpO1xuICAgIH1cblxuICAgIGlmIChtY3BTZXJ2ZXIpIHtcbiAgICAgICAgbWNwU2VydmVyLnN0b3AoKTtcbiAgICAgICAgbWNwU2VydmVyID0gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZygnW01DUF0gQ29jb3MgTUNQIEV4dGVuc2lvbiB1bmxvYWRlZCcpO1xuXG4gICAgLy8gUmVzdG9yZSBvcmlnaW5hbCBjb25zb2xlXG4gICAgdW5ob29rQ29uc29sZSgpO1xufVxuIl19