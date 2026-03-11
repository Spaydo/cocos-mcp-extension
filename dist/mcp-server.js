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
    prefab: 'Prefab operations (query, list, instantiate, create, restore)',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUc3QixNQUFNLFdBQVcsR0FBRztJQUNoQixJQUFJLEVBQUUscUJBQXFCO0lBQzNCLE9BQU8sRUFBRSxPQUFPO0NBQ25CLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQztBQUV0QyxNQUFhLFNBQVM7SUFRbEIsWUFBWSxRQUEyQjtRQVAvQixlQUFVLEdBQXVCLElBQUksQ0FBQztRQUV0QyxVQUFLLEdBQWlDLEVBQUUsQ0FBQztRQUN6QyxjQUFTLEdBQXFCLEVBQUUsQ0FBQztRQUNqQyxnQkFBVyxHQUFXLENBQUMsQ0FBQztRQUN4QixtQkFBYyxHQUFZLEtBQUssQ0FBQztRQUdwQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUM7SUFDbEQsQ0FBQztJQUVELDRCQUE0QjtJQUU1QixvQkFBb0IsQ0FBQyxRQUFnQixFQUFFLFFBQXNCO1FBQ3pELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsVUFBVTtRQUNOLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO1FBQzFELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUV0RCxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElB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QTBERiwwREFBMEQ7QUFFM0MseUJBQWUsR0FBRyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxBQUF4RSxDQUF5RTtBQWtRM0csMEJBQTBCO0FBRTFCLFNBQVMsbUJBQW1CLENBQUMsS0FBYTtJQUN0QyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDbEIsdUNBQXVDO0lBQ3ZDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxnRUFBZ0U7SUFDaEUsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLDRCQUE0QjtJQUM1QixLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDcEMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwQyxPQUFPLEtBQUssQ0FBQztBQUNqQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcclxuaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yLCBNQ1BTZXJ2ZXJTZXR0aW5ncyB9IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuY29uc3QgU0VSVkVSX0lORk8gPSB7XHJcbiAgICBuYW1lOiAnY29jb3MtbWNwLWV4dGVuc2lvbicsXHJcbiAgICB2ZXJzaW9uOiAnMS4wLjAnLFxyXG59O1xyXG5cclxuY29uc3QgUFJPVE9DT0xfVkVSU0lPTiA9ICcyMDI0LTExLTA1JztcclxuXHJcbmV4cG9ydCBjbGFzcyBNQ1BTZXJ2ZXIge1xyXG4gICAgcHJpdmF0ZSBodHRwU2VydmVyOiBodHRwLlNlcnZlciB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3M7XHJcbiAgICBwcml2YXRlIHRvb2xzOiBSZWNvcmQ8c3RyaW5nLCBUb29sRXhlY3V0b3I+ID0ge307XHJcbiAgICBwcml2YXRlIHRvb2xzTGlzdDogVG9vbERlZmluaXRpb25bXSA9IFtdO1xyXG4gICAgcHJpdmF0ZSBhY3Rpb25Db3VudDogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgZW5hYmxlRGVidWdMb2c6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XHJcbiAgICAgICAgdGhpcy5lbmFibGVEZWJ1Z0xvZyA9IHNldHRpbmdzLmVuYWJsZURlYnVnTG9nO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIFJlZ2lzdHJhdGlvbiA9PT1cclxuXHJcbiAgICByZWdpc3RlclRvb2xDYXRlZ29yeShjYXRlZ29yeTogc3RyaW5nLCBleGVjdXRvcjogVG9vbEV4ZWN1dG9yKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy50b29sc1tjYXRlZ29yeV0gPSBleGVjdXRvcjtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEJ1aWxkIGNvbnNvbGlkYXRlZCB0b29sIGxpc3Q6IG9uZSBNQ1AgdG9vbCBwZXIgY2F0ZWdvcnkgd2l0aCBhY3Rpb24gcGFyYW1ldGVyLlxyXG4gICAgICogQUkgc2VlcyAxMSB0b29scyBpbnN0ZWFkIG9mIDg3LCBzYXZpbmcgfjUwJSB0b2tlbnMgb24gdG9vbCBkZWZpbml0aW9ucy5cclxuICAgICAqIFBlci10b29sIHNldHRpbmdzIGZpbHRlciBpbmRpdmlkdWFsIGFjdGlvbnMgd2l0aGluIGVhY2ggY2F0ZWdvcnkuXHJcbiAgICAgKi9cclxuICAgIHNldHVwVG9vbHMoKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy50b29sc0xpc3QgPSBbXTtcclxuICAgICAgICB0aGlzLmFjdGlvbkNvdW50ID0gMDtcclxuICAgICAgICBjb25zdCBlbmFibGVkQ2F0cyA9IHRoaXMuc2V0dGluZ3MuZW5hYmxlZENhdGVnb3JpZXMgfHwge307XHJcbiAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xzID0gdGhpcy5zZXR0aW5ncy5lbmFibGVkVG9vbHMgfHwge307XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW2NhdGVnb3J5LCBleGVjdXRvcl0gb2YgT2JqZWN0LmVudHJpZXModGhpcy50b29scykpIHtcclxuICAgICAgICAgICAgLy8gU2tpcCBlbnRpcmVseSBkaXNhYmxlZCBjYXRlZ29yaWVzXHJcbiAgICAgICAgICAgIGlmIChlbmFibGVkQ2F0c1tjYXRlZ29yeV0gPT09IGZhbHNlKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFsbFRvb2xzID0gZXhlY3V0b3IuZ2V0VG9vbHMoKTtcclxuXHJcbiAgICAgICAgICAgIC8vIEZpbHRlciBieSBwZXItdG9vbCBzZXR0aW5nc1xyXG4gICAgICAgICAgICBjb25zdCBhY3RpdmVUb29scyA9IGFsbFRvb2xzLmZpbHRlcih0b29sID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxOYW1lID0gYCR7Y2F0ZWdvcnl9XyR7dG9vbC5uYW1lfWA7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZW5hYmxlZFRvb2xzW2Z1bGxOYW1lXSAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICAgICAgPyBlbmFibGVkVG9vbHNbZnVsbE5hbWVdXHJcbiAgICAgICAgICAgICAgICAgICAgOiB0cnVlOyAvLyBlbmFibGVkIGJ5IGRlZmF1bHQgd2l0aGluIGFuIGVuYWJsZWQgY2F0ZWdvcnlcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoYWN0aXZlVG9vbHMubGVuZ3RoID09PSAwKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWN0aW9uQ291bnQgKz0gYWN0aXZlVG9vbHMubGVuZ3RoO1xyXG5cclxuICAgICAgICAgICAgLy8gQnVpbGQgb25lIGNvbnNvbGlkYXRlZCBNQ1AgdG9vbCBwZXIgY2F0ZWdvcnlcclxuICAgICAgICAgICAgdGhpcy50b29sc0xpc3QucHVzaCh7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBjYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0aGlzLmJ1aWxkRGVzY3JpcHRpb24oY2F0ZWdvcnksIGFjdGl2ZVRvb2xzKSxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB0aGlzLmJ1aWxkU2NoZW1hKGFjdGl2ZVRvb2xzKSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxvZyhgVG9vbHMgcmVnaXN0ZXJlZDogJHt0aGlzLnRvb2xzTGlzdC5sZW5ndGh9IGNhdGVnb3JpZXMsICR7dGhpcy5hY3Rpb25Db3VudH0gYWN0aW9uc2ApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBDb25zb2xpZGF0ZWQgVG9vbCBEZXNjcmlwdGlvbiA9PT1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBDQVRFR09SWV9ERVNDUklQVElPTlM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAgICAgc2NlbmU6ICdTY2VuZSBtYW5hZ2VtZW50IChvcGVuLCBzYXZlLCBxdWVyeSBoaWVyYXJjaHksIGV0Yy4pJyxcclxuICAgICAgICBub2RlOiAnTm9kZS9HYW1lT2JqZWN0IG9wZXJhdGlvbnMgKGNyZWF0ZSwgZGVsZXRlLCB0cmFuc2Zvcm0sIGV0Yy4pJyxcclxuICAgICAgICBjb21wb25lbnQ6ICdDb21wb25lbnQgbWFuYWdlbWVudCAoYWRkLCByZW1vdmUsIHF1ZXJ5LCBzZXQgcHJvcGVydGllcywgZXRjLiknLFxyXG4gICAgICAgIGFzc2V0OiAnQXNzZXQgZGF0YWJhc2Ugb3BlcmF0aW9ucyAocXVlcnksIGNyZWF0ZSwgaW1wb3J0LCBkZXBlbmRlbmNpZXMsIGV0Yy4pJyxcclxuICAgICAgICBwcmVmYWI6ICdQcmVmYWIgb3BlcmF0aW9ucyAocXVlcnksIGxpc3QsIGluc3RhbnRpYXRlLCBjcmVhdGUsIHJlc3RvcmUpJyxcclxuICAgICAgICBwcm9qZWN0OiAnUHJvamVjdC1sZXZlbCBvcGVyYXRpb25zIChpbmZvLCBidWlsZCwgcHJldmlldywgY29uZmlnKScsXHJcbiAgICAgICAgZGVidWc6ICdEZWJ1Z2dpbmcgdXRpbGl0aWVzIChsb2dzLCBzY3JpcHQgZXhlY3V0aW9uKScsXHJcbiAgICAgICAgc2NlbmVfdmlldzogJ1NjZW5lIHZpZXcgY29udHJvbHMgKGdpem1vLCBjYW1lcmEsIGdyaWQsIHZpZXcgbW9kZSknLFxyXG4gICAgICAgIGVkaXRvcjogJ0VkaXRvciBlbnZpcm9ubWVudCAocHJlZmVyZW5jZXMsIGluZm8sIGRldmljZXMpJyxcclxuICAgICAgICByZWZlcmVuY2VfaW1hZ2U6ICdSZWZlcmVuY2UgaW1hZ2Ugb3ZlcmxheSBtYW5hZ2VtZW50JyxcclxuICAgICAgICBhbmltYXRpb246ICdBbmltYXRpb24gcGxheWJhY2sgY29udHJvbCcsXHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgYnVpbGREZXNjcmlwdGlvbihjYXRlZ29yeTogc3RyaW5nLCB0b29sczogVG9vbERlZmluaXRpb25bXSk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgY2F0RGVzYyA9IE1DUFNlcnZlci5DQVRFR09SWV9ERVNDUklQVElPTlNbY2F0ZWdvcnldIHx8IGNhdGVnb3J5O1xyXG4gICAgICAgIGxldCBkZXNjID0gYCR7Y2F0RGVzY31cXG5cXG5BY3Rpb25zOlxcbmA7XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiB0b29scykge1xyXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB0aGlzLmZvcm1hdEFjdGlvblBhcmFtcyh0b29sLmlucHV0U2NoZW1hKTtcclxuICAgICAgICAgICAgZGVzYyArPSBwYXJhbXNcclxuICAgICAgICAgICAgICAgID8gYC0gJHt0b29sLm5hbWV9OiAke3Rvb2wuZGVzY3JpcHRpb259ICgke3BhcmFtc30pXFxuYFxyXG4gICAgICAgICAgICAgICAgOiBgLSAke3Rvb2wubmFtZX06ICR7dG9vbC5kZXNjcmlwdGlvbn1cXG5gO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGRlc2MudHJpbSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZm9ybWF0QWN0aW9uUGFyYW1zKHNjaGVtYTogVG9vbERlZmluaXRpb25bJ2lucHV0U2NoZW1hJ10pOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IHByb3BzID0gc2NoZW1hLnByb3BlcnRpZXMgfHwge307XHJcbiAgICAgICAgY29uc3QgcmVxdWlyZWQgPSBzY2hlbWEucmVxdWlyZWQgfHwgW107XHJcblxyXG4gICAgICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgW25hbWUsIGRlZl0gb2YgT2JqZWN0LmVudHJpZXMocHJvcHMpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVxID0gcmVxdWlyZWQuaW5jbHVkZXMobmFtZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBkZWYudHlwZSB8fCAnYW55JztcclxuICAgICAgICAgICAgcGFydHMucHVzaChgJHtuYW1lfSR7aXNSZXEgPyAnJyA6ICc/J306ICR7dHlwZX1gKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBwYXJ0cy5qb2luKCcsICcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBDb25zb2xpZGF0ZWQgVG9vbCBTY2hlbWEgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZFNjaGVtYSh0b29sczogVG9vbERlZmluaXRpb25bXSk6IFRvb2xEZWZpbml0aW9uWydpbnB1dFNjaGVtYSddIHtcclxuICAgICAgICBjb25zdCBhY3Rpb25FbnVtID0gdG9vbHMubWFwKHQgPT4gdC5uYW1lKTtcclxuICAgICAgICBjb25zdCBtZXJnZWRQcm9wczogUmVjb3JkPHN0cmluZywgYW55PiA9IHtcclxuICAgICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgIGVudW06IGFjdGlvbkVudW0sXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0b29sIG9mIHRvb2xzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gdG9vbC5pbnB1dFNjaGVtYS5wcm9wZXJ0aWVzIHx8IHt9O1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtwcm9wTmFtZSwgcHJvcERlZl0gb2YgT2JqZWN0LmVudHJpZXMocHJvcHMpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIW1lcmdlZFByb3BzW3Byb3BOYW1lXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lcmdlZFByb3BzW3Byb3BOYW1lXSA9IHsgLi4ucHJvcERlZiB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgcHJvcGVydGllczogbWVyZ2VkUHJvcHMsXHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFRvb2wgSW5mbyBmb3IgUGFuZWwgVUkgKHBlci1hY3Rpb24gZ3JhbnVsYXJpdHkpID09PVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIENPUkVfQ0FURUdPUklFUyA9IFsnc2NlbmUnLCAnbm9kZScsICdjb21wb25lbnQnLCAnYXNzZXQnLCAncHJlZmFiJywgJ3Byb2plY3QnLCAnZGVidWcnXTtcclxuXHJcbiAgICBnZXRBbGxUb29sc0luZm8oKTogeyBjYXRlZ29yeTogc3RyaW5nOyBpc0NvcmU6IGJvb2xlYW47IHRvb2xzOiB7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb246IHN0cmluZzsgZW5hYmxlZDogYm9vbGVhbiB9W10gfVtdIHtcclxuICAgICAgICBjb25zdCBlbmFibGVkQ2F0cyA9IHRoaXMuc2V0dGluZ3MuZW5hYmxlZENhdGVnb3JpZXMgfHwge307XHJcbiAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xzID0gdGhpcy5zZXR0aW5ncy5lbmFibGVkVG9vbHMgfHwge307XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKHRoaXMudG9vbHMpLm1hcCgoW2NhdGVnb3J5LCBleGVjdXRvcl0pID0+ICh7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5LFxyXG4gICAgICAgICAgICBpc0NvcmU6IE1DUFNlcnZlci5DT1JFX0NBVEVHT1JJRVMuaW5jbHVkZXMoY2F0ZWdvcnkpLFxyXG4gICAgICAgICAgICB0b29sczogZXhlY3V0b3IuZ2V0VG9vbHMoKS5tYXAodG9vbCA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmdWxsTmFtZSA9IGAke2NhdGVnb3J5fV8ke3Rvb2wubmFtZX1gO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5hYmxlZCA9IGVuYWJsZWRUb29sc1tmdWxsTmFtZV0gIT09IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgICAgID8gZW5hYmxlZFRvb2xzW2Z1bGxOYW1lXVxyXG4gICAgICAgICAgICAgICAgICAgIDogZW5hYmxlZENhdHNbY2F0ZWdvcnldICE9PSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IGZ1bGxOYW1lLCBkZXNjcmlwdGlvbjogdG9vbC5kZXNjcmlwdGlvbiwgZW5hYmxlZCB9O1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFNlcnZlciBMaWZlY3ljbGUgPT09XHJcblxyXG4gICAgc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldHVwVG9vbHMoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKHRoaXMuaGFuZGxlSHR0cFJlcXVlc3QuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIub24oJ2Vycm9yJywgKGVycjogTm9kZUpTLkVycm5vRXhjZXB0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT09ICdFQUREUklOVVNFJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtNQ1BdIFBvcnQgJHt0aGlzLnNldHRpbmdzLnBvcnR9IGlzIGFscmVhZHkgaW4gdXNlYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBQb3J0ICR7dGhpcy5zZXR0aW5ncy5wb3J0fSBpcyBhbHJlYWR5IGluIHVzZWApKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01DUF0gU2VydmVyIGVycm9yOicsIGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmxpc3Rlbih0aGlzLnNldHRpbmdzLnBvcnQsICcxMjcuMC4wLjEnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01DUF0gU2VydmVyIHN0YXJ0ZWQgb24gaHR0cDovLzEyNy4wLjAuMToke3RoaXMuc2V0dGluZ3MucG9ydH0vbWNwYCk7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHN0b3AoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xyXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIuY2xvc2UoKTtcclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gbnVsbDtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BdIFNlcnZlciBzdG9wcGVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlzUnVubmluZygpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5odHRwU2VydmVyICE9PSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFRvb2xDb3VudCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdC5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0QWN0aW9uQ291bnQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hY3Rpb25Db3VudDtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XHJcbiAgICAgICAgdGhpcy5lbmFibGVEZWJ1Z0xvZyA9IHNldHRpbmdzLmVuYWJsZURlYnVnTG9nO1xyXG4gICAgICAgIC8vIFJlYnVpbGQgdG9vbCBsaXN0IHdoZW4gY2F0ZWdvcmllcyBjaGFuZ2VcclxuICAgICAgICB0aGlzLnNldHVwVG9vbHMoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSFRUUCBSZXF1ZXN0IEhhbmRsaW5nID09PVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSHR0cFJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XHJcbiAgICAgICAgLy8gQ09SUyBoZWFkZXJzXHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ0dFVCwgUE9TVCwgT1BUSU9OUycpO1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uJyk7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuXHJcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xyXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybCB8fCAnJztcclxuXHJcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIHVybCA9PT0gJy9oZWFsdGgnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlSGVhbHRoKHJlcyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcgJiYgdXJsID09PSAnL21jcCcpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVNQ1AocmVxLCByZXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0KTtcclxuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTm90IGZvdW5kJyB9KSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSGVhbHRoKHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xyXG4gICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgc3RhdHVzOiAnb2snLFxyXG4gICAgICAgICAgICB0b29sczogdGhpcy50b29sc0xpc3QubGVuZ3RoLFxyXG4gICAgICAgICAgICBhY3Rpb25zOiB0aGlzLmFjdGlvbkNvdW50LFxyXG4gICAgICAgICAgICBzZXJ2ZXI6IFNFUlZFUl9JTkZPLFxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZU1DUChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcclxuICAgICAgICBsZXQgYm9keSA9ICcnO1xyXG4gICAgICAgIHJlcS5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiB7IGJvZHkgKz0gY2h1bmsudG9TdHJpbmcoKTsgfSk7XHJcbiAgICAgICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZTogYW55O1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShib2R5KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSBmaXhpbmcgY29tbW9uIEpTT04gaXNzdWVzIGZyb20gQUkgY2xpZW50c1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGZpeENvbW1vbkpzb25Jc3N1ZXMoYm9keSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjcwMCwgbWVzc2FnZTogJ1BhcnNlIGVycm9yJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShyZXN1bHQpKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjYwMywgbWVzc2FnZTogZXJyLm1lc3NhZ2UgfSxcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBKU09OLVJQQyAyLjAgTWVzc2FnZSBIYW5kbGluZyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZU1lc3NhZ2UobWVzc2FnZTogYW55KTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICBjb25zdCB7IGlkLCBtZXRob2QsIHBhcmFtcyB9ID0gbWVzc2FnZTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2coYFtNQ1BdIOKGkiAke21ldGhvZH1gKTtcclxuXHJcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcclxuICAgICAgICAgICAgY2FzZSAnaW5pdGlhbGl6ZSc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbFZlcnNpb246IFBST1RPQ09MX1ZFUlNJT04sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcGFiaWxpdGllczogeyB0b29sczoge30gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVySW5mbzogU0VSVkVSX0lORk8sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICdub3RpZmljYXRpb25zL2luaXRpYWxpemVkJzpcclxuICAgICAgICAgICAgICAgIC8vIENsaWVudCBub3RpZmljYXRpb24sIG5vIHJlc3BvbnNlIG5lZWRlZFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsganNvbnJwYzogJzIuMCcsIGlkLCByZXN1bHQ6IHt9IH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICd0b29scy9saXN0JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xzOiB0aGlzLnRvb2xzTGlzdC5tYXAodCA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogdC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHQuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogdC5pbnB1dFNjaGVtYSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAndG9vbHMvY2FsbCc6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2xOYW1lID0gcGFyYW1zPy5uYW1lO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXJncyA9IHBhcmFtcz8uYXJndW1lbnRzIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghdG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjYwMiwgbWVzc2FnZTogJ01pc3NpbmcgdG9vbCBuYW1lJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVUb29sQ2FsbCh0b29sTmFtZSwgYXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7IHR5cGU6ICd0ZXh0JywgdGV4dDogSlNPTi5zdHJpbmdpZnkocmVzdWx0KSB9XSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSkgfV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0Vycm9yOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjYwMSwgbWVzc2FnZTogYFVua25vd24gbWV0aG9kOiAke21ldGhvZH1gIH0sXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gVG9vbCBFeGVjdXRpb24gPT09XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlVG9vbENhbGwodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICAvLyBDb25zb2xpZGF0ZWQgYXBwcm9hY2g6IHRvb2wgbmFtZSA9IGNhdGVnb3J5LCBhY3Rpb24gaW4gYXJnc1xyXG4gICAgICAgIGNvbnN0IGV4ZWN1dG9yID0gdGhpcy50b29sc1t0b29sTmFtZV07XHJcbiAgICAgICAgaWYgKCFleGVjdXRvcikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IGFyZ3M/LmFjdGlvbjtcclxuICAgICAgICBpZiAoIWFjdGlvbikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgXCJhY3Rpb25cIiBwYXJhbWV0ZXIgZm9yIHRvb2wgXCIke3Rvb2xOYW1lfVwiLiBDaGVjayBhdmFpbGFibGUgYWN0aW9ucyBpbiB0aGUgdG9vbCBkZXNjcmlwdGlvbi5gKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubG9nKGBbTUNQXSBFeGVjdXRpbmc6ICR7dG9vbE5hbWV9LiR7YWN0aW9ufWApO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUoYWN0aW9uLCBhcmdzKTtcclxuICAgICAgICB0aGlzLmxvZyhgW01DUF0gUmVzdWx0OiAke3Jlc3VsdC5zdWNjZXNzID8gJ09LJyA6ICdGQUlMJ31gKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gTG9nZ2luZyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGxvZyhtc2c6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLmVuYWJsZURlYnVnTG9nKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1zZyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vLyA9PT0gSlNPTiBGaXggSGVscGVyID09PVxyXG5cclxuZnVuY3Rpb24gZml4Q29tbW9uSnNvbklzc3VlcyhpbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGxldCBmaXhlZCA9IGlucHV0O1xyXG4gICAgLy8gUmVtb3ZlIHRyYWlsaW5nIGNvbW1hcyBiZWZvcmUgfSBvciBdXHJcbiAgICBmaXhlZCA9IGZpeGVkLnJlcGxhY2UoLyxcXHMqKFt9XFxdXSkvZywgJyQxJyk7XHJcbiAgICAvLyBSZXBsYWNlIHNpbmdsZSBxdW90ZXMgd2l0aCBkb3VibGUgcXVvdGVzIChvdXRzaWRlIG9mIHN0cmluZ3MpXHJcbiAgICBmaXhlZCA9IGZpeGVkLnJlcGxhY2UoLycvZywgJ1wiJyk7XHJcbiAgICAvLyBFc2NhcGUgdW5lc2NhcGVkIG5ld2xpbmVzXHJcbiAgICBmaXhlZCA9IGZpeGVkLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKTtcclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvXFxyL2csICdcXFxccicpO1xyXG4gICAgZml4ZWQgPSBmaXhlZC5yZXBsYWNlKC9cXHQvZywgJ1xcXFx0Jyk7XHJcbiAgICByZXR1cm4gZml4ZWQ7XHJcbn1cclxuIl19