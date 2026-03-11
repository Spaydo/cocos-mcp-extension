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
        var _a;
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
            else if (property === 'active') {
                // active needs proper boolean parsing (string "false" must become false)
                const boolVal = typeof value === 'string'
                    ? value.toLowerCase() !== 'false' && value !== '0' && value !== ''
                    : !!value;
                await Editor.Message.request('scene', 'set-property', {
                    uuid,
                    path: 'active',
                    dump: { value: boolVal, type: 'Boolean' },
                });
            }
            else {
                await Editor.Message.request('scene', 'set-property', {
                    uuid,
                    path: editorPath,
                    dump: { value },
                });
            }
            await this.delay(100);
            // Verify for properties that can silently fail
            if (property === 'active' || property === 'name') {
                const nodeData = await Editor.Message.request('scene', 'query-node', uuid);
                const actual = (_a = nodeData === null || nodeData === void 0 ? void 0 : nodeData[editorPath]) === null || _a === void 0 ? void 0 : _a.value;
                // For active, compare as booleans (value may be string "false")
                const expected = property === 'active'
                    ? (typeof value === 'string' ? value.toLowerCase() !== 'false' && value !== '0' && value !== '' : !!value)
                    : value;
                if (actual !== expected) {
                    // Editor API failed — use scene script fallback
                    const result = await Editor.Message.request('scene', 'execute-scene-script', {
                        name: EXTENSION_NAME,
                        method: 'setNodeProperty',
                        args: [uuid, property, expected],
                    });
                    if (result === null || result === void 0 ? void 0 : result.success)
                        return result;
                    return { success: false, error: `Failed to set ${property}` };
                }
            }
            return { success: true, message: `Set ${property} on ${uuid}` };
        }
        catch (_b) {
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9ub2RlLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDO0FBRTdDLE1BQWEsU0FBUztJQUVsQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSw0R0FBNEc7Z0JBQ3pILFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsNkJBQTZCLEVBQUU7d0JBQ3BFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFO3dCQUN2RCxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSw4Q0FBOEMsRUFBRTt3QkFDekYsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSx3REFBd0QsRUFBRTt3QkFDN0csT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsZ0VBQWdFLEVBQUU7cUJBQzlHO2lCQUNKO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsNkZBQTZGO2dCQUMxRyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7d0JBQ3hCLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdDQUF3QyxFQUFFO3dCQUNyRixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxvQkFB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LENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzdELENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztJQUVPLFlBQVksQ0FBQyxJQUFTLEVBQUUsT0FBYztRQUMxQyxPQUFPLENBQUMsSUFBSSxDQUFDO1lBQ1QsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ2YsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEtBQUssS0FBSztTQUNoQyxDQUFDLENBQUM7UUFDSCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQixLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDdEMsQ0FBQztRQUNMLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUFsbkJELDhCQWtuQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XHJcblxyXG5jb25zdCBFWFRFTlNJT05fTkFNRSA9ICdjb2Nvcy1tY3AtZXh0ZW5zaW9uJztcclxuXHJcbmV4cG9ydCBjbGFzcyBOb2RlVG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IG5vZGUgYnkgVVVJRCwgbmFtZSwgb3IgbGlzdCBhbGwgbm9kZXMuIFVzZSBpbmNsdWRlQ29tcG9uZW50cyBmb3IgZGV0YWlsZWQgY29tcG9uZW50IGluZm8gaW4gb25lIGNhbGwnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIGZvciBkZXRhaWxlZCBpbmZvJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NlYXJjaCBieSBuYW1lJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsaXN0QWxsOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdMaXN0IGFsbCBub2RlcyAoY29tcGFjdDogdXVpZCwgbmFtZSwgcGFyZW50KScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW5jbHVkZUNvbXBvbmVudHM6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgZGV0YWlsZWQgY29tcG9uZW50IHByb3BlcnRpZXMgKG9ubHkgd2l0aCB1dWlkKScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmVyYm9zZTogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnSW5jbHVkZSByZWFkb25seSBwcm9wcyBhbmQgZGVmYXVsdCB2YWx1ZXMgaW4gY29tcG9uZW50IGRldGFpbHMnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdjcmVhdGUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDcmVhdGUgYSBuZXcgbm9kZSB3aXRoIG9wdGlvbmFsIHRyYW5zZm9ybSwgY29tcG9uZW50cywgYW5kIHByZWZhYiBpbnN0YW50aWF0aW9uIGluIG9uZSBjYWxsJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUGFyZW50IG5vZGUgVVVJRCAoZGVmYXVsdDogc2NlbmUgcm9vdCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTm9kZS8yRE5vZGUvM0ROb2RlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJlZmFiIFVVSUQgdG8gaW5zdGFudGlhdGUgKHVzZXMgY2MuaW5zdGFudGlhdGUgZm9yIHByb3BlciBwcmVmYWIgbGlua2luZyknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7IHR5cGU6ICdvYmplY3QnLCBkZXNjcmlwdGlvbjogJ3t4LCB5LCB6fScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcm90YXRpb246IHsgdHlwZTogJ29iamVjdCcsIGRlc2NyaXB0aW9uOiAne3gsIHksIHp9IGV1bGVyIGFuZ2xlcycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2NhbGU6IHsgdHlwZTogJ29iamVjdCcsIGRlc2NyaXB0aW9uOiAne3gsIHksIHp9JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IHR5cGVzIHRvIGFkZCwgZS5nLiBbXCJjYy5TcHJpdGVcIiwgXCJjYy5CdXR0b25cIl0nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbmFtZSddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2RlbGV0ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RlbGV0ZSBhIG5vZGUgZnJvbSB0aGUgc2NlbmUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXRfcHJvcGVydHknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZXQgb25lIG9yIG11bHRpcGxlIG5vZGUgcHJvcGVydGllcyBhdCBvbmNlLiBVc2UgXCJwcm9wZXJ0aWVzXCIgZm9yIGJhdGNoLCBvciBcInByb3BlcnR5XCIrXCJ2YWx1ZVwiIGZvciBzaW5nbGUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU2luZ2xlIG1vZGU6IG5hbWUsIGFjdGl2ZSwgcG9zaXRpb24sIHJvdGF0aW9uLCBzY2FsZSwgbGF5ZXInIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IGRlc2NyaXB0aW9uOiAnU2luZ2xlIG1vZGU6IHByb3BlcnR5IHZhbHVlLiBGb3IgdHJhbnNmb3JtcyB1c2Uge3gseSx6fScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0JhdGNoIG1vZGU6IHsgcG9zaXRpb246IHt4LHksen0sIHNjYWxlOiB7eCx5LHp9LCBhY3RpdmU6IHRydWUsIG5hbWU6IFwiTmV3TmFtZVwiIH0nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2R1cGxpY2F0ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0R1cGxpY2F0ZSBhIG5vZGUgKGNvcHkgKyBwYXN0ZSknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIHRvIGR1cGxpY2F0ZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZXNldF90cmFuc2Zvcm0nLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZXNldCBub2RlIHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlIHRvIGRlZmF1bHRzJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZmluZF9ieV9hc3NldCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbmQgYWxsIG5vZGVzIHVzaW5nIGEgc3BlY2lmaWMgYXNzZXQgVVVJRCcsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IFVVSUQgdG8gc2VhcmNoIGZvcicgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2Fzc2V0VXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ21vdmUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdNb3ZlIG5vZGUgdG8gYSBuZXcgcGFyZW50JyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2libGluZ0luZGV4OiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ1Bvc2l0aW9uIGFtb25nIHNpYmxpbmdzIChvcHRpb25hbCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJywgJ3BhcmVudFV1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeSc6IHJldHVybiB0aGlzLnF1ZXJ5KGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOiByZXR1cm4gdGhpcy5jcmVhdGVOb2RlKGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdkZWxldGUnOiByZXR1cm4gdGhpcy5kZWxldGVOb2RlKGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NldF9wcm9wZXJ0eSc6IHJldHVybiB0aGlzLnNldFByb3BlcnR5RGlzcGF0Y2goYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2R1cGxpY2F0ZSc6IHJldHVybiB0aGlzLmR1cGxpY2F0ZU5vZGUoYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSAncmVzZXRfdHJhbnNmb3JtJzogcmV0dXJuIHRoaXMucmVzZXRUcmFuc2Zvcm0oYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSAnZmluZF9ieV9hc3NldCc6IHJldHVybiB0aGlzLmZpbmRCeUFzc2V0KGFyZ3MuYXNzZXRVdWlkKTtcclxuICAgICAgICAgICAgY2FzZSAnbW92ZSc6IHJldHVybiB0aGlzLm1vdmVOb2RlKGFyZ3MudXVpZCwgYXJncy5wYXJlbnRVdWlkLCBhcmdzLnNpYmxpbmdJbmRleCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gbm9kZSB0b29sOiAke3Rvb2xOYW1lfWAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFRvb2wgSW1wbGVtZW50YXRpb25zID09PVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBpZiAoYXJncy51dWlkKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZ2V0Tm9kZUluZm8oYXJncy51dWlkKTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzICYmIGFyZ3MuaW5jbHVkZUNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbXBvbmVudERldGFpbHMgPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudERldGFpbHMoYXJncy51dWlkLCAhIWFyZ3MudmVyYm9zZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGFyZ3MubmFtZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maW5kQnlOYW1lKGFyZ3MubmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhcmdzLmxpc3RBbGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGlzdEFsbCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcm92aWRlIHV1aWQsIG5hbWUsIG9yIGxpc3RBbGwnIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDb21wb25lbnREZXRhaWxzKG5vZGVVdWlkOiBzdHJpbmcsIHZlcmJvc2U6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8YW55W10+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlRGF0YSB8fCAhbm9kZURhdGEuX19jb21wc19fKSByZXR1cm4gW107XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbm9kZURhdGEuX19jb21wc19fLm1hcCgoY29tcDogYW55KSA9PlxyXG4gICAgICAgICAgICAgICAgdGhpcy5leHRyYWN0Q29tcGFjdChjb21wLCB2ZXJib3NlKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKiBFeHRyYWN0IGNvbXBhY3QgY29tcG9uZW50IGluZm86IG9ubHkgdmlzaWJsZSwgbm9uLWludGVybmFsLCBub24tZGVmYXVsdCBwcm9wZXJ0aWVzLiAqL1xyXG4gICAgcHJpdmF0ZSBleHRyYWN0Q29tcGFjdChjb21wOiBhbnksIHZlcmJvc2U6IGJvb2xlYW4gPSBmYWxzZSk6IGFueSB7XHJcbiAgICAgICAgY29uc3QgaW5mbzogYW55ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBjb21wLnR5cGUgfHwgY29tcC5fX3R5cGVfXyB8fCBjb21wLmNpZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZD8udmFsdWUgPz8gY29tcC5lbmFibGVkID8/IHRydWUsXHJcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIGNvbXAudmFsdWUgaG9sZHMgcGVyLXByb3BlcnR5IG1ldGFkYXRhOyBmYWxsIGJhY2sgdG8gY29tcCBpdHNlbGZcclxuICAgICAgICBjb25zdCBzb3VyY2UgPSBjb21wLnZhbHVlIHx8IGNvbXA7XHJcbiAgICAgICAgY29uc3Qgc2tpcEtleXMgPSBuZXcgU2V0KFtcclxuICAgICAgICAgICAgJ19fdHlwZV9fJywgJ3R5cGUnLCAnY2lkJywgJ19uYW1lJywgJ19vYmpGbGFncycsICdub2RlJywgJ19fcHJlZmFiJywgJ2ZpbGVJZCcsXHJcbiAgICAgICAgICAgICd1dWlkJywgJ25hbWUnLCAnZW5hYmxlZCcsICdfZW5hYmxlZCcsICdfX3NjcmlwdEFzc2V0JyxcclxuICAgICAgICBdKTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBtZXRhXSBvZiBPYmplY3QuZW50cmllcyhzb3VyY2UpKSB7XHJcbiAgICAgICAgICAgIGlmIChza2lwS2V5cy5oYXMoa2V5KSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnXycpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdlZGl0b3InKSkgY29udGludWU7IC8vIHNraXAgZWRpdG9yLW9ubHkgZGlzcGxheSBkdXBsaWNhdGVzXHJcblxyXG4gICAgICAgICAgICBjb25zdCBtID0gbWV0YSBhcyBhbnk7XHJcbiAgICAgICAgICAgIGlmICghbSB8fCB0eXBlb2YgbSAhPT0gJ29iamVjdCcpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAobS52aXNpYmxlID09PSBmYWxzZSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmICghdmVyYm9zZSAmJiBtLnJlYWRvbmx5ID09PSB0cnVlKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKCF2ZXJib3NlICYmICd2YWx1ZScgaW4gbSAmJiAnZGVmYXVsdCcgaW4gbSAmJiB0aGlzLnZhbHVlRXF1YWxzKG0udmFsdWUsIG0uZGVmYXVsdCkpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgaWYgKCd2YWx1ZScgaW4gbSkge1xyXG4gICAgICAgICAgICAgICAgaW5mby5wcm9wZXJ0aWVzW2tleV0gPSBtLnZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaW5mbztcclxuICAgIH1cclxuXHJcbiAgICAvKiogRGVlcCBlcXVhbGl0eSBjaGVjayBmb3IgcHJvcGVydHkgdmFsdWVzLiAqL1xyXG4gICAgcHJpdmF0ZSB2YWx1ZUVxdWFscyhhOiBhbnksIGI6IGFueSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmIChhID09PSBiKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgYSAhPT0gdHlwZW9mIGIpIHJldHVybiBmYWxzZTtcclxuICAgICAgICBpZiAodHlwZW9mIGEgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgY29uc3Qga2EgPSBPYmplY3Qua2V5cyhhKTtcclxuICAgICAgICBjb25zdCBrYiA9IE9iamVjdC5rZXlzKGIpO1xyXG4gICAgICAgIGlmIChrYS5sZW5ndGggIT09IGtiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIHJldHVybiBrYS5ldmVyeShrID0+IHRoaXMudmFsdWVFcXVhbHMoYVtrXSwgYltrXSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Tm9kZUluZm8odXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHt1dWlkfWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB0aGlzLnBhcnNlTm9kZURhdGEobm9kZURhdGEsIHV1aWQpIH07XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBzY2VuZSBzY3JpcHRcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0Tm9kZUluZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFt1dWlkXSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGRhdGEgcmV0dXJuZWQnIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQnlOYW1lKG5hbWU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xyXG4gICAgICAgICAgICBpZiAoIXRyZWUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHNjZW5lIHRyZWUgYXZhaWxhYmxlJyB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuc2VhcmNoVHJlZSh0cmVlLCBuYW1lLCAnJywgcmVzdWx0cyk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm8gbm9kZSBmb3VuZCB3aXRoIG5hbWU6ICR7bmFtZX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0cyB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdmaW5kTm9kZUJ5TmFtZScsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25hbWVdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gZGF0YSByZXR1cm5lZCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RBbGwoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB0cmVlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XHJcbiAgICAgICAgICAgIGlmICghdHJlZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gc2NlbmUgdHJlZSBhdmFpbGFibGUnIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGVjdE5vZGVzKHRyZWUsIG5vZGVzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0b3RhbE5vZGVzOiBub2Rlcy5sZW5ndGgsIG5vZGVzIH0gfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0QWxsTm9kZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gZGF0YSByZXR1cm5lZCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZU5vZGUoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsZXQgcGFyZW50VXVpZCA9IGFyZ3MucGFyZW50VXVpZDtcclxuICAgICAgICAgICAgbGV0IG5vZGVVdWlkOiBzdHJpbmc7XHJcbiAgICAgICAgICAgIGxldCBub2RlTmFtZSA9IGFyZ3MubmFtZTtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIG5vIHBhcmVudCBzcGVjaWZpZWQsIGdldCBzY2VuZSByb290XHJcbiAgICAgICAgICAgIGlmICghcGFyZW50VXVpZCkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmVlOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkID0gdHJlZT8udXVpZDtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjZW5lSW5mbzogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktY3VycmVudC1zY2VuZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQgPSBzY2VuZUluZm8/LnV1aWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghcGFyZW50VXVpZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnQ2Fubm90IGRldGVybWluZSBzY2VuZSByb290JyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBhc3NldFV1aWQgaXMgcHJvdmlkZWQsIHVzZSBjYy5pbnN0YW50aWF0ZSB2aWEgc2NlbmUgc2NyaXB0IGZvciBwcm9wZXIgcHJlZmFiIGxpbmtpbmdcclxuICAgICAgICAgICAgaWYgKGFyZ3MuYXNzZXRVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2luc3RhbnRpYXRlUHJlZmFiJyxcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbYXJncy5hc3NldFV1aWQsIHBhcmVudFV1aWQsIGFyZ3MubmFtZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcmVmYWIgaW5zdGFudGlhdGlvbiBmYWlsZWQnIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBub2RlVXVpZCA9IHJlc3VsdC5kYXRhLnV1aWQ7XHJcbiAgICAgICAgICAgICAgICBub2RlTmFtZSA9IHJlc3VsdC5kYXRhLm5hbWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBTdGFuZGFyZCBub2RlIGNyZWF0aW9uXHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zOiBhbnkgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBwYXJlbnRVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGFyZ3MubmFtZSxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBpZiAoYXJncy50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy50eXBlID0gYXJncy50eXBlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtbm9kZScsIG9wdGlvbnMpIGFzIGFueTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgYXBwbGllZDogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIC8vIEFwcGx5IHRyYW5zZm9ybSBwcm9wZXJ0aWVzIGlmIHByb3ZpZGVkXHJcbiAgICAgICAgICAgIGlmIChhcmdzLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3BlcnR5KG5vZGVVdWlkLCAncG9zaXRpb24nLCBhcmdzLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGFwcGxpZWQucHVzaCgncG9zaXRpb24nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYXJncy5yb3RhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wZXJ0eShub2RlVXVpZCwgJ3JvdGF0aW9uJywgYXJncy5yb3RhdGlvbik7XHJcbiAgICAgICAgICAgICAgICBhcHBsaWVkLnB1c2goJ3JvdGF0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGFyZ3Muc2NhbGUpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcGVydHkobm9kZVV1aWQsICdzY2FsZScsIGFyZ3Muc2NhbGUpO1xyXG4gICAgICAgICAgICAgICAgYXBwbGllZC5wdXNoKCdzY2FsZScpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBBZGQgY29tcG9uZW50cyBpZiBwcm92aWRlZFxyXG4gICAgICAgICAgICBpZiAoYXJncy5jb21wb25lbnRzICYmIEFycmF5LmlzQXJyYXkoYXJncy5jb21wb25lbnRzKSkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21wVHlwZSBvZiBhcmdzLmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQ6IGNvbXBUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZC5wdXNoKGArJHtjb21wVHlwZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWVkLnB1c2goYCEke2NvbXBUeXBlfSgke2Vyci5tZXNzYWdlfSlgKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiBub2RlVXVpZCwgbmFtZTogbm9kZU5hbWUsIGFwcGxpZWQgfSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBOb2RlIGNyZWF0ZWQ6ICR7bm9kZU5hbWV9YCArIChhcHBsaWVkLmxlbmd0aCA/IGAgWyR7YXBwbGllZC5qb2luKCcsICcpfV1gIDogJycpLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBkZWxldGVOb2RlKHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncmVtb3ZlLW5vZGUnLCB7IHV1aWQgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBOb2RlIGRlbGV0ZWQ6ICR7dXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBEaXNwYXRjaDogc2luZ2xlIHByb3BlcnR5IG9yIGJhdGNoIHByb3BlcnRpZXNcclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydHlEaXNwYXRjaChhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGNvbnN0IHsgdXVpZCB9ID0gYXJncztcclxuXHJcbiAgICAgICAgLy8gQmF0Y2ggbW9kZVxyXG4gICAgICAgIGlmIChhcmdzLnByb3BlcnRpZXMgJiYgdHlwZW9mIGFyZ3MucHJvcGVydGllcyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICAgICAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCBbcHJvcCwgdmFsXSBvZiBPYmplY3QuZW50cmllcyhhcmdzLnByb3BlcnRpZXMpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5zZXRQcm9wZXJ0eSh1dWlkLCBwcm9wLCB2YWwpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChwcm9wKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goYCR7cHJvcH06ICR7ci5lcnJvcn1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHJlc3VsdHMubGVuZ3RoID4gMCxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2V0OiBbJHtyZXN1bHRzLmpvaW4oJywgJyl9XWAgKyAoZXJyb3JzLmxlbmd0aCA/IGAgRXJyb3JzOiBbJHtlcnJvcnMuam9pbignOyAnKX1dYCA6ICcnKSxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFNldDogWyR7cmVzdWx0cy5qb2luKCcsICcpfV0gb24gJHt1dWlkfWAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNpbmdsZSBtb2RlIChiYWNrd2FyZCBjb21wYXRpYmxlKVxyXG4gICAgICAgIGlmIChhcmdzLnByb3BlcnR5ICE9PSB1bmRlZmluZWQgJiYgYXJncy52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldFByb3BlcnR5KHV1aWQsIGFyZ3MucHJvcGVydHksIGFyZ3MudmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJvdmlkZSBcInByb3BlcnR5XCIrXCJ2YWx1ZVwiIG9yIFwicHJvcGVydGllc1wiIG9iamVjdCcgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNldFByb3BlcnR5KHV1aWQ6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgLy8gTWFwIGNvbW1vbiBwcm9wZXJ0eSBuYW1lcyB0byBFZGl0b3IgQVBJIHBhdGhzXHJcbiAgICAgICAgY29uc3QgcHJvcGVydHlNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiAncG9zaXRpb24nLFxyXG4gICAgICAgICAgICByb3RhdGlvbjogJ2V1bGVyJywgLy8gdXNlIGV1bGVyIGFuZ2xlcyBmb3Igcm90YXRpb25cclxuICAgICAgICAgICAgc2NhbGU6ICdzY2FsZScsXHJcbiAgICAgICAgICAgIG5hbWU6ICduYW1lJyxcclxuICAgICAgICAgICAgYWN0aXZlOiAnYWN0aXZlJyxcclxuICAgICAgICAgICAgbGF5ZXI6ICdsYXllcicsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3QgZWRpdG9yUGF0aCA9IHByb3BlcnR5TWFwW3Byb3BlcnR5XSB8fCBwcm9wZXJ0eTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gRm9yIHRyYW5zZm9ybSBwcm9wZXJ0aWVzLCBzZXQgc3ViLXByb3BlcnRpZXNcclxuICAgICAgICAgICAgaWYgKHByb3BlcnR5ID09PSAncG9zaXRpb24nIHx8IHByb3BlcnR5ID09PSAncm90YXRpb24nIHx8IHByb3BlcnR5ID09PSAnc2NhbGUnKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWNWYWx1ZSA9IHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgPyB2YWx1ZSA6IHsgeDogMCwgeTogMCwgejogMCB9O1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogZWRpdG9yUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiB2ZWNWYWx1ZSB9LFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICdhY3RpdmUnKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBhY3RpdmUgbmVlZHMgcHJvcGVyIGJvb2xlYW4gcGFyc2luZyAoc3RyaW5nIFwiZmFsc2VcIiBtdXN0IGJlY29tZSBmYWxzZSlcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJvb2xWYWwgPSB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnXHJcbiAgICAgICAgICAgICAgICAgICAgPyB2YWx1ZS50b0xvd2VyQ2FzZSgpICE9PSAnZmFsc2UnICYmIHZhbHVlICE9PSAnMCcgJiYgdmFsdWUgIT09ICcnXHJcbiAgICAgICAgICAgICAgICAgICAgOiAhIXZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJ2FjdGl2ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogYm9vbFZhbCwgdHlwZTogJ0Jvb2xlYW4nIH0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgICAgICB1dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGVkaXRvclBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZSB9LFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMTAwKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFZlcmlmeSBmb3IgcHJvcGVydGllcyB0aGF0IGNhbiBzaWxlbnRseSBmYWlsXHJcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSA9PT0gJ2FjdGl2ZScgfHwgcHJvcGVydHkgPT09ICduYW1lJykge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZURhdGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCB1dWlkKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbCA9IG5vZGVEYXRhPy5bZWRpdG9yUGF0aF0/LnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgLy8gRm9yIGFjdGl2ZSwgY29tcGFyZSBhcyBib29sZWFucyAodmFsdWUgbWF5IGJlIHN0cmluZyBcImZhbHNlXCIpXHJcbiAgICAgICAgICAgICAgICBjb25zdCBleHBlY3RlZCA9IHByb3BlcnR5ID09PSAnYWN0aXZlJ1xyXG4gICAgICAgICAgICAgICAgICAgID8gKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZS50b0xvd2VyQ2FzZSgpICE9PSAnZmFsc2UnICYmIHZhbHVlICE9PSAnMCcgJiYgdmFsdWUgIT09ICcnIDogISF2YWx1ZSlcclxuICAgICAgICAgICAgICAgICAgICA6IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBFZGl0b3IgQVBJIGZhaWxlZCDigJQgdXNlIHNjZW5lIHNjcmlwdCBmYWxsYmFja1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdzZXROb2RlUHJvcGVydHknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbdXVpZCwgcHJvcGVydHksIGV4cGVjdGVkXSxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0Py5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBzZXQgJHtwcm9wZXJ0eX1gIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQgJHtwcm9wZXJ0eX0gb24gJHt1dWlkfWAgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHNjZW5lIHNjcmlwdFxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdzZXROb2RlUHJvcGVydHknLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFt1dWlkLCBwcm9wZXJ0eSwgdmFsdWVdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHNldCBwcm9wZXJ0eScgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRlbGF5KG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBtb3ZlTm9kZSh1dWlkOiBzdHJpbmcsIHBhcmVudFV1aWQ6IHN0cmluZywgc2libGluZ0luZGV4PzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBvcHRpb25zOiBhbnkgPSB7XHJcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudFV1aWQsXHJcbiAgICAgICAgICAgICAgICB1dWlkczogW3V1aWRdLFxyXG4gICAgICAgICAgICAgICAga2VlcFdvcmxkVHJhbnNmb3JtOiBmYWxzZSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXBhcmVudCcsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHNpYmxpbmdJbmRleCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBTZXQgc2libGluZyBpbmRleCBhZnRlciByZXBhcmVudGluZ1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJ3NpYmxpbmdJbmRleCcsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogc2libGluZ0luZGV4IH0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYE1vdmVkIG5vZGUgJHt1dWlkfSB0byBwYXJlbnQgJHtwYXJlbnRVdWlkfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZHVwbGljYXRlTm9kZSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZHVwbGljYXRlLW5vZGUnLCBbdXVpZF0pO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHsgZHVwbGljYXRlZFV1aWRzOiByZXN1bHQgfSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBOb2RlIGR1cGxpY2F0ZWQ6ICR7dXVpZH1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldFRyYW5zZm9ybSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3Jlc2V0LW5vZGUnLCB7IHV1aWQgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBUcmFuc2Zvcm0gcmVzZXQgb24gbm9kZSAke3V1aWR9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQnlBc3NldChhc3NldFV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2Rlcy1ieS1hc3NldC11dWlkJywgYXNzZXRVdWlkKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0IHx8IFtdIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSGVscGVycyA9PT1cclxuXHJcbiAgICBwcml2YXRlIHBhcnNlTm9kZURhdGEoZGF0YTogYW55LCB1dWlkOiBzdHJpbmcpOiBhbnkge1xyXG4gICAgICAgIGNvbnN0IGluZm86IGFueSA9IHtcclxuICAgICAgICAgICAgdXVpZCxcclxuICAgICAgICAgICAgbmFtZTogZGF0YS5uYW1lPy52YWx1ZSA/PyBkYXRhLm5hbWUgPz8gJ3Vua25vd24nLFxyXG4gICAgICAgICAgICBhY3RpdmU6IGRhdGEuYWN0aXZlPy52YWx1ZSA/PyBkYXRhLmFjdGl2ZSA/PyB0cnVlLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3QgcG9zaXRpb25cclxuICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbj8udmFsdWUpIHtcclxuICAgICAgICAgICAgY29uc3QgcCA9IGRhdGEucG9zaXRpb24udmFsdWU7XHJcbiAgICAgICAgICAgIGluZm8ucG9zaXRpb24gPSB7IHg6IHAueCA/PyAwLCB5OiBwLnkgPz8gMCwgejogcC56ID8/IDAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3Qgcm90YXRpb24gKGV1bGVyKVxyXG4gICAgICAgIGlmIChkYXRhLmV1bGVyPy52YWx1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YS5ldWxlci52YWx1ZTtcclxuICAgICAgICAgICAgaW5mby5yb3RhdGlvbiA9IHsgeDogci54ID8/IDAsIHk6IHIueSA/PyAwLCB6OiByLnogPz8gMCB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBzY2FsZVxyXG4gICAgICAgIGlmIChkYXRhLnNjYWxlPy52YWx1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCBzID0gZGF0YS5zY2FsZS52YWx1ZTtcclxuICAgICAgICAgICAgaW5mby5zY2FsZSA9IHsgeDogcy54ID8/IDEsIHk6IHMueSA/PyAxLCB6OiBzLnogPz8gMSB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBwYXJlbnQgKGp1c3QgVVVJRClcclxuICAgICAgICBpZiAoZGF0YS5wYXJlbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgcGFyZW50VXVpZCA9IGRhdGEucGFyZW50Py52YWx1ZT8udXVpZCA/PyBkYXRhLnBhcmVudD8udXVpZCA/PyBkYXRhLnBhcmVudDtcclxuICAgICAgICAgICAgaWYgKHBhcmVudFV1aWQpIGluZm8ucGFyZW50VXVpZCA9IHR5cGVvZiBwYXJlbnRVdWlkID09PSAnc3RyaW5nJyA/IHBhcmVudFV1aWQgOiBwYXJlbnRVdWlkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBjaGlsZHJlbiAoanVzdCBVVUlEcylcclxuICAgICAgICBpZiAoZGF0YS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICBjb25zdCBraWRzID0gQXJyYXkuaXNBcnJheShkYXRhLmNoaWxkcmVuKSA/IGRhdGEuY2hpbGRyZW4gOiBbXTtcclxuICAgICAgICAgICAgaW5mby5jaGlsZHJlbiA9IGtpZHMubWFwKChjOiBhbnkpID0+IGM/LnZhbHVlPy51dWlkID8/IGM/LnV1aWQgPz8gYyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBFeHRyYWN0IGxheWVyXHJcbiAgICAgICAgaWYgKGRhdGEubGF5ZXI/LnZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgaW5mby5sYXllciA9IGRhdGEubGF5ZXIudmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBFeHRyYWN0IGNvbXBvbmVudHMgKGNvbXBhY3QpXHJcbiAgICAgICAgaWYgKGRhdGEuX19jb21wc19fKSB7XHJcbiAgICAgICAgICAgIGluZm8uY29tcG9uZW50cyA9IGRhdGEuX19jb21wc19fLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogYy50eXBlIHx8IGMuX190eXBlX18gfHwgYy5jaWQgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgICAgICAgICAgZW5hYmxlZDogYy5lbmFibGVkPy52YWx1ZSA/PyBjLmVuYWJsZWQgPz8gdHJ1ZSxcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGluZm87XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZWFyY2hUcmVlKG5vZGU6IGFueSwgdGFyZ2V0TmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIHJlc3VsdHM6IGFueVtdKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgY3VycmVudFBhdGggPSBwYXRoID8gYCR7cGF0aH0vJHtub2RlLm5hbWV9YCA6IG5vZGUubmFtZTtcclxuICAgICAgICBpZiAobm9kZS5uYW1lID09PSB0YXJnZXROYW1lKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lLCBwYXRoOiBjdXJyZW50UGF0aCB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlYXJjaFRyZWUoY2hpbGQsIHRhcmdldE5hbWUsIGN1cnJlbnRQYXRoLCByZXN1bHRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNvbGxlY3ROb2Rlcyhub2RlOiBhbnksIHJlc3VsdHM6IGFueVtdKTogdm9pZCB7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUgIT09IGZhbHNlLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0Tm9kZXMoY2hpbGQsIHJlc3VsdHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiJdfQ==