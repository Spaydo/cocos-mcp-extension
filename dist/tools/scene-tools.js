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
                description: 'List all registered component classes',
                inputSchema: { type: 'object', properties: {} },
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
            case 'list': return this.list();
            case 'open': return this.open(args.path);
            case 'save': return this.save();
            case 'create': return this.create(args.name, args.path);
            case 'snapshot': return this.snapshot();
            case 'dirty': return this.dirty();
            case 'reload': return this.reload();
            case 'classes': return this.classes();
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
    async list() {
        try {
            const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: 'db://assets/**/*.scene' });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: [] };
            }
            const scenes = assets.map((a) => {
                var _a, _b;
                return ({
                    name: a.name || ((_b = (_a = a.url) === null || _a === void 0 ? void 0 : _a.split('/').pop()) === null || _b === void 0 ? void 0 : _b.replace('.scene', '')),
                    uuid: a.uuid,
                    url: a.url || a.path,
                });
            });
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
    async classes() {
        try {
            const classes = await Editor.Message.request('scene', 'query-classes');
            return { success: true, data: classes };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUM7QUFFN0MsTUFBYSxVQUFVO0lBRW5CLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLDJDQUEyQztnQkFDeEQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSw0QkFBNEIsRUFBRTt3QkFDdkUsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxpQ0FBaUMsRUFBRTtxQkFDekY7aUJBQ0o7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLFdBQVcsRUFBRSxxQ0FBcUM7Z0JBQ2xELFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRTthQUNsRDtZQUNEO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLFdBQVcsRUFBRSw0QkFBNEI7Z0JBQ3pDLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsZ0RBQWdELEVBQUU7cUJBQzFGO29CQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQztpQkFDckI7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLFdBQVcsRUFBRSx3QkFBd0I7Z0JBQ3JDLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRTthQUNsRDtZQUNEO2dCQUNJLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSwwQkFBMEI7Z0JBQ3ZDLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDeEIsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsNENBQTRDLEVBQUU7cUJBQ3RGO29CQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7aUJBQzdCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsVUFBVTtnQkFDaEIsV0FBVyxFQUFFLDBDQUEwQztnQkFDdkQsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFO2FBQ2xEO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLGdEQUFnRDtnQkFDN0QsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFO2FBQ2xEO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLCtCQUErQjtnQkFDNUMsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFO2FBQ2xEO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsV0FBVyxFQUFFLHVDQUF1QztnQkFDcEQsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFO2FBQ2xEO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLHlCQUF5QjtnQkFDdEMsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFO2FBQ2xEO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsV0FBVyxFQUFFLDRDQUE0QztnQkFDekQsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFO2FBQ2xEO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLG9DQUFvQztnQkFDakQsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFO2FBQ2xEO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLGdEQUFnRDtnQkFDN0QsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFO2FBQ2xEO1NBQ0osQ0FBQztJQUNOLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQWdCLEVBQUUsSUFBUztRQUNyQyxRQUFRLFFBQVEsRUFBRSxDQUFDO1lBQ2YsS0FBSyxPQUFPLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEMsS0FBSyxNQUFNLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQyxLQUFLLE1BQU0sQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekMsS0FBSyxNQUFNLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN4RCxLQUFLLFVBQVUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3hDLEtBQUssT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbEMsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RDLEtBQUssT0FBTyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbEMsS0FBSyxTQUFTLENBQUMsQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyQyxLQUFLLE9BQU8sQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3BDLEtBQUssUUFBUSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDekMsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQ2pGLENBQUM7SUFDTCxDQUFDO0lBRUQsK0JBQStCO0lBRXZCLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBUzs7UUFDekIsTUFBTSxRQUFRLEdBQUcsTUFBQSxJQUFJLENBQUMsUUFBUSxtQ0FBSSxDQUFDLENBQUM7UUFDcEMsTUFBTSxpQkFBaUIsR0FBRyxNQUFBLElBQUksQ0FBQyxpQkFBaUIsbUNBQUksS0FBSyxDQUFDO1FBRTFELElBQUksQ0FBQztZQUNELHNCQUFzQjtZQUN0QixNQUFNLElBQUksR0FBRyxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3RFLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1AsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDOUMsQ0FBQztRQUNMLENBQUM7UUFBQyxXQUFNLENBQUM7WUFDTCx5QkFBeUI7UUFDN0IsQ0FBQztRQUVELElBQUksQ0FBQztZQUNELE1BQU0sTUFBTSxHQUFRLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLHNCQUFzQixFQUFFO2dCQUM5RSxJQUFJLEVBQUUsY0FBYztnQkFDcEIsTUFBTSxFQUFFLG1CQUFtQjtnQkFDM0IsSUFBSSxFQUFFLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxDQUFDO2FBQ3RDLENBQUMsQ0FBQztZQUNILE9BQU8sTUFBTSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQztRQUN6RSxDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLElBQUk7UUFDZCxJQUFJLENBQUM7WUFDRCxNQUFNLE1BQU0sR0FBUSxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxjQUFjLEVBQUUsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1lBQ3BILElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUN2QyxDQUFDO1lBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFOztnQkFBQyxPQUFBLENBQUM7b0JBQ25DLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFJLE1BQUEsTUFBQSxDQUFDLENBQUMsR0FBRywwQ0FBRSxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSwwQ0FBRSxPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO29CQUM5RCxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7b0JBQ1osR0FBRyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUk7aUJBQ3ZCLENBQUMsQ0FBQTthQUFBLENBQUMsQ0FBQztZQUNKLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUMzQyxDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFZO1FBQzNCLElBQUksQ0FBQztZQUNELDJCQUEyQjtZQUMzQixNQUFNLElBQUksR0FBUSxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDL0UsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNSLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxvQkFBb0IsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNqRSxDQUFDO1lBQ0QsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUMvRCxDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLElBQUk7UUFDZCxJQUFJLENBQUM7WUFDRCxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLENBQUM7UUFDckQsQ0FBQztRQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7WUFDaEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRCxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBWSxFQUFFLFVBQWtCO1FBQ2pELElBQUksQ0FBQztZQUNELE1BQU0sU0FBUyxHQUFHLEdBQUcsVUFBVSxJQUFJLElBQUksUUFBUSxDQUFDO1lBQ2hELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDOUQsTUFBTSxNQUFNLEdBQVEsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsY0FBYyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNuRyxPQUFPO2dCQUNILE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLGFBQU4sTUFBTSx1QkFBTixNQUFNLENBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUU7Z0JBQzVDLE9BQU8sRUFBRSxrQkFBa0IsU0FBUyxFQUFFO2FBQ3pDLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLFFBQVE7UUFDbEIsSUFBSSxDQUFDO1lBQ0QsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDbEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLENBQUM7UUFDL0QsQ0FBQztRQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7WUFDaEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRCxDQUFDO0lBQ0wsQ0FBQztJQUVPLEtBQUssQ0FBQyxLQUFLO1FBQ2YsSUFBSSxDQUFDO1lBQ0QsTUFBTSxPQUFPLEdBQVEsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1FBQ3pELENBQUM7UUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsTUFBTTtRQUNoQixJQUFJLENBQUM7WUFDRCxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQztZQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQztRQUN4RCxDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU87UUFDakIsSUFBSSxDQUFDO1lBQ0QsTUFBTSxPQUFPLEdBQVEsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsZUFBZSxDQUFDLENBQUM7WUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxDQUFDO1FBQzVDLENBQUM7UUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsS0FBSztRQUNmLElBQUksQ0FBQztZQUNELE1BQU0sTUFBTSxHQUFRLE1BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFlLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ2xGLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxDQUFDO1FBQ2xGLENBQUM7UUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsTUFBTTtRQUNoQixJQUFJLENBQUM7WUFDRCxNQUFNLE1BQU0sR0FBUSxNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztZQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsbUJBQW1CLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQy9ILENBQUM7UUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNMLENBQUM7SUFFTyxLQUFLLENBQUMsT0FBTztRQUNqQixJQUFJLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBUSxNQUFPLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBZSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQztRQUN2RCxDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLFdBQVc7UUFDckIsSUFBSSxDQUFDO1lBQ0QsTUFBTSxNQUFNLEdBQVEsTUFBTyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQWUsQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDM0MsQ0FBQztRQUFDLE9BQU8sR0FBUSxFQUFFLENBQUM7WUFDaEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRCxDQUFDO0lBQ0wsQ0FBQztJQUVELGtCQUFrQjtJQUVWLGNBQWMsQ0FBQyxJQUFTLEVBQUUsaUJBQTBCLEVBQUUsS0FBYSxFQUFFLFFBQWdCO1FBQ3pGLE1BQU0sTUFBTSxHQUFRO1lBQ2hCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUs7U0FDaEMsQ0FBQztRQUVGLElBQUksaUJBQWlCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ2hELElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksU0FBUztnQkFDdEMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLEtBQUssS0FBSzthQUMvQixDQUFDLENBQUMsQ0FBQztRQUNSLENBQUM7UUFFRCxJQUFJLEtBQUssR0FBRyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNoRSxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUUsQ0FDL0MsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FDckUsQ0FBQztRQUNOLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbkQsTUFBTSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUM3QyxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUM7SUFDbEIsQ0FBQztJQUVPLGdCQUFnQixDQUFDLElBQVk7UUFDakMsb0VBQW9FO1FBQ3BFLGlFQUFpRTtRQUNqRSwrREFBK0Q7UUFDL0QsZ0NBQWdDO1FBQ2hDLE9BQU87WUFDSCxnQkFBZ0I7WUFDaEI7Z0JBQ0ksUUFBUSxFQUFFLGVBQWU7Z0JBQ3pCLEtBQUssRUFBRSxJQUFJO2dCQUNYLFNBQVMsRUFBRSxDQUFDO2dCQUNaLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLE9BQU8sRUFBRSxFQUFFO2dCQUNYLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7YUFDdkI7WUFDRCxnQkFBZ0I7WUFDaEI7Z0JBQ0ksUUFBUSxFQUFFLFVBQVU7Z0JBQ3BCLEtBQUssRUFBRSxJQUFJO2dCQUNYLFNBQVMsRUFBRSxDQUFDO2dCQUNaLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUMxQixPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUUsRUFBRTtnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixLQUFLLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNoRCxLQUFLLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3RELE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ2xELFNBQVMsRUFBRSxDQUFDO2dCQUNaLE1BQU0sRUFBRSxVQUFVO2dCQUNsQixNQUFNLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNqRCxpQkFBaUIsRUFBRSxLQUFLO2dCQUN4QixRQUFRLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2FBQzFCO1lBQ0QsaUJBQWlCO1lBQ2pCO2dCQUNJLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixLQUFLLEVBQUUsUUFBUTtnQkFDZixTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxFQUFFO2dCQUNwQixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2dCQUN0QixTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQzFELE9BQU8sRUFBRSxJQUFJO2dCQUNiLEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3BELEtBQUssRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDdEQsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDbEQsU0FBUyxFQUFFLENBQUM7Z0JBQ1osTUFBTSxFQUFFLFFBQVE7Z0JBQ2hCLE1BQU0sRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7YUFDcEQ7WUFDRCxpQkFBaUI7WUFDakI7Z0JBQ0ksUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLEtBQUssRUFBRSxRQUFRO2dCQUNmLFNBQVMsRUFBRSxDQUFDO2dCQUNaLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQ3RCLFNBQVMsRUFBRSxFQUFFO2dCQUNiLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFdBQVcsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUM1QixPQUFPLEVBQUUsSUFBSTtnQkFDYixLQUFLLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFO2dCQUNuRCxLQUFLLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ3RELE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ2xELFNBQVMsRUFBRSxDQUFDO2dCQUNaLE1BQU0sRUFBRSxVQUFVO2dCQUNsQixNQUFNLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2FBQ3BEO1lBQ0QsMkJBQTJCO1lBQzNCO2dCQUNJLFFBQVEsRUFBRSxnQkFBZ0I7Z0JBQzFCLEtBQUssRUFBRSxFQUFFO2dCQUNULFNBQVMsRUFBRSxDQUFDO2dCQUNaLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLElBQUksRUFBRSxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUU7Z0JBQ25CLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO2dCQUMvRCxZQUFZLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTthQUN4RDtZQUNELHNCQUFzQjtZQUN0QjtnQkFDSSxRQUFRLEVBQUUsV0FBVztnQkFDckIsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsRUFBRTtnQkFDcEIsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRTtnQkFDbkIsUUFBUSxFQUFFLElBQUk7Z0JBQ2QsZ0JBQWdCLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2dCQUMvQixzQkFBc0IsRUFBRSxJQUFJO2FBQy9CO1lBQ0Qsc0JBQXNCO1lBQ3RCO2dCQUNJLFFBQVEsRUFBRSxXQUFXO2dCQUNyQixLQUFLLEVBQUUsRUFBRTtnQkFDVCxTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxFQUFFO2dCQUNwQixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2dCQUNuQixRQUFRLEVBQUUsSUFBSTtnQkFDZCxXQUFXLEVBQUUsRUFBRTtnQkFDZixLQUFLLEVBQUUsQ0FBQztnQkFDUixNQUFNLEVBQUUsQ0FBQztnQkFDVCxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsQ0FBQzthQUNiO1lBQ0Qsc0JBQXNCO1lBQ3RCO2dCQUNJLFFBQVEsRUFBRSxXQUFXO2dCQUNyQixLQUFLLEVBQUUsRUFBRTtnQkFDVCxTQUFTLEVBQUUsQ0FBQztnQkFDWixnQkFBZ0IsRUFBRSxFQUFFO2dCQUNwQixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2dCQUNuQixRQUFRLEVBQUUsSUFBSTtnQkFDZCxXQUFXLEVBQUUsQ0FBQztnQkFDZCxTQUFTLEVBQUUsVUFBVTtnQkFDckIsSUFBSSxFQUFFLEVBQUU7Z0JBQ1IsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsWUFBWSxFQUFFLEdBQUc7Z0JBQ2pCLEtBQUssRUFBRSxDQUFDO2dCQUNSLElBQUksRUFBRSxJQUFJO2dCQUNWLE1BQU0sRUFBRSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDMUQsTUFBTSxFQUFFLENBQUM7Z0JBQ1QsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsV0FBVyxFQUFFLENBQUM7Z0JBQ2QsS0FBSyxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2dCQUMvRCxXQUFXLEVBQUUsUUFBUTthQUN4QjtZQUNELGtCQUFrQjtZQUNsQjtnQkFDSSxRQUFRLEVBQUUsaUJBQWlCO2dCQUMzQixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFO2dCQUN0QixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUN2QixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUN2QixHQUFHLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUNuQixNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUN0QixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUNwQixjQUFjLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUM5QixZQUFZLEVBQUUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFO2dCQUM1Qiw0QkFBNEIsRUFBRSxLQUFLO2dCQUNuQyxzQkFBc0IsRUFBRSxLQUFLO2FBQ2hDO1lBQ0QsaUJBQWlCO1lBQ2pCO2dCQUNJLFFBQVEsRUFBRSxnQkFBZ0I7Z0JBQzFCLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRTtnQkFDdkUsU0FBUyxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsV0FBVyxFQUFFO2dCQUNwRSxZQUFZLEVBQUUsS0FBSztnQkFDbkIsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGdCQUFnQixFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUNqRSxhQUFhLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQzlELFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtnQkFDbkUsWUFBWSxFQUFFLEtBQUs7Z0JBQ25CLGdCQUFnQixFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO2FBQzFFO1lBQ0Qsa0JBQWtCO1lBQ2xCO2dCQUNJLFFBQVEsRUFBRSxnQkFBZ0I7Z0JBQzFCLFFBQVEsRUFBRSxLQUFLO2dCQUNmLEtBQUssRUFBRSxDQUFDO2dCQUNSLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUU7Z0JBQ2xELFNBQVMsRUFBRSxDQUFDO2dCQUNaLFVBQVUsRUFBRSxDQUFDO2dCQUNiLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRTtnQkFDbkUsWUFBWSxFQUFFLENBQUM7Z0JBQ2YsS0FBSyxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7YUFDakQ7WUFDRCxpQkFBaUI7WUFDakI7Z0JBQ0ksUUFBUSxFQUFFLGVBQWU7Z0JBQ3pCLGdCQUFnQixFQUFFLENBQUM7Z0JBQ25CLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixPQUFPLEVBQUUsSUFBSTtnQkFDYixVQUFVLEVBQUUsSUFBSTtnQkFDaEIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLGNBQWMsRUFBRSxJQUFJO2dCQUNwQixRQUFRLEVBQUUsS0FBSztnQkFDZixPQUFPLEVBQUUsSUFBSTtnQkFDYixpQkFBaUIsRUFBRSxJQUFJO2dCQUN2QixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLGNBQWMsRUFBRSxDQUFDO2FBQ3BCO1lBQ0QsY0FBYztZQUNkO2dCQUNJLFFBQVEsRUFBRSxZQUFZO2dCQUN0QixLQUFLLEVBQUUsQ0FBQztnQkFDUixTQUFTLEVBQUUsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUU7Z0JBQ25FLFFBQVEsRUFBRSxLQUFLO2dCQUNmLFdBQVcsRUFBRSxHQUFHO2dCQUNoQixTQUFTLEVBQUUsR0FBRztnQkFDZCxPQUFPLEVBQUUsR0FBRztnQkFDWixTQUFTLEVBQUUsQ0FBQztnQkFDWixPQUFPLEVBQUUsR0FBRztnQkFDWixTQUFTLEVBQUUsR0FBRztnQkFDZCxTQUFTLEVBQUUsS0FBSzthQUNuQjtZQUNELGlCQUFpQjtZQUNqQjtnQkFDSSxRQUFRLEVBQUUsZUFBZTtnQkFDekIsUUFBUSxFQUFFLEtBQUs7Z0JBQ2YsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRTtnQkFDOUQsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRTtnQkFDM0QsTUFBTSxFQUFFLENBQUM7YUFDWjtZQUNELGVBQWU7WUFDZjtnQkFDSSxRQUFRLEVBQUUsYUFBYTtnQkFDdkIsUUFBUSxFQUFFLEtBQUs7Z0JBQ2YsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLGFBQWEsRUFBRSxDQUFDO2FBQ25CO1lBQ0QscUJBQXFCO1lBQ3JCO2dCQUNJLFFBQVEsRUFBRSxtQkFBbUI7Z0JBQzdCLFFBQVEsRUFBRSxDQUFDO2dCQUNYLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixRQUFRLEVBQUUsQ0FBQztnQkFDWCxjQUFjLEVBQUUsQ0FBQztnQkFDakIsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLGNBQWMsRUFBRSxJQUFJO2dCQUNwQixXQUFXLEVBQUUsS0FBSztnQkFDbEIsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsdUJBQXVCLEVBQUUsQ0FBQzthQUM3QjtZQUNELHVCQUF1QjtZQUN2QjtnQkFDSSxRQUFRLEVBQUUscUJBQXFCO2dCQUMvQixnQkFBZ0IsRUFBRSxDQUFDO2FBQ3RCO1NBQ0osQ0FBQztJQUNOLENBQUM7Q0FDSjtBQTlnQkQsZ0NBOGdCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmNvbnN0IEVYVEVOU0lPTl9OQU1FID0gJ2NvY29zLW1jcC1leHRlbnNpb24nO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNjZW5lVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBjdXJyZW50IHNjZW5lIGluZm8gYW5kIGhpZXJhcmNoeSB0cmVlJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhEZXB0aDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdNYXggdHJlZSBkZXB0aCAoZGVmYXVsdCAzKScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUNvbXBvbmVudHM6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgY29tcG9uZW50IGxpc3QgcGVyIG5vZGUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsaXN0JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgc2NlbmUgZmlsZXMgaW4gdGhlIHByb2plY3QnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdvcGVuJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3BlbiBhIHNjZW5lIGJ5IGRiOi8vIHBhdGgnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnZGI6Ly8gcGF0aCwgZS5nLiBkYjovL2Fzc2V0cy9zY2VuZXMvbWFpbi5zY2VuZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3BhdGgnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzYXZlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2F2ZSB0aGUgY3VycmVudCBzY2VuZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2NyZWF0ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NyZWF0ZSBhIG5ldyBzY2VuZSBhc3NldCcsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0ZvbGRlciBkYjovLyBwYXRoLCBlLmcuIGRiOi8vYXNzZXRzL3NjZW5lcycgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25hbWUnLCAncGF0aCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NuYXBzaG90JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIGFuIHVuZG8gc25hcHNob3Qgb2YgY3VycmVudCBzY2VuZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2RpcnR5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgaWYgdGhlIGN1cnJlbnQgc2NlbmUgaGFzIHVuc2F2ZWQgY2hhbmdlcycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlbG9hZCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvZnQgcmVsb2FkIHRoZSBjdXJyZW50IHNjZW5lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY2xhc3NlcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIHJlZ2lzdGVyZWQgY29tcG9uZW50IGNsYXNzZXMnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdjbG9zZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Nsb3NlIHRoZSBjdXJyZW50IHNjZW5lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2F2ZV9hcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NhdmUgdGhlIGN1cnJlbnQgc2NlbmUgYXMgYSBuZXcgc2NlbmUgZmlsZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlYWR5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgaWYgdGhlIHNjZW5lIGVkaXRvciBpcyByZWFkeScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2JvdW5kcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCB0aGUgYm91bmRpbmcgYm94IG9mIHRoZSBjdXJyZW50IHNjZW5lIHZpZXcnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeSc6IHJldHVybiB0aGlzLnF1ZXJ5KGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdsaXN0JzogcmV0dXJuIHRoaXMubGlzdCgpO1xyXG4gICAgICAgICAgICBjYXNlICdvcGVuJzogcmV0dXJuIHRoaXMub3BlbihhcmdzLnBhdGgpO1xyXG4gICAgICAgICAgICBjYXNlICdzYXZlJzogcmV0dXJuIHRoaXMuc2F2ZSgpO1xyXG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOiByZXR1cm4gdGhpcy5jcmVhdGUoYXJncy5uYW1lLCBhcmdzLnBhdGgpO1xyXG4gICAgICAgICAgICBjYXNlICdzbmFwc2hvdCc6IHJldHVybiB0aGlzLnNuYXBzaG90KCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2RpcnR5JzogcmV0dXJuIHRoaXMuZGlydHkoKTtcclxuICAgICAgICAgICAgY2FzZSAncmVsb2FkJzogcmV0dXJuIHRoaXMucmVsb2FkKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NsYXNzZXMnOiByZXR1cm4gdGhpcy5jbGFzc2VzKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2Nsb3NlJzogcmV0dXJuIHRoaXMuY2xvc2UoKTtcclxuICAgICAgICAgICAgY2FzZSAnc2F2ZV9hcyc6IHJldHVybiB0aGlzLnNhdmVBcygpO1xyXG4gICAgICAgICAgICBjYXNlICdyZWFkeSc6IHJldHVybiB0aGlzLmlzUmVhZHkoKTtcclxuICAgICAgICAgICAgY2FzZSAnYm91bmRzJzogcmV0dXJuIHRoaXMucXVlcnlCb3VuZHMoKTtcclxuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBzY2VuZSB0b29sOiAke3Rvb2xOYW1lfWAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFRvb2wgSW1wbGVtZW50YXRpb25zID09PVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBjb25zdCBtYXhEZXB0aCA9IGFyZ3MubWF4RGVwdGggPz8gMztcclxuICAgICAgICBjb25zdCBpbmNsdWRlQ29tcG9uZW50cyA9IGFyZ3MuaW5jbHVkZUNvbXBvbmVudHMgPz8gZmFsc2U7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFByaW1hcnk6IEVkaXRvciBBUElcclxuICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xyXG4gICAgICAgICAgICBpZiAodHJlZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaGllcmFyY2h5ID0gdGhpcy5idWlsZEhpZXJhcmNoeSh0cmVlLCBpbmNsdWRlQ29tcG9uZW50cywgMCwgbWF4RGVwdGgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaGllcmFyY2h5IH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHNjZW5lIHNjcmlwdFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0U2NlbmVIaWVyYXJjaHknLFxyXG4gICAgICAgICAgICAgICAgYXJnczogW2luY2x1ZGVDb21wb25lbnRzLCBtYXhEZXB0aF0sXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gc2NlbmUgZGF0YSByZXR1cm5lZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbGlzdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0czogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuOiAnZGI6Ly9hc3NldHMvKiovKi5zY2VuZScgfSk7XHJcbiAgICAgICAgICAgIGlmICghYXNzZXRzIHx8ICFBcnJheS5pc0FycmF5KGFzc2V0cykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IFtdIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3Qgc2NlbmVzID0gYXNzZXRzLm1hcCgoYTogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogYS5uYW1lIHx8IGEudXJsPy5zcGxpdCgnLycpLnBvcCgpPy5yZXBsYWNlKCcuc2NlbmUnLCAnJyksXHJcbiAgICAgICAgICAgICAgICB1dWlkOiBhLnV1aWQsXHJcbiAgICAgICAgICAgICAgICB1cmw6IGEudXJsIHx8IGEucGF0aCxcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzY2VuZXMgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgb3BlbihwYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIEdldCBVVUlEIGZyb20gcGF0aCBmaXJzdFxyXG4gICAgICAgICAgICBjb25zdCB1dWlkOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS11dWlkJywgcGF0aCk7XHJcbiAgICAgICAgICAgIGlmICghdXVpZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgU2NlbmUgbm90IGZvdW5kOiAke3BhdGh9YCB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ29wZW4tc2NlbmUnLCB1dWlkKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYE9wZW5lZCBzY2VuZTogJHtwYXRofWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NhdmUtc2NlbmUnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ1NjZW5lIHNhdmVkJyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGUobmFtZTogc3RyaW5nLCBmb2xkZXJQYXRoOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lUGF0aCA9IGAke2ZvbGRlclBhdGh9LyR7bmFtZX0uc2NlbmVgO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZUpzb24gPSBKU09OLnN0cmluZ2lmeSh0aGlzLmdldFNjZW5lVGVtcGxhdGUobmFtZSkpO1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2NyZWF0ZS1hc3NldCcsIHNjZW5lUGF0aCwgc2NlbmVKc29uKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHV1aWQ6IHJlc3VsdD8udXVpZCwgdXJsOiBzY2VuZVBhdGggfSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTY2VuZSBjcmVhdGVkOiAke3NjZW5lUGF0aH1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzbmFwc2hvdCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NuYXBzaG90Jyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdVbmRvIHNuYXBzaG90IGNyZWF0ZWQnIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGRpcnR5KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgaXNEaXJ0eTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktZGlydHknKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBkaXJ0eTogISFpc0RpcnR5IH0gfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVsb2FkKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc29mdC1yZWxvYWQnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ1NjZW5lIHJlbG9hZGVkJyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjbGFzc2VzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2xhc3NlczogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncXVlcnktY2xhc3NlcycpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBjbGFzc2VzIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNsb3NlKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdzY2VuZScsICdjbG9zZS1zY2VuZScpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IGNsb3NlZDogISFyZXN1bHQgfSwgbWVzc2FnZTogJ1NjZW5lIGNsb3NlZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZUFzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdzY2VuZScsICdzYXZlLWFzLXNjZW5lJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgc2F2ZWRQYXRoOiByZXN1bHQgfSwgbWVzc2FnZTogcmVzdWx0ID8gYFNjZW5lIHNhdmVkIGFzOiAke3Jlc3VsdH1gIDogJ1NhdmUgYXMgY2FuY2VsbGVkJyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBpc1JlYWR5KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVhZHk6IGFueSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3F1ZXJ5LWlzLXJlYWR5Jyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgcmVhZHk6ICEhcmVhZHkgfSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUJvdW5kcygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvdW5kczogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncXVlcnktc2NlbmUtYm91bmRzJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGJvdW5kcyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IEhlbHBlcnMgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZEhpZXJhcmNoeShub2RlOiBhbnksIGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuLCBkZXB0aDogbnVtYmVyLCBtYXhEZXB0aDogbnVtYmVyKTogYW55IHtcclxuICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IHtcclxuICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUgIT09IGZhbHNlLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmIChpbmNsdWRlQ29tcG9uZW50cyAmJiBub2RlLl9fY29tcHNfXykge1xyXG4gICAgICAgICAgICByZXN1bHQuY29tcG9uZW50cyA9IG5vZGUuX19jb21wc19fLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogYy5fX3R5cGVfXyB8fCBjLmNpZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICBlbmFibGVkOiBjLmVuYWJsZWQgIT09IGZhbHNlLFxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVwdGggPCBtYXhEZXB0aCAmJiBub2RlLmNoaWxkcmVuICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByZXN1bHQuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT5cclxuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRIaWVyYXJjaHkoY2hpbGQsIGluY2x1ZGVDb21wb25lbnRzLCBkZXB0aCArIDEsIG1heERlcHRoKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgcmVzdWx0LmNoaWxkQ291bnQgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRTY2VuZVRlbXBsYXRlKG5hbWU6IHN0cmluZyk6IGFueVtdIHtcclxuICAgICAgICAvLyBUZW1wbGF0ZSBiYXNlZCBvbiBDb2NvcyBDcmVhdG9yIDMuOC40IGRlZmF1bHQgMkQgc2NlbmUgc3RydWN0dXJlLlxyXG4gICAgICAgIC8vIElEczogMD1TY2VuZUFzc2V0LCAxPVNjZW5lLCAyPUNhbnZhcywgMz1DYW1lcmEsIDQ9VUlUcmFuc2Zvcm0sXHJcbiAgICAgICAgLy8gICAgICA1PUNhbnZhcyBjb21wLCA2PVdpZGdldCwgNz1DYW1lcmEgY29tcCwgOD1TY2VuZUdsb2JhbHMsXHJcbiAgICAgICAgLy8gICAgICA5LTE2PUdsb2JhbHMgc3ViLW9iamVjdHNcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAvLyAwOiBTY2VuZUFzc2V0XHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuU2NlbmVBc3NldCcsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgX25hdGl2ZTogJycsXHJcbiAgICAgICAgICAgICAgICBzY2VuZTogeyBfX2lkX186IDEgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTogU2NlbmUgcm9vdFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlNjZW5lJyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBfcGFyZW50OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2NoaWxkcmVuOiBbeyBfX2lkX186IDIgfV0sXHJcbiAgICAgICAgICAgICAgICBfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFtdLFxyXG4gICAgICAgICAgICAgICAgX3ByZWZhYjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9scG9zOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgICAgIF9scm90OiB7IF9fdHlwZV9fOiAnY2MuUXVhdCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDEgfSxcclxuICAgICAgICAgICAgICAgIF9sc2NhbGU6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogMSwgeTogMSwgejogMSB9LFxyXG4gICAgICAgICAgICAgICAgX21vYmlsaXR5OiAwLFxyXG4gICAgICAgICAgICAgICAgX2xheWVyOiAxMDczNzQxODI0LFxyXG4gICAgICAgICAgICAgICAgX2V1bGVyOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgICAgIGF1dG9SZWxlYXNlQXNzZXRzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9nbG9iYWxzOiB7IF9faWRfXzogOCB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyAyOiBDYW52YXMgbm9kZVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLk5vZGUnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICdDYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBfcGFyZW50OiB7IF9faWRfXzogMSB9LFxyXG4gICAgICAgICAgICAgICAgX2NoaWxkcmVuOiBbeyBfX2lkX186IDMgfV0sXHJcbiAgICAgICAgICAgICAgICBfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFt7IF9faWRfXzogNCB9LCB7IF9faWRfXzogNSB9LCB7IF9faWRfXzogNiB9XSxcclxuICAgICAgICAgICAgICAgIF9wcmVmYWI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfbHBvczogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiA2NDAsIHk6IDM2MCwgejogMCB9LFxyXG4gICAgICAgICAgICAgICAgX2xyb3Q6IHsgX190eXBlX186ICdjYy5RdWF0JywgeDogMCwgeTogMCwgejogMCwgdzogMSB9LFxyXG4gICAgICAgICAgICAgICAgX2xzY2FsZTogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAxLCB5OiAxLCB6OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfbW9iaWxpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICBfbGF5ZXI6IDMzNTU0NDMyLFxyXG4gICAgICAgICAgICAgICAgX2V1bGVyOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMzogQ2FtZXJhIG5vZGVcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5Ob2RlJyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiAnQ2FtZXJhJyxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgX3BhcmVudDogeyBfX2lkX186IDIgfSxcclxuICAgICAgICAgICAgICAgIF9jaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgICAgICBfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFt7IF9faWRfXzogNyB9XSxcclxuICAgICAgICAgICAgICAgIF9wcmVmYWI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfbHBvczogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAwLCB5OiAwLCB6OiAxMDAwIH0sXHJcbiAgICAgICAgICAgICAgICBfbHJvdDogeyBfX3R5cGVfXzogJ2NjLlF1YXQnLCB4OiAwLCB5OiAwLCB6OiAwLCB3OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfbHNjYWxlOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDEsIHk6IDEsIHo6IDEgfSxcclxuICAgICAgICAgICAgICAgIF9tb2JpbGl0eTogMCxcclxuICAgICAgICAgICAgICAgIF9sYXllcjogMTA3Mzc0MTgyNCxcclxuICAgICAgICAgICAgICAgIF9ldWxlcjogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAwLCB5OiAwLCB6OiAwIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDQ6IFVJVHJhbnNmb3JtIG9uIENhbnZhc1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlVJVHJhbnNmb3JtJyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiAnJyxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgbm9kZTogeyBfX2lkX186IDIgfSxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbnRlbnRTaXplOiB7IF9fdHlwZV9fOiAnY2MuU2l6ZScsIHdpZHRoOiAxMjgwLCBoZWlnaHQ6IDcyMCB9LFxyXG4gICAgICAgICAgICAgICAgX2FuY2hvclBvaW50OiB7IF9fdHlwZV9fOiAnY2MuVmVjMicsIHg6IDAuNSwgeTogMC41IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDU6IENhbnZhcyBjb21wb25lbnRcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5DYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICcnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBub2RlOiB7IF9faWRfXzogMiB9LFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfY2FtZXJhQ29tcG9uZW50OiB7IF9faWRfXzogNyB9LFxyXG4gICAgICAgICAgICAgICAgX2FsaWduQ2FudmFzV2l0aFNjcmVlbjogdHJ1ZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gNjogV2lkZ2V0IG9uIENhbnZhc1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLldpZGdldCcsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogJycsXHJcbiAgICAgICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXHJcbiAgICAgICAgICAgICAgICBfX2VkaXRvckV4dHJhc19fOiB7fSxcclxuICAgICAgICAgICAgICAgIG5vZGU6IHsgX19pZF9fOiAyIH0sXHJcbiAgICAgICAgICAgICAgICBfZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9hbGlnbkZsYWdzOiA0NSxcclxuICAgICAgICAgICAgICAgIF9sZWZ0OiAwLFxyXG4gICAgICAgICAgICAgICAgX3JpZ2h0OiAwLFxyXG4gICAgICAgICAgICAgICAgX3RvcDogMCxcclxuICAgICAgICAgICAgICAgIF9ib3R0b206IDAsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDc6IENhbWVyYSBjb21wb25lbnRcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5DYW1lcmEnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICcnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBub2RlOiB7IF9faWRfXzogMyB9LFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfcHJvamVjdGlvbjogMCxcclxuICAgICAgICAgICAgICAgIF9wcmlvcml0eTogMTA3Mzc0MTgyNCxcclxuICAgICAgICAgICAgICAgIF9mb3Y6IDQ1LFxyXG4gICAgICAgICAgICAgICAgX2ZvdkF4aXM6IDAsXHJcbiAgICAgICAgICAgICAgICBfb3J0aG9IZWlnaHQ6IDM2MCxcclxuICAgICAgICAgICAgICAgIF9uZWFyOiAwLFxyXG4gICAgICAgICAgICAgICAgX2ZhcjogMjAwMCxcclxuICAgICAgICAgICAgICAgIF9jb2xvcjogeyBfX3R5cGVfXzogJ2NjLkNvbG9yJywgcjogMCwgZzogMCwgYjogMCwgYTogMjU1IH0sXHJcbiAgICAgICAgICAgICAgICBfZGVwdGg6IDEsXHJcbiAgICAgICAgICAgICAgICBfc3RlbmNpbDogMCxcclxuICAgICAgICAgICAgICAgIF9jbGVhckZsYWdzOiA2LFxyXG4gICAgICAgICAgICAgICAgX3JlY3Q6IHsgX190eXBlX186ICdjYy5SZWN0JywgeDogMCwgeTogMCwgd2lkdGg6IDEsIGhlaWdodDogMSB9LFxyXG4gICAgICAgICAgICAgICAgX3Zpc2liaWxpdHk6IDQxOTQzMDQwLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyA4OiBTY2VuZUdsb2JhbHNcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5TY2VuZUdsb2JhbHMnLFxyXG4gICAgICAgICAgICAgICAgYW1iaWVudDogeyBfX2lkX186IDkgfSxcclxuICAgICAgICAgICAgICAgIHNoYWRvd3M6IHsgX19pZF9fOiAxMCB9LFxyXG4gICAgICAgICAgICAgICAgX3NreWJveDogeyBfX2lkX186IDExIH0sXHJcbiAgICAgICAgICAgICAgICBmb2c6IHsgX19pZF9fOiAxMiB9LFxyXG4gICAgICAgICAgICAgICAgb2N0cmVlOiB7IF9faWRfXzogMTMgfSxcclxuICAgICAgICAgICAgICAgIHNraW46IHsgX19pZF9fOiAxNCB9LFxyXG4gICAgICAgICAgICAgICAgbGlnaHRQcm9iZUluZm86IHsgX19pZF9fOiAxNSB9LFxyXG4gICAgICAgICAgICAgICAgcG9zdFNldHRpbmdzOiB7IF9faWRfXzogMTYgfSxcclxuICAgICAgICAgICAgICAgIGJha2VkV2l0aFN0YXRpb25hcnlNYWluTGlnaHQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgYmFrZWRXaXRoSGlnaHBMaWdodG1hcDogZmFsc2UsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDk6IEFtYmllbnRJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuQW1iaWVudEluZm8nLFxyXG4gICAgICAgICAgICAgICAgX3NreUNvbG9ySERSOiB7IF9fdHlwZV9fOiAnY2MuVmVjNCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDAuNTIwODMzMTI1IH0sXHJcbiAgICAgICAgICAgICAgICBfc2t5Q29sb3I6IHsgX190eXBlX186ICdjYy5WZWM0JywgeDogMCwgeTogMCwgejogMCwgdzogMC41MjA4MzMxMjUgfSxcclxuICAgICAgICAgICAgICAgIF9za3lJbGx1bUhEUjogMjAwMDAsXHJcbiAgICAgICAgICAgICAgICBfc2t5SWxsdW06IDIwMDAwLFxyXG4gICAgICAgICAgICAgICAgX2dyb3VuZEFsYmVkb0hEUjogeyBfX3R5cGVfXzogJ2NjLlZlYzQnLCB4OiAwLCB5OiAwLCB6OiAwLCB3OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBfZ3JvdW5kQWxiZWRvOiB7IF9fdHlwZV9fOiAnY2MuVmVjNCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDAgfSxcclxuICAgICAgICAgICAgICAgIF9za3lDb2xvckxEUjogeyBfX3R5cGVfXzogJ2NjLlZlYzQnLCB4OiAwLjIsIHk6IDAuNSwgejogMC44LCB3OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfc2t5SWxsdW1MRFI6IDIwMDAwLFxyXG4gICAgICAgICAgICAgICAgX2dyb3VuZEFsYmVkb0xEUjogeyBfX3R5cGVfXzogJ2NjLlZlYzQnLCB4OiAwLjIsIHk6IDAuMiwgejogMC4yLCB3OiAxIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDEwOiBTaGFkb3dzSW5mb1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlNoYWRvd3NJbmZvJyxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF90eXBlOiAwLFxyXG4gICAgICAgICAgICAgICAgX25vcm1hbDogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAwLCB5OiAxLCB6OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBfZGlzdGFuY2U6IDAsXHJcbiAgICAgICAgICAgICAgICBfcGxhbmVCaWFzOiAxLFxyXG4gICAgICAgICAgICAgICAgX3NoYWRvd0NvbG9yOiB7IF9fdHlwZV9fOiAnY2MuQ29sb3InLCByOiA3NiwgZzogNzYsIGI6IDc2LCBhOiAyNTUgfSxcclxuICAgICAgICAgICAgICAgIF9tYXhSZWNlaXZlZDogNCxcclxuICAgICAgICAgICAgICAgIF9zaXplOiB7IF9fdHlwZV9fOiAnY2MuVmVjMicsIHg6IDUxMiwgeTogNTEyIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDExOiBTa3lib3hJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuU2t5Ym94SW5mbycsXHJcbiAgICAgICAgICAgICAgICBfZW52TGlnaHRpbmdUeXBlOiAwLFxyXG4gICAgICAgICAgICAgICAgX2Vudm1hcEhEUjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9lbnZtYXA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfZW52bWFwTERSOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2RpZmZ1c2VNYXBIRFI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfZGlmZnVzZU1hcExEUjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF91c2VIRFI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfZWRpdGFibGVNYXRlcmlhbDogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9yZWZsZWN0aW9uSERSOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX3JlZmxlY3Rpb25MRFI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfcm90YXRpb25BbmdsZTogMCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTI6IEZvZ0luZm9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5Gb2dJbmZvJyxcclxuICAgICAgICAgICAgICAgIF90eXBlOiAwLFxyXG4gICAgICAgICAgICAgICAgX2ZvZ0NvbG9yOiB7IF9fdHlwZV9fOiAnY2MuQ29sb3InLCByOiAyMDAsIGc6IDIwMCwgYjogMjAwLCBhOiAyNTUgfSxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9mb2dEZW5zaXR5OiAwLjMsXHJcbiAgICAgICAgICAgICAgICBfZm9nU3RhcnQ6IDAuNSxcclxuICAgICAgICAgICAgICAgIF9mb2dFbmQ6IDMwMCxcclxuICAgICAgICAgICAgICAgIF9mb2dBdHRlbjogNSxcclxuICAgICAgICAgICAgICAgIF9mb2dUb3A6IDEuNSxcclxuICAgICAgICAgICAgICAgIF9mb2dSYW5nZTogMS4yLFxyXG4gICAgICAgICAgICAgICAgX2FjY3VyYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTM6IE9jdHJlZUluZm9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5PY3RyZWVJbmZvJyxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9taW5Qb3M6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogLTEwMjQsIHk6IC0xMDI0LCB6OiAtMTAyNCB9LFxyXG4gICAgICAgICAgICAgICAgX21heFBvczogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAxMDI0LCB5OiAxMDI0LCB6OiAxMDI0IH0sXHJcbiAgICAgICAgICAgICAgICBfZGVwdGg6IDgsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDE0OiBTa2luSW5mb1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlNraW5JbmZvJyxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9ibHVyUmFkaXVzOiAwLjAxLFxyXG4gICAgICAgICAgICAgICAgX3Nzc0ludGVuc2l0eTogMyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTU6IExpZ2h0UHJvYmVJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuTGlnaHRQcm9iZUluZm8nLFxyXG4gICAgICAgICAgICAgICAgX2dpU2NhbGU6IDEsXHJcbiAgICAgICAgICAgICAgICBfZ2lTYW1wbGVzOiAxMDI0LFxyXG4gICAgICAgICAgICAgICAgX2JvdW5jZXM6IDIsXHJcbiAgICAgICAgICAgICAgICBfcmVkdWNlUmluZ2luZzogMCxcclxuICAgICAgICAgICAgICAgIF9zaG93UHJvYmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfc2hvd1dpcmVmcmFtZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9zaG93Q29udmV4OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9kYXRhOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2xpZ2h0UHJvYmVTcGhlcmVWb2x1bWU6IDEsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDE2OiBQb3N0U2V0dGluZ3NJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuUG9zdFNldHRpbmdzSW5mbycsXHJcbiAgICAgICAgICAgICAgICBfdG9uZU1hcHBpbmdUeXBlOiAwLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcbn1cclxuIl19