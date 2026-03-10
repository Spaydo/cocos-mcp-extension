import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

const EXTENSION_NAME = 'cocos-mcp-extension';

export class SceneTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'query',
                description: 'Get current scene info and hierarchy tree',
                inputSchema: {
                    type: 'object',
                    properties: {
                        maxDepth: { type: 'number', description: 'Max tree depth (default 3)' },
                        includeComponents: { type: 'boolean', description: 'Include component list per node' },
                    },
                },
            },
            {
                name: 'list',
                description: 'List all scene files in the project',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'open',
                description: 'Open a scene by db:// path',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'db:// path, e.g. db://assets/scenes/main.scene' },
                    },
                    required: ['path'],
                },
            },
            {
                name: 'save',
                description: 'Save the current scene',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'create',
                description: 'Create a new scene asset',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        path: { type: 'string', description: 'Folder db:// path, e.g. db://assets/scenes' },
                    },
                    required: ['name', 'path'],
                },
            },
            {
                name: 'snapshot',
                description: 'Create an undo snapshot of current scene',
                inputSchema: { type: 'object', properties: {} },
            },
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'query': return this.query(args);
            case 'list': return this.list();
            case 'open': return this.open(args.path);
            case 'save': return this.save();
            case 'create': return this.create(args.name, args.path);
            case 'snapshot': return this.snapshot();
            default: return { success: false, error: `Unknown scene tool: ${toolName}` };
        }
    }

    // === Tool Implementations ===

    private async query(args: any): Promise<ToolResponse> {
        const maxDepth = args.maxDepth ?? 3;
        const includeComponents = args.includeComponents ?? false;

        try {
            // Primary: Editor API
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (tree) {
                const hierarchy = this.buildHierarchy(tree, includeComponents, 0, maxDepth);
                return { success: true, data: hierarchy };
            }
        } catch {
            // Fallback: scene script
        }

        try {
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'getSceneHierarchy',
                args: [includeComponents, maxDepth],
            });
            return result || { success: false, error: 'No scene data returned' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async list(): Promise<ToolResponse> {
        try {
            const assets: any = await Editor.Message.request('asset-db', 'query-assets', { pattern: 'db://assets/**/*.scene' });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: [] };
            }
            const scenes = assets.map((a: any) => ({
                name: a.name || a.url?.split('/').pop()?.replace('.scene', ''),
                uuid: a.uuid,
                url: a.url || a.path,
            }));
            return { success: true, data: scenes };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async open(path: string): Promise<ToolResponse> {
        try {
            // Get UUID from path first
            const uuid: any = await Editor.Message.request('asset-db', 'query-uuid', path);
            if (!uuid) {
                return { success: false, error: `Scene not found: ${path}` };
            }
            await Editor.Message.request('scene', 'open-scene', uuid);
            return { success: true, message: `Opened scene: ${path}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async save(): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'save-scene');
            return { success: true, message: 'Scene saved' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async create(name: string, folderPath: string): Promise<ToolResponse> {
        try {
            const scenePath = `${folderPath}/${name}.scene`;
            const sceneJson = JSON.stringify(this.getSceneTemplate(name));
            const result: any = await Editor.Message.request('asset-db', 'create-asset', scenePath, sceneJson);
            return {
                success: true,
                data: { uuid: result?.uuid, url: scenePath },
                message: `Scene created: ${scenePath}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async snapshot(): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'snapshot');
            return { success: true, message: 'Undo snapshot created' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    // === Helpers ===

    private buildHierarchy(node: any, includeComponents: boolean, depth: number, maxDepth: number): any {
        const result: any = {
            uuid: node.uuid,
            name: node.name,
            active: node.active !== false,
        };

        if (includeComponents && node.__comps__) {
            result.components = node.__comps__.map((c: any) => ({
                type: c.__type__ || c.cid || 'unknown',
                enabled: c.enabled !== false,
            }));
        }

        if (depth < maxDepth && node.children && node.children.length > 0) {
            result.children = node.children.map((child: any) =>
                this.buildHierarchy(child, includeComponents, depth + 1, maxDepth)
            );
        } else if (node.children && node.children.length > 0) {
            result.childCount = node.children.length;
        }

        return result;
    }

    private getSceneTemplate(name: string): any[] {
        return [
            {
                __type__: 'cc.SceneAsset',
                _name: name,
                _objFlags: 0,
                _native: '',
                scene: { __id__: 1 },
            },
            {
                __type__: 'cc.Scene',
                _name: name,
                _objFlags: 0,
                _parent: null,
                _children: [{ __id__: 2 }],
                _active: true,
                _components: [],
                _prefab: null,
                autoReleaseAssets: false,
                _globals: { __id__: 3 },
            },
            {
                __type__: 'cc.Node',
                _name: 'Main Camera',
                _objFlags: 0,
                _parent: { __id__: 1 },
                _children: [],
                _active: true,
                _components: [{ __id__: 4 }],
                _prefab: null,
                _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 10 },
                _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
                _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _layer: 1073741824,
                _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
            },
            {
                __type__: 'cc.SceneGlobals',
                ambient: {
                    _skyColor: { __type__: 'cc.Color', r: 51, g: 128, b: 204, a: 1 },
                    _skyIllum: 20000,
                    _groundAlbedo: { __type__: 'cc.Color', r: 51, g: 51, b: 51, a: 255 },
                },
                shadow: { enabled: false },
            },
            {
                __type__: 'cc.Camera',
                _name: '',
                _objFlags: 0,
                node: { __id__: 2 },
                _enabled: true,
                _projection: 1,
                _priority: 0,
                _fov: 45,
                _fovAxis: 0,
                _orthoHeight: 10,
                _near: 1,
                _far: 1000,
                _color: { __type__: 'cc.Color', r: 51, g: 51, b: 51, a: 255 },
                _depth: 1,
                _stencil: 0,
                _clearFlags: 7,
                _rect: { __type__: 'cc.Rect', x: 0, y: 0, width: 1, height: 1 },
                _visibility: 1073741824,
            },
        ];
    }
}
