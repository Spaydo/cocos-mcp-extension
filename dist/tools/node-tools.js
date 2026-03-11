"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTools = void 0;
const EXTENSION_NAME = 'cocos-mcp-extension';
class NodeTools {
    getTools() {
        return [
            {
                name: 'query',
                description: 'Query node by UUID, name, or list all nodes. Use includeComponents for detailed component info in one call',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Node UUID for detailed info' },
                        name: { type: 'string', description: 'Search by name' },
                        listAll: { type: 'boolean', description: 'List all nodes (compact: uuid, name, parent)' },
                        includeComponents: { type: 'boolean', description: 'Include detailed component properties (only with uuid)' },
                        verbose: { type: 'boolean', description: 'Include readonly props and default values in component details' },
                    },
                },
            },
            {
                name: 'create',
                description: 'Create a new node with optional transform, components, and prefab instantiation in one call',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        parentUuid: { type: 'string', description: 'Parent node UUID (default: scene root)' },
                        type: { type: 'string', description: 'Node/2DNode/3DNode' },
                        assetUuid: { type: 'string', description: 'Prefab UUID to instantiate (uses cc.instantiate for proper prefab linking)' },
                        position: { type: 'object', description: '{x, y, z}' },
                        rotation: { type: 'object', description: '{x, y, z} euler angles' },
                        scale: { type: 'object', description: '{x, y, z}' },
                        components: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Component types to add, e.g. ["cc.Sprite", "cc.Button"]',
                        },
                    },
                    required: ['name'],
                },
            },
            {
                name: 'delete',
                description: 'Delete a node from the scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string' },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'set_property',
                description: 'Set one or multiple node properties at once. Use "properties" for batch, or "property"+"value" for single',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string' },
                        property: { type: 'string', description: 'Single mode: name, active, position, rotation, scale, layer' },
                        value: { description: 'Single mode: property value. For transforms use {x,y,z}' },
                        properties: {
                            type: 'object',
                            description: 'Batch mode: { position: {x,y,z}, scale: {x,y,z}, active: true, name: "NewName" }',
                        },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'duplicate',
                description: 'Duplicate a node (copy + paste)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Node UUID to duplicate' },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'reset_transform',
                description: 'Reset node position/rotation/scale to defaults',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string' },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'find_by_asset',
                description: 'Find all nodes using a specific asset UUID',
                inputSchema: {
                    type: 'object',
                    properties: {
                        assetUuid: { type: 'string', description: 'Asset UUID to search for' },
                    },
                    required: ['assetUuid'],
                },
            },
            {
                name: 'move',
                description: 'Move node to a new parent',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string' },
                        parentUuid: { type: 'string' },
                        siblingIndex: { type: 'number', description: 'Position among siblings (optional)' },
                    },
                    required: ['uuid', 'parentUuid'],
                },
            },
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'query': return this.query(args);
            case 'create': return this.createNode(args);
            case 'delete': return this.deleteNode(args.uuid);
            case 'set_property': return this.setPropertyDispatch(args);
            case 'duplicate': return this.duplicateNode(args.uuid);
            case 'reset_transform': return this.resetTransform(args.uuid);
            case 'find_by_asset': return this.findByAsset(args.assetUuid);
            case 'move': return this.moveNode(args.uuid, args.parentUuid, args.siblingIndex);
            default: return { success: false, error: `Unknown node tool: ${toolName}` };
        }
    }
    // === Tool Implementations ===
    async query(args) {
        if (args.uuid) {
            const result = await this.getNodeInfo(args.uuid);
            if (result.success && args.includeComponents) {
                result.data.componentDetails = await this.getComponentDetails(args.uuid, !!args.verbose);
            }
            return result;
        }
        if (args.name) {
            return this.findByName(args.name);
        }
        if (args.listAll) {
            return this.listAll();
        }
        return { success: false, error: 'Provide uuid, name, or listAll' };
    }
    async getComponentDetails(nodeUuid, verbose = false) {
        try {
            const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeData || !nodeData.__comps__)
                return [];
            return nodeData.__comps__.map((comp) => this.extractCompact(comp, verbose));
        }
        catch (_a) {
            return [];
        }
    }
    /** Extract compact component info: only visible, non-internal, non-default properties. */
    extractCompact(comp, verbose = false) {
        var _a, _b, _c;
        const info = {
            type: comp.type || comp.__type__ || comp.cid || 'unknown',
            enabled: (_c = (_b = (_a = comp.enabled) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : comp.enabled) !== null && _c !== void 0 ? _c : true,
            properties: {},
        };
        // comp.value holds per-property metadata; fall back to comp itself
        const source = comp.value || comp;
        const skipKeys = new Set([
            '__type__', 'type', 'cid', '_name', '_objFlags', 'node', '__prefab', 'fileId',
            'uuid', 'name', 'enabled', '_enabled', '__scriptAsset',
        ]);
        for (const [key, meta] of Object.entries(source)) {
            if (skipKeys.has(key))
                continue;
            if (key.startsWith('_'))
                continue;
            if (key.startsWith('editor'))
                continue; // skip editor-only display duplicates
            const m = meta;
            if (!m || typeof m !== 'object')
                continue;
            if (m.visible === false)
                continue;
            if (!verbose && m.readonly === true)
                continue;
            if (!verbose && 'value' in m && 'default' in m && this.valueEquals(m.value, m.default))
                continue;
            if ('value' in m) {
                info.properties[key] = m.value;
            }
        }
        return info;
    }
    /** Deep equality check for property values. */
    valueEquals(a, b) {
        if (a === b)
            return true;
        if (a == null || b == null)
            return false;
        if (typeof a !== typeof b)
            return false;
        if (typeof a !== 'object')
            return false;
        const ka = Object.keys(a);
        const kb = Object.keys(b);
        if (ka.length !== kb.length)
            return false;
        return ka.every(k => this.valueEquals(a[k], b[k]));
    }
    async getNodeInfo(uuid) {
        try {
            const nodeData = await Editor.Message.request('scene', 'query-node', uuid);
            if (!nodeData) {
                return { success: false, error: `Node not found: ${uuid}` };
            }
            return { success: true, data: this.parseNodeData(nodeData, uuid) };
        }
        catch (_a) {
            // Fallback: scene script
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'getNodeInfo',
                    args: [uuid],
                });
                return result || { success: false, error: 'No data returned' };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
    }
    async findByName(name) {
        try {
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return { success: false, error: 'No scene tree available' };
            }
            const results = [];
            this.searchTree(tree, name, '', results);
            if (results.length === 0) {
                return { success: false, error: `No node found with name: ${name}` };
            }
            return { success: true, data: results };
        }
        catch (_a) {
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'findNodeByName',
                    args: [name],
                });
                return result || { success: false, error: 'No data returned' };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
    }
    async listAll() {
        try {
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return { success: false, error: 'No scene tree available' };
            }
            const nodes = [];
            this.collectNodes(tree, nodes);
            return { success: true, data: { totalNodes: nodes.length, nodes } };
        }
        catch (_a) {
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'getAllNodes',
                    args: [],
                });
                return result || { success: false, error: 'No data returned' };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
    }
    async createNode(args) {
        try {
            let parentUuid = args.parentUuid;
            let nodeUuid;
            let nodeName = args.name;
            // If no parent specified, get scene root
            if (!parentUuid) {
                try {
                    const tree = await Editor.Message.request('scene', 'query-node-tree');
                    parentUuid = tree === null || tree === void 0 ? void 0 : tree.uuid;
                }
                catch (_a) {
                    const sceneInfo = await Editor.Message.request('scene', 'query-current-scene');
                    parentUuid = sceneInfo === null || sceneInfo === void 0 ? void 0 : sceneInfo.uuid;
                }
            }
            if (!parentUuid) {
                return { success: false, error: 'Cannot determine scene root' };
            }
            // If assetUuid is provided, use cc.instantiate via scene script for proper prefab linking
            if (args.assetUuid) {
                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'instantiatePrefab',
                    args: [args.assetUuid, parentUuid, args.name],
                });
                if (!result || !result.success) {
                    return result || { success: false, error: 'Prefab instantiation failed' };
                }
                nodeUuid = result.data.uuid;
                nodeName = result.data.name;
            }
            else {
                // Standard node creation
                const options = {
                    parent: parentUuid,
                    name: args.name,
                };
                if (args.type) {
                    options.type = args.type;
                }
                nodeUuid = await Editor.Message.request('scene', 'create-node', options);
            }
            const applied = [];
            // Apply transform properties if provided
            if (args.position) {
                await this.setProperty(nodeUuid, 'position', args.position);
                applied.push('position');
            }
            if (args.rotation) {
                await this.setProperty(nodeUuid, 'rotation', args.rotation);
                applied.push('rotation');
            }
            if (args.scale) {
                await this.setProperty(nodeUuid, 'scale', args.scale);
                applied.push('scale');
            }
            // Add components if provided
            if (args.components && Array.isArray(args.components)) {
                for (const compType of args.components) {
                    try {
                        await Editor.Message.request('scene', 'create-component', {
                            uuid: nodeUuid,
                            component: compType,
                        });
                        applied.push(`+${compType}`);
                    }
                    catch (err) {
                        applied.push(`!${compType}(${err.message})`);
                    }
                }
            }
            return {
                success: true,
                data: { uuid: nodeUuid, name: nodeName, applied },
                message: `Node created: ${nodeName}` + (applied.length ? ` [${applied.join(', ')}]` : ''),
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async deleteNode(uuid) {
        try {
            await Editor.Message.request('scene', 'remove-node', { uuid });
            return { success: true, message: `Node deleted: ${uuid}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    // Dispatch: single property or batch properties
    async setPropertyDispatch(args) {
        const { uuid } = args;
        // Batch mode
        if (args.properties && typeof args.properties === 'object') {
            const results = [];
            const errors = [];
            for (const [prop, val] of Object.entries(args.properties)) {
                const r = await this.setProperty(uuid, prop, val);
                if (r.success) {
                    results.push(prop);
                }
                else {
                    errors.push(`${prop}: ${r.error}`);
                }
            }
            if (errors.length > 0) {
                return {
                    success: results.length > 0,
                    message: `Set: [${results.join(', ')}]` + (errors.length ? ` Errors: [${errors.join('; ')}]` : ''),
                };
            }
            return { success: true, message: `Set: [${results.join(', ')}] on ${uuid}` };
        }
        // Single mode (backward compatible)
        if (args.property !== undefined && args.value !== undefined) {
            return this.setProperty(uuid, args.property, args.value);
        }
        return { success: false, error: 'Provide "property"+"value" or "properties" object' };
    }
    async setProperty(uuid, property, value) {
        // Map common property names to Editor API paths
        const propertyMap = {
            position: 'position',
            rotation: 'euler', // use euler angles for rotation
            scale: 'scale',
            name: 'name',
            active: 'active',
            layer: 'layer',
        };
        const editorPath = propertyMap[property] || property;
        try {
            // For transform properties, set sub-properties
            if (property === 'position' || property === 'rotation' || property === 'scale') {
                const vecValue = typeof value === 'object' ? value : { x: 0, y: 0, z: 0 };
                await Editor.Message.request('scene', 'set-property', {
                    uuid,
                    path: editorPath,
                    dump: { value: vecValue },
                });
            }
            else {
                await Editor.Message.request('scene', 'set-property', {
                    uuid,
                    path: editorPath,
                    dump: { value },
                });
            }
            return { success: true, message: `Set ${property} on ${uuid}` };
        }
        catch (_a) {
            // Fallback: scene script
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'setNodeProperty',
                    args: [uuid, property, value],
                });
                return result || { success: false, error: 'Failed to set property' };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
    }
    async moveNode(uuid, parentUuid, siblingIndex) {
        try {
            const options = {
                parent: parentUuid,
                uuids: [uuid],
                keepWorldTransform: false,
            };
            await Editor.Message.request('scene', 'set-parent', options);
            if (siblingIndex !== undefined) {
                // Set sibling index after reparenting
                await Editor.Message.request('scene', 'set-property', {
                    uuid,
                    path: 'siblingIndex',
                    dump: { value: siblingIndex },
                });
            }
            return { success: true, message: `Moved node ${uuid} to parent ${parentUuid}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async duplicateNode(uuid) {
        try {
            const result = await Editor.Message.request('scene', 'duplicate-node', [uuid]);
            return {
                success: true,
                data: { duplicatedUuids: result },
                message: `Node duplicated: ${uuid}`,
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async resetTransform(uuid) {
        try {
            await Editor.Message.request('scene', 'reset-node', { uuid });
            return { success: true, message: `Transform reset on node ${uuid}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async findByAsset(assetUuid) {
        try {
            const result = await Editor.Message.request('scene', 'query-nodes-by-asset-uuid', assetUuid);
            return { success: true, data: result || [] };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    // === Helpers ===
    parseNodeData(data, uuid) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
        const info = {
            uuid,
            name: (_c = (_b = (_a = data.name) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : data.name) !== null && _c !== void 0 ? _c : 'unknown',
            active: (_f = (_e = (_d = data.active) === null || _d === void 0 ? void 0 : _d.value) !== null && _e !== void 0 ? _e : data.active) !== null && _f !== void 0 ? _f : true,
        };
        // Extract position
        if ((_g = data.position) === null || _g === void 0 ? void 0 : _g.value) {
            const p = data.position.value;
            info.position = { x: (_h = p.x) !== null && _h !== void 0 ? _h : 0, y: (_j = p.y) !== null && _j !== void 0 ? _j : 0, z: (_k = p.z) !== null && _k !== void 0 ? _k : 0 };
        }
        // Extract rotation (euler)
        if ((_l = data.euler) === null || _l === void 0 ? void 0 : _l.value) {
            const r = data.euler.value;
            info.rotation = { x: (_m = r.x) !== null && _m !== void 0 ? _m : 0, y: (_o = r.y) !== null && _o !== void 0 ? _o : 0, z: (_p = r.z) !== null && _p !== void 0 ? _p : 0 };
        }
        // Extract scale
        if ((_q = data.scale) === null || _q === void 0 ? void 0 : _q.value) {
            const s = data.scale.value;
            info.scale = { x: (_r = s.x) !== null && _r !== void 0 ? _r : 1, y: (_s = s.y) !== null && _s !== void 0 ? _s : 1, z: (_t = s.z) !== null && _t !== void 0 ? _t : 1 };
        }
        // Extract parent (just UUID)
        if (data.parent) {
            const parentUuid = (_y = (_w = (_v = (_u = data.parent) === null || _u === void 0 ? void 0 : _u.value) === null || _v === void 0 ? void 0 : _v.uuid) !== null && _w !== void 0 ? _w : (_x = data.parent) === null || _x === void 0 ? void 0 : _x.uuid) !== null && _y !== void 0 ? _y : data.parent;
            if (parentUuid)
                info.parentUuid = typeof parentUuid === 'string' ? parentUuid : parentUuid;
        }
        // Extract children (just UUIDs)
        if (data.children) {
            const kids = Array.isArray(data.children) ? data.children : [];
            info.children = kids.map((c) => { var _a, _b, _c; return (_c = (_b = (_a = c === null || c === void 0 ? void 0 : c.value) === null || _a === void 0 ? void 0 : _a.uuid) !== null && _b !== void 0 ? _b : c === null || c === void 0 ? void 0 : c.uuid) !== null && _c !== void 0 ? _c : c; });
        }
        // Extract layer
        if (((_z = data.layer) === null || _z === void 0 ? void 0 : _z.value) !== undefined) {
            info.layer = data.layer.value;
        }
        // Extract components (compact)
        if (data.__comps__) {
            info.components = data.__comps__.map((c) => {
                var _a, _b, _c;
                return ({
                    type: c.type || c.__type__ || c.cid || 'unknown',
                    enabled: (_c = (_b = (_a = c.enabled) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : c.enabled) !== null && _c !== void 0 ? _c : true,
                });
            });
        }
        return info;
    }
    searchTree(node, targetName, path, results) {
        const currentPath = path ? `${path}/${node.name}` : node.name;
        if (node.name === targetName) {
            results.push({ uuid: node.uuid, name: node.name, path: currentPath });
        }
        if (node.children) {
            for (const child of node.children) {
                this.searchTree(child, targetName, currentPath, results);
            }
        }
    }
    collectNodes(node, results) {
        results.push({
            uuid: node.uuid,
            name: node.name,
            active: node.active !== false,
        });
        if (node.children) {
            for (const child of node.children) {
                this.collectNodes(child, results);
            }
        }
    }
}
exports.NodeTools = NodeTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9ub2RlLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDO0FBRTdDLE1BQWEsU0FBUztJQUVsQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSw0R0FBNEc7Z0JBQ3pILFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsNkJBQTZCLEVBQUU7d0JBQ3BFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFO3dCQUN2RCxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSw4Q0FBOEMsRUFBRTt3QkFDekYsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSx3REFBd0QsRUFBRTt3QkFDN0csT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsZ0VBQWdFLEVBQUU7cUJBQzlHO2lCQUNKO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsNkZBQTZGO2dCQUMxRyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7d0JBQ3hCLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdDQUF3QyxFQUFFO3dCQUNyRixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxvQkFB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UUFBUSxFQUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBOWtCRCw4QkE4a0JDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuY29uc3QgRVhURU5TSU9OX05BTUUgPSAnY29jb3MtbWNwLWV4dGVuc2lvbic7XHJcblxyXG5leHBvcnQgY2xhc3MgTm9kZVRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdRdWVyeSBub2RlIGJ5IFVVSUQsIG5hbWUsIG9yIGxpc3QgYWxsIG5vZGVzLiBVc2UgaW5jbHVkZUNvbXBvbmVudHMgZm9yIGRldGFpbGVkIGNvbXBvbmVudCBpbmZvIGluIG9uZSBjYWxsJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCBmb3IgZGV0YWlsZWQgaW5mbycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTZWFyY2ggYnkgbmFtZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGlzdEFsbDogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgbm9kZXMgKGNvbXBhY3Q6IHV1aWQsIG5hbWUsIHBhcmVudCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluY2x1ZGVDb21wb25lbnRzOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdJbmNsdWRlIGRldGFpbGVkIGNvbXBvbmVudCBwcm9wZXJ0aWVzIChvbmx5IHdpdGggdXVpZCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmJvc2U6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgcmVhZG9ubHkgcHJvcHMgYW5kIGRlZmF1bHQgdmFsdWVzIGluIGNvbXBvbmVudCBkZXRhaWxzJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY3JlYXRlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIGEgbmV3IG5vZGUgd2l0aCBvcHRpb25hbCB0cmFuc2Zvcm0sIGNvbXBvbmVudHMsIGFuZCBwcmVmYWIgaW5zdGFudGlhdGlvbiBpbiBvbmUgY2FsbCcsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1BhcmVudCBub2RlIFVVSUQgKGRlZmF1bHQ6IHNjZW5lIHJvb3QpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05vZGUvMkROb2RlLzNETm9kZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1ByZWZhYiBVVUlEIHRvIGluc3RhbnRpYXRlICh1c2VzIGNjLmluc3RhbnRpYXRlIGZvciBwcm9wZXIgcHJlZmFiIGxpbmtpbmcpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogeyB0eXBlOiAnb2JqZWN0JywgZGVzY3JpcHRpb246ICd7eCwgeSwgen0nIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uOiB7IHR5cGU6ICdvYmplY3QnLCBkZXNjcmlwdGlvbjogJ3t4LCB5LCB6fSBldWxlciBhbmdsZXMnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNjYWxlOiB7IHR5cGU6ICdvYmplY3QnLCBkZXNjcmlwdGlvbjogJ3t4LCB5LCB6fScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50czoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlcyB0byBhZGQsIGUuZy4gW1wiY2MuU3ByaXRlXCIsIFwiY2MuQnV0dG9uXCJdJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25hbWUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdkZWxldGUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEZWxldGUgYSBub2RlIGZyb20gdGhlIHNjZW5lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2V0X3Byb3BlcnR5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2V0IG9uZSBvciBtdWx0aXBsZSBub2RlIHByb3BlcnRpZXMgYXQgb25jZS4gVXNlIFwicHJvcGVydGllc1wiIGZvciBiYXRjaCwgb3IgXCJwcm9wZXJ0eVwiK1widmFsdWVcIiBmb3Igc2luZ2xlJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NpbmdsZSBtb2RlOiBuYW1lLCBhY3RpdmUsIHBvc2l0aW9uLCByb3RhdGlvbiwgc2NhbGUsIGxheWVyJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyBkZXNjcmlwdGlvbjogJ1NpbmdsZSBtb2RlOiBwcm9wZXJ0eSB2YWx1ZS4gRm9yIHRyYW5zZm9ybXMgdXNlIHt4LHksen0nIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdCYXRjaCBtb2RlOiB7IHBvc2l0aW9uOiB7eCx5LHp9LCBzY2FsZToge3gseSx6fSwgYWN0aXZlOiB0cnVlLCBuYW1lOiBcIk5ld05hbWVcIiB9JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdkdXBsaWNhdGUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEdXBsaWNhdGUgYSBub2RlIChjb3B5ICsgcGFzdGUpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCB0byBkdXBsaWNhdGUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVzZXRfdHJhbnNmb3JtJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmVzZXQgbm9kZSBwb3NpdGlvbi9yb3RhdGlvbi9zY2FsZSB0byBkZWZhdWx0cycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2ZpbmRfYnlfYXNzZXQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaW5kIGFsbCBub2RlcyB1c2luZyBhIHNwZWNpZmljIGFzc2V0IFVVSUQnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCBVVUlEIHRvIHNlYXJjaCBmb3InIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydhc3NldFV1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdtb3ZlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTW92ZSBub2RlIHRvIGEgbmV3IHBhcmVudCcsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpYmxpbmdJbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdQb3NpdGlvbiBhbW9uZyBzaWJsaW5ncyAob3B0aW9uYWwpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCcsICdwYXJlbnRVdWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgY2FzZSAncXVlcnknOiByZXR1cm4gdGhpcy5xdWVyeShhcmdzKTtcclxuICAgICAgICAgICAgY2FzZSAnY3JlYXRlJzogcmV0dXJuIHRoaXMuY3JlYXRlTm9kZShhcmdzKTtcclxuICAgICAgICAgICAgY2FzZSAnZGVsZXRlJzogcmV0dXJuIHRoaXMuZGVsZXRlTm9kZShhcmdzLnV1aWQpO1xyXG4gICAgICAgICAgICBjYXNlICdzZXRfcHJvcGVydHknOiByZXR1cm4gdGhpcy5zZXRQcm9wZXJ0eURpc3BhdGNoKGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdkdXBsaWNhdGUnOiByZXR1cm4gdGhpcy5kdXBsaWNhdGVOb2RlKGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3Jlc2V0X3RyYW5zZm9ybSc6IHJldHVybiB0aGlzLnJlc2V0VHJhbnNmb3JtKGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2ZpbmRfYnlfYXNzZXQnOiByZXR1cm4gdGhpcy5maW5kQnlBc3NldChhcmdzLmFzc2V0VXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ21vdmUnOiByZXR1cm4gdGhpcy5tb3ZlTm9kZShhcmdzLnV1aWQsIGFyZ3MucGFyZW50VXVpZCwgYXJncy5zaWJsaW5nSW5kZXgpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIG5vZGUgdG9vbDogJHt0b29sTmFtZX1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIEltcGxlbWVudGF0aW9ucyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgaWYgKGFyZ3MudXVpZCkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmdldE5vZGVJbmZvKGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuc3VjY2VzcyAmJiBhcmdzLmluY2x1ZGVDb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb21wb25lbnREZXRhaWxzID0gYXdhaXQgdGhpcy5nZXRDb21wb25lbnREZXRhaWxzKGFyZ3MudXVpZCwgISFhcmdzLnZlcmJvc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhcmdzLm5hbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmluZEJ5TmFtZShhcmdzLm5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYXJncy5saXN0QWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxpc3RBbGwoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJvdmlkZSB1dWlkLCBuYW1lLCBvciBsaXN0QWxsJyB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Q29tcG9uZW50RGV0YWlscyhub2RlVXVpZDogc3RyaW5nLCB2ZXJib3NlOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPGFueVtdPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZURhdGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghbm9kZURhdGEgfHwgIW5vZGVEYXRhLl9fY29tcHNfXykgcmV0dXJuIFtdO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG5vZGVEYXRhLl9fY29tcHNfXy5tYXAoKGNvbXA6IGFueSkgPT5cclxuICAgICAgICAgICAgICAgIHRoaXMuZXh0cmFjdENvbXBhY3QoY29tcCwgdmVyYm9zZSlcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvKiogRXh0cmFjdCBjb21wYWN0IGNvbXBvbmVudCBpbmZvOiBvbmx5IHZpc2libGUsIG5vbi1pbnRlcm5hbCwgbm9uLWRlZmF1bHQgcHJvcGVydGllcy4gKi9cclxuICAgIHByaXZhdGUgZXh0cmFjdENvbXBhY3QoY29tcDogYW55LCB2ZXJib3NlOiBib29sZWFuID0gZmFsc2UpOiBhbnkge1xyXG4gICAgICAgIGNvbnN0IGluZm86IGFueSA9IHtcclxuICAgICAgICAgICAgdHlwZTogY29tcC50eXBlIHx8IGNvbXAuX190eXBlX18gfHwgY29tcC5jaWQgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWQ/LnZhbHVlID8/IGNvbXAuZW5hYmxlZCA/PyB0cnVlLFxyXG4gICAgICAgICAgICBwcm9wZXJ0aWVzOiB7fSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBjb21wLnZhbHVlIGhvbGRzIHBlci1wcm9wZXJ0eSBtZXRhZGF0YTsgZmFsbCBiYWNrIHRvIGNvbXAgaXRzZWxmXHJcbiAgICAgICAgY29uc3Qgc291cmNlID0gY29tcC52YWx1ZSB8fCBjb21wO1xyXG4gICAgICAgIGNvbnN0IHNraXBLZXlzID0gbmV3IFNldChbXHJcbiAgICAgICAgICAgICdfX3R5cGVfXycsICd0eXBlJywgJ2NpZCcsICdfbmFtZScsICdfb2JqRmxhZ3MnLCAnbm9kZScsICdfX3ByZWZhYicsICdmaWxlSWQnLFxyXG4gICAgICAgICAgICAndXVpZCcsICduYW1lJywgJ2VuYWJsZWQnLCAnX2VuYWJsZWQnLCAnX19zY3JpcHRBc3NldCcsXHJcbiAgICAgICAgXSk7XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgbWV0YV0gb2YgT2JqZWN0LmVudHJpZXMoc291cmNlKSkge1xyXG4gICAgICAgICAgICBpZiAoc2tpcEtleXMuaGFzKGtleSkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ18nKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnZWRpdG9yJykpIGNvbnRpbnVlOyAvLyBza2lwIGVkaXRvci1vbmx5IGRpc3BsYXkgZHVwbGljYXRlc1xyXG5cclxuICAgICAgICAgICAgY29uc3QgbSA9IG1ldGEgYXMgYW55O1xyXG4gICAgICAgICAgICBpZiAoIW0gfHwgdHlwZW9mIG0gIT09ICdvYmplY3QnKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKG0udmlzaWJsZSA9PT0gZmFsc2UpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoIXZlcmJvc2UgJiYgbS5yZWFkb25seSA9PT0gdHJ1ZSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmICghdmVyYm9zZSAmJiAndmFsdWUnIGluIG0gJiYgJ2RlZmF1bHQnIGluIG0gJiYgdGhpcy52YWx1ZUVxdWFscyhtLnZhbHVlLCBtLmRlZmF1bHQpKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGlmICgndmFsdWUnIGluIG0pIHtcclxuICAgICAgICAgICAgICAgIGluZm8ucHJvcGVydGllc1trZXldID0gbS52YWx1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGluZm87XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIERlZXAgZXF1YWxpdHkgY2hlY2sgZm9yIHByb3BlcnR5IHZhbHVlcy4gKi9cclxuICAgIHByaXZhdGUgdmFsdWVFcXVhbHMoYTogYW55LCBiOiBhbnkpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAoYSA9PT0gYikgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICBpZiAodHlwZW9mIGEgIT09IHR5cGVvZiBiKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBhICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGNvbnN0IGthID0gT2JqZWN0LmtleXMoYSk7XHJcbiAgICAgICAgY29uc3Qga2IgPSBPYmplY3Qua2V5cyhiKTtcclxuICAgICAgICBpZiAoa2EubGVuZ3RoICE9PSBrYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcclxuICAgICAgICByZXR1cm4ga2EuZXZlcnkoayA9PiB0aGlzLnZhbHVlRXF1YWxzKGFba10sIGJba10pKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGdldE5vZGVJbmZvKHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZURhdGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCB1dWlkKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSBub3QgZm91bmQ6ICR7dXVpZH1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogdGhpcy5wYXJzZU5vZGVEYXRhKG5vZGVEYXRhLCB1dWlkKSB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAvLyBGYWxsYmFjazogc2NlbmUgc2NyaXB0XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldE5vZGVJbmZvJyxcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbdXVpZF0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBkYXRhIHJldHVybmVkJyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZmluZEJ5TmFtZShuYW1lOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRyZWUgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcclxuICAgICAgICAgICAgaWYgKCF0cmVlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBzY2VuZSB0cmVlIGF2YWlsYWJsZScgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHRzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLnNlYXJjaFRyZWUodHJlZSwgbmFtZSwgJycsIHJlc3VsdHMpO1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vIG5vZGUgZm91bmQgd2l0aCBuYW1lOiAke25hbWV9YCB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdHMgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZmluZE5vZGVCeU5hbWUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtuYW1lXSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGRhdGEgcmV0dXJuZWQnIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0QWxsKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xyXG4gICAgICAgICAgICBpZiAoIXRyZWUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHNjZW5lIHRyZWUgYXZhaWxhYmxlJyB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxlY3ROb2Rlcyh0cmVlLCBub2Rlcyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgdG90YWxOb2Rlczogbm9kZXMubGVuZ3RoLCBub2RlcyB9IH07XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldEFsbE5vZGVzJyxcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbXSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGRhdGEgcmV0dXJuZWQnIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjcmVhdGVOb2RlKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgbGV0IHBhcmVudFV1aWQgPSBhcmdzLnBhcmVudFV1aWQ7XHJcbiAgICAgICAgICAgIGxldCBub2RlVXVpZDogc3RyaW5nO1xyXG4gICAgICAgICAgICBsZXQgbm9kZU5hbWUgPSBhcmdzLm5hbWU7XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBubyBwYXJlbnQgc3BlY2lmaWVkLCBnZXQgc2NlbmUgcm9vdFxyXG4gICAgICAgICAgICBpZiAoIXBhcmVudFV1aWQpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJlZTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZCA9IHRyZWU/LnV1aWQ7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzY2VuZUluZm86IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWN1cnJlbnQtc2NlbmUnKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkID0gc2NlbmVJbmZvPy51dWlkO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIXBhcmVudFV1aWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0Nhbm5vdCBkZXRlcm1pbmUgc2NlbmUgcm9vdCcgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gSWYgYXNzZXRVdWlkIGlzIHByb3ZpZGVkLCB1c2UgY2MuaW5zdGFudGlhdGUgdmlhIHNjZW5lIHNjcmlwdCBmb3IgcHJvcGVyIHByZWZhYiBsaW5raW5nXHJcbiAgICAgICAgICAgIGlmIChhcmdzLmFzc2V0VXVpZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdpbnN0YW50aWF0ZVByZWZhYicsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW2FyZ3MuYXNzZXRVdWlkLCBwYXJlbnRVdWlkLCBhcmdzLm5hbWVdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdCB8fCAhcmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJlZmFiIGluc3RhbnRpYXRpb24gZmFpbGVkJyB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQgPSByZXN1bHQuZGF0YS51dWlkO1xyXG4gICAgICAgICAgICAgICAgbm9kZU5hbWUgPSByZXN1bHQuZGF0YS5uYW1lO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gU3RhbmRhcmQgbm9kZSBjcmVhdGlvblxyXG4gICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9uczogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50VXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBhcmdzLm5hbWUsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgaWYgKGFyZ3MudHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG9wdGlvbnMudHlwZSA9IGFyZ3MudHlwZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG5vZGVVdWlkID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLW5vZGUnLCBvcHRpb25zKSBhcyBhbnk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFwcGxpZWQ6IHN0cmluZ1tdID0gW107XHJcblxyXG4gICAgICAgICAgICAvLyBBcHBseSB0cmFuc2Zvcm0gcHJvcGVydGllcyBpZiBwcm92aWRlZFxyXG4gICAgICAgICAgICBpZiAoYXJncy5wb3NpdGlvbikge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wZXJ0eShub2RlVXVpZCwgJ3Bvc2l0aW9uJywgYXJncy5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBhcHBsaWVkLnB1c2goJ3Bvc2l0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGFyZ3Mucm90YXRpb24pIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcGVydHkobm9kZVV1aWQsICdyb3RhdGlvbicsIGFyZ3Mucm90YXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYXBwbGllZC5wdXNoKCdyb3RhdGlvbicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChhcmdzLnNjYWxlKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3BlcnR5KG5vZGVVdWlkLCAnc2NhbGUnLCBhcmdzLnNjYWxlKTtcclxuICAgICAgICAgICAgICAgIGFwcGxpZWQucHVzaCgnc2NhbGUnKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gQWRkIGNvbXBvbmVudHMgaWYgcHJvdmlkZWRcclxuICAgICAgICAgICAgaWYgKGFyZ3MuY29tcG9uZW50cyAmJiBBcnJheS5pc0FycmF5KGFyZ3MuY29tcG9uZW50cykpIHtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcFR5cGUgb2YgYXJncy5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLWNvbXBvbmVudCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50OiBjb21wVHlwZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpZWQucHVzaChgKyR7Y29tcFR5cGV9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZC5wdXNoKGAhJHtjb21wVHlwZX0oJHtlcnIubWVzc2FnZX0pYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHsgdXVpZDogbm9kZVV1aWQsIG5hbWU6IG5vZGVOYW1lLCBhcHBsaWVkIH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgTm9kZSBjcmVhdGVkOiAke25vZGVOYW1lfWAgKyAoYXBwbGllZC5sZW5ndGggPyBgIFske2FwcGxpZWQuam9pbignLCAnKX1dYCA6ICcnKSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZGVsZXRlTm9kZSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3JlbW92ZS1ub2RlJywgeyB1dWlkIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgTm9kZSBkZWxldGVkOiAke3V1aWR9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGlzcGF0Y2g6IHNpbmdsZSBwcm9wZXJ0eSBvciBiYXRjaCBwcm9wZXJ0aWVzXHJcbiAgICBwcml2YXRlIGFzeW5jIHNldFByb3BlcnR5RGlzcGF0Y2goYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBjb25zdCB7IHV1aWQgfSA9IGFyZ3M7XHJcblxyXG4gICAgICAgIC8vIEJhdGNoIG1vZGVcclxuICAgICAgICBpZiAoYXJncy5wcm9wZXJ0aWVzICYmIHR5cGVvZiBhcmdzLnByb3BlcnRpZXMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3Byb3AsIHZhbF0gb2YgT2JqZWN0LmVudHJpZXMoYXJncy5wcm9wZXJ0aWVzKSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgciA9IGF3YWl0IHRoaXMuc2V0UHJvcGVydHkodXVpZCwgcHJvcCwgdmFsKTtcclxuICAgICAgICAgICAgICAgIGlmIChyLnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2gocHJvcCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKGAke3Byb3B9OiAke3IuZXJyb3J9YCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiByZXN1bHRzLmxlbmd0aCA+IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFNldDogWyR7cmVzdWx0cy5qb2luKCcsICcpfV1gICsgKGVycm9ycy5sZW5ndGggPyBgIEVycm9yczogWyR7ZXJyb3JzLmpvaW4oJzsgJyl9XWAgOiAnJyksXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQ6IFske3Jlc3VsdHMuam9pbignLCAnKX1dIG9uICR7dXVpZH1gIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTaW5nbGUgbW9kZSAoYmFja3dhcmQgY29tcGF0aWJsZSlcclxuICAgICAgICBpZiAoYXJncy5wcm9wZXJ0eSAhPT0gdW5kZWZpbmVkICYmIGFyZ3MudmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXRQcm9wZXJ0eSh1dWlkLCBhcmdzLnByb3BlcnR5LCBhcmdzLnZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1Byb3ZpZGUgXCJwcm9wZXJ0eVwiK1widmFsdWVcIiBvciBcInByb3BlcnRpZXNcIiBvYmplY3QnIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRQcm9wZXJ0eSh1dWlkOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIC8vIE1hcCBjb21tb24gcHJvcGVydHkgbmFtZXMgdG8gRWRpdG9yIEFQSSBwYXRoc1xyXG4gICAgICAgIGNvbnN0IHByb3BlcnR5TWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogJ3Bvc2l0aW9uJyxcclxuICAgICAgICAgICAgcm90YXRpb246ICdldWxlcicsIC8vIHVzZSBldWxlciBhbmdsZXMgZm9yIHJvdGF0aW9uXHJcbiAgICAgICAgICAgIHNjYWxlOiAnc2NhbGUnLFxyXG4gICAgICAgICAgICBuYW1lOiAnbmFtZScsXHJcbiAgICAgICAgICAgIGFjdGl2ZTogJ2FjdGl2ZScsXHJcbiAgICAgICAgICAgIGxheWVyOiAnbGF5ZXInLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IGVkaXRvclBhdGggPSBwcm9wZXJ0eU1hcFtwcm9wZXJ0eV0gfHwgcHJvcGVydHk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIEZvciB0cmFuc2Zvcm0gcHJvcGVydGllcywgc2V0IHN1Yi1wcm9wZXJ0aWVzXHJcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSA9PT0gJ3Bvc2l0aW9uJyB8fCBwcm9wZXJ0eSA9PT0gJ3JvdGF0aW9uJyB8fCBwcm9wZXJ0eSA9PT0gJ3NjYWxlJykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdmVjVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnID8gdmFsdWUgOiB7IHg6IDAsIHk6IDAsIHo6IDAgfTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgICAgICB1dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGVkaXRvclBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogdmVjVmFsdWUgfSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogZWRpdG9yUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlIH0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFNldCAke3Byb3BlcnR5fSBvbiAke3V1aWR9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAvLyBGYWxsYmFjazogc2NlbmUgc2NyaXB0XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ3NldE5vZGVQcm9wZXJ0eScsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW3V1aWQsIHByb3BlcnR5LCB2YWx1ZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gc2V0IHByb3BlcnR5JyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbW92ZU5vZGUodXVpZDogc3RyaW5nLCBwYXJlbnRVdWlkOiBzdHJpbmcsIHNpYmxpbmdJbmRleD86IG51bWJlcik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgb3B0aW9uczogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgcGFyZW50OiBwYXJlbnRVdWlkLFxyXG4gICAgICAgICAgICAgICAgdXVpZHM6IFt1dWlkXSxcclxuICAgICAgICAgICAgICAgIGtlZXBXb3JsZFRyYW5zZm9ybTogZmFsc2UsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wYXJlbnQnLCBvcHRpb25zKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChzaWJsaW5nSW5kZXggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gU2V0IHNpYmxpbmcgaW5kZXggYWZ0ZXIgcmVwYXJlbnRpbmdcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgICAgICB1dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6ICdzaWJsaW5nSW5kZXgnLFxyXG4gICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IHNpYmxpbmdJbmRleCB9LFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBNb3ZlZCBub2RlICR7dXVpZH0gdG8gcGFyZW50ICR7cGFyZW50VXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGR1cGxpY2F0ZU5vZGUodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2R1cGxpY2F0ZS1ub2RlJywgW3V1aWRdKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IGR1cGxpY2F0ZWRVdWlkczogcmVzdWx0IH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgTm9kZSBkdXBsaWNhdGVkOiAke3V1aWR9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVzZXRUcmFuc2Zvcm0odXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdyZXNldC1ub2RlJywgeyB1dWlkIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgVHJhbnNmb3JtIHJlc2V0IG9uIG5vZGUgJHt1dWlkfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZmluZEJ5QXNzZXQoYXNzZXRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZXMtYnktYXNzZXQtdXVpZCcsIGFzc2V0VXVpZCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdCB8fCBbXSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IEhlbHBlcnMgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBwYXJzZU5vZGVEYXRhKGRhdGE6IGFueSwgdXVpZDogc3RyaW5nKTogYW55IHtcclxuICAgICAgICBjb25zdCBpbmZvOiBhbnkgPSB7XHJcbiAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgIG5hbWU6IGRhdGEubmFtZT8udmFsdWUgPz8gZGF0YS5uYW1lID8/ICd1bmtub3duJyxcclxuICAgICAgICAgICAgYWN0aXZlOiBkYXRhLmFjdGl2ZT8udmFsdWUgPz8gZGF0YS5hY3RpdmUgPz8gdHJ1ZSxcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBFeHRyYWN0IHBvc2l0aW9uXHJcbiAgICAgICAgaWYgKGRhdGEucG9zaXRpb24/LnZhbHVlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHAgPSBkYXRhLnBvc2l0aW9uLnZhbHVlO1xyXG4gICAgICAgICAgICBpbmZvLnBvc2l0aW9uID0geyB4OiBwLnggPz8gMCwgeTogcC55ID8/IDAsIHo6IHAueiA/PyAwIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBFeHRyYWN0IHJvdGF0aW9uIChldWxlcilcclxuICAgICAgICBpZiAoZGF0YS5ldWxlcj8udmFsdWUpIHtcclxuICAgICAgICAgICAgY29uc3QgciA9IGRhdGEuZXVsZXIudmFsdWU7XHJcbiAgICAgICAgICAgIGluZm8ucm90YXRpb24gPSB7IHg6IHIueCA/PyAwLCB5OiByLnkgPz8gMCwgejogci56ID8/IDAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3Qgc2NhbGVcclxuICAgICAgICBpZiAoZGF0YS5zY2FsZT8udmFsdWUpIHtcclxuICAgICAgICAgICAgY29uc3QgcyA9IGRhdGEuc2NhbGUudmFsdWU7XHJcbiAgICAgICAgICAgIGluZm8uc2NhbGUgPSB7IHg6IHMueCA/PyAxLCB5OiBzLnkgPz8gMSwgejogcy56ID8/IDEgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3QgcGFyZW50IChqdXN0IFVVSUQpXHJcbiAgICAgICAgaWYgKGRhdGEucGFyZW50KSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudFV1aWQgPSBkYXRhLnBhcmVudD8udmFsdWU/LnV1aWQgPz8gZGF0YS5wYXJlbnQ/LnV1aWQgPz8gZGF0YS5wYXJlbnQ7XHJcbiAgICAgICAgICAgIGlmIChwYXJlbnRVdWlkKSBpbmZvLnBhcmVudFV1aWQgPSB0eXBlb2YgcGFyZW50VXVpZCA9PT0gJ3N0cmluZycgPyBwYXJlbnRVdWlkIDogcGFyZW50VXVpZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3QgY2hpbGRyZW4gKGp1c3QgVVVJRHMpXHJcbiAgICAgICAgaWYgKGRhdGEuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgY29uc3Qga2lkcyA9IEFycmF5LmlzQXJyYXkoZGF0YS5jaGlsZHJlbikgPyBkYXRhLmNoaWxkcmVuIDogW107XHJcbiAgICAgICAgICAgIGluZm8uY2hpbGRyZW4gPSBraWRzLm1hcCgoYzogYW55KSA9PiBjPy52YWx1ZT8udXVpZCA/PyBjPy51dWlkID8/IGMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBsYXllclxyXG4gICAgICAgIGlmIChkYXRhLmxheWVyPy52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGluZm8ubGF5ZXIgPSBkYXRhLmxheWVyLnZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBjb21wb25lbnRzIChjb21wYWN0KVxyXG4gICAgICAgIGlmIChkYXRhLl9fY29tcHNfXykge1xyXG4gICAgICAgICAgICBpbmZvLmNvbXBvbmVudHMgPSBkYXRhLl9fY29tcHNfXy5tYXAoKGM6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGMuZW5hYmxlZD8udmFsdWUgPz8gYy5lbmFibGVkID8/IHRydWUsXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbmZvO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2VhcmNoVHJlZShub2RlOiBhbnksIHRhcmdldE5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nLCByZXN1bHRzOiBhbnlbXSk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRQYXRoID0gcGF0aCA/IGAke3BhdGh9LyR7bm9kZS5uYW1lfWAgOiBub2RlLm5hbWU7XHJcbiAgICAgICAgaWYgKG5vZGUubmFtZSA9PT0gdGFyZ2V0TmFtZSkge1xyXG4gICAgICAgICAgICByZXN1bHRzLnB1c2goeyB1dWlkOiBub2RlLnV1aWQsIG5hbWU6IG5vZGUubmFtZSwgcGF0aDogY3VycmVudFBhdGggfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWFyY2hUcmVlKGNoaWxkLCB0YXJnZXROYW1lLCBjdXJyZW50UGF0aCwgcmVzdWx0cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjb2xsZWN0Tm9kZXMobm9kZTogYW55LCByZXN1bHRzOiBhbnlbXSk6IHZvaWQge1xyXG4gICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcclxuICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlICE9PSBmYWxzZSxcclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGVjdE5vZGVzKGNoaWxkLCByZXN1bHRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=