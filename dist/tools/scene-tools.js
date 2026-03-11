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
            // query-dirty may return boolean or { dirty: boolean }
            const result = await Editor.Message.request('scene', 'query-dirty');
            const dirty = typeof result === 'boolean' ? result
                : typeof result === 'object' && result !== null ? !!result.dirty
                    : !!result;
            return { success: true, data: { dirty } };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUM7QUFFN0MsTUFBYSxVQUFVO0lBRW5CLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLDJDQUEyQztnQkFDeEQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSw0QkFBNEIsRUFBRTt3QkFDdkUsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxpQ0FBaUMsRUFBRTtxQkFDekY7aUJBQ0o7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLFdBQVcsRUFBRSxtRUFBbUU7Z0JBQ2hGLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUscURBQXFELEVBQUU7cUJBQ2pHO2lCQUNKO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsTUFBTTtnQkFDWixXQUFXLEVBQUUsNEJBQTRCO2dCQUN6QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGdEQUFnRCxFQUFFO3FCQUMxRjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUM7aUJBQ3JCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsTUFBTTtnQkFDWixXQUFXLEVBQUUsd0JBQXdCO2dCQUNy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QUFFLENBQUM7YUFDdEI7U0FDSixDQUFDO0lBQ04sQ0FBQztDQUNKO0FBdmlCRCxnQ0F1aUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuY29uc3QgRVhURU5TSU9OX05BTUUgPSAnY29jb3MtbWNwLWV4dGVuc2lvbic7XHJcblxyXG5leHBvcnQgY2xhc3MgU2NlbmVUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XHJcblxyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IGN1cnJlbnQgc2NlbmUgaW5mbyBhbmQgaGllcmFyY2h5IHRyZWUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1heERlcHRoOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ01heCB0cmVlIGRlcHRoIChkZWZhdWx0IDMpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlQ29tcG9uZW50czogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnSW5jbHVkZSBjb21wb25lbnQgbGlzdCBwZXIgbm9kZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2xpc3QnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdMaXN0IGFsbCBzY2VuZSBmaWxlcyBpbiB0aGUgcHJvamVjdC4gVXNlIGZpbHRlciB0byBuYXJyb3cgcmVzdWx0cycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1N1YnN0cmluZyBmaWx0ZXIgZm9yIHNjZW5lIG5hbWVzIChjYXNlLWluc2Vuc2l0aXZlKScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ29wZW4nLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPcGVuIGEgc2NlbmUgYnkgZGI6Ly8gcGF0aCcsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdkYjovLyBwYXRoLCBlLmcuIGRiOi8vYXNzZXRzL3NjZW5lcy9tYWluLnNjZW5lJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncGF0aCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NhdmUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTYXZlIHRoZSBjdXJyZW50IHNjZW5lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY3JlYXRlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIGEgbmV3IHNjZW5lIGFzc2V0JyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRm9sZGVyIGRiOi8vIHBhdGgsIGUuZy4gZGI6Ly9hc3NldHMvc2NlbmVzJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbmFtZScsICdwYXRoJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnc25hcHNob3QnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDcmVhdGUgYW4gdW5kbyBzbmFwc2hvdCBvZiBjdXJyZW50IHNjZW5lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZGlydHknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDaGVjayBpZiB0aGUgY3VycmVudCBzY2VuZSBoYXMgdW5zYXZlZCBjaGFuZ2VzJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVsb2FkJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU29mdCByZWxvYWQgdGhlIGN1cnJlbnQgc2NlbmUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdjbGFzc2VzJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgcmVnaXN0ZXJlZCBjb21wb25lbnQgY2xhc3Nlcy4gVXNlIGZpbHRlciB0byBuYXJyb3cgcmVzdWx0cyAoZS5nLiBcIlVJXCIsIFwiTGlnaHRcIiwgXCJQaHlzaWNzXCIpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXI6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU3Vic3RyaW5nIGZpbHRlciBmb3IgY2xhc3MgbmFtZXMgKGNhc2UtaW5zZW5zaXRpdmUpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY2xvc2UnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDbG9zZSB0aGUgY3VycmVudCBzY2VuZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NhdmVfYXMnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTYXZlIHRoZSBjdXJyZW50IHNjZW5lIGFzIGEgbmV3IHNjZW5lIGZpbGUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZWFkeScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NoZWNrIGlmIHRoZSBzY2VuZSBlZGl0b3IgaXMgcmVhZHknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdib3VuZHMnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdHZXQgdGhlIGJvdW5kaW5nIGJveCBvZiB0aGUgY3VycmVudCBzY2VuZSB2aWV3JyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgY2FzZSAncXVlcnknOiByZXR1cm4gdGhpcy5xdWVyeShhcmdzKTtcclxuICAgICAgICAgICAgY2FzZSAnbGlzdCc6IHJldHVybiB0aGlzLmxpc3QoYXJncy5maWx0ZXIpO1xyXG4gICAgICAgICAgICBjYXNlICdvcGVuJzogcmV0dXJuIHRoaXMub3BlbihhcmdzLnBhdGgpO1xyXG4gICAgICAgICAgICBjYXNlICdzYXZlJzogcmV0dXJuIHRoaXMuc2F2ZSgpO1xyXG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOiByZXR1cm4gdGhpcy5jcmVhdGUoYXJncy5uYW1lLCBhcmdzLnBhdGgpO1xyXG4gICAgICAgICAgICBjYXNlICdzbmFwc2hvdCc6IHJldHVybiB0aGlzLnNuYXBzaG90KCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2RpcnR5JzogcmV0dXJuIHRoaXMuZGlydHkoKTtcclxuICAgICAgICAgICAgY2FzZSAncmVsb2FkJzogcmV0dXJuIHRoaXMucmVsb2FkKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NsYXNzZXMnOiByZXR1cm4gdGhpcy5jbGFzc2VzKGFyZ3MuZmlsdGVyKTtcclxuICAgICAgICAgICAgY2FzZSAnY2xvc2UnOiByZXR1cm4gdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgICAgICBjYXNlICdzYXZlX2FzJzogcmV0dXJuIHRoaXMuc2F2ZUFzKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3JlYWR5JzogcmV0dXJuIHRoaXMuaXNSZWFkeSgpO1xyXG4gICAgICAgICAgICBjYXNlICdib3VuZHMnOiByZXR1cm4gdGhpcy5xdWVyeUJvdW5kcygpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIHNjZW5lIHRvb2w6ICR7dG9vbE5hbWV9YCB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gVG9vbCBJbXBsZW1lbnRhdGlvbnMgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGNvbnN0IG1heERlcHRoID0gYXJncy5tYXhEZXB0aCA/PyAzO1xyXG4gICAgICAgIGNvbnN0IGluY2x1ZGVDb21wb25lbnRzID0gYXJncy5pbmNsdWRlQ29tcG9uZW50cyA/PyBmYWxzZTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gUHJpbWFyeTogRWRpdG9yIEFQSVxyXG4gICAgICAgICAgICBjb25zdCB0cmVlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XHJcbiAgICAgICAgICAgIGlmICh0cmVlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSB0aGlzLmJ1aWxkSGllcmFyY2h5KHRyZWUsIGluY2x1ZGVDb21wb25lbnRzLCAwLCBtYXhEZXB0aCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBoaWVyYXJjaHkgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAvLyBGYWxsYmFjazogc2NlbmUgc2NyaXB0XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXRTY2VuZUhpZXJhcmNoeScsXHJcbiAgICAgICAgICAgICAgICBhcmdzOiBbaW5jbHVkZUNvbXBvbmVudHMsIG1heERlcHRoXSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBzY2VuZSBkYXRhIHJldHVybmVkJyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0KGZpbHRlcj86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgYXNzZXRzOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IHBhdHRlcm46ICdkYjovL2Fzc2V0cy8qKi8qLnNjZW5lJyB9KTtcclxuICAgICAgICAgICAgaWYgKCFhc3NldHMgfHwgIUFycmF5LmlzQXJyYXkoYXNzZXRzKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogW10gfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgc2NlbmVzID0gYXNzZXRzLm1hcCgoYTogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogYS5uYW1lIHx8IGEudXJsPy5zcGxpdCgnLycpLnBvcCgpPy5yZXBsYWNlKCcuc2NlbmUnLCAnJyksXHJcbiAgICAgICAgICAgICAgICB1dWlkOiBhLnV1aWQsXHJcbiAgICAgICAgICAgICAgICB1cmw6IGEudXJsIHx8IGEucGF0aCxcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb3dlckZpbHRlciA9IGZpbHRlci50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgc2NlbmVzID0gc2NlbmVzLmZpbHRlcigoczogYW55KSA9PiBzLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckZpbHRlcikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHNjZW5lcyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBvcGVuKHBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gR2V0IFVVSUQgZnJvbSBwYXRoIGZpcnN0XHJcbiAgICAgICAgICAgIGNvbnN0IHV1aWQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCBwYXRoKTtcclxuICAgICAgICAgICAgaWYgKCF1dWlkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBTY2VuZSBub3QgZm91bmQ6ICR7cGF0aH1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnb3Blbi1zY2VuZScsIHV1aWQpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgT3BlbmVkIHNjZW5lOiAke3BhdGh9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzYXZlKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2F2ZS1zY2VuZScpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnU2NlbmUgc2F2ZWQnIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZShuYW1lOiBzdHJpbmcsIGZvbGRlclBhdGg6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmVQYXRoID0gYCR7Zm9sZGVyUGF0aH0vJHtuYW1lfS5zY2VuZWA7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lSnNvbiA9IEpTT04uc3RyaW5naWZ5KHRoaXMuZ2V0U2NlbmVUZW1wbGF0ZShuYW1lKSk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnY3JlYXRlLWFzc2V0Jywgc2NlbmVQYXRoLCBzY2VuZUpzb24pO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHsgdXVpZDogcmVzdWx0Py51dWlkLCB1cmw6IHNjZW5lUGF0aCB9LFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFNjZW5lIGNyZWF0ZWQ6ICR7c2NlbmVQYXRofWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNuYXBzaG90KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc25hcHNob3QnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ1VuZG8gc25hcHNob3QgY3JlYXRlZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZGlydHkoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBxdWVyeS1kaXJ0eSBtYXkgcmV0dXJuIGJvb2xlYW4gb3IgeyBkaXJ0eTogYm9vbGVhbiB9XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktZGlydHknKTtcclxuICAgICAgICAgICAgY29uc3QgZGlydHkgPSB0eXBlb2YgcmVzdWx0ID09PSAnYm9vbGVhbicgPyByZXN1bHRcclxuICAgICAgICAgICAgICAgIDogdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcgJiYgcmVzdWx0ICE9PSBudWxsID8gISFyZXN1bHQuZGlydHlcclxuICAgICAgICAgICAgICAgIDogISFyZXN1bHQ7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgZGlydHkgfSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZWxvYWQoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzb2Z0LXJlbG9hZCcpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnU2NlbmUgcmVsb2FkZWQnIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNsYXNzZXMoZmlsdGVyPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjbGFzc2VzOiBhbnlbXSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3F1ZXJ5LWNsYXNzZXMnKTtcclxuICAgICAgICAgICAgaWYgKCFmaWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGNsYXNzZXMubWFwKChjOiBhbnkpID0+IGMubmFtZSB8fCBjKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGxvd2VyRmlsdGVyID0gZmlsdGVyLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlcmVkID0gY2xhc3Nlc1xyXG4gICAgICAgICAgICAgICAgLm1hcCgoYzogYW55KSA9PiBjLm5hbWUgfHwgYylcclxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKG5hbWU6IHN0cmluZykgPT4gbmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyRmlsdGVyKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGZpbHRlcmVkIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNsb3NlKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdzY2VuZScsICdjbG9zZS1zY2VuZScpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IGNsb3NlZDogISFyZXN1bHQgfSwgbWVzc2FnZTogJ1NjZW5lIGNsb3NlZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2F2ZUFzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdzY2VuZScsICdzYXZlLWFzLXNjZW5lJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgc2F2ZWRQYXRoOiByZXN1bHQgfSwgbWVzc2FnZTogcmVzdWx0ID8gYFNjZW5lIHNhdmVkIGFzOiAke3Jlc3VsdH1gIDogJ1NhdmUgYXMgY2FuY2VsbGVkJyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBpc1JlYWR5KCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVhZHk6IGFueSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3F1ZXJ5LWlzLXJlYWR5Jyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgcmVhZHk6ICEhcmVhZHkgfSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUJvdW5kcygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGJvdW5kczogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncXVlcnktc2NlbmUtYm91bmRzJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGJvdW5kcyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IEhlbHBlcnMgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZEhpZXJhcmNoeShub2RlOiBhbnksIGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuLCBkZXB0aDogbnVtYmVyLCBtYXhEZXB0aDogbnVtYmVyKTogYW55IHtcclxuICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IHtcclxuICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUgIT09IGZhbHNlLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmIChpbmNsdWRlQ29tcG9uZW50cyAmJiBub2RlLl9fY29tcHNfXykge1xyXG4gICAgICAgICAgICByZXN1bHQuY29tcG9uZW50cyA9IG5vZGUuX19jb21wc19fLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogYy5fX3R5cGVfXyB8fCBjLmNpZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICBlbmFibGVkOiBjLmVuYWJsZWQgIT09IGZhbHNlLFxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVwdGggPCBtYXhEZXB0aCAmJiBub2RlLmNoaWxkcmVuICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByZXN1bHQuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT5cclxuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRIaWVyYXJjaHkoY2hpbGQsIGluY2x1ZGVDb21wb25lbnRzLCBkZXB0aCArIDEsIG1heERlcHRoKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgcmVzdWx0LmNoaWxkQ291bnQgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRTY2VuZVRlbXBsYXRlKG5hbWU6IHN0cmluZyk6IGFueVtdIHtcclxuICAgICAgICAvLyBUZW1wbGF0ZSBiYXNlZCBvbiBDb2NvcyBDcmVhdG9yIDMuOC40IGRlZmF1bHQgMkQgc2NlbmUgc3RydWN0dXJlLlxyXG4gICAgICAgIC8vIElEczogMD1TY2VuZUFzc2V0LCAxPVNjZW5lLCAyPUNhbnZhcywgMz1DYW1lcmEsIDQ9VUlUcmFuc2Zvcm0sXHJcbiAgICAgICAgLy8gICAgICA1PUNhbnZhcyBjb21wLCA2PVdpZGdldCwgNz1DYW1lcmEgY29tcCwgOD1TY2VuZUdsb2JhbHMsXHJcbiAgICAgICAgLy8gICAgICA5LTE2PUdsb2JhbHMgc3ViLW9iamVjdHNcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAvLyAwOiBTY2VuZUFzc2V0XHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuU2NlbmVBc3NldCcsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgX25hdGl2ZTogJycsXHJcbiAgICAgICAgICAgICAgICBzY2VuZTogeyBfX2lkX186IDEgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTogU2NlbmUgcm9vdFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlNjZW5lJyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBfcGFyZW50OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2NoaWxkcmVuOiBbeyBfX2lkX186IDIgfV0sXHJcbiAgICAgICAgICAgICAgICBfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFtdLFxyXG4gICAgICAgICAgICAgICAgX3ByZWZhYjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9scG9zOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgICAgIF9scm90OiB7IF9fdHlwZV9fOiAnY2MuUXVhdCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDEgfSxcclxuICAgICAgICAgICAgICAgIF9sc2NhbGU6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogMSwgeTogMSwgejogMSB9LFxyXG4gICAgICAgICAgICAgICAgX21vYmlsaXR5OiAwLFxyXG4gICAgICAgICAgICAgICAgX2xheWVyOiAxMDczNzQxODI0LFxyXG4gICAgICAgICAgICAgICAgX2V1bGVyOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgICAgIGF1dG9SZWxlYXNlQXNzZXRzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9nbG9iYWxzOiB7IF9faWRfXzogOCB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyAyOiBDYW52YXMgbm9kZVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLk5vZGUnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICdDYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBfcGFyZW50OiB7IF9faWRfXzogMSB9LFxyXG4gICAgICAgICAgICAgICAgX2NoaWxkcmVuOiBbeyBfX2lkX186IDMgfV0sXHJcbiAgICAgICAgICAgICAgICBfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFt7IF9faWRfXzogNCB9LCB7IF9faWRfXzogNSB9LCB7IF9faWRfXzogNiB9XSxcclxuICAgICAgICAgICAgICAgIF9wcmVmYWI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfbHBvczogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiA2NDAsIHk6IDM2MCwgejogMCB9LFxyXG4gICAgICAgICAgICAgICAgX2xyb3Q6IHsgX190eXBlX186ICdjYy5RdWF0JywgeDogMCwgeTogMCwgejogMCwgdzogMSB9LFxyXG4gICAgICAgICAgICAgICAgX2xzY2FsZTogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAxLCB5OiAxLCB6OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfbW9iaWxpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICBfbGF5ZXI6IDMzNTU0NDMyLFxyXG4gICAgICAgICAgICAgICAgX2V1bGVyOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMzogQ2FtZXJhIG5vZGVcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5Ob2RlJyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiAnQ2FtZXJhJyxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgX3BhcmVudDogeyBfX2lkX186IDIgfSxcclxuICAgICAgICAgICAgICAgIF9jaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgICAgICBfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFt7IF9faWRfXzogNyB9XSxcclxuICAgICAgICAgICAgICAgIF9wcmVmYWI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfbHBvczogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAwLCB5OiAwLCB6OiAxMDAwIH0sXHJcbiAgICAgICAgICAgICAgICBfbHJvdDogeyBfX3R5cGVfXzogJ2NjLlF1YXQnLCB4OiAwLCB5OiAwLCB6OiAwLCB3OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfbHNjYWxlOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDEsIHk6IDEsIHo6IDEgfSxcclxuICAgICAgICAgICAgICAgIF9tb2JpbGl0eTogMCxcclxuICAgICAgICAgICAgICAgIF9sYXllcjogMTA3Mzc0MTgyNCxcclxuICAgICAgICAgICAgICAgIF9ldWxlcjogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAwLCB5OiAwLCB6OiAwIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDQ6IFVJVHJhbnNmb3JtIG9uIENhbnZhc1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlVJVHJhbnNmb3JtJyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiAnJyxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgbm9kZTogeyBfX2lkX186IDIgfSxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbnRlbnRTaXplOiB7IF9fdHlwZV9fOiAnY2MuU2l6ZScsIHdpZHRoOiAxMjgwLCBoZWlnaHQ6IDcyMCB9LFxyXG4gICAgICAgICAgICAgICAgX2FuY2hvclBvaW50OiB7IF9fdHlwZV9fOiAnY2MuVmVjMicsIHg6IDAuNSwgeTogMC41IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDU6IENhbnZhcyBjb21wb25lbnRcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5DYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICcnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBub2RlOiB7IF9faWRfXzogMiB9LFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfY2FtZXJhQ29tcG9uZW50OiB7IF9faWRfXzogNyB9LFxyXG4gICAgICAgICAgICAgICAgX2FsaWduQ2FudmFzV2l0aFNjcmVlbjogdHJ1ZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gNjogV2lkZ2V0IG9uIENhbnZhc1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLldpZGdldCcsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogJycsXHJcbiAgICAgICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXHJcbiAgICAgICAgICAgICAgICBfX2VkaXRvckV4dHJhc19fOiB7fSxcclxuICAgICAgICAgICAgICAgIG5vZGU6IHsgX19pZF9fOiAyIH0sXHJcbiAgICAgICAgICAgICAgICBfZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9hbGlnbkZsYWdzOiA0NSxcclxuICAgICAgICAgICAgICAgIF9sZWZ0OiAwLFxyXG4gICAgICAgICAgICAgICAgX3JpZ2h0OiAwLFxyXG4gICAgICAgICAgICAgICAgX3RvcDogMCxcclxuICAgICAgICAgICAgICAgIF9ib3R0b206IDAsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDc6IENhbWVyYSBjb21wb25lbnRcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5DYW1lcmEnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICcnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBub2RlOiB7IF9faWRfXzogMyB9LFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfcHJvamVjdGlvbjogMCxcclxuICAgICAgICAgICAgICAgIF9wcmlvcml0eTogMTA3Mzc0MTgyNCxcclxuICAgICAgICAgICAgICAgIF9mb3Y6IDQ1LFxyXG4gICAgICAgICAgICAgICAgX2ZvdkF4aXM6IDAsXHJcbiAgICAgICAgICAgICAgICBfb3J0aG9IZWlnaHQ6IDM2MCxcclxuICAgICAgICAgICAgICAgIF9uZWFyOiAwLFxyXG4gICAgICAgICAgICAgICAgX2ZhcjogMjAwMCxcclxuICAgICAgICAgICAgICAgIF9jb2xvcjogeyBfX3R5cGVfXzogJ2NjLkNvbG9yJywgcjogMCwgZzogMCwgYjogMCwgYTogMjU1IH0sXHJcbiAgICAgICAgICAgICAgICBfZGVwdGg6IDEsXHJcbiAgICAgICAgICAgICAgICBfc3RlbmNpbDogMCxcclxuICAgICAgICAgICAgICAgIF9jbGVhckZsYWdzOiA2LFxyXG4gICAgICAgICAgICAgICAgX3JlY3Q6IHsgX190eXBlX186ICdjYy5SZWN0JywgeDogMCwgeTogMCwgd2lkdGg6IDEsIGhlaWdodDogMSB9LFxyXG4gICAgICAgICAgICAgICAgX3Zpc2liaWxpdHk6IDQxOTQzMDQwLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyA4OiBTY2VuZUdsb2JhbHNcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5TY2VuZUdsb2JhbHMnLFxyXG4gICAgICAgICAgICAgICAgYW1iaWVudDogeyBfX2lkX186IDkgfSxcclxuICAgICAgICAgICAgICAgIHNoYWRvd3M6IHsgX19pZF9fOiAxMCB9LFxyXG4gICAgICAgICAgICAgICAgX3NreWJveDogeyBfX2lkX186IDExIH0sXHJcbiAgICAgICAgICAgICAgICBmb2c6IHsgX19pZF9fOiAxMiB9LFxyXG4gICAgICAgICAgICAgICAgb2N0cmVlOiB7IF9faWRfXzogMTMgfSxcclxuICAgICAgICAgICAgICAgIHNraW46IHsgX19pZF9fOiAxNCB9LFxyXG4gICAgICAgICAgICAgICAgbGlnaHRQcm9iZUluZm86IHsgX19pZF9fOiAxNSB9LFxyXG4gICAgICAgICAgICAgICAgcG9zdFNldHRpbmdzOiB7IF9faWRfXzogMTYgfSxcclxuICAgICAgICAgICAgICAgIGJha2VkV2l0aFN0YXRpb25hcnlNYWluTGlnaHQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgYmFrZWRXaXRoSGlnaHBMaWdodG1hcDogZmFsc2UsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDk6IEFtYmllbnRJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuQW1iaWVudEluZm8nLFxyXG4gICAgICAgICAgICAgICAgX3NreUNvbG9ySERSOiB7IF9fdHlwZV9fOiAnY2MuVmVjNCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDAuNTIwODMzMTI1IH0sXHJcbiAgICAgICAgICAgICAgICBfc2t5Q29sb3I6IHsgX190eXBlX186ICdjYy5WZWM0JywgeDogMCwgeTogMCwgejogMCwgdzogMC41MjA4MzMxMjUgfSxcclxuICAgICAgICAgICAgICAgIF9za3lJbGx1bUhEUjogMjAwMDAsXHJcbiAgICAgICAgICAgICAgICBfc2t5SWxsdW06IDIwMDAwLFxyXG4gICAgICAgICAgICAgICAgX2dyb3VuZEFsYmVkb0hEUjogeyBfX3R5cGVfXzogJ2NjLlZlYzQnLCB4OiAwLCB5OiAwLCB6OiAwLCB3OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBfZ3JvdW5kQWxiZWRvOiB7IF9fdHlwZV9fOiAnY2MuVmVjNCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDAgfSxcclxuICAgICAgICAgICAgICAgIF9za3lDb2xvckxEUjogeyBfX3R5cGVfXzogJ2NjLlZlYzQnLCB4OiAwLjIsIHk6IDAuNSwgejogMC44LCB3OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfc2t5SWxsdW1MRFI6IDIwMDAwLFxyXG4gICAgICAgICAgICAgICAgX2dyb3VuZEFsYmVkb0xEUjogeyBfX3R5cGVfXzogJ2NjLlZlYzQnLCB4OiAwLjIsIHk6IDAuMiwgejogMC4yLCB3OiAxIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDEwOiBTaGFkb3dzSW5mb1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlNoYWRvd3NJbmZvJyxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF90eXBlOiAwLFxyXG4gICAgICAgICAgICAgICAgX25vcm1hbDogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAwLCB5OiAxLCB6OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBfZGlzdGFuY2U6IDAsXHJcbiAgICAgICAgICAgICAgICBfcGxhbmVCaWFzOiAxLFxyXG4gICAgICAgICAgICAgICAgX3NoYWRvd0NvbG9yOiB7IF9fdHlwZV9fOiAnY2MuQ29sb3InLCByOiA3NiwgZzogNzYsIGI6IDc2LCBhOiAyNTUgfSxcclxuICAgICAgICAgICAgICAgIF9tYXhSZWNlaXZlZDogNCxcclxuICAgICAgICAgICAgICAgIF9zaXplOiB7IF9fdHlwZV9fOiAnY2MuVmVjMicsIHg6IDUxMiwgeTogNTEyIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDExOiBTa3lib3hJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuU2t5Ym94SW5mbycsXHJcbiAgICAgICAgICAgICAgICBfZW52TGlnaHRpbmdUeXBlOiAwLFxyXG4gICAgICAgICAgICAgICAgX2Vudm1hcEhEUjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9lbnZtYXA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfZW52bWFwTERSOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2RpZmZ1c2VNYXBIRFI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfZGlmZnVzZU1hcExEUjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF91c2VIRFI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfZWRpdGFibGVNYXRlcmlhbDogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9yZWZsZWN0aW9uSERSOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX3JlZmxlY3Rpb25MRFI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfcm90YXRpb25BbmdsZTogMCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTI6IEZvZ0luZm9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5Gb2dJbmZvJyxcclxuICAgICAgICAgICAgICAgIF90eXBlOiAwLFxyXG4gICAgICAgICAgICAgICAgX2ZvZ0NvbG9yOiB7IF9fdHlwZV9fOiAnY2MuQ29sb3InLCByOiAyMDAsIGc6IDIwMCwgYjogMjAwLCBhOiAyNTUgfSxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9mb2dEZW5zaXR5OiAwLjMsXHJcbiAgICAgICAgICAgICAgICBfZm9nU3RhcnQ6IDAuNSxcclxuICAgICAgICAgICAgICAgIF9mb2dFbmQ6IDMwMCxcclxuICAgICAgICAgICAgICAgIF9mb2dBdHRlbjogNSxcclxuICAgICAgICAgICAgICAgIF9mb2dUb3A6IDEuNSxcclxuICAgICAgICAgICAgICAgIF9mb2dSYW5nZTogMS4yLFxyXG4gICAgICAgICAgICAgICAgX2FjY3VyYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTM6IE9jdHJlZUluZm9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5PY3RyZWVJbmZvJyxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9taW5Qb3M6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogLTEwMjQsIHk6IC0xMDI0LCB6OiAtMTAyNCB9LFxyXG4gICAgICAgICAgICAgICAgX21heFBvczogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAxMDI0LCB5OiAxMDI0LCB6OiAxMDI0IH0sXHJcbiAgICAgICAgICAgICAgICBfZGVwdGg6IDgsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDE0OiBTa2luSW5mb1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlNraW5JbmZvJyxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9ibHVyUmFkaXVzOiAwLjAxLFxyXG4gICAgICAgICAgICAgICAgX3Nzc0ludGVuc2l0eTogMyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTU6IExpZ2h0UHJvYmVJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuTGlnaHRQcm9iZUluZm8nLFxyXG4gICAgICAgICAgICAgICAgX2dpU2NhbGU6IDEsXHJcbiAgICAgICAgICAgICAgICBfZ2lTYW1wbGVzOiAxMDI0LFxyXG4gICAgICAgICAgICAgICAgX2JvdW5jZXM6IDIsXHJcbiAgICAgICAgICAgICAgICBfcmVkdWNlUmluZ2luZzogMCxcclxuICAgICAgICAgICAgICAgIF9zaG93UHJvYmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfc2hvd1dpcmVmcmFtZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9zaG93Q29udmV4OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9kYXRhOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2xpZ2h0UHJvYmVTcGhlcmVWb2x1bWU6IDEsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDE2OiBQb3N0U2V0dGluZ3NJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuUG9zdFNldHRpbmdzSW5mbycsXHJcbiAgICAgICAgICAgICAgICBfdG9uZU1hcHBpbmdUeXBlOiAwLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcbn1cclxuIl19