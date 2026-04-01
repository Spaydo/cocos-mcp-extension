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
                description: 'List all scene files in the project. Use filter to narrow results',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filter: { type: 'string', description: 'Substring filter for scene names (case-insensitive)' },
                    },
                },
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
            {
                name: 'dirty',
                description: 'Check if the current scene has unsaved changes',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'reload',
                description: 'Soft reload the current scene',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'classes',
                description: 'List all registered component classes. Use filter to narrow results (e.g. "UI", "Light", "Physics")',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filter: { type: 'string', description: 'Substring filter for class names (case-insensitive)' },
                    },
                },
            },
            {
                name: 'close',
                description: 'Close the current scene',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'save_as',
                description: 'Save the current scene as a new scene file',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'ready',
                description: 'Check if the scene editor is ready',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'bounds',
                description: 'Get the bounding box of the current scene view',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'begin_recording',
                description: 'Begin undo recording for a node (returns undoId)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string', description: 'Node UUID to record changes for' },
                    },
                    required: ['nodeUuid'],
                },
            },
            {
                name: 'end_recording',
                description: 'End undo recording and commit changes',
                inputSchema: {
                    type: 'object',
                    properties: {
                        undoId: { type: 'string', description: 'Undo recording ID from begin_recording' },
                    },
                    required: ['undoId'],
                },
            },
            {
                name: 'cancel_recording',
                description: 'Cancel undo recording and discard changes',
                inputSchema: {
                    type: 'object',
                    properties: {
                        undoId: { type: 'string', description: 'Undo recording ID from begin_recording' },
                    },
                    required: ['undoId'],
                },
            },
            {
                name: 'move_array_element',
                description: 'Move an element within a serialized array property',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Node UUID' },
                        path: { type: 'string', description: 'Array property path (e.g. __comps__)' },
                        target: { type: 'number', description: 'Current index of element' },
                        offset: { type: 'number', description: 'Move offset (positive=down, negative=up)' },
                    },
                    required: ['uuid', 'path', 'target'],
                },
            },
            {
                name: 'remove_array_element',
                description: 'Remove an element from a serialized array property',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Node UUID' },
                        path: { type: 'string', description: 'Array property path' },
                        index: { type: 'number', description: 'Index of element to remove' },
                    },
                    required: ['uuid', 'path', 'index'],
                },
            },
            {
                name: 'query_components',
                description: 'List all component instances in the current scene',
                inputSchema: { type: 'object', properties: {} },
            },
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'query': return this.query(args);
            case 'list': return this.list(args.filter);
            case 'open': return this.open(args.path);
            case 'save': return this.save();
            case 'create': return this.create(args.name, args.path);
            case 'snapshot': return this.snapshot();
            case 'dirty': return this.dirty();
            case 'reload': return this.reload();
            case 'classes': return this.classes(args.filter);
            case 'close': return this.close();
            case 'save_as': return this.saveAs();
            case 'ready': return this.isReady();
            case 'bounds': return this.queryBounds();
            case 'begin_recording': return this.beginRecording(args.nodeUuid);
            case 'end_recording': return this.endRecording(args.undoId);
            case 'cancel_recording': return this.cancelRecording(args.undoId);
            case 'move_array_element': return this.moveArrayElement(args);
            case 'remove_array_element': return this.removeArrayElement(args);
            case 'query_components': return this.queryComponents();
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

    private async list(filter?: string): Promise<ToolResponse> {
        try {
            const assets: any = await Editor.Message.request('asset-db', 'query-assets', { pattern: 'db://assets/**/*.scene' });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: [] };
            }
            let scenes = assets.map((a: any) => ({
                name: a.name || a.url?.split('/').pop()?.replace('.scene', ''),
                uuid: a.uuid,
                url: a.url || a.path,
            }));
            if (filter) {
                const lowerFilter = filter.toLowerCase();
                scenes = scenes.filter((s: any) => s.name.toLowerCase().includes(lowerFilter));
            }
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

    private async dirty(): Promise<ToolResponse> {
        try {
            // query-dirty may return boolean or { dirty: boolean }
            const result: any = await Editor.Message.request('scene', 'query-dirty');
            const dirty = typeof result === 'boolean' ? result
                : typeof result === 'object' && result !== null ? !!result.dirty
                : !!result;
            return { success: true, data: { dirty } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async reload(): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'soft-reload');
            return { success: true, message: 'Scene reloaded' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async classes(filter?: string): Promise<ToolResponse> {
        try {
            const classes: any[] = await (Editor.Message.request as any)('scene', 'query-classes');
            if (!filter) {
                return { success: true, data: classes.map((c: any) => c.name || c) };
            }
            const lowerFilter = filter.toLowerCase();
            const filtered = classes
                .map((c: any) => c.name || c)
                .filter((name: string) => name.toLowerCase().includes(lowerFilter));
            return { success: true, data: filtered };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async close(): Promise<ToolResponse> {
        try {
            const result: any = await (Editor.Message.request as any)('scene', 'close-scene');
            return { success: true, data: { closed: !!result }, message: 'Scene closed' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async saveAs(): Promise<ToolResponse> {
        try {
            const result: any = await (Editor.Message.request as any)('scene', 'save-as-scene');
            return { success: true, data: { savedPath: result }, message: result ? `Scene saved as: ${result}` : 'Save as cancelled' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async isReady(): Promise<ToolResponse> {
        try {
            const ready: any = await (Editor.Message.request as any)('scene', 'query-is-ready');
            return { success: true, data: { ready: !!ready } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryBounds(): Promise<ToolResponse> {
        try {
            const bounds: any = await (Editor.Message.request as any)('scene', 'query-scene-bounds');
            return { success: true, data: bounds };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async beginRecording(nodeUuid: string): Promise<ToolResponse> {
        try {
            const undoId = await (Editor.Message.request as any)('scene', 'begin-recording', nodeUuid);
            return { success: true, data: { undoId }, message: 'Undo recording started' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async endRecording(undoId: string): Promise<ToolResponse> {
        try {
            await (Editor.Message.request as any)('scene', 'end-recording', undoId);
            return { success: true, message: 'Undo recording committed' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async cancelRecording(undoId: string): Promise<ToolResponse> {
        try {
            await (Editor.Message.request as any)('scene', 'cancel-recording', undoId);
            return { success: true, message: 'Undo recording cancelled' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async moveArrayElement(args: any): Promise<ToolResponse> {
        try {
            await (Editor.Message.request as any)('scene', 'move-array-element', { uuid: args.uuid, path: args.path, target: args.target, offset: args.offset ?? 1 });
            return { success: true, message: 'Array element moved' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async removeArrayElement(args: any): Promise<ToolResponse> {
        try {
            await (Editor.Message.request as any)('scene', 'remove-array-element', { uuid: args.uuid, path: args.path, index: args.index });
            return { success: true, message: 'Array element removed' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryComponents(): Promise<ToolResponse> {
        try {
            const result = await (Editor.Message.request as any)('scene', 'query-components');
            return { success: true, data: result };
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
        // Template based on Cocos Creator 3.8.4 default 2D scene structure.
        // IDs: 0=SceneAsset, 1=Scene, 2=Canvas, 3=Camera, 4=UITransform,
        //      5=Canvas comp, 6=Widget, 7=Camera comp, 8=SceneGlobals,
        //      9-16=Globals sub-objects
        return [
            // 0: SceneAsset
            {
                __type__: 'cc.SceneAsset',
                _name: name,
                _objFlags: 0,
                __editorExtras__: {},
                _native: '',
                scene: { __id__: 1 },
            },
            // 1: Scene root
            {
                __type__: 'cc.Scene',
                _name: name,
                _objFlags: 0,
                __editorExtras__: {},
                _parent: null,
                _children: [{ __id__: 2 }],
                _active: true,
                _components: [],
                _prefab: null,
                _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
                _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
                _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _mobility: 0,
                _layer: 1073741824,
                _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
                autoReleaseAssets: false,
                _globals: { __id__: 8 },
            },
            // 2: Canvas node
            {
                __type__: 'cc.Node',
                _name: 'Canvas',
                _objFlags: 0,
                __editorExtras__: {},
                _parent: { __id__: 1 },
                _children: [{ __id__: 3 }],
                _active: true,
                _components: [{ __id__: 4 }, { __id__: 5 }, { __id__: 6 }],
                _prefab: null,
                _lpos: { __type__: 'cc.Vec3', x: 640, y: 360, z: 0 },
                _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
                _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _mobility: 0,
                _layer: 33554432,
                _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
            },
            // 3: Camera node
            {
                __type__: 'cc.Node',
                _name: 'Camera',
                _objFlags: 0,
                __editorExtras__: {},
                _parent: { __id__: 2 },
                _children: [],
                _active: true,
                _components: [{ __id__: 7 }],
                _prefab: null,
                _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 1000 },
                _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 },
                _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 },
                _mobility: 0,
                _layer: 1073741824,
                _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 },
            },
            // 4: UITransform on Canvas
            {
                __type__: 'cc.UITransform',
                _name: '',
                _objFlags: 0,
                __editorExtras__: {},
                node: { __id__: 2 },
                _enabled: true,
                _contentSize: { __type__: 'cc.Size', width: 1280, height: 720 },
                _anchorPoint: { __type__: 'cc.Vec2', x: 0.5, y: 0.5 },
            },
            // 5: Canvas component
            {
                __type__: 'cc.Canvas',
                _name: '',
                _objFlags: 0,
                __editorExtras__: {},
                node: { __id__: 2 },
                _enabled: true,
                _cameraComponent: { __id__: 7 },
                _alignCanvasWithScreen: true,
            },
            // 6: Widget on Canvas
            {
                __type__: 'cc.Widget',
                _name: '',
                _objFlags: 0,
                __editorExtras__: {},
                node: { __id__: 2 },
                _enabled: true,
                _alignFlags: 45,
                _left: 0,
                _right: 0,
                _top: 0,
                _bottom: 0,
            },
            // 7: Camera component
            {
                __type__: 'cc.Camera',
                _name: '',
                _objFlags: 0,
                __editorExtras__: {},
                node: { __id__: 3 },
                _enabled: true,
                _projection: 0,
                _priority: 1073741824,
                _fov: 45,
                _fovAxis: 0,
                _orthoHeight: 360,
                _near: 0,
                _far: 2000,
                _color: { __type__: 'cc.Color', r: 0, g: 0, b: 0, a: 255 },
                _depth: 1,
                _stencil: 0,
                _clearFlags: 6,
                _rect: { __type__: 'cc.Rect', x: 0, y: 0, width: 1, height: 1 },
                _visibility: 41943040,
            },
            // 8: SceneGlobals
            {
                __type__: 'cc.SceneGlobals',
                ambient: { __id__: 9 },
                shadows: { __id__: 10 },
                _skybox: { __id__: 11 },
                fog: { __id__: 12 },
                octree: { __id__: 13 },
                skin: { __id__: 14 },
                lightProbeInfo: { __id__: 15 },
                postSettings: { __id__: 16 },
                bakedWithStationaryMainLight: false,
                bakedWithHighpLightmap: false,
            },
            // 9: AmbientInfo
            {
                __type__: 'cc.AmbientInfo',
                _skyColorHDR: { __type__: 'cc.Vec4', x: 0, y: 0, z: 0, w: 0.520833125 },
                _skyColor: { __type__: 'cc.Vec4', x: 0, y: 0, z: 0, w: 0.520833125 },
                _skyIllumHDR: 20000,
                _skyIllum: 20000,
                _groundAlbedoHDR: { __type__: 'cc.Vec4', x: 0, y: 0, z: 0, w: 0 },
                _groundAlbedo: { __type__: 'cc.Vec4', x: 0, y: 0, z: 0, w: 0 },
                _skyColorLDR: { __type__: 'cc.Vec4', x: 0.2, y: 0.5, z: 0.8, w: 1 },
                _skyIllumLDR: 20000,
                _groundAlbedoLDR: { __type__: 'cc.Vec4', x: 0.2, y: 0.2, z: 0.2, w: 1 },
            },
            // 10: ShadowsInfo
            {
                __type__: 'cc.ShadowsInfo',
                _enabled: false,
                _type: 0,
                _normal: { __type__: 'cc.Vec3', x: 0, y: 1, z: 0 },
                _distance: 0,
                _planeBias: 1,
                _shadowColor: { __type__: 'cc.Color', r: 76, g: 76, b: 76, a: 255 },
                _maxReceived: 4,
                _size: { __type__: 'cc.Vec2', x: 512, y: 512 },
            },
            // 11: SkyboxInfo
            {
                __type__: 'cc.SkyboxInfo',
                _envLightingType: 0,
                _envmapHDR: null,
                _envmap: null,
                _envmapLDR: null,
                _diffuseMapHDR: null,
                _diffuseMapLDR: null,
                _enabled: false,
                _useHDR: true,
                _editableMaterial: null,
                _reflectionHDR: null,
                _reflectionLDR: null,
                _rotationAngle: 0,
            },
            // 12: FogInfo
            {
                __type__: 'cc.FogInfo',
                _type: 0,
                _fogColor: { __type__: 'cc.Color', r: 200, g: 200, b: 200, a: 255 },
                _enabled: false,
                _fogDensity: 0.3,
                _fogStart: 0.5,
                _fogEnd: 300,
                _fogAtten: 5,
                _fogTop: 1.5,
                _fogRange: 1.2,
                _accurate: false,
            },
            // 13: OctreeInfo
            {
                __type__: 'cc.OctreeInfo',
                _enabled: false,
                _minPos: { __type__: 'cc.Vec3', x: -1024, y: -1024, z: -1024 },
                _maxPos: { __type__: 'cc.Vec3', x: 1024, y: 1024, z: 1024 },
                _depth: 8,
            },
            // 14: SkinInfo
            {
                __type__: 'cc.SkinInfo',
                _enabled: false,
                _blurRadius: 0.01,
                _sssIntensity: 3,
            },
            // 15: LightProbeInfo
            {
                __type__: 'cc.LightProbeInfo',
                _giScale: 1,
                _giSamples: 1024,
                _bounces: 2,
                _reduceRinging: 0,
                _showProbe: true,
                _showWireframe: true,
                _showConvex: false,
                _data: null,
                _lightProbeSphereVolume: 1,
            },
            // 16: PostSettingsInfo
            {
                __type__: 'cc.PostSettingsInfo',
                _toneMappingType: 0,
            },
        ];
    }
}
