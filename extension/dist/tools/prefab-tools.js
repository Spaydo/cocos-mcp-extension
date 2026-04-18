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
exports.PrefabTools = void 0;
const crypto_1 = require("crypto");
const fs = __importStar(require("fs"));
const EXTENSION_NAME = 'cocos-mcp-extension';
/** Generate a Cocos Creator-style fileId (22-char base64url) */
function generateFileId() {
    return (0, crypto_1.randomBytes)(16).toString('base64url').slice(0, 22);
}
class PrefabTools {
    getTools() {
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
    async execute(toolName, args) {
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
    async query(dbPath, uuid, maxDepth = 10) {
        var _a, _b;
        try {
            // Resolve asset info from path or uuid
            let assetInfo;
            if (uuid) {
                assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', uuid);
            }
            else if (dbPath) {
                assetInfo = await Editor.Message.request('asset-db', 'query-asset-info', dbPath);
            }
            else {
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
            const data = JSON.parse(content);
            if (!Array.isArray(data) || data.length === 0) {
                return { success: false, error: 'Invalid prefab format: expected JSON array' };
            }
            // Find root: cc.Prefab entry points to root node via data.__id__
            const prefabEntry = data.find((item) => item.__type__ === 'cc.Prefab');
            const rootNodeIdx = (_b = (_a = prefabEntry === null || prefabEntry === void 0 ? void 0 : prefabEntry.data) === null || _a === void 0 ? void 0 : _a.__id__) !== null && _b !== void 0 ? _b : 1; // fallback to index 1
            // Build hierarchy tree
            const tree = this.buildNodeTree(data, rootNodeIdx, 0, maxDepth);
            return {
                success: true,
                data: {
                    name: assetInfo.name || (prefabEntry === null || prefabEntry === void 0 ? void 0 : prefabEntry._name),
                    uuid: assetInfo.uuid,
                    url: assetInfo.url,
                    totalObjects: data.length,
                    hierarchy: tree,
                },
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    /** Recursively build node tree from prefab JSON array */
    buildNodeTree(data, nodeIdx, depth, maxDepth) {
        if (nodeIdx < 0 || nodeIdx >= data.length || depth > maxDepth)
            return null;
        const node = data[nodeIdx];
        if (!node)
            return null;
        // Extract components
        const components = [];
        if (node._components) {
            for (const ref of node._components) {
                const compIdx = ref === null || ref === void 0 ? void 0 : ref.__id__;
                if (compIdx != null && data[compIdx]) {
                    components.push(data[compIdx].__type__ || 'unknown');
                }
            }
        }
        // Extract basic properties
        const result = {
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
            const children = [];
            for (const childRef of node._children) {
                const childIdx = childRef === null || childRef === void 0 ? void 0 : childRef.__id__;
                if (childIdx != null) {
                    const child = this.buildNodeTree(data, childIdx, depth + 1, maxDepth);
                    if (child)
                        children.push(child);
                }
            }
            if (children.length > 0) {
                result.children = children;
            }
        }
        return result;
    }
    async list(filter) {
        try {
            const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: 'db://assets/**/*.prefab' });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: [] };
            }
            let prefabs = assets.map((a) => {
                var _a, _b;
                return ({
                    name: a.name || ((_b = (_a = a.url) === null || _a === void 0 ? void 0 : _a.split('/').pop()) === null || _b === void 0 ? void 0 : _b.replace('.prefab', '')),
                    uuid: a.uuid,
                    url: a.url || a.path,
                });
            });
            if (filter) {
                const lowerFilter = filter.toLowerCase();
                prefabs = prefabs.filter((p) => p.name.toLowerCase().includes(lowerFilter));
            }
            return { success: true, data: prefabs };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async instantiate(args) {
        try {
            // Use cc.instantiate() via scene script for proper prefab instance linking
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'instantiatePrefab',
                args: [args.assetUuid, args.parentUuid, args.name],
            });
            return result || { success: false, error: 'No result returned' };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async createEmpty(name, folderPath) {
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
            const result = await Editor.Message.request('asset-db', 'create-asset', prefabPath, prefabJson);
            return {
                success: true,
                data: { uuid: result === null || result === void 0 ? void 0 : result.uuid, path: prefabPath },
                message: `Empty prefab created: ${prefabPath}`,
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async restore(nodeUuid) {
        try {
            await Editor.Message.request('scene', 'restore-prefab', nodeUuid);
            return { success: true, message: `Prefab instance restored: ${nodeUuid}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async create(nodeUuid, path) {
        try {
            // Use Editor's built-in create-prefab API (runs in editor process, not scene script)
            await Editor.Message.request('scene', 'create-prefab', nodeUuid, path);
            // Verify the prefab was actually created (API doesn't throw on failure,
            // e.g. when trying to create from a node inside a prefab instance)
            const asset = await Editor.Message.request('asset-db', 'query-asset-info', path);
            if (!asset) {
                return { success: false, error: 'Prefab creation failed. Node may be inside a prefab instance.' };
            }
            return {
                success: true,
                data: { uuid: asset.uuid, path },
                message: `Prefab created: ${path}`,
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
}
exports.PrefabTools = PrefabTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmFiLXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3ByZWZhYi10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtQ0FBcUM7QUFDckMsdUNBQXlCO0FBSXpCLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDO0FBRTdDLGdFQUFnRTtBQUNoRSxTQUFTLGNBQWM7SUFDbkIsT0FBTyxJQUFBLG9CQUFXLEVBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDOUQsQ0FBQztBQUVELE1BQWEsV0FBVztJQUVwQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSw0RkFBNEY7Z0JBQ3pHLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsOERBQThELEVBQUU7d0JBQ3JHLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHlDQUF5QyxFQUFFO3dCQUNoRixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSw2QkFBNkIsRUFBRTtxQkFDM0U7aUJBQ0o7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxNQUFNO2dCQUNaLFdBQVcsRUFBRSxxRUFBcUU7Z0JBQ2xGLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsc0RBQXNELEVBQUU7cUJBQ2xHO2lCQUNKO2FBQ0o7WUFDRDtn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QUFRLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3RGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDVCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsK0RBQStELEVBQUUsQ0FBQztZQUN0RyxDQUFDO1lBQ0QsT0FBTztnQkFDSCxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUU7Z0JBQ2hDLE9BQU8sRUFBRSxtQkFBbUIsSUFBSSxFQUFFO2FBQ3JDLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0NBQ0o7QUFqVEQsa0NBaVRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcmFuZG9tQnl0ZXMgfSBmcm9tICdjcnlwdG8nO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmNvbnN0IEVYVEVOU0lPTl9OQU1FID0gJ2NvY29zLW1jcC1leHRlbnNpb24nO1xyXG5cclxuLyoqIEdlbmVyYXRlIGEgQ29jb3MgQ3JlYXRvci1zdHlsZSBmaWxlSWQgKDIyLWNoYXIgYmFzZTY0dXJsKSAqL1xyXG5mdW5jdGlvbiBnZW5lcmF0ZUZpbGVJZCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHJhbmRvbUJ5dGVzKDE2KS50b1N0cmluZygnYmFzZTY0dXJsJykuc2xpY2UoMCwgMjIpO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUHJlZmFiVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IHByZWZhYiBpbnRlcm5hbCBub2RlL2NvbXBvbmVudCBoaWVyYXJjaHkgKHJlYWRzIC5wcmVmYWIgZmlsZSwgZG9lcyBub3QgbW9kaWZ5IHNjZW5lKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdkYjovLyBwYXRoIHRvIHRoZSBwcmVmYWIsIGUuZy4gZGI6Ly9hc3NldHMvcHJlZmFicy9teS5wcmVmYWInIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJlZmFiIGFzc2V0IFVVSUQgKGFsdGVybmF0aXZlIHRvIHBhdGgpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYXhEZXB0aDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdNYXggdHJlZSBkZXB0aCAoZGVmYXVsdCAxMCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsaXN0JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgcHJlZmFiIGFzc2V0cyBpbiB0aGUgcHJvamVjdC4gVXNlIGZpbHRlciB0byBuYXJyb3cgcmVzdWx0cycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1N1YnN0cmluZyBmaWx0ZXIgZm9yIHByZWZhYiBuYW1lcyAoY2FzZS1pbnNlbnNpdGl2ZSknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdpbnN0YW50aWF0ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0luc3RhbnRpYXRlIGEgcHJlZmFiIGludG8gdGhlIHNjZW5lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJlZmFiIGFzc2V0IFVVSUQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUGFyZW50IG5vZGUgVVVJRCAoZGVmYXVsdDogc2NlbmUgcm9vdCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3ZlcnJpZGUgaW5zdGFuY2UgbmFtZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2Fzc2V0VXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2NyZWF0ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NyZWF0ZSBhIHByZWZhYiBmcm9tIGFuIGV4aXN0aW5nIHNjZW5lIG5vZGUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NvdXJjZSBub2RlIFVVSUQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnZGI6Ly8gcGF0aCBmb3IgdGhlIHByZWZhYiwgZS5nLiBkYjovL2Fzc2V0cy9wcmVmYWJzL215LnByZWZhYicgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ3BhdGgnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZXN0b3JlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmVzdG9yZSBhIHByZWZhYiBpbnN0YW5jZSBub2RlIHRvIGl0cyBvcmlnaW5hbCBwcmVmYWIgc3RhdGUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1ByZWZhYiBpbnN0YW5jZSBub2RlIFVVSUQgdG8gcmVzdG9yZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY3JlYXRlX2VtcHR5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIGEgbmV3IGVtcHR5IHByZWZhYiBhc3NldCBkaXJlY3RseSAobm8gc2NlbmUgbm9kZSBuZWVkZWQpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1ByZWZhYiBuYW1lJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ2RiOi8vIGZvbGRlciBwYXRoLCBlLmcuIGRiOi8vYXNzZXRzL3ByZWZhYnMnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyduYW1lJywgJ3BhdGgnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeSc6IHJldHVybiB0aGlzLnF1ZXJ5KGFyZ3MucGF0aCwgYXJncy51dWlkLCBhcmdzLm1heERlcHRoKTtcclxuICAgICAgICAgICAgY2FzZSAnbGlzdCc6IHJldHVybiB0aGlzLmxpc3QoYXJncy5maWx0ZXIpO1xyXG4gICAgICAgICAgICBjYXNlICdpbnN0YW50aWF0ZSc6IHJldHVybiB0aGlzLmluc3RhbnRpYXRlKGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOiByZXR1cm4gdGhpcy5jcmVhdGUoYXJncy5ub2RlVXVpZCwgYXJncy5wYXRoKTtcclxuICAgICAgICAgICAgY2FzZSAnY3JlYXRlX2VtcHR5JzogcmV0dXJuIHRoaXMuY3JlYXRlRW1wdHkoYXJncy5uYW1lLCBhcmdzLnBhdGgpO1xyXG4gICAgICAgICAgICBjYXNlICdyZXN0b3JlJzogcmV0dXJuIHRoaXMucmVzdG9yZShhcmdzLm5vZGVVdWlkKTtcclxuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBwcmVmYWIgdG9vbDogJHt0b29sTmFtZX1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBRdWVyeTogcmVhZCBwcmVmYWIgZmlsZSBhbmQgcGFyc2UgaGllcmFyY2h5ID09PVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnkoZGJQYXRoPzogc3RyaW5nLCB1dWlkPzogc3RyaW5nLCBtYXhEZXB0aDogbnVtYmVyID0gMTApOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFJlc29sdmUgYXNzZXQgaW5mbyBmcm9tIHBhdGggb3IgdXVpZFxyXG4gICAgICAgICAgICBsZXQgYXNzZXRJbmZvOiBhbnk7XHJcbiAgICAgICAgICAgIGlmICh1dWlkKSB7XHJcbiAgICAgICAgICAgICAgICBhc3NldEluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgdXVpZCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZGJQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICBhc3NldEluZm8gPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgZGJQYXRoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1Byb3ZpZGUgZWl0aGVyIFwicGF0aFwiIChkYjovLyBwYXRoKSBvciBcInV1aWRcIicgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFhc3NldEluZm8pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFByZWZhYiBub3QgZm91bmQ6ICR7ZGJQYXRoIHx8IHV1aWR9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBSZWFkIHRoZSAucHJlZmFiIGZpbGUgKEpTT04gYXJyYXkpXHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gYXNzZXRJbmZvLmZpbGUgfHwgYXNzZXRJbmZvLnNvdXJjZTtcclxuICAgICAgICAgICAgaWYgKCFmaWxlUGF0aCB8fCAhZnMuZXhpc3RzU3luYyhmaWxlUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFByZWZhYiBzb3VyY2UgZmlsZSBub3QgYWNjZXNzaWJsZTogJHtmaWxlUGF0aH1gIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGY4Jyk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGE6IGFueVtdID0gSlNPTi5wYXJzZShjb250ZW50KTtcclxuXHJcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShkYXRhKSB8fCBkYXRhLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnSW52YWxpZCBwcmVmYWIgZm9ybWF0OiBleHBlY3RlZCBKU09OIGFycmF5JyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBGaW5kIHJvb3Q6IGNjLlByZWZhYiBlbnRyeSBwb2ludHMgdG8gcm9vdCBub2RlIHZpYSBkYXRhLl9faWRfX1xyXG4gICAgICAgICAgICBjb25zdCBwcmVmYWJFbnRyeSA9IGRhdGEuZmluZCgoaXRlbTogYW55KSA9PiBpdGVtLl9fdHlwZV9fID09PSAnY2MuUHJlZmFiJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJvb3ROb2RlSWR4ID0gcHJlZmFiRW50cnk/LmRhdGE/Ll9faWRfXyA/PyAxOyAvLyBmYWxsYmFjayB0byBpbmRleCAxXHJcblxyXG4gICAgICAgICAgICAvLyBCdWlsZCBoaWVyYXJjaHkgdHJlZVxyXG4gICAgICAgICAgICBjb25zdCB0cmVlID0gdGhpcy5idWlsZE5vZGVUcmVlKGRhdGEsIHJvb3ROb2RlSWR4LCAwLCBtYXhEZXB0aCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBhc3NldEluZm8ubmFtZSB8fCBwcmVmYWJFbnRyeT8uX25hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogYXNzZXRJbmZvLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgdXJsOiBhc3NldEluZm8udXJsLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsT2JqZWN0czogZGF0YS5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgaGllcmFyY2h5OiB0cmVlLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKiBSZWN1cnNpdmVseSBidWlsZCBub2RlIHRyZWUgZnJvbSBwcmVmYWIgSlNPTiBhcnJheSAqL1xyXG4gICAgcHJpdmF0ZSBidWlsZE5vZGVUcmVlKGRhdGE6IGFueVtdLCBub2RlSWR4OiBudW1iZXIsIGRlcHRoOiBudW1iZXIsIG1heERlcHRoOiBudW1iZXIpOiBhbnkge1xyXG4gICAgICAgIGlmIChub2RlSWR4IDwgMCB8fCBub2RlSWR4ID49IGRhdGEubGVuZ3RoIHx8IGRlcHRoID4gbWF4RGVwdGgpIHJldHVybiBudWxsO1xyXG4gICAgICAgIGNvbnN0IG5vZGUgPSBkYXRhW25vZGVJZHhdO1xyXG4gICAgICAgIGlmICghbm9kZSkgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3QgY29tcG9uZW50c1xyXG4gICAgICAgIGNvbnN0IGNvbXBvbmVudHM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgaWYgKG5vZGUuX2NvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCByZWYgb2Ygbm9kZS5fY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY29tcElkeCA9IHJlZj8uX19pZF9fO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNvbXBJZHggIT0gbnVsbCAmJiBkYXRhW2NvbXBJZHhdKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50cy5wdXNoKGRhdGFbY29tcElkeF0uX190eXBlX18gfHwgJ3Vua25vd24nKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBiYXNpYyBwcm9wZXJ0aWVzXHJcbiAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSB7XHJcbiAgICAgICAgICAgIG5hbWU6IG5vZGUuX25hbWUgfHwgJ3VubmFtZWQnLFxyXG4gICAgICAgICAgICBhY3RpdmU6IG5vZGUuX2FjdGl2ZSAhPT0gZmFsc2UsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgaWYgKGNvbXBvbmVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByZXN1bHQuY29tcG9uZW50cyA9IGNvbXBvbmVudHM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBQb3NpdGlvbiAoaWYgbm9uLXplcm8pXHJcbiAgICAgICAgaWYgKG5vZGUuX2xwb3MgJiYgKG5vZGUuX2xwb3MueCB8fCBub2RlLl9scG9zLnkgfHwgbm9kZS5fbHBvcy56KSkge1xyXG4gICAgICAgICAgICByZXN1bHQucG9zaXRpb24gPSB7IHg6IG5vZGUuX2xwb3MueCwgeTogbm9kZS5fbHBvcy55LCB6OiBub2RlLl9scG9zLnogfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlY3Vyc2UgY2hpbGRyZW5cclxuICAgICAgICBpZiAobm9kZS5fY2hpbGRyZW4gJiYgbm9kZS5fY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBjaGlsZHJlbjogYW55W10gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZFJlZiBvZiBub2RlLl9jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJZHggPSBjaGlsZFJlZj8uX19pZF9fO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNoaWxkSWR4ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjaGlsZCA9IHRoaXMuYnVpbGROb2RlVHJlZShkYXRhLCBjaGlsZElkeCwgZGVwdGggKyAxLCBtYXhEZXB0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNoaWxkKSBjaGlsZHJlbi5wdXNoKGNoaWxkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0LmNoaWxkcmVuID0gY2hpbGRyZW47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0KGZpbHRlcj86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgYXNzZXRzOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCB7IHBhdHRlcm46ICdkYjovL2Fzc2V0cy8qKi8qLnByZWZhYicgfSk7XHJcbiAgICAgICAgICAgIGlmICghYXNzZXRzIHx8ICFBcnJheS5pc0FycmF5KGFzc2V0cykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IFtdIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IHByZWZhYnMgPSBhc3NldHMubWFwKChhOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBhLm5hbWUgfHwgYS51cmw/LnNwbGl0KCcvJykucG9wKCk/LnJlcGxhY2UoJy5wcmVmYWInLCAnJyksXHJcbiAgICAgICAgICAgICAgICB1dWlkOiBhLnV1aWQsXHJcbiAgICAgICAgICAgICAgICB1cmw6IGEudXJsIHx8IGEucGF0aCxcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICBpZiAoZmlsdGVyKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb3dlckZpbHRlciA9IGZpbHRlci50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICAgICAgcHJlZmFicyA9IHByZWZhYnMuZmlsdGVyKChwOiBhbnkpID0+IHAubmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyRmlsdGVyKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcHJlZmFicyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBpbnN0YW50aWF0ZShhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFVzZSBjYy5pbnN0YW50aWF0ZSgpIHZpYSBzY2VuZSBzY3JpcHQgZm9yIHByb3BlciBwcmVmYWIgaW5zdGFuY2UgbGlua2luZ1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdpbnN0YW50aWF0ZVByZWZhYicsXHJcbiAgICAgICAgICAgICAgICBhcmdzOiBbYXJncy5hc3NldFV1aWQsIGFyZ3MucGFyZW50VXVpZCwgYXJncy5uYW1lXSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyByZXN1bHQgcmV0dXJuZWQnIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZUVtcHR5KG5hbWU6IHN0cmluZywgZm9sZGVyUGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBwcmVmYWJQYXRoID0gYCR7Zm9sZGVyUGF0aH0vJHtuYW1lfS5wcmVmYWJgO1xyXG4gICAgICAgICAgICBjb25zdCBwcmVmYWJKc29uID0gSlNPTi5zdHJpbmdpZnkoW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuUHJlZmFiJyxcclxuICAgICAgICAgICAgICAgICAgICBfbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgX25hdGl2ZTogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBfX2lkX186IDEgfSxcclxuICAgICAgICAgICAgICAgICAgICBvcHRpbWl6YXRpb25Qb2xpY3k6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmNMb2FkQXNzZXRzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBwZXJzaXN0ZW50OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgX190eXBlX186ICdjYy5Ob2RlJyxcclxuICAgICAgICAgICAgICAgICAgICBfbmFtZTogbmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBfb2JqRmxhZ3M6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgX3BhcmVudDogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBfY2hpbGRyZW46IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIF9hY3RpdmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgX2NvbXBvbmVudHM6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIF9wcmVmYWI6IHsgX19pZF9fOiAyIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgX2xwb3M6IHsgX190eXBlX186ICdjYy5WZWMzJywgeDogMCwgeTogMCwgejogMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgIF9scm90OiB7IF9fdHlwZV9fOiAnY2MuUXVhdCcsIHg6IDAsIHk6IDAsIHo6IDAsIHc6IDEgfSxcclxuICAgICAgICAgICAgICAgICAgICBfbHNjYWxlOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDEsIHk6IDEsIHo6IDEgfSxcclxuICAgICAgICAgICAgICAgICAgICBfbGF5ZXI6IDEwNzM3NDE4MjQsXHJcbiAgICAgICAgICAgICAgICAgICAgX2V1bGVyOiB7IF9fdHlwZV9fOiAnY2MuVmVjMycsIHg6IDAsIHk6IDAsIHo6IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICBfaWQ6IGdlbmVyYXRlRmlsZUlkKCksXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgIF9fdHlwZV9fOiAnY2MuUHJlZmFiSW5mbycsXHJcbiAgICAgICAgICAgICAgICAgICAgcm9vdDogeyBfX2lkX186IDEgfSxcclxuICAgICAgICAgICAgICAgICAgICBhc3NldDogeyBfX2lkX186IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICBmaWxlSWQ6IGdlbmVyYXRlRmlsZUlkKCksXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBdKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAnY3JlYXRlLWFzc2V0JywgcHJlZmFiUGF0aCwgcHJlZmFiSnNvbik7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiByZXN1bHQ/LnV1aWQsIHBhdGg6IHByZWZhYlBhdGggfSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBFbXB0eSBwcmVmYWIgY3JlYXRlZDogJHtwcmVmYWJQYXRofWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlc3RvcmUobm9kZVV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncmVzdG9yZS1wcmVmYWInLCBub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBQcmVmYWIgaW5zdGFuY2UgcmVzdG9yZWQ6ICR7bm9kZVV1aWR9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGUobm9kZVV1aWQ6IHN0cmluZywgcGF0aDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAvLyBVc2UgRWRpdG9yJ3MgYnVpbHQtaW4gY3JlYXRlLXByZWZhYiBBUEkgKHJ1bnMgaW4gZWRpdG9yIHByb2Nlc3MsIG5vdCBzY2VuZSBzY3JpcHQpXHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1wcmVmYWInLCBub2RlVXVpZCwgcGF0aCk7XHJcblxyXG4gICAgICAgICAgICAvLyBWZXJpZnkgdGhlIHByZWZhYiB3YXMgYWN0dWFsbHkgY3JlYXRlZCAoQVBJIGRvZXNuJ3QgdGhyb3cgb24gZmFpbHVyZSxcclxuICAgICAgICAgICAgLy8gZS5nLiB3aGVuIHRyeWluZyB0byBjcmVhdGUgZnJvbSBhIG5vZGUgaW5zaWRlIGEgcHJlZmFiIGluc3RhbmNlKVxyXG4gICAgICAgICAgICBjb25zdCBhc3NldDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHBhdGgpO1xyXG4gICAgICAgICAgICBpZiAoIWFzc2V0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcmVmYWIgY3JlYXRpb24gZmFpbGVkLiBOb2RlIG1heSBiZSBpbnNpZGUgYSBwcmVmYWIgaW5zdGFuY2UuJyB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiBhc3NldC51dWlkLCBwYXRoIH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUHJlZmFiIGNyZWF0ZWQ6ICR7cGF0aH1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuIl19