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
            {
                name: 'copy',
                description: 'Copy node(s) to editor clipboard',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuids: { type: 'array', description: 'Node UUIDs to copy' },
                    },
                    required: ['uuids'],
                },
            },
            {
                name: 'paste',
                description: 'Paste node(s) from clipboard to a target parent',
                inputSchema: {
                    type: 'object',
                    properties: {
                        target: { type: 'string', description: 'Parent node UUID (default: scene root)' },
                        keepWorldTransform: { type: 'boolean', description: 'Preserve world coordinates (default: false)' },
                    },
                },
            },
            {
                name: 'cut',
                description: 'Cut node(s) (copy to clipboard and mark for deletion)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuids: { type: 'array', description: 'Node UUIDs to cut' },
                    },
                    required: ['uuids'],
                },
            },
            {
                name: 'create_primitive',
                description: 'Create a 3D primitive shape node (Cube, Sphere, etc.)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: ['Capsule', 'Cone', 'Cube', 'Cylinder', 'Plane', 'Quad', 'Sphere', 'Torus'],
                            description: 'Primitive type',
                        },
                        parentUuid: { type: 'string', description: 'Parent node UUID' },
                        name: { type: 'string', description: 'Override node name' },
                    },
                    required: ['type'],
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
            case 'copy': return this.copyNodes(args.uuids);
            case 'paste': return this.pasteNodes(args);
            case 'cut': return this.cutNodes(args.uuids);
            case 'create_primitive': return this.createPrimitive(args);
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
            // Auto-add cc.UITransform for 2D nodes
            if (args.type === '2DNode') {
                try {
                    await Editor.Message.request('scene', 'create-component', {
                        uuid: nodeUuid,
                        component: 'cc.UITransform',
                    });
                    applied.push('+cc.UITransform');
                }
                catch (_b) {
                    // UITransform may already exist, ignore
                }
            }
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
    async copyNodes(uuids) {
        try {
            await Editor.Message.request('scene', 'copy-node', uuids);
            return { success: true, message: `Copied ${uuids.length} node(s) to clipboard` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async pasteNodes(args) {
        try {
            const result = await Editor.Message.request('scene', 'paste-node', {
                target: args.target,
                keepWorldTransform: args.keepWorldTransform || false,
            });
            return {
                success: true,
                data: { pastedUuids: result },
                message: 'Node(s) pasted from clipboard',
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async cutNodes(uuids) {
        try {
            await Editor.Message.request('scene', 'cut-node', uuids);
            return { success: true, message: `Cut ${uuids.length} node(s) to clipboard` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async createPrimitive(args) {
        try {
            const prefabUrl = `db://internal/default_prefab/3d/${args.type}.prefab`;
            const uuidResult = await Editor.Message.request('asset-db', 'query-uuid', prefabUrl);
            const uuid = typeof uuidResult === 'string' ? uuidResult : uuidResult === null || uuidResult === void 0 ? void 0 : uuidResult.uuid;
            if (!uuid) {
                return { success: false, error: `Primitive type '${args.type}' not found` };
            }
            let parentUuid = args.parentUuid;
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
            const nodeUuid = await Editor.Message.request('scene', 'create-node', {
                parent: parentUuid,
                assetUuid: uuid,
                name: args.name || args.type,
            });
            return {
                success: true,
                data: { uuid: nodeUuid, name: args.name || args.type },
                message: `Primitive '${args.name || args.type}' created`,
            };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9ub2RlLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDO0FBRTdDLE1BQWEsU0FBUztJQUVsQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSw0R0FBNEc7Z0JBQ3pILFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsNkJBQTZCLEVBQUU7d0JBQ3BFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFO3dCQUN2RCxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSw4Q0FBOEMsRUFBRTt3QkFDekYsaUJBQWlCLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSx3REFBd0QsRUFBRTt3QkFDN0csT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsZ0VBQWdFLEVBQUU7cUJBQzlHO2lCQUNKO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxXQUFXLEVBQUUsNkZBQTZGO2dCQUMxRyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7d0JBQ3hCLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdDQUF3QyxFQUFFO3dCQUNyRixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxvQkFB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QUFFLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDN0QsQ0FBQztRQUNMLENBQUM7SUFDTCxDQUFDO0lBRU8sWUFBWSxDQUFDLElBQVMsRUFBRSxPQUFjO1FBQzFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7WUFDVCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLO1NBQ2hDLENBQUMsQ0FBQztRQUNILElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2hCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN0QyxDQUFDO1FBQ0wsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQS92QkQsOEJBK3ZCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmNvbnN0IEVYVEVOU0lPTl9OQU1FID0gJ2NvY29zLW1jcC1leHRlbnNpb24nO1xyXG5cclxuZXhwb3J0IGNsYXNzIE5vZGVUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XHJcblxyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUXVlcnkgbm9kZSBieSBVVUlELCBuYW1lLCBvciBsaXN0IGFsbCBub2Rlcy4gVXNlIGluY2x1ZGVDb21wb25lbnRzIGZvciBkZXRhaWxlZCBjb21wb25lbnQgaW5mbyBpbiBvbmUgY2FsbCcsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQgZm9yIGRldGFpbGVkIGluZm8nIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU2VhcmNoIGJ5IG5hbWUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RBbGw6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIG5vZGVzIChjb21wYWN0OiB1dWlkLCBuYW1lLCBwYXJlbnQpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbmNsdWRlQ29tcG9uZW50czogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnSW5jbHVkZSBkZXRhaWxlZCBjb21wb25lbnQgcHJvcGVydGllcyAob25seSB3aXRoIHV1aWQpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2ZXJib3NlOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdJbmNsdWRlIHJlYWRvbmx5IHByb3BzIGFuZCBkZWZhdWx0IHZhbHVlcyBpbiBjb21wb25lbnQgZGV0YWlscycgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2NyZWF0ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NyZWF0ZSBhIG5ldyBub2RlIHdpdGggb3B0aW9uYWwgdHJhbnNmb3JtLCBjb21wb25lbnRzLCBhbmQgcHJlZmFiIGluc3RhbnRpYXRpb24gaW4gb25lIGNhbGwnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQYXJlbnQgbm9kZSBVVUlEIChkZWZhdWx0OiBzY2VuZSByb290KScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOb2RlLzJETm9kZS8zRE5vZGUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQcmVmYWIgVVVJRCB0byBpbnN0YW50aWF0ZSAodXNlcyBjYy5pbnN0YW50aWF0ZSBmb3IgcHJvcGVyIHByZWZhYiBsaW5raW5nKScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHsgdHlwZTogJ29iamVjdCcsIGRlc2NyaXB0aW9uOiAne3gsIHksIHp9JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByb3RhdGlvbjogeyB0eXBlOiAnb2JqZWN0JywgZGVzY3JpcHRpb246ICd7eCwgeSwgen0gZXVsZXIgYW5nbGVzJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzY2FsZTogeyB0eXBlOiAnb2JqZWN0JywgZGVzY3JpcHRpb246ICd7eCwgeSwgen0nIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZXMgdG8gYWRkLCBlLmcuIFtcImNjLlNwcml0ZVwiLCBcImNjLkJ1dHRvblwiXScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyduYW1lJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZGVsZXRlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRGVsZXRlIGEgbm9kZSBmcm9tIHRoZSBzY2VuZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NldF9wcm9wZXJ0eScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NldCBvbmUgb3IgbXVsdGlwbGUgbm9kZSBwcm9wZXJ0aWVzIGF0IG9uY2UuIFVzZSBcInByb3BlcnRpZXNcIiBmb3IgYmF0Y2gsIG9yIFwicHJvcGVydHlcIitcInZhbHVlXCIgZm9yIHNpbmdsZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTaW5nbGUgbW9kZTogbmFtZSwgYWN0aXZlLCBwb3NpdGlvbiwgcm90YXRpb24sIHNjYWxlLCBsYXllcicgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgZGVzY3JpcHRpb246ICdTaW5nbGUgbW9kZTogcHJvcGVydHkgdmFsdWUuIEZvciB0cmFuc2Zvcm1zIHVzZSB7eCx5LHp9JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQmF0Y2ggbW9kZTogeyBwb3NpdGlvbjoge3gseSx6fSwgc2NhbGU6IHt4LHksen0sIGFjdGl2ZTogdHJ1ZSwgbmFtZTogXCJOZXdOYW1lXCIgfScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZHVwbGljYXRlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRHVwbGljYXRlIGEgbm9kZSAoY29weSArIHBhc3RlKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQgdG8gZHVwbGljYXRlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3Jlc2V0X3RyYW5zZm9ybScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Jlc2V0IG5vZGUgcG9zaXRpb24vcm90YXRpb24vc2NhbGUgdG8gZGVmYXVsdHMnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdmaW5kX2J5X2Fzc2V0JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmluZCBhbGwgbm9kZXMgdXNpbmcgYSBzcGVjaWZpYyBhc3NldCBVVUlEJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVVJRCB0byBzZWFyY2ggZm9yJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYXNzZXRVdWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnbW92ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01vdmUgbm9kZSB0byBhIG5ldyBwYXJlbnQnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5nSW5kZXg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnUG9zaXRpb24gYW1vbmcgc2libGluZ3MgKG9wdGlvbmFsKScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnLCAncGFyZW50VXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvcHknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb3B5IG5vZGUocykgdG8gZWRpdG9yIGNsaXBib2FyZCcsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZHM6IHsgdHlwZTogJ2FycmF5JywgZGVzY3JpcHRpb246ICdOb2RlIFVVSURzIHRvIGNvcHknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkcyddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3Bhc3RlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUGFzdGUgbm9kZShzKSBmcm9tIGNsaXBib2FyZCB0byBhIHRhcmdldCBwYXJlbnQnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQYXJlbnQgbm9kZSBVVUlEIChkZWZhdWx0OiBzY2VuZSByb290KScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAga2VlcFdvcmxkVHJhbnNmb3JtOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdQcmVzZXJ2ZSB3b3JsZCBjb29yZGluYXRlcyAoZGVmYXVsdDogZmFsc2UpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY3V0JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3V0IG5vZGUocykgKGNvcHkgdG8gY2xpcGJvYXJkIGFuZCBtYXJrIGZvciBkZWxldGlvbiknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWRzOiB7IHR5cGU6ICdhcnJheScsIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEcyB0byBjdXQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkcyddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2NyZWF0ZV9wcmltaXRpdmUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDcmVhdGUgYSAzRCBwcmltaXRpdmUgc2hhcGUgbm9kZSAoQ3ViZSwgU3BoZXJlLCBldGMuKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ0NhcHN1bGUnLCAnQ29uZScsICdDdWJlJywgJ0N5bGluZGVyJywgJ1BsYW5lJywgJ1F1YWQnLCAnU3BoZXJlJywgJ1RvcnVzJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1ByaW1pdGl2ZSB0eXBlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQYXJlbnQgbm9kZSBVVUlEJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ092ZXJyaWRlIG5vZGUgbmFtZScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3R5cGUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeSc6IHJldHVybiB0aGlzLnF1ZXJ5KGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdjcmVhdGUnOiByZXR1cm4gdGhpcy5jcmVhdGVOb2RlKGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdkZWxldGUnOiByZXR1cm4gdGhpcy5kZWxldGVOb2RlKGFyZ3MudXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NldF9wcm9wZXJ0eSc6IHJldHVybiB0aGlzLnNldFByb3BlcnR5RGlzcGF0Y2goYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2R1cGxpY2F0ZSc6IHJldHVybiB0aGlzLmR1cGxpY2F0ZU5vZGUoYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSAncmVzZXRfdHJhbnNmb3JtJzogcmV0dXJuIHRoaXMucmVzZXRUcmFuc2Zvcm0oYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSAnZmluZF9ieV9hc3NldCc6IHJldHVybiB0aGlzLmZpbmRCeUFzc2V0KGFyZ3MuYXNzZXRVdWlkKTtcclxuICAgICAgICAgICAgY2FzZSAnbW92ZSc6IHJldHVybiB0aGlzLm1vdmVOb2RlKGFyZ3MudXVpZCwgYXJncy5wYXJlbnRVdWlkLCBhcmdzLnNpYmxpbmdJbmRleCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NvcHknOiByZXR1cm4gdGhpcy5jb3B5Tm9kZXMoYXJncy51dWlkcyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3Bhc3RlJzogcmV0dXJuIHRoaXMucGFzdGVOb2RlcyhhcmdzKTtcclxuICAgICAgICAgICAgY2FzZSAnY3V0JzogcmV0dXJuIHRoaXMuY3V0Tm9kZXMoYXJncy51dWlkcyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZV9wcmltaXRpdmUnOiByZXR1cm4gdGhpcy5jcmVhdGVQcmltaXRpdmUoYXJncyk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gbm9kZSB0b29sOiAke3Rvb2xOYW1lfWAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFRvb2wgSW1wbGVtZW50YXRpb25zID09PVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBpZiAoYXJncy51dWlkKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZ2V0Tm9kZUluZm8oYXJncy51dWlkKTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzICYmIGFyZ3MuaW5jbHVkZUNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbXBvbmVudERldGFpbHMgPSBhd2FpdCB0aGlzLmdldENvbXBvbmVudERldGFpbHMoYXJncy51dWlkLCAhIWFyZ3MudmVyYm9zZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGFyZ3MubmFtZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5maW5kQnlOYW1lKGFyZ3MubmFtZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhcmdzLmxpc3RBbGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubGlzdEFsbCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcm92aWRlIHV1aWQsIG5hbWUsIG9yIGxpc3RBbGwnIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBnZXRDb21wb25lbnREZXRhaWxzKG5vZGVVdWlkOiBzdHJpbmcsIHZlcmJvc2U6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8YW55W10+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlRGF0YSB8fCAhbm9kZURhdGEuX19jb21wc19fKSByZXR1cm4gW107XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbm9kZURhdGEuX19jb21wc19fLm1hcCgoY29tcDogYW55KSA9PlxyXG4gICAgICAgICAgICAgICAgdGhpcy5leHRyYWN0Q29tcGFjdChjb21wLCB2ZXJib3NlKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8qKiBFeHRyYWN0IGNvbXBhY3QgY29tcG9uZW50IGluZm86IG9ubHkgdmlzaWJsZSwgbm9uLWludGVybmFsLCBub24tZGVmYXVsdCBwcm9wZXJ0aWVzLiAqL1xyXG4gICAgcHJpdmF0ZSBleHRyYWN0Q29tcGFjdChjb21wOiBhbnksIHZlcmJvc2U6IGJvb2xlYW4gPSBmYWxzZSk6IGFueSB7XHJcbiAgICAgICAgY29uc3QgaW5mbzogYW55ID0ge1xyXG4gICAgICAgICAgICB0eXBlOiBjb21wLnR5cGUgfHwgY29tcC5fX3R5cGVfXyB8fCBjb21wLmNpZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZD8udmFsdWUgPz8gY29tcC5lbmFibGVkID8/IHRydWUsXHJcbiAgICAgICAgICAgIHByb3BlcnRpZXM6IHt9LFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIGNvbXAudmFsdWUgaG9sZHMgcGVyLXByb3BlcnR5IG1ldGFkYXRhOyBmYWxsIGJhY2sgdG8gY29tcCBpdHNlbGZcclxuICAgICAgICBjb25zdCBzb3VyY2UgPSBjb21wLnZhbHVlIHx8IGNvbXA7XHJcbiAgICAgICAgY29uc3Qgc2tpcEtleXMgPSBuZXcgU2V0KFtcclxuICAgICAgICAgICAgJ19fdHlwZV9fJywgJ3R5cGUnLCAnY2lkJywgJ19uYW1lJywgJ19vYmpGbGFncycsICdub2RlJywgJ19fcHJlZmFiJywgJ2ZpbGVJZCcsXHJcbiAgICAgICAgICAgICd1dWlkJywgJ25hbWUnLCAnZW5hYmxlZCcsICdfZW5hYmxlZCcsICdfX3NjcmlwdEFzc2V0JyxcclxuICAgICAgICBdKTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBtZXRhXSBvZiBPYmplY3QuZW50cmllcyhzb3VyY2UpKSB7XHJcbiAgICAgICAgICAgIGlmIChza2lwS2V5cy5oYXMoa2V5KSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnXycpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdlZGl0b3InKSkgY29udGludWU7IC8vIHNraXAgZWRpdG9yLW9ubHkgZGlzcGxheSBkdXBsaWNhdGVzXHJcblxyXG4gICAgICAgICAgICBjb25zdCBtID0gbWV0YSBhcyBhbnk7XHJcbiAgICAgICAgICAgIGlmICghbSB8fCB0eXBlb2YgbSAhPT0gJ29iamVjdCcpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAobS52aXNpYmxlID09PSBmYWxzZSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmICghdmVyYm9zZSAmJiBtLnJlYWRvbmx5ID09PSB0cnVlKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKCF2ZXJib3NlICYmICd2YWx1ZScgaW4gbSAmJiAnZGVmYXVsdCcgaW4gbSAmJiB0aGlzLnZhbHVlRXF1YWxzKG0udmFsdWUsIG0uZGVmYXVsdCkpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgaWYgKCd2YWx1ZScgaW4gbSkge1xyXG4gICAgICAgICAgICAgICAgaW5mby5wcm9wZXJ0aWVzW2tleV0gPSBtLnZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaW5mbztcclxuICAgIH1cclxuXHJcbiAgICAvKiogRGVlcCBlcXVhbGl0eSBjaGVjayBmb3IgcHJvcGVydHkgdmFsdWVzLiAqL1xyXG4gICAgcHJpdmF0ZSB2YWx1ZUVxdWFscyhhOiBhbnksIGI6IGFueSk6IGJvb2xlYW4ge1xyXG4gICAgICAgIGlmIChhID09PSBiKSByZXR1cm4gdHJ1ZTtcclxuICAgICAgICBpZiAoYSA9PSBudWxsIHx8IGIgPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgYSAhPT0gdHlwZW9mIGIpIHJldHVybiBmYWxzZTtcclxuICAgICAgICBpZiAodHlwZW9mIGEgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgY29uc3Qga2EgPSBPYmplY3Qua2V5cyhhKTtcclxuICAgICAgICBjb25zdCBrYiA9IE9iamVjdC5rZXlzKGIpO1xyXG4gICAgICAgIGlmIChrYS5sZW5ndGggIT09IGtiLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIHJldHVybiBrYS5ldmVyeShrID0+IHRoaXMudmFsdWVFcXVhbHMoYVtrXSwgYltrXSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Tm9kZUluZm8odXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHt1dWlkfWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB0aGlzLnBhcnNlTm9kZURhdGEobm9kZURhdGEsIHV1aWQpIH07XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBzY2VuZSBzY3JpcHRcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0Tm9kZUluZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFt1dWlkXSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGRhdGEgcmV0dXJuZWQnIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQnlOYW1lKG5hbWU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xyXG4gICAgICAgICAgICBpZiAoIXRyZWUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHNjZW5lIHRyZWUgYXZhaWxhYmxlJyB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuc2VhcmNoVHJlZSh0cmVlLCBuYW1lLCAnJywgcmVzdWx0cyk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm8gbm9kZSBmb3VuZCB3aXRoIG5hbWU6ICR7bmFtZX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0cyB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdmaW5kTm9kZUJ5TmFtZScsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25hbWVdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gZGF0YSByZXR1cm5lZCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RBbGwoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB0cmVlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XHJcbiAgICAgICAgICAgIGlmICghdHJlZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gc2NlbmUgdHJlZSBhdmFpbGFibGUnIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGVjdE5vZGVzKHRyZWUsIG5vZGVzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0b3RhbE5vZGVzOiBub2Rlcy5sZW5ndGgsIG5vZGVzIH0gfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0QWxsTm9kZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gZGF0YSByZXR1cm5lZCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZU5vZGUoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsZXQgcGFyZW50VXVpZCA9IGFyZ3MucGFyZW50VXVpZDtcclxuICAgICAgICAgICAgbGV0IG5vZGVVdWlkOiBzdHJpbmc7XHJcbiAgICAgICAgICAgIGxldCBub2RlTmFtZSA9IGFyZ3MubmFtZTtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIG5vIHBhcmVudCBzcGVjaWZpZWQsIGdldCBzY2VuZSByb290XHJcbiAgICAgICAgICAgIGlmICghcGFyZW50VXVpZCkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmVlOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkID0gdHJlZT8udXVpZDtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjZW5lSW5mbzogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktY3VycmVudC1zY2VuZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQgPSBzY2VuZUluZm8/LnV1aWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghcGFyZW50VXVpZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnQ2Fubm90IGRldGVybWluZSBzY2VuZSByb290JyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBJZiBhc3NldFV1aWQgaXMgcHJvdmlkZWQsIHVzZSBjYy5pbnN0YW50aWF0ZSB2aWEgc2NlbmUgc2NyaXB0IGZvciBwcm9wZXIgcHJlZmFiIGxpbmtpbmdcclxuICAgICAgICAgICAgaWYgKGFyZ3MuYXNzZXRVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2luc3RhbnRpYXRlUHJlZmFiJyxcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbYXJncy5hc3NldFV1aWQsIHBhcmVudFV1aWQsIGFyZ3MubmFtZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmICghcmVzdWx0IHx8ICFyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdQcmVmYWIgaW5zdGFudGlhdGlvbiBmYWlsZWQnIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBub2RlVXVpZCA9IHJlc3VsdC5kYXRhLnV1aWQ7XHJcbiAgICAgICAgICAgICAgICBub2RlTmFtZSA9IHJlc3VsdC5kYXRhLm5hbWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBTdGFuZGFyZCBub2RlIGNyZWF0aW9uXHJcbiAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zOiBhbnkgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBwYXJlbnRVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGFyZ3MubmFtZSxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBpZiAoYXJncy50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3B0aW9ucy50eXBlID0gYXJncy50eXBlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbm9kZVV1aWQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtbm9kZScsIG9wdGlvbnMpIGFzIGFueTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgYXBwbGllZDogc3RyaW5nW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIC8vIEF1dG8tYWRkIGNjLlVJVHJhbnNmb3JtIGZvciAyRCBub2Rlc1xyXG4gICAgICAgICAgICBpZiAoYXJncy50eXBlID09PSAnMkROb2RlJykge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50OiAnY2MuVUlUcmFuc2Zvcm0nLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGFwcGxpZWQucHVzaCgnK2NjLlVJVHJhbnNmb3JtJyk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBVSVRyYW5zZm9ybSBtYXkgYWxyZWFkeSBleGlzdCwgaWdub3JlXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEFwcGx5IHRyYW5zZm9ybSBwcm9wZXJ0aWVzIGlmIHByb3ZpZGVkXHJcbiAgICAgICAgICAgIGlmIChhcmdzLnBvc2l0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnNldFByb3BlcnR5KG5vZGVVdWlkLCAncG9zaXRpb24nLCBhcmdzLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGFwcGxpZWQucHVzaCgncG9zaXRpb24nKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYXJncy5yb3RhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5zZXRQcm9wZXJ0eShub2RlVXVpZCwgJ3JvdGF0aW9uJywgYXJncy5yb3RhdGlvbik7XHJcbiAgICAgICAgICAgICAgICBhcHBsaWVkLnB1c2goJ3JvdGF0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGFyZ3Muc2NhbGUpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuc2V0UHJvcGVydHkobm9kZVV1aWQsICdzY2FsZScsIGFyZ3Muc2NhbGUpO1xyXG4gICAgICAgICAgICAgICAgYXBwbGllZC5wdXNoKCdzY2FsZScpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBBZGQgY29tcG9uZW50cyBpZiBwcm92aWRlZFxyXG4gICAgICAgICAgICBpZiAoYXJncy5jb21wb25lbnRzICYmIEFycmF5LmlzQXJyYXkoYXJncy5jb21wb25lbnRzKSkge1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21wVHlwZSBvZiBhcmdzLmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50Jywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQ6IGNvbXBUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZC5wdXNoKGArJHtjb21wVHlwZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWVkLnB1c2goYCEke2NvbXBUeXBlfSgke2Vyci5tZXNzYWdlfSlgKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiBub2RlVXVpZCwgbmFtZTogbm9kZU5hbWUsIGFwcGxpZWQgfSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBOb2RlIGNyZWF0ZWQ6ICR7bm9kZU5hbWV9YCArIChhcHBsaWVkLmxlbmd0aCA/IGAgWyR7YXBwbGllZC5qb2luKCcsICcpfV1gIDogJycpLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBkZWxldGVOb2RlKHV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncmVtb3ZlLW5vZGUnLCB7IHV1aWQgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBOb2RlIGRlbGV0ZWQ6ICR7dXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBEaXNwYXRjaDogc2luZ2xlIHByb3BlcnR5IG9yIGJhdGNoIHByb3BlcnRpZXNcclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydHlEaXNwYXRjaChhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGNvbnN0IHsgdXVpZCB9ID0gYXJncztcclxuXHJcbiAgICAgICAgLy8gQmF0Y2ggbW9kZVxyXG4gICAgICAgIGlmIChhcmdzLnByb3BlcnRpZXMgJiYgdHlwZW9mIGFyZ3MucHJvcGVydGllcyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICAgICAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgZm9yIChjb25zdCBbcHJvcCwgdmFsXSBvZiBPYmplY3QuZW50cmllcyhhcmdzLnByb3BlcnRpZXMpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5zZXRQcm9wZXJ0eSh1dWlkLCBwcm9wLCB2YWwpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHIuc3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChwcm9wKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goYCR7cHJvcH06ICR7ci5lcnJvcn1gKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHJlc3VsdHMubGVuZ3RoID4gMCxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2V0OiBbJHtyZXN1bHRzLmpvaW4oJywgJyl9XWAgKyAoZXJyb3JzLmxlbmd0aCA/IGAgRXJyb3JzOiBbJHtlcnJvcnMuam9pbignOyAnKX1dYCA6ICcnKSxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFNldDogWyR7cmVzdWx0cy5qb2luKCcsICcpfV0gb24gJHt1dWlkfWAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNpbmdsZSBtb2RlIChiYWNrd2FyZCBjb21wYXRpYmxlKVxyXG4gICAgICAgIGlmIChhcmdzLnByb3BlcnR5ICE9PSB1bmRlZmluZWQgJiYgYXJncy52YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldFByb3BlcnR5KHV1aWQsIGFyZ3MucHJvcGVydHksIGFyZ3MudmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJvdmlkZSBcInByb3BlcnR5XCIrXCJ2YWx1ZVwiIG9yIFwicHJvcGVydGllc1wiIG9iamVjdCcgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNldFByb3BlcnR5KHV1aWQ6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgLy8gTWFwIGNvbW1vbiBwcm9wZXJ0eSBuYW1lcyB0byBFZGl0b3IgQVBJIHBhdGhzXHJcbiAgICAgICAgY29uc3QgcHJvcGVydHlNYXA6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAgICAgICAgIHBvc2l0aW9uOiAncG9zaXRpb24nLFxyXG4gICAgICAgICAgICByb3RhdGlvbjogJ2V1bGVyJywgLy8gdXNlIGV1bGVyIGFuZ2xlcyBmb3Igcm90YXRpb25cclxuICAgICAgICAgICAgc2NhbGU6ICdzY2FsZScsXHJcbiAgICAgICAgICAgIG5hbWU6ICduYW1lJyxcclxuICAgICAgICAgICAgYWN0aXZlOiAnYWN0aXZlJyxcclxuICAgICAgICAgICAgbGF5ZXI6ICdsYXllcicsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgY29uc3QgZWRpdG9yUGF0aCA9IHByb3BlcnR5TWFwW3Byb3BlcnR5XSB8fCBwcm9wZXJ0eTtcclxuXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8gRm9yIHRyYW5zZm9ybSBwcm9wZXJ0aWVzLCBzZXQgc3ViLXByb3BlcnRpZXNcclxuICAgICAgICAgICAgaWYgKHByb3BlcnR5ID09PSAncG9zaXRpb24nIHx8IHByb3BlcnR5ID09PSAncm90YXRpb24nIHx8IHByb3BlcnR5ID09PSAnc2NhbGUnKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB2ZWNWYWx1ZSA9IHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgPyB2YWx1ZSA6IHsgeDogMCwgeTogMCwgejogMCB9O1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogZWRpdG9yUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiB2ZWNWYWx1ZSB9LFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHJvcGVydHkgPT09ICdhY3RpdmUnKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBhY3RpdmUgbmVlZHMgcHJvcGVyIGJvb2xlYW4gcGFyc2luZyAoc3RyaW5nIFwiZmFsc2VcIiBtdXN0IGJlY29tZSBmYWxzZSlcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJvb2xWYWwgPSB0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnXHJcbiAgICAgICAgICAgICAgICAgICAgPyB2YWx1ZS50b0xvd2VyQ2FzZSgpICE9PSAnZmFsc2UnICYmIHZhbHVlICE9PSAnMCcgJiYgdmFsdWUgIT09ICcnXHJcbiAgICAgICAgICAgICAgICAgICAgOiAhIXZhbHVlO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJ2FjdGl2ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogYm9vbFZhbCwgdHlwZTogJ0Jvb2xlYW4nIH0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgICAgICB1dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGVkaXRvclBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZSB9LFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMTAwKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFZlcmlmeSBmb3IgcHJvcGVydGllcyB0aGF0IGNhbiBzaWxlbnRseSBmYWlsXHJcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSA9PT0gJ2FjdGl2ZScgfHwgcHJvcGVydHkgPT09ICduYW1lJykge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgbm9kZURhdGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCB1dWlkKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbCA9IG5vZGVEYXRhPy5bZWRpdG9yUGF0aF0/LnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgLy8gRm9yIGFjdGl2ZSwgY29tcGFyZSBhcyBib29sZWFucyAodmFsdWUgbWF5IGJlIHN0cmluZyBcImZhbHNlXCIpXHJcbiAgICAgICAgICAgICAgICBjb25zdCBleHBlY3RlZCA9IHByb3BlcnR5ID09PSAnYWN0aXZlJ1xyXG4gICAgICAgICAgICAgICAgICAgID8gKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgPyB2YWx1ZS50b0xvd2VyQ2FzZSgpICE9PSAnZmFsc2UnICYmIHZhbHVlICE9PSAnMCcgJiYgdmFsdWUgIT09ICcnIDogISF2YWx1ZSlcclxuICAgICAgICAgICAgICAgICAgICA6IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFjdHVhbCAhPT0gZXhwZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBFZGl0b3IgQVBJIGZhaWxlZCDigJQgdXNlIHNjZW5lIHNjcmlwdCBmYWxsYmFja1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdzZXROb2RlUHJvcGVydHknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbdXVpZCwgcHJvcGVydHksIGV4cGVjdGVkXSxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0Py5zdWNjZXNzKSByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBzZXQgJHtwcm9wZXJ0eX1gIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQgJHtwcm9wZXJ0eX0gb24gJHt1dWlkfWAgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHNjZW5lIHNjcmlwdFxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdzZXROb2RlUHJvcGVydHknLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFt1dWlkLCBwcm9wZXJ0eSwgdmFsdWVdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHNldCBwcm9wZXJ0eScgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRlbGF5KG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBtb3ZlTm9kZSh1dWlkOiBzdHJpbmcsIHBhcmVudFV1aWQ6IHN0cmluZywgc2libGluZ0luZGV4PzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBvcHRpb25zOiBhbnkgPSB7XHJcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudFV1aWQsXHJcbiAgICAgICAgICAgICAgICB1dWlkczogW3V1aWRdLFxyXG4gICAgICAgICAgICAgICAga2VlcFdvcmxkVHJhbnNmb3JtOiBmYWxzZSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXBhcmVudCcsIG9wdGlvbnMpO1xyXG5cclxuICAgICAgICAgICAgaWYgKHNpYmxpbmdJbmRleCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBTZXQgc2libGluZyBpbmRleCBhZnRlciByZXBhcmVudGluZ1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogJ3NpYmxpbmdJbmRleCcsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogc2libGluZ0luZGV4IH0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYE1vdmVkIG5vZGUgJHt1dWlkfSB0byBwYXJlbnQgJHtwYXJlbnRVdWlkfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZHVwbGljYXRlTm9kZSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZHVwbGljYXRlLW5vZGUnLCBbdXVpZF0pO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHsgZHVwbGljYXRlZFV1aWRzOiByZXN1bHQgfSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBOb2RlIGR1cGxpY2F0ZWQ6ICR7dXVpZH1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldFRyYW5zZm9ybSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3Jlc2V0LW5vZGUnLCB7IHV1aWQgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBUcmFuc2Zvcm0gcmVzZXQgb24gbm9kZSAke3V1aWR9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQnlBc3NldChhc3NldFV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2Rlcy1ieS1hc3NldC11dWlkJywgYXNzZXRVdWlkKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0IHx8IFtdIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNvcHlOb2Rlcyh1dWlkczogc3RyaW5nW10pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NvcHktbm9kZScsIHV1aWRzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYENvcGllZCAke3V1aWRzLmxlbmd0aH0gbm9kZShzKSB0byBjbGlwYm9hcmRgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHBhc3RlTm9kZXMoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3Bhc3RlLW5vZGUnLCB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IGFyZ3MudGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAga2VlcFdvcmxkVHJhbnNmb3JtOiBhcmdzLmtlZXBXb3JsZFRyYW5zZm9ybSB8fCBmYWxzZSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyBwYXN0ZWRVdWlkczogcmVzdWx0IH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnTm9kZShzKSBwYXN0ZWQgZnJvbSBjbGlwYm9hcmQnLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBjdXROb2Rlcyh1dWlkczogc3RyaW5nW10pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2N1dC1ub2RlJywgdXVpZHMpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQ3V0ICR7dXVpZHMubGVuZ3RofSBub2RlKHMpIHRvIGNsaXBib2FyZGAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgY3JlYXRlUHJpbWl0aXZlKGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcHJlZmFiVXJsID0gYGRiOi8vaW50ZXJuYWwvZGVmYXVsdF9wcmVmYWIvM2QvJHthcmdzLnR5cGV9LnByZWZhYmA7XHJcbiAgICAgICAgICAgIGNvbnN0IHV1aWRSZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCBwcmVmYWJVcmwpO1xyXG4gICAgICAgICAgICBjb25zdCB1dWlkID0gdHlwZW9mIHV1aWRSZXN1bHQgPT09ICdzdHJpbmcnID8gdXVpZFJlc3VsdCA6IHV1aWRSZXN1bHQ/LnV1aWQ7XHJcbiAgICAgICAgICAgIGlmICghdXVpZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgUHJpbWl0aXZlIHR5cGUgJyR7YXJncy50eXBlfScgbm90IGZvdW5kYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcGFyZW50VXVpZCA9IGFyZ3MucGFyZW50VXVpZDtcclxuICAgICAgICAgICAgaWYgKCFwYXJlbnRVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyZWU6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQgPSB0cmVlPy51dWlkO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2NlbmVJbmZvOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1jdXJyZW50LXNjZW5lJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZCA9IHNjZW5lSW5mbz8udXVpZDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFwYXJlbnRVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdDYW5ub3QgZGV0ZXJtaW5lIHNjZW5lIHJvb3QnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVVdWlkOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtbm9kZScsIHtcclxuICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50VXVpZCxcclxuICAgICAgICAgICAgICAgIGFzc2V0VXVpZDogdXVpZCxcclxuICAgICAgICAgICAgICAgIG5hbWU6IGFyZ3MubmFtZSB8fCBhcmdzLnR5cGUsXHJcbiAgICAgICAgICAgIH0gYXMgYW55KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiBub2RlVXVpZCwgbmFtZTogYXJncy5uYW1lIHx8IGFyZ3MudHlwZSB9LFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFByaW1pdGl2ZSAnJHthcmdzLm5hbWUgfHwgYXJncy50eXBlfScgY3JlYXRlZGAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSGVscGVycyA9PT1cclxuXHJcbiAgICBwcml2YXRlIHBhcnNlTm9kZURhdGEoZGF0YTogYW55LCB1dWlkOiBzdHJpbmcpOiBhbnkge1xyXG4gICAgICAgIGNvbnN0IGluZm86IGFueSA9IHtcclxuICAgICAgICAgICAgdXVpZCxcclxuICAgICAgICAgICAgbmFtZTogZGF0YS5uYW1lPy52YWx1ZSA/PyBkYXRhLm5hbWUgPz8gJ3Vua25vd24nLFxyXG4gICAgICAgICAgICBhY3RpdmU6IGRhdGEuYWN0aXZlPy52YWx1ZSA/PyBkYXRhLmFjdGl2ZSA/PyB0cnVlLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3QgcG9zaXRpb25cclxuICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbj8udmFsdWUpIHtcclxuICAgICAgICAgICAgY29uc3QgcCA9IGRhdGEucG9zaXRpb24udmFsdWU7XHJcbiAgICAgICAgICAgIGluZm8ucG9zaXRpb24gPSB7IHg6IHAueCA/PyAwLCB5OiBwLnkgPz8gMCwgejogcC56ID8/IDAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3Qgcm90YXRpb24gKGV1bGVyKVxyXG4gICAgICAgIGlmIChkYXRhLmV1bGVyPy52YWx1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YS5ldWxlci52YWx1ZTtcclxuICAgICAgICAgICAgaW5mby5yb3RhdGlvbiA9IHsgeDogci54ID8/IDAsIHk6IHIueSA/PyAwLCB6OiByLnogPz8gMCB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBzY2FsZVxyXG4gICAgICAgIGlmIChkYXRhLnNjYWxlPy52YWx1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCBzID0gZGF0YS5zY2FsZS52YWx1ZTtcclxuICAgICAgICAgICAgaW5mby5zY2FsZSA9IHsgeDogcy54ID8/IDEsIHk6IHMueSA/PyAxLCB6OiBzLnogPz8gMSB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBwYXJlbnQgKGp1c3QgVVVJRClcclxuICAgICAgICBpZiAoZGF0YS5wYXJlbnQpIHtcclxuICAgICAgICAgICAgY29uc3QgcGFyZW50VXVpZCA9IGRhdGEucGFyZW50Py52YWx1ZT8udXVpZCA/PyBkYXRhLnBhcmVudD8udXVpZCA/PyBkYXRhLnBhcmVudDtcclxuICAgICAgICAgICAgaWYgKHBhcmVudFV1aWQpIGluZm8ucGFyZW50VXVpZCA9IHR5cGVvZiBwYXJlbnRVdWlkID09PSAnc3RyaW5nJyA/IHBhcmVudFV1aWQgOiBwYXJlbnRVdWlkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBjaGlsZHJlbiAoanVzdCBVVUlEcylcclxuICAgICAgICBpZiAoZGF0YS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICBjb25zdCBraWRzID0gQXJyYXkuaXNBcnJheShkYXRhLmNoaWxkcmVuKSA/IGRhdGEuY2hpbGRyZW4gOiBbXTtcclxuICAgICAgICAgICAgaW5mby5jaGlsZHJlbiA9IGtpZHMubWFwKChjOiBhbnkpID0+IGM/LnZhbHVlPy51dWlkID8/IGM/LnV1aWQgPz8gYyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBFeHRyYWN0IGxheWVyXHJcbiAgICAgICAgaWYgKGRhdGEubGF5ZXI/LnZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgaW5mby5sYXllciA9IGRhdGEubGF5ZXIudmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBFeHRyYWN0IGNvbXBvbmVudHMgKGNvbXBhY3QpXHJcbiAgICAgICAgaWYgKGRhdGEuX19jb21wc19fKSB7XHJcbiAgICAgICAgICAgIGluZm8uY29tcG9uZW50cyA9IGRhdGEuX19jb21wc19fLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgdHlwZTogYy50eXBlIHx8IGMuX190eXBlX18gfHwgYy5jaWQgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgICAgICAgICAgZW5hYmxlZDogYy5lbmFibGVkPy52YWx1ZSA/PyBjLmVuYWJsZWQgPz8gdHJ1ZSxcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGluZm87XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBzZWFyY2hUcmVlKG5vZGU6IGFueSwgdGFyZ2V0TmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIHJlc3VsdHM6IGFueVtdKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgY3VycmVudFBhdGggPSBwYXRoID8gYCR7cGF0aH0vJHtub2RlLm5hbWV9YCA6IG5vZGUubmFtZTtcclxuICAgICAgICBpZiAobm9kZS5uYW1lID09PSB0YXJnZXROYW1lKSB7XHJcbiAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lLCBwYXRoOiBjdXJyZW50UGF0aCB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlYXJjaFRyZWUoY2hpbGQsIHRhcmdldE5hbWUsIGN1cnJlbnRQYXRoLCByZXN1bHRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGNvbGxlY3ROb2Rlcyhub2RlOiBhbnksIHJlc3VsdHM6IGFueVtdKTogdm9pZCB7XHJcbiAgICAgICAgcmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUgIT09IGZhbHNlLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsZWN0Tm9kZXMoY2hpbGQsIHJlc3VsdHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiJdfQ==