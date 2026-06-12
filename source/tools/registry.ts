/**
 * 工具註冊表：工具定義的單一事實來源。
 * - catalog()：輸出 MCP 工具目錄（sidecar 經 GET /tools 取得後原樣註冊）
 * - invoke()：執行 action（含驗證與逾時），回統一 RpcResponse
 */
import {
    ActionDef,
    McpToolSpec,
    RpcRequest,
    RpcResponse,
    ToolContext,
    ToolDef,
} from '../types';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`TIMEOUT after ${ms}ms`));
        }, ms);
        p.then(
            (v) => {
                clearTimeout(timer);
                resolve(v);
            },
            (e) => {
                clearTimeout(timer);
                reject(e);
            },
        );
    });
}

export class ToolRegistry {
    private tools = new Map<string, ToolDef>();

    register(def: ToolDef): void {
        this.tools.set(def.name, def);
    }

    toolNames(): string[] {
        return Array.from(this.tools.keys());
    }

    /** 產生 MCP 工具目錄：action enum + 各 action 參數合併進同一個 inputSchema */
    catalog(): McpToolSpec[] {
        const specs: McpToolSpec[] = [];
        for (const tool of this.tools.values()) {
            const actionNames = Object.keys(tool.actions);
            const properties: Record<string, unknown> = {
                action: {
                    type: 'string',
                    enum: actionNames,
                    description: 'The operation to perform.',
                },
            };
            const lines: string[] = [];
            for (const [name, action] of Object.entries(tool.actions)) {
                const req = action.required && action.required.length > 0
                    ? ` (requires: ${action.required.join(', ')})`
                    : '';
                lines.push(`- ${name}: ${action.description}${req}`);
                if (action.params) {
                    for (const [key, schema] of Object.entries(action.params)) {
                        if (!(key in properties)) {
                            properties[key] = schema;
                        }
                    }
                }
            }
            specs.push({
                name: tool.name,
                description: `${tool.description}\n\nActions:\n${lines.join('\n')}`,
                inputSchema: {
                    type: 'object',
                    properties,
                    required: ['action'],
                    additionalProperties: false,
                },
            });
        }
        return specs;
    }

    async invoke(req: RpcRequest, ctx: ToolContext): Promise<RpcResponse> {
        const tool = this.tools.get(req.tool);
        if (!tool) {
            return {
                ok: false,
                error: {
                    code: 'UNKNOWN_TOOL',
                    message: `Unknown tool "${req.tool}"`,
                    hint: `Available tools: ${this.toolNames().join(', ')}`,
                },
            };
        }
        const action: ActionDef | undefined = tool.actions[req.action];
        if (!action) {
            return {
                ok: false,
                error: {
                    code: 'UNKNOWN_ACTION',
                    message: `Unknown action "${req.action}" for tool "${req.tool}"`,
                    hint: `Available actions: ${Object.keys(tool.actions).join(', ')}`,
                },
            };
        }
        const args = req.args ?? {};
        if (action.required) {
            for (const key of action.required) {
                if (args[key] === undefined || args[key] === null) {
                    return {
                        ok: false,
                        error: {
                            code: 'BAD_ARGS',
                            message: `Missing required argument "${key}" for ${req.tool}.${req.action}`,
                            hint: `Required: ${action.required.join(', ')}`,
                        },
                    };
                }
            }
        }
        try {
            const data = await withTimeout(action.handler(args, ctx), ctx.settings.requestTimeoutMs);
            return { ok: true, data: data === undefined ? null : data };
        } catch (err: any) {
            const message = String(err && err.message ? err.message : err);
            if (message.startsWith('TIMEOUT')) {
                return {
                    ok: false,
                    error: {
                        code: 'TIMEOUT',
                        message: `${req.tool}.${req.action} ${message}`,
                        hint: 'The editor may be busy or the scene process is not ready. Check scene.query_ready first.',
                    },
                };
            }
            return {
                ok: false,
                error: {
                    code: 'EDITOR_ERROR',
                    message: `${req.tool}.${req.action} failed: ${message}`,
                },
            };
        }
    }
}
