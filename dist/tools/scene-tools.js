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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUtdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBRUEsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUM7QUFFN0MsTUFBYSxVQUFVO0lBRW5CLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLDJDQUEyQztnQkFDeEQsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSw0QkFBNEIsRUFBRTt3QkFDdkUsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxpQ0FBaUMsRUFBRTtxQkFDekY7aUJBQ0o7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLFdBQVcsRUFBRSxxQ0FBcUM7Z0JBQ2xELFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRTthQUNsRDtZQUNEO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLFdBQVcsRUFBRSw0QkFBNEI7Z0JBQ3pDLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsZ0RBQWdELEVBQUU7cUJBQzFGO29CQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQztpQkFDckI7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLFdBQVcsRUFBRSx3QkFBd0I7Z0JBQ3JDLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRTthQUNsRDtZQUNE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QUUsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFO2dCQUMzRCxNQUFNLEVBQUUsQ0FBQzthQUNaO1lBQ0QsZUFBZTtZQUNmO2dCQUNJLFFBQVEsRUFBRSxhQUFhO2dCQUN2QixRQUFRLEVBQUUsS0FBSztnQkFDZixXQUFXLEVBQUUsSUFBSTtnQkFDakIsYUFBYSxFQUFFLENBQUM7YUFDbkI7WUFDRCxxQkFBcUI7WUFDckI7Z0JBQ0ksUUFBUSxFQUFFLG1CQUFtQjtnQkFDN0IsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLFFBQVEsRUFBRSxDQUFDO2dCQUNYLGNBQWMsRUFBRSxDQUFDO2dCQUNqQixVQUFVLEVBQUUsSUFBSTtnQkFDaEIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLFdBQVcsRUFBRSxLQUFLO2dCQUNsQixLQUFLLEVBQUUsSUFBSTtnQkFDWCx1QkFBdUIsRUFBRSxDQUFDO2FBQzdCO1lBQ0QsdUJBQXVCO1lBQ3ZCO2dCQUNJLFFBQVEsRUFBRSxxQkFBcUI7Z0JBQy9CLGdCQUFnQixFQUFFLENBQUM7YUFDdEI7U0FDSixDQUFDO0lBQ04sQ0FBQztDQUNKO0FBbGRELGdDQWtkQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmNvbnN0IEVYVEVOU0lPTl9OQU1FID0gJ2NvY29zLW1jcC1leHRlbnNpb24nO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNjZW5lVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBjdXJyZW50IHNjZW5lIGluZm8gYW5kIGhpZXJhcmNoeSB0cmVlJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhEZXB0aDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdNYXggdHJlZSBkZXB0aCAoZGVmYXVsdCAzKScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUNvbXBvbmVudHM6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgY29tcG9uZW50IGxpc3QgcGVyIG5vZGUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsaXN0JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgc2NlbmUgZmlsZXMgaW4gdGhlIHByb2plY3QnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdvcGVuJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3BlbiBhIHNjZW5lIGJ5IGRiOi8vIHBhdGgnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnZGI6Ly8gcGF0aCwgZS5nLiBkYjovL2Fzc2V0cy9zY2VuZXMvbWFpbi5zY2VuZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3BhdGgnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzYXZlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2F2ZSB0aGUgY3VycmVudCBzY2VuZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2NyZWF0ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NyZWF0ZSBhIG5ldyBzY2VuZSBhc3NldCcsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0ZvbGRlciBkYjovLyBwYXRoLCBlLmcuIGRiOi8vYXNzZXRzL3NjZW5lcycgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25hbWUnLCAncGF0aCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NuYXBzaG90JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIGFuIHVuZG8gc25hcHNob3Qgb2YgY3VycmVudCBzY2VuZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2RpcnR5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgaWYgdGhlIGN1cnJlbnQgc2NlbmUgaGFzIHVuc2F2ZWQgY2hhbmdlcycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYTogeyB0eXBlOiAnb2JqZWN0JywgcHJvcGVydGllczoge30gfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlbG9hZCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvZnQgcmVsb2FkIHRoZSBjdXJyZW50IHNjZW5lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7IHR5cGU6ICdvYmplY3QnLCBwcm9wZXJ0aWVzOiB7fSB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY2xhc3NlcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIHJlZ2lzdGVyZWQgY29tcG9uZW50IGNsYXNzZXMnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeSc6IHJldHVybiB0aGlzLnF1ZXJ5KGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdsaXN0JzogcmV0dXJuIHRoaXMubGlzdCgpO1xyXG4gICAgICAgICAgICBjYXNlICdvcGVuJzogcmV0dXJuIHRoaXMub3BlbihhcmdzLnBhdGgpO1xyXG4gICAgICAgICAgICBjYXNlICdzYXZlJzogcmV0dXJuIHRoaXMuc2F2ZSgpO1xyXG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOiByZXR1cm4gdGhpcy5jcmVhdGUoYXJncy5uYW1lLCBhcmdzLnBhdGgpO1xyXG4gICAgICAgICAgICBjYXNlICdzbmFwc2hvdCc6IHJldHVybiB0aGlzLnNuYXBzaG90KCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2RpcnR5JzogcmV0dXJuIHRoaXMuZGlydHkoKTtcclxuICAgICAgICAgICAgY2FzZSAncmVsb2FkJzogcmV0dXJuIHRoaXMucmVsb2FkKCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NsYXNzZXMnOiByZXR1cm4gdGhpcy5jbGFzc2VzKCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gc2NlbmUgdG9vbDogJHt0b29sTmFtZX1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIEltcGxlbWVudGF0aW9ucyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3QgbWF4RGVwdGggPSBhcmdzLm1heERlcHRoID8/IDM7XHJcbiAgICAgICAgY29uc3QgaW5jbHVkZUNvbXBvbmVudHMgPSBhcmdzLmluY2x1ZGVDb21wb25lbnRzID8/IGZhbHNlO1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBQcmltYXJ5OiBFZGl0b3IgQVBJXHJcbiAgICAgICAgICAgIGNvbnN0IHRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcclxuICAgICAgICAgICAgaWYgKHRyZWUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeSA9IHRoaXMuYnVpbGRIaWVyYXJjaHkodHJlZSwgaW5jbHVkZUNvbXBvbmVudHMsIDAsIG1heERlcHRoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGhpZXJhcmNoeSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBzY2VuZSBzY3JpcHRcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldFNjZW5lSGllcmFyY2h5JyxcclxuICAgICAgICAgICAgICAgIGFyZ3M6IFtpbmNsdWRlQ29tcG9uZW50cywgbWF4RGVwdGhdLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHNjZW5lIGRhdGEgcmV0dXJuZWQnIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3QoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBhc3NldHM6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0cycsIHsgcGF0dGVybjogJ2RiOi8vYXNzZXRzLyoqLyouc2NlbmUnIH0pO1xyXG4gICAgICAgICAgICBpZiAoIWFzc2V0cyB8fCAhQXJyYXkuaXNBcnJheShhc3NldHMpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBbXSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lcyA9IGFzc2V0cy5tYXAoKGE6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IGEubmFtZSB8fCBhLnVybD8uc3BsaXQoJy8nKS5wb3AoKT8ucmVwbGFjZSgnLnNjZW5lJywgJycpLFxyXG4gICAgICAgICAgICAgICAgdXVpZDogYS51dWlkLFxyXG4gICAgICAgICAgICAgICAgdXJsOiBhLnVybCB8fCBhLnBhdGgsXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc2NlbmVzIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIG9wZW4ocGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBHZXQgVVVJRCBmcm9tIHBhdGggZmlyc3RcclxuICAgICAgICAgICAgY29uc3QgdXVpZDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktdXVpZCcsIHBhdGgpO1xyXG4gICAgICAgICAgICBpZiAoIXV1aWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFNjZW5lIG5vdCBmb3VuZDogJHtwYXRofWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdvcGVuLXNjZW5lJywgdXVpZCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBPcGVuZWQgc2NlbmU6ICR7cGF0aH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNhdmUoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzYXZlLXNjZW5lJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdTY2VuZSBzYXZlZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlKG5hbWU6IHN0cmluZywgZm9sZGVyUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZVBhdGggPSBgJHtmb2xkZXJQYXRofS8ke25hbWV9LnNjZW5lYDtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmVKc29uID0gSlNPTi5zdHJpbmdpZnkodGhpcy5nZXRTY2VuZVRlbXBsYXRlKG5hbWUpKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdjcmVhdGUtYXNzZXQnLCBzY2VuZVBhdGgsIHNjZW5lSnNvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiByZXN1bHQ/LnV1aWQsIHVybDogc2NlbmVQYXRoIH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2NlbmUgY3JlYXRlZDogJHtzY2VuZVBhdGh9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc25hcHNob3QoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzbmFwc2hvdCcpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnVW5kbyBzbmFwc2hvdCBjcmVhdGVkJyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBkaXJ0eSgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzRGlydHk6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWRpcnR5Jyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgZGlydHk6ICEhaXNEaXJ0eSB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlbG9hZCgpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NvZnQtcmVsb2FkJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdTY2VuZSByZWxvYWRlZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY2xhc3NlcygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzZXM6IGFueSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3F1ZXJ5LWNsYXNzZXMnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogY2xhc3NlcyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IEhlbHBlcnMgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBidWlsZEhpZXJhcmNoeShub2RlOiBhbnksIGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuLCBkZXB0aDogbnVtYmVyLCBtYXhEZXB0aDogbnVtYmVyKTogYW55IHtcclxuICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IHtcclxuICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUgIT09IGZhbHNlLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGlmIChpbmNsdWRlQ29tcG9uZW50cyAmJiBub2RlLl9fY29tcHNfXykge1xyXG4gICAgICAgICAgICByZXN1bHQuY29tcG9uZW50cyA9IG5vZGUuX19jb21wc19fLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogYy5fX3R5cGVfXyB8fCBjLmNpZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICBlbmFibGVkOiBjLmVuYWJsZWQgIT09IGZhbHNlLFxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoZGVwdGggPCBtYXhEZXB0aCAmJiBub2RlLmNoaWxkcmVuICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByZXN1bHQuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT5cclxuICAgICAgICAgICAgICAgIHRoaXMuYnVpbGRIaWVyYXJjaHkoY2hpbGQsIGluY2x1ZGVDb21wb25lbnRzLCBkZXB0aCArIDEsIG1heERlcHRoKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH0gZWxzZSBpZiAobm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgcmVzdWx0LmNoaWxkQ291bnQgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRTY2VuZVRlbXBsYXRlKG5hbWU6IHN0cmluZyk6IGFueVtdIHtcclxuICAgICAgICAvLyBUZW1wbGF0ZSBiYXNlZCBvbiBDb2NvcyBDcmVhdG9yIDMuOC40IGRlZmF1bHQgMkQgc2NlbmUgc3RydWN0dXJlLlxyXG4gICAgICAgIC8vIElEczogMD1TY2VuZUFzc2V0LCAxPVNjZW5lLCAyPUNhbnZhcywgMz1DYW1lcmEsIDQ9VUlUcmFuc2Zvcm0sXHJcbiAgICAgICAgLy8gICAgICA1PUNhbnZhcyBjb21wLCA2PVdpZGdldCwgNz1DYW1lcmEgY29tcCwgOD1TY2VuZUdsb2JhbHMsXHJcbiAgICAgICAgLy8gICAgICA5LTE2PUdsb2JhbHMgc3ViLW9iamVjdHNcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICAvLyAwOiBTY2VuZUFzc2V0XHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuU2NlbmVBc3NldCcsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgX25hdGl2ZTogJycsXHJcbiAgICAgICAgICAgICAgICBzY2VuZTogeyBfX2lkX186IDEgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTogU2NlbmUgcm9vdFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlNjZW5lJyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiBuYW1lLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBfcGFyZW50OiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2NoaWxkcmVuOiBbeyBfX2lkX186IDIgfV0sXHJcbiAgICAgICAgICAgICAgICBfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFtdLFxyXG4gICAgICAgICAgICAgICAgX3ByZWZhYjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9scG9zOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgICAgIF9scm90OiB7IF9fdHlwZV9fOiAnY2MuUXVhdCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDEgfSxcclxuICAgICAgICAgICAgICAgIF9sc2NhbGU6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogMSwgeTogMSwgejogMSB9LFxyXG4gICAgICAgICAgICAgICAgX21vYmlsaXR5OiAwLFxyXG4gICAgICAgICAgICAgICAgX2xheWVyOiAxMDczNzQxODI0LFxyXG4gICAgICAgICAgICAgICAgX2V1bGVyOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgICAgIGF1dG9SZWxlYXNlQXNzZXRzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9nbG9iYWxzOiB7IF9faWRfXzogOCB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyAyOiBDYW52YXMgbm9kZVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLk5vZGUnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICdDYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBfcGFyZW50OiB7IF9faWRfXzogMSB9LFxyXG4gICAgICAgICAgICAgICAgX2NoaWxkcmVuOiBbeyBfX2lkX186IDMgfV0sXHJcbiAgICAgICAgICAgICAgICBfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFt7IF9faWRfXzogNCB9LCB7IF9faWRfXzogNSB9LCB7IF9faWRfXzogNiB9XSxcclxuICAgICAgICAgICAgICAgIF9wcmVmYWI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfbHBvczogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiA2NDAsIHk6IDM2MCwgejogMCB9LFxyXG4gICAgICAgICAgICAgICAgX2xyb3Q6IHsgX190eXBlX186ICdjYy5RdWF0JywgeDogMCwgeTogMCwgejogMCwgdzogMSB9LFxyXG4gICAgICAgICAgICAgICAgX2xzY2FsZTogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAxLCB5OiAxLCB6OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfbW9iaWxpdHk6IDAsXHJcbiAgICAgICAgICAgICAgICBfbGF5ZXI6IDMzNTU0NDMyLFxyXG4gICAgICAgICAgICAgICAgX2V1bGVyOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMzogQ2FtZXJhIG5vZGVcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5Ob2RlJyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiAnQ2FtZXJhJyxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgX3BhcmVudDogeyBfX2lkX186IDIgfSxcclxuICAgICAgICAgICAgICAgIF9jaGlsZHJlbjogW10sXHJcbiAgICAgICAgICAgICAgICBfYWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFt7IF9faWRfXzogNyB9XSxcclxuICAgICAgICAgICAgICAgIF9wcmVmYWI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfbHBvczogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAwLCB5OiAwLCB6OiAxMDAwIH0sXHJcbiAgICAgICAgICAgICAgICBfbHJvdDogeyBfX3R5cGVfXzogJ2NjLlF1YXQnLCB4OiAwLCB5OiAwLCB6OiAwLCB3OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfbHNjYWxlOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDEsIHk6IDEsIHo6IDEgfSxcclxuICAgICAgICAgICAgICAgIF9tb2JpbGl0eTogMCxcclxuICAgICAgICAgICAgICAgIF9sYXllcjogMTA3Mzc0MTgyNCxcclxuICAgICAgICAgICAgICAgIF9ldWxlcjogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAwLCB5OiAwLCB6OiAwIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDQ6IFVJVHJhbnNmb3JtIG9uIENhbnZhc1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlVJVHJhbnNmb3JtJyxcclxuICAgICAgICAgICAgICAgIF9uYW1lOiAnJyxcclxuICAgICAgICAgICAgICAgIF9vYmpGbGFnczogMCxcclxuICAgICAgICAgICAgICAgIF9fZWRpdG9yRXh0cmFzX186IHt9LFxyXG4gICAgICAgICAgICAgICAgbm9kZTogeyBfX2lkX186IDIgfSxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgX2NvbnRlbnRTaXplOiB7IF9fdHlwZV9fOiAnY2MuU2l6ZScsIHdpZHRoOiAxMjgwLCBoZWlnaHQ6IDcyMCB9LFxyXG4gICAgICAgICAgICAgICAgX2FuY2hvclBvaW50OiB7IF9fdHlwZV9fOiAnY2MuVmVjMicsIHg6IDAuNSwgeTogMC41IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDU6IENhbnZhcyBjb21wb25lbnRcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5DYW52YXMnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICcnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBub2RlOiB7IF9faWRfXzogMiB9LFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfY2FtZXJhQ29tcG9uZW50OiB7IF9faWRfXzogNyB9LFxyXG4gICAgICAgICAgICAgICAgX2FsaWduQ2FudmFzV2l0aFNjcmVlbjogdHJ1ZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gNjogV2lkZ2V0IG9uIENhbnZhc1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLldpZGdldCcsXHJcbiAgICAgICAgICAgICAgICBfbmFtZTogJycsXHJcbiAgICAgICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXHJcbiAgICAgICAgICAgICAgICBfX2VkaXRvckV4dHJhc19fOiB7fSxcclxuICAgICAgICAgICAgICAgIG5vZGU6IHsgX19pZF9fOiAyIH0sXHJcbiAgICAgICAgICAgICAgICBfZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9hbGlnbkZsYWdzOiA0NSxcclxuICAgICAgICAgICAgICAgIF9sZWZ0OiAwLFxyXG4gICAgICAgICAgICAgICAgX3JpZ2h0OiAwLFxyXG4gICAgICAgICAgICAgICAgX3RvcDogMCxcclxuICAgICAgICAgICAgICAgIF9ib3R0b206IDAsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDc6IENhbWVyYSBjb21wb25lbnRcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5DYW1lcmEnLFxyXG4gICAgICAgICAgICAgICAgX25hbWU6ICcnLFxyXG4gICAgICAgICAgICAgICAgX29iakZsYWdzOiAwLFxyXG4gICAgICAgICAgICAgICAgX19lZGl0b3JFeHRyYXNfXzoge30sXHJcbiAgICAgICAgICAgICAgICBub2RlOiB7IF9faWRfXzogMyB9LFxyXG4gICAgICAgICAgICAgICAgX2VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfcHJvamVjdGlvbjogMCxcclxuICAgICAgICAgICAgICAgIF9wcmlvcml0eTogMTA3Mzc0MTgyNCxcclxuICAgICAgICAgICAgICAgIF9mb3Y6IDQ1LFxyXG4gICAgICAgICAgICAgICAgX2ZvdkF4aXM6IDAsXHJcbiAgICAgICAgICAgICAgICBfb3J0aG9IZWlnaHQ6IDM2MCxcclxuICAgICAgICAgICAgICAgIF9uZWFyOiAwLFxyXG4gICAgICAgICAgICAgICAgX2ZhcjogMjAwMCxcclxuICAgICAgICAgICAgICAgIF9jb2xvcjogeyBfX3R5cGVfXzogJ2NjLkNvbG9yJywgcjogMCwgZzogMCwgYjogMCwgYTogMjU1IH0sXHJcbiAgICAgICAgICAgICAgICBfZGVwdGg6IDEsXHJcbiAgICAgICAgICAgICAgICBfc3RlbmNpbDogMCxcclxuICAgICAgICAgICAgICAgIF9jbGVhckZsYWdzOiA2LFxyXG4gICAgICAgICAgICAgICAgX3JlY3Q6IHsgX190eXBlX186ICdjYy5SZWN0JywgeDogMCwgeTogMCwgd2lkdGg6IDEsIGhlaWdodDogMSB9LFxyXG4gICAgICAgICAgICAgICAgX3Zpc2liaWxpdHk6IDQxOTQzMDQwLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAvLyA4OiBTY2VuZUdsb2JhbHNcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5TY2VuZUdsb2JhbHMnLFxyXG4gICAgICAgICAgICAgICAgYW1iaWVudDogeyBfX2lkX186IDkgfSxcclxuICAgICAgICAgICAgICAgIHNoYWRvd3M6IHsgX19pZF9fOiAxMCB9LFxyXG4gICAgICAgICAgICAgICAgX3NreWJveDogeyBfX2lkX186IDExIH0sXHJcbiAgICAgICAgICAgICAgICBmb2c6IHsgX19pZF9fOiAxMiB9LFxyXG4gICAgICAgICAgICAgICAgb2N0cmVlOiB7IF9faWRfXzogMTMgfSxcclxuICAgICAgICAgICAgICAgIHNraW46IHsgX19pZF9fOiAxNCB9LFxyXG4gICAgICAgICAgICAgICAgbGlnaHRQcm9iZUluZm86IHsgX19pZF9fOiAxNSB9LFxyXG4gICAgICAgICAgICAgICAgcG9zdFNldHRpbmdzOiB7IF9faWRfXzogMTYgfSxcclxuICAgICAgICAgICAgICAgIGJha2VkV2l0aFN0YXRpb25hcnlNYWluTGlnaHQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgYmFrZWRXaXRoSGlnaHBMaWdodG1hcDogZmFsc2UsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDk6IEFtYmllbnRJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuQW1iaWVudEluZm8nLFxyXG4gICAgICAgICAgICAgICAgX3NreUNvbG9ySERSOiB7IF9fdHlwZV9fOiAnY2MuVmVjNCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDAuNTIwODMzMTI1IH0sXHJcbiAgICAgICAgICAgICAgICBfc2t5Q29sb3I6IHsgX190eXBlX186ICdjYy5WZWM0JywgeDogMCwgeTogMCwgejogMCwgdzogMC41MjA4MzMxMjUgfSxcclxuICAgICAgICAgICAgICAgIF9za3lJbGx1bUhEUjogMjAwMDAsXHJcbiAgICAgICAgICAgICAgICBfc2t5SWxsdW06IDIwMDAwLFxyXG4gICAgICAgICAgICAgICAgX2dyb3VuZEFsYmVkb0hEUjogeyBfX3R5cGVfXzogJ2NjLlZlYzQnLCB4OiAwLCB5OiAwLCB6OiAwLCB3OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBfZ3JvdW5kQWxiZWRvOiB7IF9fdHlwZV9fOiAnY2MuVmVjNCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDAgfSxcclxuICAgICAgICAgICAgICAgIF9za3lDb2xvckxEUjogeyBfX3R5cGVfXzogJ2NjLlZlYzQnLCB4OiAwLjIsIHk6IDAuNSwgejogMC44LCB3OiAxIH0sXHJcbiAgICAgICAgICAgICAgICBfc2t5SWxsdW1MRFI6IDIwMDAwLFxyXG4gICAgICAgICAgICAgICAgX2dyb3VuZEFsYmVkb0xEUjogeyBfX3R5cGVfXzogJ2NjLlZlYzQnLCB4OiAwLjIsIHk6IDAuMiwgejogMC4yLCB3OiAxIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDEwOiBTaGFkb3dzSW5mb1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlNoYWRvd3NJbmZvJyxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF90eXBlOiAwLFxyXG4gICAgICAgICAgICAgICAgX25vcm1hbDogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAwLCB5OiAxLCB6OiAwIH0sXHJcbiAgICAgICAgICAgICAgICBfZGlzdGFuY2U6IDAsXHJcbiAgICAgICAgICAgICAgICBfcGxhbmVCaWFzOiAxLFxyXG4gICAgICAgICAgICAgICAgX3NoYWRvd0NvbG9yOiB7IF9fdHlwZV9fOiAnY2MuQ29sb3InLCByOiA3NiwgZzogNzYsIGI6IDc2LCBhOiAyNTUgfSxcclxuICAgICAgICAgICAgICAgIF9tYXhSZWNlaXZlZDogNCxcclxuICAgICAgICAgICAgICAgIF9zaXplOiB7IF9fdHlwZV9fOiAnY2MuVmVjMicsIHg6IDUxMiwgeTogNTEyIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDExOiBTa3lib3hJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuU2t5Ym94SW5mbycsXHJcbiAgICAgICAgICAgICAgICBfZW52TGlnaHRpbmdUeXBlOiAwLFxyXG4gICAgICAgICAgICAgICAgX2Vudm1hcEhEUjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9lbnZtYXA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfZW52bWFwTERSOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2RpZmZ1c2VNYXBIRFI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfZGlmZnVzZU1hcExEUjogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF91c2VIRFI6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfZWRpdGFibGVNYXRlcmlhbDogbnVsbCxcclxuICAgICAgICAgICAgICAgIF9yZWZsZWN0aW9uSERSOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX3JlZmxlY3Rpb25MRFI6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBfcm90YXRpb25BbmdsZTogMCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTI6IEZvZ0luZm9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5Gb2dJbmZvJyxcclxuICAgICAgICAgICAgICAgIF90eXBlOiAwLFxyXG4gICAgICAgICAgICAgICAgX2ZvZ0NvbG9yOiB7IF9fdHlwZV9fOiAnY2MuQ29sb3InLCByOiAyMDAsIGc6IDIwMCwgYjogMjAwLCBhOiAyNTUgfSxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9mb2dEZW5zaXR5OiAwLjMsXHJcbiAgICAgICAgICAgICAgICBfZm9nU3RhcnQ6IDAuNSxcclxuICAgICAgICAgICAgICAgIF9mb2dFbmQ6IDMwMCxcclxuICAgICAgICAgICAgICAgIF9mb2dBdHRlbjogNSxcclxuICAgICAgICAgICAgICAgIF9mb2dUb3A6IDEuNSxcclxuICAgICAgICAgICAgICAgIF9mb2dSYW5nZTogMS4yLFxyXG4gICAgICAgICAgICAgICAgX2FjY3VyYXRlOiBmYWxzZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTM6IE9jdHJlZUluZm9cclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5PY3RyZWVJbmZvJyxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9taW5Qb3M6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogLTEwMjQsIHk6IC0xMDI0LCB6OiAtMTAyNCB9LFxyXG4gICAgICAgICAgICAgICAgX21heFBvczogeyBfX3R5cGVfXzogJ2NjLlZlYzMnLCB4OiAxMDI0LCB5OiAxMDI0LCB6OiAxMDI0IH0sXHJcbiAgICAgICAgICAgICAgICBfZGVwdGg6IDgsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDE0OiBTa2luSW5mb1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBfX3R5cGVfXzogJ2NjLlNraW5JbmZvJyxcclxuICAgICAgICAgICAgICAgIF9lbmFibGVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9ibHVyUmFkaXVzOiAwLjAxLFxyXG4gICAgICAgICAgICAgICAgX3Nzc0ludGVuc2l0eTogMyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgLy8gMTU6IExpZ2h0UHJvYmVJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuTGlnaHRQcm9iZUluZm8nLFxyXG4gICAgICAgICAgICAgICAgX2dpU2NhbGU6IDEsXHJcbiAgICAgICAgICAgICAgICBfZ2lTYW1wbGVzOiAxMDI0LFxyXG4gICAgICAgICAgICAgICAgX2JvdW5jZXM6IDIsXHJcbiAgICAgICAgICAgICAgICBfcmVkdWNlUmluZ2luZzogMCxcclxuICAgICAgICAgICAgICAgIF9zaG93UHJvYmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBfc2hvd1dpcmVmcmFtZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIF9zaG93Q29udmV4OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIF9kYXRhOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgX2xpZ2h0UHJvYmVTcGhlcmVWb2x1bWU6IDEsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIC8vIDE2OiBQb3N0U2V0dGluZ3NJbmZvXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuUG9zdFNldHRpbmdzSW5mbycsXHJcbiAgICAgICAgICAgICAgICBfdG9uZU1hcHBpbmdUeXBlOiAwLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcbn1cclxuIl19