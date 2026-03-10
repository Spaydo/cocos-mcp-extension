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
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQWdEQSw0Q0FFQztBQWlERCxvQkFvQ0M7QUFLRCx3QkFrQkM7QUE5SkQsYUFBYTtBQUNiLG1FQUEwQztBQUMxQyw2Q0FBeUM7QUFDekMseUNBQXdEO0FBRXhELHFEQUFpRDtBQUNqRCxtREFBK0M7QUFDL0MsNkRBQXlEO0FBQ3pELHFEQUFpRDtBQUNqRCx1REFBbUQ7QUFDbkQseURBQXFEO0FBQ3JELHFEQUF5RDtBQUV6RCxJQUFJLFNBQVMsR0FBcUIsSUFBSSxDQUFDO0FBQ3ZDLElBQUksYUFBYSxHQUFXLEVBQUUsQ0FBQztBQUUvQiwwQkFBMEI7QUFDMUIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztBQUM3QixNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDO0FBQy9CLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7QUFFakMsU0FBUyxXQUFXO0lBQ2hCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQVcsRUFBRSxFQUFFO1FBQzdCLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlCLElBQUEsb0JBQU0sRUFBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUM5QyxDQUFDLENBQUM7SUFDRixPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFXLEVBQUUsRUFBRTtRQUM5QixTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUMvQixJQUFBLG9CQUFNLEVBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FB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a2FnZS5qc29uJztcbmltcG9ydCB7IE1DUFNlcnZlciB9IGZyb20gJy4vbWNwLXNlcnZlcic7XG5pbXBvcnQgeyByZWFkU2V0dGluZ3MsIHNhdmVTZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnO1xuaW1wb3J0IHsgTUNQU2VydmVyU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IFNjZW5lVG9vbHMgfSBmcm9tICcuL3Rvb2xzL3NjZW5lLXRvb2xzJztcbmltcG9ydCB7IE5vZGVUb29scyB9IGZyb20gJy4vdG9vbHMvbm9kZS10b29scyc7XG5pbXBvcnQgeyBDb21wb25lbnRUb29scyB9IGZyb20gJy4vdG9vbHMvY29tcG9uZW50LXRvb2xzJztcbmltcG9ydCB7IEFzc2V0VG9vbHMgfSBmcm9tICcuL3Rvb2xzL2Fzc2V0LXRvb2xzJztcbmltcG9ydCB7IFByZWZhYlRvb2xzIH0gZnJvbSAnLi90b29scy9wcmVmYWItdG9vbHMnO1xuaW1wb3J0IHsgUHJvamVjdFRvb2xzIH0gZnJvbSAnLi90b29scy9wcm9qZWN0LXRvb2xzJztcbmltcG9ydCB7IERlYnVnVG9vbHMsIGFkZExvZyB9IGZyb20gJy4vdG9vbHMvZGVidWctdG9vbHMnO1xuXG5sZXQgbWNwU2VydmVyOiBNQ1BTZXJ2ZXIgfCBudWxsID0gbnVsbDtcbmxldCBlZGl0b3JWZXJzaW9uOiBzdHJpbmcgPSAnJztcblxuLy8gPT09IENvbnNvbGUgY2FwdHVyZSA9PT1cbmNvbnN0IF9vcmlnTG9nID0gY29uc29sZS5sb2c7XG5jb25zdCBfb3JpZ1dhcm4gPSBjb25zb2xlLndhcm47XG5jb25zdCBfb3JpZ0Vycm9yID0gY29uc29sZS5lcnJvcjtcblxuZnVuY3Rpb24gaG9va0NvbnNvbGUoKSB7XG4gICAgY29uc29sZS5sb2cgPSAoLi4uYXJnczogYW55W10pID0+IHtcbiAgICAgICAgX29yaWdMb2cuYXBwbHkoY29uc29sZSwgYXJncyk7XG4gICAgICAgIGFkZExvZygnbG9nJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG4gICAgY29uc29sZS53YXJuID0gKC4uLmFyZ3M6IGFueVtdKSA9PiB7XG4gICAgICAgIF9vcmlnV2Fybi5hcHBseShjb25zb2xlLCBhcmdzKTtcbiAgICAgICAgYWRkTG9nKCd3YXJuJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG4gICAgY29uc29sZS5lcnJvciA9ICguLi5hcmdzOiBhbnlbXSkgPT4ge1xuICAgICAgICBfb3JpZ0Vycm9yLmFwcGx5KGNvbnNvbGUsIGFyZ3MpO1xuICAgICAgICBhZGRMb2coJ2Vycm9yJywgYXJncy5tYXAoU3RyaW5nKS5qb2luKCcgJykpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHVuaG9va0NvbnNvbGUoKSB7XG4gICAgY29uc29sZS5sb2cgPSBfb3JpZ0xvZztcbiAgICBjb25zb2xlLndhcm4gPSBfb3JpZ1dhcm47XG4gICAgY29uc29sZS5lcnJvciA9IF9vcmlnRXJyb3I7XG59XG5cbi8vID09PSBFZGl0b3IgbWVzc2FnZSBsaXN0ZW5lciBmb3IgY2FwdHVyaW5nIGVkaXRvci1sZXZlbCBsb2dzID09PVxuY29uc3QgZWRpdG9yTG9nSGFuZGxlciA9IChtc2c6IGFueSkgPT4gYWRkTG9nKCdlZGl0b3ItbG9nJywgU3RyaW5nKG1zZykpO1xuY29uc3QgZWRpdG9yV2FybkhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnZWRpdG9yLXdhcm4nLCBTdHJpbmcobXNnKSk7XG5jb25zdCBlZGl0b3JFcnJvckhhbmRsZXIgPSAobXNnOiBhbnkpID0+IGFkZExvZygnZWRpdG9yLWVycm9yJywgU3RyaW5nKG1zZykpO1xuXG4vKiogR2V0IHRoZSBkZXRlY3RlZCBDb2NvcyBDcmVhdG9yIGVkaXRvciB2ZXJzaW9uICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RWRpdG9yVmVyc2lvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiBlZGl0b3JWZXJzaW9uO1xufVxuXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnkpID0+IGFueSB9ID0ge1xuXG4gICAgb3BlblBhbmVsKCkge1xuICAgICAgICBFZGl0b3IuUGFuZWwub3BlbihwYWNrYWdlSlNPTi5uYW1lKTtcbiAgICB9LFxuXG4gICAgYXN5bmMgc3RhcnRTZXJ2ZXIoKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKCFtY3BTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01DUFNlcnZlciBub3QgaW5pdGlhbGl6ZWQnIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IG1jcFNlcnZlci5zdGFydCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHN0b3BTZXJ2ZXIoKTogeyBzdWNjZXNzOiBib29sZWFuIH0ge1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxuXG4gICAgZ2V0U2VydmVyU3RhdHVzKCk6IHsgcnVubmluZzogYm9vbGVhbjsgcG9ydDogbnVtYmVyOyB0b29sczogbnVtYmVyOyBhdXRvU3RhcnQ6IGJvb2xlYW4gfSB7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gcmVhZFNldHRpbmdzKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBydW5uaW5nOiBtY3BTZXJ2ZXI/LmlzUnVubmluZygpID8/IGZhbHNlLFxuICAgICAgICAgICAgcG9ydDogc2V0dGluZ3MucG9ydCxcbiAgICAgICAgICAgIHRvb2xzOiBtY3BTZXJ2ZXI/LmdldFRvb2xDb3VudCgpID8/IDAsXG4gICAgICAgICAgICBhdXRvU3RhcnQ6IHNldHRpbmdzLmF1dG9TdGFydCxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgdXBkYXRlU2V0dGluZ3Moc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKTogeyBzdWNjZXNzOiBib29sZWFuIH0ge1xuICAgICAgICBzYXZlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICBtY3BTZXJ2ZXIudXBkYXRlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBFeHRlbnNpb24gbG9hZCAtIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBpcyBlbmFibGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkge1xuICAgIC8vIDEuIEhvb2sgY29uc29sZSB0byBjYXB0dXJlIGxvZ3NcbiAgICBob29rQ29uc29sZSgpO1xuXG4gICAgLy8gMi4gTGlzdGVuIGZvciBlZGl0b3ItbGV2ZWwgYnJvYWRjYXN0IG1lc3NhZ2VzXG4gICAgY29uc3QgbXNnID0gRWRpdG9yLk1lc3NhZ2UgYXMgYW55O1xuICAgIGlmIChtc2cuYWRkQnJvYWRjYXN0TGlzdGVuZXIpIHtcbiAgICAgICAgbXNnLmFkZEJyb2FkY2FzdExpc3RlbmVyKCdsb2c6bG9nJywgZWRpdG9yTG9nSGFuZGxlcik7XG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignbG9nOndhcm4nLCBlZGl0b3JXYXJuSGFuZGxlcik7XG4gICAgICAgIG1zZy5hZGRCcm9hZGNhc3RMaXN0ZW5lcignbG9nOmVycm9yJywgZWRpdG9yRXJyb3JIYW5kbGVyKTtcbiAgICB9XG5cbiAgICAvLyAzLiBEZXRlY3QgZWRpdG9yIHZlcnNpb25cbiAgICBlZGl0b3JWZXJzaW9uID0gRWRpdG9yLkFwcC52ZXJzaW9uIHx8ICd1bmtub3duJztcblxuICAgIC8vIDQuIFJlYWQgc2V0dGluZ3NcbiAgICBjb25zdCBzZXR0aW5ncyA9IHJlYWRTZXR0aW5ncygpO1xuXG4gICAgLy8gNS4gQ3JlYXRlIE1DUCBzZXJ2ZXIgaW5zdGFuY2UgYW5kIHJlZ2lzdGVyIHRvb2xzXG4gICAgbWNwU2VydmVyID0gbmV3IE1DUFNlcnZlcihzZXR0aW5ncyk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdzY2VuZScsIG5ldyBTY2VuZVRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgnbm9kZScsIG5ldyBOb2RlVG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdjb21wb25lbnQnLCBuZXcgQ29tcG9uZW50VG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdhc3NldCcsIG5ldyBBc3NldFRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgncHJlZmFiJywgbmV3IFByZWZhYlRvb2xzKCkpO1xuICAgIG1jcFNlcnZlci5yZWdpc3RlclRvb2xDYXRlZ29yeSgncHJvamVjdCcsIG5ldyBQcm9qZWN0VG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdkZWJ1ZycsIG5ldyBEZWJ1Z1Rvb2xzKCkpO1xuXG4gICAgLy8gNi4gQXV0by1zdGFydCBpZiBjb25maWd1cmVkXG4gICAgaWYgKHNldHRpbmdzLmF1dG9TdGFydCkge1xuICAgICAgICBtY3BTZXJ2ZXIuc3RhcnQoKS5jYXRjaCgoZXJyOiBFcnJvcikgPT4ge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBbTUNQXSBBdXRvLXN0YXJ0IGZhaWxlZDogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc29sZS5sb2coYFtNQ1BdIENvY29zIE1DUCBFeHRlbnNpb24gbG9hZGVkIChFZGl0b3IgdiR7ZWRpdG9yVmVyc2lvbn0pYCk7XG59XG5cbi8qKlxuICogRXh0ZW5zaW9uIHVubG9hZCAtIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBpcyBkaXNhYmxlZFxuICovXG5leHBvcnQgZnVuY3Rpb24gdW5sb2FkKCkge1xuICAgIC8vIFJlbW92ZSBlZGl0b3IgYnJvYWRjYXN0IGxpc3RlbmVyc1xuICAgIGNvbnN0IG1zZyA9IEVkaXRvci5NZXNzYWdlIGFzIGFueTtcbiAgICBpZiAobXNnLnJlbW92ZUJyb2FkY2FzdExpc3RlbmVyKSB7XG4gICAgICAgIG1zZy5yZW1vdmVCcm9hZGNhc3RMaXN0ZW5lcignbG9nOmxvZycsIGVkaXRvckxvZ0hhbmRsZXIpO1xuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzp3YXJuJywgZWRpdG9yV2FybkhhbmRsZXIpO1xuICAgICAgICBtc2cucmVtb3ZlQnJvYWRjYXN0TGlzdGVuZXIoJ2xvZzplcnJvcicsIGVkaXRvckVycm9ySGFuZGxlcik7XG4gICAgfVxuXG4gICAgaWYgKG1jcFNlcnZlcikge1xuICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xuICAgICAgICBtY3BTZXJ2ZXIgPSBudWxsO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKCdbTUNQXSBDb2NvcyBNQ1AgRXh0ZW5zaW9uIHVubG9hZGVkJyk7XG5cbiAgICAvLyBSZXN0b3JlIG9yaWdpbmFsIGNvbnNvbGVcbiAgICB1bmhvb2tDb25zb2xlKCk7XG59XG4iXX0=