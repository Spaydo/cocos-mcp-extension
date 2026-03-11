"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServer = void 0;
const http = __importStar(require("http"));
const SERVER_INFO = {
    name: 'cocos-mcp-extension',
    version: '1.0.0',
};
const PROTOCOL_VERSION = '2024-11-05';
class MCPServer {
    constructor(settings) {
        this.httpServer = null;
        this.tools = {};
        this.toolsList = [];
        this.actionCount = 0;
        this.enableDebugLog = false;
        this.settings = settings;
        this.enableDebugLog = settings.enableDebugLog;
    }
    // === Tool Registration ===
    registerToolCategory(category, executor) {
        this.tools[category] = executor;
    }
    /**
     * Build consolidated tool list: one MCP tool per category with action parameter.
     * AI sees 11 tools instead of 87, saving ~50% tokens on tool definitions.
     * Per-tool settings filter individual actions within each category.
     */
    setupTools() {
        this.toolsList = [];
        this.actionCount = 0;
        const enabledCats = this.settings.enabledCategories || {};
        const enabledTools = this.settings.enabledTools || {};
        for (const [category, executor] of Object.entries(this.tools)) {
            // Skip entirely disabled categories
            if (enabledCats[category] === false)
                continue;
            const allTools = executor.getTools();
            // Filter by per-tool settings
            const activeTools = allTools.filter(tool => {
                const fullName = `${category}_${tool.name}`;
                return enabledTools[fullName] !== undefined
                    ? enabledTools[fullName]
                    : true; // enabled by default within an enabled category
            });
            if (activeTools.length === 0)
                continue;
            this.actionCount += activeTools.length;
            // Build one consolidated MCP tool per category
            this.toolsList.push({
                name: category,
                description: this.buildDescription(category, activeTools),
                inputSchema: this.buildSchema(activeTools),
            });
        }
        this.log(`Tools registered: ${this.toolsList.length} categories, ${this.actionCount} actions`);
    }
    buildDescription(category, tools) {
        const catDesc = MCPServer.CATEGORY_DESCRIPTIONS[category] || category;
        let desc = `${catDesc}\n\nActions:\n`;
        for (const tool of tools) {
            const params = this.formatActionParams(tool.inputSchema);
            desc += params
                ? `- ${tool.name}: ${tool.description} (${params})\n`
                : `- ${tool.name}: ${tool.description}\n`;
        }
        return desc.trim();
    }
    formatActionParams(schema) {
        const props = schema.properties || {};
        const required = schema.required || [];
        const parts = [];
        for (const [name, def] of Object.entries(props)) {
            const isReq = required.includes(name);
            const type = def.type || 'any';
            parts.push(`${name}${isReq ? '' : '?'}: ${type}`);
        }
        return parts.join(', ');
    }
    // === Consolidated Tool Schema ===
    buildSchema(tools) {
        const actionEnum = tools.map(t => t.name);
        const mergedProps = {
            action: {
                type: 'string',
                enum: actionEnum,
                description: 'The action to perform',
            },
        };
        for (const tool of tools) {
            const props = tool.inputSchema.properties || {};
            for (const [propName, propDef] of Object.entries(props)) {
                if (!mergedProps[propName]) {
                    mergedProps[propName] = Object.assign({}, propDef);
                }
            }
        }
        return {
            type: 'object',
            properties: mergedProps,
            required: ['action'],
        };
    }
    getAllToolsInfo() {
        const enabledCats = this.settings.enabledCategories || {};
        const enabledTools = this.settings.enabledTools || {};
        return Object.entries(this.tools).map(([category, executor]) => ({
            category,
            isCore: MCPServer.CORE_CATEGORIES.includes(category),
            tools: executor.getTools().map(tool => {
                const fullName = `${category}_${tool.name}`;
                const enabled = enabledTools[fullName] !== undefined
                    ? enabledTools[fullName]
                    : enabledCats[category] !== false;
                return { name: fullName, description: tool.description, enabled };
            }),
        }));
    }
    // === Server Lifecycle ===
    start() {
        return new Promise((resolve, reject) => {
            if (this.httpServer) {
                resolve();
                return;
            }
            this.setupTools();
            this.httpServer = http.createServer(this.handleHttpRequest.bind(this));
            this.httpServer.on('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`[MCP] Port ${this.settings.port} is already in use`);
                    this.httpServer = null;
                    reject(new Error(`Port ${this.settings.port} is already in use`));
                }
                else {
                    console.error('[MCP] Server error:', err);
                    reject(err);
                }
            });
            this.httpServer.listen(this.settings.port, '127.0.0.1', () => {
                console.log(`[MCP] Server started on http://127.0.0.1:${this.settings.port}/mcp`);
                resolve();
            });
        });
    }
    stop() {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            console.log('[MCP] Server stopped');
        }
    }
    isRunning() {
        return this.httpServer !== null;
    }
    getToolCount() {
        return this.toolsList.length;
    }
    getActionCount() {
        return this.actionCount;
    }
    updateSettings(settings) {
        this.settings = settings;
        this.enableDebugLog = settings.enableDebugLog;
        // Rebuild tool list when categories change
        this.setupTools();
    }
    // === HTTP Request Handling ===
    handleHttpRequest(req, res) {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.setHeader('Content-Type', 'application/json');
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        const url = req.url || '';
        if (req.method === 'GET' && url === '/health') {
            this.handleHealth(res);
        }
        else if (req.method === 'POST' && url === '/mcp') {
            this.handleMCP(req, res);
        }
        else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    }
    handleHealth(res) {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'ok',
            tools: this.toolsList.length,
            actions: this.actionCount,
            server: SERVER_INFO,
        }));
    }
    handleMCP(req, res) {
        let body = '';
        req.on('data', (chunk) => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                let message;
                try {
                    message = JSON.parse(body);
                }
                catch (_a) {
                    // Try fixing common JSON issues from AI clients
                    try {
                        message = JSON.parse(fixCommonJsonIssues(body));
                    }
                    catch (_b) {
                        res.writeHead(200);
                        res.end(JSON.stringify({
                            jsonrpc: '2.0',
                            id: null,
                            error: { code: -32700, message: 'Parse error' },
                        }));
                        return;
                    }
                }
                const result = await this.handleMessage(message);
                res.writeHead(200);
                res.end(JSON.stringify(result));
            }
            catch (err) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: { code: -32603, message: err.message },
                }));
            }
        });
    }
    // === JSON-RPC 2.0 Message Handling ===
    async handleMessage(message) {
        const { id, method, params } = message;
        this.log(`[MCP] → ${method}`);
        switch (method) {
            case 'initialize':
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        protocolVersion: PROTOCOL_VERSION,
                        capabilities: { tools: {} },
                        serverInfo: SERVER_INFO,
                    },
                };
            case 'notifications/initialized':
                // Client notification, no response needed
                return { jsonrpc: '2.0', id, result: {} };
            case 'tools/list':
                return {
                    jsonrpc: '2.0',
                    id,
                    result: {
                        tools: this.toolsList.map(t => ({
                            name: t.name,
                            description: t.description,
                            inputSchema: t.inputSchema,
                        })),
                    },
                };
            case 'tools/call': {
                const toolName = params === null || params === void 0 ? void 0 : params.name;
                const args = (params === null || params === void 0 ? void 0 : params.arguments) || {};
                if (!toolName) {
                    return {
                        jsonrpc: '2.0',
                        id,
                        error: { code: -32602, message: 'Missing tool name' },
                    };
                }
                try {
                    const result = await this.executeToolCall(toolName, args);
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [{ type: 'text', text: JSON.stringify(result) }],
                        },
                    };
                }
                catch (err) {
                    return {
                        jsonrpc: '2.0',
                        id,
                        result: {
                            content: [{ type: 'text', text: JSON.stringify({ success: false, error: err.message }) }],
                            isError: true,
                        },
                    };
                }
            }
            default:
                return {
                    jsonrpc: '2.0',
                    id,
                    error: { code: -32601, message: `Unknown method: ${method}` },
                };
        }
    }
    // === Tool Execution ===
    async executeToolCall(toolName, args) {
        // Consolidated approach: tool name = category, action in args
        const executor = this.tools[toolName];
        if (!executor) {
            throw new Error(`Unknown tool: ${toolName}`);
        }
        const action = args === null || args === void 0 ? void 0 : args.action;
        if (!action) {
            throw new Error(`Missing "action" parameter for tool "${toolName}". Check available actions in the tool description.`);
        }
        this.log(`[MCP] Executing: ${toolName}.${action}`);
        const result = await executor.execute(action, args);
        this.log(`[MCP] Result: ${result.success ? 'OK' : 'FAIL'}`);
        return result;
    }
    // === Logging ===
    log(msg) {
        if (this.enableDebugLog) {
            console.log(msg);
        }
    }
}
exports.MCPServer = MCPServer;
// === Consolidated Tool Description ===
MCPServer.CATEGORY_DESCRIPTIONS = {
    scene: 'Scene management (open, save, query hierarchy, etc.)',
    node: 'Node/GameObject operations (create, delete, transform, etc.)',
    component: 'Component management (add, remove, query, set properties, etc.)',
    asset: 'Asset database operations (query, create, import, dependencies, etc.)',
    prefab: 'Prefab operations (list, instantiate, create, restore)',
    project: 'Project-level operations (info, build, preview, config)',
    debug: 'Debugging utilities (logs, script execution)',
    scene_view: 'Scene view controls (gizmo, camera, grid, view mode)',
    editor: 'Editor environment (preferences, info, devices)',
    reference_image: 'Reference image overlay management',
    animation: 'Animation playback control',
};
// === Tool Info for Panel UI (per-action granularity) ===
MCPServer.CORE_CATEGORIES = ['scene', 'node', 'component', 'asset', 'prefab', 'project', 'debug'];
// === JSON Fix Helper ===
function fixCommonJsonIssues(input) {
    let fixed = input;
    // Remove trailing commas before } or ]
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');
    // Replace single quotes with double quotes (outside of strings)
    fixed = fixed.replace(/'/g, '"');
    // Escape unescaped newlines
    fixed = fixed.replace(/\n/g, '\\n');
    fixed = fixed.replace(/\r/g, '\\r');
    fixed = fixed.replace(/\t/g, '\\t');
    return fixed;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUc3QixNQUFNLFdBQVcsR0FBRztJQUNoQixJQUFJLEVBQUUscUJBQXFCO0lBQzNCLE9BQU8sRUFBRSxPQUFPO0NBQ25CLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQztBQUV0QyxNQUFhLFNBQVM7SUFRbEIsWUFBWSxRQUEyQjtRQVAvQixlQUFVLEdBQXVCLElBQUksQ0FBQztRQUV0QyxVQUFLLEdBQWlDLEVBQUUsQ0FBQztRQUN6QyxjQUFTLEdBQXFCLEVBQUUsQ0FBQztRQUNqQyxnQkFBVyxHQUFXLENBQUMsQ0FBQztRQUN4QixtQkFBYyxHQUFZLEtBQUssQ0FBQztRQUdwQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUM7SUFDbEQsQ0FBQztJQUVELDRCQUE0QjtJQUU1QixvQkFBb0IsQ0FBQyxRQUFnQixFQUFFLFFBQXNCO1FBQ3pELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsVUFBVTtRQUNOLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO1FBQzFELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUV0RCxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElB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QTBERiwwREFBMEQ7QUFFM0MseUJBQWUsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxBQUF4RSxDQUF5RTtBQWtRM0csMEJBQTBCO0FBRTFCLFNBQVMsbUJBQW1CLENBQUMsS0FBYTtJQUN0QyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDbEIsdUNBQXVDO0lBQ3ZDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxnRUFBZ0U7SUFDaEUsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLDRCQUE0QjtJQUM1QixLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDcEMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwQyxPQUFPLEtBQUssQ0FBQztBQUNqQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcclxuaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBNQ1BTZXJ2ZXJTZXR0aW5ncyB9IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuY29uc3QgU0VSVkVSX0lORk8gPSB7XHJcbiAgICBuYW1lOiAnY29jb3MtbWNwLWV4dGVuc2lvbicsXHJcbiAgICB2ZXJzaW9uOiAnMS4wLjAnLFxyXG59O1xyXG5cclxuY29uc3QgUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI0LTExLTA1JztcclxuXHJcbmV4cG9ydCBjbGFzcyBNQ1BTZXJ2ZXIge1xyXG4gICAgcHJpdmF0ZSBodHRwU2VydmVyOiBodHRwLlNlcnZlciB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3M7XHJcbiAgICBwcml2YXRlIHRvb2xzOiBSZWNvcmQ8c3RyaW5nLCBUb29sRXhlY3V0b3I+ID0ge307XHJcbiAgICBwcml2YXRlIHRvb2xzTGlzdDogVG9vbERlZmluaXRpb25bXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBhY3Rpb25Db3VudDogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgZW5hYmxlRGVidWdMb2c6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XHJcbiAgICAgICAgdGhpcy5lbmFibGVEZWJ1Z0xvZyA9IHNldHRpbmdzLmVuYWJsZURlYnVnTG9nO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIFJlZ2lzdHJhdGlvbiA9PT1cclxuXHJcbiAgICByZWdpc3RlclRvb2xDYXRlZ29yeShjYXRlZ29yeTogc3RyaW5nLCBleGVjdXRvcjogVG9vbEV4ZWN1dG9yKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy50b29sc1tjYXRlZ29yeV0gPSBleGVjdXRvcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEJ1aWxkIGNvbnNvbGlkYXRlZCB0b29sIGxpc3Q6IG9uZSBNQ1AgdG9vbCBwZXIgY2F0ZWdvcnkgd2l0aCBhY3Rpb24gcGFyYW1ldGVyLlxyXG4gICAgICogQUkgc2VlcyAxMSB0b29scyBpbnN0ZWFkIG9mIDg3LCBzYXZpbmcgfjUwJSB0b2tlbnMgb24gdG9vbCBkZWZpbml0aW9ucy5cclxuICAgICAqIFBlci10b29sIHNldHRpbmdzIGZpbHRlciBpbmRpdmlkdWFsIGFjdGlvbnMgd2l0aGluIGVhY2ggY2F0ZWdvcnkuXHJcbiAgICAgKi9cclxuICAgIHNldHVwVG9vbHMoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy50b29sc0xpc3QgPSBbXTtcclxuICAgICAgICB0aGlzLmFjdGlvbkNvdW50ID0gMDtcclxuICAgICAgICBjb25zdCBlbmFibGVkQ2F0cyA9IHRoaXMuc2V0dGluZ3MuZW5hYmxlZENhdGVnb3JpZXMgfHwge307XHJcbiAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xzID0gdGhpcy5zZXR0aW5ncy5lbmFibGVkVG9vbHMgfHwge307XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW2NhdGVnb3J5LCBleGVjdXRvcl0gb2YgT2JqZWN0LmVudHJpZXModGhpcy50b29scykpIHtcclxuICAgICAgICAgICAgLy8gU2tpcCBlbnRpcmVseSBkaXNhYmxlZCBjYXRlZ29yaWVzXHJcbiAgICAgICAgICAgIGlmIChlbmFibGVkQ2F0c1tjYXRlZ29yeV0gPT09IGZhbHNlKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFsbFRvb2xzID0gZXhlY3V0b3IuZ2V0VG9vbHMoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEZpbHRlciBieSBwZXItdG9vbCBzZXR0aW5nc1xyXG4gICAgICAgICAgICBjb25zdCBhY3RpdmVUb29scyA9IGFsbFRvb2xzLmZpbHRlcih0b29sID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxOYW1lID0gYCR7Y2F0ZWdvcnl9XyR7dG9vbC5uYW1lfWA7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZW5hYmxlZFRvb2xzW2Z1bGxOYW1lXSAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICAgICAgPyBlbmFibGVkVG9vbHNbZnVsbE5hbWVdXHJcbiAgICAgICAgICAgICAgICAgICAgOiB0cnVlOyAvLyBlbmFibGVkIGJ5IGRlZmF1bHQgd2l0aGluIGFuIGVuYWJsZWQgY2F0ZWdvcnlcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYWN0aXZlVG9vbHMubGVuZ3RoID09PSAwKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uQ291bnQgKz0gYWN0aXZlVG9vbHMubGVuZ3RoO1xyXG5cclxuICAgICAgICAgICAgLy8gQnVpbGQgb25lIGNvbnNvbGlkYXRlZCBNQ1AgdG9vbCBwZXIgY2F0ZWdvcnlcclxuICAgICAgICAgICAgdGhpcy50b29sc0xpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0aGlzLmJ1aWxkRGVzY3JpcHRpb24oY2F0ZWdvcnksIGFjdGl2ZVRvb2xzKSxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB0aGlzLmJ1aWxkU2NoZW1hKGFjdGl2ZVRvb2xzKSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxvZyhgVG9vbHMgcmVnaXN0ZXJlZDogJHt0aGlzLnRvb2xzTGlzdC5sZW5ndGh9IGNhdGVnb3JpZXMsICR7dGhpcy5hY3Rpb25Db3VudH0gYWN0aW9uc2ApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBDb25zb2xpZGF0ZWQgVG9vbCBEZXNjcmlwdGlvbiA9PT1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBDQVRFR09SWV9ERVNDUklQVElPTlM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAgICAgc2NlbmU6ICdTY2VuZSBtYW5hZ2VtZW50IChvcGVuLCBzYXZlLCBxdWVyeSBoaWVyYXJjaHksIGV0Yy4pJyxcclxuICAgICAgICBub2RlOiAnTm9kZS9HYW1lT2JqZWN0IG9wZXJhdGlvbnMgKGNyZWF0ZSwgZGVsZXRlLCB0cmFuc2Zvcm0sIGV0Yy4pJyxcclxuICAgICAgICBjb21wb25lbnQ6ICdDb21wb25lbnQgbWFuYWdlbWVudCAoYWRkLCByZW1vdmUsIHF1ZXJ5LCBzZXQgcHJvcGVydGllcywgZXRjLiknLFxyXG4gICAgICAgIGFzc2V0OiAnQXNzZXQgZGF0YWJhc2Ugb3BlcmF0aW9ucyAocXVlcnksIGNyZWF0ZSwgaW1wb3J0LCBkZXBlbmRlbmNpZXMsIGV0Yy4pJyxcclxuICAgICAgICBwcmVmYWI6ICdQcmVmYWIgb3BlcmF0aW9ucyAobGlzdCwgaW5zdGFudGlhdGUsIGNyZWF0ZSwgcmVzdG9yZSknLFxyXG4gICAgICAgIHByb2plY3Q6ICdQcm9qZWN0LWxldmVsIG9wZXJhdGlvbnMgKGluZm8sIGJ1aWxkLCBwcmV2aWV3LCBjb25maWcpJyxcclxuICAgICAgICBkZWJ1ZzogJ0RlYnVnZ2luZyB1dGlsaXRpZXMgKGxvZ3MsIHNjcmlwdCBleGVjdXRpb24pJyxcclxuICAgICAgICBzY2VuZV92aWV3OiAnU2NlbmUgdmlldyBjb250cm9scyAoZ2l6bW8sIGNhbWVyYSwgZ3JpZCwgdmlldyBtb2RlKScsXHJcbiAgICAgICAgZWRpdG9yOiAnRWRpdG9yIGVudmlyb25tZW50IChwcmVmZXJlbmNlcywgaW5mbywgZGV2aWNlcyknLFxyXG4gICAgICAgIHJlZmVyZW5jZV9pbWFnZTogJ1JlZmVyZW5jZSBpbWFnZSBvdmVybGF5IG1hbmFnZW1lbnQnLFxyXG4gICAgICAgIGFuaW1hdGlvbjogJ0FuaW1hdGlvbiBwbGF5YmFjayBjb250cm9sJyxcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZERlc2NyaXB0aW9uKGNhdGVnb3J5OiBzdHJpbmcsIHRvb2xzOiBUb29sRGVmaW5pdGlvbltdKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBjYXREZXNjID0gTUNQU2VydmVyLkNBVEVHT1JZX0RFU0NSSVBUSU9OU1tjYXRlZ29yeV0gfHwgY2F0ZWdvcnk7XHJcbiAgICAgICAgbGV0IGRlc2MgPSBgJHtjYXREZXNjfVxcblxcbkFjdGlvbnM6XFxuYDtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0b29sIG9mIHRvb2xzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZm9ybWF0QWN0aW9uUGFyYW1zKHRvb2wuaW5wdXRTY2hlbWEpO1xyXG4gICAgICAgICAgICBkZXNjICs9IHBhcmFtc1xyXG4gICAgICAgICAgICAgICAgPyBgLSAke3Rvb2wubmFtZX06ICR7dG9vbC5kZXNjcmlwdGlvbn0gKCR7cGFyYW1zfSlcXG5gXHJcbiAgICAgICAgICAgICAgICA6IGAtICR7dG9vbC5uYW1lfTogJHt0b29sLmRlc2NyaXB0aW9ufVxcbmA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZGVzYy50cmltKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmb3JtYXRBY3Rpb25QYXJhbXMoc2NoZW1hOiBUb29sRGVmaW5pdGlvblsnaW5wdXRTY2hlbWEnXSk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgcHJvcHMgPSBzY2hlbWEucHJvcGVydGllcyB8fCB7fTtcclxuICAgICAgICBjb25zdCByZXF1aXJlZCA9IHNjaGVtYS5yZXF1aXJlZCB8fCBbXTtcclxuXHJcbiAgICAgICAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgZm9yIChjb25zdCBbbmFtZSwgZGVmXSBvZiBPYmplY3QuZW50cmllcyhwcm9wcykpIHtcclxuICAgICAgICAgICAgY29uc3QgaXNSZXEgPSByZXF1aXJlZC5pbmNsdWRlcyhuYW1lKTtcclxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IGRlZi50eXBlIHx8ICdhbnknO1xyXG4gICAgICAgICAgICBwYXJ0cy5wdXNoKGAke25hbWV9JHtpc1JlcSA/ICcnIDogJz8nfTogJHt0eXBlfWApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHBhcnRzLmpvaW4oJywgJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IENvbnNvbGlkYXRlZCBUb29sIFNjaGVtYSA9PT1cclxuXHJcbiAgICBwcml2YXRlIGJ1aWxkU2NoZW1hKHRvb2xzOiBUb29sRGVmaW5pdGlvbltdKTogVG9vbERlZmluaXRpb25bJ2lucHV0U2NoZW1hJ10ge1xyXG4gICAgICAgIGNvbnN0IGFjdGlvbkVudW0gPSB0b29scy5tYXAodCA9PiB0Lm5hbWUpO1xyXG4gICAgICAgIGNvbnN0IG1lcmdlZFByb3BzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAgICAgICBhY3Rpb246IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgZW51bTogYWN0aW9uRW51bSxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGFjdGlvbiB0byBwZXJmb3JtJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSB0b29sLmlucHV0U2NoZW1hLnByb3BlcnRpZXMgfHwge307XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3Byb3BOYW1lLCBwcm9wRGVmXSBvZiBPYmplY3QuZW50cmllcyhwcm9wcykpIHtcclxuICAgICAgICAgICAgICAgIGlmICghbWVyZ2VkUHJvcHNbcHJvcE5hbWVdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWVyZ2VkUHJvcHNbcHJvcE5hbWVdID0geyAuLi5wcm9wRGVmIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiBtZXJnZWRQcm9wcyxcclxuICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ10sXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gVG9vbCBJbmZvIGZvciBQYW5lbCBVSSAocGVyLWFjdGlvbiBncmFudWxhcml0eSkgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgQ09SRV9DQVRFR09SSUVTID0gWydzY2VuZScsICdub2RlJywgJ2NvbXBvbmVudCcsICdhc3NldCcsICdwcmVmYWInLCAncHJvamVjdCcsICdkZWJ1ZyddO1xyXG5cclxuICAgIGdldEFsbFRvb2xzSW5mbygpOiB7IGNhdGVnb3J5OiBzdHJpbmc7IGlzQ29yZTogYm9vbGVhbjsgdG9vbHM6IHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nOyBlbmFibGVkOiBib29sZWFuIH1bXSB9W10ge1xyXG4gICAgICAgIGNvbnN0IGVuYWJsZWRDYXRzID0gdGhpcy5zZXR0aW5ncy5lbmFibGVkQ2F0ZWdvcmllcyB8fCB7fTtcclxuICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0aGlzLnNldHRpbmdzLmVuYWJsZWRUb29scyB8fCB7fTtcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmVudHJpZXModGhpcy50b29scykubWFwKChbY2F0ZWdvcnksIGV4ZWN1dG9yXSkgPT4gKHtcclxuICAgICAgICAgICAgY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIGlzQ29yZTogTUNQU2VydmVyLkNPUkVfQ0FURUdPUklFUy5pbmNsdWRlcyhjYXRlZ29yeSksXHJcbiAgICAgICAgICAgIHRvb2xzOiBleGVjdXRvci5nZXRUb29scygpLm1hcCh0b29sID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxOYW1lID0gYCR7Y2F0ZWdvcnl9XyR7dG9vbC5uYW1lfWA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbmFibGVkID0gZW5hYmxlZFRvb2xzW2Z1bGxOYW1lXSAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICAgICAgPyBlbmFibGVkVG9vbHNbZnVsbE5hbWVdXHJcbiAgICAgICAgICAgICAgICAgICAgOiBlbmFibGVkQ2F0c1tjYXRlZ29yeV0gIT09IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZnVsbE5hbWUsIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uLCBlbmFibGVkIH07XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gU2VydmVyIExpZmVjeWNsZSA9PT1cclxuXHJcbiAgICBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5odHRwU2VydmVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0dXBUb29scygpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gaHR0cC5jcmVhdGVTZXJ2ZXIodGhpcy5oYW5kbGVIdHRwUmVxdWVzdC5iaW5kKHRoaXMpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlci5vbignZXJyb3InLCAoZXJyOiBOb2RlSlMuRXJybm9FeGNlcHRpb24pID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnIuY29kZSA9PT0gJ0VBRERSSU5VU0UnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW01DUF0gUG9ydCAke3RoaXMuc2V0dGluZ3MucG9ydH0gaXMgYWxyZWFkeSBpbiB1c2VgKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoYFBvcnQgJHt0aGlzLnNldHRpbmdzLnBvcnR9IGlzIGFscmVhZHkgaW4gdXNlYCkpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQXSBTZXJ2ZXIgZXJyb3I6JywgZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIubGlzdGVuKHRoaXMuc2V0dGluZ3MucG9ydCwgJzEyNy4wLjAuMScsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbTUNQXSBTZXJ2ZXIgc3RhcnRlZCBvbiBodHRwOi8vMTI3LjAuMC4xOiR7dGhpcy5zZXR0aW5ncy5wb3J0fS9tY3BgKTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgc3RvcCgpOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5odHRwU2VydmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlci5jbG9zZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBudWxsO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnW01DUF0gU2VydmVyIHN0b3BwZWQnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaXNSdW5uaW5nKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmh0dHBTZXJ2ZXIgIT09IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0VG9vbENvdW50KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMudG9vbHNMaXN0Lmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRBY3Rpb25Db3VudCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFjdGlvbkNvdW50O1xyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZVNldHRpbmdzKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncyk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcclxuICAgICAgICB0aGlzLmVuYWJsZURlYnVnTG9nID0gc2V0dGluZ3MuZW5hYmxlRGVidWdMb2c7XHJcbiAgICAgICAgLy8gUmVidWlsZCB0b29sIGxpc3Qgd2hlbiBjYXRlZ29yaWVzIGNoYW5nZVxyXG4gICAgICAgIHRoaXMuc2V0dXBUb29scygpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBIVFRQIFJlcXVlc3QgSGFuZGxpbmcgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVIdHRwUmVxdWVzdChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcclxuICAgICAgICAvLyBDT1JTIGhlYWRlcnNcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnLCAnR0VULCBQT1NULCBPUFRJT05TJyk7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycycsICdDb250ZW50LVR5cGUsIEF1dGhvcml6YXRpb24nKTtcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG5cclxuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICAgICAgcmVzLmVuZCgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCB1cmwgPSByZXEudXJsIHx8ICcnO1xyXG5cclxuICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcgJiYgdXJsID09PSAnL2hlYWx0aCcpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVIZWFsdGgocmVzKTtcclxuICAgICAgICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJyAmJiB1cmwgPT09ICcvbWNwJykge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZU1DUChyZXEsIHJlcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDQpO1xyXG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdOb3QgZm91bmQnIH0pKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVIZWFsdGgocmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XHJcbiAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBzdGF0dXM6ICdvaycsXHJcbiAgICAgICAgICAgIHRvb2xzOiB0aGlzLnRvb2xzTGlzdC5sZW5ndGgsXHJcbiAgICAgICAgICAgIGFjdGlvbnM6IHRoaXMuYWN0aW9uQ291bnQsXHJcbiAgICAgICAgICAgIHNlcnZlcjogU0VSVkVSX0lORk8sXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlTUNQKHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xyXG4gICAgICAgIGxldCBib2R5ID0gJyc7XHJcbiAgICAgICAgcmVxLm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHsgYm9keSArPSBjaHVuay50b1N0cmluZygpOyB9KTtcclxuICAgICAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlOiBhbnk7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGJvZHkpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IGZpeGluZyBjb21tb24gSlNPTiBpc3N1ZXMgZnJvbSBBSSBjbGllbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoZml4Q29tbW9uSnNvbklzc3Vlcyhib2R5KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHsgY29kZTogLTMyNzAwLCBtZXNzYWdlOiAnUGFyc2UgZXJyb3InIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmhhbmRsZU1lc3NhZ2UobWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3VsdCkpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHsgY29kZTogLTMyNjAzLCBtZXNzYWdlOiBlcnIubWVzc2FnZSB9LFxyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IEpTT04tUlBDIDIuMCBNZXNzYWdlIEhhbmRsaW5nID09PVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTWVzc2FnZShtZXNzYWdlOiBhbnkpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgICAgIGNvbnN0IHsgaWQsIG1ldGhvZCwgcGFyYW1zIH0gPSBtZXNzYWdlO1xyXG5cclxuICAgICAgICB0aGlzLmxvZyhgW01DUF0g4oaSICR7bWV0aG9kfWApO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xyXG4gICAgICAgICAgICBjYXNlICdpbml0aWFsaXplJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sVmVyc2lvbjogUFJPVE9DT0xfVkVSU0lPTixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwYWJpbGl0aWVzOiB7IHRvb2xzOiB7fSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJJbmZvOiBTRVJWRVJfSU5GTyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ25vdGlmaWNhdGlvbnMvaW5pdGlhbGl6ZWQnOlxyXG4gICAgICAgICAgICAgICAgLy8gQ2xpZW50IG5vdGlmaWNhdGlvbiwgbm8gcmVzcG9uc2UgbmVlZGVkXHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBqc29ucnBjOiAnMi4wJywgaWQsIHJlc3VsdDoge30gfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2xpc3QnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbHM6IHRoaXMudG9vbHNMaXN0Lm1hcCh0ID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB0Lm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdC5kZXNjcmlwdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB0LmlucHV0U2NoZW1hLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSksXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICd0b29scy9jYWxsJzoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbE5hbWUgPSBwYXJhbXM/Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhcmdzID0gcGFyYW1zPy5hcmd1bWVudHMgfHwge307XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCF0b29sTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHsgY29kZTogLTMyNjAyLCBtZXNzYWdlOiAnTWlzc2luZyB0b29sIG5hbWUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVRvb2xDYWxsKHRvb2xOYW1lLCBhcmdzKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBKU09OLnN0cmluZ2lmeShyZXN1bHQpIH1dLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KSB9XSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzRXJyb3I6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHsgY29kZTogLTMyNjAxLCBtZXNzYWdlOiBgVW5rbm93biBtZXRob2Q6ICR7bWV0aG9kfWAgfSxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIEV4ZWN1dGlvbiA9PT1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVUb29sQ2FsbCh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIC8vIENvbnNvbGlkYXRlZCBhcHByb2FjaDogdG9vbCBuYW1lID0gY2F0ZWdvcnksIGFjdGlvbiBpbiBhcmdzXHJcbiAgICAgICAgY29uc3QgZXhlY3V0b3IgPSB0aGlzLnRvb2xzW3Rvb2xOYW1lXTtcclxuICAgICAgICBpZiAoIWV4ZWN1dG9yKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYWN0aW9uID0gYXJncz8uYWN0aW9uO1xyXG4gICAgICAgIGlmICghYWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBcImFjdGlvblwiIHBhcmFtZXRlciBmb3IgdG9vbCBcIiR7dG9vbE5hbWV9XCIuIENoZWNrIGF2YWlsYWJsZSBhY3Rpb25zIGluIHRoZSB0b29sIGRlc2NyaXB0aW9uLmApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sb2coYFtNQ1BdIEV4ZWN1dGluZzogJHt0b29sTmFtZX0uJHthY3Rpb259YCk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShhY3Rpb24sIGFyZ3MpO1xyXG4gICAgICAgIHRoaXMubG9nKGBbTUNQXSBSZXN1bHQ6ICR7cmVzdWx0LnN1Y2Nlc3MgPyAnT0snIDogJ0ZBSUwnfWApO1xyXG5cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBMb2dnaW5nID09PVxyXG5cclxuICAgIHByaXZhdGUgbG9nKG1zZzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuZW5hYmxlRGVidWdMb2cpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cobXNnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vID09PSBKU09OIEZpeCBIZWxwZXIgPT09XHJcblxyXG5mdW5jdGlvbiBmaXhDb21tb25Kc29uSXNzdWVzKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgbGV0IGZpeGVkID0gaW5wdXQ7XHJcbiAgICAvLyBSZW1vdmUgdHJhaWxpbmcgY29tbWFzIGJlZm9yZSB9IG9yIF1cclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvLFxccyooW31cXF1dKS9nLCAnJDEnKTtcclxuICAgIC8vIFJlcGxhY2Ugc2luZ2xlIHF1b3RlcyB3aXRoIGRvdWJsZSBxdW90ZXMgKG91dHNpZGUgb2Ygc3RyaW5ncylcclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvJy9nLCAnXCInKTtcclxuICAgIC8vIEVzY2FwZSB1bmVzY2FwZWQgbmV3bGluZXNcclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvXFxuL2csICdcXFxcbicpO1xyXG4gICAgZml4ZWQgPSBmaXhlZC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJyk7XHJcbiAgICBmaXhlZCA9IGZpeGVkLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcclxuICAgIHJldHVybiBmaXhlZDtcclxufVxyXG4iXX0=