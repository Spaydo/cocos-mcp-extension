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
        // Validate arguments against schema
        this.validateArgs(toolName, action, args);
        this.log(`[MCP] Executing: ${toolName}.${action}`);
        const result = await executor.execute(action, args);
        this.log(`[MCP] Result: ${result.success ? 'OK' : 'FAIL'}`);
        // Auto-refresh editor after write operations
        await this.autoRefresh(toolName, action, result);
        return result;
    }
    /**
     * Validate tool arguments against the tool's inputSchema.
     * Throws descriptive errors for invalid action, missing required params, or type mismatches.
     */
    validateArgs(category, action, args) {
        const executor = this.tools[category];
        const allTools = executor.getTools();
        const toolNames = allTools.map(t => t.name);
        // 1. Validate action is in the allowed list
        if (!toolNames.includes(action)) {
            throw new Error(`Invalid action '${action}' for tool '${category}'. Available actions: ${toolNames.join(', ')}`);
        }
        // 2. Find matching tool definition
        const toolDef = allTools.find(t => t.name === action);
        const schema = toolDef.inputSchema;
        const properties = schema.properties || {};
        const required = schema.required || [];
        // 3. Check required parameters
        const missing = [];
        for (const paramName of required) {
            if (args[paramName] === undefined || args[paramName] === null) {
                missing.push(paramName);
            }
        }
        if (missing.length > 0) {
            const paramList = Object.entries(properties)
                .map(([name, def]) => {
                const isReq = required.includes(name);
                return `${name}${isReq ? '' : '?'} (${def.type || 'any'})`;
            })
                .join(', ');
            throw new Error(`Missing required parameter${missing.length > 1 ? 's' : ''} '${missing.join("', '")}' for action '${category}.${action}'. Expected parameters: ${paramList}`);
        }
        // 4. Type-check provided parameters
        for (const [paramName, paramDef] of Object.entries(properties)) {
            const value = args[paramName];
            if (value === undefined || value === null)
                continue;
            const expectedType = paramDef.type;
            if (!expectedType)
                continue;
            let valid = true;
            switch (expectedType) {
                case 'string':
                    valid = typeof value === 'string';
                    break;
                case 'number':
                    valid = typeof value === 'number';
                    break;
                case 'boolean':
                    valid = typeof value === 'boolean';
                    break;
                case 'object':
                    valid = typeof value === 'object' && !Array.isArray(value);
                    break;
                case 'array':
                    valid = Array.isArray(value);
                    break;
            }
            if (!valid) {
                throw new Error(`Type mismatch for parameter '${paramName}' in action '${category}.${action}': expected ${expectedType}, got ${Array.isArray(value) ? 'array' : typeof value}`);
            }
        }
    }
    /**
     * Automatically refresh the editor after a successful write operation.
     * Uses REFRESH_MAP to determine refresh type. Never throws — refresh
     * failures are reported as warnings, not errors.
     */
    async autoRefresh(toolName, action, result) {
        const key = `${toolName}.${action}`;
        const refreshType = MCPServer.REFRESH_MAP[key];
        if (!refreshType || !result.success)
            return;
        try {
            if (refreshType === 'scene') {
                await Editor.Message.request('scene', 'soft-reload');
            }
            else if (refreshType === 'asset') {
                await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets');
            }
            result.refreshed = refreshType;
            this.log(`[MCP] Auto-refreshed: ${refreshType}`);
        }
        catch (err) {
            result.refreshWarning = `Auto-refresh failed: ${err.message}`;
            this.log(`[MCP] Auto-refresh warning: ${err.message}`);
        }
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
    validation: 'Scene validation and health checking',
};
MCPServer.REFRESH_MAP = {
    // Node operations
    'node.create': 'scene',
    'node.delete': 'scene',
    'node.set_property': 'scene',
    'node.duplicate': 'scene',
    'node.reset_transform': 'scene',
    'node.move': 'scene',
    // Component operations
    'component.add': 'scene',
    'component.remove': 'scene',
    'component.set_property': 'scene',
    'component.reset': 'scene',
    'component.execute_method': 'scene',
    // Animation operations
    'animation.play': 'scene',
    'animation.stop': 'scene',
    'animation.set_clip': 'scene',
    // Debug (script execution may modify scene)
    'debug.execute_script': 'scene',
    // Prefab operations (scene)
    'prefab.instantiate': 'scene',
    'prefab.restore': 'scene',
    // Asset operations
    'asset.create': 'asset',
    'asset.delete': 'asset',
    'asset.move': 'asset',
    'asset.import': 'asset',
    'asset.copy': 'asset',
    'asset.save': 'asset',
    'asset.reimport': 'asset',
    // Prefab operations (asset)
    'prefab.create': 'asset',
    'prefab.create_empty': 'asset',
    // Scene operations
    'scene.create': 'asset',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUc3QixNQUFNLFdBQVcsR0FBRztJQUNoQixJQUFJLEVBQUUscUJBQXFCO0lBQzNCLE9BQU8sRUFBRSxPQUFPO0NBQ25CLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQztBQUV0QyxNQUFhLFNBQVM7SUFRbEIsWUFBWSxRQUEyQjtRQVAvQixlQUFVLEdBQXVCLElBQUksQ0FBQztRQUV0QyxVQUFLLEdBQWlDLEVBQUUsQ0FBQztRQUN6QyxjQUFTLEdBQXFCLEVBQUUsQ0FBQztRQUNqQyxnQkFBVyxHQUFXLENBQUMsQ0FBQztRQUN4QixtQkFBYyxHQUFZLEtBQUssQ0FBQztRQUdwQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUM7SUFDbEQsQ0FBQztJQUVELDRCQUE0QjtJQUU1QixvQkFBb0IsQ0FBQyxRQUFnQixFQUFFLFFBQXNCO1FBQ3pELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsVUFBVTtRQUNOLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO1FBQzFELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUV0RCxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElB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QyxDQUFDO0lBQ3BDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDcEMsT0FBTyxLQUFLLENBQUM7QUFDakIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XHJcbmltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciwgTUNQU2VydmVyU2V0dGluZ3MgfSBmcm9tICcuL3R5cGVzJztcclxuXHJcbmNvbnN0IFNFUlZFUl9JTkZPID0ge1xyXG4gICAgbmFtZTogJ2NvY29zLW1jcC1leHRlbnNpb24nLFxyXG4gICAgdmVyc2lvbjogJzEuMC4wJyxcclxufTtcclxuXHJcbmNvbnN0IFBST1RPQ09MX1ZFUlNJT04gPSAnMjAyNC0xMS0wNSc7XHJcblxyXG5leHBvcnQgY2xhc3MgTUNQU2VydmVyIHtcclxuICAgIHByaXZhdGUgaHR0cFNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcclxuICAgIHByaXZhdGUgc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzO1xyXG4gICAgcHJpdmF0ZSB0b29sczogUmVjb3JkPHN0cmluZywgVG9vbEV4ZWN1dG9yPiA9IHt9O1xyXG4gICAgcHJpdmF0ZSB0b29sc0xpc3Q6IFRvb2xEZWZpbml0aW9uW10gPSBbXTtcclxuICAgIHByaXZhdGUgYWN0aW9uQ291bnQ6IG51bWJlciA9IDA7XHJcbiAgICBwcml2YXRlIGVuYWJsZURlYnVnTG9nOiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xyXG4gICAgICAgIHRoaXMuZW5hYmxlRGVidWdMb2cgPSBzZXR0aW5ncy5lbmFibGVEZWJ1Z0xvZztcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gVG9vbCBSZWdpc3RyYXRpb24gPT09XHJcblxyXG4gICAgcmVnaXN0ZXJUb29sQ2F0ZWdvcnkoY2F0ZWdvcnk6IHN0cmluZywgZXhlY3V0b3I6IFRvb2xFeGVjdXRvcik6IHZvaWQge1xyXG4gICAgICAgIHRoaXMudG9vbHNbY2F0ZWdvcnldID0gZXhlY3V0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCdWlsZCBjb25zb2xpZGF0ZWQgdG9vbCBsaXN0OiBvbmUgTUNQIHRvb2wgcGVyIGNhdGVnb3J5IHdpdGggYWN0aW9uIHBhcmFtZXRlci5cclxuICAgICAqIEFJIHNlZXMgMTEgdG9vbHMgaW5zdGVhZCBvZiA4Nywgc2F2aW5nIH41MCUgdG9rZW5zIG9uIHRvb2wgZGVmaW5pdGlvbnMuXHJcbiAgICAgKiBQZXItdG9vbCBzZXR0aW5ncyBmaWx0ZXIgaW5kaXZpZHVhbCBhY3Rpb25zIHdpdGhpbiBlYWNoIGNhdGVnb3J5LlxyXG4gICAgICovXHJcbiAgICBzZXR1cFRvb2xzKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMudG9vbHNMaXN0ID0gW107XHJcbiAgICAgICAgdGhpcy5hY3Rpb25Db3VudCA9IDA7XHJcbiAgICAgICAgY29uc3QgZW5hYmxlZENhdHMgPSB0aGlzLnNldHRpbmdzLmVuYWJsZWRDYXRlZ29yaWVzIHx8IHt9O1xyXG4gICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRoaXMuc2V0dGluZ3MuZW5hYmxlZFRvb2xzIHx8IHt9O1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFtjYXRlZ29yeSwgZXhlY3V0b3JdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMudG9vbHMpKSB7XHJcbiAgICAgICAgICAgIC8vIFNraXAgZW50aXJlbHkgZGlzYWJsZWQgY2F0ZWdvcmllc1xyXG4gICAgICAgICAgICBpZiAoZW5hYmxlZENhdHNbY2F0ZWdvcnldID09PSBmYWxzZSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhbGxUb29scyA9IGV4ZWN1dG9yLmdldFRvb2xzKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBGaWx0ZXIgYnkgcGVyLXRvb2wgc2V0dGluZ3NcclxuICAgICAgICAgICAgY29uc3QgYWN0aXZlVG9vbHMgPSBhbGxUb29scy5maWx0ZXIodG9vbCA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmdWxsTmFtZSA9IGAke2NhdGVnb3J5fV8ke3Rvb2wubmFtZX1gO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVuYWJsZWRUb29sc1tmdWxsTmFtZV0gIT09IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgICAgID8gZW5hYmxlZFRvb2xzW2Z1bGxOYW1lXVxyXG4gICAgICAgICAgICAgICAgICAgIDogdHJ1ZTsgLy8gZW5hYmxlZCBieSBkZWZhdWx0IHdpdGhpbiBhbiBlbmFibGVkIGNhdGVnb3J5XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFjdGl2ZVRvb2xzLmxlbmd0aCA9PT0gMCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFjdGlvbkNvdW50ICs9IGFjdGl2ZVRvb2xzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIC8vIEJ1aWxkIG9uZSBjb25zb2xpZGF0ZWQgTUNQIHRvb2wgcGVyIGNhdGVnb3J5XHJcbiAgICAgICAgICAgIHRoaXMudG9vbHNMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdGhpcy5idWlsZERlc2NyaXB0aW9uKGNhdGVnb3J5LCBhY3RpdmVUb29scyksXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogdGhpcy5idWlsZFNjaGVtYShhY3RpdmVUb29scyksXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sb2coYFRvb2xzIHJlZ2lzdGVyZWQ6ICR7dGhpcy50b29sc0xpc3QubGVuZ3RofSBjYXRlZ29yaWVzLCAke3RoaXMuYWN0aW9uQ291bnR9IGFjdGlvbnNgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gQ29uc29saWRhdGVkIFRvb2wgRGVzY3JpcHRpb24gPT09XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgQ0FURUdPUllfREVTQ1JJUFRJT05TOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgIHNjZW5lOiAnU2NlbmUgbWFuYWdlbWVudCAob3Blbiwgc2F2ZSwgcXVlcnkgaGllcmFyY2h5LCBldGMuKScsXHJcbiAgICAgICAgbm9kZTogJ05vZGUvR2FtZU9iamVjdCBvcGVyYXRpb25zIChjcmVhdGUsIGRlbGV0ZSwgdHJhbnNmb3JtLCBldGMuKScsXHJcbiAgICAgICAgY29tcG9uZW50OiAnQ29tcG9uZW50IG1hbmFnZW1lbnQgKGFkZCwgcmVtb3ZlLCBxdWVyeSwgc2V0IHByb3BlcnRpZXMsIGV0Yy4pJyxcclxuICAgICAgICBhc3NldDogJ0Fzc2V0IGRhdGFiYXNlIG9wZXJhdGlvbnMgKHF1ZXJ5LCBjcmVhdGUsIGltcG9ydCwgZGVwZW5kZW5jaWVzLCBldGMuKScsXHJcbiAgICAgICAgcHJlZmFiOiAnUHJlZmFiIG9wZXJhdGlvbnMgKHF1ZXJ5LCBsaXN0LCBpbnN0YW50aWF0ZSwgY3JlYXRlLCByZXN0b3JlKScsXHJcbiAgICAgICAgcHJvamVjdDogJ1Byb2plY3QtbGV2ZWwgb3BlcmF0aW9ucyAoaW5mbywgYnVpbGQsIHByZXZpZXcsIGNvbmZpZyknLFxyXG4gICAgICAgIGRlYnVnOiAnRGVidWdnaW5nIHV0aWxpdGllcyAobG9ncywgc2NyaXB0IGV4ZWN1dGlvbiknLFxyXG4gICAgICAgIHNjZW5lX3ZpZXc6ICdTY2VuZSB2aWV3IGNvbnRyb2xzIChnaXptbywgY2FtZXJhLCBncmlkLCB2aWV3IG1vZGUpJyxcclxuICAgICAgICBlZGl0b3I6ICdFZGl0b3IgZW52aXJvbm1lbnQgKHByZWZlcmVuY2VzLCBpbmZvLCBkZXZpY2VzKScsXHJcbiAgICAgICAgcmVmZXJlbmNlX2ltYWdlOiAnUmVmZXJlbmNlIGltYWdlIG92ZXJsYXkgbWFuYWdlbWVudCcsXHJcbiAgICAgICAgYW5pbWF0aW9uOiAnQW5pbWF0aW9uIHBsYXliYWNrIGNvbnRyb2wnLFxyXG4gICAgICAgIHZhbGlkYXRpb246ICdTY2VuZSB2YWxpZGF0aW9uIGFuZCBoZWFsdGggY2hlY2tpbmcnLFxyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBSRUZSRVNIX01BUDogUmVjb3JkPHN0cmluZywgJ3NjZW5lJyB8ICdhc3NldCc+ID0ge1xyXG4gICAgICAgIC8vIE5vZGUgb3BlcmF0aW9uc1xyXG4gICAgICAgICdub2RlLmNyZWF0ZSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ25vZGUuZGVsZXRlJzogJ3NjZW5lJyxcclxuICAgICAgICAnbm9kZS5zZXRfcHJvcGVydHknOiAnc2NlbmUnLFxyXG4gICAgICAgICdub2RlLmR1cGxpY2F0ZSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ25vZGUucmVzZXRfdHJhbnNmb3JtJzogJ3NjZW5lJyxcclxuICAgICAgICAnbm9kZS5tb3ZlJzogJ3NjZW5lJyxcclxuXHJcbiAgICAgICAgLy8gQ29tcG9uZW50IG9wZXJhdGlvbnNcclxuICAgICAgICAnY29tcG9uZW50LmFkZCc6ICdzY2VuZScsXHJcbiAgICAgICAgJ2NvbXBvbmVudC5yZW1vdmUnOiAnc2NlbmUnLFxyXG4gICAgICAgICdjb21wb25lbnQuc2V0X3Byb3BlcnR5JzogJ3NjZW5lJyxcclxuICAgICAgICAnY29tcG9uZW50LnJlc2V0JzogJ3NjZW5lJyxcclxuICAgICAgICAnY29tcG9uZW50LmV4ZWN1dGVfbWV0aG9kJzogJ3NjZW5lJyxcclxuXHJcbiAgICAgICAgLy8gQW5pbWF0aW9uIG9wZXJhdGlvbnNcclxuICAgICAgICAnYW5pbWF0aW9uLnBsYXknOiAnc2NlbmUnLFxyXG4gICAgICAgICdhbmltYXRpb24uc3RvcCc6ICdzY2VuZScsXHJcbiAgICAgICAgJ2FuaW1hdGlvbi5zZXRfY2xpcCc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIERlYnVnIChzY3JpcHQgZXhlY3V0aW9uIG1heSBtb2RpZnkgc2NlbmUpXHJcbiAgICAgICAgJ2RlYnVnLmV4ZWN1dGVfc2NyaXB0JzogJ3NjZW5lJyxcclxuXHJcbiAgICAgICAgLy8gUHJlZmFiIG9wZXJhdGlvbnMgKHNjZW5lKVxyXG4gICAgICAgICdwcmVmYWIuaW5zdGFudGlhdGUnOiAnc2NlbmUnLFxyXG4gICAgICAgICdwcmVmYWIucmVzdG9yZSc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIEFzc2V0IG9wZXJhdGlvbnNcclxuICAgICAgICAnYXNzZXQuY3JlYXRlJzogJ2Fzc2V0JyxcclxuICAgICAgICAnYXNzZXQuZGVsZXRlJzogJ2Fzc2V0JyxcclxuICAgICAgICAnYXNzZXQubW92ZSc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0LmltcG9ydCc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0LmNvcHknOiAnYXNzZXQnLFxyXG4gICAgICAgICdhc3NldC5zYXZlJzogJ2Fzc2V0JyxcclxuICAgICAgICAnYXNzZXQucmVpbXBvcnQnOiAnYXNzZXQnLFxyXG5cclxuICAgICAgICAvLyBQcmVmYWIgb3BlcmF0aW9ucyAoYXNzZXQpXHJcbiAgICAgICAgJ3ByZWZhYi5jcmVhdGUnOiAnYXNzZXQnLFxyXG4gICAgICAgICdwcmVmYWIuY3JlYXRlX2VtcHR5JzogJ2Fzc2V0JyxcclxuXHJcbiAgICAgICAgLy8gU2NlbmUgb3BlcmF0aW9uc1xyXG4gICAgICAgICdzY2VuZS5jcmVhdGUnOiAnYXNzZXQnLFxyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIGJ1aWxkRGVzY3JpcHRpb24oY2F0ZWdvcnk6IHN0cmluZywgdG9vbHM6IFRvb2xEZWZpbml0aW9uW10pOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IGNhdERlc2MgPSBNQ1BTZXJ2ZXIuQ0FURUdPUllfREVTQ1JJUFRJT05TW2NhdGVnb3J5XSB8fCBjYXRlZ29yeTtcclxuICAgICAgICBsZXQgZGVzYyA9IGAke2NhdERlc2N9XFxuXFxuQWN0aW9uczpcXG5gO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5mb3JtYXRBY3Rpb25QYXJhbXModG9vbC5pbnB1dFNjaGVtYSk7XHJcbiAgICAgICAgICAgIGRlc2MgKz0gcGFyYW1zXHJcbiAgICAgICAgICAgICAgICA/IGAtICR7dG9vbC5uYW1lfTogJHt0b29sLmRlc2NyaXB0aW9ufSAoJHtwYXJhbXN9KVxcbmBcclxuICAgICAgICAgICAgICAgIDogYC0gJHt0b29sLm5hbWV9OiAke3Rvb2wuZGVzY3JpcHRpb259XFxuYDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBkZXNjLnRyaW0oKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZvcm1hdEFjdGlvblBhcmFtcyhzY2hlbWE6IFRvb2xEZWZpbml0aW9uWydpbnB1dFNjaGVtYSddKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBwcm9wcyA9IHNjaGVtYS5wcm9wZXJ0aWVzIHx8IHt9O1xyXG4gICAgICAgIGNvbnN0IHJlcXVpcmVkID0gc2NoZW1hLnJlcXVpcmVkIHx8IFtdO1xyXG5cclxuICAgICAgICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IFtuYW1lLCBkZWZdIG9mIE9iamVjdC5lbnRyaWVzKHByb3BzKSkge1xyXG4gICAgICAgICAgICBjb25zdCBpc1JlcSA9IHJlcXVpcmVkLmluY2x1ZGVzKG5hbWUpO1xyXG4gICAgICAgICAgICBjb25zdCB0eXBlID0gZGVmLnR5cGUgfHwgJ2FueSc7XHJcbiAgICAgICAgICAgIHBhcnRzLnB1c2goYCR7bmFtZX0ke2lzUmVxID8gJycgOiAnPyd9OiAke3R5cGV9YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcGFydHMuam9pbignLCAnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gQ29uc29saWRhdGVkIFRvb2wgU2NoZW1hID09PVxyXG5cclxuICAgIHByaXZhdGUgYnVpbGRTY2hlbWEodG9vbHM6IFRvb2xEZWZpbml0aW9uW10pOiBUb29sRGVmaW5pdGlvblsnaW5wdXRTY2hlbWEnXSB7XHJcbiAgICAgICAgY29uc3QgYWN0aW9uRW51bSA9IHRvb2xzLm1hcCh0ID0+IHQubmFtZSk7XHJcbiAgICAgICAgY29uc3QgbWVyZ2VkUHJvcHM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICAgICAgIGFjdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICBlbnVtOiBhY3Rpb25FbnVtLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiB0b29scykge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IHRvb2wuaW5wdXRTY2hlbWEucHJvcGVydGllcyB8fCB7fTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBbcHJvcE5hbWUsIHByb3BEZWZdIG9mIE9iamVjdC5lbnRyaWVzKHByb3BzKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFtZXJnZWRQcm9wc1twcm9wTmFtZV0pIHtcclxuICAgICAgICAgICAgICAgICAgICBtZXJnZWRQcm9wc1twcm9wTmFtZV0gPSB7IC4uLnByb3BEZWYgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IG1lcmdlZFByb3BzLFxyXG4gICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIEluZm8gZm9yIFBhbmVsIFVJIChwZXItYWN0aW9uIGdyYW51bGFyaXR5KSA9PT1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBDT1JFX0NBVEVHT1JJRVMgPSBbJ3NjZW5lJywgJ25vZGUnLCAnY29tcG9uZW50JywgJ2Fzc2V0JywgJ3ByZWZhYicsICdwcm9qZWN0JywgJ2RlYnVnJ107XHJcblxyXG4gICAgZ2V0QWxsVG9vbHNJbmZvKCk6IHsgY2F0ZWdvcnk6IHN0cmluZzsgaXNDb3JlOiBib29sZWFuOyB0b29sczogeyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uOiBzdHJpbmc7IGVuYWJsZWQ6IGJvb2xlYW4gfVtdIH1bXSB7XHJcbiAgICAgICAgY29uc3QgZW5hYmxlZENhdHMgPSB0aGlzLnNldHRpbmdzLmVuYWJsZWRDYXRlZ29yaWVzIHx8IHt9O1xyXG4gICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRoaXMuc2V0dGluZ3MuZW5hYmxlZFRvb2xzIHx8IHt9O1xyXG4gICAgICAgIHJldHVybiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKS5tYXAoKFtjYXRlZ29yeSwgZXhlY3V0b3JdKSA9PiAoe1xyXG4gICAgICAgICAgICBjYXRlZ29yeSxcclxuICAgICAgICAgICAgaXNDb3JlOiBNQ1BTZXJ2ZXIuQ09SRV9DQVRFR09SSUVTLmluY2x1ZGVzKGNhdGVnb3J5KSxcclxuICAgICAgICAgICAgdG9vbHM6IGV4ZWN1dG9yLmdldFRvb2xzKCkubWFwKHRvb2wgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbE5hbWUgPSBgJHtjYXRlZ29yeX1fJHt0b29sLm5hbWV9YDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWQgPSBlbmFibGVkVG9vbHNbZnVsbE5hbWVdICE9PSB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICA/IGVuYWJsZWRUb29sc1tmdWxsTmFtZV1cclxuICAgICAgICAgICAgICAgICAgICA6IGVuYWJsZWRDYXRzW2NhdGVnb3J5XSAhPT0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBmdWxsTmFtZSwgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sIGVuYWJsZWQgfTtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBTZXJ2ZXIgTGlmZWN5Y2xlID09PVxyXG5cclxuICAgIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXR1cFRvb2xzKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcih0aGlzLmhhbmRsZUh0dHBSZXF1ZXN0LmJpbmQodGhpcykpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLm9uKCdlcnJvcicsIChlcnI6IE5vZGVKUy5FcnJub0V4Y2VwdGlvbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRUFERFJJTlVTRScpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbTUNQXSBQb3J0ICR7dGhpcy5zZXR0aW5ncy5wb3J0fSBpcyBhbHJlYWR5IGluIHVzZWApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgUG9ydCAke3RoaXMuc2V0dGluZ3MucG9ydH0gaXMgYWxyZWFkeSBpbiB1c2VgKSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNQ1BdIFNlcnZlciBlcnJvcjonLCBlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlci5saXN0ZW4odGhpcy5zZXR0aW5ncy5wb3J0LCAnMTI3LjAuMC4xJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BdIFNlcnZlciBzdGFydGVkIG9uIGh0dHA6Ly8xMjcuMC4wLjE6JHt0aGlzLnNldHRpbmdzLnBvcnR9L21jcGApO1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzdG9wKCk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmNsb3NlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IG51bGw7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQXSBTZXJ2ZXIgc3RvcHBlZCcpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpc1J1bm5pbmcoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaHR0cFNlcnZlciAhPT0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUb29sQ291bnQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3QubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEFjdGlvbkNvdW50KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWN0aW9uQ291bnQ7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlU2V0dGluZ3Moc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xyXG4gICAgICAgIHRoaXMuZW5hYmxlRGVidWdMb2cgPSBzZXR0aW5ncy5lbmFibGVEZWJ1Z0xvZztcclxuICAgICAgICAvLyBSZWJ1aWxkIHRvb2wgbGlzdCB3aGVuIGNhdGVnb3JpZXMgY2hhbmdlXHJcbiAgICAgICAgdGhpcy5zZXR1cFRvb2xzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IEhUVFAgUmVxdWVzdCBIYW5kbGluZyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUh0dHBSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xyXG4gICAgICAgIC8vIENPUlMgaGVhZGVyc1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsIFBPU1QsIE9QVElPTlMnKTtcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbicpO1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcblxyXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICByZXMuZW5kKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgJyc7XHJcblxyXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJyAmJiB1cmwgPT09ICcvaGVhbHRoJykge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUhlYWx0aChyZXMpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnICYmIHVybCA9PT0gJy9tY3AnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTUNQKHJlcSwgcmVzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ05vdCBmb3VuZCcgfSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUhlYWx0aChyZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcclxuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIHN0YXR1czogJ29rJyxcclxuICAgICAgICAgICAgdG9vbHM6IHRoaXMudG9vbHNMaXN0Lmxlbmd0aCxcclxuICAgICAgICAgICAgYWN0aW9uczogdGhpcy5hY3Rpb25Db3VudCxcclxuICAgICAgICAgICAgc2VydmVyOiBTRVJWRVJfSU5GTyxcclxuICAgICAgICB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVNQ1AocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IGJvZHkgPSAnJztcclxuICAgICAgICByZXEub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4geyBib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7IH0pO1xyXG4gICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2U6IGFueTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoYm9keSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgZml4aW5nIGNvbW1vbiBKU09OIGlzc3VlcyBmcm9tIEFJIGNsaWVudHNcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShmaXhDb21tb25Kc29uSXNzdWVzKGJvZHkpKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogeyBjb2RlOiAtMzI3MDAsIG1lc3NhZ2U6ICdQYXJzZSBlcnJvcicgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocmVzdWx0KSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICBpZDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogeyBjb2RlOiAtMzI2MDMsIG1lc3NhZ2U6IGVyci5tZXNzYWdlIH0sXHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSlNPTi1SUEMgMi4wIE1lc3NhZ2UgSGFuZGxpbmcgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNZXNzYWdlKG1lc3NhZ2U6IGFueSk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgY29uc3QgeyBpZCwgbWV0aG9kLCBwYXJhbXMgfSA9IG1lc3NhZ2U7XHJcblxyXG4gICAgICAgIHRoaXMubG9nKGBbTUNQXSDihpIgJHttZXRob2R9YCk7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ2luaXRpYWxpemUnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2xWZXJzaW9uOiBQUk9UT0NPTF9WRVJTSU9OLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXM6IHsgdG9vbHM6IHt9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlckluZm86IFNFUlZFUl9JTkZPLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAnbm90aWZpY2F0aW9ucy9pbml0aWFsaXplZCc6XHJcbiAgICAgICAgICAgICAgICAvLyBDbGllbnQgbm90aWZpY2F0aW9uLCBubyByZXNwb25zZSBuZWVkZWRcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IGpzb25ycGM6ICcyLjAnLCBpZCwgcmVzdWx0OiB7fSB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAndG9vbHMvbGlzdCc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sczogdGhpcy50b29sc0xpc3QubWFwKHQgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHQubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0LmRlc2NyaXB0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHQuaW5wdXRTY2hlbWEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2NhbGwnOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sTmFtZSA9IHBhcmFtcz8ubmFtZTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBwYXJhbXM/LmFyZ3VtZW50cyB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogeyBjb2RlOiAtMzI2MDIsIG1lc3NhZ2U6ICdNaXNzaW5nIHRvb2wgbmFtZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlVG9vbENhbGwodG9vbE5hbWUsIGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IEpTT04uc3RyaW5naWZ5KHJlc3VsdCkgfV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7IHR5cGU6ICd0ZXh0JywgdGV4dDogSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pIH1dLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNFcnJvcjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogeyBjb2RlOiAtMzI2MDEsIG1lc3NhZ2U6IGBVbmtub3duIG1ldGhvZDogJHttZXRob2R9YCB9LFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFRvb2wgRXhlY3V0aW9uID09PVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVRvb2xDYWxsKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgLy8gQ29uc29saWRhdGVkIGFwcHJvYWNoOiB0b29sIG5hbWUgPSBjYXRlZ29yeSwgYWN0aW9uIGluIGFyZ3NcclxuICAgICAgICBjb25zdCBleGVjdXRvciA9IHRoaXMudG9vbHNbdG9vbE5hbWVdO1xyXG4gICAgICAgIGlmICghZXhlY3V0b3IpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBhY3Rpb24gPSBhcmdzPy5hY3Rpb247XHJcbiAgICAgICAgaWYgKCFhY3Rpb24pIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIFwiYWN0aW9uXCIgcGFyYW1ldGVyIGZvciB0b29sIFwiJHt0b29sTmFtZX1cIi4gQ2hlY2sgYXZhaWxhYmxlIGFjdGlvbnMgaW4gdGhlIHRvb2wgZGVzY3JpcHRpb24uYCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBWYWxpZGF0ZSBhcmd1bWVudHMgYWdhaW5zdCBzY2hlbWFcclxuICAgICAgICB0aGlzLnZhbGlkYXRlQXJncyh0b29sTmFtZSwgYWN0aW9uLCBhcmdzKTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2coYFtNQ1BdIEV4ZWN1dGluZzogJHt0b29sTmFtZX0uJHthY3Rpb259YCk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShhY3Rpb24sIGFyZ3MpO1xyXG4gICAgICAgIHRoaXMubG9nKGBbTUNQXSBSZXN1bHQ6ICR7cmVzdWx0LnN1Y2Nlc3MgPyAnT0snIDogJ0ZBSUwnfWApO1xyXG5cclxuICAgICAgICAvLyBBdXRvLXJlZnJlc2ggZWRpdG9yIGFmdGVyIHdyaXRlIG9wZXJhdGlvbnNcclxuICAgICAgICBhd2FpdCB0aGlzLmF1dG9SZWZyZXNoKHRvb2xOYW1lLCBhY3Rpb24sIHJlc3VsdCk7XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBWYWxpZGF0ZSB0b29sIGFyZ3VtZW50cyBhZ2FpbnN0IHRoZSB0b29sJ3MgaW5wdXRTY2hlbWEuXHJcbiAgICAgKiBUaHJvd3MgZGVzY3JpcHRpdmUgZXJyb3JzIGZvciBpbnZhbGlkIGFjdGlvbiwgbWlzc2luZyByZXF1aXJlZCBwYXJhbXMsIG9yIHR5cGUgbWlzbWF0Y2hlcy5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB2YWxpZGF0ZUFyZ3MoY2F0ZWdvcnk6IHN0cmluZywgYWN0aW9uOiBzdHJpbmcsIGFyZ3M6IGFueSk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGV4ZWN1dG9yID0gdGhpcy50b29sc1tjYXRlZ29yeV07XHJcbiAgICAgICAgY29uc3QgYWxsVG9vbHMgPSBleGVjdXRvci5nZXRUb29scygpO1xyXG4gICAgICAgIGNvbnN0IHRvb2xOYW1lcyA9IGFsbFRvb2xzLm1hcCh0ID0+IHQubmFtZSk7XHJcblxyXG4gICAgICAgIC8vIDEuIFZhbGlkYXRlIGFjdGlvbiBpcyBpbiB0aGUgYWxsb3dlZCBsaXN0XHJcbiAgICAgICAgaWYgKCF0b29sTmFtZXMuaW5jbHVkZXMoYWN0aW9uKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgICAgICBgSW52YWxpZCBhY3Rpb24gJyR7YWN0aW9ufScgZm9yIHRvb2wgJyR7Y2F0ZWdvcnl9Jy4gQXZhaWxhYmxlIGFjdGlvbnM6ICR7dG9vbE5hbWVzLmpvaW4oJywgJyl9YFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gMi4gRmluZCBtYXRjaGluZyB0b29sIGRlZmluaXRpb25cclxuICAgICAgICBjb25zdCB0b29sRGVmID0gYWxsVG9vbHMuZmluZCh0ID0+IHQubmFtZSA9PT0gYWN0aW9uKSE7XHJcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gdG9vbERlZi5pbnB1dFNjaGVtYTtcclxuICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gc2NoZW1hLnByb3BlcnRpZXMgfHwge307XHJcbiAgICAgICAgY29uc3QgcmVxdWlyZWQgPSBzY2hlbWEucmVxdWlyZWQgfHwgW107XHJcblxyXG4gICAgICAgIC8vIDMuIENoZWNrIHJlcXVpcmVkIHBhcmFtZXRlcnNcclxuICAgICAgICBjb25zdCBtaXNzaW5nOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgcGFyYW1OYW1lIG9mIHJlcXVpcmVkKSB7XHJcbiAgICAgICAgICAgIGlmIChhcmdzW3BhcmFtTmFtZV0gPT09IHVuZGVmaW5lZCB8fCBhcmdzW3BhcmFtTmFtZV0gPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIG1pc3NpbmcucHVzaChwYXJhbU5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChtaXNzaW5nLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3QgcGFyYW1MaXN0ID0gT2JqZWN0LmVudHJpZXMocHJvcGVydGllcylcclxuICAgICAgICAgICAgICAgIC5tYXAoKFtuYW1lLCBkZWZdOiBbc3RyaW5nLCBhbnldKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNSZXEgPSByZXF1aXJlZC5pbmNsdWRlcyhuYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYCR7bmFtZX0ke2lzUmVxID8gJycgOiAnPyd9ICgke2RlZi50eXBlIHx8ICdhbnknfSlgO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5qb2luKCcsICcpO1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgICAgICBgTWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXIke21pc3NpbmcubGVuZ3RoID4gMSA/ICdzJyA6ICcnfSAnJHttaXNzaW5nLmpvaW4oXCInLCAnXCIpfScgZm9yIGFjdGlvbiAnJHtjYXRlZ29yeX0uJHthY3Rpb259Jy4gRXhwZWN0ZWQgcGFyYW1ldGVyczogJHtwYXJhbUxpc3R9YFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gNC4gVHlwZS1jaGVjayBwcm92aWRlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgZm9yIChjb25zdCBbcGFyYW1OYW1lLCBwYXJhbURlZl0gb2YgT2JqZWN0LmVudHJpZXMocHJvcGVydGllcykgYXMgW3N0cmluZywgYW55XVtdKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXJnc1twYXJhbU5hbWVdO1xyXG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBleHBlY3RlZFR5cGUgPSBwYXJhbURlZi50eXBlO1xyXG4gICAgICAgICAgICBpZiAoIWV4cGVjdGVkVHlwZSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBsZXQgdmFsaWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGV4cGVjdGVkVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzogIHZhbGlkID0gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJzsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOiAgdmFsaWQgPSB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOiB2YWxpZCA9IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6ICB2YWxpZCA9IHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2FycmF5JzogICB2YWxpZCA9IEFycmF5LmlzQXJyYXkodmFsdWUpOyBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCF2YWxpZCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICAgICAgICAgIGBUeXBlIG1pc21hdGNoIGZvciBwYXJhbWV0ZXIgJyR7cGFyYW1OYW1lfScgaW4gYWN0aW9uICcke2NhdGVnb3J5fS4ke2FjdGlvbn0nOiBleHBlY3RlZCAke2V4cGVjdGVkVHlwZX0sIGdvdCAke0FycmF5LmlzQXJyYXkodmFsdWUpID8gJ2FycmF5JyA6IHR5cGVvZiB2YWx1ZX1gXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXV0b21hdGljYWxseSByZWZyZXNoIHRoZSBlZGl0b3IgYWZ0ZXIgYSBzdWNjZXNzZnVsIHdyaXRlIG9wZXJhdGlvbi5cclxuICAgICAqIFVzZXMgUkVGUkVTSF9NQVAgdG8gZGV0ZXJtaW5lIHJlZnJlc2ggdHlwZS4gTmV2ZXIgdGhyb3dzIOKAlCByZWZyZXNoXHJcbiAgICAgKiBmYWlsdXJlcyBhcmUgcmVwb3J0ZWQgYXMgd2FybmluZ3MsIG5vdCBlcnJvcnMuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgYXV0b1JlZnJlc2godG9vbE5hbWU6IHN0cmluZywgYWN0aW9uOiBzdHJpbmcsIHJlc3VsdDogVG9vbFJlc3BvbnNlKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgY29uc3Qga2V5ID0gYCR7dG9vbE5hbWV9LiR7YWN0aW9ufWA7XHJcbiAgICAgICAgY29uc3QgcmVmcmVzaFR5cGUgPSBNQ1BTZXJ2ZXIuUkVGUkVTSF9NQVBba2V5XTtcclxuICAgICAgICBpZiAoIXJlZnJlc2hUeXBlIHx8ICFyZXN1bHQuc3VjY2VzcykgcmV0dXJuO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAocmVmcmVzaFR5cGUgPT09ICdzY2VuZScpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NvZnQtcmVsb2FkJyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVmcmVzaFR5cGUgPT09ICdhc3NldCcpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3JlZnJlc2gtYXNzZXQnLCAnZGI6Ly9hc3NldHMnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXN1bHQucmVmcmVzaGVkID0gcmVmcmVzaFR5cGU7XHJcbiAgICAgICAgICAgIHRoaXMubG9nKGBbTUNQXSBBdXRvLXJlZnJlc2hlZDogJHtyZWZyZXNoVHlwZX1gKTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXN1bHQucmVmcmVzaFdhcm5pbmcgPSBgQXV0by1yZWZyZXNoIGZhaWxlZDogJHtlcnIubWVzc2FnZX1gO1xyXG4gICAgICAgICAgICB0aGlzLmxvZyhgW01DUF0gQXV0by1yZWZyZXNoIHdhcm5pbmc6ICR7ZXJyLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBMb2dnaW5nID09PVxyXG5cclxuICAgIHByaXZhdGUgbG9nKG1zZzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuZW5hYmxlRGVidWdMb2cpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cobXNnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vID09PSBKU09OIEZpeCBIZWxwZXIgPT09XHJcblxyXG5mdW5jdGlvbiBmaXhDb21tb25Kc29uSXNzdWVzKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgbGV0IGZpeGVkID0gaW5wdXQ7XHJcbiAgICAvLyBSZW1vdmUgdHJhaWxpbmcgY29tbWFzIGJlZm9yZSB9IG9yIF1cclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvLFxccyooW31cXF1dKS9nLCAnJDEnKTtcclxuICAgIC8vIFJlcGxhY2Ugc2luZ2xlIHF1b3RlcyB3aXRoIGRvdWJsZSBxdW90ZXMgKG91dHNpZGUgb2Ygc3RyaW5ncylcclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvJy9nLCAnXCInKTtcclxuICAgIC8vIEVzY2FwZSB1bmVzY2FwZWQgbmV3bGluZXNcclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvXFxuL2csICdcXFxcbicpO1xyXG4gICAgZml4ZWQgPSBmaXhlZC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJyk7XHJcbiAgICBmaXhlZCA9IGZpeGVkLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcclxuICAgIHJldHVybiBmaXhlZDtcclxufVxyXG4iXX0=