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
const fs_1 = require("fs");
const path_1 = require("path");
const REGISTRY_PATH = (0, path_1.join)(require('os').homedir(), '.cocos-mcp-registry.json');
function readRegistry() {
    try {
        if ((0, fs_1.existsSync)(REGISTRY_PATH)) {
            const data = JSON.parse((0, fs_1.readFileSync)(REGISTRY_PATH, 'utf-8'));
            const entries = data.instances || [];
            // Clean stale entries (PID no longer running)
            return entries.filter(e => {
                try {
                    process.kill(e.pid, 0);
                    return true;
                }
                catch (_a) {
                    return false;
                }
            });
        }
    }
    catch (_a) { }
    return [];
}
function writeRegistry(entries) {
    try {
        (0, fs_1.writeFileSync)(REGISTRY_PATH, JSON.stringify({ instances: entries }, null, 2), 'utf-8');
    }
    catch (err) {
        console.warn('[MCP] Failed to write registry:', err);
    }
}
function registerInstance(port, projectPath) {
    const entries = readRegistry().filter(e => e.projectPath !== projectPath);
    entries.push({ port, projectPath, pid: process.pid, startedAt: new Date().toISOString() });
    writeRegistry(entries);
}
function unregisterInstance() {
    const entries = readRegistry().filter(e => e.pid !== process.pid);
    writeRegistry(entries);
}
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
        this.actualPort = 0;
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
            const maxAttempts = 11; // Try configured port + 10 more
            let attempt = 0;
            const basePort = this.settings.port;
            const tryPort = (port) => {
                const server = http.createServer(this.handleHttpRequest.bind(this));
                server.on('error', (err) => {
                    if (err.code === 'EADDRINUSE' && attempt < maxAttempts - 1) {
                        attempt++;
                        const nextPort = basePort + attempt;
                        console.warn(`[MCP] Port ${port} in use, trying ${nextPort}...`);
                        tryPort(nextPort);
                    }
                    else if (err.code === 'EADDRINUSE') {
                        console.error(`[MCP] All ports ${basePort}-${basePort + maxAttempts - 1} are in use`);
                        reject(new Error(`All ports ${basePort}-${basePort + maxAttempts - 1} are in use`));
                    }
                    else {
                        console.error('[MCP] Server error:', err);
                        reject(err);
                    }
                });
                server.listen(port, '127.0.0.1', () => {
                    this.httpServer = server;
                    this.actualPort = port;
                    // Register in global registry
                    try {
                        registerInstance(port, Editor.Project.path);
                    }
                    catch (e) {
                        console.warn('[MCP] Failed to register instance:', e);
                    }
                    console.log(`[MCP] Server started on http://127.0.0.1:${port}/mcp`);
                    resolve();
                });
            };
            tryPort(basePort);
        });
    }
    stop() {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            unregisterInstance();
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
    getActualPort() {
        return this.actualPort;
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
        let projectPath = '';
        try {
            projectPath = Editor.Project.path;
        }
        catch (_a) { }
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'ok',
            tools: this.toolsList.length,
            actions: this.actionCount,
            projectPath,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLXNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NvdXJjZS9tY3Atc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QiwyQkFBNkQ7QUFDN0QsK0JBQTRCO0FBRzVCLE1BQU0sYUFBYSxHQUFHLElBQUEsV0FBSSxFQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO0FBU2hGLFNBQVMsWUFBWTtJQUNqQixJQUFJLENBQUM7UUFDRCxJQUFJLElBQUEsZUFBVSxFQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDNUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFBLGlCQUFZLEVBQUMsYUFBYSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDOUQsTUFBTSxPQUFPLEdBQW9CLElBQUksQ0FBQyxTQUFTLElBQUksRUFBRSxDQUFDO1lBQ3RELDhDQUE4QztZQUM5QyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ3RCLElBQUksQ0FBQztvQkFBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQUMsT0FBTyxJQUFJLENBQUM7Z0JBQUMsQ0FBQztnQkFBQyxXQUFNLENBQUM7b0JBQUMsT0FBTyxLQUFLLENBQUM7Z0JBQUMsQ0FBQztZQUN4RSxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUM7SUFDTCxDQUFDO0lBQUMsV0FBTSxDQUFDLENBQUEsQ0FBQztJQUNWLE9BQU8sRUFBRSxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLE9BQXdCO0lBQzNDLElBQUksQ0FBQztRQUNELElBQUEsa0JBQWEsRUFBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FB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QztJQUN2QyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDNUMsZ0VBQWdFO0lBQ2hFLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNqQyw0QkFBNEI7SUFDNUIsS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3BDLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNwQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDcEMsT0FBTyxLQUFLLENBQUM7QUFDakIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XHJcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYyB9IGZyb20gJ2ZzJztcclxuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IsIE1DUFNlcnZlclNldHRpbmdzIH0gZnJvbSAnLi90eXBlcyc7XHJcblxyXG5jb25zdCBSRUdJU1RSWV9QQVRIID0gam9pbihyZXF1aXJlKCdvcycpLmhvbWVkaXIoKSwgJy5jb2Nvcy1tY3AtcmVnaXN0cnkuanNvbicpO1xyXG5cclxuaW50ZXJmYWNlIFJlZ2lzdHJ5RW50cnkge1xyXG4gICAgcG9ydDogbnVtYmVyO1xyXG4gICAgcHJvamVjdFBhdGg6IHN0cmluZztcclxuICAgIHBpZDogbnVtYmVyO1xyXG4gICAgc3RhcnRlZEF0OiBzdHJpbmc7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYWRSZWdpc3RyeSgpOiBSZWdpc3RyeUVudHJ5W10ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBpZiAoZXhpc3RzU3luYyhSRUdJU1RSWV9QQVRIKSkge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gSlNPTi5wYXJzZShyZWFkRmlsZVN5bmMoUkVHSVNUUllfUEFUSCwgJ3V0Zi04JykpO1xyXG4gICAgICAgICAgICBjb25zdCBlbnRyaWVzOiBSZWdpc3RyeUVudHJ5W10gPSBkYXRhLmluc3RhbmNlcyB8fCBbXTtcclxuICAgICAgICAgICAgLy8gQ2xlYW4gc3RhbGUgZW50cmllcyAoUElEIG5vIGxvbmdlciBydW5uaW5nKVxyXG4gICAgICAgICAgICByZXR1cm4gZW50cmllcy5maWx0ZXIoZSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkgeyBwcm9jZXNzLmtpbGwoZS5waWQsIDApOyByZXR1cm4gdHJ1ZTsgfSBjYXRjaCB7IHJldHVybiBmYWxzZTsgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9IGNhdGNoIHt9XHJcbiAgICByZXR1cm4gW107XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdyaXRlUmVnaXN0cnkoZW50cmllczogUmVnaXN0cnlFbnRyeVtdKTogdm9pZCB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHdyaXRlRmlsZVN5bmMoUkVHSVNUUllfUEFUSCwgSlNPTi5zdHJpbmdpZnkoeyBpbnN0YW5jZXM6IGVudHJpZXMgfSwgbnVsbCwgMiksICd1dGYtOCcpO1xyXG4gICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdbTUNQXSBGYWlsZWQgdG8gd3JpdGUgcmVnaXN0cnk6JywgZXJyKTtcclxuICAgIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVnaXN0ZXJJbnN0YW5jZShwb3J0OiBudW1iZXIsIHByb2plY3RQYXRoOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGNvbnN0IGVudHJpZXMgPSByZWFkUmVnaXN0cnkoKS5maWx0ZXIoZSA9PiBlLnByb2plY3RQYXRoICE9PSBwcm9qZWN0UGF0aCk7XHJcbiAgICBlbnRyaWVzLnB1c2goeyBwb3J0LCBwcm9qZWN0UGF0aCwgcGlkOiBwcm9jZXNzLnBpZCwgc3RhcnRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkgfSk7XHJcbiAgICB3cml0ZVJlZ2lzdHJ5KGVudHJpZXMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1bnJlZ2lzdGVySW5zdGFuY2UoKTogdm9pZCB7XHJcbiAgICBjb25zdCBlbnRyaWVzID0gcmVhZFJlZ2lzdHJ5KCkuZmlsdGVyKGUgPT4gZS5waWQgIT09IHByb2Nlc3MucGlkKTtcclxuICAgIHdyaXRlUmVnaXN0cnkoZW50cmllcyk7XHJcbn1cclxuXHJcbmNvbnN0IFNFUlZFUl9JTkZPID0ge1xyXG4gICAgbmFtZTogJ2NvY29zLW1jcC1leHRlbnNpb24nLFxyXG4gICAgdmVyc2lvbjogJzEuMC4wJyxcclxufTtcclxuXHJcbmNvbnN0IFBST1RPQ09MX1ZFUlNJT04gPSAnMjAyNC0xMS0wNSc7XHJcblxyXG5leHBvcnQgY2xhc3MgTUNQU2VydmVyIHtcclxuICAgIHByaXZhdGUgaHR0cFNlcnZlcjogaHR0cC5TZXJ2ZXIgfCBudWxsID0gbnVsbDtcclxuICAgIHByaXZhdGUgc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzO1xyXG4gICAgcHJpdmF0ZSB0b29sczogUmVjb3JkPHN0cmluZywgVG9vbEV4ZWN1dG9yPiA9IHt9O1xyXG4gICAgcHJpdmF0ZSB0b29sc0xpc3Q6IFRvb2xEZWZpbml0aW9uW10gPSBbXTtcclxuICAgIHByaXZhdGUgYWN0aW9uQ291bnQ6IG51bWJlciA9IDA7XHJcbiAgICBwcml2YXRlIGVuYWJsZURlYnVnTG9nOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBwcml2YXRlIGFjdHVhbFBvcnQ6IG51bWJlciA9IDA7XHJcblxyXG4gICAgY29uc3RydWN0b3Ioc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xyXG4gICAgICAgIHRoaXMuZW5hYmxlRGVidWdMb2cgPSBzZXR0aW5ncy5lbmFibGVEZWJ1Z0xvZztcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gVG9vbCBSZWdpc3RyYXRpb24gPT09XHJcblxyXG4gICAgcmVnaXN0ZXJUb29sQ2F0ZWdvcnkoY2F0ZWdvcnk6IHN0cmluZywgZXhlY3V0b3I6IFRvb2xFeGVjdXRvcik6IHZvaWQge1xyXG4gICAgICAgIHRoaXMudG9vbHNbY2F0ZWdvcnldID0gZXhlY3V0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBCdWlsZCBjb25zb2xpZGF0ZWQgdG9vbCBsaXN0OiBvbmUgTUNQIHRvb2wgcGVyIGNhdGVnb3J5IHdpdGggYWN0aW9uIHBhcmFtZXRlci5cclxuICAgICAqIEFJIHNlZXMgMTEgdG9vbHMgaW5zdGVhZCBvZiA4Nywgc2F2aW5nIH41MCUgdG9rZW5zIG9uIHRvb2wgZGVmaW5pdGlvbnMuXHJcbiAgICAgKiBQZXItdG9vbCBzZXR0aW5ncyBmaWx0ZXIgaW5kaXZpZHVhbCBhY3Rpb25zIHdpdGhpbiBlYWNoIGNhdGVnb3J5LlxyXG4gICAgICovXHJcbiAgICBzZXR1cFRvb2xzKCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMudG9vbHNMaXN0ID0gW107XHJcbiAgICAgICAgdGhpcy5hY3Rpb25Db3VudCA9IDA7XHJcbiAgICAgICAgY29uc3QgZW5hYmxlZENhdHMgPSB0aGlzLnNldHRpbmdzLmVuYWJsZWRDYXRlZ29yaWVzIHx8IHt9O1xyXG4gICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHRoaXMuc2V0dGluZ3MuZW5hYmxlZFRvb2xzIHx8IHt9O1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFtjYXRlZ29yeSwgZXhlY3V0b3JdIG9mIE9iamVjdC5lbnRyaWVzKHRoaXMudG9vbHMpKSB7XHJcbiAgICAgICAgICAgIC8vIFNraXAgZW50aXJlbHkgZGlzYWJsZWQgY2F0ZWdvcmllc1xyXG4gICAgICAgICAgICBpZiAoZW5hYmxlZENhdHNbY2F0ZWdvcnldID09PSBmYWxzZSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhbGxUb29scyA9IGV4ZWN1dG9yLmdldFRvb2xzKCk7XHJcblxyXG4gICAgICAgICAgICAvLyBGaWx0ZXIgYnkgcGVyLXRvb2wgc2V0dGluZ3NcclxuICAgICAgICAgICAgY29uc3QgYWN0aXZlVG9vbHMgPSBhbGxUb29scy5maWx0ZXIodG9vbCA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmdWxsTmFtZSA9IGAke2NhdGVnb3J5fV8ke3Rvb2wubmFtZX1gO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGVuYWJsZWRUb29sc1tmdWxsTmFtZV0gIT09IHVuZGVmaW5lZFxyXG4gICAgICAgICAgICAgICAgICAgID8gZW5hYmxlZFRvb2xzW2Z1bGxOYW1lXVxyXG4gICAgICAgICAgICAgICAgICAgIDogdHJ1ZTsgLy8gZW5hYmxlZCBieSBkZWZhdWx0IHdpdGhpbiBhbiBlbmFibGVkIGNhdGVnb3J5XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGFjdGl2ZVRvb2xzLmxlbmd0aCA9PT0gMCkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFjdGlvbkNvdW50ICs9IGFjdGl2ZVRvb2xzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgIC8vIEJ1aWxkIG9uZSBjb25zb2xpZGF0ZWQgTUNQIHRvb2wgcGVyIGNhdGVnb3J5XHJcbiAgICAgICAgICAgIHRoaXMudG9vbHNMaXN0LnB1c2goe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdGhpcy5idWlsZERlc2NyaXB0aW9uKGNhdGVnb3J5LCBhY3RpdmVUb29scyksXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogdGhpcy5idWlsZFNjaGVtYShhY3RpdmVUb29scyksXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sb2coYFRvb2xzIHJlZ2lzdGVyZWQ6ICR7dGhpcy50b29sc0xpc3QubGVuZ3RofSBjYXRlZ29yaWVzLCAke3RoaXMuYWN0aW9uQ291bnR9IGFjdGlvbnNgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gQ29uc29saWRhdGVkIFRvb2wgRGVzY3JpcHRpb24gPT09XHJcblxyXG4gICAgcHJpdmF0ZSBzdGF0aWMgQ0FURUdPUllfREVTQ1JJUFRJT05TOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgIHNjZW5lOiAnU2NlbmUgbWFuYWdlbWVudCAob3Blbiwgc2F2ZSwgcXVlcnkgaGllcmFyY2h5LCBldGMuKScsXHJcbiAgICAgICAgbm9kZTogJ05vZGUvR2FtZU9iamVjdCBvcGVyYXRpb25zIChjcmVhdGUsIGRlbGV0ZSwgdHJhbnNmb3JtLCBldGMuKScsXHJcbiAgICAgICAgY29tcG9uZW50OiAnQ29tcG9uZW50IG1hbmFnZW1lbnQgKGFkZCwgcmVtb3ZlLCBxdWVyeSwgc2V0IHByb3BlcnRpZXMsIGV0Yy4pJyxcclxuICAgICAgICBhc3NldDogJ0Fzc2V0IGRhdGFiYXNlIG9wZXJhdGlvbnMgKHF1ZXJ5LCBjcmVhdGUsIGltcG9ydCwgZGVwZW5kZW5jaWVzLCBldGMuKScsXHJcbiAgICAgICAgcHJlZmFiOiAnUHJlZmFiIG9wZXJhdGlvbnMgKHF1ZXJ5LCBsaXN0LCBpbnN0YW50aWF0ZSwgY3JlYXRlLCByZXN0b3JlKScsXHJcbiAgICAgICAgcHJvamVjdDogJ1Byb2plY3QtbGV2ZWwgb3BlcmF0aW9ucyAoaW5mbywgYnVpbGQsIHByZXZpZXcsIGNvbmZpZyknLFxyXG4gICAgICAgIGRlYnVnOiAnRGVidWdnaW5nIHV0aWxpdGllcyAobG9ncywgc2NyaXB0IGV4ZWN1dGlvbiknLFxyXG4gICAgICAgIHNjZW5lX3ZpZXc6ICdTY2VuZSB2aWV3IGNvbnRyb2xzIChnaXptbywgY2FtZXJhLCBncmlkLCB2aWV3IG1vZGUpJyxcclxuICAgICAgICBlZGl0b3I6ICdFZGl0b3IgZW52aXJvbm1lbnQgKHByZWZlcmVuY2VzLCBpbmZvLCBkZXZpY2VzKScsXHJcbiAgICAgICAgcmVmZXJlbmNlX2ltYWdlOiAnUmVmZXJlbmNlIGltYWdlIG92ZXJsYXkgbWFuYWdlbWVudCcsXHJcbiAgICAgICAgYW5pbWF0aW9uOiAnQW5pbWF0aW9uIHBsYXliYWNrIGNvbnRyb2wnLFxyXG4gICAgICAgIHZhbGlkYXRpb246ICdTY2VuZSB2YWxpZGF0aW9uIGFuZCBoZWFsdGggY2hlY2tpbmcnLFxyXG4gICAgICAgIGJyb2FkY2FzdDogJ0Jyb2FkY2FzdCBtZXNzYWdlIG1vbml0b3JpbmcgKGxpc3RlbiwgbG9nLCBmaWx0ZXIpJyxcclxuICAgICAgICBmaWxlX2VkaXRvcjogJ1Byb2plY3QgZmlsZSBlZGl0aW5nIChpbnNlcnQsIGRlbGV0ZSwgcmVwbGFjZSwgcXVlcnkgdGV4dCknLFxyXG4gICAgfTtcclxuXHJcbiAgICBwcml2YXRlIHN0YXRpYyBSRUZSRVNIX01BUDogUmVjb3JkPHN0cmluZywgJ3NjZW5lJyB8ICdhc3NldCc+ID0ge1xyXG4gICAgICAgIC8vIE5vZGUgb3BlcmF0aW9uc1xyXG4gICAgICAgICdub2RlLmNyZWF0ZSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ25vZGUuZGVsZXRlJzogJ3NjZW5lJyxcclxuICAgICAgICAnbm9kZS5zZXRfcHJvcGVydHknOiAnc2NlbmUnLFxyXG4gICAgICAgICdub2RlLmR1cGxpY2F0ZSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ25vZGUucmVzZXRfdHJhbnNmb3JtJzogJ3NjZW5lJyxcclxuICAgICAgICAnbm9kZS5tb3ZlJzogJ3NjZW5lJyxcclxuXHJcbiAgICAgICAgLy8gQ29tcG9uZW50IG9wZXJhdGlvbnNcclxuICAgICAgICAnY29tcG9uZW50LmFkZCc6ICdzY2VuZScsXHJcbiAgICAgICAgJ2NvbXBvbmVudC5yZW1vdmUnOiAnc2NlbmUnLFxyXG4gICAgICAgICdjb21wb25lbnQuc2V0X3Byb3BlcnR5JzogJ3NjZW5lJyxcclxuICAgICAgICAnY29tcG9uZW50LnJlc2V0JzogJ3NjZW5lJyxcclxuICAgICAgICAnY29tcG9uZW50LmV4ZWN1dGVfbWV0aG9kJzogJ3NjZW5lJyxcclxuXHJcbiAgICAgICAgLy8gQW5pbWF0aW9uIG9wZXJhdGlvbnNcclxuICAgICAgICAnYW5pbWF0aW9uLnBsYXknOiAnc2NlbmUnLFxyXG4gICAgICAgICdhbmltYXRpb24uc3RvcCc6ICdzY2VuZScsXHJcbiAgICAgICAgJ2FuaW1hdGlvbi5zZXRfY2xpcCc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIERlYnVnIChzY3JpcHQgZXhlY3V0aW9uIG1heSBtb2RpZnkgc2NlbmUpXHJcbiAgICAgICAgJ2RlYnVnLmV4ZWN1dGVfc2NyaXB0JzogJ3NjZW5lJyxcclxuXHJcbiAgICAgICAgLy8gUHJlZmFiIG9wZXJhdGlvbnMgKHNjZW5lKVxyXG4gICAgICAgICdwcmVmYWIuaW5zdGFudGlhdGUnOiAnc2NlbmUnLFxyXG4gICAgICAgICdwcmVmYWIucmVzdG9yZSc6ICdzY2VuZScsXHJcblxyXG4gICAgICAgIC8vIEFzc2V0IG9wZXJhdGlvbnNcclxuICAgICAgICAnYXNzZXQuY3JlYXRlJzogJ2Fzc2V0JyxcclxuICAgICAgICAnYXNzZXQuZGVsZXRlJzogJ2Fzc2V0JyxcclxuICAgICAgICAnYXNzZXQubW92ZSc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0LmltcG9ydCc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0LmNvcHknOiAnYXNzZXQnLFxyXG4gICAgICAgICdhc3NldC5zYXZlJzogJ2Fzc2V0JyxcclxuICAgICAgICAnYXNzZXQucmVpbXBvcnQnOiAnYXNzZXQnLFxyXG5cclxuICAgICAgICAvLyBQcmVmYWIgb3BlcmF0aW9ucyAoYXNzZXQpXHJcbiAgICAgICAgJ3ByZWZhYi5jcmVhdGUnOiAnYXNzZXQnLFxyXG4gICAgICAgICdwcmVmYWIuY3JlYXRlX2VtcHR5JzogJ2Fzc2V0JyxcclxuXHJcbiAgICAgICAgLy8gU2NlbmUgb3BlcmF0aW9uc1xyXG4gICAgICAgICdzY2VuZS5jcmVhdGUnOiAnYXNzZXQnLFxyXG5cclxuICAgICAgICAvLyBBc3NldCBhZHZhbmNlZCBvcGVyYXRpb25zXHJcbiAgICAgICAgJ2Fzc2V0LnNhdmVfbWV0YSc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0LmJhdGNoX2ltcG9ydCc6ICdhc3NldCcsXHJcbiAgICAgICAgJ2Fzc2V0LmJhdGNoX2RlbGV0ZSc6ICdhc3NldCcsXHJcblxyXG4gICAgICAgIC8vIE5vZGUgY2xpcGJvYXJkIG9wZXJhdGlvbnNcclxuICAgICAgICAnbm9kZS5wYXN0ZSc6ICdzY2VuZScsXHJcbiAgICAgICAgJ25vZGUuY3V0JzogJ3NjZW5lJyxcclxuICAgICAgICAnbm9kZS5jcmVhdGVfcHJpbWl0aXZlJzogJ3NjZW5lJyxcclxuXHJcbiAgICAgICAgLy8gU2NlbmUgdW5kbyBvcGVyYXRpb25zXHJcbiAgICAgICAgJ3NjZW5lLmVuZF9yZWNvcmRpbmcnOiAnc2NlbmUnLFxyXG4gICAgICAgICdzY2VuZS5tb3ZlX2FycmF5X2VsZW1lbnQnOiAnc2NlbmUnLFxyXG4gICAgICAgICdzY2VuZS5yZW1vdmVfYXJyYXlfZWxlbWVudCc6ICdzY2VuZScsXHJcbiAgICB9O1xyXG5cclxuICAgIHByaXZhdGUgYnVpbGREZXNjcmlwdGlvbihjYXRlZ29yeTogc3RyaW5nLCB0b29sczogVG9vbERlZmluaXRpb25bXSk6IHN0cmluZyB7XHJcbiAgICAgICAgY29uc3QgY2F0RGVzYyA9IE1DUFNlcnZlci5DQVRFR09SWV9ERVNDUklQVElPTlNbY2F0ZWdvcnldIHx8IGNhdGVnb3J5O1xyXG4gICAgICAgIGxldCBkZXNjID0gYCR7Y2F0RGVzY31cXG5cXG5BY3Rpb25zOlxcbmA7XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiB0b29scykge1xyXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSB0aGlzLmZvcm1hdEFjdGlvblBhcmFtcyh0b29sLmlucHV0U2NoZW1hKTtcclxuICAgICAgICAgICAgZGVzYyArPSBwYXJhbXNcclxuICAgICAgICAgICAgICAgID8gYC0gJHt0b29sLm5hbWV9OiAke3Rvb2wuZGVzY3JpcHRpb259ICgke3BhcmFtc30pXFxuYFxyXG4gICAgICAgICAgICAgICAgOiBgLSAke3Rvb2wubmFtZX06ICR7dG9vbC5kZXNjcmlwdGlvbn1cXG5gO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGRlc2MudHJpbSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZm9ybWF0QWN0aW9uUGFyYW1zKHNjaGVtYTogVG9vbERlZmluaXRpb25bJ2lucHV0U2NoZW1hJ10pOiBzdHJpbmcge1xyXG4gICAgICAgIGNvbnN0IHByb3BzID0gc2NoZW1hLnByb3BlcnRpZXMgfHwge307XHJcbiAgICAgICAgY29uc3QgcmVxdWlyZWQgPSBzY2hlbWEucmVxdWlyZWQgfHwgW107XHJcblxyXG4gICAgICAgIGNvbnN0IHBhcnRzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgIGZvciAoY29uc3QgW25hbWUsIGRlZl0gb2YgT2JqZWN0LmVudHJpZXMocHJvcHMpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzUmVxID0gcmVxdWlyZWQuaW5jbHVkZXMobmFtZSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHR5cGUgPSBkZWYudHlwZSB8fCAnYW55JztcclxuICAgICAgICAgICAgcGFydHMucHVzaChgJHtuYW1lfSR7aXNSZXEgPyAnJyA6ICc/J306ICR7dHlwZX1gKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBwYXJ0cy5qb2luKCcsICcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBDb25zb2xpZGF0ZWQgVG9vbCBTY2hlbWEgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZFNjaGVtYSh0b29sczogVG9vbERlZmluaXRpb25bXSk6IFRvb2xEZWZpbml0aW9uWydpbnB1dFNjaGVtYSddIHtcclxuICAgICAgICBjb25zdCBhY3Rpb25FbnVtID0gdG9vbHMubWFwKHQgPT4gdC5uYW1lKTtcclxuICAgICAgICBjb25zdCBtZXJnZWRQcm9wczogUmVjb3JkPHN0cmluZywgYW55PiA9IHtcclxuICAgICAgICAgICAgYWN0aW9uOiB7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICAgICAgICAgIGVudW06IGFjdGlvbkVudW0sXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBhY3Rpb24gdG8gcGVyZm9ybScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCB0b29sIG9mIHRvb2xzKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHByb3BzID0gdG9vbC5pbnB1dFNjaGVtYS5wcm9wZXJ0aWVzIHx8IHt9O1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtwcm9wTmFtZSwgcHJvcERlZl0gb2YgT2JqZWN0LmVudHJpZXMocHJvcHMpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIW1lcmdlZFByb3BzW3Byb3BOYW1lXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lcmdlZFByb3BzW3Byb3BOYW1lXSA9IHsgLi4ucHJvcERlZiB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgcHJvcGVydGllczogbWVyZ2VkUHJvcHMsXHJcbiAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2FjdGlvbiddLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFRvb2wgSW5mbyBmb3IgUGFuZWwgVUkgKHBlci1hY3Rpb24gZ3JhbnVsYXJpdHkpID09PVxyXG5cclxuICAgIHByaXZhdGUgc3RhdGljIENPUkVfQ0FURUdPUklFUyA9IFsnc2NlbmUnLCAnbm9kZScsICdjb21wb25lbnQnLCAnYXNzZXQnLCAncHJlZmFiJywgJ3Byb2plY3QnLCAnZGVidWcnLCAndmFsaWRhdGlvbiddO1xyXG5cclxuICAgIGdldEFsbFRvb2xzSW5mbygpOiB7IGNhdGVnb3J5OiBzdHJpbmc7IGlzQ29yZTogYm9vbGVhbjsgdG9vbHM6IHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nOyBlbmFibGVkOiBib29sZWFuIH1bXSB9W10ge1xyXG4gICAgICAgIGNvbnN0IGVuYWJsZWRDYXRzID0gdGhpcy5zZXR0aW5ncy5lbmFibGVkQ2F0ZWdvcmllcyB8fCB7fTtcclxuICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0aGlzLnNldHRpbmdzLmVuYWJsZWRUb29scyB8fCB7fTtcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmVudHJpZXModGhpcy50b29scykubWFwKChbY2F0ZWdvcnksIGV4ZWN1dG9yXSkgPT4gKHtcclxuICAgICAgICAgICAgY2F0ZWdvcnksXHJcbiAgICAgICAgICAgIGlzQ29yZTogTUNQU2VydmVyLkNPUkVfQ0FURUdPUklFUy5pbmNsdWRlcyhjYXRlZ29yeSksXHJcbiAgICAgICAgICAgIHRvb2xzOiBleGVjdXRvci5nZXRUb29scygpLm1hcCh0b29sID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxOYW1lID0gYCR7Y2F0ZWdvcnl9XyR7dG9vbC5uYW1lfWA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbmFibGVkID0gZW5hYmxlZFRvb2xzW2Z1bGxOYW1lXSAhPT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgICAgICAgICAgPyBlbmFibGVkVG9vbHNbZnVsbE5hbWVdXHJcbiAgICAgICAgICAgICAgICAgICAgOiBlbmFibGVkQ2F0c1tjYXRlZ29yeV0gIT09IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgbmFtZTogZnVsbE5hbWUsIGRlc2NyaXB0aW9uOiB0b29sLmRlc2NyaXB0aW9uLCBlbmFibGVkIH07XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gU2VydmVyIExpZmVjeWNsZSA9PT1cclxuXHJcbiAgICBzdGFydCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5odHRwU2VydmVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0dXBUb29scygpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgbWF4QXR0ZW1wdHMgPSAxMTsgLy8gVHJ5IGNvbmZpZ3VyZWQgcG9ydCArIDEwIG1vcmVcclxuICAgICAgICAgICAgbGV0IGF0dGVtcHQgPSAwO1xyXG4gICAgICAgICAgICBjb25zdCBiYXNlUG9ydCA9IHRoaXMuc2V0dGluZ3MucG9ydDtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHRyeVBvcnQgPSAocG9ydDogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXIgPSBodHRwLmNyZWF0ZVNlcnZlcih0aGlzLmhhbmRsZUh0dHBSZXF1ZXN0LmJpbmQodGhpcykpO1xyXG5cclxuICAgICAgICAgICAgICAgIHNlcnZlci5vbignZXJyb3InLCAoZXJyOiBOb2RlSlMuRXJybm9FeGNlcHRpb24pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyLmNvZGUgPT09ICdFQUREUklOVVNFJyAmJiBhdHRlbXB0IDwgbWF4QXR0ZW1wdHMgLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dGVtcHQrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV4dFBvcnQgPSBiYXNlUG9ydCArIGF0dGVtcHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgW01DUF0gUG9ydCAke3BvcnR9IGluIHVzZSwgdHJ5aW5nICR7bmV4dFBvcnR9Li4uYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeVBvcnQobmV4dFBvcnQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZXJyLmNvZGUgPT09ICdFQUREUklOVVNFJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBbTUNQXSBBbGwgcG9ydHMgJHtiYXNlUG9ydH0tJHtiYXNlUG9ydCArIG1heEF0dGVtcHRzIC0gMX0gYXJlIGluIHVzZWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGBBbGwgcG9ydHMgJHtiYXNlUG9ydH0tJHtiYXNlUG9ydCArIG1heEF0dGVtcHRzIC0gMX0gYXJlIGluIHVzZWApKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdbTUNQXSBTZXJ2ZXIgZXJyb3I6JywgZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgc2VydmVyLmxpc3Rlbihwb3J0LCAnMTI3LjAuMC4xJywgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaHR0cFNlcnZlciA9IHNlcnZlcjtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdHVhbFBvcnQgPSBwb3J0O1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZ2lzdGVyIGluIGdsb2JhbCByZWdpc3RyeVxyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlZ2lzdGVySW5zdGFuY2UocG9ydCwgRWRpdG9yLlByb2plY3QucGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ1tNQ1BdIEZhaWxlZCB0byByZWdpc3RlciBpbnN0YW5jZTonLCBlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFtNQ1BdIFNlcnZlciBzdGFydGVkIG9uIGh0dHA6Ly8xMjcuMC4wLjE6JHtwb3J0fS9tY3BgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHRyeVBvcnQoYmFzZVBvcnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHN0b3AoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMuaHR0cFNlcnZlcikge1xyXG4gICAgICAgICAgICB0aGlzLmh0dHBTZXJ2ZXIuY2xvc2UoKTtcclxuICAgICAgICAgICAgdGhpcy5odHRwU2VydmVyID0gbnVsbDtcclxuICAgICAgICAgICAgdW5yZWdpc3Rlckluc3RhbmNlKCk7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbTUNQXSBTZXJ2ZXIgc3RvcHBlZCcpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpc1J1bm5pbmcoKTogYm9vbGVhbiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuaHR0cFNlcnZlciAhPT0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBnZXRUb29sQ291bnQoKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gdGhpcy50b29sc0xpc3QubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIGdldEFjdGlvbkNvdW50KCk6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYWN0aW9uQ291bnQ7XHJcbiAgICB9XHJcblxyXG4gICAgZ2V0QWN0dWFsUG9ydCgpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmFjdHVhbFBvcnQ7XHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlU2V0dGluZ3Moc2V0dGluZ3M6IE1DUFNlcnZlclNldHRpbmdzKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IHNldHRpbmdzO1xyXG4gICAgICAgIHRoaXMuZW5hYmxlRGVidWdMb2cgPSBzZXR0aW5ncy5lbmFibGVEZWJ1Z0xvZztcclxuICAgICAgICAvLyBSZWJ1aWxkIHRvb2wgbGlzdCB3aGVuIGNhdGVnb3JpZXMgY2hhbmdlXHJcbiAgICAgICAgdGhpcy5zZXR1cFRvb2xzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IEhUVFAgUmVxdWVzdCBIYW5kbGluZyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUh0dHBSZXF1ZXN0KHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xyXG4gICAgICAgIC8vIENPUlMgaGVhZGVyc1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbicsICcqJyk7XHJcbiAgICAgICAgcmVzLnNldEhlYWRlcignQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcycsICdHRVQsIFBPU1QsIE9QVElPTlMnKTtcclxuICAgICAgICByZXMuc2V0SGVhZGVyKCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJywgJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbicpO1xyXG4gICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XHJcblxyXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnT1BUSU9OUycpIHtcclxuICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICByZXMuZW5kKCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgJyc7XHJcblxyXG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJyAmJiB1cmwgPT09ICcvaGVhbHRoJykge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUhlYWx0aChyZXMpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnICYmIHVybCA9PT0gJy9tY3AnKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlTUNQKHJlcSwgcmVzKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCk7XHJcbiAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ05vdCBmb3VuZCcgfSkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGhhbmRsZUhlYWx0aChyZXM6IGh0dHAuU2VydmVyUmVzcG9uc2UpOiB2b2lkIHtcclxuICAgICAgICBsZXQgcHJvamVjdFBhdGggPSAnJztcclxuICAgICAgICB0cnkgeyBwcm9qZWN0UGF0aCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7IH0gY2F0Y2gge31cclxuICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIHN0YXR1czogJ29rJyxcclxuICAgICAgICAgICAgdG9vbHM6IHRoaXMudG9vbHNMaXN0Lmxlbmd0aCxcclxuICAgICAgICAgICAgYWN0aW9uczogdGhpcy5hY3Rpb25Db3VudCxcclxuICAgICAgICAgICAgcHJvamVjdFBhdGgsXHJcbiAgICAgICAgICAgIHNlcnZlcjogU0VSVkVSX0lORk8sXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgaGFuZGxlTUNQKHJlcTogaHR0cC5JbmNvbWluZ01lc3NhZ2UsIHJlczogaHR0cC5TZXJ2ZXJSZXNwb25zZSk6IHZvaWQge1xyXG4gICAgICAgIGxldCBib2R5ID0gJyc7XHJcbiAgICAgICAgcmVxLm9uKCdkYXRhJywgKGNodW5rOiBCdWZmZXIpID0+IHsgYm9keSArPSBjaHVuay50b1N0cmluZygpOyB9KTtcclxuICAgICAgICByZXEub24oJ2VuZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGxldCBtZXNzYWdlOiBhbnk7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKGJvZHkpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVHJ5IGZpeGluZyBjb21tb24gSlNPTiBpc3N1ZXMgZnJvbSBBSSBjbGllbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IEpTT04ucGFyc2UoZml4Q29tbW9uSnNvbklzc3Vlcyhib2R5KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoMjAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHsgY29kZTogLTMyNzAwLCBtZXNzYWdlOiAnUGFyc2UgZXJyb3InIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmhhbmRsZU1lc3NhZ2UobWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCk7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHJlc3VsdCkpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCgyMDApO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHsgY29kZTogLTMyNjAzLCBtZXNzYWdlOiBlcnIubWVzc2FnZSB9LFxyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IEpTT04tUlBDIDIuMCBNZXNzYWdlIEhhbmRsaW5nID09PVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaGFuZGxlTWVzc2FnZShtZXNzYWdlOiBhbnkpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgICAgIGNvbnN0IHsgaWQsIG1ldGhvZCwgcGFyYW1zIH0gPSBtZXNzYWdlO1xyXG5cclxuICAgICAgICB0aGlzLmxvZyhgW01DUF0g4oaSICR7bWV0aG9kfWApO1xyXG5cclxuICAgICAgICBzd2l0Y2ggKG1ldGhvZCkge1xyXG4gICAgICAgICAgICBjYXNlICdpbml0aWFsaXplJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3RvY29sVmVyc2lvbjogUFJPVE9DT0xfVkVSU0lPTixcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FwYWJpbGl0aWVzOiB7IHRvb2xzOiB7fSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJJbmZvOiBTRVJWRVJfSU5GTyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ25vdGlmaWNhdGlvbnMvaW5pdGlhbGl6ZWQnOlxyXG4gICAgICAgICAgICAgICAgLy8gQ2xpZW50IG5vdGlmaWNhdGlvbiwgbm8gcmVzcG9uc2UgbmVlZGVkXHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBqc29ucnBjOiAnMi4wJywgaWQsIHJlc3VsdDoge30gfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3Rvb2xzL2xpc3QnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG9vbHM6IHRoaXMudG9vbHNMaXN0Lm1hcCh0ID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB0Lm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogdC5kZXNjcmlwdGlvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB0LmlucHV0U2NoZW1hLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSksXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICd0b29scy9jYWxsJzoge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbE5hbWUgPSBwYXJhbXM/Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhcmdzID0gcGFyYW1zPy5hcmd1bWVudHMgfHwge307XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCF0b29sTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHsgY29kZTogLTMyNjAyLCBtZXNzYWdlOiAnTWlzc2luZyB0b29sIG5hbWUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVRvb2xDYWxsKHRvb2xOYW1lLCBhcmdzKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBqc29ucnBjOiAnMi4wJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudDogW3sgdHlwZTogJ3RleHQnLCB0ZXh0OiBKU09OLnN0cmluZ2lmeShyZXN1bHQpIH1dLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGpzb25ycGM6ICcyLjAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBbeyB0eXBlOiAndGV4dCcsIHRleHQ6IEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9KSB9XSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzRXJyb3I6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAganNvbnJwYzogJzIuMCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IHsgY29kZTogLTMyNjAxLCBtZXNzYWdlOiBgVW5rbm93biBtZXRob2Q6ICR7bWV0aG9kfWAgfSxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIEV4ZWN1dGlvbiA9PT1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVUb29sQ2FsbCh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIC8vIENvbnNvbGlkYXRlZCBhcHByb2FjaDogdG9vbCBuYW1lID0gY2F0ZWdvcnksIGFjdGlvbiBpbiBhcmdzXHJcbiAgICAgICAgY29uc3QgZXhlY3V0b3IgPSB0aGlzLnRvb2xzW3Rvb2xOYW1lXTtcclxuICAgICAgICBpZiAoIWV4ZWN1dG9yKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVW5rbm93biB0b29sOiAke3Rvb2xOYW1lfWApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYWN0aW9uID0gYXJncz8uYWN0aW9uO1xyXG4gICAgICAgIGlmICghYWN0aW9uKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBcImFjdGlvblwiIHBhcmFtZXRlciBmb3IgdG9vbCBcIiR7dG9vbE5hbWV9XCIuIENoZWNrIGF2YWlsYWJsZSBhY3Rpb25zIGluIHRoZSB0b29sIGRlc2NyaXB0aW9uLmApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVmFsaWRhdGUgYXJndW1lbnRzIGFnYWluc3Qgc2NoZW1hXHJcbiAgICAgICAgdGhpcy52YWxpZGF0ZUFyZ3ModG9vbE5hbWUsIGFjdGlvbiwgYXJncyk7XHJcblxyXG4gICAgICAgIHRoaXMubG9nKGBbTUNQXSBFeGVjdXRpbmc6ICR7dG9vbE5hbWV9LiR7YWN0aW9ufWApO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGV4ZWN1dG9yLmV4ZWN1dGUoYWN0aW9uLCBhcmdzKTtcclxuICAgICAgICB0aGlzLmxvZyhgW01DUF0gUmVzdWx0OiAke3Jlc3VsdC5zdWNjZXNzID8gJ09LJyA6ICdGQUlMJ31gKTtcclxuXHJcbiAgICAgICAgLy8gQXV0by1yZWZyZXNoIGVkaXRvciBhZnRlciB3cml0ZSBvcGVyYXRpb25zXHJcbiAgICAgICAgYXdhaXQgdGhpcy5hdXRvUmVmcmVzaCh0b29sTmFtZSwgYWN0aW9uLCByZXN1bHQpO1xyXG5cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKlxyXG4gICAgICogVmFsaWRhdGUgdG9vbCBhcmd1bWVudHMgYWdhaW5zdCB0aGUgdG9vbCdzIGlucHV0U2NoZW1hLlxyXG4gICAgICogVGhyb3dzIGRlc2NyaXB0aXZlIGVycm9ycyBmb3IgaW52YWxpZCBhY3Rpb24sIG1pc3NpbmcgcmVxdWlyZWQgcGFyYW1zLCBvciB0eXBlIG1pc21hdGNoZXMuXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgdmFsaWRhdGVBcmdzKGNhdGVnb3J5OiBzdHJpbmcsIGFjdGlvbjogc3RyaW5nLCBhcmdzOiBhbnkpOiB2b2lkIHtcclxuICAgICAgICBjb25zdCBleGVjdXRvciA9IHRoaXMudG9vbHNbY2F0ZWdvcnldO1xyXG4gICAgICAgIGNvbnN0IGFsbFRvb2xzID0gZXhlY3V0b3IuZ2V0VG9vbHMoKTtcclxuICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB0aGlzLnNldHRpbmdzLmVuYWJsZWRUb29scyB8fCB7fTtcclxuXHJcbiAgICAgICAgLy8gRmlsdGVyIGJ5IHBlci10b29sIGVuYWJsZS9kaXNhYmxlIHNldHRpbmdzIChzYW1lIGxvZ2ljIGFzIHNldHVwVG9vbHMpXHJcbiAgICAgICAgY29uc3QgYWN0aXZlVG9vbHMgPSBhbGxUb29scy5maWx0ZXIodG9vbCA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZ1bGxOYW1lID0gYCR7Y2F0ZWdvcnl9XyR7dG9vbC5uYW1lfWA7XHJcbiAgICAgICAgICAgIHJldHVybiBlbmFibGVkVG9vbHNbZnVsbE5hbWVdICE9PSB1bmRlZmluZWQgPyBlbmFibGVkVG9vbHNbZnVsbE5hbWVdIDogdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBjb25zdCB0b29sTmFtZXMgPSBhY3RpdmVUb29scy5tYXAodCA9PiB0Lm5hbWUpO1xyXG5cclxuICAgICAgICAvLyAxLiBWYWxpZGF0ZSBhY3Rpb24gaXMgaW4gdGhlIGFsbG93ZWQgbGlzdFxyXG4gICAgICAgIGlmICghdG9vbE5hbWVzLmluY2x1ZGVzKGFjdGlvbikpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICAgICAgYEludmFsaWQgYWN0aW9uICcke2FjdGlvbn0nIGZvciB0b29sICcke2NhdGVnb3J5fScuIEF2YWlsYWJsZSBhY3Rpb25zOiAke3Rvb2xOYW1lcy5qb2luKCcsICcpfWBcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDIuIEZpbmQgbWF0Y2hpbmcgdG9vbCBkZWZpbml0aW9uXHJcbiAgICAgICAgY29uc3QgdG9vbERlZiA9IGFjdGl2ZVRvb2xzLmZpbmQodCA9PiB0Lm5hbWUgPT09IGFjdGlvbikhO1xyXG4gICAgICAgIGNvbnN0IHNjaGVtYSA9IHRvb2xEZWYuaW5wdXRTY2hlbWE7XHJcbiAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IHNjaGVtYS5wcm9wZXJ0aWVzIHx8IHt9O1xyXG4gICAgICAgIGNvbnN0IHJlcXVpcmVkID0gc2NoZW1hLnJlcXVpcmVkIHx8IFtdO1xyXG5cclxuICAgICAgICAvLyAzLiBDaGVjayByZXF1aXJlZCBwYXJhbWV0ZXJzXHJcbiAgICAgICAgY29uc3QgbWlzc2luZzogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBmb3IgKGNvbnN0IHBhcmFtTmFtZSBvZiByZXF1aXJlZCkge1xyXG4gICAgICAgICAgICBpZiAoYXJnc1twYXJhbU5hbWVdID09PSB1bmRlZmluZWQgfHwgYXJnc1twYXJhbU5hbWVdID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBtaXNzaW5nLnB1c2gocGFyYW1OYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobWlzc2luZy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtTGlzdCA9IE9iamVjdC5lbnRyaWVzKHByb3BlcnRpZXMpXHJcbiAgICAgICAgICAgICAgICAubWFwKChbbmFtZSwgZGVmXTogW3N0cmluZywgYW55XSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzUmVxID0gcmVxdWlyZWQuaW5jbHVkZXMobmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGAke25hbWV9JHtpc1JlcSA/ICcnIDogJz8nfSAoJHtkZWYudHlwZSB8fCAnYW55J30pYDtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAuam9pbignLCAnKTtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICAgICAgYE1pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVyJHttaXNzaW5nLmxlbmd0aCA+IDEgPyAncycgOiAnJ30gJyR7bWlzc2luZy5qb2luKFwiJywgJ1wiKX0nIGZvciBhY3Rpb24gJyR7Y2F0ZWdvcnl9LiR7YWN0aW9ufScuIEV4cGVjdGVkIHBhcmFtZXRlcnM6ICR7cGFyYW1MaXN0fWBcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIDQuIFR5cGUtY2hlY2sgcHJvdmlkZWQgcGFyYW1ldGVyc1xyXG4gICAgICAgIGZvciAoY29uc3QgW3BhcmFtTmFtZSwgcGFyYW1EZWZdIG9mIE9iamVjdC5lbnRyaWVzKHByb3BlcnRpZXMpIGFzIFtzdHJpbmcsIGFueV1bXSkge1xyXG4gICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGFyZ3NbcGFyYW1OYW1lXTtcclxuICAgICAgICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRUeXBlID0gcGFyYW1EZWYudHlwZTtcclxuICAgICAgICAgICAgaWYgKCFleHBlY3RlZFR5cGUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgbGV0IHZhbGlkID0gdHJ1ZTtcclxuICAgICAgICAgICAgc3dpdGNoIChleHBlY3RlZFR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6ICB2YWxpZCA9IHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZyc7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzogIHZhbGlkID0gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJzsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdib29sZWFuJzogdmFsaWQgPSB0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJzsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdvYmplY3QnOiAgdmFsaWQgPSB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KHZhbHVlKTsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdhcnJheSc6ICAgdmFsaWQgPSBBcnJheS5pc0FycmF5KHZhbHVlKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghdmFsaWQpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcclxuICAgICAgICAgICAgICAgICAgICBgVHlwZSBtaXNtYXRjaCBmb3IgcGFyYW1ldGVyICcke3BhcmFtTmFtZX0nIGluIGFjdGlvbiAnJHtjYXRlZ29yeX0uJHthY3Rpb259JzogZXhwZWN0ZWQgJHtleHBlY3RlZFR5cGV9LCBnb3QgJHtBcnJheS5pc0FycmF5KHZhbHVlKSA/ICdhcnJheScgOiB0eXBlb2YgdmFsdWV9YFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKipcclxuICAgICAqIEF1dG9tYXRpY2FsbHkgcmVmcmVzaCB0aGUgZWRpdG9yIGFmdGVyIGEgc3VjY2Vzc2Z1bCB3cml0ZSBvcGVyYXRpb24uXHJcbiAgICAgKiBVc2VzIFJFRlJFU0hfTUFQIHRvIGRldGVybWluZSByZWZyZXNoIHR5cGUuIE5ldmVyIHRocm93cyDigJQgcmVmcmVzaFxyXG4gICAgICogZmFpbHVyZXMgYXJlIHJlcG9ydGVkIGFzIHdhcm5pbmdzLCBub3QgZXJyb3JzLlxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGFzeW5jIGF1dG9SZWZyZXNoKHRvb2xOYW1lOiBzdHJpbmcsIGFjdGlvbjogc3RyaW5nLCByZXN1bHQ6IFRvb2xSZXNwb25zZSk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGNvbnN0IGtleSA9IGAke3Rvb2xOYW1lfS4ke2FjdGlvbn1gO1xyXG4gICAgICAgIGNvbnN0IHJlZnJlc2hUeXBlID0gTUNQU2VydmVyLlJFRlJFU0hfTUFQW2tleV07XHJcbiAgICAgICAgaWYgKCFyZWZyZXNoVHlwZSB8fCAhcmVzdWx0LnN1Y2Nlc3MpIHJldHVybjtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHJlZnJlc2hUeXBlID09PSAnc2NlbmUnKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzb2Z0LXJlbG9hZCcpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlZnJlc2hUeXBlID09PSAnYXNzZXQnKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdyZWZyZXNoLWFzc2V0JywgJ2RiOi8vYXNzZXRzJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVzdWx0LnJlZnJlc2hlZCA9IHJlZnJlc2hUeXBlO1xyXG4gICAgICAgICAgICB0aGlzLmxvZyhgW01DUF0gQXV0by1yZWZyZXNoZWQ6ICR7cmVmcmVzaFR5cGV9YCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmVzdWx0LnJlZnJlc2hXYXJuaW5nID0gYEF1dG8tcmVmcmVzaCBmYWlsZWQ6ICR7ZXJyLm1lc3NhZ2V9YDtcclxuICAgICAgICAgICAgdGhpcy5sb2coYFtNQ1BdIEF1dG8tcmVmcmVzaCB3YXJuaW5nOiAke2Vyci5tZXNzYWdlfWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gTG9nZ2luZyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGxvZyhtc2c6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLmVuYWJsZURlYnVnTG9nKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKG1zZyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4vLyA9PT0gSlNPTiBGaXggSGVscGVyID09PVxyXG5cclxuZnVuY3Rpb24gZml4Q29tbW9uSnNvbklzc3VlcyhpbnB1dDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGxldCBmaXhlZCA9IGlucHV0O1xyXG4gICAgLy8gUmVtb3ZlIHRyYWlsaW5nIGNvbW1hcyBiZWZvcmUgfSBvciBdXHJcbiAgICBmaXhlZCA9IGZpeGVkLnJlcGxhY2UoLyxcXHMqKFt9XFxdXSkvZywgJyQxJyk7XHJcbiAgICAvLyBSZXBsYWNlIHNpbmdsZSBxdW90ZXMgd2l0aCBkb3VibGUgcXVvdGVzIChvdXRzaWRlIG9mIHN0cmluZ3MpXHJcbiAgICBmaXhlZCA9IGZpeGVkLnJlcGxhY2UoLycvZywgJ1wiJyk7XHJcbiAgICAvLyBFc2NhcGUgdW5lc2NhcGVkIG5ld2xpbmVzXHJcbiAgICBmaXhlZCA9IGZpeGVkLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKTtcclxuICAgIGZpeGVkID0gZml4ZWQucmVwbGFjZSgvXFxyL2csICdcXFxccicpO1xyXG4gICAgZml4ZWQgPSBmaXhlZC5yZXBsYWNlKC9cXHQvZywgJ1xcXFx0Jyk7XHJcbiAgICByZXR1cm4gZml4ZWQ7XHJcbn1cclxuIl19