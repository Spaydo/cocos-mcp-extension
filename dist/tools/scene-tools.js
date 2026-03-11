"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SceneTools = void 0;
const EXTENSION_NAME = 'cocos-mcp-extension';
class SceneTools {
    getTools() {
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
        ];
    }
    async execute(toolName, args) {
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
            default: return { success: false, error: `Unknown scene tool: ${toolName}` };
        }
    }
    // === Tool Implementations ===
    async query(args) {
        var _a, _b;
        const maxDepth = (_a = args.maxDepth) !== null && _a !== void 0 ? _a : 3;
        const includeComponents = (_b = args.includeComponents) !== null && _b !== void 0 ? _b : false;
        try {
            // Primary: Editor API
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (tree) {
                const hierarchy = this.buildHierarchy(tree, includeComponents, 0, maxDepth);
                return { success: true, data: hierarchy };
            }
        }
        catch (_c) {
            // Fallback: scene script
        }
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'getSceneHierarchy',
                args: [includeComponents, maxDepth],
            });
            return result || { success: false, error: 'No scene data returned' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async list(filter) {
        try {
            const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: 'db://assets/**/*.scene' });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: [] };
            }
            let scenes = assets.map((a) => {
                var _a, _b;
                return ({
                    name: a.name || ((_b = (_a = a.url) === null || _a === void 0 ? void 0 : _a.split('/').pop()) === null || _b === void 0 ? void 0 : _b.replace('.scene', '')),
                    uuid: a.uuid,
                    url: a.url || a.path,
                });
            });
            if (filter) {
                const lowerFilter = filter.toLowerCase();
                scenes = scenes.filter((s) => s.name.toLowerCase().includes(lowerFilter));
            }
            return { success: true, data: scenes };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async open(path) {
        try {
            // Get UUID from path first
            const uuid = await Editor.Message.request('asset-db', 'query-uuid', path);
            if (!uuid) {
                return { success: false, error: `Scene not found: ${path}` };
            }
            await Editor.Message.request('scene', 'open-scene', uuid);
            return { success: true, message: `Opened scene: ${path}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async save() {
        try {
            await Editor.Message.request('scene', 'save-scene');
            return { success: true, message: 'Scene saved' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async create(name, folderPath) {
        try {
            const scenePath = `${folderPath}/${name}.scene`;
            const sceneJson = JSON.stringify(this.getSceneTemplate(name));
            const result = await Editor.Message.request('asset-db', 'create-asset', scenePath, sceneJson);
            return {
                success: true,
                data: { uuid: result === null || result === void 0 ? void 0 : result.uuid, url: scenePath },
                message: `Scene created: ${scenePath}`,
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async snapshot() {
        try {
            await Editor.Message.request('scene', 'snapshot');
            return { success: true, message: 'Undo snapshot created' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async dirty() {
        try {
            const isDirty = await Editor.Message.request('scene', 'query-dirty');
            return { success: true, data: { dirty: !!isDirty } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async reload() {
        try {
            await Editor.Message.request('scene', 'soft-reload');
            return { success: true, message: 'Scene reloaded' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async classes(filter) {
        try {
            const classes = await Editor.Message.request('scene', 'query-classes');
            if (!filter) {
                return { success: true, data: classes.map((c) => c.name || c) };
            }
            const lowerFilter = filter.toLowerCase();
            const filtered = classes
                .map((c) => c.name || c)
                .filter((name) => name.toLowerCase().includes(lowerFilter));
            return { success: true, data: filtered };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async close() {
        try {
            const result = await Editor.Message.request('scene', 'close-scene');
            return { success: true, data: { closed: !!result }, message: 'Scene closed' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async saveAs() {
        try {
            const result = await Editor.Message.request('scene', 'save-as-scene');
            return { success: true, data: { savedPath: result }, message: result ? `Scene saved as: ${result}` : 'Save as cancelled' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async isReady() {
        try {
            const ready = await Editor.Message.request('scene', 'query-is-ready');
            return { success: true, data: { ready: !!ready } };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async queryBounds() {
        try {
            const bounds = await Editor.Message.request('scene', 'query-scene-bounds');
            return { success: true, data: bounds };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    // === Helpers ===
    buildHierarchy(node, includeComponents, depth, maxDepth) {
        const result = {
            uuid: node.uuid,
            name: node.name,
            active: node.active !== false,
        };
        if (includeComponents && node.__comps__) {
            result.components = node.__comps__.map((c) => ({
                type: c.__type__ || c.cid || 'unknown',
                enabled: c.enabled !== false,
            }));
        }
        if (depth < maxDepth && node.children && node.children.length > 0) {
            result.children = node.children.map((child) => this.buildHierarchy(child, includeComponents, depth + 1, maxDepth));
        }
        else if (node.children && node.children.length > 0) {
            result.childCount = node.children.length;
        }
        return result;
    }
    getSceneTemplate(name) {
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
exports.SceneTools = SceneTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUM7QUFFN0MsTUFBYSxVQUFVO0lBRW5CLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLDJDQUEyQztnQkFDeEQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSw0QkFBNEIsRUFBRTt3QkFDdkUsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxpQ0FBaUMsRUFBRTtxQkFDekY7aUJBQ0o7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLFdBQVcsRUFBRSxtRUFBbUU7Z0JBQ2hGLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUscURBQXFELEVBQUU7cUJBQ2pHO2lCQUNKO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsTUFBTTtnQkFDWixXQUFXLEVBQUUsNEJBQTRCO2dCQUN6QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGdEQUFnRCxFQUFFO3FCQUMxRjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUM7aUJBQ3JCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsTUFBTTtnQkFDWixXQUFXLEVBQUUsd0JBQXdCO2dCQUNy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WUFDRCxpQkFBaUI7WUFDakI7Z0JBQ0ksUUFBUSxFQUFFLGVBQWU7Z0JBQ3pCLFFBQVEsRUFBRSxLQUFLO2dCQUNmLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUU7Z0JBQzlELE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUU7Z0JBQzNELE1BQU0sRUFBRSxDQUFDO2FBQ1o7WUFDRCxlQUFlO1lBQ2Y7Z0JBQ0ksUUFBUSxFQUFFLGFBQWE7Z0JBQ3ZCLFFBQVEsRUFBRSxLQUFLO2dCQUNmLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixhQUFhLEVBQUUsQ0FBQzthQUNuQjtZQUNELHFCQUFxQjtZQUNyQjtnQkFDSSxRQUFRLEVBQUUsbUJBQW1CO2dCQUM3QixRQUFRLEVBQUUsQ0FBQztnQkFDWCxVQUFVLEVBQUUsSUFBSTtnQkFDaEIsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsY0FBYyxFQUFFLENBQUM7Z0JBQ2pCLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsV0FBVyxFQUFFLEtBQUs7Z0JBQ2xCLEtBQUssRUFBRSxJQUFJO2dCQUNYLHVCQUF1QixFQUFFLENBQUM7YUFDN0I7WUFDRCx1QkFBdUI7WUFDdkI7Z0JBQ0ksUUFBUSxFQUFFLHFCQUFxQjtnQkFDL0IsZ0JBQWdCLEVBQUUsQ0FBQzthQUN0QjtTQUNKLENBQUM7SUFDTixDQUFDO0NBQ0o7QUFuaUJELGdDQW1pQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XHJcblxyXG5jb25zdCBFWFRFTlNJT05fTkFNRSA9ICdjb2Nvcy1tY3AtZXh0ZW5zaW9uJztcclxuXHJcbmV4cG9ydCBjbGFzcyBTY2VuZVRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgY3VycmVudCBzY2VuZSBpbmZvIGFuZCBoaWVyYXJjaHkgdHJlZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWF4RGVwdGg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnTWF4IHRyZWUgZGVwdGggKGRlZmF1bHQgMyknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVDb21wb25lbnRzOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdJbmNsdWRlIGNvbXBvbmVudCBsaXN0IHBlciBub2RlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnbGlzdCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIHNjZW5lIGZpbGVzIGluIHRoZSBwcm9qZWN0LiBVc2UgZmlsdGVyIHRvIG5hcnJvdyByZXN1bHRzJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXI6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU3Vic3RyaW5nIGZpbHRlciBmb3Igc2NlbmUgbmFtZXMgKGNhc2UtaW5zZW5zaXRpdmUpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnb3BlbicsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09wZW4gYSBzY2VuZSBieSBkYjovLyBwYXRoJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ2RiOi8vIHBhdGgsIGUuZy4gZGI6Ly9hc3NldHMvc2NlbmVzL21haW4uc2NlbmUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydwYXRoJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2F2ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NhdmUgdGhlIGN1cnJlbnQgc2NlbmUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdjcmVhdGUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDcmVhdGUgYSBuZXcgc2NlbmUgYXNzZXQnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdGb2xkZXIgZGI6Ly8gcGF0aCwgZS5nLiBkYjovL2Fzc2V0cy9zY2VuZXMnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyduYW1lJywgJ3BhdGgnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzbmFwc2hvdCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NyZWF0ZSBhbiB1bmRvIHNuYXBzaG90IG9mIGN1cnJlbnQgc2NlbmUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdkaXJ0eScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NoZWNrIGlmIHRoZSBjdXJyZW50IHNjZW5lIGhhcyB1bnNhdmVkIGNoYW5nZXMnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZWxvYWQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTb2Z0IHJlbG9hZCB0aGUgY3VycmVudCBzY2VuZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2NsYXNzZXMnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdMaXN0IGFsbCByZWdpc3RlcmVkIGNvbXBvbmVudCBjbGFzc2VzLiBVc2UgZmlsdGVyIHRvIG5hcnJvdyByZXN1bHRzIChlLmcuIFwiVUlcIiwgXCJMaWdodFwiLCBcIlBoeXNpY3NcIiknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTdWJzdHJpbmcgZmlsdGVyIGZvciBjbGFzcyBuYW1lcyAoY2FzZS1pbnNlbnNpdGl2ZSknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdjbG9zZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Nsb3NlIHRoZSBjdXJyZW50IHNjZW5lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2F2ZV9hcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NhdmUgdGhlIGN1cnJlbnQgc2NlbmUgYXMgYSBuZXcgc2NlbmUgZmlsZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlYWR5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgaWYgdGhlIHNjZW5lIGVkaXRvciBpcyByZWFkeScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2JvdW5kcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCB0aGUgYm91bmRpbmcgYm94IG9mIHRoZSBjdXJyZW50IHNjZW5lIHZpZXcnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeSc6IHJldHVybiB0aGlzLnF1ZXJ5KGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdsaXN0JzogcmV0dXJuIHRoaXMubGlzdChhcmdzLmZpbHRlcik7XHJcbiAgICAgICAgICAgIGNhc2UgJ29wZW4nOiByZXR1cm4gdGhpcy5vcGVuKGFyZ3MucGF0aCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NhdmUnOiByZXR1cm4gdGhpcy5zYXZlKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6IHJldHVybiB0aGlzLmNyZWF0ZShhcmdzLm5hbWUsIGFyZ3MucGF0aCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NuYXBzaG90JzogcmV0dXJuIHRoaXMuc25hcHNob3QoKTtcclxuICAgICAgICAgICAgY2FzZSAnZGlydHknOiByZXR1cm4gdGhpcy5kaXJ0eSgpO1xyXG4gICAgICAgICAgICBjYXNlICdyZWxvYWQnOiByZXR1cm4gdGhpcy5yZWxvYWQoKTtcclxuICAgICAgICAgICAgY2FzZSAnY2xhc3Nlcyc6IHJldHVybiB0aGlzLmNsYXNzZXMoYXJncy5maWx0ZXIpO1xyXG4gICAgICAgICAgICBjYXNlICdjbG9zZSc6IHJldHVybiB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NhdmVfYXMnOiByZXR1cm4gdGhpcy5zYXZlQXMoKTtcclxuICAgICAgICAgICAgY2FzZSAncmVhZHknOiByZXR1cm4gdGhpcy5pc1JlYWR5KCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2JvdW5kcyc6IHJldHVybiB0aGlzLnF1ZXJ5Qm91bmRzKCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gc2NlbmUgdG9vbDogJHt0b29sTmFtZX1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIEltcGxlbWVudGF0aW9ucyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3QgbWF4RGVwdGggPSBhcmdzLm1heERlcHRoID8/IDM7XHJcbiAgICAgICAgY29uc3QgaW5jbHVkZUNvbXBvbmVudHMgPSBhcmdzLmluY2x1ZGVDb21wb25lbnRzID8/IGZhbHNlO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBQcmltYXJ5OiBFZGl0b3IgQVBJXHJcbiAgICAgICAgICAgIGNvbnN0IHRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcclxuICAgICAgICAgICAgaWYgKHRyZWUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeSA9IHRoaXMuYnVpbGRIaWVyYXJjaHkodHJlZSwgaW5jbHVkZUNvbXBvbmVudHMsIDAsIG1heERlcHRoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGhpZXJhcmNoeSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBzY2VuZSBzY3JpcHRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldFNjZW5lSGllcmFyY2h5JyxcclxuICAgICAgICAgICAgICAgIGFyZ3M6IFtpbmNsdWRlQ29tcG9uZW50cywgbWF4RGVwdGhdLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHNjZW5lIGRhdGEgcmV0dXJuZWQnIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3QoZmlsdGVyPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBhc3NldHM6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHsgcGF0dGVybjogJ2RiOi8vYXNzZXRzLyoqLyouc2NlbmUnIH0pO1xyXG4gICAgICAgICAgICBpZiAoIWFzc2V0cyB8fCAhQXJyYXkuaXNBcnJheShhc3NldHMpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBbXSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBzY2VuZXMgPSBhc3NldHMubWFwKChhOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBhLm5hbWUgfHwgYS51cmw/LnNwbGl0KCcvJykucG9wKCk/LnJlcGxhY2UoJy5zY2VuZScsICcnKSxcclxuICAgICAgICAgICAgICAgIHV1aWQ6IGEudXVpZCxcclxuICAgICAgICAgICAgICAgIHVybDogYS51cmwgfHwgYS5wYXRoLFxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvd2VyRmlsdGVyID0gZmlsdGVyLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICBzY2VuZXMgPSBzY2VuZXMuZmlsdGVyKChzOiBhbnkpID0+IHMubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyRmlsdGVyKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc2NlbmVzIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG9wZW4ocGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBHZXQgVVVJRCBmcm9tIHBhdGggZmlyc3RcclxuICAgICAgICAgICAgY29uc3QgdXVpZDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIHBhdGgpO1xyXG4gICAgICAgICAgICBpZiAoIXV1aWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFNjZW5lIG5vdCBmb3VuZDogJHtwYXRofWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdvcGVuLXNjZW5lJywgdXVpZCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBPcGVuZWQgc2NlbmU6ICR7cGF0aH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNhdmUoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzYXZlLXNjZW5lJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdTY2VuZSBzYXZlZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlKG5hbWU6IHN0cmluZywgZm9sZGVyUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZVBhdGggPSBgJHtmb2xkZXJQYXRofS8ke25hbWV9LnNjZW5lYDtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmVKc29uID0gSlNPTi5zdHJpbmdpZnkodGhpcy5nZXRTY2VuZVRlbXBsYXRlKG5hbWUpKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjcmVhdGUtYXNzZXQnLCBzY2VuZVBhdGgsIHNjZW5lSnNvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiByZXN1bHQ/LnV1aWQsIHVybDogc2NlbmVQYXRoIH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2NlbmUgY3JlYXRlZDogJHtzY2VuZVBhdGh9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc25hcHNob3QoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzbmFwc2hvdCcpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnVW5kbyBzbmFwc2hvdCBjcmVhdGVkJyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBkaXJ0eSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzRGlydHk6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWRpcnR5Jyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgZGlydHk6ICEhaXNEaXJ0eSB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlbG9hZCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NvZnQtcmVsb2FkJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdTY2VuZSByZWxvYWRlZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY2xhc3NlcyhmaWx0ZXI/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzZXM6IGFueVtdID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncXVlcnktY2xhc3NlcycpO1xyXG4gICAgICAgICAgICBpZiAoIWZpbHRlcikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogY2xhc3Nlcy5tYXAoKGM6IGFueSkgPT4gYy5uYW1lIHx8IGMpIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgbG93ZXJGaWx0ZXIgPSBmaWx0ZXIudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgY29uc3QgZmlsdGVyZWQgPSBjbGFzc2VzXHJcbiAgICAgICAgICAgICAgICAubWFwKChjOiBhbnkpID0+IGMubmFtZSB8fCBjKVxyXG4gICAgICAgICAgICAgICAgLmZpbHRlcigobmFtZTogc3RyaW5nKSA9PiBuYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJGaWx0ZXIpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogZmlsdGVyZWQgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY2xvc2UoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ2Nsb3NlLXNjZW5lJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgY2xvc2VkOiAhIXJlc3VsdCB9LCBtZXNzYWdlOiAnU2NlbmUgY2xvc2VkJyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlQXMoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3NhdmUtYXMtc2NlbmUnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBzYXZlZFBhdGg6IHJlc3VsdCB9LCBtZXNzYWdlOiByZXN1bHQgPyBgU2NlbmUgc2F2ZWQgYXM6ICR7cmVzdWx0fWAgOiAnU2F2ZSBhcyBjYW5jZWxsZWQnIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGlzUmVhZHkoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZWFkeTogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncXVlcnktaXMtcmVhZHknKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyByZWFkeTogISFyZWFkeSB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5Qm91bmRzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgYm91bmRzOiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdzY2VuZScsICdxdWVyeS1zY2VuZS1ib3VuZHMnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogYm91bmRzIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSGVscGVycyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGJ1aWxkSGllcmFyY2h5KG5vZGU6IGFueSwgaW5jbHVkZUNvbXBvbmVudHM6IGJvb2xlYW4sIGRlcHRoOiBudW1iZXIsIG1heERlcHRoOiBudW1iZXIpOiBhbnkge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0ge1xyXG4gICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSAhPT0gZmFsc2UsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKGluY2x1ZGVDb21wb25lbnRzICYmIG5vZGUuX19jb21wc19fKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdC5jb21wb25lbnRzID0gbm9kZS5fX2NvbXBzX18ubWFwKChjOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICB0eXBlOiBjLl9fdHlwZV9fIHx8IGMuY2lkIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGMuZW5hYmxlZCAhPT0gZmFsc2UsXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChkZXB0aCA8IG1heERlcHRoICYmIG5vZGUuY2hpbGRyZW4gJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdC5jaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PlxyXG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZEhpZXJhcmNoeShjaGlsZCwgaW5jbHVkZUNvbXBvbmVudHMsIGRlcHRoICsgMSwgbWF4RGVwdGgpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChub2RlLmNoaWxkcmVuICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByZXN1bHQuY2hpbGRDb3VudCA9IG5vZGUuY2hpbGRyZW4ubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldFNjZW5lVGVtcGxhdGUobmFtZTogc3RyaW5nKTogYW55W10ge1xyXG4gICAgICAgIC8vIFRlbXBsYXRlIGJhc2VkIG9uIENvY29zIENyZWF0b3IgMy44LjQgZGVmYXVsdCAyRCBzY2VuZSBzdHJ1Y3R1cmUuXHJcbiAgICAgICAgLy8gSURzOiAwPVNjZW5lQXNzZXQsIDE9U2NlbmUsIDI9Q2FudmFzLCAzPUNhbWVyYSwgND1VSVRyYW5zZm9ybSxcclxuICAgICAgICAvLyAgICAgIDU9Q2FudmFzIGNvbXAsIDY9V2lkZ2V0LCA3PUNhbWVyYSBjb21wLCA4PVNjZW5lR2xvYmFscyxcclxuICAgICAgICAvLyAgICAgIDktMTY9R2xvYmFscyBzdWItb2JqZWN0c1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIC8vIDA6IFNjZW5lQXNzZXRcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5TY2VuZUFzc2V0JyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBfbmF0aXZlOiAnJyxcclxuICAgICAgICAgICAgICAgIHNjZW5lOiB7IF9faWRfXzogMSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyAxOiBTY2VuZSByb290XHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuU2NlbmUnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6IG5hbWUsXHJcbiAgICAgICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXHJcbiAgICAgICAgICAgICAgICBfX2VkaXRvckV4dHJhc19fOiB7fSxcclxuICAgICAgICAgICAgICAgIF9wYXJlbnQ6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfY2hpbGRyZW46IFt7IF9faWRfXzogMiB9XSxcclxuICAgICAgICAgICAgICAgIF9hY3RpdmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfY29tcG9uZW50czogW10sXHJcbiAgICAgICAgICAgICAgICBfcHJlZmFiOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2xwb3M6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogMCwgeTogMCwgejogMCB9LFxyXG4gICAgICAgICAgICAgICAgX2xyb3Q6IHsgX190eXBlX186ICdjYy5RdWF0JywgeDogMCwgeTogMCwgejogMCwgdzogMSB9LFxyXG4gICAgICAgICAgICAgICAgX2xzY2FsZTogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAxLCB5OiAxLCB6OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfbW9iaWxpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICBfbGF5ZXI6IDEwNzM3NDE4MjQsXHJcbiAgICAgICAgICAgICAgICBfZXVsZXI6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogMCwgeTogMCwgejogMCB9LFxyXG4gICAgICAgICAgICAgICAgYXV0b1JlbGVhc2VBc3NldHM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgX2dsb2JhbHM6IHsgX19pZF9fOiA4IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDI6IENhbnZhcyBub2RlXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuTm9kZScsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogJ0NhbnZhcycsXHJcbiAgICAgICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXHJcbiAgICAgICAgICAgICAgICBfX2VkaXRvckV4dHJhc19fOiB7fSxcclxuICAgICAgICAgICAgICAgIF9wYXJlbnQ6IHsgX19pZF9fOiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfY2hpbGRyZW46IFt7IF9faWRfXzogMyB9XSxcclxuICAgICAgICAgICAgICAgIF9hY3RpdmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfY29tcG9uZW50czogW3sgX19pZF9fOiA0IH0sIHsgX19pZF9fOiA1IH0sIHsgX19pZF9fOiA2IH1dLFxyXG4gICAgICAgICAgICAgICAgX3ByZWZhYjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9scG9zOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDY0MCwgeTogMzYwLCB6OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBfbHJvdDogeyBfX3R5cGVfXzogJ2NjLlF1YXQnLCB4OiAwLCB5OiAwLCB6OiAwLCB3OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfbHNjYWxlOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDEsIHk6IDEsIHo6IDEgfSxcclxuICAgICAgICAgICAgICAgIF9tb2JpbGl0eTogMCxcclxuICAgICAgICAgICAgICAgIF9sYXllcjogMzM1NTQ0MzIsXHJcbiAgICAgICAgICAgICAgICBfZXVsZXI6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogMCwgeTogMCwgejogMCB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyAzOiBDYW1lcmEgbm9kZVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLk5vZGUnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICdDYW1lcmEnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBfcGFyZW50OiB7IF9faWRfXzogMiB9LFxyXG4gICAgICAgICAgICAgICAgX2NoaWxkcmVuOiBbXSxcclxuICAgICAgICAgICAgICAgIF9hY3RpdmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfY29tcG9uZW50czogW3sgX19pZF9fOiA3IH1dLFxyXG4gICAgICAgICAgICAgICAgX3ByZWZhYjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9scG9zOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDEwMDAgfSxcclxuICAgICAgICAgICAgICAgIF9scm90OiB7IF9fdHlwZV9fOiAnY2MuUXVhdCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDEgfSxcclxuICAgICAgICAgICAgICAgIF9sc2NhbGU6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogMSwgeTogMSwgejogMSB9LFxyXG4gICAgICAgICAgICAgICAgX21vYmlsaXR5OiAwLFxyXG4gICAgICAgICAgICAgICAgX2xheWVyOiAxMDczNzQxODI0LFxyXG4gICAgICAgICAgICAgICAgX2V1bGVyOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gNDogVUlUcmFuc2Zvcm0gb24gQ2FudmFzXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuVUlUcmFuc2Zvcm0nLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICcnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBub2RlOiB7IF9faWRfXzogMiB9LFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfY29udGVudFNpemU6IHsgX190eXBlX186ICdjYy5TaXplJywgd2lkdGg6IDEyODAsIGhlaWdodDogNzIwIH0sXHJcbiAgICAgICAgICAgICAgICBfYW5jaG9yUG9pbnQ6IHsgX190eXBlX186ICdjYy5WZWMyJywgeDogMC41LCB5OiAwLjUgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gNTogQ2FudmFzIGNvbXBvbmVudFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLkNhbnZhcycsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogJycsXHJcbiAgICAgICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXHJcbiAgICAgICAgICAgICAgICBfX2VkaXRvckV4dHJhc19fOiB7fSxcclxuICAgICAgICAgICAgICAgIG5vZGU6IHsgX19pZF9fOiAyIH0sXHJcbiAgICAgICAgICAgICAgICBfZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9jYW1lcmFDb21wb25lbnQ6IHsgX19pZF9fOiA3IH0sXHJcbiAgICAgICAgICAgICAgICBfYWxpZ25DYW52YXNXaXRoU2NyZWVuOiB0cnVlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyA2OiBXaWRnZXQgb24gQ2FudmFzXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuV2lkZ2V0JyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiAnJyxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgbm9kZTogeyBfX2lkX186IDIgfSxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2FsaWduRmxhZ3M6IDQ1LFxyXG4gICAgICAgICAgICAgICAgX2xlZnQ6IDAsXHJcbiAgICAgICAgICAgICAgICBfcmlnaHQ6IDAsXHJcbiAgICAgICAgICAgICAgICBfdG9wOiAwLFxyXG4gICAgICAgICAgICAgICAgX2JvdHRvbTogMCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gNzogQ2FtZXJhIGNvbXBvbmVudFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLkNhbWVyYScsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogJycsXHJcbiAgICAgICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXHJcbiAgICAgICAgICAgICAgICBfX2VkaXRvckV4dHJhc19fOiB7fSxcclxuICAgICAgICAgICAgICAgIG5vZGU6IHsgX19pZF9fOiAzIH0sXHJcbiAgICAgICAgICAgICAgICBfZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9wcm9qZWN0aW9uOiAwLFxyXG4gICAgICAgICAgICAgICAgX3ByaW9yaXR5OiAxMDczNzQxODI0LFxyXG4gICAgICAgICAgICAgICAgX2ZvdjogNDUsXHJcbiAgICAgICAgICAgICAgICBfZm92QXhpczogMCxcclxuICAgICAgICAgICAgICAgIF9vcnRob0hlaWdodDogMzYwLFxyXG4gICAgICAgICAgICAgICAgX25lYXI6IDAsXHJcbiAgICAgICAgICAgICAgICBfZmFyOiAyMDAwLFxyXG4gICAgICAgICAgICAgICAgX2NvbG9yOiB7IF9fdHlwZV9fOiAnY2MuQ29sb3InLCByOiAwLCBnOiAwLCBiOiAwLCBhOiAyNTUgfSxcclxuICAgICAgICAgICAgICAgIF9kZXB0aDogMSxcclxuICAgICAgICAgICAgICAgIF9zdGVuY2lsOiAwLFxyXG4gICAgICAgICAgICAgICAgX2NsZWFyRmxhZ3M6IDYsXHJcbiAgICAgICAgICAgICAgICBfcmVjdDogeyBfX3R5cGVfXzogJ2NjLlJlY3QnLCB4OiAwLCB5OiAwLCB3aWR0aDogMSwgaGVpZ2h0OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfdmlzaWJpbGl0eTogNDE5NDMwNDAsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDg6IFNjZW5lR2xvYmFsc1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlNjZW5lR2xvYmFscycsXHJcbiAgICAgICAgICAgICAgICBhbWJpZW50OiB7IF9faWRfXzogOSB9LFxyXG4gICAgICAgICAgICAgICAgc2hhZG93czogeyBfX2lkX186IDEwIH0sXHJcbiAgICAgICAgICAgICAgICBfc2t5Ym94OiB7IF9faWRfXzogMTEgfSxcclxuICAgICAgICAgICAgICAgIGZvZzogeyBfX2lkX186IDEyIH0sXHJcbiAgICAgICAgICAgICAgICBvY3RyZWU6IHsgX19pZF9fOiAxMyB9LFxyXG4gICAgICAgICAgICAgICAgc2tpbjogeyBfX2lkX186IDE0IH0sXHJcbiAgICAgICAgICAgICAgICBsaWdodFByb2JlSW5mbzogeyBfX2lkX186IDE1IH0sXHJcbiAgICAgICAgICAgICAgICBwb3N0U2V0dGluZ3M6IHsgX19pZF9fOiAxNiB9LFxyXG4gICAgICAgICAgICAgICAgYmFrZWRXaXRoU3RhdGlvbmFyeU1haW5MaWdodDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBiYWtlZFdpdGhIaWdocExpZ2h0bWFwOiBmYWxzZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gOTogQW1iaWVudEluZm9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5BbWJpZW50SW5mbycsXHJcbiAgICAgICAgICAgICAgICBfc2t5Q29sb3JIRFI6IHsgX190eXBlX186ICdjYy5WZWM0JywgeDogMCwgeTogMCwgejogMCwgdzogMC41MjA4MzMxMjUgfSxcclxuICAgICAgICAgICAgICAgIF9za3lDb2xvcjogeyBfX3R5cGVfXzogJ2NjLlZlYzQnLCB4OiAwLCB5OiAwLCB6OiAwLCB3OiAwLjUyMDgzMzEyNSB9LFxyXG4gICAgICAgICAgICAgICAgX3NreUlsbHVtSERSOiAyMDAwMCxcclxuICAgICAgICAgICAgICAgIF9za3lJbGx1bTogMjAwMDAsXHJcbiAgICAgICAgICAgICAgICBfZ3JvdW5kQWxiZWRvSERSOiB7IF9fdHlwZV9fOiAnY2MuVmVjNCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDAgfSxcclxuICAgICAgICAgICAgICAgIF9ncm91bmRBbGJlZG86IHsgX190eXBlX186ICdjYy5WZWM0JywgeDogMCwgeTogMCwgejogMCwgdzogMCB9LFxyXG4gICAgICAgICAgICAgICAgX3NreUNvbG9yTERSOiB7IF9fdHlwZV9fOiAnY2MuVmVjNCcsIHg6IDAuMiwgeTogMC41LCB6OiAwLjgsIHc6IDEgfSxcclxuICAgICAgICAgICAgICAgIF9za3lJbGx1bUxEUjogMjAwMDAsXHJcbiAgICAgICAgICAgICAgICBfZ3JvdW5kQWxiZWRvTERSOiB7IF9fdHlwZV9fOiAnY2MuVmVjNCcsIHg6IDAuMiwgeTogMC4yLCB6OiAwLjIsIHc6IDEgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTA6IFNoYWRvd3NJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuU2hhZG93c0luZm8nLFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgX3R5cGU6IDAsXHJcbiAgICAgICAgICAgICAgICBfbm9ybWFsOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDEsIHo6IDAgfSxcclxuICAgICAgICAgICAgICAgIF9kaXN0YW5jZTogMCxcclxuICAgICAgICAgICAgICAgIF9wbGFuZUJpYXM6IDEsXHJcbiAgICAgICAgICAgICAgICBfc2hhZG93Q29sb3I6IHsgX190eXBlX186ICdjYy5Db2xvcicsIHI6IDc2LCBnOiA3NiwgYjogNzYsIGE6IDI1NSB9LFxyXG4gICAgICAgICAgICAgICAgX21heFJlY2VpdmVkOiA0LFxyXG4gICAgICAgICAgICAgICAgX3NpemU6IHsgX190eXBlX186ICdjYy5WZWMyJywgeDogNTEyLCB5OiA1MTIgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTE6IFNreWJveEluZm9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5Ta3lib3hJbmZvJyxcclxuICAgICAgICAgICAgICAgIF9lbnZMaWdodGluZ1R5cGU6IDAsXHJcbiAgICAgICAgICAgICAgICBfZW52bWFwSERSOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2Vudm1hcDogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9lbnZtYXBMRFI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfZGlmZnVzZU1hcEhEUjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9kaWZmdXNlTWFwTERSOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgX3VzZUhEUjogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9lZGl0YWJsZU1hdGVyaWFsOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX3JlZmxlY3Rpb25IRFI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfcmVmbGVjdGlvbkxEUjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9yb3RhdGlvbkFuZ2xlOiAwLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyAxMjogRm9nSW5mb1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLkZvZ0luZm8nLFxyXG4gICAgICAgICAgICAgICAgX3R5cGU6IDAsXHJcbiAgICAgICAgICAgICAgICBfZm9nQ29sb3I6IHsgX190eXBlX186ICdjYy5Db2xvcicsIHI6IDIwMCwgZzogMjAwLCBiOiAyMDAsIGE6IDI1NSB9LFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgX2ZvZ0RlbnNpdHk6IDAuMyxcclxuICAgICAgICAgICAgICAgIF9mb2dTdGFydDogMC41LFxyXG4gICAgICAgICAgICAgICAgX2ZvZ0VuZDogMzAwLFxyXG4gICAgICAgICAgICAgICAgX2ZvZ0F0dGVuOiA1LFxyXG4gICAgICAgICAgICAgICAgX2ZvZ1RvcDogMS41LFxyXG4gICAgICAgICAgICAgICAgX2ZvZ1JhbmdlOiAxLjIsXHJcbiAgICAgICAgICAgICAgICBfYWNjdXJhdGU6IGZhbHNlLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyAxMzogT2N0cmVlSW5mb1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLk9jdHJlZUluZm8nLFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgX21pblBvczogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAtMTAyNCwgeTogLTEwMjQsIHo6IC0xMDI0IH0sXHJcbiAgICAgICAgICAgICAgICBfbWF4UG9zOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDEwMjQsIHk6IDEwMjQsIHo6IDEwMjQgfSxcclxuICAgICAgICAgICAgICAgIF9kZXB0aDogOCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTQ6IFNraW5JbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuU2tpbkluZm8nLFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgX2JsdXJSYWRpdXM6IDAuMDEsXHJcbiAgICAgICAgICAgICAgICBfc3NzSW50ZW5zaXR5OiAzLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyAxNTogTGlnaHRQcm9iZUluZm9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5MaWdodFByb2JlSW5mbycsXHJcbiAgICAgICAgICAgICAgICBfZ2lTY2FsZTogMSxcclxuICAgICAgICAgICAgICAgIF9naVNhbXBsZXM6IDEwMjQsXHJcbiAgICAgICAgICAgICAgICBfYm91bmNlczogMixcclxuICAgICAgICAgICAgICAgIF9yZWR1Y2VSaW5naW5nOiAwLFxyXG4gICAgICAgICAgICAgICAgX3Nob3dQcm9iZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9zaG93V2lyZWZyYW1lOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX3Nob3dDb252ZXg6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgX2RhdGE6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfbGlnaHRQcm9iZVNwaGVyZVZvbHVtZTogMSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTY6IFBvc3RTZXR0aW5nc0luZm9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5Qb3N0U2V0dGluZ3NJbmZvJyxcclxuICAgICAgICAgICAgICAgIF90b25lTWFwcGluZ1R5cGU6IDAsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxufVxyXG4iXX0=