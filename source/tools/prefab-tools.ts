import { randomBytes } from 'crypto';
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
                name: 'list',
                description: 'List all prefab assets in the project',
                inputSchema: { type: 'object', properties: {} },
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
            case 'list': return this.list();
            case 'instantiate': return this.instantiate(args);
            case 'create': return this.create(args.nodeUuid, args.path);
            case 'create_empty': return this.createEmpty(args.name, args.path);
            default: return { success: false, error: `Unknown prefab tool: ${toolName}` };
        }
    }

    private async list(): Promise<ToolResponse> {
        try {
            const assets: any = await Editor.Message.request('asset-db', 'query-assets', { pattern: 'db://assets/**/*.prefab' });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: [] };
            }
            const prefabs = assets.map((a: any) => ({
                name: a.name || a.url?.split('/').pop()?.replace('.prefab', ''),
                uuid: a.uuid,
                url: a.url || a.path,
            }));
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
