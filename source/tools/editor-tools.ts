import * as os from 'os';
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
            {
                name: 'get_all_preferences',
                description: 'Get all editor preferences across known categories',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scope: { type: 'string', description: 'Scope: global or project (default: global)' },
                    },
                },
            },
            {
                name: 'reset_preferences',
                description: 'Reset a preference category to default values',
                inputSchema: {
                    type: 'object',
                    properties: {
                        protocol: { type: 'string', description: 'Preference category name (e.g. general, preview)' },
                        scope: { type: 'string', description: 'Scope: global or project (default: global)' },
                    },
                    required: ['protocol'],
                },
            },
            {
                name: 'export_preferences',
                description: 'Export all preferences as a JSON snapshot',
                inputSchema: {
                    type: 'object',
                    properties: {
                        scope: { type: 'string', description: 'Scope: global or project (default: global)' },
                    },
                },
            },
            {
                name: 'import_preferences',
                description: 'Import preferences from JSON (not yet available)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        data: { type: 'object', description: 'Preferences data to import' },
                    },
                },
            },
            {
                name: 'query_server_ip_list',
                description: 'Get the list of server IP addresses',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'check_connectivity',
                description: 'Check editor server connectivity and measure latency',
                inputSchema: {
                    type: 'object',
                    properties: {
                        timeout: { type: 'number', description: 'Timeout in milliseconds (default: 5000)' },
                    },
                },
            },
            {
                name: 'get_network_interfaces',
                description: 'List all local network interfaces and addresses',
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
            case 'get_all_preferences': return this.getAllPreferences(args?.scope);
            case 'reset_preferences': return this.resetPreferences(args.protocol, args?.scope);
            case 'export_preferences': return this.exportPreferences(args?.scope);
            case 'import_preferences': return this.importPreferences();
            case 'query_server_ip_list': return this.queryServerIpList();
            case 'check_connectivity': return this.checkConnectivity(args);
            case 'get_network_interfaces': return this.getNetworkInterfaces();
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

    private async getAllPreferences(scope?: string): Promise<ToolResponse> {
        try {
            const protocols = ['general', 'external-tools', 'preview', 'build', 'engine', 'laboratory'];
            const result: Record<string, any> = {};
            for (const protocol of protocols) {
                try {
                    if (scope === 'project') {
                        result[protocol] = await Editor.Profile.getProject(protocol, '');
                    } else {
                        result[protocol] = await (Editor.Profile as any).getConfig(protocol, '');
                    }
                } catch {
                    // skip protocols that throw errors
                }
            }
            return { success: true, data: { scope: scope || 'global', preferences: result } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async resetPreferences(protocol: string, scope?: string): Promise<ToolResponse> {
        try {
            let defaults: any;
            try {
                if (scope === 'project') {
                    defaults = await Editor.Profile.getProject(protocol, '');
                } else {
                    defaults = await (Editor.Profile as any).getConfig(protocol, '');
                }
            } catch {
                return { success: false, error: `Unable to retrieve defaults for protocol "${protocol}". The Editor API does not expose a reset-to-defaults method. Please reset preferences through the Editor UI (Edit > Preferences).` };
            }
            if (defaults === undefined || defaults === null) {
                return { success: false, error: `No default values found for protocol "${protocol}". Please reset preferences through the Editor UI (Edit > Preferences).` };
            }
            if (scope === 'project') {
                await Editor.Profile.setProject(protocol, '', defaults);
            } else {
                await Editor.Profile.setConfig(protocol, '', defaults);
            }
            return { success: true, message: `Preferences for "${protocol}" have been reset (${scope || 'global'} scope).` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async exportPreferences(scope?: string): Promise<ToolResponse> {
        try {
            const inner = await this.getAllPreferences(scope);
            if (!inner.success) {
                return inner;
            }
            const snapshot = {
                exportedAt: new Date().toISOString(),
                scope: scope || 'global',
                editorVersion: Editor.App.version || 'unknown',
                projectPath: Editor.Project.path,
                preferences: (inner.data as any).preferences,
            };
            return { success: true, data: snapshot };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async importPreferences(): Promise<ToolResponse> {
        return { success: false, error: 'import_preferences is not yet available. Please import preferences through the Editor UI.' };
    }

    private async queryServerIpList(): Promise<ToolResponse> {
        try {
            const ipList = await Editor.Message.request('server', 'query-ip-list');
            return { success: true, data: ipList };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async checkConnectivity(args: any): Promise<ToolResponse> {
        const timeout = args?.timeout || 5000;
        const start = Date.now();
        try {
            const port = await Promise.race([
                Editor.Message.request('server', 'query-port'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
            ]);
            const latency = Date.now() - start;
            return { success: true, data: { reachable: true, latencyMs: latency, port } };
        } catch {
            return { success: true, data: { reachable: false, latencyMs: Date.now() - start, timeout } };
        }
    }

    private async getNetworkInterfaces(): Promise<ToolResponse> {
        try {
            const raw = os.networkInterfaces();
            const interfaces = Object.entries(raw).map(([name, addrs]) => ({
                name,
                addresses: (addrs || []).map(({ address, family, internal }) => ({ address, family, internal })),
            }));
            return { success: true, data: interfaces };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
