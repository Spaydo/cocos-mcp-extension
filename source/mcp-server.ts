import * as http from 'http';
import { ToolDefinition, ToolResponse, ToolExecutor, MCPServerSettings } from './types';

const SERVER_INFO = {
    name: 'cocos-mcp-extension',
    version: '1.0.0',
};

const PROTOCOL_VERSION = '2024-11-05';

export class MCPServer {
    private httpServer: http.Server | null = null;
    private settings: MCPServerSettings;
    private tools: Record<string, ToolExecutor> = {};
    private toolsList: ToolDefinition[] = [];
    private actionCount: number = 0;
    private enableDebugLog: boolean = false;

    constructor(settings: MCPServerSettings) {
        this.settings = settings;
        this.enableDebugLog = settings.enableDebugLog;
    }

    // === Tool Registration ===

    registerToolCategory(category: string, executor: ToolExecutor): void {
        this.tools[category] = executor;
    }

    /**
     * Build consolidated tool list: one MCP tool per category with action parameter.
     * AI sees 11 tools instead of 87, saving ~50% tokens on tool definitions.
     * Per-tool settings filter individual actions within each category.
     */
    setupTools(): void {
        this.toolsList = [];
        this.actionCount = 0;
        const enabledCats = this.settings.enabledCategories || {};
        const enabledTools = this.settings.enabledTools || {};

        for (const [category, executor] of Object.entries(this.tools)) {
            // Skip entirely disabled categories
            if (enabledCats[category] === false) continue;

            const allTools = executor.getTools();

            // Filter by per-tool settings
            const activeTools = allTools.filter(tool => {
                const fullName = `${category}_${tool.name}`;
                return enabledTools[fullName] !== undefined
                    ? enabledTools[fullName]
                    : true; // enabled by default within an enabled category
            });

            if (activeTools.length === 0) continue;

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

    // === Consolidated Tool Description ===

    private static CATEGORY_DESCRIPTIONS: Record<string, string> = {
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

    private static REFRESH_MAP: Record<string, 'scene' | 'asset'> = {
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

    private buildDescription(category: string, tools: ToolDefinition[]): string {
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

    private formatActionParams(schema: ToolDefinition['inputSchema']): string {
        const props = schema.properties || {};
        const required = schema.required || [];

        const parts: string[] = [];
        for (const [name, def] of Object.entries(props)) {
            const isReq = required.includes(name);
            const type = def.type || 'any';
            parts.push(`${name}${isReq ? '' : '?'}: ${type}`);
        }

        return parts.join(', ');
    }

    // === Consolidated Tool Schema ===

    private buildSchema(tools: ToolDefinition[]): ToolDefinition['inputSchema'] {
        const actionEnum = tools.map(t => t.name);
        const mergedProps: Record<string, any> = {
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
                    mergedProps[propName] = { ...propDef };
                }
            }
        }

        return {
            type: 'object',
            properties: mergedProps,
            required: ['action'],
        };
    }

    // === Tool Info for Panel UI (per-action granularity) ===

    private static CORE_CATEGORIES = ['scene', 'node', 'component', 'asset', 'prefab', 'project', 'debug', 'validation'];

    getAllToolsInfo(): { category: string; isCore: boolean; tools: { name: string; description: string; enabled: boolean }[] }[] {
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

    start(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.httpServer) {
                resolve();
                return;
            }

            this.setupTools();

            this.httpServer = http.createServer(this.handleHttpRequest.bind(this));

            this.httpServer.on('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    console.error(`[MCP] Port ${this.settings.port} is already in use`);
                    this.httpServer = null;
                    reject(new Error(`Port ${this.settings.port} is already in use`));
                } else {
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

    stop(): void {
        if (this.httpServer) {
            this.httpServer.close();
            this.httpServer = null;
            console.log('[MCP] Server stopped');
        }
    }

    isRunning(): boolean {
        return this.httpServer !== null;
    }

    getToolCount(): number {
        return this.toolsList.length;
    }

    getActionCount(): number {
        return this.actionCount;
    }

    updateSettings(settings: MCPServerSettings): void {
        this.settings = settings;
        this.enableDebugLog = settings.enableDebugLog;
        // Rebuild tool list when categories change
        this.setupTools();
    }

    // === HTTP Request Handling ===

    private handleHttpRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
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
        } else if (req.method === 'POST' && url === '/mcp') {
            this.handleMCP(req, res);
        } else {
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    }

    private handleHealth(res: http.ServerResponse): void {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'ok',
            tools: this.toolsList.length,
            actions: this.actionCount,
            server: SERVER_INFO,
        }));
    }

    private handleMCP(req: http.IncomingMessage, res: http.ServerResponse): void {
        let body = '';
        req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                let message: any;
                try {
                    message = JSON.parse(body);
                } catch {
                    // Try fixing common JSON issues from AI clients
                    try {
                        message = JSON.parse(fixCommonJsonIssues(body));
                    } catch {
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
            } catch (err: any) {
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

    private async handleMessage(message: any): Promise<any> {
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
                const toolName = params?.name;
                const args = params?.arguments || {};

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
                } catch (err: any) {
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

    private async executeToolCall(toolName: string, args: any): Promise<ToolResponse> {
        // Consolidated approach: tool name = category, action in args
        const executor = this.tools[toolName];
        if (!executor) {
            throw new Error(`Unknown tool: ${toolName}`);
        }

        const action = args?.action;
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
    private validateArgs(category: string, action: string, args: any): void {
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
            throw new Error(
                `Invalid action '${action}' for tool '${category}'. Available actions: ${toolNames.join(', ')}`
            );
        }

        // 2. Find matching tool definition
        const toolDef = activeTools.find(t => t.name === action)!;
        const schema = toolDef.inputSchema;
        const properties = schema.properties || {};
        const required = schema.required || [];

        // 3. Check required parameters
        const missing: string[] = [];
        for (const paramName of required) {
            if (args[paramName] === undefined || args[paramName] === null) {
                missing.push(paramName);
            }
        }
        if (missing.length > 0) {
            const paramList = Object.entries(properties)
                .map(([name, def]: [string, any]) => {
                    const isReq = required.includes(name);
                    return `${name}${isReq ? '' : '?'} (${def.type || 'any'})`;
                })
                .join(', ');
            throw new Error(
                `Missing required parameter${missing.length > 1 ? 's' : ''} '${missing.join("', '")}' for action '${category}.${action}'. Expected parameters: ${paramList}`
            );
        }

        // 4. Type-check provided parameters
        for (const [paramName, paramDef] of Object.entries(properties) as [string, any][]) {
            const value = args[paramName];
            if (value === undefined || value === null) continue;

            const expectedType = paramDef.type;
            if (!expectedType) continue;

            let valid = true;
            switch (expectedType) {
                case 'string':  valid = typeof value === 'string'; break;
                case 'number':  valid = typeof value === 'number'; break;
                case 'boolean': valid = typeof value === 'boolean'; break;
                case 'object':  valid = typeof value === 'object' && !Array.isArray(value); break;
                case 'array':   valid = Array.isArray(value); break;
            }

            if (!valid) {
                throw new Error(
                    `Type mismatch for parameter '${paramName}' in action '${category}.${action}': expected ${expectedType}, got ${Array.isArray(value) ? 'array' : typeof value}`
                );
            }
        }
    }

    /**
     * Automatically refresh the editor after a successful write operation.
     * Uses REFRESH_MAP to determine refresh type. Never throws — refresh
     * failures are reported as warnings, not errors.
     */
    private async autoRefresh(toolName: string, action: string, result: ToolResponse): Promise<void> {
        const key = `${toolName}.${action}`;
        const refreshType = MCPServer.REFRESH_MAP[key];
        if (!refreshType || !result.success) return;

        try {
            if (refreshType === 'scene') {
                await Editor.Message.request('scene', 'soft-reload');
            } else if (refreshType === 'asset') {
                await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets');
            }
            result.refreshed = refreshType;
            this.log(`[MCP] Auto-refreshed: ${refreshType}`);
        } catch (err: any) {
            result.refreshWarning = `Auto-refresh failed: ${err.message}`;
            this.log(`[MCP] Auto-refresh warning: ${err.message}`);
        }
    }

    // === Logging ===

    private log(msg: string): void {
        if (this.enableDebugLog) {
            console.log(msg);
        }
    }
}

// === JSON Fix Helper ===

function fixCommonJsonIssues(input: string): string {
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
