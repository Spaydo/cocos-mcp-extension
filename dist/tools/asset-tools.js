"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssetTools = void 0;
class AssetTools {
    getTools() {
        return [
            {
                name: 'query',
                description: 'Query assets by pattern, UUID, or URL',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pattern: { type: 'string', description: 'Glob pattern, e.g. db://assets/**/*.ts' },
                        uuid: { type: 'string', description: 'Asset UUID' },
                        url: { type: 'string', description: 'Asset db:// URL' },
                        limit: { type: 'number', description: 'Max results for pattern query (default: 100)' },
                    },
                },
            },
            {
                name: 'create',
                description: 'Create a new asset file',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'db:// path for the new asset' },
                        content: { type: 'string', description: 'File content' },
                    },
                    required: ['url', 'content'],
                },
            },
            {
                name: 'delete',
                description: 'Delete an asset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'db:// path of the asset to delete' },
                    },
                    required: ['url'],
                },
            },
            {
                name: 'move',
                description: 'Move or rename an asset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        source: { type: 'string', description: 'Source db:// path' },
                        target: { type: 'string', description: 'Target db:// path' },
                    },
                    required: ['source', 'target'],
                },
            },
            {
                name: 'import',
                description: 'Import an external file as an asset into the project',
                inputSchema: {
                    type: 'object',
                    properties: {
                        source: { type: 'string', description: 'Absolute file system path of the source file' },
                        target: { type: 'string', description: 'Target db:// path, e.g. db://assets/textures/my-image.png' },
                    },
                    required: ['source', 'target'],
                },
            },
            {
                name: 'info',
                description: 'Get detailed asset metadata including dependencies and library info',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Asset UUID' },
                        url: { type: 'string', description: 'Asset db:// URL' },
                    },
                },
            },
            {
                name: 'query_uuid',
                description: 'Convert between asset URL and UUID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'db:// path to get UUID for' },
                        uuid: { type: 'string', description: 'UUID to get URL for' },
                    },
                },
            },
            {
                name: 'copy',
                description: 'Copy an asset to a new location',
                inputSchema: {
                    type: 'object',
                    properties: {
                        source: { type: 'string', description: 'Source db:// path' },
                        target: { type: 'string', description: 'Target db:// path' },
                    },
                    required: ['source', 'target'],
                },
            },
            {
                name: 'save',
                description: 'Save/overwrite content of an existing asset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'db:// path of the asset' },
                        content: { type: 'string', description: 'New file content' },
                    },
                    required: ['url', 'content'],
                },
            },
            {
                name: 'query_meta',
                description: 'Get asset meta information (import settings, sub-assets config)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Asset UUID or db:// URL' },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'query_users',
                description: 'Find which assets or scripts reference this asset (reverse dependency)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Asset UUID or db:// URL' },
                        type: { type: 'string', description: 'Query type: asset, script, or all (default: asset)' },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'query_dependencies',
                description: 'Find which assets this asset depends on (forward dependency)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Asset UUID or db:// URL' },
                        type: { type: 'string', description: 'Query type: asset, script, or all (default: asset)' },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'open',
                description: 'Open an asset in the editor (e.g. open a script in code editor, a scene in scene editor)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Asset UUID or db:// URL' },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'reimport',
                description: 'Re-import an asset (regenerate compiled/library files)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Asset UUID or db:// URL' },
                    },
                    required: ['uuid'],
                },
            },
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'query': return this.query(args);
            case 'create': return this.create(args.url, args.content);
            case 'delete': return this.deleteAsset(args.url);
            case 'move': return this.move(args.source, args.target);
            case 'import': return this.importAsset(args.source, args.target);
            case 'info': return this.assetInfo(args);
            case 'query_uuid': return this.queryUuid(args);
            case 'copy': return this.copyAsset(args.source, args.target);
            case 'save': return this.saveAsset(args.url, args.content);
            case 'query_meta': return this.queryMeta(args.uuid);
            case 'query_users': return this.queryUsers(args.uuid, args.type);
            case 'query_dependencies': return this.queryDependencies(args.uuid, args.type);
            case 'open': return this.openAsset(args.uuid);
            case 'reimport': return this.reimportAsset(args.uuid);
            default: return { success: false, error: `Unknown asset tool: ${toolName}` };
        }
    }
    async query(args) {
        if (args.uuid) {
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', args.uuid);
                if (!info)
                    return { success: false, error: `Asset not found: ${args.uuid}` };
                return {
                    success: true,
                    data: {
                        name: info.name,
                        uuid: info.uuid,
                        url: info.url || info.path,
                        type: info.type,
                    },
                };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
        if (args.url) {
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', args.url);
                if (!info)
                    return { success: false, error: `Asset not found: ${args.url}` };
                return {
                    success: true,
                    data: {
                        name: info.name,
                        uuid: info.uuid,
                        url: info.url || info.path,
                        type: info.type,
                    },
                };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
        if (args.pattern) {
            try {
                const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: args.pattern });
                if (!assets || !Array.isArray(assets)) {
                    return { success: true, data: [] };
                }
                const limit = args.limit || 100;
                const sliced = assets.slice(0, limit);
                const results = sliced.map((a) => ({
                    name: a.name,
                    uuid: a.uuid,
                    url: a.url || a.path,
                    type: a.type,
                }));
                const data = { total: assets.length, results };
                if (assets.length > limit)
                    data.truncated = true;
                return { success: true, data };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
        return { success: false, error: 'Provide pattern, uuid, or url' };
    }
    async create(url, content) {
        try {
            const result = await Editor.Message.request('asset-db', 'create-asset', url, content);
            return {
                success: true,
                data: { uuid: result === null || result === void 0 ? void 0 : result.uuid, url },
                message: `Asset created: ${url}`,
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async deleteAsset(url) {
        try {
            await Editor.Message.request('asset-db', 'delete-asset', url);
            return { success: true, message: `Asset deleted: ${url}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async move(source, target) {
        try {
            await Editor.Message.request('asset-db', 'move-asset', source, target);
            return { success: true, message: `Moved ${source} → ${target}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async importAsset(source, target) {
        try {
            const result = await Editor.Message.request('asset-db', 'import-asset', source, target);
            return {
                success: true,
                data: { uuid: result === null || result === void 0 ? void 0 : result.uuid, url: target },
                message: `Asset imported: ${source} → ${target}`,
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async assetInfo(args) {
        try {
            const identifier = args.uuid || args.url;
            if (!identifier) {
                return { success: false, error: 'Provide uuid or url' };
            }
            const info = await Editor.Message.request('asset-db', 'query-asset-info', identifier);
            if (!info) {
                return { success: false, error: `Asset not found: ${identifier}` };
            }
            const data = {
                name: info.name,
                uuid: info.uuid,
                url: info.url || info.path,
                type: info.type,
                isDirectory: info.isDirectory || false,
            };
            // Include additional metadata if available
            if (info.file)
                data.file = info.file;
            if (info.library)
                data.library = info.library;
            if (info.subAssets)
                data.subAssets = info.subAssets;
            if (info.depends)
                data.depends = info.depends;
            return { success: true, data };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async queryUuid(args) {
        if (args.url) {
            try {
                const uuid = await Editor.Message.request('asset-db', 'query-uuid', args.url);
                if (!uuid)
                    return { success: false, error: `No UUID for: ${args.url}` };
                return { success: true, data: { url: args.url, uuid } };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
        if (args.uuid) {
            try {
                const info = await Editor.Message.request('asset-db', 'query-asset-info', args.uuid);
                if (!info)
                    return { success: false, error: `No URL for UUID: ${args.uuid}` };
                return { success: true, data: { uuid: args.uuid, url: info.url || info.path } };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
        return { success: false, error: 'Provide url or uuid' };
    }
    async copyAsset(source, target) {
        try {
            const result = await Editor.Message.request('asset-db', 'copy-asset', source, target);
            return {
                success: true,
                data: { uuid: result === null || result === void 0 ? void 0 : result.uuid, url: target },
                message: `Asset copied: ${source} → ${target}`,
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async saveAsset(url, content) {
        try {
            const result = await Editor.Message.request('asset-db', 'save-asset', url, content);
            return {
                success: true,
                data: { uuid: result === null || result === void 0 ? void 0 : result.uuid, url },
                message: `Asset saved: ${url}`,
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async queryMeta(uuid) {
        try {
            const meta = await Editor.Message.request('asset-db', 'query-asset-meta', uuid);
            if (!meta) {
                return { success: false, error: `Asset meta not found: ${uuid}` };
            }
            // Extract compact meta: skip internal fields
            const data = {};
            const skipKeys = new Set(['__type__', '__uuid__', 'files', 'displayName']);
            for (const [key, val] of Object.entries(meta)) {
                if (skipKeys.has(key))
                    continue;
                if (key.startsWith('_'))
                    continue;
                data[key] = val;
            }
            if (meta.__uuid__)
                data.uuid = meta.__uuid__;
            return { success: true, data };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async queryUsers(uuid, type) {
        try {
            const users = await Editor.Message.request('asset-db', 'query-asset-users', uuid, type || 'asset');
            return { success: true, data: { uuid, referencedBy: users || [] } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async queryDependencies(uuid, type) {
        try {
            const deps = await Editor.Message.request('asset-db', 'query-asset-dependencies', uuid, type || 'asset');
            return { success: true, data: { uuid, dependsOn: deps || [] } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async openAsset(uuid) {
        try {
            await Editor.Message.request('asset-db', 'open-asset', uuid);
            return { success: true, message: `Asset opened: ${uuid}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async reimportAsset(uuid) {
        try {
            await Editor.Message.request('asset-db', 'reimport-asset', uuid);
            return { success: true, message: `Asset re-imported: ${uuid}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
}
exports.AssetTools = AssetTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYXNzZXQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBYSxVQUFVO0lBRW5CLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLHVDQUF1QztnQkFDcEQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSx3Q0FBd0MsRUFBRTt3QkFDbEYsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFO3dCQUNuRCxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRTt3QkFDdkQsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsOENBQThDLEVBQUU7cUJBQ3pGO2lCQUNKO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUseUJBQXlCO2dCQUN0QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDhCQUE4QixFQUFFO3dCQUNwRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUU7cUJBQzNEO29CQUNELFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUM7aUJBQy9CO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsaUJBQWlCO2dCQUM5QixXQUFXLEVBQUU7b0JBQ1QsSUFB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QUFFLElBQUksQ0FBQyxDQUFDO1lBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxzQkFBc0IsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUNwRSxDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0NBQ0o7QUE5YUQsZ0NBOGFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFzc2V0VG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IGFzc2V0cyBieSBwYXR0ZXJuLCBVVUlELCBvciBVUkwnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnR2xvYiBwYXR0ZXJuLCBlLmcuIGRiOi8vYXNzZXRzLyoqLyoudHMnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVVJRCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IGRiOi8vIFVSTCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGltaXQ6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnTWF4IHJlc3VsdHMgZm9yIHBhdHRlcm4gcXVlcnkgKGRlZmF1bHQ6IDEwMCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdjcmVhdGUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDcmVhdGUgYSBuZXcgYXNzZXQgZmlsZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ2RiOi8vIHBhdGggZm9yIHRoZSBuZXcgYXNzZXQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRmlsZSBjb250ZW50JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXJsJywgJ2NvbnRlbnQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdkZWxldGUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEZWxldGUgYW4gYXNzZXQnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdkYjovLyBwYXRoIG9mIHRoZSBhc3NldCB0byBkZWxldGUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1cmwnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdtb3ZlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTW92ZSBvciByZW5hbWUgYW4gYXNzZXQnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTb3VyY2UgZGI6Ly8gcGF0aCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RhcmdldCBkYjovLyBwYXRoJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnc291cmNlJywgJ3RhcmdldCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2ltcG9ydCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ltcG9ydCBhbiBleHRlcm5hbCBmaWxlIGFzIGFuIGFzc2V0IGludG8gdGhlIHByb2plY3QnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBYnNvbHV0ZSBmaWxlIHN5c3RlbSBwYXRoIG9mIHRoZSBzb3VyY2UgZmlsZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RhcmdldCBkYjovLyBwYXRoLCBlLmcuIGRiOi8vYXNzZXRzL3RleHR1cmVzL215LWltYWdlLnBuZycgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3NvdXJjZScsICd0YXJnZXQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdpbmZvJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IGRldGFpbGVkIGFzc2V0IG1ldGFkYXRhIGluY2x1ZGluZyBkZXBlbmRlbmNpZXMgYW5kIGxpYnJhcnkgaW5mbycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCBVVUlEJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXNzZXQgZGI6Ly8gVVJMJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnlfdXVpZCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbnZlcnQgYmV0d2VlbiBhc3NldCBVUkwgYW5kIFVVSUQnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdkYjovLyBwYXRoIHRvIGdldCBVVUlEIGZvcicgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdVVUlEIHRvIGdldCBVUkwgZm9yJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29weScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvcHkgYW4gYXNzZXQgdG8gYSBuZXcgbG9jYXRpb24nLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTb3VyY2UgZGI6Ly8gcGF0aCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RhcmdldCBkYjovLyBwYXRoJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnc291cmNlJywgJ3RhcmdldCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NhdmUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTYXZlL292ZXJ3cml0ZSBjb250ZW50IG9mIGFuIGV4aXN0aW5nIGFzc2V0JyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnZGI6Ly8gcGF0aCBvZiB0aGUgYXNzZXQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTmV3IGZpbGUgY29udGVudCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3VybCcsICdjb250ZW50J10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnlfbWV0YScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBhc3NldCBtZXRhIGluZm9ybWF0aW9uIChpbXBvcnQgc2V0dGluZ3MsIHN1Yi1hc3NldHMgY29uZmlnKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCBVVUlEIG9yIGRiOi8vIFVSTCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeV91c2VycycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbmQgd2hpY2ggYXNzZXRzIG9yIHNjcmlwdHMgcmVmZXJlbmNlIHRoaXMgYXNzZXQgKHJldmVyc2UgZGVwZW5kZW5jeSknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVVJRCBvciBkYjovLyBVUkwnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUXVlcnkgdHlwZTogYXNzZXQsIHNjcmlwdCwgb3IgYWxsIChkZWZhdWx0OiBhc3NldCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnlfZGVwZW5kZW5jaWVzJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmluZCB3aGljaCBhc3NldHMgdGhpcyBhc3NldCBkZXBlbmRzIG9uIChmb3J3YXJkIGRlcGVuZGVuY3kpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQgb3IgZGI6Ly8gVVJMJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1F1ZXJ5IHR5cGU6IGFzc2V0LCBzY3JpcHQsIG9yIGFsbCAoZGVmYXVsdDogYXNzZXQpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ29wZW4nLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPcGVuIGFuIGFzc2V0IGluIHRoZSBlZGl0b3IgKGUuZy4gb3BlbiBhIHNjcmlwdCBpbiBjb2RlIGVkaXRvciwgYSBzY2VuZSBpbiBzY2VuZSBlZGl0b3IpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQgb3IgZGI6Ly8gVVJMJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlaW1wb3J0JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmUtaW1wb3J0IGFuIGFzc2V0IChyZWdlbmVyYXRlIGNvbXBpbGVkL2xpYnJhcnkgZmlsZXMpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQgb3IgZGI6Ly8gVVJMJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5JzogcmV0dXJuIHRoaXMucXVlcnkoYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6IHJldHVybiB0aGlzLmNyZWF0ZShhcmdzLnVybCwgYXJncy5jb250ZW50KTtcclxuICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzogcmV0dXJuIHRoaXMuZGVsZXRlQXNzZXQoYXJncy51cmwpO1xyXG4gICAgICAgICAgICBjYXNlICdtb3ZlJzogcmV0dXJuIHRoaXMubW92ZShhcmdzLnNvdXJjZSwgYXJncy50YXJnZXQpO1xyXG4gICAgICAgICAgICBjYXNlICdpbXBvcnQnOiByZXR1cm4gdGhpcy5pbXBvcnRBc3NldChhcmdzLnNvdXJjZSwgYXJncy50YXJnZXQpO1xyXG4gICAgICAgICAgICBjYXNlICdpbmZvJzogcmV0dXJuIHRoaXMuYXNzZXRJbmZvKGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeV91dWlkJzogcmV0dXJuIHRoaXMucXVlcnlVdWlkKGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdjb3B5JzogcmV0dXJuIHRoaXMuY29weUFzc2V0KGFyZ3Muc291cmNlLCBhcmdzLnRhcmdldCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NhdmUnOiByZXR1cm4gdGhpcy5zYXZlQXNzZXQoYXJncy51cmwsIGFyZ3MuY29udGVudCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X21ldGEnOiByZXR1cm4gdGhpcy5xdWVyeU1ldGEoYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSAncXVlcnlfdXNlcnMnOiByZXR1cm4gdGhpcy5xdWVyeVVzZXJzKGFyZ3MudXVpZCwgYXJncy50eXBlKTtcclxuICAgICAgICAgICAgY2FzZSAncXVlcnlfZGVwZW5kZW5jaWVzJzogcmV0dXJuIHRoaXMucXVlcnlEZXBlbmRlbmNpZXMoYXJncy51dWlkLCBhcmdzLnR5cGUpO1xyXG4gICAgICAgICAgICBjYXNlICdvcGVuJzogcmV0dXJuIHRoaXMub3BlbkFzc2V0KGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3JlaW1wb3J0JzogcmV0dXJuIHRoaXMucmVpbXBvcnRBc3NldChhcmdzLnV1aWQpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFzc2V0IHRvb2w6ICR7dG9vbE5hbWV9YCB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgaWYgKGFyZ3MudXVpZCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbzogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWluZm8pIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFzc2V0IG5vdCBmb3VuZDogJHthcmdzLnV1aWR9YCB9O1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaW5mby5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBpbmZvLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogaW5mby51cmwgfHwgaW5mby5wYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBpbmZvLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhcmdzLnVybCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbzogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFyZ3MudXJsKTtcclxuICAgICAgICAgICAgICAgIGlmICghaW5mbykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQXNzZXQgbm90IGZvdW5kOiAke2FyZ3MudXJsfWAgfTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGluZm8ubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogaW5mby51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGluZm8udXJsIHx8IGluZm8ucGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogaW5mby50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYXJncy5wYXR0ZXJuKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldHM6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHsgcGF0dGVybjogYXJncy5wYXR0ZXJuIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFhc3NldHMgfHwgIUFycmF5LmlzQXJyYXkoYXNzZXRzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IFtdIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsaW1pdCA9IGFyZ3MubGltaXQgfHwgMTAwO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2xpY2VkID0gYXNzZXRzLnNsaWNlKDAsIGxpbWl0KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBzbGljZWQubWFwKChhOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGEudXVpZCxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGEudXJsIHx8IGEucGF0aCxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBhLnR5cGUsXHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhOiBhbnkgPSB7IHRvdGFsOiBhc3NldHMubGVuZ3RoLCByZXN1bHRzIH07XHJcbiAgICAgICAgICAgICAgICBpZiAoYXNzZXRzLmxlbmd0aCA+IGxpbWl0KSBkYXRhLnRydW5jYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1Byb3ZpZGUgcGF0dGVybiwgdXVpZCwgb3IgdXJsJyB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlKHVybDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnY3JlYXRlLWFzc2V0JywgdXJsLCBjb250ZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHV1aWQ6IHJlc3VsdD8udXVpZCwgdXJsIH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQXNzZXQgY3JlYXRlZDogJHt1cmx9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZGVsZXRlQXNzZXQodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2RlbGV0ZS1hc3NldCcsIHVybCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBBc3NldCBkZWxldGVkOiAke3VybH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG1vdmUoc291cmNlOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdtb3ZlLWFzc2V0Jywgc291cmNlLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgTW92ZWQgJHtzb3VyY2V9IOKGkiAke3RhcmdldH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGltcG9ydEFzc2V0KHNvdXJjZTogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdhc3NldC1kYicsICdpbXBvcnQtYXNzZXQnLCBzb3VyY2UsIHRhcmdldCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiByZXN1bHQ/LnV1aWQsIHVybDogdGFyZ2V0IH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQXNzZXQgaW1wb3J0ZWQ6ICR7c291cmNlfSDihpIgJHt0YXJnZXR9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYXNzZXRJbmZvKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgaWRlbnRpZmllciA9IGFyZ3MudXVpZCB8fCBhcmdzLnVybDtcclxuICAgICAgICAgICAgaWYgKCFpZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcm92aWRlIHV1aWQgb3IgdXJsJyB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGluZm86IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBpZGVudGlmaWVyKTtcclxuICAgICAgICAgICAgaWYgKCFpbmZvKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7aWRlbnRpZmllcn1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgZGF0YTogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogaW5mby5uYW1lLFxyXG4gICAgICAgICAgICAgICAgdXVpZDogaW5mby51dWlkLFxyXG4gICAgICAgICAgICAgICAgdXJsOiBpbmZvLnVybCB8fCBpbmZvLnBhdGgsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBpbmZvLnR5cGUsXHJcbiAgICAgICAgICAgICAgICBpc0RpcmVjdG9yeTogaW5mby5pc0RpcmVjdG9yeSB8fCBmYWxzZSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgLy8gSW5jbHVkZSBhZGRpdGlvbmFsIG1ldGFkYXRhIGlmIGF2YWlsYWJsZVxyXG4gICAgICAgICAgICBpZiAoaW5mby5maWxlKSBkYXRhLmZpbGUgPSBpbmZvLmZpbGU7XHJcbiAgICAgICAgICAgIGlmIChpbmZvLmxpYnJhcnkpIGRhdGEubGlicmFyeSA9IGluZm8ubGlicmFyeTtcclxuICAgICAgICAgICAgaWYgKGluZm8uc3ViQXNzZXRzKSBkYXRhLnN1YkFzc2V0cyA9IGluZm8uc3ViQXNzZXRzO1xyXG4gICAgICAgICAgICBpZiAoaW5mby5kZXBlbmRzKSBkYXRhLmRlcGVuZHMgPSBpbmZvLmRlcGVuZHM7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGEgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlVdWlkKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgaWYgKGFyZ3MudXJsKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB1dWlkOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11dWlkJywgYXJncy51cmwpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF1dWlkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBObyBVVUlEIGZvcjogJHthcmdzLnVybH1gIH07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IHVybDogYXJncy51cmwsIHV1aWQgfSB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYXJncy51dWlkKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgYXJncy51dWlkKTtcclxuICAgICAgICAgICAgICAgIGlmICghaW5mbykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm8gVVJMIGZvciBVVUlEOiAke2FyZ3MudXVpZH1gIH07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IHV1aWQ6IGFyZ3MudXVpZCwgdXJsOiBpbmZvLnVybCB8fCBpbmZvLnBhdGggfSB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcm92aWRlIHVybCBvciB1dWlkJyB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY29weUFzc2V0KHNvdXJjZTogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjb3B5LWFzc2V0Jywgc291cmNlLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHsgdXVpZDogcmVzdWx0Py51dWlkLCB1cmw6IHRhcmdldCB9LFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYEFzc2V0IGNvcGllZDogJHtzb3VyY2V9IOKGkiAke3RhcmdldH1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlQXNzZXQodXJsOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdzYXZlLWFzc2V0JywgdXJsLCBjb250ZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHV1aWQ6IHJlc3VsdD8udXVpZCwgdXJsIH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQXNzZXQgc2F2ZWQ6ICR7dXJsfWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5TWV0YSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1ldGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LW1ldGEnLCB1dWlkKTtcclxuICAgICAgICAgICAgaWYgKCFtZXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBtZXRhIG5vdCBmb3VuZDogJHt1dWlkfWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBFeHRyYWN0IGNvbXBhY3QgbWV0YTogc2tpcCBpbnRlcm5hbCBmaWVsZHNcclxuICAgICAgICAgICAgY29uc3QgZGF0YTogYW55ID0ge307XHJcbiAgICAgICAgICAgIGNvbnN0IHNraXBLZXlzID0gbmV3IFNldChbJ19fdHlwZV9fJywgJ19fdXVpZF9fJywgJ2ZpbGVzJywgJ2Rpc3BsYXlOYW1lJ10pO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbF0gb2YgT2JqZWN0LmVudHJpZXMobWV0YSkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChza2lwS2V5cy5oYXMoa2V5KSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ18nKSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSB2YWw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG1ldGEuX191dWlkX18pIGRhdGEudXVpZCA9IG1ldGEuX191dWlkX187XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGEgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlVc2Vycyh1dWlkOiBzdHJpbmcsIHR5cGU/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVzZXJzOiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdhc3NldC1kYicsICdxdWVyeS1hc3NldC11c2VycycsIHV1aWQsIHR5cGUgfHwgJ2Fzc2V0Jyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgdXVpZCwgcmVmZXJlbmNlZEJ5OiB1c2VycyB8fCBbXSB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5RGVwZW5kZW5jaWVzKHV1aWQ6IHN0cmluZywgdHlwZT86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZGVwczogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtZGVwZW5kZW5jaWVzJywgdXVpZCwgdHlwZSB8fCAnYXNzZXQnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB1dWlkLCBkZXBlbmRzT246IGRlcHMgfHwgW10gfSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuQXNzZXQodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdvcGVuLWFzc2V0JywgdXVpZCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBBc3NldCBvcGVuZWQ6ICR7dXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlaW1wb3J0QXNzZXQodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdyZWltcG9ydC1hc3NldCcsIHV1aWQpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQXNzZXQgcmUtaW1wb3J0ZWQ6ICR7dXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=