import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class EditorTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'preferences_query',
                description: 'Read editor or project preferences by key',
                inputSchema: {
                    type: 'object',
                    properties: {
                        protocol: { type: 'string', description: 'Protocol name, e.g. general, builder, engine' },
                        key: { type: 'string', description: 'Preference key to read' },
                        scope: { type: 'string', description: 'Scope: global or project (default: global)' },
                    },
                    required: ['protocol', 'key'],
                },
            },
            {
                name: 'preferences_set',
                description: 'Write editor or project preferences',
                inputSchema: {
                    type: 'object',
                    properties: {
                        protocol: { type: 'string', description: 'Protocol name' },
                        key: { type: 'string', description: 'Preference key to set' },
                        value: { description: 'Value to set' },
                        scope: { type: 'string', description: 'Scope: global or project (default: global)' },
                    },
                    required: ['protocol', 'key', 'value'],
                },
            },
            {
                name: 'open_settings',
                description: 'Open the editor preferences panel',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'network_info',
                description: 'Get server IPs and preview port information',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'editor_info',
                description: 'Get editor version, platform, and Node.js version',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'engine_info',
                description: 'Get engine version, path, and native engine info',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'open_url',
                description: 'Open a URL or external program',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'URL or program path to open' },
                    },
                    required: ['url'],
                },
            },
            {
                name: 'query_devices',
                description: 'Query connected devices (for native platform debugging)',
                inputSchema: { type: 'object', properties: {} },
            },
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'preferences_query': return this.preferencesQuery(args.protocol, args.key, args.scope);
            case 'preferences_set': return this.preferencesSet(args.protocol, args.key, args.value, args.scope);
            case 'open_settings': return this.openSettings();
            case 'network_info': return this.networkInfo();
            case 'editor_info': return this.editorInfo();
            case 'engine_info': return this.engineInfo();
            case 'open_url': return this.openUrl(args.url);
            case 'query_devices': return this.queryDevices();
            default: return { success: false, error: `Unknown editor tool: ${toolName}` };
        }
    }

    private async preferencesQuery(protocol: string, key: string, scope?: string): Promise<ToolResponse> {
        try {
            let value: any;
            if (scope === 'project') {
                value = await Editor.Profile.getProject(protocol, key);
            } else {
                value = await Editor.Profile.getConfig(protocol, key);
            }
            return { success: true, data: { protocol, key, scope: scope || 'global', value } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async preferencesSet(protocol: string, key: string, value: any, scope?: string): Promise<ToolResponse> {
        try {
            if (scope === 'project') {
                await Editor.Profile.setProject(protocol, key, value);
            } else {
                await Editor.Profile.setConfig(protocol, key, value);
            }
            return { success: true, message: `Set ${protocol}.${key} = ${JSON.stringify(value)} (${scope || 'global'})` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async openSettings(): Promise<ToolResponse> {
        try {
            Editor.Panel.open('preferences');
            return { success: true, message: 'Preferences panel opened' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async networkInfo(): Promise<ToolResponse> {
        try {
            const data: any = {};
            try {
                const ipList: any = await Editor.Message.request('server', 'query-ip-list');
                data.ipList = ipList;
            } catch {
                data.ipList = null;
            }
            try {
                const port: any = await Editor.Message.request('server', 'query-port');
                data.port = port;
            } catch {
                data.port = null;
            }
            return { success: true, data };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async editorInfo(): Promise<ToolResponse> {
        try {
            const data: any = {
                version: Editor.App.version || 'unknown',
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                electronVersion: process.versions?.electron || 'unknown',
                projectPath: Editor.Project.path,
            };
            return { success: true, data };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async engineInfo(): Promise<ToolResponse> {
        try {
            const info: any = await (Editor.Message.request as any)('engine', 'query-info');
            return { success: true, data: info };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async openUrl(url: string): Promise<ToolResponse> {
        try {
            await (Editor.Message.request as any)('program', 'open-url', url);
            return { success: true, message: `Opened: ${url}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryDevices(): Promise<ToolResponse> {
        try {
            const devices: any = await (Editor.Message.request as any)('device', 'query');
            return { success: true, data: devices || [] };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
