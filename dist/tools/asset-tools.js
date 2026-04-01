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
exports.AssetTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
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
    async saveMeta(uuid, content) {
        try {
            await Editor.Message.request('asset-db', 'save-asset-meta', uuid, content);
            return { success: true, message: `Meta saved for asset: ${uuid}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async generateUrl(url) {
        try {
            const result = await Editor.Message.request('asset-db', 'generate-available-url', url);
            return { success: true, data: { requestedUrl: url, availableUrl: result } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async queryDbReady() {
        try {
            const ready = await Editor.Message.request('asset-db', 'query-ready');
            return { success: true, data: { ready: !!ready } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async batchImport(files) {
        try {
            if (!Array.isArray(files) || files.length === 0) {
                return { success: false, error: 'files must be a non-empty array' };
            }
            const capped = files.slice(0, 100);
            let successCount = 0;
            let errorCount = 0;
            const results = [];
            for (const file of capped) {
                if (!fs.existsSync(file.source)) {
                    errorCount++;
                    results.push({ source: file.source, target: file.target, success: false, error: `Source file not found: ${file.source}` });
                    continue;
                }
                try {
                    await Editor.Message.request('asset-db', 'import-asset', file.source, file.target);
                    successCount++;
                    results.push({ source: file.source, target: file.target, success: true });
                }
                catch (err) {
                    errorCount++;
                    results.push({ source: file.source, target: file.target, success: false, error: err.message });
                }
            }
            return {
                success: true,
                data: { totalFiles: capped.length, successCount, errorCount, results },
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async batchDelete(urls) {
        try {
            if (!Array.isArray(urls) || urls.length === 0) {
                return { success: false, error: 'urls must be a non-empty array' };
            }
            const capped = urls.slice(0, 100);
            let successCount = 0;
            let errorCount = 0;
            const results = [];
            for (const url of capped) {
                try {
                    await Editor.Message.request('asset-db', 'delete-asset', url);
                    successCount++;
                    results.push({ url, success: true });
                }
                catch (err) {
                    errorCount++;
                    results.push({ url, success: false, error: err.message });
                }
            }
            return {
                success: true,
                data: { totalFiles: capped.length, successCount, errorCount, results },
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async getTree(root, maxDepth) {
        try {
            const rootPath = root || 'db://assets';
            const depth = maxDepth != null ? maxDepth : 5;
            const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: rootPath + '/**/*' });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: { name: path.basename(rootPath), url: rootPath, children: [] } };
            }
            const rootNode = { name: path.basename(rootPath), url: rootPath, children: [] };
            const nodeMap = { [rootPath]: rootNode };
            for (const asset of assets) {
                const assetUrl = asset.url || asset.path || '';
                if (!assetUrl.startsWith(rootPath))
                    continue;
                // Compute relative segments from root
                const relative = assetUrl.slice(rootPath.length).replace(/^\//, '');
                const segments = relative.split('/').filter(Boolean);
                if (segments.length === 0 || segments.length > depth)
                    continue;
                let currentUrl = rootPath;
                let currentNode = rootNode;
                for (let i = 0; i < segments.length; i++) {
                    const seg = segments[i];
                    const childUrl = currentUrl + '/' + seg;
                    if (!nodeMap[childUrl]) {
                        const isLeaf = i === segments.length - 1;
                        const childNode = {
                            name: seg,
                            url: childUrl,
                            children: [],
                        };
                        if (isLeaf) {
                            if (asset.uuid)
                                childNode.uuid = asset.uuid;
                            if (asset.type)
                                childNode.type = asset.type;
                        }
                        nodeMap[childUrl] = childNode;
                        currentNode.children.push(childNode);
                    }
                    currentUrl = childUrl;
                    currentNode = nodeMap[childUrl];
                }
            }
            return { success: true, data: rootNode };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async exportManifest(pattern, includeMetadata) {
        try {
            const queryPattern = pattern || 'db://assets/**/*.*';
            const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: queryPattern });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: { total: 0, assets: [] } };
            }
            const manifest = [];
            for (const asset of assets) {
                const entry = {
                    name: asset.name,
                    uuid: asset.uuid,
                    url: asset.url || asset.path,
                    type: asset.type,
                };
                if (includeMetadata) {
                    try {
                        const info = await Editor.Message.request('asset-db', 'query-asset-info', asset.uuid);
                        if (info) {
                            if (info.file)
                                entry.file = info.file;
                            if (info.library)
                                entry.library = info.library;
                            if (info.subAssets)
                                entry.subAssets = info.subAssets;
                            if (info.depends)
                                entry.depends = info.depends;
                            entry.isDirectory = info.isDirectory || false;
                        }
                    }
                    catch (_) {
                        // skip metadata errors for individual assets
                    }
                }
                manifest.push(entry);
            }
            return { success: true, data: { total: manifest.length, assets: manifest } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async getUnused() {
        return {
            success: false,
            error: 'get_unused is not yet available. This feature requires cross-referencing all scenes and scripts.',
        };
    }
    async compressTextures() {
        return {
            success: false,
            error: 'compress_textures is not yet available. Texture compression requires build pipeline integration.',
        };
    }
}
exports.AssetTools = AssetTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYXNzZXQtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUc3QixNQUFhLFVBQVU7SUFFbkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsT0FBTztnQkFDYixXQUFXLEVBQUUsdUNBQXVDO2dCQUNwRCxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdDQUF3QyxFQUFFO3dCQUNsRixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUU7d0JBQ25ELEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFO3dCQUN2RCxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSw4Q0FBOEMsRUFBRTtxQkFDekY7aUJBQ0o7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSx5QkFBeUI7Z0JBQ3RDLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsOEJBQThCLEVBQUU7d0JBQ3BFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRTtxQkFDM0Q7b0JBQ0QsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQztpQkFDL0I7YUFDSjtZQUNEO2dCQUNJLElBQUks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QUFDO1lBQ2hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsU0FBUztRQUNuQixPQUFPO1lBQ0gsT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLEVBQUUsa0dBQWtHO1NBQzVHLENBQUM7SUFDTixDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQjtRQUMxQixPQUFPO1lBQ0gsT0FBTyxFQUFFLEtBQUs7WUFDZCxLQUFLLEVBQUUsa0dBQWtHO1NBQzVHLENBQUM7SUFDTixDQUFDO0NBQ0o7QUE1dEJELGdDQTR0QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBBc3NldFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdRdWVyeSBhc3NldHMgYnkgcGF0dGVybiwgVVVJRCwgb3IgVVJMJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXR0ZXJuOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0dsb2IgcGF0dGVybiwgZS5nLiBkYjovL2Fzc2V0cy8qKi8qLnRzJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCBkYjovLyBVUkwnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbWl0OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ01heCByZXN1bHRzIGZvciBwYXR0ZXJuIHF1ZXJ5IChkZWZhdWx0OiAxMDApJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY3JlYXRlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIGEgbmV3IGFzc2V0IGZpbGUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdkYjovLyBwYXRoIGZvciB0aGUgbmV3IGFzc2V0JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0ZpbGUgY29udGVudCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3VybCcsICdjb250ZW50J10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZGVsZXRlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGVsZXRlIGFuIGFzc2V0JyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnZGI6Ly8gcGF0aCBvZiB0aGUgYXNzZXQgdG8gZGVsZXRlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXJsJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnbW92ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01vdmUgb3IgcmVuYW1lIGFuIGFzc2V0JyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU291cmNlIGRiOi8vIHBhdGgnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUYXJnZXQgZGI6Ly8gcGF0aCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3NvdXJjZScsICd0YXJnZXQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdpbXBvcnQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbXBvcnQgYW4gZXh0ZXJuYWwgZmlsZSBhcyBhbiBhc3NldCBpbnRvIHRoZSBwcm9qZWN0JyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQWJzb2x1dGUgZmlsZSBzeXN0ZW0gcGF0aCBvZiB0aGUgc291cmNlIGZpbGUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUYXJnZXQgZGI6Ly8gcGF0aCwgZS5nLiBkYjovL2Fzc2V0cy90ZXh0dXJlcy9teS1pbWFnZS5wbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydzb3VyY2UnLCAndGFyZ2V0J10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnaW5mbycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBkZXRhaWxlZCBhc3NldCBtZXRhZGF0YSBpbmNsdWRpbmcgZGVwZW5kZW5jaWVzIGFuZCBsaWJyYXJ5IGluZm8nLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVVJRCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IGRiOi8vIFVSTCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5X3V1aWQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb252ZXJ0IGJldHdlZW4gYXNzZXQgVVJMIGFuZCBVVUlEJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnZGI6Ly8gcGF0aCB0byBnZXQgVVVJRCBmb3InIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVVVJRCB0byBnZXQgVVJMIGZvcicgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvcHknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb3B5IGFuIGFzc2V0IHRvIGEgbmV3IGxvY2F0aW9uJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU291cmNlIGRiOi8vIHBhdGgnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUYXJnZXQgZGI6Ly8gcGF0aCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3NvdXJjZScsICd0YXJnZXQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzYXZlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2F2ZS9vdmVyd3JpdGUgY29udGVudCBvZiBhbiBleGlzdGluZyBhc3NldCcsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ2RiOi8vIHBhdGggb2YgdGhlIGFzc2V0JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05ldyBmaWxlIGNvbnRlbnQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1cmwnLCAnY29udGVudCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5X21ldGEnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgYXNzZXQgbWV0YSBpbmZvcm1hdGlvbiAoaW1wb3J0IHNldHRpbmdzLCBzdWItYXNzZXRzIGNvbmZpZyknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVVJRCBvciBkYjovLyBVUkwnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnlfdXNlcnMnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaW5kIHdoaWNoIGFzc2V0cyBvciBzY3JpcHRzIHJlZmVyZW5jZSB0aGlzIGFzc2V0IChyZXZlcnNlIGRlcGVuZGVuY3kpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQgb3IgZGI6Ly8gVVJMJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1F1ZXJ5IHR5cGU6IGFzc2V0LCBzY3JpcHQsIG9yIGFsbCAoZGVmYXVsdDogYXNzZXQpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5X2RlcGVuZGVuY2llcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbmQgd2hpY2ggYXNzZXRzIHRoaXMgYXNzZXQgZGVwZW5kcyBvbiAoZm9yd2FyZCBkZXBlbmRlbmN5KScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCBVVUlEIG9yIGRiOi8vIFVSTCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdRdWVyeSB0eXBlOiBhc3NldCwgc2NyaXB0LCBvciBhbGwgKGRlZmF1bHQ6IGFzc2V0KScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdvcGVuJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3BlbiBhbiBhc3NldCBpbiB0aGUgZWRpdG9yIChlLmcuIG9wZW4gYSBzY3JpcHQgaW4gY29kZSBlZGl0b3IsIGEgc2NlbmUgaW4gc2NlbmUgZWRpdG9yKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCBVVUlEIG9yIGRiOi8vIFVSTCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZWltcG9ydCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlLWltcG9ydCBhbiBhc3NldCAocmVnZW5lcmF0ZSBjb21waWxlZC9saWJyYXJ5IGZpbGVzKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCBVVUlEIG9yIGRiOi8vIFVSTCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzYXZlX21ldGEnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTYXZlIGFzc2V0IG1ldGEvaW1wb3J0IHNldHRpbmdzJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTWV0YSBjb250ZW50IGFzIEpTT04gc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCcsICdjb250ZW50J10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2VuZXJhdGVfdXJsJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2VuZXJhdGUgYSBub24tY29uZmxpY3RpbmcgYXNzZXQgVVJMJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRGVzaXJlZCBkYjovLyBVUkwnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1cmwnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeV9kYl9yZWFkeScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NoZWNrIGlmIHRoZSBhc3NldCBkYXRhYmFzZSBpcyBpbml0aWFsaXplZCBhbmQgcmVhZHknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7fSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdiYXRjaF9pbXBvcnQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdJbXBvcnQgbXVsdGlwbGUgZXh0ZXJuYWwgZmlsZXMgYXMgYXNzZXRzIChtYXggMTAwKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXM6IHsgdHlwZTogJ2FycmF5JywgZGVzY3JpcHRpb246ICdBcnJheSBvZiB7c291cmNlLCB0YXJnZXR9IG9iamVjdHMuIHNvdXJjZT1leHRlcm5hbCBwYXRoLCB0YXJnZXQ9ZGI6Ly8gcGF0aCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2ZpbGVzJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnYmF0Y2hfZGVsZXRlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGVsZXRlIG11bHRpcGxlIGFzc2V0cyBhdCBvbmNlIChtYXggMTAwKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsczogeyB0eXBlOiAnYXJyYXknLCBkZXNjcmlwdGlvbjogJ0FycmF5IG9mIGRiOi8vIFVSTHMgdG8gZGVsZXRlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXJscyddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2dldF90cmVlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IGFzc2V0IGhpZXJhcmNoeSBhcyBhIHRyZWUgc3RydWN0dXJlJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByb290OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1Jvb3QgcGF0aCAoZGVmYXVsdDogZGI6Ly9hc3NldHMpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhEZXB0aDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdNYXggdHJlZSBkZXB0aCAoZGVmYXVsdDogNSknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdleHBvcnRfbWFuaWZlc3QnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdFeHBvcnQgY29tcGxldGUgYXNzZXQgaW52ZW50b3J5IGFzIEpTT04nLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdHRlcm46IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnR2xvYiBwYXR0ZXJuIChkZWZhdWx0OiBkYjovL2Fzc2V0cy8qKi8qLiopJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlTWV0YWRhdGE6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgZGV0YWlsZWQgbWV0YWRhdGEgcGVyIGFzc2V0JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2V0X3VudXNlZCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbmQgdW51c2VkIGFzc2V0cyAobm90IHlldCBhdmFpbGFibGUpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge30sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY29tcHJlc3NfdGV4dHVyZXMnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdCYXRjaCBjb21wcmVzcyB0ZXh0dXJlIGFzc2V0cyAobm90IHlldCBhdmFpbGFibGUpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge30sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgY2FzZSAncXVlcnknOiByZXR1cm4gdGhpcy5xdWVyeShhcmdzKTtcclxuICAgICAgICAgICAgY2FzZSAnY3JlYXRlJzogcmV0dXJuIHRoaXMuY3JlYXRlKGFyZ3MudXJsLCBhcmdzLmNvbnRlbnQpO1xyXG4gICAgICAgICAgICBjYXNlICdkZWxldGUnOiByZXR1cm4gdGhpcy5kZWxldGVBc3NldChhcmdzLnVybCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ21vdmUnOiByZXR1cm4gdGhpcy5tb3ZlKGFyZ3Muc291cmNlLCBhcmdzLnRhcmdldCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2ltcG9ydCc6IHJldHVybiB0aGlzLmltcG9ydEFzc2V0KGFyZ3Muc291cmNlLCBhcmdzLnRhcmdldCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2luZm8nOiByZXR1cm4gdGhpcy5hc3NldEluZm8oYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X3V1aWQnOiByZXR1cm4gdGhpcy5xdWVyeVV1aWQoYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NvcHknOiByZXR1cm4gdGhpcy5jb3B5QXNzZXQoYXJncy5zb3VyY2UsIGFyZ3MudGFyZ2V0KTtcclxuICAgICAgICAgICAgY2FzZSAnc2F2ZSc6IHJldHVybiB0aGlzLnNhdmVBc3NldChhcmdzLnVybCwgYXJncy5jb250ZW50KTtcclxuICAgICAgICAgICAgY2FzZSAncXVlcnlfbWV0YSc6IHJldHVybiB0aGlzLnF1ZXJ5TWV0YShhcmdzLnV1aWQpO1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeV91c2Vycyc6IHJldHVybiB0aGlzLnF1ZXJ5VXNlcnMoYXJncy51dWlkLCBhcmdzLnR5cGUpO1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeV9kZXBlbmRlbmNpZXMnOiByZXR1cm4gdGhpcy5xdWVyeURlcGVuZGVuY2llcyhhcmdzLnV1aWQsIGFyZ3MudHlwZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ29wZW4nOiByZXR1cm4gdGhpcy5vcGVuQXNzZXQoYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSAncmVpbXBvcnQnOiByZXR1cm4gdGhpcy5yZWltcG9ydEFzc2V0KGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NhdmVfbWV0YSc6IHJldHVybiB0aGlzLnNhdmVNZXRhKGFyZ3MudXVpZCwgYXJncy5jb250ZW50KTtcclxuICAgICAgICAgICAgY2FzZSAnZ2VuZXJhdGVfdXJsJzogcmV0dXJuIHRoaXMuZ2VuZXJhdGVVcmwoYXJncy51cmwpO1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeV9kYl9yZWFkeSc6IHJldHVybiB0aGlzLnF1ZXJ5RGJSZWFkeSgpO1xyXG4gICAgICAgICAgICBjYXNlICdiYXRjaF9pbXBvcnQnOiByZXR1cm4gdGhpcy5iYXRjaEltcG9ydChhcmdzLmZpbGVzKTtcclxuICAgICAgICAgICAgY2FzZSAnYmF0Y2hfZGVsZXRlJzogcmV0dXJuIHRoaXMuYmF0Y2hEZWxldGUoYXJncy51cmxzKTtcclxuICAgICAgICAgICAgY2FzZSAnZ2V0X3RyZWUnOiByZXR1cm4gdGhpcy5nZXRUcmVlKGFyZ3Mucm9vdCwgYXJncy5tYXhEZXB0aCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2V4cG9ydF9tYW5pZmVzdCc6IHJldHVybiB0aGlzLmV4cG9ydE1hbmlmZXN0KGFyZ3MucGF0dGVybiwgYXJncy5pbmNsdWRlTWV0YWRhdGEpO1xyXG4gICAgICAgICAgICBjYXNlICdnZXRfdW51c2VkJzogcmV0dXJuIHRoaXMuZ2V0VW51c2VkKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NvbXByZXNzX3RleHR1cmVzJzogcmV0dXJuIHRoaXMuY29tcHJlc3NUZXh0dXJlcygpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGFzc2V0IHRvb2w6ICR7dG9vbE5hbWV9YCB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgaWYgKGFyZ3MudXVpZCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbzogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWluZm8pIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEFzc2V0IG5vdCBmb3VuZDogJHthcmdzLnV1aWR9YCB9O1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogaW5mby5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBpbmZvLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVybDogaW5mby51cmwgfHwgaW5mby5wYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBpbmZvLnR5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChhcmdzLnVybCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW5mbzogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIGFyZ3MudXJsKTtcclxuICAgICAgICAgICAgICAgIGlmICghaW5mbykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQXNzZXQgbm90IGZvdW5kOiAke2FyZ3MudXJsfWAgfTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IGluZm8ubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogaW5mby51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGluZm8udXJsIHx8IGluZm8ucGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogaW5mby50eXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYXJncy5wYXR0ZXJuKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhc3NldHM6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHsgcGF0dGVybjogYXJncy5wYXR0ZXJuIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFhc3NldHMgfHwgIUFycmF5LmlzQXJyYXkoYXNzZXRzKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IFtdIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsaW1pdCA9IGFyZ3MubGltaXQgfHwgMTAwO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2xpY2VkID0gYXNzZXRzLnNsaWNlKDAsIGxpbWl0KTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBzbGljZWQubWFwKChhOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGEudXVpZCxcclxuICAgICAgICAgICAgICAgICAgICB1cmw6IGEudXJsIHx8IGEucGF0aCxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBhLnR5cGUsXHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhOiBhbnkgPSB7IHRvdGFsOiBhc3NldHMubGVuZ3RoLCByZXN1bHRzIH07XHJcbiAgICAgICAgICAgICAgICBpZiAoYXNzZXRzLmxlbmd0aCA+IGxpbWl0KSBkYXRhLnRydW5jYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1Byb3ZpZGUgcGF0dGVybiwgdXVpZCwgb3IgdXJsJyB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlKHVybDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnY3JlYXRlLWFzc2V0JywgdXJsLCBjb250ZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHV1aWQ6IHJlc3VsdD8udXVpZCwgdXJsIH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQXNzZXQgY3JlYXRlZDogJHt1cmx9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZGVsZXRlQXNzZXQodXJsOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2RlbGV0ZS1hc3NldCcsIHVybCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBBc3NldCBkZWxldGVkOiAke3VybH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG1vdmUoc291cmNlOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdtb3ZlLWFzc2V0Jywgc291cmNlLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgTW92ZWQgJHtzb3VyY2V9IOKGkiAke3RhcmdldH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGltcG9ydEFzc2V0KHNvdXJjZTogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdhc3NldC1kYicsICdpbXBvcnQtYXNzZXQnLCBzb3VyY2UsIHRhcmdldCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiByZXN1bHQ/LnV1aWQsIHVybDogdGFyZ2V0IH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQXNzZXQgaW1wb3J0ZWQ6ICR7c291cmNlfSDihpIgJHt0YXJnZXR9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgYXNzZXRJbmZvKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgaWRlbnRpZmllciA9IGFyZ3MudXVpZCB8fCBhcmdzLnVybDtcclxuICAgICAgICAgICAgaWYgKCFpZGVudGlmaWVyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcm92aWRlIHV1aWQgb3IgdXJsJyB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGluZm86IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBpZGVudGlmaWVyKTtcclxuICAgICAgICAgICAgaWYgKCFpbmZvKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBub3QgZm91bmQ6ICR7aWRlbnRpZmllcn1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgZGF0YTogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogaW5mby5uYW1lLFxyXG4gICAgICAgICAgICAgICAgdXVpZDogaW5mby51dWlkLFxyXG4gICAgICAgICAgICAgICAgdXJsOiBpbmZvLnVybCB8fCBpbmZvLnBhdGgsXHJcbiAgICAgICAgICAgICAgICB0eXBlOiBpbmZvLnR5cGUsXHJcbiAgICAgICAgICAgICAgICBpc0RpcmVjdG9yeTogaW5mby5pc0RpcmVjdG9yeSB8fCBmYWxzZSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgLy8gSW5jbHVkZSBhZGRpdGlvbmFsIG1ldGFkYXRhIGlmIGF2YWlsYWJsZVxyXG4gICAgICAgICAgICBpZiAoaW5mby5maWxlKSBkYXRhLmZpbGUgPSBpbmZvLmZpbGU7XHJcbiAgICAgICAgICAgIGlmIChpbmZvLmxpYnJhcnkpIGRhdGEubGlicmFyeSA9IGluZm8ubGlicmFyeTtcclxuICAgICAgICAgICAgaWYgKGluZm8uc3ViQXNzZXRzKSBkYXRhLnN1YkFzc2V0cyA9IGluZm8uc3ViQXNzZXRzO1xyXG4gICAgICAgICAgICBpZiAoaW5mby5kZXBlbmRzKSBkYXRhLmRlcGVuZHMgPSBpbmZvLmRlcGVuZHM7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGEgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlVdWlkKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgaWYgKGFyZ3MudXJsKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB1dWlkOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11dWlkJywgYXJncy51cmwpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF1dWlkKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBObyBVVUlEIGZvcjogJHthcmdzLnVybH1gIH07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IHVybDogYXJncy51cmwsIHV1aWQgfSB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoYXJncy51dWlkKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmZvOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgYXJncy51dWlkKTtcclxuICAgICAgICAgICAgICAgIGlmICghaW5mbykgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm8gVVJMIGZvciBVVUlEOiAke2FyZ3MudXVpZH1gIH07XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IHV1aWQ6IGFyZ3MudXVpZCwgdXJsOiBpbmZvLnVybCB8fCBpbmZvLnBhdGggfSB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcm92aWRlIHVybCBvciB1dWlkJyB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY29weUFzc2V0KHNvdXJjZTogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjb3B5LWFzc2V0Jywgc291cmNlLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHsgdXVpZDogcmVzdWx0Py51dWlkLCB1cmw6IHRhcmdldCB9LFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYEFzc2V0IGNvcGllZDogJHtzb3VyY2V9IOKGkiAke3RhcmdldH1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlQXNzZXQodXJsOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdzYXZlLWFzc2V0JywgdXJsLCBjb250ZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHV1aWQ6IHJlc3VsdD8udXVpZCwgdXJsIH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQXNzZXQgc2F2ZWQ6ICR7dXJsfWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5TWV0YSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG1ldGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LW1ldGEnLCB1dWlkKTtcclxuICAgICAgICAgICAgaWYgKCFtZXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBBc3NldCBtZXRhIG5vdCBmb3VuZDogJHt1dWlkfWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBFeHRyYWN0IGNvbXBhY3QgbWV0YTogc2tpcCBpbnRlcm5hbCBmaWVsZHNcclxuICAgICAgICAgICAgY29uc3QgZGF0YTogYW55ID0ge307XHJcbiAgICAgICAgICAgIGNvbnN0IHNraXBLZXlzID0gbmV3IFNldChbJ19fdHlwZV9fJywgJ19fdXVpZF9fJywgJ2ZpbGVzJywgJ2Rpc3BsYXlOYW1lJ10pO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbF0gb2YgT2JqZWN0LmVudHJpZXMobWV0YSkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChza2lwS2V5cy5oYXMoa2V5KSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ18nKSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBkYXRhW2tleV0gPSB2YWw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKG1ldGEuX191dWlkX18pIGRhdGEudXVpZCA9IG1ldGEuX191dWlkX187XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGEgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlVc2Vycyh1dWlkOiBzdHJpbmcsIHR5cGU/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVzZXJzOiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdhc3NldC1kYicsICdxdWVyeS1hc3NldC11c2VycycsIHV1aWQsIHR5cGUgfHwgJ2Fzc2V0Jyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgdXVpZCwgcmVmZXJlbmNlZEJ5OiB1c2VycyB8fCBbXSB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5RGVwZW5kZW5jaWVzKHV1aWQ6IHN0cmluZywgdHlwZT86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZGVwczogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtZGVwZW5kZW5jaWVzJywgdXVpZCwgdHlwZSB8fCAnYXNzZXQnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB1dWlkLCBkZXBlbmRzT246IGRlcHMgfHwgW10gfSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuQXNzZXQodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdvcGVuLWFzc2V0JywgdXVpZCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBBc3NldCBvcGVuZWQ6ICR7dXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlaW1wb3J0QXNzZXQodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdyZWltcG9ydC1hc3NldCcsIHV1aWQpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQXNzZXQgcmUtaW1wb3J0ZWQ6ICR7dXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNhdmVNZXRhKHV1aWQ6IHN0cmluZywgY29udGVudDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdzYXZlLWFzc2V0LW1ldGEnLCB1dWlkLCBjb250ZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYE1ldGEgc2F2ZWQgZm9yIGFzc2V0OiAke3V1aWR9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZVVybCh1cmw6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdnZW5lcmF0ZS1hdmFpbGFibGUtdXJsJywgdXJsKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyByZXF1ZXN0ZWRVcmw6IHVybCwgYXZhaWxhYmxlVXJsOiByZXN1bHQgfSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeURiUmVhZHkoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZWFkeTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktcmVhZHknKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyByZWFkeTogISFyZWFkeSB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGJhdGNoSW1wb3J0KGZpbGVzOiBBcnJheTx7IHNvdXJjZTogc3RyaW5nOyB0YXJnZXQ6IHN0cmluZyB9Pik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KGZpbGVzKSB8fCBmaWxlcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ2ZpbGVzIG11c3QgYmUgYSBub24tZW1wdHkgYXJyYXknIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgY2FwcGVkID0gZmlsZXMuc2xpY2UoMCwgMTAwKTtcclxuICAgICAgICAgICAgbGV0IHN1Y2Nlc3NDb3VudCA9IDA7XHJcbiAgICAgICAgICAgIGxldCBlcnJvckNvdW50ID0gMDtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0czogQXJyYXk8eyBzb3VyY2U6IHN0cmluZzsgdGFyZ2V0OiBzdHJpbmc7IHN1Y2Nlc3M6IGJvb2xlYW47IGVycm9yPzogc3RyaW5nIH0+ID0gW107XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBjYXBwZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhmaWxlLnNvdXJjZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBlcnJvckNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgc291cmNlOiBmaWxlLnNvdXJjZSwgdGFyZ2V0OiBmaWxlLnRhcmdldCwgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgU291cmNlIGZpbGUgbm90IGZvdW5kOiAke2ZpbGUuc291cmNlfWAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ2Fzc2V0LWRiJywgJ2ltcG9ydC1hc3NldCcsIGZpbGUuc291cmNlLCBmaWxlLnRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2Vzc0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHsgc291cmNlOiBmaWxlLnNvdXJjZSwgdGFyZ2V0OiBmaWxlLnRhcmdldCwgc3VjY2VzczogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHNvdXJjZTogZmlsZS5zb3VyY2UsIHRhcmdldDogZmlsZS50YXJnZXQsIHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHRvdGFsRmlsZXM6IGNhcHBlZC5sZW5ndGgsIHN1Y2Nlc3NDb3VudCwgZXJyb3JDb3VudCwgcmVzdWx0cyB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBiYXRjaERlbGV0ZSh1cmxzOiBzdHJpbmdbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHVybHMpIHx8IHVybHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICd1cmxzIG11c3QgYmUgYSBub24tZW1wdHkgYXJyYXknIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgY2FwcGVkID0gdXJscy5zbGljZSgwLCAxMDApO1xyXG4gICAgICAgICAgICBsZXQgc3VjY2Vzc0NvdW50ID0gMDtcclxuICAgICAgICAgICAgbGV0IGVycm9yQ291bnQgPSAwO1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHRzOiBBcnJheTx7IHVybDogc3RyaW5nOyBzdWNjZXNzOiBib29sZWFuOyBlcnJvcj86IHN0cmluZyB9PiA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHVybCBvZiBjYXBwZWQpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnZGVsZXRlLWFzc2V0JywgdXJsKTtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzQ291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyB1cmwsIHN1Y2Nlc3M6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yQ291bnQrKztcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyB1cmwsIHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHRvdGFsRmlsZXM6IGNhcHBlZC5sZW5ndGgsIHN1Y2Nlc3NDb3VudCwgZXJyb3JDb3VudCwgcmVzdWx0cyB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRUcmVlKHJvb3Q/OiBzdHJpbmcsIG1heERlcHRoPzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByb290UGF0aCA9IHJvb3QgfHwgJ2RiOi8vYXNzZXRzJztcclxuICAgICAgICAgICAgY29uc3QgZGVwdGggPSBtYXhEZXB0aCAhPSBudWxsID8gbWF4RGVwdGggOiA1O1xyXG4gICAgICAgICAgICBjb25zdCBhc3NldHM6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHsgcGF0dGVybjogcm9vdFBhdGggKyAnLyoqLyonIH0pO1xyXG4gICAgICAgICAgICBpZiAoIWFzc2V0cyB8fCAhQXJyYXkuaXNBcnJheShhc3NldHMpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG5hbWU6IHBhdGguYmFzZW5hbWUocm9vdFBhdGgpLCB1cmw6IHJvb3RQYXRoLCBjaGlsZHJlbjogW10gfSB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBCdWlsZCB0cmVlIGZyb20gZmxhdCBsaXN0IG9mIGFzc2V0c1xyXG4gICAgICAgICAgICBpbnRlcmZhY2UgVHJlZU5vZGUge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogc3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgdXJsOiBzdHJpbmc7XHJcbiAgICAgICAgICAgICAgICB1dWlkPzogc3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgdHlwZT86IHN0cmluZztcclxuICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBUcmVlTm9kZVtdO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCByb290Tm9kZTogVHJlZU5vZGUgPSB7IG5hbWU6IHBhdGguYmFzZW5hbWUocm9vdFBhdGgpLCB1cmw6IHJvb3RQYXRoLCBjaGlsZHJlbjogW10gfTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZU1hcDogUmVjb3JkPHN0cmluZywgVHJlZU5vZGU+ID0geyBbcm9vdFBhdGhdOiByb290Tm9kZSB9O1xyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCBhc3NldCBvZiBhc3NldHMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0VXJsOiBzdHJpbmcgPSBhc3NldC51cmwgfHwgYXNzZXQucGF0aCB8fCAnJztcclxuICAgICAgICAgICAgICAgIGlmICghYXNzZXRVcmwuc3RhcnRzV2l0aChyb290UGF0aCkpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIENvbXB1dGUgcmVsYXRpdmUgc2VnbWVudHMgZnJvbSByb290XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZSA9IGFzc2V0VXJsLnNsaWNlKHJvb3RQYXRoLmxlbmd0aCkucmVwbGFjZSgvXlxcLy8sICcnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNlZ21lbnRzID0gcmVsYXRpdmUuc3BsaXQoJy8nKS5maWx0ZXIoQm9vbGVhbik7XHJcbiAgICAgICAgICAgICAgICBpZiAoc2VnbWVudHMubGVuZ3RoID09PSAwIHx8IHNlZ21lbnRzLmxlbmd0aCA+IGRlcHRoKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY3VycmVudFVybCA9IHJvb3RQYXRoO1xyXG4gICAgICAgICAgICAgICAgbGV0IGN1cnJlbnROb2RlID0gcm9vdE5vZGU7XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZWdtZW50cy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlZyA9IHNlZ21lbnRzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkVXJsID0gY3VycmVudFVybCArICcvJyArIHNlZztcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIW5vZGVNYXBbY2hpbGRVcmxdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzTGVhZiA9IGkgPT09IHNlZ21lbnRzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkTm9kZTogVHJlZU5vZGUgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBzZWcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cmw6IGNoaWxkVXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaXNMZWFmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXNzZXQudXVpZCkgY2hpbGROb2RlLnV1aWQgPSBhc3NldC51dWlkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFzc2V0LnR5cGUpIGNoaWxkTm9kZS50eXBlID0gYXNzZXQudHlwZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTWFwW2NoaWxkVXJsXSA9IGNoaWxkTm9kZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudE5vZGUuY2hpbGRyZW4ucHVzaChjaGlsZE5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50VXJsID0gY2hpbGRVcmw7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudE5vZGUgPSBub2RlTWFwW2NoaWxkVXJsXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcm9vdE5vZGUgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhwb3J0TWFuaWZlc3QocGF0dGVybj86IHN0cmluZywgaW5jbHVkZU1ldGFkYXRhPzogYm9vbGVhbik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcXVlcnlQYXR0ZXJuID0gcGF0dGVybiB8fCAnZGI6Ly9hc3NldHMvKiovKi4qJztcclxuICAgICAgICAgICAgY29uc3QgYXNzZXRzOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IHBhdHRlcm46IHF1ZXJ5UGF0dGVybiB9KTtcclxuICAgICAgICAgICAgaWYgKCFhc3NldHMgfHwgIUFycmF5LmlzQXJyYXkoYXNzZXRzKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0b3RhbDogMCwgYXNzZXRzOiBbXSB9IH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG1hbmlmZXN0OiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGFzc2V0IG9mIGFzc2V0cykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW50cnk6IGFueSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBhc3NldC5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGFzc2V0LnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBhc3NldC51cmwgfHwgYXNzZXQucGF0aCxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBhc3NldC50eXBlLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGlmIChpbmNsdWRlTWV0YWRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmZvOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgYXNzZXQudXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmZvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5mby5maWxlKSBlbnRyeS5maWxlID0gaW5mby5maWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZm8ubGlicmFyeSkgZW50cnkubGlicmFyeSA9IGluZm8ubGlicmFyeTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbmZvLnN1YkFzc2V0cykgZW50cnkuc3ViQXNzZXRzID0gaW5mby5zdWJBc3NldHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5mby5kZXBlbmRzKSBlbnRyeS5kZXBlbmRzID0gaW5mby5kZXBlbmRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50cnkuaXNEaXJlY3RvcnkgPSBpbmZvLmlzRGlyZWN0b3J5IHx8IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoXykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBza2lwIG1ldGFkYXRhIGVycm9ycyBmb3IgaW5kaXZpZHVhbCBhc3NldHNcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBtYW5pZmVzdC5wdXNoKGVudHJ5KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0b3RhbDogbWFuaWZlc3QubGVuZ3RoLCBhc3NldHM6IG1hbmlmZXN0IH0gfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0VW51c2VkKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgIGVycm9yOiAnZ2V0X3VudXNlZCBpcyBub3QgeWV0IGF2YWlsYWJsZS4gVGhpcyBmZWF0dXJlIHJlcXVpcmVzIGNyb3NzLXJlZmVyZW5jaW5nIGFsbCBzY2VuZXMgYW5kIHNjcmlwdHMuJyxcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY29tcHJlc3NUZXh0dXJlcygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICBlcnJvcjogJ2NvbXByZXNzX3RleHR1cmVzIGlzIG5vdCB5ZXQgYXZhaWxhYmxlLiBUZXh0dXJlIGNvbXByZXNzaW9uIHJlcXVpcmVzIGJ1aWxkIHBpcGVsaW5lIGludGVncmF0aW9uLicsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG4iXX0=