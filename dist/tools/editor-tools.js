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
exports.EditorTools = void 0;
const os = __importStar(require("os"));
class EditorTools {
    getTools() {
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
    async execute(toolName, args) {
        switch (toolName) {
            case 'preferences_query': return this.preferencesQuery(args.protocol, args.key, args.scope);
            case 'preferences_set': return this.preferencesSet(args.protocol, args.key, args.value, args.scope);
            case 'open_settings': return this.openSettings();
            case 'network_info': return this.networkInfo();
            case 'editor_info': return this.editorInfo();
            case 'engine_info': return this.engineInfo();
            case 'open_url': return this.openUrl(args.url);
            case 'query_devices': return this.queryDevices();
            case 'get_all_preferences': return this.getAllPreferences(args === null || args === void 0 ? void 0 : args.scope);
            case 'reset_preferences': return this.resetPreferences(args.protocol, args === null || args === void 0 ? void 0 : args.scope);
            case 'export_preferences': return this.exportPreferences(args === null || args === void 0 ? void 0 : args.scope);
            case 'import_preferences': return this.importPreferences();
            case 'query_server_ip_list': return this.queryServerIpList();
            case 'check_connectivity': return this.checkConnectivity(args);
            case 'get_network_interfaces': return this.getNetworkInterfaces();
            default: return { success: false, error: `Unknown editor tool: ${toolName}` };
        }
    }
    async preferencesQuery(protocol, key, scope) {
        try {
            let value;
            if (scope === 'project') {
                value = await Editor.Profile.getProject(protocol, key);
            }
            else {
                value = await Editor.Profile.getConfig(protocol, key);
            }
            return { success: true, data: { protocol, key, scope: scope || 'global', value } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async preferencesSet(protocol, key, value, scope) {
        try {
            if (scope === 'project') {
                await Editor.Profile.setProject(protocol, key, value);
            }
            else {
                await Editor.Profile.setConfig(protocol, key, value);
            }
            return { success: true, message: `Set ${protocol}.${key} = ${JSON.stringify(value)} (${scope || 'global'})` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async openSettings() {
        try {
            Editor.Panel.open('preferences');
            return { success: true, message: 'Preferences panel opened' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async networkInfo() {
        try {
            const data = {};
            try {
                const ipList = await Editor.Message.request('server', 'query-ip-list');
                data.ipList = ipList;
            }
            catch (_a) {
                data.ipList = null;
            }
            try {
                const port = await Editor.Message.request('server', 'query-port');
                data.port = port;
            }
            catch (_b) {
                data.port = null;
            }
            return { success: true, data };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async editorInfo() {
        var _a;
        try {
            const data = {
                version: Editor.App.version || 'unknown',
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                electronVersion: ((_a = process.versions) === null || _a === void 0 ? void 0 : _a.electron) || 'unknown',
                projectPath: Editor.Project.path,
            };
            return { success: true, data };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async engineInfo() {
        try {
            const info = await Editor.Message.request('engine', 'query-info');
            return { success: true, data: info };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async openUrl(url) {
        try {
            await Editor.Message.request('program', 'open-url', url);
            return { success: true, message: `Opened: ${url}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async queryDevices() {
        try {
            const devices = await Editor.Message.request('device', 'query');
            return { success: true, data: devices || [] };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async getAllPreferences(scope) {
        try {
            const protocols = ['general', 'external-tools', 'preview', 'build', 'engine', 'laboratory'];
            const result = {};
            for (const protocol of protocols) {
                try {
                    if (scope === 'project') {
                        result[protocol] = await Editor.Profile.getProject(protocol, '');
                    }
                    else {
                        result[protocol] = await Editor.Profile.getConfig(protocol, '');
                    }
                }
                catch (_a) {
                    // skip protocols that throw errors
                }
            }
            return { success: true, data: { scope: scope || 'global', preferences: result } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async resetPreferences(protocol, scope) {
        try {
            let defaults;
            try {
                if (scope === 'project') {
                    defaults = await Editor.Profile.getProject(protocol, '');
                }
                else {
                    defaults = await Editor.Profile.getConfig(protocol, '');
                }
            }
            catch (_a) {
                return { success: false, error: `Unable to retrieve defaults for protocol "${protocol}". The Editor API does not expose a reset-to-defaults method. Please reset preferences through the Editor UI (Edit > Preferences).` };
            }
            if (defaults === undefined || defaults === null) {
                return { success: false, error: `No default values found for protocol "${protocol}". Please reset preferences through the Editor UI (Edit > Preferences).` };
            }
            if (scope === 'project') {
                await Editor.Profile.setProject(protocol, '', defaults);
            }
            else {
                await Editor.Profile.setConfig(protocol, '', defaults);
            }
            return { success: true, message: `Preferences for "${protocol}" have been reset (${scope || 'global'} scope).` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async exportPreferences(scope) {
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
                preferences: inner.data.preferences,
            };
            return { success: true, data: snapshot };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async importPreferences() {
        return { success: false, error: 'import_preferences is not yet available. Please import preferences through the Editor UI.' };
    }
    async queryServerIpList() {
        try {
            const ipList = await Editor.Message.request('server', 'query-ip-list');
            return { success: true, data: ipList };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async checkConnectivity(args) {
        const timeout = (args === null || args === void 0 ? void 0 : args.timeout) || 5000;
        const start = Date.now();
        try {
            const port = await Promise.race([
                Editor.Message.request('server', 'query-port'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
            ]);
            const latency = Date.now() - start;
            return { success: true, data: { reachable: true, latencyMs: latency, port } };
        }
        catch (_a) {
            return { success: true, data: { reachable: false, latencyMs: Date.now() - start, timeout } };
        }
    }
    async getNetworkInterfaces() {
        try {
            const raw = os.networkInterfaces();
            const interfaces = Object.entries(raw).map(([name, addrs]) => ({
                name,
                addresses: (addrs || []).map(({ address, family, internal }) => ({ address, family, internal })),
            }));
            return { success: true, data: interfaces };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
}
exports.EditorTools = EditorTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2VkaXRvci10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx1Q0FBeUI7QUFHekIsTUFBYSxXQUFXO0lBRXBCLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLG1CQUFtQjtnQkFDekIsV0FBVyxFQUFFLDJDQUEyQztnQkFDeEQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSw4Q0FBOEMsRUFBRTt3QkFDekYsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsd0JBQXdCLEVBQUU7d0JBQzlELEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDRDQUE0QyxFQUFFO3FCQUN2RjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDO2lCQUNoQzthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGlCQUFpQjtnQkFDdkIsV0FBVyxFQUFFLHFDQUFxQztnQkFDbEQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUU7d0JBQzFELEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHVCQUF1QixFQUFFO3dCQUM3RCxLQUFLLEVBQUUsRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFO3dCQUN0QyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSw0Q0FBNEMs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Q0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUMzRCxJQUFJO2dCQUNKLFNBQVMsRUFBRSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7YUFDbkcsQ0FBQyxDQUFDLENBQUM7WUFDSixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUM7UUFDL0MsQ0FBQztRQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7WUFDaEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRCxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBdldELGtDQXVXQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIG9zIGZyb20gJ29zJztcclxuaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEVkaXRvclRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncHJlZmVyZW5jZXNfcXVlcnknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZWFkIGVkaXRvciBvciBwcm9qZWN0IHByZWZlcmVuY2VzIGJ5IGtleScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJvdG9jb2wgbmFtZSwgZS5nLiBnZW5lcmFsLCBidWlsZGVyLCBlbmdpbmUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGtleTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQcmVmZXJlbmNlIGtleSB0byByZWFkJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTY29wZTogZ2xvYmFsIG9yIHByb2plY3QgKGRlZmF1bHQ6IGdsb2JhbCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydwcm90b2NvbCcsICdrZXknXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdwcmVmZXJlbmNlc19zZXQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdXcml0ZSBlZGl0b3Igb3IgcHJvamVjdCBwcmVmZXJlbmNlcycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJvdG9jb2wgbmFtZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1ByZWZlcmVuY2Uga2V5IHRvIHNldCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgZGVzY3JpcHRpb246ICdWYWx1ZSB0byBzZXQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1Njb3BlOiBnbG9iYWwgb3IgcHJvamVjdCAoZGVmYXVsdDogZ2xvYmFsKScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3Byb3RvY29sJywgJ2tleScsICd2YWx1ZSddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ29wZW5fc2V0dGluZ3MnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPcGVuIHRoZSBlZGl0b3IgcHJlZmVyZW5jZXMgcGFuZWwnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICduZXR3b3JrX2luZm8nLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgc2VydmVyIElQcyBhbmQgcHJldmlldyBwb3J0IGluZm9ybWF0aW9uJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZWRpdG9yX2luZm8nLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgZWRpdG9yIHZlcnNpb24sIHBsYXRmb3JtLCBhbmQgTm9kZS5qcyB2ZXJzaW9uJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZW5naW5lX2luZm8nLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgZW5naW5lIHZlcnNpb24sIHBhdGgsIGFuZCBuYXRpdmUgZW5naW5lIGluZm8nLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdvcGVuX3VybCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09wZW4gYSBVUkwgb3IgZXh0ZXJuYWwgcHJvZ3JhbScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VSTCBvciBwcm9ncmFtIHBhdGggdG8gb3BlbicgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3VybCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5X2RldmljZXMnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdRdWVyeSBjb25uZWN0ZWQgZGV2aWNlcyAoZm9yIG5hdGl2ZSBwbGF0Zm9ybSBkZWJ1Z2dpbmcpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2V0X2FsbF9wcmVmZXJlbmNlcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBhbGwgZWRpdG9yIHByZWZlcmVuY2VzIGFjcm9zcyBrbm93biBjYXRlZ29yaWVzJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTY29wZTogZ2xvYmFsIG9yIHByb2plY3QgKGRlZmF1bHQ6IGdsb2JhbCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZXNldF9wcmVmZXJlbmNlcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Jlc2V0IGEgcHJlZmVyZW5jZSBjYXRlZ29yeSB0byBkZWZhdWx0IHZhbHVlcycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJlZmVyZW5jZSBjYXRlZ29yeSBuYW1lIChlLmcuIGdlbmVyYWwsIHByZXZpZXcpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTY29wZTogZ2xvYmFsIG9yIHByb2plY3QgKGRlZmF1bHQ6IGdsb2JhbCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydwcm90b2NvbCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2V4cG9ydF9wcmVmZXJlbmNlcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0V4cG9ydCBhbGwgcHJlZmVyZW5jZXMgYXMgYSBKU09OIHNuYXBzaG90JyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY29wZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTY29wZTogZ2xvYmFsIG9yIHByb2plY3QgKGRlZmF1bHQ6IGdsb2JhbCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdpbXBvcnRfcHJlZmVyZW5jZXMnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbXBvcnQgcHJlZmVyZW5jZXMgZnJvbSBKU09OIChub3QgeWV0IGF2YWlsYWJsZSknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgdHlwZTogJ29iamVjdCcsIGRlc2NyaXB0aW9uOiAnUHJlZmVyZW5jZXMgZGF0YSB0byBpbXBvcnQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeV9zZXJ2ZXJfaXBfbGlzdCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCB0aGUgbGlzdCBvZiBzZXJ2ZXIgSVAgYWRkcmVzc2VzJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY2hlY2tfY29ubmVjdGl2aXR5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgZWRpdG9yIHNlcnZlciBjb25uZWN0aXZpdHkgYW5kIG1lYXN1cmUgbGF0ZW5jeScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdUaW1lb3V0IGluIG1pbGxpc2Vjb25kcyAoZGVmYXVsdDogNTAwMCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdnZXRfbmV0d29ya19pbnRlcmZhY2VzJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgbG9jYWwgbmV0d29yayBpbnRlcmZhY2VzIGFuZCBhZGRyZXNzZXMnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdwcmVmZXJlbmNlc19xdWVyeSc6IHJldHVybiB0aGlzLnByZWZlcmVuY2VzUXVlcnkoYXJncy5wcm90b2NvbCwgYXJncy5rZXksIGFyZ3Muc2NvcGUpO1xyXG4gICAgICAgICAgICBjYXNlICdwcmVmZXJlbmNlc19zZXQnOiByZXR1cm4gdGhpcy5wcmVmZXJlbmNlc1NldChhcmdzLnByb3RvY29sLCBhcmdzLmtleSwgYXJncy52YWx1ZSwgYXJncy5zY29wZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ29wZW5fc2V0dGluZ3MnOiByZXR1cm4gdGhpcy5vcGVuU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgY2FzZSAnbmV0d29ya19pbmZvJzogcmV0dXJuIHRoaXMubmV0d29ya0luZm8oKTtcclxuICAgICAgICAgICAgY2FzZSAnZWRpdG9yX2luZm8nOiByZXR1cm4gdGhpcy5lZGl0b3JJbmZvKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2VuZ2luZV9pbmZvJzogcmV0dXJuIHRoaXMuZW5naW5lSW5mbygpO1xyXG4gICAgICAgICAgICBjYXNlICdvcGVuX3VybCc6IHJldHVybiB0aGlzLm9wZW5VcmwoYXJncy51cmwpO1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeV9kZXZpY2VzJzogcmV0dXJuIHRoaXMucXVlcnlEZXZpY2VzKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2dldF9hbGxfcHJlZmVyZW5jZXMnOiByZXR1cm4gdGhpcy5nZXRBbGxQcmVmZXJlbmNlcyhhcmdzPy5zY29wZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3Jlc2V0X3ByZWZlcmVuY2VzJzogcmV0dXJuIHRoaXMucmVzZXRQcmVmZXJlbmNlcyhhcmdzLnByb3RvY29sLCBhcmdzPy5zY29wZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2V4cG9ydF9wcmVmZXJlbmNlcyc6IHJldHVybiB0aGlzLmV4cG9ydFByZWZlcmVuY2VzKGFyZ3M/LnNjb3BlKTtcclxuICAgICAgICAgICAgY2FzZSAnaW1wb3J0X3ByZWZlcmVuY2VzJzogcmV0dXJuIHRoaXMuaW1wb3J0UHJlZmVyZW5jZXMoKTtcclxuICAgICAgICAgICAgY2FzZSAncXVlcnlfc2VydmVyX2lwX2xpc3QnOiByZXR1cm4gdGhpcy5xdWVyeVNlcnZlcklwTGlzdCgpO1xyXG4gICAgICAgICAgICBjYXNlICdjaGVja19jb25uZWN0aXZpdHknOiByZXR1cm4gdGhpcy5jaGVja0Nvbm5lY3Rpdml0eShhcmdzKTtcclxuICAgICAgICAgICAgY2FzZSAnZ2V0X25ldHdvcmtfaW50ZXJmYWNlcyc6IHJldHVybiB0aGlzLmdldE5ldHdvcmtJbnRlcmZhY2VzKCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gZWRpdG9yIHRvb2w6ICR7dG9vbE5hbWV9YCB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHByZWZlcmVuY2VzUXVlcnkocHJvdG9jb2w6IHN0cmluZywga2V5OiBzdHJpbmcsIHNjb3BlPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsZXQgdmFsdWU6IGFueTtcclxuICAgICAgICAgICAgaWYgKHNjb3BlID09PSAncHJvamVjdCcpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gYXdhaXQgRWRpdG9yLlByb2ZpbGUuZ2V0UHJvamVjdChwcm90b2NvbCwga2V5KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlID0gYXdhaXQgRWRpdG9yLlByb2ZpbGUuZ2V0Q29uZmlnKHByb3RvY29sLCBrZXkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgcHJvdG9jb2wsIGtleSwgc2NvcGU6IHNjb3BlIHx8ICdnbG9iYWwnLCB2YWx1ZSB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHByZWZlcmVuY2VzU2V0KHByb3RvY29sOiBzdHJpbmcsIGtleTogc3RyaW5nLCB2YWx1ZTogYW55LCBzY29wZT86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKHNjb3BlID09PSAncHJvamVjdCcpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5Qcm9maWxlLnNldFByb2plY3QocHJvdG9jb2wsIGtleSwgdmFsdWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLlByb2ZpbGUuc2V0Q29uZmlnKHByb3RvY29sLCBrZXksIHZhbHVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgU2V0ICR7cHJvdG9jb2x9LiR7a2V5fSA9ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfSAoJHtzY29wZSB8fCAnZ2xvYmFsJ30pYCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuU2V0dGluZ3MoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBFZGl0b3IuUGFuZWwub3BlbigncHJlZmVyZW5jZXMnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ1ByZWZlcmVuY2VzIHBhbmVsIG9wZW5lZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbmV0d29ya0luZm8oKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhOiBhbnkgPSB7fTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGlwTGlzdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2VydmVyJywgJ3F1ZXJ5LWlwLWxpc3QnKTtcclxuICAgICAgICAgICAgICAgIGRhdGEuaXBMaXN0ID0gaXBMaXN0O1xyXG4gICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgIGRhdGEuaXBMaXN0ID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9ydDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2VydmVyJywgJ3F1ZXJ5LXBvcnQnKTtcclxuICAgICAgICAgICAgICAgIGRhdGEucG9ydCA9IHBvcnQ7XHJcbiAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgZGF0YS5wb3J0ID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGVkaXRvckluZm8oKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhOiBhbnkgPSB7XHJcbiAgICAgICAgICAgICAgICB2ZXJzaW9uOiBFZGl0b3IuQXBwLnZlcnNpb24gfHwgJ3Vua25vd24nLFxyXG4gICAgICAgICAgICAgICAgcGxhdGZvcm06IHByb2Nlc3MucGxhdGZvcm0sXHJcbiAgICAgICAgICAgICAgICBhcmNoOiBwcm9jZXNzLmFyY2gsXHJcbiAgICAgICAgICAgICAgICBub2RlVmVyc2lvbjogcHJvY2Vzcy52ZXJzaW9uLFxyXG4gICAgICAgICAgICAgICAgZWxlY3Ryb25WZXJzaW9uOiBwcm9jZXNzLnZlcnNpb25zPy5lbGVjdHJvbiB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICBwcm9qZWN0UGF0aDogRWRpdG9yLlByb2plY3QucGF0aCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBlbmdpbmVJbmZvKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgaW5mbzogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnZW5naW5lJywgJ3F1ZXJ5LWluZm8nKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaW5mbyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuVXJsKHVybDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdwcm9ncmFtJywgJ29wZW4tdXJsJywgdXJsKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYE9wZW5lZDogJHt1cmx9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeURldmljZXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBkZXZpY2VzOiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdkZXZpY2UnLCAncXVlcnknKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogZGV2aWNlcyB8fCBbXSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRBbGxQcmVmZXJlbmNlcyhzY29wZT86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcHJvdG9jb2xzID0gWydnZW5lcmFsJywgJ2V4dGVybmFsLXRvb2xzJywgJ3ByZXZpZXcnLCAnYnVpbGQnLCAnZW5naW5lJywgJ2xhYm9yYXRvcnknXTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgcHJvdG9jb2wgb2YgcHJvdG9jb2xzKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzY29wZSA9PT0gJ3Byb2plY3QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3VsdFtwcm90b2NvbF0gPSBhd2FpdCBFZGl0b3IuUHJvZmlsZS5nZXRQcm9qZWN0KHByb3RvY29sLCAnJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0W3Byb3RvY29sXSA9IGF3YWl0IChFZGl0b3IuUHJvZmlsZSBhcyBhbnkpLmdldENvbmZpZyhwcm90b2NvbCwgJycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHNraXAgcHJvdG9jb2xzIHRoYXQgdGhyb3cgZXJyb3JzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBzY29wZTogc2NvcGUgfHwgJ2dsb2JhbCcsIHByZWZlcmVuY2VzOiByZXN1bHQgfSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldFByZWZlcmVuY2VzKHByb3RvY29sOiBzdHJpbmcsIHNjb3BlPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsZXQgZGVmYXVsdHM6IGFueTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmIChzY29wZSA9PT0gJ3Byb2plY3QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdHMgPSBhd2FpdCBFZGl0b3IuUHJvZmlsZS5nZXRQcm9qZWN0KHByb3RvY29sLCAnJyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRzID0gYXdhaXQgKEVkaXRvci5Qcm9maWxlIGFzIGFueSkuZ2V0Q29uZmlnKHByb3RvY29sLCAnJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5hYmxlIHRvIHJldHJpZXZlIGRlZmF1bHRzIGZvciBwcm90b2NvbCBcIiR7cHJvdG9jb2x9XCIuIFRoZSBFZGl0b3IgQVBJIGRvZXMgbm90IGV4cG9zZSBhIHJlc2V0LXRvLWRlZmF1bHRzIG1ldGhvZC4gUGxlYXNlIHJlc2V0IHByZWZlcmVuY2VzIHRocm91Z2ggdGhlIEVkaXRvciBVSSAoRWRpdCA+IFByZWZlcmVuY2VzKS5gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRlZmF1bHRzID09PSB1bmRlZmluZWQgfHwgZGVmYXVsdHMgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vIGRlZmF1bHQgdmFsdWVzIGZvdW5kIGZvciBwcm90b2NvbCBcIiR7cHJvdG9jb2x9XCIuIFBsZWFzZSByZXNldCBwcmVmZXJlbmNlcyB0aHJvdWdoIHRoZSBFZGl0b3IgVUkgKEVkaXQgPiBQcmVmZXJlbmNlcykuYCB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChzY29wZSA9PT0gJ3Byb2plY3QnKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuUHJvZmlsZS5zZXRQcm9qZWN0KHByb3RvY29sLCAnJywgZGVmYXVsdHMpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLlByb2ZpbGUuc2V0Q29uZmlnKHByb3RvY29sLCAnJywgZGVmYXVsdHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBQcmVmZXJlbmNlcyBmb3IgXCIke3Byb3RvY29sfVwiIGhhdmUgYmVlbiByZXNldCAoJHtzY29wZSB8fCAnZ2xvYmFsJ30gc2NvcGUpLmAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhwb3J0UHJlZmVyZW5jZXMoc2NvcGU/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlubmVyID0gYXdhaXQgdGhpcy5nZXRBbGxQcmVmZXJlbmNlcyhzY29wZSk7XHJcbiAgICAgICAgICAgIGlmICghaW5uZXIuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGlubmVyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHNuYXBzaG90ID0ge1xyXG4gICAgICAgICAgICAgICAgZXhwb3J0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgc2NvcGU6IHNjb3BlIHx8ICdnbG9iYWwnLFxyXG4gICAgICAgICAgICAgICAgZWRpdG9yVmVyc2lvbjogRWRpdG9yLkFwcC52ZXJzaW9uIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgIHByb2plY3RQYXRoOiBFZGl0b3IuUHJvamVjdC5wYXRoLFxyXG4gICAgICAgICAgICAgICAgcHJlZmVyZW5jZXM6IChpbm5lci5kYXRhIGFzIGFueSkucHJlZmVyZW5jZXMsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHNuYXBzaG90IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGltcG9ydFByZWZlcmVuY2VzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnaW1wb3J0X3ByZWZlcmVuY2VzIGlzIG5vdCB5ZXQgYXZhaWxhYmxlLiBQbGVhc2UgaW1wb3J0IHByZWZlcmVuY2VzIHRocm91Z2ggdGhlIEVkaXRvciBVSS4nIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeVNlcnZlcklwTGlzdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlwTGlzdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NlcnZlcicsICdxdWVyeS1pcC1saXN0Jyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGlwTGlzdCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjaGVja0Nvbm5lY3Rpdml0eShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGNvbnN0IHRpbWVvdXQgPSBhcmdzPy50aW1lb3V0IHx8IDUwMDA7XHJcbiAgICAgICAgY29uc3Qgc3RhcnQgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBhd2FpdCBQcm9taXNlLnJhY2UoW1xyXG4gICAgICAgICAgICAgICAgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2VydmVyJywgJ3F1ZXJ5LXBvcnQnKSxcclxuICAgICAgICAgICAgICAgIG5ldyBQcm9taXNlKChfLCByZWplY3QpID0+IHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignVGltZW91dCcpKSwgdGltZW91dCkpLFxyXG4gICAgICAgICAgICBdKTtcclxuICAgICAgICAgICAgY29uc3QgbGF0ZW5jeSA9IERhdGUubm93KCkgLSBzdGFydDtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyByZWFjaGFibGU6IHRydWUsIGxhdGVuY3lNczogbGF0ZW5jeSwgcG9ydCB9IH07XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgcmVhY2hhYmxlOiBmYWxzZSwgbGF0ZW5jeU1zOiBEYXRlLm5vdygpIC0gc3RhcnQsIHRpbWVvdXQgfSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldE5ldHdvcmtJbnRlcmZhY2VzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmF3ID0gb3MubmV0d29ya0ludGVyZmFjZXMoKTtcclxuICAgICAgICAgICAgY29uc3QgaW50ZXJmYWNlcyA9IE9iamVjdC5lbnRyaWVzKHJhdykubWFwKChbbmFtZSwgYWRkcnNdKSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgbmFtZSxcclxuICAgICAgICAgICAgICAgIGFkZHJlc3NlczogKGFkZHJzIHx8IFtdKS5tYXAoKHsgYWRkcmVzcywgZmFtaWx5LCBpbnRlcm5hbCB9KSA9PiAoeyBhZGRyZXNzLCBmYW1pbHksIGludGVybmFsIH0pKSxcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBpbnRlcmZhY2VzIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=