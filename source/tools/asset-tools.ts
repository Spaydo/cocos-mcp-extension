import * as fs from 'fs';
import * as path from 'path';
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
            {
                name: 'save_meta',
                description: 'Save asset meta/import settings',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Asset UUID' },
                        content: { type: 'string', description: 'Meta content as JSON string' },
                    },
                    required: ['uuid', 'content'],
                },
            },
            {
                name: 'generate_url',
                description: 'Generate a non-conflicting asset URL',
                inputSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', description: 'Desired db:// URL' },
                    },
                    required: ['url'],
                },
            },
            {
                name: 'query_db_ready',
                description: 'Check if the asset database is initialized and ready',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'batch_import',
                description: 'Import multiple external files as assets (max 100)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        files: { type: 'array', description: 'Array of {source, target} objects. source=external path, target=db:// path' },
                    },
                    required: ['files'],
                },
            },
            {
                name: 'batch_delete',
                description: 'Delete multiple assets at once (max 100)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        urls: { type: 'array', description: 'Array of db:// URLs to delete' },
                    },
                    required: ['urls'],
                },
            },
            {
                name: 'get_tree',
                description: 'Get asset hierarchy as a tree structure',
                inputSchema: {
                    type: 'object',
                    properties: {
                        root: { type: 'string', description: 'Root path (default: db://assets)' },
                        maxDepth: { type: 'number', description: 'Max tree depth (default: 5)' },
                    },
                },
            },
            {
                name: 'export_manifest',
                description: 'Export complete asset inventory as JSON',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pattern: { type: 'string', description: 'Glob pattern (default: db://assets/**/*.*)' },
                        includeMetadata: { type: 'boolean', description: 'Include detailed metadata per asset' },
                    },
                },
            },
            {
                name: 'get_unused',
                description: 'Find unused assets (not yet available)',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'compress_textures',
                description: 'Batch compress texture assets (not yet available)',
                inputSchema: {
                    type: 'object',
                    properties: {},
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
            case 'save_meta': return this.saveMeta(args.uuid, args.content);
            case 'generate_url': return this.generateUrl(args.url);
            case 'query_db_ready': return this.queryDbReady();
            case 'batch_import': return this.batchImport(args.files);
            case 'batch_delete': return this.batchDelete(args.urls);
            case 'get_tree': return this.getTree(args.root, args.maxDepth);
            case 'export_manifest': return this.exportManifest(args.pattern, args.includeMetadata);
            case 'get_unused': return this.getUnused();
            case 'compress_textures': return this.compressTextures();
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
                const limit = args.limit || 100;
                const sliced = assets.slice(0, limit);
                const results = sliced.map((a: any) => ({
                    name: a.name,
                    uuid: a.uuid,
                    url: a.url || a.path,
                    type: a.type,
                }));
                const data: any = { total: assets.length, results };
                if (assets.length > limit) data.truncated = true;
                return { success: true, data };
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

    private async importAsset(source: string, target: string): Promise<ToolResponse> {
        try {
            const result: any = await (Editor.Message.request as any)('asset-db', 'import-asset', source, target);
            return {
                success: true,
                data: { uuid: result?.uuid, url: target },
                message: `Asset imported: ${source} → ${target}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async assetInfo(args: any): Promise<ToolResponse> {
        try {
            const identifier = args.uuid || args.url;
            if (!identifier) {
                return { success: false, error: 'Provide uuid or url' };
            }
            const info: any = await Editor.Message.request('asset-db', 'query-asset-info', identifier);
            if (!info) {
                return { success: false, error: `Asset not found: ${identifier}` };
            }
            const data: any = {
                name: info.name,
                uuid: info.uuid,
                url: info.url || info.path,
                type: info.type,
                isDirectory: info.isDirectory || false,
            };
            // Include additional metadata if available
            if (info.file) data.file = info.file;
            if (info.library) data.library = info.library;
            if (info.subAssets) data.subAssets = info.subAssets;
            if (info.depends) data.depends = info.depends;
            return { success: true, data };
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

    private async copyAsset(source: string, target: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('asset-db', 'copy-asset', source, target);
            return {
                success: true,
                data: { uuid: result?.uuid, url: target },
                message: `Asset copied: ${source} → ${target}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async saveAsset(url: string, content: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('asset-db', 'save-asset', url, content);
            return {
                success: true,
                data: { uuid: result?.uuid, url },
                message: `Asset saved: ${url}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryMeta(uuid: string): Promise<ToolResponse> {
        try {
            const meta: any = await Editor.Message.request('asset-db', 'query-asset-meta', uuid);
            if (!meta) {
                return { success: false, error: `Asset meta not found: ${uuid}` };
            }
            // Extract compact meta: skip internal fields
            const data: any = {};
            const skipKeys = new Set(['__type__', '__uuid__', 'files', 'displayName']);
            for (const [key, val] of Object.entries(meta)) {
                if (skipKeys.has(key)) continue;
                if (key.startsWith('_')) continue;
                data[key] = val;
            }
            if (meta.__uuid__) data.uuid = meta.__uuid__;
            return { success: true, data };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryUsers(uuid: string, type?: string): Promise<ToolResponse> {
        try {
            const users: any = await (Editor.Message.request as any)('asset-db', 'query-asset-users', uuid, type || 'asset');
            return { success: true, data: { uuid, referencedBy: users || [] } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryDependencies(uuid: string, type?: string): Promise<ToolResponse> {
        try {
            const deps: any = await (Editor.Message.request as any)('asset-db', 'query-asset-dependencies', uuid, type || 'asset');
            return { success: true, data: { uuid, dependsOn: deps || [] } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async openAsset(uuid: string): Promise<ToolResponse> {
        try {
            await Editor.Message.request('asset-db', 'open-asset', uuid);
            return { success: true, message: `Asset opened: ${uuid}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async reimportAsset(uuid: string): Promise<ToolResponse> {
        try {
            await Editor.Message.request('asset-db', 'reimport-asset', uuid);
            return { success: true, message: `Asset re-imported: ${uuid}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async saveMeta(uuid: string, content: string): Promise<ToolResponse> {
        try {
            await Editor.Message.request('asset-db', 'save-asset-meta', uuid, content);
            return { success: true, message: `Meta saved for asset: ${uuid}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async generateUrl(url: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('asset-db', 'generate-available-url', url);
            return { success: true, data: { requestedUrl: url, availableUrl: result } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryDbReady(): Promise<ToolResponse> {
        try {
            const ready: any = await Editor.Message.request('asset-db', 'query-ready');
            return { success: true, data: { ready: !!ready } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async batchImport(files: Array<{ source: string; target: string }>): Promise<ToolResponse> {
        try {
            if (!Array.isArray(files) || files.length === 0) {
                return { success: false, error: 'files must be a non-empty array' };
            }
            const capped = files.slice(0, 100);
            let successCount = 0;
            let errorCount = 0;
            const results: Array<{ source: string; target: string; success: boolean; error?: string }> = [];
            for (const file of capped) {
                if (!fs.existsSync(file.source)) {
                    errorCount++;
                    results.push({ source: file.source, target: file.target, success: false, error: `Source file not found: ${file.source}` });
                    continue;
                }
                try {
                    await (Editor.Message.request as any)('asset-db', 'import-asset', file.source, file.target);
                    successCount++;
                    results.push({ source: file.source, target: file.target, success: true });
                } catch (err: any) {
                    errorCount++;
                    results.push({ source: file.source, target: file.target, success: false, error: err.message });
                }
            }
            return {
                success: true,
                data: { totalFiles: capped.length, successCount, errorCount, results },
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async batchDelete(urls: string[]): Promise<ToolResponse> {
        try {
            if (!Array.isArray(urls) || urls.length === 0) {
                return { success: false, error: 'urls must be a non-empty array' };
            }
            const capped = urls.slice(0, 100);
            let successCount = 0;
            let errorCount = 0;
            const results: Array<{ url: string; success: boolean; error?: string }> = [];
            for (const url of capped) {
                try {
                    await Editor.Message.request('asset-db', 'delete-asset', url);
                    successCount++;
                    results.push({ url, success: true });
                } catch (err: any) {
                    errorCount++;
                    results.push({ url, success: false, error: err.message });
                }
            }
            return {
                success: true,
                data: { totalFiles: capped.length, successCount, errorCount, results },
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getTree(root?: string, maxDepth?: number): Promise<ToolResponse> {
        try {
            const rootPath = root || 'db://assets';
            const depth = maxDepth != null ? maxDepth : 5;
            const assets: any = await Editor.Message.request('asset-db', 'query-assets', { pattern: rootPath + '/**/*' });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: { name: path.basename(rootPath), url: rootPath, children: [] } };
            }

            // Build tree from flat list of assets
            interface TreeNode {
                name: string;
                url: string;
                uuid?: string;
                type?: string;
                children: TreeNode[];
            }

            const rootNode: TreeNode = { name: path.basename(rootPath), url: rootPath, children: [] };
            const nodeMap: Record<string, TreeNode> = { [rootPath]: rootNode };

            for (const asset of assets) {
                const assetUrl: string = asset.url || asset.path || '';
                if (!assetUrl.startsWith(rootPath)) continue;

                // Compute relative segments from root
                const relative = assetUrl.slice(rootPath.length).replace(/^\//, '');
                const segments = relative.split('/').filter(Boolean);
                if (segments.length === 0 || segments.length > depth) continue;

                let currentUrl = rootPath;
                let currentNode = rootNode;

                for (let i = 0; i < segments.length; i++) {
                    const seg = segments[i];
                    const childUrl = currentUrl + '/' + seg;
                    if (!nodeMap[childUrl]) {
                        const isLeaf = i === segments.length - 1;
                        const childNode: TreeNode = {
                            name: seg,
                            url: childUrl,
                            children: [],
                        };
                        if (isLeaf) {
                            if (asset.uuid) childNode.uuid = asset.uuid;
                            if (asset.type) childNode.type = asset.type;
                        }
                        nodeMap[childUrl] = childNode;
                        currentNode.children.push(childNode);
                    }
                    currentUrl = childUrl;
                    currentNode = nodeMap[childUrl];
                }
            }

            return { success: true, data: rootNode };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async exportManifest(pattern?: string, includeMetadata?: boolean): Promise<ToolResponse> {
        try {
            const queryPattern = pattern || 'db://assets/**/*.*';
            const assets: any = await Editor.Message.request('asset-db', 'query-assets', { pattern: queryPattern });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: { total: 0, assets: [] } };
            }

            const manifest: any[] = [];
            for (const asset of assets) {
                const entry: any = {
                    name: asset.name,
                    uuid: asset.uuid,
                    url: asset.url || asset.path,
                    type: asset.type,
                };
                if (includeMetadata) {
                    try {
                        const info: any = await Editor.Message.request('asset-db', 'query-asset-info', asset.uuid);
                        if (info) {
                            if (info.file) entry.file = info.file;
                            if (info.library) entry.library = info.library;
                            if (info.subAssets) entry.subAssets = info.subAssets;
                            if (info.depends) entry.depends = info.depends;
                            entry.isDirectory = info.isDirectory || false;
                        }
                    } catch (_) {
                        // skip metadata errors for individual assets
                    }
                }
                manifest.push(entry);
            }

            return { success: true, data: { total: manifest.length, assets: manifest } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async getUnused(): Promise<ToolResponse> {
        return {
            success: false,
            error: 'get_unused is not yet available. This feature requires cross-referencing all scenes and scripts.',
        };
    }

    private async compressTextures(): Promise<ToolResponse> {
        return {
            success: false,
            error: 'compress_textures is not yet available. Texture compression requires build pipeline integration.',
        };
    }
}
