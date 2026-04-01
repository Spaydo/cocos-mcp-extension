import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

interface BroadcastLogEntry {
    channel: string;
    data: any;
    timestamp: string;  // ISO format
}

export class BroadcastTools implements ToolExecutor {
    private listeners: Map<string, Function> = new Map();
    private log: BroadcastLogEntry[] = [];
    private static MAX_LOG = 1000;
    private static PRUNE_TO = 500;

    // Call this from main.ts unload() to clean up
    dispose(): void {
        const msg = Editor.Message as any;
        if (msg.removeBroadcastListener) {
            for (const [channel, handler] of this.listeners) {
                msg.removeBroadcastListener(channel, handler);
            }
        }
        this.listeners.clear();
        this.log = [];
    }

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'listen',
                description: 'Register a broadcast listener for a named editor channel',
                inputSchema: {
                    type: 'object',
                    properties: {
                        channel: { type: 'string', description: 'Broadcast channel name to listen on' },
                    },
                    required: ['channel'],
                },
            },
            {
                name: 'stop_listening',
                description: 'Remove a previously registered broadcast listener',
                inputSchema: {
                    type: 'object',
                    properties: {
                        channel: { type: 'string', description: 'Broadcast channel name to stop listening on' },
                    },
                    required: ['channel'],
                },
            },
            {
                name: 'get_log',
                description: 'Get captured broadcast messages, optionally filtered by channel or timestamp',
                inputSchema: {
                    type: 'object',
                    properties: {
                        channel: { type: 'string', description: 'Filter results to this channel (optional)' },
                        limit: { type: 'number', description: 'Max number of entries to return (default: 50)' },
                        since: { type: 'string', description: 'Return only entries at or after this ISO timestamp (optional)' },
                    },
                },
            },
            {
                name: 'clear_log',
                description: 'Clear all captured broadcast log entries',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_active_listeners',
                description: 'List all currently registered broadcast listener channels',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ];
    }

    async execute(actionName: string, args: any): Promise<ToolResponse> {
        switch (actionName) {
            case 'listen': return this.listen(args.channel);
            case 'stop_listening': return this.stopListening(args.channel);
            case 'get_log': return this.getLog(args);
            case 'clear_log': return this.clearLog();
            case 'get_active_listeners': return this.getActiveListeners();
            default: return { success: false, error: `Unknown broadcast tool: ${actionName}` };
        }
    }

    private async listen(channel: string): Promise<ToolResponse> {
        try {
            if (!channel) {
                return { success: false, error: 'channel is required' };
            }

            if (this.listeners.has(channel)) {
                return { success: true, message: `Already listening on channel: ${channel}` };
            }

            const handler = (data: any) => {
                this.log.push({ channel, data, timestamp: new Date().toISOString() });
                if (this.log.length > BroadcastTools.MAX_LOG) {
                    this.log = this.log.slice(-BroadcastTools.PRUNE_TO);
                }
            };

            (Editor.Message as any).addBroadcastListener(channel, handler);
            this.listeners.set(channel, handler);

            return { success: true, message: `Now listening on channel: ${channel}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async stopListening(channel: string): Promise<ToolResponse> {
        try {
            if (!channel) {
                return { success: false, error: 'channel is required' };
            }

            const handler = this.listeners.get(channel);
            if (!handler) {
                return { success: false, error: `Not listening on channel: ${channel}` };
            }

            (Editor.Message as any).removeBroadcastListener(channel, handler);
            this.listeners.delete(channel);

            return { success: true, message: `Stopped listening on channel: ${channel}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getLog(args: any): Promise<ToolResponse> {
        try {
            const channel: string | undefined = args?.channel;
            const limit: number = args?.limit ?? 50;
            const since: string | undefined = args?.since;

            let entries = this.log;

            if (channel) {
                entries = entries.filter(e => e.channel === channel);
            }

            if (since) {
                entries = entries.filter(e => e.timestamp >= since);
            }

            const result = entries.slice(-limit);

            return {
                success: true,
                data: {
                    total: entries.length,
                    returned: result.length,
                    entries: result,
                },
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async clearLog(): Promise<ToolResponse> {
        try {
            const count = this.log.length;
            this.log = [];
            return { success: true, message: `Cleared ${count} log entries` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getActiveListeners(): Promise<ToolResponse> {
        try {
            const channels = Array.from(this.listeners.keys());
            return {
                success: true,
                data: {
                    count: channels.length,
                    channels,
                },
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
