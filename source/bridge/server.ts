/**
 * Bridge HTTP server：sidecar 與編輯器之間的內部通道。
 * - 只綁 127.0.0.1，Bearer token 驗證
 * - GET  /health（免驗證）：存活確認
 * - GET  /tools：MCP 工具目錄
 * - POST /rpc：{tool, action, args} → RpcResponse
 *
 * 不依賴全域 Editor（資訊由 options 注入），可在編輯器外用系統 Node 測試。
 * 必須維持 Node 14 相容（3.8.4 編輯器）。
 */
import { randomBytes } from 'crypto';
import { createServer, IncomingMessage, Server as HttpServer, ServerResponse } from 'http';
import { McpToolSpec, RpcRequest, RpcResponse } from '../types';

const MAX_BODY_BYTES = 8 * 1024 * 1024;

export interface BridgeServerOptions {
    preferredPort: number;
    /** 埠衝突時向後嘗試的數量（含首選埠） */
    portAttempts?: number;
    projectPath: string;
    editorVersion: string;
    catalog(): McpToolSpec[];
    invoke(req: RpcRequest): Promise<RpcResponse>;
}

export interface BridgeStartResult {
    port: number;
    token: string;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
    const text = JSON.stringify(body);
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(text),
    });
    res.end(text);
}

function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let size = 0;
        req.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('Request body too large'));
                req.destroy();
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', reject);
    });
}

export class BridgeServer {
    private server: HttpServer | null = null;
    private token = '';
    private port = 0;

    constructor(private readonly options: BridgeServerOptions) {}

    get running(): boolean {
        return this.server !== null;
    }

    get currentPort(): number {
        return this.port;
    }

    get currentToken(): string {
        return this.token;
    }

    async start(): Promise<BridgeStartResult> {
        if (this.server) {
            return { port: this.port, token: this.token };
        }
        this.token = randomBytes(24).toString('hex');
        const attempts = this.options.portAttempts ?? 10;
        let lastErr: Error | null = null;
        for (let i = 0; i < attempts; i++) {
            const candidate = this.options.preferredPort + i;
            try {
                await this.listen(candidate);
                this.port = candidate;
                return { port: this.port, token: this.token };
            } catch (err: any) {
                lastErr = err;
                if (err && err.code === 'EADDRINUSE') {
                    continue;
                }
                throw err;
            }
        }
        throw lastErr ?? new Error('No free port for bridge server');
    }

    async stop(): Promise<void> {
        const server = this.server;
        if (!server) return;
        this.server = null;
        this.port = 0;
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    }

    private listen(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const server = createServer((req, res) => {
                this.handle(req, res).catch((err) => {
                    sendJson(res, 500, {
                        ok: false,
                        error: { code: 'EDITOR_ERROR', message: String(err && err.message ? err.message : err) },
                    });
                });
            });
            const onError = (err: Error) => {
                server.removeListener('error', onError);
                reject(err);
            };
            server.once('error', onError);
            server.listen(port, '127.0.0.1', () => {
                server.removeListener('error', onError);
                this.server = server;
                resolve();
            });
        });
    }

    private authorized(req: IncomingMessage): boolean {
        const header = req.headers.authorization || '';
        return header === `Bearer ${this.token}`;
    }

    private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
        const url = (req.url || '').split('?')[0];

        if (req.method === 'GET' && url === '/health') {
            sendJson(res, 200, {
                ok: true,
                name: 'cocos-mcp-bridge',
                pid: process.pid,
                editorVersion: this.options.editorVersion,
                projectPath: this.options.projectPath,
            });
            return;
        }

        if (!this.authorized(req)) {
            sendJson(res, 401, {
                ok: false,
                error: { code: 'EDITOR_ERROR', message: 'Unauthorized: invalid or missing bridge token' },
            });
            return;
        }

        if (req.method === 'GET' && url === '/tools') {
            sendJson(res, 200, { tools: this.options.catalog() });
            return;
        }

        if (req.method === 'POST' && url === '/rpc') {
            let body: RpcRequest;
            try {
                body = JSON.parse(await readBody(req));
            } catch (err: any) {
                sendJson(res, 400, {
                    ok: false,
                    error: { code: 'BAD_ARGS', message: `Invalid JSON body: ${String(err && err.message ? err.message : err)}` },
                });
                return;
            }
            if (!body || typeof body.tool !== 'string' || typeof body.action !== 'string') {
                sendJson(res, 400, {
                    ok: false,
                    error: { code: 'BAD_ARGS', message: 'Body must be {tool: string, action: string, args?: object}' },
                });
                return;
            }
            const result = await this.options.invoke(body);
            sendJson(res, 200, result);
            return;
        }

        sendJson(res, 404, {
            ok: false,
            error: { code: 'EDITOR_ERROR', message: `Not found: ${req.method} ${url}` },
        });
    }
}
