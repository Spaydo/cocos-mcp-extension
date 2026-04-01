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
        const enabledTools = this.settings.enabledTools || {};
        // Filter by per-tool enable/disable settings (same logic as setupTools)
        const activeTools = allTools.filter(tool => {
            const fullName = `${category}_${tool.name}`;
            return enabledTools[fullName] !== undefined ? enabledTools[fullName] : true;
        });
        const toolNames = activeTools.map(t => t.name);
        // 1. Validate action is in the allowed list
        if (!toolNames.includes(action)) {
            throw new Error(`Invalid action '${action}' for tool '${category}'. Available actions: ${toolNames.join(', ')}`);
        }
        // 2. Find matching tool definition
        const toolDef = activeTools.find(t => t.name === action);
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
MCPServer.CORE_CATEGORIES = ['scene', 'node', 'component', 'asset', 'prefab', 'project', 'debug', 'validation'];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUc3QixNQUFNLFdBQVcsR0FBRztJQUNoQixJQUFJLEVBQUUscUJBQXFCO0lBQzNCLE9BQU8sRUFBRSxPQUFPO0NBQ25CLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQztBQUV0QyxNQUFhLFNBQVM7SUFRbEIsWUFBWSxRQUEyQjtRQVAvQixlQUFVLEdBQXVCLElBQUksQ0FBQztRQUV0QyxVQUFLLEdBQWlDLEVBQUUsQ0FBQztRQUN6QyxjQUFTLEdBQXFCLEVBQUUsQ0FBQztRQUNqQyxnQkFBVyxHQUFXLENBQUMsQ0FBQztRQUN4QixtQkFBYyxHQUFZLEtBQUssQ0FBQztRQUdwQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUM7SUFDbEQsQ0FBQztJQUVELDRCQUE0QjtJQUU1QixvQkFBb0IsQ0FBQyxRQUFnQixFQUFFLFFBQXNCO1FBQ3pELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsVUFBVTtRQUNOLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO1FBQzFELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUV0RCxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElB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RSxPQUFPLEVBQUUsWUFBWSxDQUFDLEFBQXRGLENBQXVGO0FBeVd6SCwwQkFBMEI7QUFFMUIsU0FBUyxtQkFBbUIsQ0FBQyxLQUFhO0lBQ3RDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNsQix1Q0FBdUM7SUFDdkMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVDLGdFQUFnRTtJQUNoRSxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakMsNEJBQTRCO0lBQzVCLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDcEMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sS0FBSyxDQUFDO0FBQ2pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xyXG5pbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIE1DUFNlcnZlclNldHRpbmdzIH0gZnJvbSAnLi90eXBlcyc7XHJcblxyXG5jb25zdCBTRVJWRVJfSU5GTyA9IHtcclxuICAgIG5hbWU6ICdjb2Nvcy1tY3AtZXh0ZW5zaW9uJyxcclxuICAgIHZlcnNpb246ICcxLjAuMCcsXHJcbn07XHJcblxyXG5jb25zdCBQUk9UT0NPTF9WRVJTSU9OID0gJzIwMjQtMTEtMDUnO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1DUFNlcnZlciB7XHJcbiAgICBwcml2YXRlIGh0dHBTZXJ2ZXI6IGh0dHAuU2VydmVyIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncztcclxuICAgIHByaXZhdGUgdG9vbHM6IFJlY29yZDxzdHJpbmcsIFRvb2xFeGVjdXRvcj4gPSB7fTtcclxuICAgIHByaXZhdGUgdG9vbHNMaXN0OiBUb29sRGVmaW5pdGlvbltdID0gW107XHJcbiAgICBwcml2YXRlIGFjdGlvbkNvdW50OiBudW1iZXIgPSAwO1xyXG4gICAgcHJpdmF0ZSBlbmFibGVEZWJ1Z0xvZzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncykge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcclxuICAgICAgICB0aGlzLmVuYWJsZURlYnVnTG9nID0gc2V0dGluZ3MuZW5hYmxlRGVidWdMb2c7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFRvb2wgUmVnaXN0cmF0aW9uID09PVxyXG5cclxuICAgIHJlZ2lzdGVyVG9vbENhdGVnb3J5KGNhdGVnb3J5OiBzdHJpbmcsIGV4ZWN1dG9yOiBUb29sRXhlY3V0b3IpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnRvb2xzW2NhdGVnb3J5XSA9IGV4ZWN1dG9yO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVpbGQgY29uc29saWRhdGVkIHRvb2wgbGlzdDogb25lIE1DUCB0b29sIHBlciBjYXRlZ29yeSB3aXRoIGFjdGlvbiBwYXJhbWV0ZXIuXHJcbiAgICAgKiBBSSBzZWVzIDExIHRvb2xzIGluc3RlYWQgb2YgODcsIHNhdmluZyB+NTAlIHRva2VucyBvbiB0b29sIGRlZmluaXRpb25zLlxyXG4gICAgICogUGVyLXRvb2wgc2V0dGluZ3MgZmlsdGVyIGluZGl2aWR1YWwgYWN0aW9ucyB3aXRoaW4gZWFjaCBjYXRlZ29yeS5cclxuICAgICAqL1xyXG4gICAgc2V0dXBUb29scygpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnRvb2xzTGlzdCA9IFtdO1xyXG4gICAgICAgIHRoaXMuYWN0aW9uQ291bnQgPSAwO1xyXG4gICAgICAgIGNvbnN0IGVuYWJsZWRDYXRzID0gdGhpcy5zZXR0aW5ncy5lbmFibGVkQ2F0ZWdvcmllcyB8fCB7fTtcclxuICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0aGlzLnNldHRpbmdzLmVuYWJsZWRUb29scyB8fCB7fTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBbY2F0ZWdvcnksIGV4ZWN1dG9yXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xyXG4gICAgICAgICAgICAvLyBTa2lwIGVudGlyZWx5IGRpc2FibGVkIGNhdGVnb3JpZXNcclxuICAgICAgICAgICAgaWYgKGVuYWJsZWRDYXRzW2NhdGVnb3J5XSA9PT0gZmFsc2UpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYWxsVG9vbHMgPSBleGVjdXRvci5nZXRUb29scygpO1xyXG5cclxuICAgICAgICAgICAgLy8gRmlsdGVyIGJ5IHBlci10b29sIHNldHRpbmdzXHJcbiAgICAgICAgICAgIGNvbnN0IGFjdGl2ZVRvb2xzID0gYWxsVG9vbHMuZmlsdGVyKHRvb2wgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbE5hbWUgPSBgJHtjYXRlZ29yeX1fJHt0b29sLm5hbWV9YDtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbmFibGVkVG9vbHNbZnVsbE5hbWVdICE9PSB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICA/IGVuYWJsZWRUb29sc1tmdWxsTmFtZV1cclxuICAgICAgICAgICAgICAgICAgICA6IHRydWU7IC8vIGVuYWJsZWQgYnkgZGVmYXVsdCB3aXRoaW4gYW4gZW5hYmxlZCBjYXRlZ29yeVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChhY3RpdmVUb29scy5sZW5ndGggPT09IDApIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25Db3VudCArPSBhY3RpdmVUb29scy5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICAvLyBCdWlsZCBvbmUgY29uc29saWRhdGVkIE1DUCB0b29sIHBlciBjYXRlZ29yeVxyXG4gICAgICAgICAgICB0aGlzLnRvb2xzTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IGNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRoaXMuYnVpbGREZXNjcmlwdGlvbihjYXRlZ29yeSwgYWN0aXZlVG9vbHMpLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHRoaXMuYnVpbGRTY2hlbWEoYWN0aXZlVG9vbHMpLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubG9nKGBUb29scyByZWdpc3RlcmVkOiAke3RoaXMudG9vbHNMaXN0Lmxlbmd0aH0gY2F0ZWdvcmllcywgJHt0aGlzLmFjdGlvbkNvdW50fSBhY3Rpb25zYCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IENvbnNvbGlkYXRlZCBUb29sIERlc2NyaXB0aW9uID09PVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIENBVEVHT1JZX0RFU0NSSVBUSU9OUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgICBzY2VuZTogJ1NjZW5lIG1hbmFnZW1lbnQgKG9wZW4sIHNhdmUsIHF1ZXJ5IGhpZXJhcmNoeSwgZXRjLiknLFxyXG4gICAgICAgIG5vZGU6ICdOb2RlL0dhbWVPYmplY3Qgb3BlcmF0aW9ucyAoY3JlYXRlLCBkZWxldGUsIHRyYW5zZm9ybSwgZXRjLiknLFxyXG4gICAgICAgIGNvbXBvbmVudDogJ0NvbXBvbmVudCBtYW5hZ2VtZW50IChhZGQsIHJlbW92ZSwgcXVlcnksIHNldCBwcm9wZXJ0aWVzLCBldGMuKScsXHJcbiAgICAgICAgYXNzZXQ6ICdBc3NldCBkYXRhYmFzZSBvcGVyYXRpb25zIChxdWVyeSwgY3JlYXRlLCBpbXBvcnQsIGRlcGVuZGVuY2llcywgZXRjLiknLFxyXG4gICAgICAgIHByZWZhYjogJ1ByZWZhYiBvcGVyYXRpb25zIChxdWVyeSwgbGlzdCwgaW5zdGFudGlhdGUsIGNyZWF0ZSwgcmVzdG9yZSknLFxyXG4gICAgICAgIHByb2plY3Q6ICdQcm9qZWN0LWxldmVsIG9wZXJhdGlvbnMgKGluZm8sIGJ1aWxkLCBwcmV2aWV3LCBjb25maWcpJyxcclxuICAgICAgICBkZWJ1ZzogJ0RlYnVnZ2luZyB1dGlsaXRpZXMgKGxvZ3MsIHNjcmlwdCBleGVjdXRpb24pJyxcclxuICAgICAgICBzY2VuZV92aWV3OiAnU2NlbmUgdmlldyBjb250cm9scyAoZ2l6bW8sIGNhbWVyYSwgZ3JpZCwgdmlldyBtb2RlKScsXHJcbiAgICAgICAgZWRpdG9yOiAnRWRpdG9yIGVudmlyb25tZW50IChwcmVmZXJlbmNlcywgaW5mbywgZGV2aWNlcyknLFxyXG4gICAgICAgIHJlZmVyZW5jZV9pbWFnZTogJ1JlZmVyZW5jZSBpbWFnZSBvdmVybGF5IG1hbmFnZW1lbnQnLFxyXG4gICAgICAgIGFuaW1hdGlvbjogJ0FuaW1hdGlvbiBwbGF5YmFjayBjb250cm9sJyxcclxuICAgICAgICB2YWxpZGF0aW9uOiAnU2NlbmUgdmFsaWRhdGlvbiBhbmQgaGVhbHRoIGNoZWNraW5nJyxcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgUkVGUkVTSF9NQVA6IFJlY29yZDxzdHJpbmcsICdzY2VuZScgfCAnYXNzZXQnPiA9IHtcclxuICAgICAgICAvLyBOb2RlIG9wZXJhdGlvbnNcclxuICAgICAgICAnbm9kZS5jcmVhdGUnOiAnc2NlbmUnLFxyXG4gICAgICAgICdub2RlLmRlbGV0ZSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ25vZGUuc2V0X3Byb3BlcnR5JzogJ3NjZW5lJyxcclxuICAgICAgICAnbm9kZS5kdXBsaWNhdGUnOiAnc2NlbmUnLFxyXG4gICAgICAgICdub2RlLnJlc2V0X3RyYW5zZm9ybSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ25vZGUubW92ZSc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIENvbXBvbmVudCBvcGVyYXRpb25zXHJcbiAgICAgICAgJ2NvbXBvbmVudC5hZGQnOiAnc2NlbmUnLFxyXG4gICAgICAgICdjb21wb25lbnQucmVtb3ZlJzogJ3NjZW5lJyxcclxuICAgICAgICAnY29tcG9uZW50LnNldF9wcm9wZXJ0eSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ2NvbXBvbmVudC5yZXNldCc6ICdzY2VuZScsXHJcbiAgICAgICAgJ2NvbXBvbmVudC5leGVjdXRlX21ldGhvZCc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIEFuaW1hdGlvbiBvcGVyYXRpb25zXHJcbiAgICAgICAgJ2FuaW1hdGlvbi5wbGF5JzogJ3NjZW5lJyxcclxuICAgICAgICAnYW5pbWF0aW9uLnN0b3AnOiAnc2NlbmUnLFxyXG4gICAgICAgICdhbmltYXRpb24uc2V0X2NsaXAnOiAnc2NlbmUnLFxyXG5cclxuICAgICAgICAvLyBEZWJ1ZyAoc2NyaXB0IGV4ZWN1dGlvbiBtYXkgbW9kaWZ5IHNjZW5lKVxyXG4gICAgICAgICdkZWJ1Zy5leGVjdXRlX3NjcmlwdCc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIFByZWZhYiBvcGVyYXRpb25zIChzY2VuZSlcclxuICAgICAgICAncHJlZmFiLmluc3RhbnRpYXRlJzogJ3NjZW5lJyxcclxuICAgICAgICAncHJlZmFiLnJlc3RvcmUnOiAnc2NlbmUnLFxyXG5cclxuICAgICAgICAvLyBBc3NldCBvcGVyYXRpb25zXHJcbiAgICAgICAgJ2Fzc2V0LmNyZWF0ZSc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0LmRlbGV0ZSc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0Lm1vdmUnOiAnYXNzZXQnLFxyXG4gICAgICAgICdhc3NldC5pbXBvcnQnOiAnYXNzZXQnLFxyXG4gICAgICAgICdhc3NldC5jb3B5JzogJ2Fzc2V0JyxcclxuICAgICAgICAnYXNzZXQuc2F2ZSc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0LnJlaW1wb3J0JzogJ2Fzc2V0JyxcclxuXHJcbiAgICAgICAgLy8gUHJlZmFiIG9wZXJhdGlvbnMgKGFzc2V0KVxyXG4gICAgICAgICdwcmVmYWIuY3JlYXRlJzogJ2Fzc2V0JyxcclxuICAgICAgICAncHJlZmFiLmNyZWF0ZV9lbXB0eSc6ICdhc3NldCcsXHJcblxyXG4gICAgICAgIC8vIFNjZW5lIG9wZXJhdGlvbnNcclxuICAgICAgICAnc2NlbmUuY3JlYXRlJzogJ2Fzc2V0JyxcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZERlc2NyaXB0aW9uKGNhdGVnb3J5OiBzdHJpbmcsIHRvb2xzOiBUb29sRGVmaW5pdGlvbltdKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBjYXREZXNjID0gTUNQU2VydmVyLkNBVEVHT1JZX0RFU0NSSVBUSU9OU1tjYXRlZ29yeV0gfHwgY2F0ZWdvcnk7XHJcbiAgICAgICAgbGV0IGRlc2MgPSBgJHtjYXREZXNjfVxcblxcbkFjdGlvbnM6XFxuYDtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0b29sIG9mIHRvb2xzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHRoaXMuZm9ybWF0QWN0aW9uUGFyYW1zKHRvb2wuaW5wdXRTY2hlbWEpO1xyXG4gICAgICAgICAgICBkZXNjICs9IHBhcmFtc1xyXG4gICAgICAgICAgICAgICAgPyBgLSAke3Rvb2wubmFtZX06ICR7dG9vbC5kZXNjcmlwdGlvbn0gKCR7cGFyYW1zfSlcXG5gXHJcbiAgICAgICAgICAgICAgICA6IGAtICR7dG9vbC5uYW1lfTogJHt0b29sLmRlc2NyaXB0aW9ufVxcbmA7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZGVzYy50cmltKCk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBmb3JtYXRBY3Rpb25QYXJhbXMoc2NoZW1hOiBUb29sRGVmaW5pdGlvblsnaW5wdXRTY2hlbWEnXSk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgcHJvcHMgPSBzY2hlbWEucHJvcGVydGllcyB8fCB7fTtcclxuICAgICAgICBjb25zdCByZXF1aXJlZCA9IHNjaGVtYS5yZXF1aXJlZCB8fCBbXTtcclxuXHJcbiAgICAgICAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgZm9yIChjb25zdCBbbmFtZSwgZGVmXSBvZiBPYmplY3QuZW50cmllcyhwcm9wcykpIHtcclxuICAgICAgICAgICAgY29uc3QgaXNSZXEgPSByZXF1aXJlZC5pbmNsdWRlcyhuYW1lKTtcclxuICAgICAgICAgICAgY29uc3QgdHlwZSA9IGRlZi50eXBlIHx8ICdhbnknO1xyXG4gICAgICAgICAgICBwYXJ0cy5wdXNoKGAke25hbWV9JHtpc1JlcSA/ICcnIDogJz8nfTogJHt0eXBlfWApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHBhcnRzLmpvaW4oJywgJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IENvbnNvbGlkYXRlZCBUb29sIFNjaGVtYSA9PT1cclxuXHJcbiAgICBwcml2YXRlIGJ1aWxkU2NoZW1hKHRvb2xzOiBUb29sRGVmaW5pdGlvbltdKTogVG9vbERlZmluaXRpb25bJ2lucHV0U2NoZW1hJ10ge1xyXG4gICAgICAgIGNvbnN0IGFjdGlvbkVudW0gPSB0b29scy5tYXAodCA9PiB0Lm5hbWUpO1xyXG4gICAgICAgIGNvbnN0IG1lcmdlZFByb3BzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAgICAgICBhY3Rpb246IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxyXG4gICAgICAgICAgICAgICAgZW51bTogYWN0aW9uRW51bSxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGhlIGFjdGlvbiB0byBwZXJmb3JtJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgcHJvcHMgPSB0b29sLmlucHV0U2NoZW1hLnByb3BlcnRpZXMgfHwge307XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3Byb3BOYW1lLCBwcm9wRGVmXSBvZiBPYmplY3QuZW50cmllcyhwcm9wcykpIHtcclxuICAgICAgICAgICAgICAgIGlmICghbWVyZ2VkUHJvcHNbcHJvcE5hbWVdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWVyZ2VkUHJvcHNbcHJvcE5hbWVdID0geyAuLi5wcm9wRGVmIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiBtZXJnZWRQcm9wcyxcclxuICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYWN0aW9uJ10sXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gVG9vbCBJbmZvIGZvciBQYW5lbCBVSSAocGVyLWFjdGlvbiBncmFudWxhcml0eSkgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgQ09SRV9DQVRFR09SSUVTID0gWydzY2VuZScsICdub2RlJywgJ2NvbXBvbmVudCcsICdhc3NldCcsICdwcmVmYWInLCAncHJvamVjdCcsICdkZWJ1ZycsICd2YWxpZGF0aW9uJ107XHJcblxyXG4gICAgZ2V0QWxsVG9vbHNJbmZvKCk6IHsgY2F0ZWdvcnk6IHN0cmluZzsgaXNDb3JlOiBib29sZWFuOyB0b29sczogeyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uOiBzdHJpbmc7IGVuYWJsZWQ6IGJvb2xlYW4gfVtdIH1bXSB7XHJcbiAgICAgICAgY29uc3QgZW5hYmxlZENhdHMgPSB0aGlzLnNldHRpbmdzLmVuYWJsZWRDYXRlZ29yaWVzIHx8IHt9O1xyXG4gICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRoaXMuc2V0dGluZ3MuZW5hYmxlZFRvb2xzIHx8IHt9O1xyXG4gICAgICAgIHJldHVybiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKS5tYXAoKFtjYXRlZ29yeSwgZXhlY3V0b3JdKSA9PiAoe1xyXG4gICAgICAgICAgICBjYXRlZ29yeSxcclxuICAgICAgICAgICAgaXNDb3JlOiBNQ1BTZXJ2ZXIuQ09SRV9DQVRFR09SSUVTLmluY2x1ZGVzKGNhdGVnb3J5KSxcclxuICAgICAgICAgICAgdG9vbHM6IGV4ZWN1dG9yLmdldFRvb2xzKCkubWFwKHRvb2wgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbE5hbWUgPSBgJHtjYXRlZ29yeX1fJHt0b29sLm5hbWV9YDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWQgPSBlbmFibGVkVG9vbHNbZnVsbE5hbWVdICE9PSB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICA/IGVuYWJsZWRUb29sc1tmdWxsTmFtZV1cclxuICAgICAgICAgICAgICAgICAgICA6IGVuYWJsZWRDYXRzW2NhdGVnb3J5XSAhPT0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBuYW1lOiBmdWxsTmFtZSwgZGVzY3JpcHRpb246IHRvb2wuZGVzY3JpcHRpb24sIGVuYWJsZWQgfTtcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBTZXJ2ZXIgTGlmZWN5Y2xlID09PVxyXG5cclxuICAgIHN0YXJ0KCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXR1cFRvb2xzKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcih0aGlzLmhhbmRsZUh0dHBSZXF1ZXN0LmJpbmQodGhpcykpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLm9uKCdlcnJvcicsIChlcnI6IE5vZGVKUy5FcnJub0V4Y2VwdGlvbikgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRUFERFJJTlVTRScpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbTUNQXSBQb3J0ICR7dGhpcy5zZXR0aW5ncy5wb3J0fSBpcyBhbHJlYWR5IGluIHVzZWApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgUG9ydCAke3RoaXMuc2V0dGluZ3MucG9ydH0gaXMgYWxyZWFkeSBpbiB1c2VgKSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tNQ1BdIFNlcnZlciBlcnJvcjonLCBlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlci5saXN0ZW4odGhpcy5zZXR0aW5ncy5wb3J0LCAnMTI3LjAuMC4xJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BdIFNlcnZlciBzdGFydGVkIG9uIGh0dHA6Ly8xMjcuMC4wLjE6JHt0aGlzLnNldHRpbmdzLnBvcnR9L21jcGApO1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBzdG9wKCk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLmh0dHBTZXJ2ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmNsb3NlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IG51bGw7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQXSBTZXJ2ZXIgc3RvcHBlZCcpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpc1J1bm5pbmcoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaHR0cFNlcnZlciAhPT0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUb29sQ291bnQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3QubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEFjdGlvbkNvdW50KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWN0aW9uQ291bnQ7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlU2V0dGluZ3Moc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xyXG4gICAgICAgIHRoaXMuZW5hYmxlRGVidWdMb2cgPSBzZXR0aW5ncy5lbmFibGVEZWJ1Z0xvZztcclxuICAgICAgICAvLyBSZWJ1aWxkIHRvb2wgbGlzdCB3aGVuIGNhdGVnb3JpZXMgY2hhbmdlXHJcbiAgICAgICAgdGhpcy5zZXR1cFRvb2xzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IEhUVFAgUmVxdWVzdCBIYW5kbGluZyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUh0dHBSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xyXG4gICAgICAgIC8vIENPUlMgaGVhZGVyc1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsIFBPU1QsIE9QVElPTlMnKTtcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbicpO1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcblxyXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICByZXMuZW5kKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgJyc7XHJcblxyXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJyAmJiB1cmwgPT09ICcvaGVhbHRoJykge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUhlYWx0aChyZXMpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnICYmIHVybCA9PT0gJy9tY3AnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTUNQKHJlcSwgcmVzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ05vdCBmb3VuZCcgfSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUhlYWx0aChyZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcclxuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIHN0YXR1czogJ29rJyxcclxuICAgICAgICAgICAgdG9vbHM6IHRoaXMudG9vbHNMaXN0Lmxlbmd0aCxcclxuICAgICAgICAgICAgYWN0aW9uczogdGhpcy5hY3Rpb25Db3VudCxcclxuICAgICAgICAgICAgc2VydmVyOiBTRVJWRVJfSU5GTyxcclxuICAgICAgICB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBoYW5kbGVNQ1AocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IGJvZHkgPSAnJztcclxuICAgICAgICByZXEub24oJ2RhdGEnLCAoY2h1bms6IEJ1ZmZlcikgPT4geyBib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7IH0pO1xyXG4gICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG1lc3NhZ2U6IGFueTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoYm9keSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBUcnkgZml4aW5nIGNvbW1vbiBKU09OIGlzc3VlcyBmcm9tIEFJIGNsaWVudHNcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShmaXhDb21tb25Kc29uSXNzdWVzKGJvZHkpKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogeyBjb2RlOiAtMzI3MDAsIG1lc3NhZ2U6ICdQYXJzZSBlcnJvcicgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuaGFuZGxlTWVzc2FnZShtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkocmVzdWx0KSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICBpZDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogeyBjb2RlOiAtMzI2MDMsIG1lc3NhZ2U6IGVyci5tZXNzYWdlIH0sXHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSlNPTi1SUEMgMi4wIE1lc3NhZ2UgSGFuZGxpbmcgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBoYW5kbGVNZXNzYWdlKG1lc3NhZ2U6IGFueSk6IFByb21pc2U8YW55PiB7XHJcbiAgICAgICAgY29uc3QgeyBpZCwgbWV0aG9kLCBwYXJhbXMgfSA9IG1lc3NhZ2U7XHJcblxyXG4gICAgICAgIHRoaXMubG9nKGBbTUNQXSDihpIgJHttZXRob2R9YCk7XHJcblxyXG4gICAgICAgIHN3aXRjaCAobWV0aG9kKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ2luaXRpYWxpemUnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2xWZXJzaW9uOiBQUk9UT0NPTF9WRVJTSU9OLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXM6IHsgdG9vbHM6IHt9IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlckluZm86IFNFUlZFUl9JTkZPLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAnbm90aWZpY2F0aW9ucy9pbml0aWFsaXplZCc6XHJcbiAgICAgICAgICAgICAgICAvLyBDbGllbnQgbm90aWZpY2F0aW9uLCBubyByZXNwb25zZSBuZWVkZWRcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IGpzb25ycGM6ICcyLjAnLCBpZCwgcmVzdWx0OiB7fSB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAndG9vbHMvbGlzdCc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0b29sczogdGhpcy50b29sc0xpc3QubWFwKHQgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHQubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiB0LmRlc2NyaXB0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHQuaW5wdXRTY2hlbWEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2NhbGwnOiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sTmFtZSA9IHBhcmFtcz8ubmFtZTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFyZ3MgPSBwYXJhbXM/LmFyZ3VtZW50cyB8fCB7fTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIXRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogeyBjb2RlOiAtMzI2MDIsIG1lc3NhZ2U6ICdNaXNzaW5nIHRvb2wgbmFtZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5leGVjdXRlVG9vbENhbGwodG9vbE5hbWUsIGFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IEpTT04uc3RyaW5naWZ5KHJlc3VsdCkgfV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7IHR5cGU6ICd0ZXh0JywgdGV4dDogSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH0pIH1dLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNFcnJvcjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogeyBjb2RlOiAtMzI2MDEsIG1lc3NhZ2U6IGBVbmtub3duIG1ldGhvZDogJHttZXRob2R9YCB9LFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFRvb2wgRXhlY3V0aW9uID09PVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVRvb2xDYWxsKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgLy8gQ29uc29saWRhdGVkIGFwcHJvYWNoOiB0b29sIG5hbWUgPSBjYXRlZ29yeSwgYWN0aW9uIGluIGFyZ3NcclxuICAgICAgICBjb25zdCBleGVjdXRvciA9IHRoaXMudG9vbHNbdG9vbE5hbWVdO1xyXG4gICAgICAgIGlmICghZXhlY3V0b3IpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHRvb2w6ICR7dG9vbE5hbWV9YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBhY3Rpb24gPSBhcmdzPy5hY3Rpb247XHJcbiAgICAgICAgaWYgKCFhY3Rpb24pIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIFwiYWN0aW9uXCIgcGFyYW1ldGVyIGZvciB0b29sIFwiJHt0b29sTmFtZX1cIi4gQ2hlY2sgYXZhaWxhYmxlIGFjdGlvbnMgaW4gdGhlIHRvb2wgZGVzY3JpcHRpb24uYCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBWYWxpZGF0ZSBhcmd1bWVudHMgYWdhaW5zdCBzY2hlbWFcclxuICAgICAgICB0aGlzLnZhbGlkYXRlQXJncyh0b29sTmFtZSwgYWN0aW9uLCBhcmdzKTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2coYFtNQ1BdIEV4ZWN1dGluZzogJHt0b29sTmFtZX0uJHthY3Rpb259YCk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXhlY3V0b3IuZXhlY3V0ZShhY3Rpb24sIGFyZ3MpO1xyXG4gICAgICAgIHRoaXMubG9nKGBbTUNQXSBSZXN1bHQ6ICR7cmVzdWx0LnN1Y2Nlc3MgPyAnT0snIDogJ0ZBSUwnfWApO1xyXG5cclxuICAgICAgICAvLyBBdXRvLXJlZnJlc2ggZWRpdG9yIGFmdGVyIHdyaXRlIG9wZXJhdGlvbnNcclxuICAgICAgICBhd2FpdCB0aGlzLmF1dG9SZWZyZXNoKHRvb2xOYW1lLCBhY3Rpb24sIHJlc3VsdCk7XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBWYWxpZGF0ZSB0b29sIGFyZ3VtZW50cyBhZ2FpbnN0IHRoZSB0b29sJ3MgaW5wdXRTY2hlbWEuXHJcbiAgICAgKiBUaHJvd3MgZGVzY3JpcHRpdmUgZXJyb3JzIGZvciBpbnZhbGlkIGFjdGlvbiwgbWlzc2luZyByZXF1aXJlZCBwYXJhbXMsIG9yIHR5cGUgbWlzbWF0Y2hlcy5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB2YWxpZGF0ZUFyZ3MoY2F0ZWdvcnk6IHN0cmluZywgYWN0aW9uOiBzdHJpbmcsIGFyZ3M6IGFueSk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGV4ZWN1dG9yID0gdGhpcy50b29sc1tjYXRlZ29yeV07XHJcbiAgICAgICAgY29uc3QgYWxsVG9vbHMgPSBleGVjdXRvci5nZXRUb29scygpO1xyXG4gICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRoaXMuc2V0dGluZ3MuZW5hYmxlZFRvb2xzIHx8IHt9O1xyXG5cclxuICAgICAgICAvLyBGaWx0ZXIgYnkgcGVyLXRvb2wgZW5hYmxlL2Rpc2FibGUgc2V0dGluZ3MgKHNhbWUgbG9naWMgYXMgc2V0dXBUb29scylcclxuICAgICAgICBjb25zdCBhY3RpdmVUb29scyA9IGFsbFRvb2xzLmZpbHRlcih0b29sID0+IHtcclxuICAgICAgICAgICAgY29uc3QgZnVsbE5hbWUgPSBgJHtjYXRlZ29yeX1fJHt0b29sLm5hbWV9YDtcclxuICAgICAgICAgICAgcmV0dXJuIGVuYWJsZWRUb29sc1tmdWxsTmFtZV0gIT09IHVuZGVmaW5lZCA/IGVuYWJsZWRUb29sc1tmdWxsTmFtZV0gOiB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGNvbnN0IHRvb2xOYW1lcyA9IGFjdGl2ZVRvb2xzLm1hcCh0ID0+IHQubmFtZSk7XHJcblxyXG4gICAgICAgIC8vIDEuIFZhbGlkYXRlIGFjdGlvbiBpcyBpbiB0aGUgYWxsb3dlZCBsaXN0XHJcbiAgICAgICAgaWYgKCF0b29sTmFtZXMuaW5jbHVkZXMoYWN0aW9uKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgICAgICBgSW52YWxpZCBhY3Rpb24gJyR7YWN0aW9ufScgZm9yIHRvb2wgJyR7Y2F0ZWdvcnl9Jy4gQXZhaWxhYmxlIGFjdGlvbnM6ICR7dG9vbE5hbWVzLmpvaW4oJywgJyl9YFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gMi4gRmluZCBtYXRjaGluZyB0b29sIGRlZmluaXRpb25cclxuICAgICAgICBjb25zdCB0b29sRGVmID0gYWN0aXZlVG9vbHMuZmluZCh0ID0+IHQubmFtZSA9PT0gYWN0aW9uKSE7XHJcbiAgICAgICAgY29uc3Qgc2NoZW1hID0gdG9vbERlZi5pbnB1dFNjaGVtYTtcclxuICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gc2NoZW1hLnByb3BlcnRpZXMgfHwge307XHJcbiAgICAgICAgY29uc3QgcmVxdWlyZWQgPSBzY2hlbWEucmVxdWlyZWQgfHwgW107XHJcblxyXG4gICAgICAgIC8vIDMuIENoZWNrIHJlcXVpcmVkIHBhcmFtZXRlcnNcclxuICAgICAgICBjb25zdCBtaXNzaW5nOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgcGFyYW1OYW1lIG9mIHJlcXVpcmVkKSB7XHJcbiAgICAgICAgICAgIGlmIChhcmdzW3BhcmFtTmFtZV0gPT09IHVuZGVmaW5lZCB8fCBhcmdzW3BhcmFtTmFtZV0gPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIG1pc3NpbmcucHVzaChwYXJhbU5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChtaXNzaW5nLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3QgcGFyYW1MaXN0ID0gT2JqZWN0LmVudHJpZXMocHJvcGVydGllcylcclxuICAgICAgICAgICAgICAgIC5tYXAoKFtuYW1lLCBkZWZdOiBbc3RyaW5nLCBhbnldKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNSZXEgPSByZXF1aXJlZC5pbmNsdWRlcyhuYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYCR7bmFtZX0ke2lzUmVxID8gJycgOiAnPyd9ICgke2RlZi50eXBlIHx8ICdhbnknfSlgO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIC5qb2luKCcsICcpO1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgICAgICBgTWlzc2luZyByZXF1aXJlZCBwYXJhbWV0ZXIke21pc3NpbmcubGVuZ3RoID4gMSA/ICdzJyA6ICcnfSAnJHttaXNzaW5nLmpvaW4oXCInLCAnXCIpfScgZm9yIGFjdGlvbiAnJHtjYXRlZ29yeX0uJHthY3Rpb259Jy4gRXhwZWN0ZWQgcGFyYW1ldGVyczogJHtwYXJhbUxpc3R9YFxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gNC4gVHlwZS1jaGVjayBwcm92aWRlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgZm9yIChjb25zdCBbcGFyYW1OYW1lLCBwYXJhbURlZl0gb2YgT2JqZWN0LmVudHJpZXMocHJvcGVydGllcykgYXMgW3N0cmluZywgYW55XVtdKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXJnc1twYXJhbU5hbWVdO1xyXG4gICAgICAgICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBleHBlY3RlZFR5cGUgPSBwYXJhbURlZi50eXBlO1xyXG4gICAgICAgICAgICBpZiAoIWV4cGVjdGVkVHlwZSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBsZXQgdmFsaWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGV4cGVjdGVkVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzogIHZhbGlkID0gdHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJzsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdudW1iZXInOiAgdmFsaWQgPSB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOiB2YWxpZCA9IHR5cGVvZiB2YWx1ZSA9PT0gJ2Jvb2xlYW4nOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ29iamVjdCc6ICB2YWxpZCA9IHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2FycmF5JzogICB2YWxpZCA9IEFycmF5LmlzQXJyYXkodmFsdWUpOyBicmVhaztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCF2YWxpZCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICAgICAgICAgIGBUeXBlIG1pc21hdGNoIGZvciBwYXJhbWV0ZXIgJyR7cGFyYW1OYW1lfScgaW4gYWN0aW9uICcke2NhdGVnb3J5fS4ke2FjdGlvbn0nOiBleHBlY3RlZCAke2V4cGVjdGVkVHlwZX0sIGdvdCAke0FycmF5LmlzQXJyYXkodmFsdWUpID8gJ2FycmF5JyA6IHR5cGVvZiB2YWx1ZX1gXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQXV0b21hdGljYWxseSByZWZyZXNoIHRoZSBlZGl0b3IgYWZ0ZXIgYSBzdWNjZXNzZnVsIHdyaXRlIG9wZXJhdGlvbi5cclxuICAgICAqIFVzZXMgUkVGUkVTSF9NQVAgdG8gZGV0ZXJtaW5lIHJlZnJlc2ggdHlwZS4gTmV2ZXIgdGhyb3dzIOKAlCByZWZyZXNoXHJcbiAgICAgKiBmYWlsdXJlcyBhcmUgcmVwb3J0ZWQgYXMgd2FybmluZ3MsIG5vdCBlcnJvcnMuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgYXV0b1JlZnJlc2godG9vbE5hbWU6IHN0cmluZywgYWN0aW9uOiBzdHJpbmcsIHJlc3VsdDogVG9vbFJlc3BvbnNlKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgY29uc3Qga2V5ID0gYCR7dG9vbE5hbWV9LiR7YWN0aW9ufWA7XHJcbiAgICAgICAgY29uc3QgcmVmcmVzaFR5cGUgPSBNQ1BTZXJ2ZXIuUkVGUkVTSF9NQVBba2V5XTtcclxuICAgICAgICBpZiAoIXJlZnJlc2hUeXBlIHx8ICFyZXN1bHQuc3VjY2VzcykgcmV0dXJuO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAocmVmcmVzaFR5cGUgPT09ICdzY2VuZScpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NvZnQtcmVsb2FkJyk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVmcmVzaFR5cGUgPT09ICdhc3NldCcpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3JlZnJlc2gtYXNzZXQnLCAnZGI6Ly9hc3NldHMnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXN1bHQucmVmcmVzaGVkID0gcmVmcmVzaFR5cGU7XHJcbiAgICAgICAgICAgIHRoaXMubG9nKGBbTUNQXSBBdXRvLXJlZnJlc2hlZDogJHtyZWZyZXNoVHlwZX1gKTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXN1bHQucmVmcmVzaFdhcm5pbmcgPSBgQXV0by1yZWZyZXNoIGZhaWxlZDogJHtlcnIubWVzc2FnZX1gO1xyXG4gICAgICAgICAgICB0aGlzLmxvZyhgW01DUF0gQXV0by1yZWZyZXNoIHdhcm5pbmc6ICR7ZXJyLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBMb2dnaW5nID09PVxyXG5cclxuICAgIHByaXZhdGUgbG9nKG1zZzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuZW5hYmxlRGVidWdMb2cpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cobXNnKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vID09PSBKU09OIEZpeCBIZWxwZXIgPT09XHJcblxyXG5mdW5jdGlvbiBmaXhDb21tb25Kc29uSXNzdWVzKGlucHV0OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgbGV0IGZpeGVkID0gaW5wdXQ7XHJcbiAgICAvLyBSZW1vdmUgdHJhaWxpbmcgY29tbWFzIGJlZm9yZSB9IG9yIF1cclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvLFxccyooW31cXF1dKS9nLCAnJDEnKTtcclxuICAgIC8vIFJlcGxhY2Ugc2luZ2xlIHF1b3RlcyB3aXRoIGRvdWJsZSBxdW90ZXMgKG91dHNpZGUgb2Ygc3RyaW5ncylcclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvJy9nLCAnXCInKTtcclxuICAgIC8vIEVzY2FwZSB1bmVzY2FwZWQgbmV3bGluZXNcclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvXFxuL2csICdcXFxcbicpO1xyXG4gICAgZml4ZWQgPSBmaXhlZC5yZXBsYWNlKC9cXHIvZywgJ1xcXFxyJyk7XHJcbiAgICBmaXhlZCA9IGZpeGVkLnJlcGxhY2UoL1xcdC9nLCAnXFxcXHQnKTtcclxuICAgIHJldHVybiBmaXhlZDtcclxufVxyXG4iXX0=