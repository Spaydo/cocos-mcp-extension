import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

const EXTENSION_NAME = 'cocos-mcp-extension';

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
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'list': return this.list();
            case 'instantiate': return this.instantiate(args);
            case 'create': return this.create(args.nodeUuid, args.path);
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
            let parentUuid = args.parentUuid;

            // Get scene root if no parent specified
            if (!parentUuid) {
                try {
                    const tree: any = await Editor.Message.request('scene', 'query-node-tree');
                    parentUuid = tree?.uuid;
                } catch {
                    const sceneInfo: any = await Editor.Message.request('scene', 'query-current-scene');
                    parentUuid = sceneInfo?.uuid;
                }
            }

            if (!parentUuid) {
                return { success: false, error: 'Cannot determine scene root' };
            }

            const options: any = {
                parent: parentUuid,
                assetUuid: args.assetUuid,
            };

            if (args.name) {
                options.name = args.name;
            }

            const uuid: any = await Editor.Message.request('scene', 'create-node', options);
            return {
                success: true,
                data: { uuid, name: args.name },
                message: `Prefab instantiated: ${args.assetUuid}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async create(nodeUuid: string, path: string): Promise<ToolResponse> {
        try {
            // Try scene script for prefab creation (requires cc.* access)
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'createPrefabFromNode',
                args: [nodeUuid, path],
            });
            return result || { success: false, error: 'Failed to create prefab' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
