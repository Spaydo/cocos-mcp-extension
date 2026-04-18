import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

const EXTENSION_NAME = 'cocos-mcp-extension';

/** Generate a Cocos Creator-style fileId (22-char base64url) */
function generateFileId(): string {
    return randomBytes(16).toString('base64url').slice(0, 22);
}

export class PrefabTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'query',
                description: 'Query prefab internal node/component hierarchy (reads .prefab file, does not modify scene)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'db:// path to the prefab, e.g. db://assets/prefabs/my.prefab' },
                        uuid: { type: 'string', description: 'Prefab asset UUID (alternative to path)' },
                        maxDepth: { type: 'number', description: 'Max tree depth (default 10)' },
                    },
                },
            },
            {
                name: 'list',
                description: 'List all prefab assets in the project. Use filter to narrow results',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filter: { type: 'string', description: 'Substring filter for prefab names (case-insensitive)' },
                    },
                },
            },
            {
                name: 'instantiate',
                description: 'Instantiate a prefab into the scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        assetUuid: { type: 'string', description: 'Prefab asset UUID' },
                        parentUuid: { type: 'string', description: 'Parent node UUID (default: scene root)' },
                        name: { type: 'string', description: 'Override instance name' },
                    },
                    required: ['assetUuid'],
                },
            },
            {
                name: 'create',
                description: 'Create a prefab from an existing scene node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string', description: 'Source node UUID' },
                        path: { type: 'string', description: 'db:// path for the prefab, e.g. db://assets/prefabs/my.prefab' },
                    },
                    required: ['nodeUuid', 'path'],
                },
            },
            {
                name: 'restore',
                description: 'Restore a prefab instance node to its original prefab state',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string', description: 'Prefab instance node UUID to restore' },
                    },
                    required: ['nodeUuid'],
                },
            },
            {
                name: 'create_empty',
                description: 'Create a new empty prefab asset directly (no scene node needed)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Prefab name' },
                        path: { type: 'string', description: 'db:// folder path, e.g. db://assets/prefabs' },
                    },
                    required: ['name', 'path'],
                },
            },
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'query': return this.query(args.path, args.uuid, args.maxDepth);
            case 'list': return this.list(args.filter);
            case 'instantiate': return this.instantiate(args);
            case 'create': return this.create(args.nodeUuid, args.path);
            case 'create_empty': return this.createEmpty(args.name, args.path);
            case 'restore': return this.restore(args.nodeUuid);
            default: return { success: false, error: `Unknown prefab tool: ${toolName}` };
        }
    }

    // === Query: read prefab file and parse hierarchy ===

    private async query(dbPath?: string, uuid?: string, maxDepth: number = 10): Promise<ToolResponse> {
        try {
            // Resolve asset info from path or uuid
            let assetInfo: any;
            if (uuid) {
                assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
            } else if (dbPath) {
                assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', dbPath);
            } else {
                return { success: false, error: 'Provide either "path" (db:// path) or "uuid"' };
            }

            if (!assetInfo) {
                return { success: false, error: `Prefab not found: ${dbPath || uuid}` };
            }

            // Read the .prefab file (JSON array)
            const filePath = assetInfo.file || assetInfo.source;
            if (!filePath || !fs.existsSync(filePath)) {
                return { success: false, error: `Prefab source file not accessible: ${filePath}` };
            }

            const content = fs.readFileSync(filePath, 'utf8');
            const data: any[] = JSON.parse(content);

            if (!Array.isArray(data) || data.length === 0) {
                return { success: false, error: 'Invalid prefab format: expected JSON array' };
            }

            // Find root: cc.Prefab entry points to root node via data.__id__
            const prefabEntry = data.find((item: any) => item.__type__ === 'cc.Prefab');
            const rootNodeIdx = prefabEntry?.data?.__id__ ?? 1; // fallback to index 1

            // Build hierarchy tree
            const tree = this.buildNodeTree(data, rootNodeIdx, 0, maxDepth);

            return {
                success: true,
                data: {
                    name: assetInfo.name || prefabEntry?._name,
                    uuid: assetInfo.uuid,
                    url: assetInfo.url,
                    totalObjects: data.length,
                    hierarchy: tree,
                },
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    /** Recursively build node tree from prefab JSON array */
    private buildNodeTree(data: any[], nodeIdx: number, depth: number, maxDepth: number): any {
        if (nodeIdx < 0 || nodeIdx >= data.length || depth > maxDepth) return null;
        const node = data[nodeIdx];
        if (!node) return null;

        // Extract components
        const components: string[] = [];
        if (node._components) {
            for (const ref of node._components) {
                const compIdx = ref?.__id__;
                if (compIdx != null && data[compIdx]) {
                    components.push(data[compIdx].__type__ || 'unknown');
                }
            }
        }

        // Extract basic properties
        const result: any = {
            name: node._name || 'unnamed',
            active: node._active !== false,
        };

        if (components.length > 0) {
            result.components = components;
        }

        // Position (if non-zero)
        if (node._lpos && (node._lpos.x || node._lpos.y || node._lpos.z)) {
            result.position = { x: node._lpos.x, y: node._lpos.y, z: node._lpos.z };
        }

        // Recurse children
        if (node._children && node._children.length > 0) {
            const children: any[] = [];
            for (const childRef of node._children) {
                const childIdx = childRef?.__id__;
                if (childIdx != null) {
                    const child = this.buildNodeTree(data, childIdx, depth + 1, maxDepth);
                    if (child) children.push(child);
                }
            }
            if (children.length > 0) {
                result.children = children;
            }
        }

        return result;
    }

    private async list(filter?: string): Promise<ToolResponse> {
        try {
            const assets: any = await Editor.Message.request('asset-db', 'query-assets', { pattern: 'db://assets/**/*.prefab' });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: [] };
            }
            let prefabs = assets.map((a: any) => ({
                name: a.name || a.url?.split('/').pop()?.replace('.prefab', ''),
                uuid: a.uuid,
                url: a.url || a.path,
            }));
            if (filter) {
                const lowerFilter = filter.toLowerCase();
                prefabs = prefabs.filter((p: any) => p.name.toLowerCase().includes(lowerFilter));
            }
            return { success: true, data: prefabs };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async instantiate(args: any): Promise<ToolResponse> {
        try {
            // Use cc.instantiate() via scene script for proper prefab instance linking
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'instantiatePrefab',
                args: [args.assetUuid, args.parentUuid, args.name],
            });
            return result || { success: false, error: 'No result returned' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async createEmpty(name: string, folderPath: string): Promise<ToolResponse> {
        try {
            const prefabPath = `${folderPath}/${name}.prefab`;
            const prefabJson = JSON.stringify([
                {
                    __type__: 'cc.Prefab',
                    _name: name,
                    _objFlags: 0,
                    _native: '',
                    data: { __id__: 1 },
                    optimizationPolicy: 0,
                    asyncLoadAssets: false,
                    persistent: false,
                },
                {
                    __type__: 'cc.Node',
                    _name: name,
                    _objFlags: 0,
                    _parent: null,
                    _children: [],
                    _active: true,
                    _components: [],
                    _prefab: { __id__: 2 },
                    _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
                    _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
                    _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                    _layer: 1073741824,
                    _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
                    _id: generateFileId(),
                },
                {
                    __type__: 'cc.PrefabInfo',
                    root: { __id__: 1 },
                    asset: { __id__: 0 },
                    fileId: generateFileId(),
                },
            ]);

            const result: any = await Editor.Message.request('asset-db', 'create-asset', prefabPath, prefabJson);
            return {
                success: true,
                data: { uuid: result?.uuid, path: prefabPath },
                message: `Empty prefab created: ${prefabPath}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async restore(nodeUuid: string): Promise<ToolResponse> {
        try {
            await (Editor.Message.request as any)('scene', 'restore-prefab', nodeUuid);
            return { success: true, message: `Prefab instance restored: ${nodeUuid}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async create(nodeUuid: string, path: string): Promise<ToolResponse> {
        try {
            // Use Editor's built-in create-prefab API (runs in editor process, not scene script)
            await Editor.Message.request('scene', 'create-prefab', nodeUuid, path);

            // Verify the prefab was actually created (API doesn't throw on failure,
            // e.g. when trying to create from a node inside a prefab instance)
            const asset: any = await Editor.Message.request('asset-db', 'query-asset-info', path);
            if (!asset) {
                return { success: false, error: 'Prefab creation failed. Node may be inside a prefab instance.' };
            }
            return {
                success: true,
                data: { uuid: asset.uuid, path },
                message: `Prefab created: ${path}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
