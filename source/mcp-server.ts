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
    private enableDebugLog: boolean = false;

    constructor(settings: MCPServerSettings) {
        this.settings = settings;
        this.enableDebugLog = settings.enableDebugLog;
    }

    // === Tool Registration ===

    registerToolCategory(category: string, executor: ToolExecutor): void {
        this.tools[category] = executor;
    }

    setupTools(): void {
        this.toolsList = [];
        for (const [category, executor] of Object.entries(this.tools)) {
            const tools = executor.getTools();
            for (const tool of tools) {
                this.toolsList.push({
                    ...tool,
                    name: `${category}_${tool.name}`,
                });
            }
        }
        this.log(`Tools registered: ${this.toolsList.length}`);
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

    updateSettings(settings: MCPServerSettings): void {
        this.settings = settings;
        this.enableDebugLog = settings.enableDebugLog;
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
        const idx = toolName.indexOf('_');
        if (idx === -1) {
            throw new Error(`Invalid tool name format: ${toolName}`);
        }

        const category = toolName.substring(0, idx);
        const method = toolName.substring(idx + 1);

        const executor = this.tools[category];
        if (!executor) {
            throw new Error(`Unknown tool category: ${category}`);
        }

        this.log(`[MCP] Executing: ${category}.${method}`);
        const result = await executor.execute(method, args);
        this.log(`[MCP] Result: ${result.success ? 'OK' : 'FAIL'}`);

        return result;
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
