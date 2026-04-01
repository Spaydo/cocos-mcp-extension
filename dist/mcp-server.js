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
    broadcast: 'Broadcast message monitoring (listen, log, filter)',
    file_editor: 'Project file editing (insert, delete, replace, query text)',
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
    // Asset advanced operations
    'asset.save_meta': 'asset',
    'asset.batch_import': 'asset',
    'asset.batch_delete': 'asset',
    // Node clipboard operations
    'node.paste': 'scene',
    'node.cut': 'scene',
    'node.create_primitive': 'scene',
    // Scene undo operations
    'scene.end_recording': 'scene',
    'scene.move_array_element': 'scene',
    'scene.remove_array_element': 'scene',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUc3QixNQUFNLFdBQVcsR0FBRztJQUNoQixJQUFJLEVBQUUscUJBQXFCO0lBQzNCLE9BQU8sRUFBRSxPQUFPO0NBQ25CLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQztBQUV0QyxNQUFhLFNBQVM7SUFRbEIsWUFBWSxRQUEyQjtRQVAvQixlQUFVLEdBQXVCLElBQUksQ0FBQztRQUV0QyxVQUFLLEdBQWlDLEVBQUUsQ0FBQztRQUN6QyxjQUFTLEdBQXFCLEVBQUUsQ0FBQztRQUNqQyxnQkFBVyxHQUFXLENBQUMsQ0FBQztRQUN4QixtQkFBYyxHQUFZLEtBQUssQ0FBQztRQUdwQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUN6QixJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQyxjQUFjLENBQUM7SUFDbEQsQ0FBQztJQUVELDRCQUE0QjtJQUU1QixvQkFBb0IsQ0FBQyxRQUFnQixFQUFFLFFBQXNCO1FBQ3pELElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDO0lBQ3BDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsVUFBVTtRQUNOLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO1FBQ3JCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLElBQUksRUFBRSxDQUFDO1FBQzFELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxJQUFJLEVBQUUsQ0FBQztRQUV0RCxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLElB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QUFvQixFQUFFLE9BQU87SUFFN0IsNEJBQTRCO0lBQzVCLFlBQVksRUFBRSxPQUFPO0lBQ3JCLFVBQVUsRUFBRSxPQUFPO0lBQ25CLHVCQUF1QixFQUFFLE9BQU87SUFFaEMsd0JBQXdCO0lBQ3hCLHFCQUFxQixFQUFFLE9BQU87SUFDOUIsMEJBQTBCLEVBQUUsT0FBTztJQUNuQyw0QkFBNEIsRUFBRSxPQUFPO0NBQ3hDLEFBMUR5QixDQTBEeEI7QUEwREYsMERBQTBEO0FBRTNDLHlCQUFlLEdBQUcsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsWUFBWSxDQUFDLEFBQXRGLENBQXVGO0FBeVd6SCwwQkFBMEI7QUFFMUIsU0FBUyxtQkFBbUIsQ0FBQyxLQUFhO0lBQ3RDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNsQix1Q0FBdUM7SUFDdkMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzVDLGdFQUFnRTtJQUNoRSxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDakMsNEJBQTRCO0lBQzVCLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDcEMsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLE9BQU8sS0FBSyxDQUFDO0FBQ2pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xyXG5pbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIE1DUFNlcnZlclNldHRpbmdzIH0gZnJvbSAnLi90eXBlcyc7XHJcblxyXG5jb25zdCBTRVJWRVJfSU5GTyA9IHtcclxuICAgIG5hbWU6ICdjb2Nvcy1tY3AtZXh0ZW5zaW9uJyxcclxuICAgIHZlcnNpb246ICcxLjAuMCcsXHJcbn07XHJcblxyXG5jb25zdCBQUk9UT0NPTF9WRVJTSU9OID0gJzIwMjQtMTEtMDUnO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1DUFNlcnZlciB7XHJcbiAgICBwcml2YXRlIGh0dHBTZXJ2ZXI6IGh0dHAuU2VydmVyIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncztcclxuICAgIHByaXZhdGUgdG9vbHM6IFJlY29yZDxzdHJpbmcsIFRvb2xFeGVjdXRvcj4gPSB7fTtcclxuICAgIHByaXZhdGUgdG9vbHNMaXN0OiBUb29sRGVmaW5pdGlvbltdID0gW107XHJcbiAgICBwcml2YXRlIGFjdGlvbkNvdW50OiBudW1iZXIgPSAwO1xyXG4gICAgcHJpdmF0ZSBlbmFibGVEZWJ1Z0xvZzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKHNldHRpbmdzOiBNQ1BTZXJ2ZXJTZXR0aW5ncykge1xyXG4gICAgICAgIHRoaXMuc2V0dGluZ3MgPSBzZXR0aW5ncztcclxuICAgICAgICB0aGlzLmVuYWJsZURlYnVnTG9nID0gc2V0dGluZ3MuZW5hYmxlRGVidWdMb2c7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFRvb2wgUmVnaXN0cmF0aW9uID09PVxyXG5cclxuICAgIHJlZ2lzdGVyVG9vbENhdGVnb3J5KGNhdGVnb3J5OiBzdHJpbmcsIGV4ZWN1dG9yOiBUb29sRXhlY3V0b3IpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnRvb2xzW2NhdGVnb3J5XSA9IGV4ZWN1dG9yO1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQnVpbGQgY29uc29saWRhdGVkIHRvb2wgbGlzdDogb25lIE1DUCB0b29sIHBlciBjYXRlZ29yeSB3aXRoIGFjdGlvbiBwYXJhbWV0ZXIuXHJcbiAgICAgKiBBSSBzZWVzIDExIHRvb2xzIGluc3RlYWQgb2YgODcsIHNhdmluZyB+NTAlIHRva2VucyBvbiB0b29sIGRlZmluaXRpb25zLlxyXG4gICAgICogUGVyLXRvb2wgc2V0dGluZ3MgZmlsdGVyIGluZGl2aWR1YWwgYWN0aW9ucyB3aXRoaW4gZWFjaCBjYXRlZ29yeS5cclxuICAgICAqL1xyXG4gICAgc2V0dXBUb29scygpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnRvb2xzTGlzdCA9IFtdO1xyXG4gICAgICAgIHRoaXMuYWN0aW9uQ291bnQgPSAwO1xyXG4gICAgICAgIGNvbnN0IGVuYWJsZWRDYXRzID0gdGhpcy5zZXR0aW5ncy5lbmFibGVkQ2F0ZWdvcmllcyB8fCB7fTtcclxuICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0aGlzLnNldHRpbmdzLmVuYWJsZWRUb29scyB8fCB7fTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBbY2F0ZWdvcnksIGV4ZWN1dG9yXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnRvb2xzKSkge1xyXG4gICAgICAgICAgICAvLyBTa2lwIGVudGlyZWx5IGRpc2FibGVkIGNhdGVnb3JpZXNcclxuICAgICAgICAgICAgaWYgKGVuYWJsZWRDYXRzW2NhdGVnb3J5XSA9PT0gZmFsc2UpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYWxsVG9vbHMgPSBleGVjdXRvci5nZXRUb29scygpO1xyXG5cclxuICAgICAgICAgICAgLy8gRmlsdGVyIGJ5IHBlci10b29sIHNldHRpbmdzXHJcbiAgICAgICAgICAgIGNvbnN0IGFjdGl2ZVRvb2xzID0gYWxsVG9vbHMuZmlsdGVyKHRvb2wgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbE5hbWUgPSBgJHtjYXRlZ29yeX1fJHt0b29sLm5hbWV9YDtcclxuICAgICAgICAgICAgICAgIHJldHVybiBlbmFibGVkVG9vbHNbZnVsbE5hbWVdICE9PSB1bmRlZmluZWRcclxuICAgICAgICAgICAgICAgICAgICA/IGVuYWJsZWRUb29sc1tmdWxsTmFtZV1cclxuICAgICAgICAgICAgICAgICAgICA6IHRydWU7IC8vIGVuYWJsZWQgYnkgZGVmYXVsdCB3aXRoaW4gYW4gZW5hYmxlZCBjYXRlZ29yeVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChhY3RpdmVUb29scy5sZW5ndGggPT09IDApIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hY3Rpb25Db3VudCArPSBhY3RpdmVUb29scy5sZW5ndGg7XHJcblxyXG4gICAgICAgICAgICAvLyBCdWlsZCBvbmUgY29uc29saWRhdGVkIE1DUCB0b29sIHBlciBjYXRlZ29yeVxyXG4gICAgICAgICAgICB0aGlzLnRvb2xzTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IGNhdGVnb3J5LFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHRoaXMuYnVpbGREZXNjcmlwdGlvbihjYXRlZ29yeSwgYWN0aXZlVG9vbHMpLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHRoaXMuYnVpbGRTY2hlbWEoYWN0aXZlVG9vbHMpLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubG9nKGBUb29scyByZWdpc3RlcmVkOiAke3RoaXMudG9vbHNMaXN0Lmxlbmd0aH0gY2F0ZWdvcmllcywgJHt0aGlzLmFjdGlvbkNvdW50fSBhY3Rpb25zYCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IENvbnNvbGlkYXRlZCBUb29sIERlc2NyaXB0aW9uID09PVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIENBVEVHT1JZX0RFU0NSSVBUSU9OUzogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgICBzY2VuZTogJ1NjZW5lIG1hbmFnZW1lbnQgKG9wZW4sIHNhdmUsIHF1ZXJ5IGhpZXJhcmNoeSwgZXRjLiknLFxyXG4gICAgICAgIG5vZGU6ICdOb2RlL0dhbWVPYmplY3Qgb3BlcmF0aW9ucyAoY3JlYXRlLCBkZWxldGUsIHRyYW5zZm9ybSwgZXRjLiknLFxyXG4gICAgICAgIGNvbXBvbmVudDogJ0NvbXBvbmVudCBtYW5hZ2VtZW50IChhZGQsIHJlbW92ZSwgcXVlcnksIHNldCBwcm9wZXJ0aWVzLCBldGMuKScsXHJcbiAgICAgICAgYXNzZXQ6ICdBc3NldCBkYXRhYmFzZSBvcGVyYXRpb25zIChxdWVyeSwgY3JlYXRlLCBpbXBvcnQsIGRlcGVuZGVuY2llcywgZXRjLiknLFxyXG4gICAgICAgIHByZWZhYjogJ1ByZWZhYiBvcGVyYXRpb25zIChxdWVyeSwgbGlzdCwgaW5zdGFudGlhdGUsIGNyZWF0ZSwgcmVzdG9yZSknLFxyXG4gICAgICAgIHByb2plY3Q6ICdQcm9qZWN0LWxldmVsIG9wZXJhdGlvbnMgKGluZm8sIGJ1aWxkLCBwcmV2aWV3LCBjb25maWcpJyxcclxuICAgICAgICBkZWJ1ZzogJ0RlYnVnZ2luZyB1dGlsaXRpZXMgKGxvZ3MsIHNjcmlwdCBleGVjdXRpb24pJyxcclxuICAgICAgICBzY2VuZV92aWV3OiAnU2NlbmUgdmlldyBjb250cm9scyAoZ2l6bW8sIGNhbWVyYSwgZ3JpZCwgdmlldyBtb2RlKScsXHJcbiAgICAgICAgZWRpdG9yOiAnRWRpdG9yIGVudmlyb25tZW50IChwcmVmZXJlbmNlcywgaW5mbywgZGV2aWNlcyknLFxyXG4gICAgICAgIHJlZmVyZW5jZV9pbWFnZTogJ1JlZmVyZW5jZSBpbWFnZSBvdmVybGF5IG1hbmFnZW1lbnQnLFxyXG4gICAgICAgIGFuaW1hdGlvbjogJ0FuaW1hdGlvbiBwbGF5YmFjayBjb250cm9sJyxcclxuICAgICAgICB2YWxpZGF0aW9uOiAnU2NlbmUgdmFsaWRhdGlvbiBhbmQgaGVhbHRoIGNoZWNraW5nJyxcclxuICAgICAgICBicm9hZGNhc3Q6ICdCcm9hZGNhc3QgbWVzc2FnZSBtb25pdG9yaW5nIChsaXN0ZW4sIGxvZywgZmlsdGVyKScsXHJcbiAgICAgICAgZmlsZV9lZGl0b3I6ICdQcm9qZWN0IGZpbGUgZWRpdGluZyAoaW5zZXJ0LCBkZWxldGUsIHJlcGxhY2UsIHF1ZXJ5IHRleHQpJyxcclxuICAgIH07XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgUkVGUkVTSF9NQVA6IFJlY29yZDxzdHJpbmcsICdzY2VuZScgfCAnYXNzZXQnPiA9IHtcclxuICAgICAgICAvLyBOb2RlIG9wZXJhdGlvbnNcclxuICAgICAgICAnbm9kZS5jcmVhdGUnOiAnc2NlbmUnLFxyXG4gICAgICAgICdub2RlLmRlbGV0ZSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ25vZGUuc2V0X3Byb3BlcnR5JzogJ3NjZW5lJyxcclxuICAgICAgICAnbm9kZS5kdXBsaWNhdGUnOiAnc2NlbmUnLFxyXG4gICAgICAgICdub2RlLnJlc2V0X3RyYW5zZm9ybSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ25vZGUubW92ZSc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIENvbXBvbmVudCBvcGVyYXRpb25zXHJcbiAgICAgICAgJ2NvbXBvbmVudC5hZGQnOiAnc2NlbmUnLFxyXG4gICAgICAgICdjb21wb25lbnQucmVtb3ZlJzogJ3NjZW5lJyxcclxuICAgICAgICAnY29tcG9uZW50LnNldF9wcm9wZXJ0eSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ2NvbXBvbmVudC5yZXNldCc6ICdzY2VuZScsXHJcbiAgICAgICAgJ2NvbXBvbmVudC5leGVjdXRlX21ldGhvZCc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIEFuaW1hdGlvbiBvcGVyYXRpb25zXHJcbiAgICAgICAgJ2FuaW1hdGlvbi5wbGF5JzogJ3NjZW5lJyxcclxuICAgICAgICAnYW5pbWF0aW9uLnN0b3AnOiAnc2NlbmUnLFxyXG4gICAgICAgICdhbmltYXRpb24uc2V0X2NsaXAnOiAnc2NlbmUnLFxyXG5cclxuICAgICAgICAvLyBEZWJ1ZyAoc2NyaXB0IGV4ZWN1dGlvbiBtYXkgbW9kaWZ5IHNjZW5lKVxyXG4gICAgICAgICdkZWJ1Zy5leGVjdXRlX3NjcmlwdCc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIFByZWZhYiBvcGVyYXRpb25zIChzY2VuZSlcclxuICAgICAgICAncHJlZmFiLmluc3RhbnRpYXRlJzogJ3NjZW5lJyxcclxuICAgICAgICAncHJlZmFiLnJlc3RvcmUnOiAnc2NlbmUnLFxyXG5cclxuICAgICAgICAvLyBBc3NldCBvcGVyYXRpb25zXHJcbiAgICAgICAgJ2Fzc2V0LmNyZWF0ZSc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0LmRlbGV0ZSc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0Lm1vdmUnOiAnYXNzZXQnLFxyXG4gICAgICAgICdhc3NldC5pbXBvcnQnOiAnYXNzZXQnLFxyXG4gICAgICAgICdhc3NldC5jb3B5JzogJ2Fzc2V0JyxcclxuICAgICAgICAnYXNzZXQuc2F2ZSc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0LnJlaW1wb3J0JzogJ2Fzc2V0JyxcclxuXHJcbiAgICAgICAgLy8gUHJlZmFiIG9wZXJhdGlvbnMgKGFzc2V0KVxyXG4gICAgICAgICdwcmVmYWIuY3JlYXRlJzogJ2Fzc2V0JyxcclxuICAgICAgICAncHJlZmFiLmNyZWF0ZV9lbXB0eSc6ICdhc3NldCcsXHJcblxyXG4gICAgICAgIC8vIFNjZW5lIG9wZXJhdGlvbnNcclxuICAgICAgICAnc2NlbmUuY3JlYXRlJzogJ2Fzc2V0JyxcclxuXHJcbiAgICAgICAgLy8gQXNzZXQgYWR2YW5jZWQgb3BlcmF0aW9uc1xyXG4gICAgICAgICdhc3NldC5zYXZlX21ldGEnOiAnYXNzZXQnLFxyXG4gICAgICAgICdhc3NldC5iYXRjaF9pbXBvcnQnOiAnYXNzZXQnLFxyXG4gICAgICAgICdhc3NldC5iYXRjaF9kZWxldGUnOiAnYXNzZXQnLFxyXG5cclxuICAgICAgICAvLyBOb2RlIGNsaXBib2FyZCBvcGVyYXRpb25zXHJcbiAgICAgICAgJ25vZGUucGFzdGUnOiAnc2NlbmUnLFxyXG4gICAgICAgICdub2RlLmN1dCc6ICdzY2VuZScsXHJcbiAgICAgICAgJ25vZGUuY3JlYXRlX3ByaW1pdGl2ZSc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIFNjZW5lIHVuZG8gb3BlcmF0aW9uc1xyXG4gICAgICAgICdzY2VuZS5lbmRfcmVjb3JkaW5nJzogJ3NjZW5lJyxcclxuICAgICAgICAnc2NlbmUubW92ZV9hcnJheV9lbGVtZW50JzogJ3NjZW5lJyxcclxuICAgICAgICAnc2NlbmUucmVtb3ZlX2FycmF5X2VsZW1lbnQnOiAnc2NlbmUnLFxyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIGJ1aWxkRGVzY3JpcHRpb24oY2F0ZWdvcnk6IHN0cmluZywgdG9vbHM6IFRvb2xEZWZpbml0aW9uW10pOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IGNhdERlc2MgPSBNQ1BTZXJ2ZXIuQ0FURUdPUllfREVTQ1JJUFRJT05TW2NhdGVnb3J5XSB8fCBjYXRlZ29yeTtcclxuICAgICAgICBsZXQgZGVzYyA9IGAke2NhdERlc2N9XFxuXFxuQWN0aW9uczpcXG5gO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgdG9vbHMpIHtcclxuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gdGhpcy5mb3JtYXRBY3Rpb25QYXJhbXModG9vbC5pbnB1dFNjaGVtYSk7XHJcbiAgICAgICAgICAgIGRlc2MgKz0gcGFyYW1zXHJcbiAgICAgICAgICAgICAgICA/IGAtICR7dG9vbC5uYW1lfTogJHt0b29sLmRlc2NyaXB0aW9ufSAoJHtwYXJhbXN9KVxcbmBcclxuICAgICAgICAgICAgICAgIDogYC0gJHt0b29sLm5hbWV9OiAke3Rvb2wuZGVzY3JpcHRpb259XFxuYDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBkZXNjLnRyaW0oKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGZvcm1hdEFjdGlvblBhcmFtcyhzY2hlbWE6IFRvb2xEZWZpbml0aW9uWydpbnB1dFNjaGVtYSddKTogc3RyaW5nIHtcclxuICAgICAgICBjb25zdCBwcm9wcyA9IHNjaGVtYS5wcm9wZXJ0aWVzIHx8IHt9O1xyXG4gICAgICAgIGNvbnN0IHJlcXVpcmVkID0gc2NoZW1hLnJlcXVpcmVkIHx8IFtdO1xyXG5cclxuICAgICAgICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IFtuYW1lLCBkZWZdIG9mIE9iamVjdC5lbnRyaWVzKHByb3BzKSkge1xyXG4gICAgICAgICAgICBjb25zdCBpc1JlcSA9IHJlcXVpcmVkLmluY2x1ZGVzKG5hbWUpO1xyXG4gICAgICAgICAgICBjb25zdCB0eXBlID0gZGVmLnR5cGUgfHwgJ2FueSc7XHJcbiAgICAgICAgICAgIHBhcnRzLnB1c2goYCR7bmFtZX0ke2lzUmVxID8gJycgOiAnPyd9OiAke3R5cGV9YCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcGFydHMuam9pbignLCAnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gQ29uc29saWRhdGVkIFRvb2wgU2NoZW1hID09PVxyXG5cclxuICAgIHByaXZhdGUgYnVpbGRTY2hlbWEodG9vbHM6IFRvb2xEZWZpbml0aW9uW10pOiBUb29sRGVmaW5pdGlvblsnaW5wdXRTY2hlbWEnXSB7XHJcbiAgICAgICAgY29uc3QgYWN0aW9uRW51bSA9IHRvb2xzLm1hcCh0ID0+IHQubmFtZSk7XHJcbiAgICAgICAgY29uc3QgbWVyZ2VkUHJvcHM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICAgICAgIGFjdGlvbjoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICBlbnVtOiBhY3Rpb25FbnVtLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdUaGUgYWN0aW9uIHRvIHBlcmZvcm0nLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiB0b29scykge1xyXG4gICAgICAgICAgICBjb25zdCBwcm9wcyA9IHRvb2wuaW5wdXRTY2hlbWEucHJvcGVydGllcyB8fCB7fTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBbcHJvcE5hbWUsIHByb3BEZWZdIG9mIE9iamVjdC5lbnRyaWVzKHByb3BzKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFtZXJnZWRQcm9wc1twcm9wTmFtZV0pIHtcclxuICAgICAgICAgICAgICAgICAgICBtZXJnZWRQcm9wc1twcm9wTmFtZV0gPSB7IC4uLnByb3BEZWYgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IG1lcmdlZFByb3BzLFxyXG4gICAgICAgICAgICByZXF1aXJlZDogWydhY3Rpb24nXSxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIEluZm8gZm9yIFBhbmVsIFVJIChwZXItYWN0aW9uIGdyYW51bGFyaXR5KSA9PT1cclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBDT1JFX0NBVEVHT1JJRVMgPSBbJ3NjZW5lJywgJ25vZGUnLCAnY29tcG9uZW50JywgJ2Fzc2V0JywgJ3ByZWZhYicsICdwcm9qZWN0JywgJ2RlYnVnJywgJ3ZhbGlkYXRpb24nXTtcclxuXHJcbiAgICBnZXRBbGxUb29sc0luZm8oKTogeyBjYXRlZ29yeTogc3RyaW5nOyBpc0NvcmU6IGJvb2xlYW47IHRvb2xzOiB7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb246IHN0cmluZzsgZW5hYmxlZDogYm9vbGVhbiB9W10gfVtdIHtcclxuICAgICAgICBjb25zdCBlbmFibGVkQ2F0cyA9IHRoaXMuc2V0dGluZ3MuZW5hYmxlZENhdGVnb3JpZXMgfHwge307XHJcbiAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xzID0gdGhpcy5zZXR0aW5ncy5lbmFibGVkVG9vbHMgfHwge307XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5lbnRyaWVzKHRoaXMudG9vbHMpLm1hcCgoW2NhdGVnb3J5LCBleGVjdXRvcl0pID0+ICh7XHJcbiAgICAgICAgICAgIGNhdGVnb3J5LFxyXG4gICAgICAgICAgICBpc0NvcmU6IE1DUFNlcnZlci5DT1JFX0NBVEVHT1JJRVMuaW5jbHVkZXMoY2F0ZWdvcnkpLFxyXG4gICAgICAgICAgICB0b29sczogZXhlY3V0b3IuZ2V0VG9vbHMoKS5tYXAodG9vbCA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmdWxsTmFtZSA9IGAke2NhdGVnb3J5fV8ke3Rvb2wubmFtZX1gO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5hYmxlZCA9IGVuYWJsZWRUb29sc1tmdWxsTmFtZV0gIT09IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgICAgID8gZW5hYmxlZFRvb2xzW2Z1bGxOYW1lXVxyXG4gICAgICAgICAgICAgICAgICAgIDogZW5hYmxlZENhdHNbY2F0ZWdvcnldICE9PSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IGZ1bGxOYW1lLCBkZXNjcmlwdGlvbjogdG9vbC5kZXNjcmlwdGlvbiwgZW5hYmxlZCB9O1xyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFNlcnZlciBMaWZlY3ljbGUgPT09XHJcblxyXG4gICAgc3RhcnQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldHVwVG9vbHMoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IGh0dHAuY3JlYXRlU2VydmVyKHRoaXMuaGFuZGxlSHR0cFJlcXVlc3QuYmluZCh0aGlzKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIub24oJ2Vycm9yJywgKGVycjogTm9kZUpTLkVycm5vRXhjZXB0aW9uKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT09ICdFQUREUklOVVNFJykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYFtNQ1BdIFBvcnQgJHt0aGlzLnNldHRpbmdzLnBvcnR9IGlzIGFscmVhZHkgaW4gdXNlYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBQb3J0ICR7dGhpcy5zZXR0aW5ncy5wb3J0fSBpcyBhbHJlYWR5IGluIHVzZWApKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW01DUF0gU2VydmVyIGVycm9yOicsIGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyLmxpc3Rlbih0aGlzLnNldHRpbmdzLnBvcnQsICcxMjcuMC4wLjEnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW01DUF0gU2VydmVyIHN0YXJ0ZWQgb24gaHR0cDovLzEyNy4wLjAuMToke3RoaXMuc2V0dGluZ3MucG9ydH0vbWNwYCk7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHN0b3AoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xyXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIuY2xvc2UoKTtcclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gbnVsbDtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1tNQ1BdIFNlcnZlciBzdG9wcGVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlzUnVubmluZygpOiBib29sZWFuIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5odHRwU2VydmVyICE9PSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGdldFRvb2xDb3VudCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnRvb2xzTGlzdC5sZW5ndGg7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0QWN0aW9uQ291bnQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5hY3Rpb25Db3VudDtcclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVTZXR0aW5ncyhzZXR0aW5nczogTUNQU2VydmVyU2V0dGluZ3MpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzID0gc2V0dGluZ3M7XHJcbiAgICAgICAgdGhpcy5lbmFibGVEZWJ1Z0xvZyA9IHNldHRpbmdzLmVuYWJsZURlYnVnTG9nO1xyXG4gICAgICAgIC8vIFJlYnVpbGQgdG9vbCBsaXN0IHdoZW4gY2F0ZWdvcmllcyBjaGFuZ2VcclxuICAgICAgICB0aGlzLnNldHVwVG9vbHMoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSFRUUCBSZXF1ZXN0IEhhbmRsaW5nID09PVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSHR0cFJlcXVlc3QocmVxOiBodHRwLkluY29taW5nTWVzc2FnZSwgcmVzOiBodHRwLlNlcnZlclJlc3BvbnNlKTogdm9pZCB7XHJcbiAgICAgICAgLy8gQ09SUyBoZWFkZXJzXHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJywgJ0dFVCwgUE9TVCwgT1BUSU9OUycpO1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnLCAnQ29udGVudC1UeXBlLCBBdXRob3JpemF0aW9uJyk7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuXHJcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdPUFRJT05TJykge1xyXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybCB8fCAnJztcclxuXHJcbiAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnICYmIHVybCA9PT0gJy9oZWFsdGgnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlSGVhbHRoKHJlcyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcgJiYgdXJsID09PSAnL21jcCcpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVNQ1AocmVxLCByZXMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDA0KTtcclxuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTm90IGZvdW5kJyB9KSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlSGVhbHRoKHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xyXG4gICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgc3RhdHVzOiAnb2snLFxyXG4gICAgICAgICAgICB0b29sczogdGhpcy50b29sc0xpc3QubGVuZ3RoLFxyXG4gICAgICAgICAgICBhY3Rpb25zOiB0aGlzLmFjdGlvbkNvdW50LFxyXG4gICAgICAgICAgICBzZXJ2ZXI6IFNFUlZFUl9JTkZPLFxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZU1DUChyZXE6IGh0dHAuSW5jb21pbmdNZXNzYWdlLCByZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcclxuICAgICAgICBsZXQgYm9keSA9ICcnO1xyXG4gICAgICAgIHJlcS5vbignZGF0YScsIChjaHVuazogQnVmZmVyKSA9PiB7IGJvZHkgKz0gY2h1bmsudG9TdHJpbmcoKTsgfSk7XHJcbiAgICAgICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWVzc2FnZTogYW55O1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gSlNPTi5wYXJzZShib2R5KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRyeSBmaXhpbmcgY29tbW9uIEpTT04gaXNzdWVzIGZyb20gQUkgY2xpZW50c1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGZpeENvbW1vbkpzb25Jc3N1ZXMoYm9keSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjcwMCwgbWVzc2FnZTogJ1BhcnNlIGVycm9yJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5oYW5kbGVNZXNzYWdlKG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeShyZXN1bHQpKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjYwMywgbWVzc2FnZTogZXJyLm1lc3NhZ2UgfSxcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBKU09OLVJQQyAyLjAgTWVzc2FnZSBIYW5kbGluZyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGhhbmRsZU1lc3NhZ2UobWVzc2FnZTogYW55KTogUHJvbWlzZTxhbnk+IHtcclxuICAgICAgICBjb25zdCB7IGlkLCBtZXRob2QsIHBhcmFtcyB9ID0gbWVzc2FnZTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2coYFtNQ1BdIOKGkiAke21ldGhvZH1gKTtcclxuXHJcbiAgICAgICAgc3dpdGNoIChtZXRob2QpIHtcclxuICAgICAgICAgICAgY2FzZSAnaW5pdGlhbGl6ZSc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm90b2NvbFZlcnNpb246IFBST1RPQ09MX1ZFUlNJT04sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcGFiaWxpdGllczogeyB0b29sczoge30gfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2VydmVySW5mbzogU0VSVkVSX0lORk8sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICdub3RpZmljYXRpb25zL2luaXRpYWxpemVkJzpcclxuICAgICAgICAgICAgICAgIC8vIENsaWVudCBub3RpZmljYXRpb24sIG5vIHJlc3BvbnNlIG5lZWRlZFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsganNvbnJwYzogJzIuMCcsIGlkLCByZXN1bHQ6IHt9IH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICd0b29scy9saXN0JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvb2xzOiB0aGlzLnRvb2xzTGlzdC5tYXAodCA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogdC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHQuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogdC5pbnB1dFNjaGVtYSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSkpLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAndG9vbHMvY2FsbCc6IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2xOYW1lID0gcGFyYW1zPy5uYW1lO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXJncyA9IHBhcmFtcz8uYXJndW1lbnRzIHx8IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghdG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjYwMiwgbWVzc2FnZTogJ01pc3NpbmcgdG9vbCBuYW1lJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmV4ZWN1dGVUb29sQ2FsbCh0b29sTmFtZSwgYXJncyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFt7IHR5cGU6ICd0ZXh0JywgdGV4dDogSlNPTi5zdHJpbmdpZnkocmVzdWx0KSB9XSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSkgfV0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0Vycm9yOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgIGlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiB7IGNvZGU6IC0zMjYwMSwgbWVzc2FnZTogYFVua25vd24gbWV0aG9kOiAke21ldGhvZH1gIH0sXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gVG9vbCBFeGVjdXRpb24gPT09XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlVG9vbENhbGwodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICAvLyBDb25zb2xpZGF0ZWQgYXBwcm9hY2g6IHRvb2wgbmFtZSA9IGNhdGVnb3J5LCBhY3Rpb24gaW4gYXJnc1xyXG4gICAgICAgIGNvbnN0IGV4ZWN1dG9yID0gdGhpcy50b29sc1t0b29sTmFtZV07XHJcbiAgICAgICAgaWYgKCFleGVjdXRvcikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdG9vbDogJHt0b29sTmFtZX1gKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGFjdGlvbiA9IGFyZ3M/LmFjdGlvbjtcclxuICAgICAgICBpZiAoIWFjdGlvbikge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgXCJhY3Rpb25cIiBwYXJhbWV0ZXIgZm9yIHRvb2wgXCIke3Rvb2xOYW1lfVwiLiBDaGVjayBhdmFpbGFibGUgYWN0aW9ucyBpbiB0aGUgdG9vbCBkZXNjcmlwdGlvbi5gKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFZhbGlkYXRlIGFyZ3VtZW50cyBhZ2FpbnN0IHNjaGVtYVxyXG4gICAgICAgIHRoaXMudmFsaWRhdGVBcmdzKHRvb2xOYW1lLCBhY3Rpb24sIGFyZ3MpO1xyXG5cclxuICAgICAgICB0aGlzLmxvZyhgW01DUF0gRXhlY3V0aW5nOiAke3Rvb2xOYW1lfS4ke2FjdGlvbn1gKTtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBleGVjdXRvci5leGVjdXRlKGFjdGlvbiwgYXJncyk7XHJcbiAgICAgICAgdGhpcy5sb2coYFtNQ1BdIFJlc3VsdDogJHtyZXN1bHQuc3VjY2VzcyA/ICdPSycgOiAnRkFJTCd9YCk7XHJcblxyXG4gICAgICAgIC8vIEF1dG8tcmVmcmVzaCBlZGl0b3IgYWZ0ZXIgd3JpdGUgb3BlcmF0aW9uc1xyXG4gICAgICAgIGF3YWl0IHRoaXMuYXV0b1JlZnJlc2godG9vbE5hbWUsIGFjdGlvbiwgcmVzdWx0KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIFZhbGlkYXRlIHRvb2wgYXJndW1lbnRzIGFnYWluc3QgdGhlIHRvb2wncyBpbnB1dFNjaGVtYS5cclxuICAgICAqIFRocm93cyBkZXNjcmlwdGl2ZSBlcnJvcnMgZm9yIGludmFsaWQgYWN0aW9uLCBtaXNzaW5nIHJlcXVpcmVkIHBhcmFtcywgb3IgdHlwZSBtaXNtYXRjaGVzLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIHZhbGlkYXRlQXJncyhjYXRlZ29yeTogc3RyaW5nLCBhY3Rpb246IHN0cmluZywgYXJnczogYW55KTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgZXhlY3V0b3IgPSB0aGlzLnRvb2xzW2NhdGVnb3J5XTtcclxuICAgICAgICBjb25zdCBhbGxUb29scyA9IGV4ZWN1dG9yLmdldFRvb2xzKCk7XHJcbiAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xzID0gdGhpcy5zZXR0aW5ncy5lbmFibGVkVG9vbHMgfHwge307XHJcblxyXG4gICAgICAgIC8vIEZpbHRlciBieSBwZXItdG9vbCBlbmFibGUvZGlzYWJsZSBzZXR0aW5ncyAoc2FtZSBsb2dpYyBhcyBzZXR1cFRvb2xzKVxyXG4gICAgICAgIGNvbnN0IGFjdGl2ZVRvb2xzID0gYWxsVG9vbHMuZmlsdGVyKHRvb2wgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBmdWxsTmFtZSA9IGAke2NhdGVnb3J5fV8ke3Rvb2wubmFtZX1gO1xyXG4gICAgICAgICAgICByZXR1cm4gZW5hYmxlZFRvb2xzW2Z1bGxOYW1lXSAhPT0gdW5kZWZpbmVkID8gZW5hYmxlZFRvb2xzW2Z1bGxOYW1lXSA6IHRydWU7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgY29uc3QgdG9vbE5hbWVzID0gYWN0aXZlVG9vbHMubWFwKHQgPT4gdC5uYW1lKTtcclxuXHJcbiAgICAgICAgLy8gMS4gVmFsaWRhdGUgYWN0aW9uIGlzIGluIHRoZSBhbGxvd2VkIGxpc3RcclxuICAgICAgICBpZiAoIXRvb2xOYW1lcy5pbmNsdWRlcyhhY3Rpb24pKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICAgICAgICAgIGBJbnZhbGlkIGFjdGlvbiAnJHthY3Rpb259JyBmb3IgdG9vbCAnJHtjYXRlZ29yeX0nLiBBdmFpbGFibGUgYWN0aW9uczogJHt0b29sTmFtZXMuam9pbignLCAnKX1gXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyAyLiBGaW5kIG1hdGNoaW5nIHRvb2wgZGVmaW5pdGlvblxyXG4gICAgICAgIGNvbnN0IHRvb2xEZWYgPSBhY3RpdmVUb29scy5maW5kKHQgPT4gdC5uYW1lID09PSBhY3Rpb24pITtcclxuICAgICAgICBjb25zdCBzY2hlbWEgPSB0b29sRGVmLmlucHV0U2NoZW1hO1xyXG4gICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSBzY2hlbWEucHJvcGVydGllcyB8fCB7fTtcclxuICAgICAgICBjb25zdCByZXF1aXJlZCA9IHNjaGVtYS5yZXF1aXJlZCB8fCBbXTtcclxuXHJcbiAgICAgICAgLy8gMy4gQ2hlY2sgcmVxdWlyZWQgcGFyYW1ldGVyc1xyXG4gICAgICAgIGNvbnN0IG1pc3Npbmc6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgZm9yIChjb25zdCBwYXJhbU5hbWUgb2YgcmVxdWlyZWQpIHtcclxuICAgICAgICAgICAgaWYgKGFyZ3NbcGFyYW1OYW1lXSA9PT0gdW5kZWZpbmVkIHx8IGFyZ3NbcGFyYW1OYW1lXSA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbWlzc2luZy5wdXNoKHBhcmFtTmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG1pc3NpbmcubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBwYXJhbUxpc3QgPSBPYmplY3QuZW50cmllcyhwcm9wZXJ0aWVzKVxyXG4gICAgICAgICAgICAgICAgLm1hcCgoW25hbWUsIGRlZl06IFtzdHJpbmcsIGFueV0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc1JlcSA9IHJlcXVpcmVkLmluY2x1ZGVzKG5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBgJHtuYW1lfSR7aXNSZXEgPyAnJyA6ICc/J30gKCR7ZGVmLnR5cGUgfHwgJ2FueSd9KWA7XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgLmpvaW4oJywgJyk7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICAgICAgICAgIGBNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlciR7bWlzc2luZy5sZW5ndGggPiAxID8gJ3MnIDogJyd9ICcke21pc3Npbmcuam9pbihcIicsICdcIil9JyBmb3IgYWN0aW9uICcke2NhdGVnb3J5fS4ke2FjdGlvbn0nLiBFeHBlY3RlZCBwYXJhbWV0ZXJzOiAke3BhcmFtTGlzdH1gXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyA0LiBUeXBlLWNoZWNrIHByb3ZpZGVkIHBhcmFtZXRlcnNcclxuICAgICAgICBmb3IgKGNvbnN0IFtwYXJhbU5hbWUsIHBhcmFtRGVmXSBvZiBPYmplY3QuZW50cmllcyhwcm9wZXJ0aWVzKSBhcyBbc3RyaW5nLCBhbnldW10pIHtcclxuICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhcmdzW3BhcmFtTmFtZV07XHJcbiAgICAgICAgICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkVHlwZSA9IHBhcmFtRGVmLnR5cGU7XHJcbiAgICAgICAgICAgIGlmICghZXhwZWN0ZWRUeXBlKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGxldCB2YWxpZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoZXhwZWN0ZWRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdzdHJpbmcnOiAgdmFsaWQgPSB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ251bWJlcic6ICB2YWxpZCA9IHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcic7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6IHZhbGlkID0gdHlwZW9mIHZhbHVlID09PSAnYm9vbGVhbic7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzogIHZhbGlkID0gdHlwZW9mIHZhbHVlID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh2YWx1ZSk7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnYXJyYXknOiAgIHZhbGlkID0gQXJyYXkuaXNBcnJheSh2YWx1ZSk7IGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXZhbGlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgICAgICAgICAgYFR5cGUgbWlzbWF0Y2ggZm9yIHBhcmFtZXRlciAnJHtwYXJhbU5hbWV9JyBpbiBhY3Rpb24gJyR7Y2F0ZWdvcnl9LiR7YWN0aW9ufSc6IGV4cGVjdGVkICR7ZXhwZWN0ZWRUeXBlfSwgZ290ICR7QXJyYXkuaXNBcnJheSh2YWx1ZSkgPyAnYXJyYXknIDogdHlwZW9mIHZhbHVlfWBcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBdXRvbWF0aWNhbGx5IHJlZnJlc2ggdGhlIGVkaXRvciBhZnRlciBhIHN1Y2Nlc3NmdWwgd3JpdGUgb3BlcmF0aW9uLlxyXG4gICAgICogVXNlcyBSRUZSRVNIX01BUCB0byBkZXRlcm1pbmUgcmVmcmVzaCB0eXBlLiBOZXZlciB0aHJvd3Mg4oCUIHJlZnJlc2hcclxuICAgICAqIGZhaWx1cmVzIGFyZSByZXBvcnRlZCBhcyB3YXJuaW5ncywgbm90IGVycm9ycy5cclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBhdXRvUmVmcmVzaCh0b29sTmFtZTogc3RyaW5nLCBhY3Rpb246IHN0cmluZywgcmVzdWx0OiBUb29sUmVzcG9uc2UpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBjb25zdCBrZXkgPSBgJHt0b29sTmFtZX0uJHthY3Rpb259YDtcclxuICAgICAgICBjb25zdCByZWZyZXNoVHlwZSA9IE1DUFNlcnZlci5SRUZSRVNIX01BUFtrZXldO1xyXG4gICAgICAgIGlmICghcmVmcmVzaFR5cGUgfHwgIXJlc3VsdC5zdWNjZXNzKSByZXR1cm47XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChyZWZyZXNoVHlwZSA9PT0gJ3NjZW5lJykge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc29mdC1yZWxvYWQnKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWZyZXNoVHlwZSA9PT0gJ2Fzc2V0Jykge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncmVmcmVzaC1hc3NldCcsICdkYjovL2Fzc2V0cycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlc3VsdC5yZWZyZXNoZWQgPSByZWZyZXNoVHlwZTtcclxuICAgICAgICAgICAgdGhpcy5sb2coYFtNQ1BdIEF1dG8tcmVmcmVzaGVkOiAke3JlZnJlc2hUeXBlfWApO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJlc3VsdC5yZWZyZXNoV2FybmluZyA9IGBBdXRvLXJlZnJlc2ggZmFpbGVkOiAke2Vyci5tZXNzYWdlfWA7XHJcbiAgICAgICAgICAgIHRoaXMubG9nKGBbTUNQXSBBdXRvLXJlZnJlc2ggd2FybmluZzogJHtlcnIubWVzc2FnZX1gKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IExvZ2dpbmcgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBsb2cobXNnOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5lbmFibGVEZWJ1Z0xvZykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhtc2cpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuLy8gPT09IEpTT04gRml4IEhlbHBlciA9PT1cclxuXHJcbmZ1bmN0aW9uIGZpeENvbW1vbkpzb25Jc3N1ZXMoaW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBsZXQgZml4ZWQgPSBpbnB1dDtcclxuICAgIC8vIFJlbW92ZSB0cmFpbGluZyBjb21tYXMgYmVmb3JlIH0gb3IgXVxyXG4gICAgZml4ZWQgPSBmaXhlZC5yZXBsYWNlKC8sXFxzKihbfVxcXV0pL2csICckMScpO1xyXG4gICAgLy8gUmVwbGFjZSBzaW5nbGUgcXVvdGVzIHdpdGggZG91YmxlIHF1b3RlcyAob3V0c2lkZSBvZiBzdHJpbmdzKVxyXG4gICAgZml4ZWQgPSBmaXhlZC5yZXBsYWNlKC8nL2csICdcIicpO1xyXG4gICAgLy8gRXNjYXBlIHVuZXNjYXBlZCBuZXdsaW5lc1xyXG4gICAgZml4ZWQgPSBmaXhlZC5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJyk7XHJcbiAgICBmaXhlZCA9IGZpeGVkLnJlcGxhY2UoL1xcci9nLCAnXFxcXHInKTtcclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvXFx0L2csICdcXFxcdCcpO1xyXG4gICAgcmV0dXJuIGZpeGVkO1xyXG59XHJcbiJdfQ==