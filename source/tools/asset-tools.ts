import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class AssetTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
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
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'query': return this.query(args);
            case 'create': return this.create(args.url, args.content);
            case 'delete': return this.deleteAsset(args.url);
            case 'move': return this.move(args.source, args.target);
            case 'query_uuid': return this.queryUuid(args);
            default: return { success: false, error: `Unknown asset tool: ${toolName}` };
        }
    }

    private async query(args: any): Promise<ToolResponse> {
        if (args.uuid) {
            try {
                const info: any = await Editor.Message.request('asset-db', 'query-asset-info', args.uuid);
                if (!info) return { success: false, error: `Asset not found: ${args.uuid}` };
                return {
                    success: true,
                    data: {
                        name: info.name,
                        uuid: info.uuid,
                        url: info.url || info.path,
                        type: info.type,
                    },
                };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }

        if (args.url) {
            try {
                const info: any = await Editor.Message.request('asset-db', 'query-asset-info', args.url);
                if (!info) return { success: false, error: `Asset not found: ${args.url}` };
                return {
                    success: true,
                    data: {
                        name: info.name,
                        uuid: info.uuid,
                        url: info.url || info.path,
                        type: info.type,
                    },
                };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }

        if (args.pattern) {
            try {
                const assets: any = await Editor.Message.request('asset-db', 'query-assets', { pattern: args.pattern });
                if (!assets || !Array.isArray(assets)) {
                    return { success: true, data: [] };
                }
                const results = assets.map((a: any) => ({
                    name: a.name,
                    uuid: a.uuid,
                    url: a.url || a.path,
                    type: a.type,
                }));
                return { success: true, data: results };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }

        return { success: false, error: 'Provide pattern, uuid, or url' };
    }

    private async create(url: string, content: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('asset-db', 'create-asset', url, content);
            return {
                success: true,
                data: { uuid: result?.uuid, url },
                message: `Asset created: ${url}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async deleteAsset(url: string): Promise<ToolResponse> {
        try {
            await Editor.Message.request('asset-db', 'delete-asset', url);
            return { success: true, message: `Asset deleted: ${url}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async move(source: string, target: string): Promise<ToolResponse> {
        try {
            await Editor.Message.request('asset-db', 'move-asset', source, target);
            return { success: true, message: `Moved ${source} → ${target}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryUuid(args: any): Promise<ToolResponse> {
        if (args.url) {
            try {
                const uuid: any = await Editor.Message.request('asset-db', 'query-uuid', args.url);
                if (!uuid) return { success: false, error: `No UUID for: ${args.url}` };
                return { success: true, data: { url: args.url, uuid } };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }

        if (args.uuid) {
            try {
                const info: any = await Editor.Message.request('asset-db', 'query-asset-info', args.uuid);
                if (!info) return { success: false, error: `No URL for UUID: ${args.uuid}` };
                return { success: true, data: { uuid: args.uuid, url: info.url || info.path } };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }

        return { success: false, error: 'Provide url or uuid' };
    }
}
