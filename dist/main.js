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
    // 1. Detect editor version
    editorVersion = Editor.App.version || 'unknown';
    // 2. Read settings
    const settings = (0, settings_1.readSettings)();
    // 3. Create MCP server instance and register tools
    mcpServer = new mcp_server_1.MCPServer(settings);
    mcpServer.registerToolCategory('scene', new scene_tools_1.SceneTools());
    mcpServer.registerToolCategory('node', new node_tools_1.NodeTools());
    mcpServer.registerToolCategory('component', new component_tools_1.ComponentTools());
    mcpServer.registerToolCategory('asset', new asset_tools_1.AssetTools());
    mcpServer.registerToolCategory('prefab', new prefab_tools_1.PrefabTools());
    mcpServer.registerToolCategory('project', new project_tools_1.ProjectTools());
    mcpServer.registerToolCategory('debug', new debug_tools_1.DebugTools());
    // 4. Auto-start if configured
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
    if (mcpServer) {
        mcpServer.stop();
        mcpServer = null;
    }
    console.log('[MCP] Cocos MCP Extension unloaded');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQWlCQSw0Q0FFQztBQWlERCxvQkF5QkM7QUFLRCx3QkFNQztBQXhHRCxhQUFhO0FBQ2IsbUVBQTBDO0FBQzFDLDZDQUF5QztBQUN6Qyx5Q0FBd0Q7QUFFeEQscURBQWlEO0FBQ2pELG1EQUErQztBQUMvQyw2REFBeUQ7QUFDekQscURBQWlEO0FBQ2pELHVEQUFtRDtBQUNuRCx5REFBcUQ7QUFDckQscURBQWlEO0FBRWpELElBQUksU0FBUyxHQUFxQixJQUFJLENBQUM7QUFDdkMsSUFBSSxhQUFhLEdBQVcsRUFBRSxDQUFDO0FBRS9CLG9EQUFvRDtBQUNwRCxTQUFnQixnQkFBZ0I7SUFDNUIsT0FBTyxhQUFhLENBQUM7QUFDekIsQ0FBQztBQUVZLFFBQUEsT0FBTyxHQUE0QztJQUU1RCxTQUFTO1FBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsc0JBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVc7UUFDYixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDYixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQztRQUNsRSxDQUFDO1FBQ0QsSUFBSSxDQUFDO1lBQ0QsTUFBTSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDeEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUM3QixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRUQsVUFBVTtRQUNOLElBQUksU0FBUyxFQUFFLENBQUM7WUFDWixTQUFTLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDckIsQ0FBQztRQUNELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELGVBQWU7O1FBQ1gsTUFBTSxRQUFRLEdBQUcsSUFBQSx1QkFBWSxHQUFFLENBQUM7UUFDaEMsT0FBTztZQUNILE9BQU8sRUFBRSxNQUFBLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxTQUFTLEVBQUUsbUNBQUksS0FBSztZQUN4QyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUk7WUFDbkIsS0FBSyxFQUFFLE1BQUEsU0FBUyxhQUFULFNBQVMsdUJBQVQsU0FBUyxDQUFFLFlBQVksRUFBRSxtQ0FBSSxDQUFDO1lBQ3JDLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUztTQUNoQyxDQUFDO0lBQ04sQ0FBQztJQUVELGNBQWMsQ0FBQyxRQUEyQjtRQUN0QyxJQUFBLHVCQUFZLEVBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkIsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNaLFNBQVMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUNELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDN0IsQ0FBQztDQUNKLENBQUM7QUFFRjs7R0FFRztBQUNILFNBQWdCLElBQUk7SUFDaEIsMkJBQTJCO0lBQzNCLGFBQWEsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sSUFBSSxTQUFTLENBQUM7SUFFaEQsbUJBQW1CO0lBQ25CLE1BQU0sUUFBUSxHQUFHLElBQUEsdUJBQVksR0FBRSxDQUFDO0lBRWhDLG1EQUFtRDtJQUNuRCxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3BDLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSx3QkFBVSxFQUFFLENBQUMsQ0FBQztJQUMxRCxTQUFTLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLElBQUksc0JBQVMsRUFBRSxDQUFDLENBQUM7SUFDeEQsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsRUFBRSxJQUFJLGdDQUFjLEVBQUUsQ0FBQyxDQUFDO0lBQ2xFLFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSx3QkFBVSxFQUFFLENBQUMsQ0FBQztJQUMxRCxTQUFTLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLElBQUksMEJBQVcsRUFBRSxDQUFDLENBQUM7SUFDNUQsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFNBQVMsRUFBRSxJQUFJLDRCQUFZLEVBQUUsQ0FBQyxDQUFDO0lBQzlELFNBQVMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSx3QkFBVSxFQUFFLENBQUMsQ0FBQztJQUUxRCw4QkFBOEI7SUFDOUIsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQVUsRUFBRSxFQUFFO1lBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQUMsNEJBQTRCLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQzVELENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztJQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLGFBQWEsR0FBRyxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsTUFBTTtJQUNsQixJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ1osU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2pCLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDckIsQ0FBQztJQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQztBQUN0RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQHRzLWlnbm9yZVxuaW1wb3J0IHBhY2thZ2VKU09OIGZyb20gJy4uL3BhY2thZ2UuanNvbic7XG5pbXBvcnQgeyBNQ1BTZXJ2ZXIgfSBmcm9tICcuL21jcC1zZXJ2ZXInO1xuaW1wb3J0IHsgcmVhZFNldHRpbmdzLCBzYXZlU2V0dGluZ3MgfSBmcm9tICcuL3NldHRpbmdzJztcbmltcG9ydCB7IE1DUFNlcnZlclNldHRpbmdzIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBTY2VuZVRvb2xzIH0gZnJvbSAnLi90b29scy9zY2VuZS10b29scyc7XG5pbXBvcnQgeyBOb2RlVG9vbHMgfSBmcm9tICcuL3Rvb2xzL25vZGUtdG9vbHMnO1xuaW1wb3J0IHsgQ29tcG9uZW50VG9vbHMgfSBmcm9tICcuL3Rvb2xzL2NvbXBvbmVudC10b29scyc7XG5pbXBvcnQgeyBBc3NldFRvb2xzIH0gZnJvbSAnLi90b29scy9hc3NldC10b29scyc7XG5pbXBvcnQgeyBQcmVmYWJUb29scyB9IGZyb20gJy4vdG9vbHMvcHJlZmFiLXRvb2xzJztcbmltcG9ydCB7IFByb2plY3RUb29scyB9IGZyb20gJy4vdG9vbHMvcHJvamVjdC10b29scyc7XG5pbXBvcnQgeyBEZWJ1Z1Rvb2xzIH0gZnJvbSAnLi90b29scy9kZWJ1Zy10b29scyc7XG5cbmxldCBtY3BTZXJ2ZXI6IE1DUFNlcnZlciB8IG51bGwgPSBudWxsO1xubGV0IGVkaXRvclZlcnNpb246IHN0cmluZyA9ICcnO1xuXG4vKiogR2V0IHRoZSBkZXRlY3RlZCBDb2NvcyBDcmVhdG9yIGVkaXRvciB2ZXJzaW9uICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0RWRpdG9yVmVyc2lvbigpOiBzdHJpbmcge1xuICAgIHJldHVybiBlZGl0b3JWZXJzaW9uO1xufVxuXG5leHBvcnQgY29uc3QgbWV0aG9kczogeyBba2V5OiBzdHJpbmddOiAoLi4uYW55OiBhbnkpID0+IGFueSB9ID0ge1xuXG4gICAgb3BlblBhbmVsKCkge1xuICAgICAgICBFZGl0b3IuUGFuZWwub3BlbihwYWNrYWdlSlNPTi5uYW1lKTtcbiAgICB9LFxuXG4gICAgYXN5bmMgc3RhcnRTZXJ2ZXIoKTogUHJvbWlzZTx7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+IHtcbiAgICAgICAgaWYgKCFtY3BTZXJ2ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ01DUFNlcnZlciBub3QgaW5pdGlhbGl6ZWQnIH07XG4gICAgICAgIH1cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF3YWl0IG1jcFNlcnZlci5zdGFydCgpO1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIHN0b3BTZXJ2ZXIoKTogeyBzdWNjZXNzOiBib29sZWFuIH0ge1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxuXG4gICAgZ2V0U2VydmVyU3RhdHVzKCk6IHsgcnVubmluZzogYm9vbGVhbjsgcG9ydDogbnVtYmVyOyB0b29sczogbnVtYmVyOyBhdXRvU3RhcnQ6IGJvb2xlYW4gfSB7XG4gICAgICAgIGNvbnN0IHNldHRpbmdzID0gcmVhZFNldHRpbmdzKCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBydW5uaW5nOiBtY3BTZXJ2ZXI/LmlzUnVubmluZygpID8/IGZhbHNlLFxuICAgICAgICAgICAgcG9ydDogc2V0dGluZ3MucG9ydCxcbiAgICAgICAgICAgIHRvb2xzOiBtY3BTZXJ2ZXI/LmdldFRvb2xDb3VudCgpID8/IDAsXG4gICAgICAgICAgICBhdXRvU3RhcnQ6IHNldHRpbmdzLmF1dG9TdGFydCxcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgdXBkYXRlU2V0dGluZ3Moc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKTogeyBzdWNjZXNzOiBib29sZWFuIH0ge1xuICAgICAgICBzYXZlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICBpZiAobWNwU2VydmVyKSB7XG4gICAgICAgICAgICBtY3BTZXJ2ZXIudXBkYXRlU2V0dGluZ3Moc2V0dGluZ3MpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBFeHRlbnNpb24gbG9hZCAtIGNhbGxlZCB3aGVuIGV4dGVuc2lvbiBpcyBlbmFibGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCkge1xuICAgIC8vIDEuIERldGVjdCBlZGl0b3IgdmVyc2lvblxuICAgIGVkaXRvclZlcnNpb24gPSBFZGl0b3IuQXBwLnZlcnNpb24gfHwgJ3Vua25vd24nO1xuXG4gICAgLy8gMi4gUmVhZCBzZXR0aW5nc1xuICAgIGNvbnN0IHNldHRpbmdzID0gcmVhZFNldHRpbmdzKCk7XG5cbiAgICAvLyAzLiBDcmVhdGUgTUNQIHNlcnZlciBpbnN0YW5jZSBhbmQgcmVnaXN0ZXIgdG9vbHNcbiAgICBtY3BTZXJ2ZXIgPSBuZXcgTUNQU2VydmVyKHNldHRpbmdzKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ3NjZW5lJywgbmV3IFNjZW5lVG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdub2RlJywgbmV3IE5vZGVUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2NvbXBvbmVudCcsIG5ldyBDb21wb25lbnRUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2Fzc2V0JywgbmV3IEFzc2V0VG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdwcmVmYWInLCBuZXcgUHJlZmFiVG9vbHMoKSk7XG4gICAgbWNwU2VydmVyLnJlZ2lzdGVyVG9vbENhdGVnb3J5KCdwcm9qZWN0JywgbmV3IFByb2plY3RUb29scygpKTtcbiAgICBtY3BTZXJ2ZXIucmVnaXN0ZXJUb29sQ2F0ZWdvcnkoJ2RlYnVnJywgbmV3IERlYnVnVG9vbHMoKSk7XG5cbiAgICAvLyA0LiBBdXRvLXN0YXJ0IGlmIGNvbmZpZ3VyZWRcbiAgICBpZiAoc2V0dGluZ3MuYXV0b1N0YXJ0KSB7XG4gICAgICAgIG1jcFNlcnZlci5zdGFydCgpLmNhdGNoKChlcnI6IEVycm9yKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYFtNQ1BdIEF1dG8tc3RhcnQgZmFpbGVkOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zb2xlLmxvZyhgW01DUF0gQ29jb3MgTUNQIEV4dGVuc2lvbiBsb2FkZWQgKEVkaXRvciB2JHtlZGl0b3JWZXJzaW9ufSlgKTtcbn1cblxuLyoqXG4gKiBFeHRlbnNpb24gdW5sb2FkIC0gY2FsbGVkIHdoZW4gZXh0ZW5zaW9uIGlzIGRpc2FibGVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1bmxvYWQoKSB7XG4gICAgaWYgKG1jcFNlcnZlcikge1xuICAgICAgICBtY3BTZXJ2ZXIuc3RvcCgpO1xuICAgICAgICBtY3BTZXJ2ZXIgPSBudWxsO1xuICAgIH1cbiAgICBjb25zb2xlLmxvZygnW01DUF0gQ29jb3MgTUNQIEV4dGVuc2lvbiB1bmxvYWRlZCcpO1xufVxuIl19