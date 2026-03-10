import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

const EXTENSION_NAME = 'cocos-mcp-extension';

// In-memory log buffer
const logBuffer: { timestamp: string; level: string; message: string }[] = [];
const MAX_LOGS = 200;

/** Add a log entry to the buffer (called from main.ts or tools) */
export function addLog(level: string, message: string): void {
    logBuffer.push({
        timestamp: new Date().toISOString(),
        level,
        message,
    });
    if (logBuffer.length > MAX_LOGS) {
        logBuffer.splice(0, logBuffer.length - MAX_LOGS);
    }
}

export class DebugTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'get_logs',
                description: 'Get recent console logs from the extension',
                inputSchema: {
                    type: 'object',
                    properties: {
                        count: { type: 'number', description: 'Number of recent logs (default 20)' },
                        level: { type: 'string', description: 'Filter by level: log, warn, error' },
                    },
                },
            },
            {
                name: 'clear_logs',
                description: 'Clear the log buffer',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'execute_script',
                description: 'Execute JavaScript in scene context (has access to cc.* APIs)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        code: { type: 'string', description: 'JavaScript code to execute' },
                    },
                    required: ['code'],
                },
            },
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'get_logs': return this.getLogs(args?.count, args?.level);
            case 'clear_logs': return this.clearLogs();
            case 'execute_script': return this.executeScript(args.code);
            default: return { success: false, error: `Unknown debug tool: ${toolName}` };
        }
    }

    private async getLogs(count: number = 20, level?: string): Promise<ToolResponse> {
        let logs = logBuffer;
        if (level) {
            logs = logs.filter(l => l.level === level);
        }
        const result = logs.slice(-count);
        return { success: true, data: { count: result.length, logs: result } };
    }

    private async clearLogs(): Promise<ToolResponse> {
        logBuffer.length = 0;
        return { success: true, message: 'Logs cleared' };
    }

    private async executeScript(code: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'executeScript',
                args: [code],
            });
            return result || { success: false, error: 'No result returned' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
