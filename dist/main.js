"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
/**
 * 擴展主進程入口：生命週期 + 面板訊息。
 */
const path_1 = require("path");
const discovery_1 = require("./bridge/discovery");
const server_1 = require("./bridge/server");
const settings_1 = require("./settings");
const registry_1 = require("./tools/registry");
const version_1 = require("./version");
let env = null;
let settings = null;
let registry = null;
let bridge = null;
function buildRegistry() {
    const reg = new registry_1.ToolRegistry();
    // 動態 require（非頂層 import）：讓 dev.reload_tools 清掉 require cache 後能載入新代碼，
    // 工具清單由 tools/index.ts 維護（新增工具也可熱載入）
    /* eslint-disable @typescript-eslint/no-var-requires */
    for (const def of require('./tools').createAllTools()) {
        reg.register(def);
    }
    /* eslint-enable @typescript-eslint/no-var-requires */
    reg.register({
        name: 'dev',
        description: 'Development helpers for the cocos-mcp extension itself.',
        actions: {
            reload_tools: {
                description: 'Hot-reload tool modules from dist/ (run after rebuilding the extension) without restarting the editor. ' +
                    'Does NOT reload bridge/main process code.',
                handler: async () => devReloadTools(),
            },
        },
    });
    return reg;
}
/** 清掉工具層模組的 require cache 並重建註冊表（bridge/main 本身不受影響） */
function devReloadTools() {
    const prefixes = [(0, path_1.join)(__dirname, 'tools'), (0, path_1.join)(__dirname, 'adapters.js')];
    for (const key of Object.keys(require.cache)) {
        if (prefixes.some((p) => key.startsWith(p))) {
            delete require.cache[key];
        }
    }
    registry = buildRegistry();
    (0, discovery_1.writeToolsCache)(Editor.Project.path, registry.catalog());
    console.log('[cocos-mcp] tools hot-reloaded:', registry.toolNames().join(', '));
    return { tools: registry.toolNames() };
}
function context() {
    if (!env || !settings) {
        throw new Error('cocos-mcp extension not initialized');
    }
    return { env, settings };
}
/** sidecar 入口的絕對路徑（__dirname = <擴展>/dist） */
function sidecarEntry() {
    return (0, path_1.join)(__dirname, '..', 'dist-sidecar', 'index.js');
}
function extensionVersion() {
    try {
        return String(require('../package.json').version);
    }
    catch (_a) {
        return 'unknown';
    }
}
function getStatus() {
    return {
        running: Boolean(bridge && bridge.running),
        port: bridge && bridge.running ? bridge.currentPort : null,
        projectPath: Editor.Project.path,
        editorVersion: env ? env.version.raw : Editor.App.version,
        toolCount: registry ? registry.toolNames().length : 0,
        sidecarEntry: sidecarEntry(),
    };
}
async function startBridge() {
    if (!env || !settings || !registry) {
        throw new Error('cocos-mcp extension not initialized');
    }
    if (bridge && bridge.running) {
        return getStatus();
    }
    // 動態取用模組層 registry（dev.reload_tools 會替換它）
    bridge = new server_1.BridgeServer({
        preferredPort: settings.port,
        projectPath: Editor.Project.path,
        editorVersion: env.version.raw,
        catalog: () => registry.catalog(),
        invoke: (req) => registry.invoke(req, context()),
    });
    const { port, token } = await bridge.start();
    (0, discovery_1.writeBridgeInfo)(Editor.Project.path, {
        port,
        token,
        pid: process.pid,
        editorVersion: env.version.raw,
        projectPath: Editor.Project.path,
        startedAt: new Date().toISOString(),
    });
    (0, discovery_1.writeToolsCache)(Editor.Project.path, registry.catalog());
    (0, discovery_1.writeSidecarInfo)(Editor.Project.path, sidecarEntry(), extensionVersion());
    console.log(`[cocos-mcp] bridge started: 127.0.0.1:${port} (editor ${env.version.raw})`);
    return getStatus();
}
async function stopBridge() {
    if (bridge) {
        await bridge.stop();
        (0, discovery_1.clearBridgeInfo)(Editor.Project.path);
        console.log('[cocos-mcp] bridge stopped');
    }
    return getStatus();
}
/** package.json contributions.messages 對應的方法 */
exports.methods = {
    openPanel() {
        Editor.Panel.open('cocos-mcp-extension');
    },
    async startServer() {
        return startBridge();
    },
    async stopServer() {
        return stopBridge();
    },
    getServerStatus() {
        return getStatus();
    },
};
async function load() {
    env = (0, version_1.detectEditorEnv)();
    settings = (0, settings_1.readSettings)(Editor.Project.path);
    registry = buildRegistry();
    console.log(`[cocos-mcp] loaded (editor ${env.version.raw}, ` +
        `caps: ${JSON.stringify(env.capabilities)})`);
    if (settings.autoStart) {
        try {
            await startBridge();
        }
        catch (err) {
            console.error('[cocos-mcp] bridge auto-start failed:', err);
            // 啟動失敗時清掉殘留的 discovery，避免 sidecar 連到舊埠（可能已被其他編輯器接手）
            (0, discovery_1.clearBridgeInfo)(Editor.Project.path);
        }
    }
}
async function unload() {
    await stopBridge();
    env = null;
    settings = null;
    registry = null;
    bridge = null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQXFKQSxvQkFpQkM7QUFFRCx3QkFNQztBQTlLRDs7R0FFRztBQUNILCtCQUE0QjtBQUM1QixrREFBeUc7QUFDekcsNENBQStDO0FBQy9DLHlDQUEwQztBQUMxQywrQ0FBZ0Q7QUFFaEQsdUNBQTRDO0FBRTVDLElBQUksR0FBRyxHQUFxQixJQUFJLENBQUM7QUFDakMsSUFBSSxRQUFRLEdBQTBCLElBQUksQ0FBQztBQUMzQyxJQUFJLFFBQVEsR0FBd0IsSUFBSSxDQUFDO0FBQ3pDLElBQUksTUFBTSxHQUF3QixJQUFJLENBQUM7QUFFdkMsU0FBUyxhQUFhO0lBQ2xCLE1BQU0sR0FBRyxHQUFHLElBQUksdUJBQVksRUFBRSxDQUFDO0lBQy9CLHNFQUFzRTtJQUN0RSxxQ0FBcUM7SUFDckMsdURBQXVEO0lBQ3ZELEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUM7UUFDcEQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN0QixDQUFDO0lBQ0Qsc0RBQXNEO0lBQ3RELEdBQUcsQ0FBQyxRQUFRLENBQUM7UUFDVCxJQUFJLEVBQUUsS0FBSztRQUNYLFdBQVcsRUFBRSx5REFBeUQ7UUFDdEUsT0FBTyxFQUFFO1lBQ0wsWUFBWSxFQUFFO2dCQUNWLFdBQVcsRUFDUCx5R0FBeUc7b0JBQ3pHLDJDQUEyQztnQkFDL0MsT0FBTyxFQUFFLEtBQUssSUFBSSxFQUFFLENBQUMsY0FBYyxFQUFFO2FBQ3hDO1NBQ0o7S0FDSixDQUFDLENBQUM7SUFDSCxPQUFPLEdBQUcsQ0FBQztBQUNmLENBQUM7QUFFRCx3REFBd0Q7QUFDeEQsU0FBUyxjQUFjO0lBQ25CLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBQSxXQUFJLEVBQUMsU0FBUyxFQUFFLE9BQU8s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SSxDQUFDLENBQUM7UUFDekMsQ0FBQztJQUNMLENBQUM7QUFDTCxDQUFDO0FBRU0sS0FBSyxVQUFVLE1BQU07SUFDeEIsTUFBTSxVQUFVLEVBQUUsQ0FBQztJQUNuQixHQUFHLEdBQUcsSUFBSSxDQUFDO0lBQ1gsUUFBUSxHQUFHLElBQUksQ0FBQztJQUNoQixRQUFRLEdBQUcsSUFBSSxDQUFDO0lBQ2hCLE1BQU0sR0FBRyxJQUFJLENBQUM7QUFDbEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiDmk7TlsZXkuLvpgLLnqIvlhaXlj6PvvJrnlJ/lkb3pgLHmnJ8gKyDpnaLmnb/oqIrmga/jgIJcclxuICovXHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgY2xlYXJCcmlkZ2VJbmZvLCB3cml0ZUJyaWRnZUluZm8sIHdyaXRlU2lkZWNhckluZm8sIHdyaXRlVG9vbHNDYWNoZSB9IGZyb20gJy4vYnJpZGdlL2Rpc2NvdmVyeSc7XHJcbmltcG9ydCB7IEJyaWRnZVNlcnZlciB9IGZyb20gJy4vYnJpZGdlL3NlcnZlcic7XHJcbmltcG9ydCB7IHJlYWRTZXR0aW5ncyB9IGZyb20gJy4vc2V0dGluZ3MnO1xyXG5pbXBvcnQgeyBUb29sUmVnaXN0cnkgfSBmcm9tICcuL3Rvb2xzL3JlZ2lzdHJ5JztcclxuaW1wb3J0IHsgQnJpZGdlU2V0dGluZ3MsIEVkaXRvckVudiwgVG9vbENvbnRleHQgfSBmcm9tICcuL3R5cGVzJztcclxuaW1wb3J0IHsgZGV0ZWN0RWRpdG9yRW52IH0gZnJvbSAnLi92ZXJzaW9uJztcclxuXHJcbmxldCBlbnY6IEVkaXRvckVudiB8IG51bGwgPSBudWxsO1xyXG5sZXQgc2V0dGluZ3M6IEJyaWRnZVNldHRpbmdzIHwgbnVsbCA9IG51bGw7XHJcbmxldCByZWdpc3RyeTogVG9vbFJlZ2lzdHJ5IHwgbnVsbCA9IG51bGw7XHJcbmxldCBicmlkZ2U6IEJyaWRnZVNlcnZlciB8IG51bGwgPSBudWxsO1xyXG5cclxuZnVuY3Rpb24gYnVpbGRSZWdpc3RyeSgpOiBUb29sUmVnaXN0cnkge1xyXG4gICAgY29uc3QgcmVnID0gbmV3IFRvb2xSZWdpc3RyeSgpO1xyXG4gICAgLy8g5YuV5oWLIHJlcXVpcmXvvIjpnZ7poILlsaQgaW1wb3J077yJ77ya6K6TIGRldi5yZWxvYWRfdG9vbHMg5riF5o6JIHJlcXVpcmUgY2FjaGUg5b6M6IO96LyJ5YWl5paw5Luj56K877yMXHJcbiAgICAvLyDlt6XlhbfmuIXllq7nlLEgdG9vbHMvaW5kZXgudHMg57at6K2377yI5paw5aKe5bel5YW35Lmf5Y+v54ax6LyJ5YWl77yJXHJcbiAgICAvKiBlc2xpbnQtZGlzYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdmFyLXJlcXVpcmVzICovXHJcbiAgICBmb3IgKGNvbnN0IGRlZiBvZiByZXF1aXJlKCcuL3Rvb2xzJykuY3JlYXRlQWxsVG9vbHMoKSkge1xyXG4gICAgICAgIHJlZy5yZWdpc3RlcihkZWYpO1xyXG4gICAgfVxyXG4gICAgLyogZXNsaW50LWVuYWJsZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdmFyLXJlcXVpcmVzICovXHJcbiAgICByZWcucmVnaXN0ZXIoe1xyXG4gICAgICAgIG5hbWU6ICdkZXYnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRGV2ZWxvcG1lbnQgaGVscGVycyBmb3IgdGhlIGNvY29zLW1jcCBleHRlbnNpb24gaXRzZWxmLicsXHJcbiAgICAgICAgYWN0aW9uczoge1xyXG4gICAgICAgICAgICByZWxvYWRfdG9vbHM6IHtcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxyXG4gICAgICAgICAgICAgICAgICAgICdIb3QtcmVsb2FkIHRvb2wgbW9kdWxlcyBmcm9tIGRpc3QvIChydW4gYWZ0ZXIgcmVidWlsZGluZyB0aGUgZXh0ZW5zaW9uKSB3aXRob3V0IHJlc3RhcnRpbmcgdGhlIGVkaXRvci4gJyArXHJcbiAgICAgICAgICAgICAgICAgICAgJ0RvZXMgTk9UIHJlbG9hZCBicmlkZ2UvbWFpbiBwcm9jZXNzIGNvZGUuJyxcclxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jICgpID0+IGRldlJlbG9hZFRvb2xzKCksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHJlZztcclxufVxyXG5cclxuLyoqIOa4heaOieW3peWFt+WxpOaooee1hOeahCByZXF1aXJlIGNhY2hlIOS4pumHjeW7uuiou+WGiuihqO+8iGJyaWRnZS9tYWluIOacrOi6q+S4jeWPl+W9semfv++8iSAqL1xyXG5mdW5jdGlvbiBkZXZSZWxvYWRUb29scygpOiB7IHRvb2xzOiBzdHJpbmdbXSB9IHtcclxuICAgIGNvbnN0IHByZWZpeGVzID0gW2pvaW4oX19kaXJuYW1lLCAndG9vbHMnKSwgam9pbihfX2Rpcm5hbWUsICdhZGFwdGVycy5qcycpXTtcclxuICAgIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHJlcXVpcmUuY2FjaGUpKSB7XHJcbiAgICAgICAgaWYgKHByZWZpeGVzLnNvbWUoKHApID0+IGtleS5zdGFydHNXaXRoKHApKSkge1xyXG4gICAgICAgICAgICBkZWxldGUgcmVxdWlyZS5jYWNoZVtrZXldO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJlZ2lzdHJ5ID0gYnVpbGRSZWdpc3RyeSgpO1xyXG4gICAgd3JpdGVUb29sc0NhY2hlKEVkaXRvci5Qcm9qZWN0LnBhdGgsIHJlZ2lzdHJ5LmNhdGFsb2coKSk7XHJcbiAgICBjb25zb2xlLmxvZygnW2NvY29zLW1jcF0gdG9vbHMgaG90LXJlbG9hZGVkOicsIHJlZ2lzdHJ5LnRvb2xOYW1lcygpLmpvaW4oJywgJykpO1xyXG4gICAgcmV0dXJuIHsgdG9vbHM6IHJlZ2lzdHJ5LnRvb2xOYW1lcygpIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNvbnRleHQoKTogVG9vbENvbnRleHQge1xyXG4gICAgaWYgKCFlbnYgfHwgIXNldHRpbmdzKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb2Nvcy1tY3AgZXh0ZW5zaW9uIG5vdCBpbml0aWFsaXplZCcpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHsgZW52LCBzZXR0aW5ncyB9O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlclN0YXR1cyB7XHJcbiAgICBydW5uaW5nOiBib29sZWFuO1xyXG4gICAgcG9ydDogbnVtYmVyIHwgbnVsbDtcclxuICAgIHByb2plY3RQYXRoOiBzdHJpbmc7XHJcbiAgICBlZGl0b3JWZXJzaW9uOiBzdHJpbmc7XHJcbiAgICB0b29sQ291bnQ6IG51bWJlcjtcclxuICAgIHNpZGVjYXJFbnRyeTogc3RyaW5nO1xyXG59XHJcblxyXG4vKiogc2lkZWNhciDlhaXlj6PnmoTntZXlsI3ot6/lvpHvvIhfX2Rpcm5hbWUgPSA85pO05bGVPi9kaXN077yJICovXHJcbmZ1bmN0aW9uIHNpZGVjYXJFbnRyeSgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGpvaW4oX19kaXJuYW1lLCAnLi4nLCAnZGlzdC1zaWRlY2FyJywgJ2luZGV4LmpzJyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dGVuc2lvblZlcnNpb24oKTogc3RyaW5nIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgcmV0dXJuIFN0cmluZyhyZXF1aXJlKCcuLi9wYWNrYWdlLmpzb24nKS52ZXJzaW9uKTtcclxuICAgIH0gY2F0Y2gge1xyXG4gICAgICAgIHJldHVybiAndW5rbm93bic7XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFN0YXR1cygpOiBTZXJ2ZXJTdGF0dXMge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgICBydW5uaW5nOiBCb29sZWFuKGJyaWRnZSAmJiBicmlkZ2UucnVubmluZyksXHJcbiAgICAgICAgcG9ydDogYnJpZGdlICYmIGJyaWRnZS5ydW5uaW5nID8gYnJpZGdlLmN1cnJlbnRQb3J0IDogbnVsbCxcclxuICAgICAgICBwcm9qZWN0UGF0aDogRWRpdG9yLlByb2plY3QucGF0aCxcclxuICAgICAgICBlZGl0b3JWZXJzaW9uOiBlbnYgPyBlbnYudmVyc2lvbi5yYXcgOiBFZGl0b3IuQXBwLnZlcnNpb24sXHJcbiAgICAgICAgdG9vbENvdW50OiByZWdpc3RyeSA/IHJlZ2lzdHJ5LnRvb2xOYW1lcygpLmxlbmd0aCA6IDAsXHJcbiAgICAgICAgc2lkZWNhckVudHJ5OiBzaWRlY2FyRW50cnkoKSxcclxuICAgIH07XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIHN0YXJ0QnJpZGdlKCk6IFByb21pc2U8U2VydmVyU3RhdHVzPiB7XHJcbiAgICBpZiAoIWVudiB8fCAhc2V0dGluZ3MgfHwgIXJlZ2lzdHJ5KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb2Nvcy1tY3AgZXh0ZW5zaW9uIG5vdCBpbml0aWFsaXplZCcpO1xyXG4gICAgfVxyXG4gICAgaWYgKGJyaWRnZSAmJiBicmlkZ2UucnVubmluZykge1xyXG4gICAgICAgIHJldHVybiBnZXRTdGF0dXMoKTtcclxuICAgIH1cclxuICAgIC8vIOWLleaFi+WPlueUqOaooee1hOWxpCByZWdpc3Ryee+8iGRldi5yZWxvYWRfdG9vbHMg5pyD5pu/5o+b5a6D77yJXHJcbiAgICBicmlkZ2UgPSBuZXcgQnJpZGdlU2VydmVyKHtcclxuICAgICAgICBwcmVmZXJyZWRQb3J0OiBzZXR0aW5ncy5wb3J0LFxyXG4gICAgICAgIHByb2plY3RQYXRoOiBFZGl0b3IuUHJvamVjdC5wYXRoLFxyXG4gICAgICAgIGVkaXRvclZlcnNpb246IGVudi52ZXJzaW9uLnJhdyxcclxuICAgICAgICBjYXRhbG9nOiAoKSA9PiByZWdpc3RyeSEuY2F0YWxvZygpLFxyXG4gICAgICAgIGludm9rZTogKHJlcSkgPT4gcmVnaXN0cnkhLmludm9rZShyZXEsIGNvbnRleHQoKSksXHJcbiAgICB9KTtcclxuICAgIGNvbnN0IHsgcG9ydCwgdG9rZW4gfSA9IGF3YWl0IGJyaWRnZS5zdGFydCgpO1xyXG4gICAgd3JpdGVCcmlkZ2VJbmZvKEVkaXRvci5Qcm9qZWN0LnBhdGgsIHtcclxuICAgICAgICBwb3J0LFxyXG4gICAgICAgIHRva2VuLFxyXG4gICAgICAgIHBpZDogcHJvY2Vzcy5waWQsXHJcbiAgICAgICAgZWRpdG9yVmVyc2lvbjogZW52LnZlcnNpb24ucmF3LFxyXG4gICAgICAgIHByb2plY3RQYXRoOiBFZGl0b3IuUHJvamVjdC5wYXRoLFxyXG4gICAgICAgIHN0YXJ0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgfSk7XHJcbiAgICB3cml0ZVRvb2xzQ2FjaGUoRWRpdG9yLlByb2plY3QucGF0aCwgcmVnaXN0cnkuY2F0YWxvZygpKTtcclxuICAgIHdyaXRlU2lkZWNhckluZm8oRWRpdG9yLlByb2plY3QucGF0aCwgc2lkZWNhckVudHJ5KCksIGV4dGVuc2lvblZlcnNpb24oKSk7XHJcbiAgICBjb25zb2xlLmxvZyhgW2NvY29zLW1jcF0gYnJpZGdlIHN0YXJ0ZWQ6IDEyNy4wLjAuMToke3BvcnR9IChlZGl0b3IgJHtlbnYudmVyc2lvbi5yYXd9KWApO1xyXG4gICAgcmV0dXJuIGdldFN0YXR1cygpO1xyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBzdG9wQnJpZGdlKCk6IFByb21pc2U8U2VydmVyU3RhdHVzPiB7XHJcbiAgICBpZiAoYnJpZGdlKSB7XHJcbiAgICAgICAgYXdhaXQgYnJpZGdlLnN0b3AoKTtcclxuICAgICAgICBjbGVhckJyaWRnZUluZm8oRWRpdG9yLlByb2plY3QucGF0aCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1tjb2Nvcy1tY3BdIGJyaWRnZSBzdG9wcGVkJyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZ2V0U3RhdHVzKCk7XHJcbn1cclxuXHJcbi8qKiBwYWNrYWdlLmpzb24gY29udHJpYnV0aW9ucy5tZXNzYWdlcyDlsI3mh4nnmoTmlrnms5UgKi9cclxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IFJlY29yZDxzdHJpbmcsICguLi5hcmdzOiBhbnlbXSkgPT4gYW55PiA9IHtcclxuICAgIG9wZW5QYW5lbCgpIHtcclxuICAgICAgICBFZGl0b3IuUGFuZWwub3BlbignY29jb3MtbWNwLWV4dGVuc2lvbicpO1xyXG4gICAgfSxcclxuICAgIGFzeW5jIHN0YXJ0U2VydmVyKCk6IFByb21pc2U8U2VydmVyU3RhdHVzPiB7XHJcbiAgICAgICAgcmV0dXJuIHN0YXJ0QnJpZGdlKCk7XHJcbiAgICB9LFxyXG4gICAgYXN5bmMgc3RvcFNlcnZlcigpOiBQcm9taXNlPFNlcnZlclN0YXR1cz4ge1xyXG4gICAgICAgIHJldHVybiBzdG9wQnJpZGdlKCk7XHJcbiAgICB9LFxyXG4gICAgZ2V0U2VydmVyU3RhdHVzKCk6IFNlcnZlclN0YXR1cyB7XHJcbiAgICAgICAgcmV0dXJuIGdldFN0YXR1cygpO1xyXG4gICAgfSxcclxufTtcclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgZW52ID0gZGV0ZWN0RWRpdG9yRW52KCk7XHJcbiAgICBzZXR0aW5ncyA9IHJlYWRTZXR0aW5ncyhFZGl0b3IuUHJvamVjdC5wYXRoKTtcclxuICAgIHJlZ2lzdHJ5ID0gYnVpbGRSZWdpc3RyeSgpO1xyXG4gICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgYFtjb2Nvcy1tY3BdIGxvYWRlZCAoZWRpdG9yICR7ZW52LnZlcnNpb24ucmF3fSwgYCArXHJcbiAgICAgICAgYGNhcHM6ICR7SlNPTi5zdHJpbmdpZnkoZW52LmNhcGFiaWxpdGllcyl9KWAsXHJcbiAgICApO1xyXG4gICAgaWYgKHNldHRpbmdzLmF1dG9TdGFydCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IHN0YXJ0QnJpZGdlKCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tjb2Nvcy1tY3BdIGJyaWRnZSBhdXRvLXN0YXJ0IGZhaWxlZDonLCBlcnIpO1xyXG4gICAgICAgICAgICAvLyDllZ/li5XlpLHmlZfmmYLmuIXmjonmrpjnlZnnmoQgZGlzY292ZXJ577yM6YG/5YWNIHNpZGVjYXIg6YCj5Yiw6IiK5Z+g77yI5Y+v6IO95bey6KKr5YW25LuW57eo6Lyv5Zmo5o6l5omL77yJXHJcbiAgICAgICAgICAgIGNsZWFyQnJpZGdlSW5mbyhFZGl0b3IuUHJvamVjdC5wYXRoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1bmxvYWQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCBzdG9wQnJpZGdlKCk7XHJcbiAgICBlbnYgPSBudWxsO1xyXG4gICAgc2V0dGluZ3MgPSBudWxsO1xyXG4gICAgcmVnaXN0cnkgPSBudWxsO1xyXG4gICAgYnJpZGdlID0gbnVsbDtcclxufVxyXG4iXX0=