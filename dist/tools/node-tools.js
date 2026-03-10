"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTools = void 0;
const EXTENSION_NAME = 'cocos-mcp-extension';
class NodeTools {
    getTools() {
        return [
            {
                name: 'query',
                description: 'Query node by UUID, name, or list all nodes',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Node UUID for detailed info' },
                        name: { type: 'string', description: 'Search by name' },
                        listAll: { type: 'boolean', description: 'List all nodes (compact: uuid, name, parent)' },
                    },
                },
            },
            {
                name: 'create',
                description: 'Create a new node in the scene',
                inputSchema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        parentUuid: { type: 'string', description: 'Parent node UUID (default: scene root)' },
                        type: { type: 'string', description: 'Node/2DNode/3DNode' },
                        assetUuid: { type: 'string', description: 'Asset UUID to instantiate (e.g. prefab)' },
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
                description: 'Set node property (name, active, position, rotation, scale, layer)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string' },
                        property: { type: 'string', description: 'Property name: name, active, position, rotation, scale, layer' },
                        value: { description: 'Property value. For transforms use {x,y,z}' },
                    },
                    required: ['uuid', 'property', 'value'],
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
            case 'set_property': return this.setProperty(args.uuid, args.property, args.value);
            case 'move': return this.moveNode(args.uuid, args.parentUuid, args.siblingIndex);
            default: return { success: false, error: `Unknown node tool: ${toolName}` };
        }
    }
    // === Tool Implementations ===
    async query(args) {
        if (args.uuid) {
            return this.getNodeInfo(args.uuid);
        }
        if (args.name) {
            return this.findByName(args.name);
        }
        if (args.listAll) {
            return this.listAll();
        }
        return { success: false, error: 'Provide uuid, name, or listAll' };
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
            const options = {
                parent: parentUuid,
                name: args.name,
            };
            if (args.assetUuid) {
                options.assetUuid = args.assetUuid;
            }
            if (args.type) {
                options.type = args.type;
            }
            const uuid = await Editor.Message.request('scene', 'create-node', options);
            return {
                success: true,
                data: { uuid, name: args.name },
                message: `Node created: ${args.name}`,
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
    // === Helpers ===
    parseNodeData(data, uuid) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
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
        // Extract parent
        if (data.parent) {
            info.parent = data.parent;
        }
        // Extract children
        if (data.children) {
            info.children = Array.isArray(data.children) ? data.children : [];
        }
        // Extract layer
        if (((_u = data.layer) === null || _u === void 0 ? void 0 : _u.value) !== undefined) {
            info.layer = data.layer.value;
        }
        // Extract components
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9ub2RlLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLE1BQU0sY0FBYyxHQUFHLHFCQUFxQixDQUFDO0FBRTdDLE1BQWEsU0FBUztJQUVsQixRQUFRO1FBQ0osT0FBTztZQUNIO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSw2Q0FBNkM7Z0JBQzFELFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsNkJBQTZCLEVBQUU7d0JBQ3BFLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFO3dCQUN2RCxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSw4Q0FBOEMsRUFBRTtxQkFDNUY7aUJBQ0o7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxRQUFRO2dCQUNkLFdBQVcsRUFBRSxnQ0FBZ0M7Z0JBQzdDLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDeEIsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsd0NBQXdDLEVBQUU7d0JBQ3JGLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLG9CQUFvQixFQUFFO3dCQUMzRCxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSx5Q0FBeUMsRUFBRTtxQkFDeEY7b0JBQ0QsUUFBUSxFQUFFLENBQUMsTUFBTSxDQUFDO2lCQUNyQjthQUNKO1lBQ0Q7Z0JB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Q2hDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ3RDLENBQUM7UUFDTCxDQUFDO0lBQ0wsQ0FBQztDQUNKO0FBOVdELDhCQThXQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmNvbnN0IEVYVEVOU0lPTl9OQU1FID0gJ2NvY29zLW1jcC1leHRlbnNpb24nO1xyXG5cclxuZXhwb3J0IGNsYXNzIE5vZGVUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XHJcblxyXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XHJcbiAgICAgICAgcmV0dXJuIFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUXVlcnkgbm9kZSBieSBVVUlELCBuYW1lLCBvciBsaXN0IGFsbCBub2RlcycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOb2RlIFVVSUQgZm9yIGRldGFpbGVkIGluZm8nIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU2VhcmNoIGJ5IG5hbWUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpc3RBbGw6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIG5vZGVzIChjb21wYWN0OiB1dWlkLCBuYW1lLCBwYXJlbnQpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnY3JlYXRlJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIGEgbmV3IG5vZGUgaW4gdGhlIHNjZW5lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUGFyZW50IG5vZGUgVVVJRCAoZGVmYXVsdDogc2NlbmUgcm9vdCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTm9kZS8yRE5vZGUvM0ROb2RlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQXNzZXQgVVVJRCB0byBpbnN0YW50aWF0ZSAoZS5nLiBwcmVmYWIpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbmFtZSddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2RlbGV0ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RlbGV0ZSBhIG5vZGUgZnJvbSB0aGUgc2NlbmUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXRfcHJvcGVydHknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZXQgbm9kZSBwcm9wZXJ0eSAobmFtZSwgYWN0aXZlLCBwb3NpdGlvbiwgcm90YXRpb24sIHNjYWxlLCBsYXllciknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgbmFtZTogbmFtZSwgYWN0aXZlLCBwb3NpdGlvbiwgcm90YXRpb24sIHNjYWxlLCBsYXllcicgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSB2YWx1ZS4gRm9yIHRyYW5zZm9ybXMgdXNlIHt4LHksen0nIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJywgJ3Byb3BlcnR5JywgJ3ZhbHVlJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnbW92ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01vdmUgbm9kZSB0byBhIG5ldyBwYXJlbnQnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50VXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzaWJsaW5nSW5kZXg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnUG9zaXRpb24gYW1vbmcgc2libGluZ3MgKG9wdGlvbmFsKScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnLCAncGFyZW50VXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5JzogcmV0dXJuIHRoaXMucXVlcnkoYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2NyZWF0ZSc6IHJldHVybiB0aGlzLmNyZWF0ZU5vZGUoYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2RlbGV0ZSc6IHJldHVybiB0aGlzLmRlbGV0ZU5vZGUoYXJncy51dWlkKTtcclxuICAgICAgICAgICAgY2FzZSAnc2V0X3Byb3BlcnR5JzogcmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoYXJncy51dWlkLCBhcmdzLnByb3BlcnR5LCBhcmdzLnZhbHVlKTtcclxuICAgICAgICAgICAgY2FzZSAnbW92ZSc6IHJldHVybiB0aGlzLm1vdmVOb2RlKGFyZ3MudXVpZCwgYXJncy5wYXJlbnRVdWlkLCBhcmdzLnNpYmxpbmdJbmRleCk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gbm9kZSB0b29sOiAke3Rvb2xOYW1lfWAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gPT09IFRvb2wgSW1wbGVtZW50YXRpb25zID09PVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBpZiAoYXJncy51dWlkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmdldE5vZGVJbmZvKGFyZ3MudXVpZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChhcmdzLm5hbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmluZEJ5TmFtZShhcmdzLm5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoYXJncy5saXN0QWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxpc3RBbGwoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJvdmlkZSB1dWlkLCBuYW1lLCBvciBsaXN0QWxsJyB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZ2V0Tm9kZUluZm8odXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIHV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHt1dWlkfWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB0aGlzLnBhcnNlTm9kZURhdGEobm9kZURhdGEsIHV1aWQpIH07XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrOiBzY2VuZSBzY3JpcHRcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0Tm9kZUluZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFt1dWlkXSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIGRhdGEgcmV0dXJuZWQnIH07XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQnlOYW1lKG5hbWU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgdHJlZSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpO1xyXG4gICAgICAgICAgICBpZiAoIXRyZWUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIHNjZW5lIHRyZWUgYXZhaWxhYmxlJyB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuc2VhcmNoVHJlZSh0cmVlLCBuYW1lLCAnJywgcmVzdWx0cyk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm8gbm9kZSBmb3VuZCB3aXRoIG5hbWU6ICR7bmFtZX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0cyB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdmaW5kTm9kZUJ5TmFtZScsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25hbWVdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gZGF0YSByZXR1cm5lZCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RBbGwoKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCB0cmVlID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XHJcbiAgICAgICAgICAgIGlmICghdHJlZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gc2NlbmUgdHJlZSBhdmFpbGFibGUnIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGVjdE5vZGVzKHRyZWUsIG5vZGVzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0b3RhbE5vZGVzOiBub2Rlcy5sZW5ndGgsIG5vZGVzIH0gfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnZ2V0QWxsTm9kZXMnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gZGF0YSByZXR1cm5lZCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGNyZWF0ZU5vZGUoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBsZXQgcGFyZW50VXVpZCA9IGFyZ3MucGFyZW50VXVpZDtcclxuXHJcbiAgICAgICAgICAgIC8vIElmIG5vIHBhcmVudCBzcGVjaWZpZWQsIGdldCBzY2VuZSByb290XHJcbiAgICAgICAgICAgIGlmICghcGFyZW50VXVpZCkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmVlOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRVdWlkID0gdHJlZT8udXVpZDtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNjZW5lSW5mbzogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktY3VycmVudC1zY2VuZScpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudFV1aWQgPSBzY2VuZUluZm8/LnV1aWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghcGFyZW50VXVpZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnQ2Fubm90IGRldGVybWluZSBzY2VuZSByb290JyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBvcHRpb25zOiBhbnkgPSB7XHJcbiAgICAgICAgICAgICAgICBwYXJlbnQ6IHBhcmVudFV1aWQsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBhcmdzLm5hbWUsXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBpZiAoYXJncy5hc3NldFV1aWQpIHtcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMuYXNzZXRVdWlkID0gYXJncy5hc3NldFV1aWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChhcmdzLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgIG9wdGlvbnMudHlwZSA9IGFyZ3MudHlwZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgdXVpZDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLW5vZGUnLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHV1aWQsIG5hbWU6IGFyZ3MubmFtZSB9LFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYE5vZGUgY3JlYXRlZDogJHthcmdzLm5hbWV9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZGVsZXRlTm9kZSh1dWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3JlbW92ZS1ub2RlJywgeyB1dWlkIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgTm9kZSBkZWxldGVkOiAke3V1aWR9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRQcm9wZXJ0eSh1dWlkOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIC8vIE1hcCBjb21tb24gcHJvcGVydHkgbmFtZXMgdG8gRWRpdG9yIEFQSSBwYXRoc1xyXG4gICAgICAgIGNvbnN0IHByb3BlcnR5TWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgICAgICBwb3NpdGlvbjogJ3Bvc2l0aW9uJyxcclxuICAgICAgICAgICAgcm90YXRpb246ICdldWxlcicsIC8vIHVzZSBldWxlciBhbmdsZXMgZm9yIHJvdGF0aW9uXHJcbiAgICAgICAgICAgIHNjYWxlOiAnc2NhbGUnLFxyXG4gICAgICAgICAgICBuYW1lOiAnbmFtZScsXHJcbiAgICAgICAgICAgIGFjdGl2ZTogJ2FjdGl2ZScsXHJcbiAgICAgICAgICAgIGxheWVyOiAnbGF5ZXInLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGNvbnN0IGVkaXRvclBhdGggPSBwcm9wZXJ0eU1hcFtwcm9wZXJ0eV0gfHwgcHJvcGVydHk7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIEZvciB0cmFuc2Zvcm0gcHJvcGVydGllcywgc2V0IHN1Yi1wcm9wZXJ0aWVzXHJcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSA9PT0gJ3Bvc2l0aW9uJyB8fCBwcm9wZXJ0eSA9PT0gJ3JvdGF0aW9uJyB8fCBwcm9wZXJ0eSA9PT0gJ3NjYWxlJykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdmVjVmFsdWUgPSB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnID8gdmFsdWUgOiB7IHg6IDAsIHk6IDAsIHo6IDAgfTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgICAgICB1dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGVkaXRvclBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcDogeyB2YWx1ZTogdmVjVmFsdWUgfSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogZWRpdG9yUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlIH0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFNldCAke3Byb3BlcnR5fSBvbiAke3V1aWR9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAvLyBGYWxsYmFjazogc2NlbmUgc2NyaXB0XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ3NldE5vZGVQcm9wZXJ0eScsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW3V1aWQsIHByb3BlcnR5LCB2YWx1ZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gc2V0IHByb3BlcnR5JyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbW92ZU5vZGUodXVpZDogc3RyaW5nLCBwYXJlbnRVdWlkOiBzdHJpbmcsIHNpYmxpbmdJbmRleD86IG51bWJlcik6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgb3B0aW9uczogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgcGFyZW50OiBwYXJlbnRVdWlkLFxyXG4gICAgICAgICAgICAgICAgdXVpZHM6IFt1dWlkXSxcclxuICAgICAgICAgICAgICAgIGtlZXBXb3JsZFRyYW5zZm9ybTogZmFsc2UsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wYXJlbnQnLCBvcHRpb25zKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChzaWJsaW5nSW5kZXggIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gU2V0IHNpYmxpbmcgaW5kZXggYWZ0ZXIgcmVwYXJlbnRpbmdcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgICAgICB1dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6ICdzaWJsaW5nSW5kZXgnLFxyXG4gICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IHNpYmxpbmdJbmRleCB9LFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBNb3ZlZCBub2RlICR7dXVpZH0gdG8gcGFyZW50ICR7cGFyZW50VXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSGVscGVycyA9PT1cclxuXHJcbiAgICBwcml2YXRlIHBhcnNlTm9kZURhdGEoZGF0YTogYW55LCB1dWlkOiBzdHJpbmcpOiBhbnkge1xyXG4gICAgICAgIGNvbnN0IGluZm86IGFueSA9IHtcclxuICAgICAgICAgICAgdXVpZCxcclxuICAgICAgICAgICAgbmFtZTogZGF0YS5uYW1lPy52YWx1ZSA/PyBkYXRhLm5hbWUgPz8gJ3Vua25vd24nLFxyXG4gICAgICAgICAgICBhY3RpdmU6IGRhdGEuYWN0aXZlPy52YWx1ZSA/PyBkYXRhLmFjdGl2ZSA/PyB0cnVlLFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3QgcG9zaXRpb25cclxuICAgICAgICBpZiAoZGF0YS5wb3NpdGlvbj8udmFsdWUpIHtcclxuICAgICAgICAgICAgY29uc3QgcCA9IGRhdGEucG9zaXRpb24udmFsdWU7XHJcbiAgICAgICAgICAgIGluZm8ucG9zaXRpb24gPSB7IHg6IHAueCA/PyAwLCB5OiBwLnkgPz8gMCwgejogcC56ID8/IDAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3Qgcm90YXRpb24gKGV1bGVyKVxyXG4gICAgICAgIGlmIChkYXRhLmV1bGVyPy52YWx1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCByID0gZGF0YS5ldWxlci52YWx1ZTtcclxuICAgICAgICAgICAgaW5mby5yb3RhdGlvbiA9IHsgeDogci54ID8/IDAsIHk6IHIueSA/PyAwLCB6OiByLnogPz8gMCB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBzY2FsZVxyXG4gICAgICAgIGlmIChkYXRhLnNjYWxlPy52YWx1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCBzID0gZGF0YS5zY2FsZS52YWx1ZTtcclxuICAgICAgICAgICAgaW5mby5zY2FsZSA9IHsgeDogcy54ID8/IDEsIHk6IHMueSA/PyAxLCB6OiBzLnogPz8gMSB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gRXh0cmFjdCBwYXJlbnRcclxuICAgICAgICBpZiAoZGF0YS5wYXJlbnQpIHtcclxuICAgICAgICAgICAgaW5mby5wYXJlbnQgPSBkYXRhLnBhcmVudDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3QgY2hpbGRyZW5cclxuICAgICAgICBpZiAoZGF0YS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICBpbmZvLmNoaWxkcmVuID0gQXJyYXkuaXNBcnJheShkYXRhLmNoaWxkcmVuKSA/IGRhdGEuY2hpbGRyZW4gOiBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3QgbGF5ZXJcclxuICAgICAgICBpZiAoZGF0YS5sYXllcj8udmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBpbmZvLmxheWVyID0gZGF0YS5sYXllci52YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEV4dHJhY3QgY29tcG9uZW50c1xyXG4gICAgICAgIGlmIChkYXRhLl9fY29tcHNfXykge1xyXG4gICAgICAgICAgICBpbmZvLmNvbXBvbmVudHMgPSBkYXRhLl9fY29tcHNfXy5tYXAoKGM6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGMuZW5hYmxlZD8udmFsdWUgPz8gYy5lbmFibGVkID8/IHRydWUsXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpbmZvO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgc2VhcmNoVHJlZShub2RlOiBhbnksIHRhcmdldE5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nLCByZXN1bHRzOiBhbnlbXSk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGN1cnJlbnRQYXRoID0gcGF0aCA/IGAke3BhdGh9LyR7bm9kZS5uYW1lfWAgOiBub2RlLm5hbWU7XHJcbiAgICAgICAgaWYgKG5vZGUubmFtZSA9PT0gdGFyZ2V0TmFtZSkge1xyXG4gICAgICAgICAgICByZXN1bHRzLnB1c2goeyB1dWlkOiBub2RlLnV1aWQsIG5hbWU6IG5vZGUubmFtZSwgcGF0aDogY3VycmVudFBhdGggfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZWFyY2hUcmVlKGNoaWxkLCB0YXJnZXROYW1lLCBjdXJyZW50UGF0aCwgcmVzdWx0cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBjb2xsZWN0Tm9kZXMobm9kZTogYW55LCByZXN1bHRzOiBhbnlbXSk6IHZvaWQge1xyXG4gICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcclxuICAgICAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlICE9PSBmYWxzZSxcclxuICAgICAgICB9KTtcclxuICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGVjdE5vZGVzKGNoaWxkLCByZXN1bHRzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4iXX0=