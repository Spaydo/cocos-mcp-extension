"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComponentTools = void 0;
const EXTENSION_NAME = 'cocos-mcp-extension';
class ComponentTools {
    getTools() {
        return [
            {
                name: 'add',
                description: 'Add a component to a node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string' },
                        componentType: { type: 'string', description: 'e.g. cc.Sprite, cc.Label, cc.RigidBody' },
                    },
                    required: ['nodeUuid', 'componentType'],
                },
            },
            {
                name: 'remove',
                description: 'Remove a component from a node (uses component type/cid)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string' },
                        componentType: { type: 'string', description: 'Component type or cid' },
                    },
                    required: ['nodeUuid', 'componentType'],
                },
            },
            {
                name: 'query',
                description: 'Query components on a node. Without componentType returns type list only',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string' },
                        componentType: { type: 'string', description: 'Specific component type for detailed info' },
                        verbose: { type: 'boolean', description: 'Include readonly props and default values' },
                    },
                    required: ['nodeUuid'],
                },
            },
            {
                name: 'set_property',
                description: 'Set one or multiple component properties at once. Use "properties" array for batch, or single "property"+"propertyType"+"value"',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string' },
                        componentType: { type: 'string', description: 'Target component type' },
                        property: { type: 'string', description: 'Single mode: property name' },
                        propertyType: { type: 'string', description: 'Single mode type hint: string, number, boolean, color, vec2, vec3, size, node, spriteFrame, asset' },
                        value: { description: 'Single mode: property value' },
                        properties: {
                            type: 'array',
                            description: 'Batch mode: [{property, propertyType, value}, ...]',
                            items: {
                                type: 'object',
                                properties: {
                                    property: { type: 'string' },
                                    propertyType: { type: 'string' },
                                    value: {},
                                },
                                required: ['property', 'propertyType', 'value'],
                            },
                        },
                    },
                    required: ['nodeUuid', 'componentType'],
                },
            },
            {
                name: 'reset',
                description: 'Reset a component to its default values',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string' },
                        componentType: { type: 'string', description: 'Component type to reset' },
                    },
                    required: ['nodeUuid', 'componentType'],
                },
            },
            {
                name: 'list_types',
                description: 'List all available component types. Use filter to narrow results (e.g. "UI", "Sprite", "Physics")',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filter: { type: 'string', description: 'Substring filter for class names (case-insensitive)' },
                    },
                },
            },
            {
                name: 'query_detail',
                description: 'Query a single component by its UUID (from query-node results)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        componentUuid: { type: 'string', description: 'Component UUID' },
                    },
                    required: ['componentUuid'],
                },
            },
            {
                name: 'execute_method',
                description: 'Execute a method on a component at runtime',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Node UUID' },
                        componentType: { type: 'string', description: 'Component type, e.g. cc.Sprite' },
                        method: { type: 'string', description: 'Method name to call' },
                        args: { type: 'array', description: 'Arguments to pass to the method' },
                    },
                    required: ['uuid', 'componentType', 'method'],
                },
            },
            {
                name: 'list_all',
                description: 'List all registered components with details. Use filter to narrow results',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filter: { type: 'string', description: 'Substring filter for component names (case-insensitive)' },
                    },
                },
            },
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'add': return this.addComponent(args.nodeUuid, args.componentType);
            case 'remove': return this.removeComponent(args.nodeUuid, args.componentType);
            case 'query': return this.queryComponents(args.nodeUuid, args.componentType, !!args.verbose);
            case 'set_property': return this.setProperty(args);
            case 'reset': return this.resetComponent(args.nodeUuid, args.componentType);
            case 'list_types': return this.listTypes(args.filter);
            case 'query_detail': return this.queryDetail(args.componentUuid);
            case 'execute_method': return this.executeMethod(args.uuid, args.componentType, args.method, args.args);
            case 'list_all': return this.listAll(args.filter);
            default: return { success: false, error: `Unknown component tool: ${toolName}` };
        }
    }
    // === Tool Implementations ===
    async addComponent(nodeUuid, componentType) {
        var _a;
        // Count components before
        const beforeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
        if (!beforeData)
            return { success: false, error: `Node not found: ${nodeUuid}` };
        const countBefore = ((_a = beforeData === null || beforeData === void 0 ? void 0 : beforeData.__comps__) === null || _a === void 0 ? void 0 : _a.length) || 0;
        // Try Editor API (may throw on conflict — that's fine, we verify below)
        try {
            await Editor.Message.request('scene', 'create-component', {
                uuid: nodeUuid,
                component: componentType,
            });
        }
        catch ( /* will verify below */_b) { /* will verify below */ }
        await this.delay(300);
        // Verify component was actually added (check count AND specific type)
        const afterData = await Editor.Message.request('scene', 'query-node', nodeUuid);
        const afterComps = (afterData === null || afterData === void 0 ? void 0 : afterData.__comps__) || [];
        if (afterComps.length > countBefore) {
            const found = afterComps.some((c) => {
                const t = c.type || c.__type__ || c.cid || '';
                return t === componentType || t.includes(componentType);
            });
            if (found) {
                return { success: true, message: `Added ${componentType} to node ${nodeUuid}` };
            }
        }
        return {
            success: false,
            error: `Failed to add ${componentType}: may conflict with existing renderer or component on this node`,
        };
    }
    async removeComponent(nodeUuid, componentType) {
        // Find component info (including its own UUID)
        const info = await this.findComponentInfo(nodeUuid, componentType);
        if ('success' in info)
            return info;
        // Editor API expects component UUID, not node UUID
        try {
            if (info.uuid) {
                await Editor.Message.request('scene', 'remove-component', { uuid: info.uuid });
            }
            await this.delay(200);
        }
        catch ( /* will verify below */_a) { /* will verify below */ }
        // Verify removal
        const check = await this.findComponentInfo(nodeUuid, componentType);
        if ('success' in check) {
            // Component no longer found = removed successfully
            return { success: true, message: `Removed ${componentType} from node ${nodeUuid}` };
        }
        // Editor API failed — try scene script fallback
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'removeComponentFromNode',
                args: [nodeUuid, componentType],
            });
            if (result === null || result === void 0 ? void 0 : result.success) {
                return { success: true, message: `Removed ${componentType} from node ${nodeUuid}` };
            }
            return result || { success: false, error: `Failed to remove ${componentType}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async queryComponents(nodeUuid, componentType, verbose = false) {
        var _a, _b, _c;
        try {
            const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeData) {
                return { success: false, error: `Node not found: ${nodeUuid}` };
            }
            const comps = nodeData.__comps__ || [];
            if (!componentType) {
                // Return compact type list only (include uuid for reference)
                const types = comps.map((c) => {
                    var _a, _b, _c, _d, _e, _f;
                    return ({
                        type: c.type || c.__type__ || c.cid || 'unknown',
                        enabled: (_c = (_b = (_a = c.enabled) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : c.enabled) !== null && _c !== void 0 ? _c : true,
                        uuid: ((_e = (_d = c.value) === null || _d === void 0 ? void 0 : _d.uuid) === null || _e === void 0 ? void 0 : _e.value) || ((_f = c.uuid) === null || _f === void 0 ? void 0 : _f.value) || c.uuid || undefined,
                    });
                });
                return { success: true, data: { nodeUuid, components: types } };
            }
            // Find specific component and return detailed info
            const target = comps.find((c) => {
                const t = c.type || c.__type__ || c.cid || '';
                return t === componentType || t.includes(componentType);
            });
            if (!target) {
                const available = comps.map((c) => c.type || c.__type__ || c.cid).join(', ');
                return { success: false, error: `Component ${componentType} not found. Available: ${available}` };
            }
            const properties = this.extractProperties(target, verbose);
            return {
                success: true,
                data: {
                    nodeUuid,
                    componentType: target.type || target.__type__ || target.cid,
                    enabled: (_c = (_b = (_a = target.enabled) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : target.enabled) !== null && _c !== void 0 ? _c : true,
                    properties,
                },
            };
        }
        catch (_d) {
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'getComponentInfo',
                    args: [nodeUuid, componentType],
                });
                return result || { success: false, error: 'No data returned' };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
    }
    async setProperty(args) {
        const { nodeUuid, componentType } = args;
        // Batch mode: properties array
        if (args.properties && Array.isArray(args.properties)) {
            return this.setPropertyBatch(nodeUuid, componentType, args.properties);
        }
        // Single mode (backward compatible)
        const { property, propertyType, value } = args;
        if (!property || !propertyType || value === undefined) {
            return { success: false, error: 'Provide "property"+"propertyType"+"value" or "properties" array' };
        }
        return this.setOneProperty(nodeUuid, componentType, property, propertyType, value);
    }
    async setPropertyBatch(nodeUuid, componentType, properties) {
        // Query node once for all properties
        const compIndex = await this.findComponentIndex(nodeUuid, componentType);
        if (typeof compIndex === 'object')
            return compIndex; // error response
        const results = [];
        const errors = [];
        for (const item of properties) {
            try {
                const path = `__comps__.${compIndex}.${item.property}`;
                const dump = this.buildDump(item.propertyType, item.value);
                await Editor.Message.request('scene', 'set-property', {
                    uuid: nodeUuid,
                    path,
                    dump,
                });
                results.push(item.property);
            }
            catch (err) {
                errors.push(`${item.property}: ${err.message}`);
            }
        }
        await this.delay(200);
        if (errors.length > 0) {
            return {
                success: results.length > 0,
                message: `Set: [${results.join(', ')}]` + ` Errors: [${errors.join('; ')}]`,
            };
        }
        return { success: true, message: `Set ${componentType}: [${results.join(', ')}]` };
    }
    async setOneProperty(nodeUuid, componentType, property, propertyType, value) {
        try {
            const compIndex = await this.findComponentIndex(nodeUuid, componentType);
            if (typeof compIndex === 'object')
                return compIndex; // error response
            const path = `__comps__.${compIndex}.${property}`;
            const dump = this.buildDump(propertyType, value);
            await Editor.Message.request('scene', 'set-property', {
                uuid: nodeUuid,
                path,
                dump,
            });
            await this.delay(200);
            return { success: true, message: `Set ${componentType}.${property} = ${JSON.stringify(value)}` };
        }
        catch (_a) {
            // Fallback: scene script
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'setComponentProperty',
                    args: [nodeUuid, componentType, property, value],
                });
                return result || { success: false, error: 'Failed to set property' };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
    }
    async findComponentIndex(nodeUuid, componentType) {
        const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
        if (!nodeData) {
            return { success: false, error: `Node not found: ${nodeUuid}` };
        }
        const comps = nodeData.__comps__ || [];
        const compIndex = comps.findIndex((c) => {
            const t = c.type || c.__type__ || c.cid || '';
            return t === componentType || t.includes(componentType);
        });
        if (compIndex === -1) {
            const available = comps.map((c) => c.type || c.__type__ || c.cid).join(', ');
            return { success: false, error: `Component ${componentType} not found. Available: ${available}` };
        }
        return compIndex;
    }
    /** Find component by type and return its index, UUID, and cid. */
    async findComponentInfo(nodeUuid, componentType) {
        var _a, _b, _c;
        const nodeData = await Editor.Message.request('scene', 'query-node', nodeUuid);
        if (!nodeData) {
            return { success: false, error: `Node not found: ${nodeUuid}` };
        }
        const comps = nodeData.__comps__ || [];
        for (let i = 0; i < comps.length; i++) {
            const c = comps[i];
            const t = c.type || c.__type__ || c.cid || '';
            if (t === componentType || t.includes(componentType)) {
                // Try multiple paths to find component UUID
                const uuid = ((_b = (_a = c.value) === null || _a === void 0 ? void 0 : _a.uuid) === null || _b === void 0 ? void 0 : _b.value) || ((_c = c.uuid) === null || _c === void 0 ? void 0 : _c.value) || c.uuid || '';
                return {
                    index: i,
                    uuid,
                    cid: c.cid || c.__type__ || componentType,
                };
            }
        }
        const available = comps.map((c) => c.type || c.__type__ || c.cid).join(', ');
        return { success: false, error: `Component ${componentType} not found. Available: ${available}` };
    }
    async resetComponent(nodeUuid, componentType) {
        // Find component info (including its own UUID)
        const info = await this.findComponentInfo(nodeUuid, componentType);
        if ('success' in info)
            return info;
        // Editor API expects component UUID
        try {
            if (info.uuid) {
                await Editor.Message.request('scene', 'reset-component', { uuid: info.uuid });
                await this.delay(200);
                return { success: true, message: `Reset ${componentType} on node ${nodeUuid}` };
            }
        }
        catch ( /* try fallback */_a) { /* try fallback */ }
        // Fallback: scene script remove + re-add
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'resetComponent',
                args: [nodeUuid, componentType],
            });
            return result || { success: false, error: `Failed to reset ${componentType}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async listTypes(filter) {
        try {
            const classes = await Editor.Message.request('scene', 'query-classes');
            if (!filter) {
                // Without filter, return names only (no metadata)
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
    async queryDetail(componentUuid) {
        var _a, _b, _c;
        try {
            const result = await Editor.Message.request('scene', 'query-component', componentUuid);
            if (!result) {
                return { success: false, error: `Component not found: ${componentUuid}` };
            }
            // Return compact version instead of raw dump
            const properties = this.extractProperties(result);
            return {
                success: true,
                data: {
                    type: result.type || result.__type__ || result.cid || 'unknown',
                    enabled: (_c = (_b = (_a = result.enabled) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : result.enabled) !== null && _c !== void 0 ? _c : true,
                    properties,
                },
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async executeMethod(uuid, componentType, method, args) {
        try {
            const compIndex = await this.findComponentIndex(uuid, componentType);
            if (typeof compIndex === 'object')
                return compIndex;
            const result = await Editor.Message.request('scene', 'execute-component-method', {
                uuid,
                index: compIndex,
                name: method,
                args: args || [],
            });
            return { success: true, data: result, message: `Executed ${componentType}.${method}()` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async listAll(filter) {
        try {
            const components = await Editor.Message.request('scene', 'query-components');
            // Extract compact info: name, cid only
            let results = (components || []).map((c) => ({
                name: c.name || c.cid || 'unknown',
                cid: c.cid,
            }));
            if (filter) {
                const lowerFilter = filter.toLowerCase();
                results = results.filter((c) => c.name.toLowerCase().includes(lowerFilter));
            }
            return { success: true, data: results };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    // === Helpers ===
    buildDump(propertyType, value) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        switch (propertyType) {
            case 'color':
                return {
                    value: {
                        r: (_a = value.r) !== null && _a !== void 0 ? _a : 255,
                        g: (_b = value.g) !== null && _b !== void 0 ? _b : 255,
                        b: (_c = value.b) !== null && _c !== void 0 ? _c : 255,
                        a: (_d = value.a) !== null && _d !== void 0 ? _d : 255,
                    },
                    type: 'cc.Color',
                };
            case 'vec2':
                return {
                    value: { x: (_e = value.x) !== null && _e !== void 0 ? _e : 0, y: (_f = value.y) !== null && _f !== void 0 ? _f : 0 },
                    type: 'cc.Vec2',
                };
            case 'vec3':
                return {
                    value: { x: (_g = value.x) !== null && _g !== void 0 ? _g : 0, y: (_h = value.y) !== null && _h !== void 0 ? _h : 0, z: (_j = value.z) !== null && _j !== void 0 ? _j : 0 },
                    type: 'cc.Vec3',
                };
            case 'size':
                return {
                    value: { width: (_k = value.width) !== null && _k !== void 0 ? _k : 0, height: (_l = value.height) !== null && _l !== void 0 ? _l : 0 },
                    type: 'cc.Size',
                };
            case 'node':
                return { value: { uuid: value }, type: 'cc.Node' };
            case 'spriteFrame':
            case 'asset':
                return { value: { uuid: value }, type: this.getAssetTypeHint(propertyType) };
            case 'number':
            case 'float':
                return { value: Number(value), type: 'Float' };
            case 'integer':
                return { value: Math.round(Number(value)), type: 'Integer' };
            case 'boolean':
                return { value: !!value, type: 'Boolean' };
            case 'string':
                return { value: String(value) };
            default:
                return { value };
        }
    }
    getAssetTypeHint(propertyType) {
        const hints = {
            spriteFrame: 'cc.SpriteFrame',
            material: 'cc.Material',
            texture: 'cc.Texture2D',
            audioClip: 'cc.AudioClip',
            prefab: 'cc.Prefab',
            font: 'cc.Font',
        };
        return hints[propertyType];
    }
    /** Extract compact properties: only visible, non-internal, non-default fields. */
    extractProperties(comp, verbose = false) {
        const result = {};
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
                result[key] = m.value;
            }
        }
        return result;
    }
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
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.ComponentTools = ComponentTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQztBQUU3QyxNQUFhLGNBQWM7SUFFdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsS0FBSztnQkFDWCxXQUFXLEVBQUUsMkJBQTJCO2dCQUN4QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7d0JBQzVCLGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdDQUF3QyxFQUFFO3FCQUMzRjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLDBEQUEwRDtnQkFDdkUsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO3dCQUM1QixhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRTtxQkFDMUU7b0JBQ0QsUUFBUSxFQUFFLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQztpQkFDMUM7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSwwRUFBMEU7Z0JBQ3ZGLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDNUIsYUFBYSxFQUFF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QyxNQUFNLEtBQUssRUFBRSxDQUFDLE1BQU07WUFBRSxPQUFPLEtBQUssQ0FBQztRQUMxQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFTyxLQUFLLENBQUMsRUFBVTtRQUNwQixPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7Q0FDSjtBQS9sQkQsd0NBK2xCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmNvbnN0IEVYVEVOU0lPTl9OQU1FID0gJ2NvY29zLW1jcC1leHRlbnNpb24nO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnYWRkJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWRkIGEgY29tcG9uZW50IHRvIGEgbm9kZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdlLmcuIGNjLlNwcml0ZSwgY2MuTGFiZWwsIGNjLlJpZ2lkQm9keScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZW1vdmUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZW1vdmUgYSBjb21wb25lbnQgZnJvbSBhIG5vZGUgKHVzZXMgY29tcG9uZW50IHR5cGUvY2lkKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSBvciBjaWQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdRdWVyeSBjb21wb25lbnRzIG9uIGEgbm9kZS4gV2l0aG91dCBjb21wb25lbnRUeXBlIHJldHVybnMgdHlwZSBsaXN0IG9ubHknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU3BlY2lmaWMgY29tcG9uZW50IHR5cGUgZm9yIGRldGFpbGVkIGluZm8nIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmJvc2U6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgcmVhZG9ubHkgcHJvcHMgYW5kIGRlZmF1bHQgdmFsdWVzJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXRfcHJvcGVydHknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZXQgb25lIG9yIG11bHRpcGxlIGNvbXBvbmVudCBwcm9wZXJ0aWVzIGF0IG9uY2UuIFVzZSBcInByb3BlcnRpZXNcIiBhcnJheSBmb3IgYmF0Y2gsIG9yIHNpbmdsZSBcInByb3BlcnR5XCIrXCJwcm9wZXJ0eVR5cGVcIitcInZhbHVlXCInLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IGNvbXBvbmVudCB0eXBlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTaW5nbGUgbW9kZTogcHJvcGVydHkgbmFtZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NpbmdsZSBtb2RlIHR5cGUgaGludDogc3RyaW5nLCBudW1iZXIsIGJvb2xlYW4sIGNvbG9yLCB2ZWMyLCB2ZWMzLCBzaXplLCBub2RlLCBzcHJpdGVGcmFtZSwgYXNzZXQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IGRlc2NyaXB0aW9uOiAnU2luZ2xlIG1vZGU6IHByb3BlcnR5IHZhbHVlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdCYXRjaCBtb2RlOiBbe3Byb3BlcnR5LCBwcm9wZXJ0eVR5cGUsIHZhbHVlfSwgLi4uXScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7fSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3Byb3BlcnR5JywgJ3Byb3BlcnR5VHlwZScsICd2YWx1ZSddLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZXNldCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Jlc2V0IGEgY29tcG9uZW50IHRvIGl0cyBkZWZhdWx0IHZhbHVlcycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSB0byByZXNldCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsaXN0X3R5cGVzJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgYXZhaWxhYmxlIGNvbXBvbmVudCB0eXBlcy4gVXNlIGZpbHRlciB0byBuYXJyb3cgcmVzdWx0cyAoZS5nLiBcIlVJXCIsIFwiU3ByaXRlXCIsIFwiUGh5c2ljc1wiKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1N1YnN0cmluZyBmaWx0ZXIgZm9yIGNsYXNzIG5hbWVzIChjYXNlLWluc2Vuc2l0aXZlKScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5X2RldGFpbCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IGEgc2luZ2xlIGNvbXBvbmVudCBieSBpdHMgVVVJRCAoZnJvbSBxdWVyeS1ub2RlIHJlc3VsdHMpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRVdWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCBVVUlEJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnY29tcG9uZW50VXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2V4ZWN1dGVfbWV0aG9kJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRXhlY3V0ZSBhIG1ldGhvZCBvbiBhIGNvbXBvbmVudCBhdCBydW50aW1lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSwgZS5nLiBjYy5TcHJpdGUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNZXRob2QgbmFtZSB0byBjYWxsJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiB7IHR5cGU6ICdhcnJheScsIGRlc2NyaXB0aW9uOiAnQXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnLCAnY29tcG9uZW50VHlwZScsICdtZXRob2QnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsaXN0X2FsbCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIHJlZ2lzdGVyZWQgY29tcG9uZW50cyB3aXRoIGRldGFpbHMuIFVzZSBmaWx0ZXIgdG8gbmFycm93IHJlc3VsdHMnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTdWJzdHJpbmcgZmlsdGVyIGZvciBjb21wb25lbnQgbmFtZXMgKGNhc2UtaW5zZW5zaXRpdmUpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgY2FzZSAnYWRkJzogcmV0dXJuIHRoaXMuYWRkQ29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3JlbW92ZSc6IHJldHVybiB0aGlzLnJlbW92ZUNvbXBvbmVudChhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeSc6IHJldHVybiB0aGlzLnF1ZXJ5Q29tcG9uZW50cyhhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUsICEhYXJncy52ZXJib3NlKTtcclxuICAgICAgICAgICAgY2FzZSAnc2V0X3Byb3BlcnR5JzogcmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3Jlc2V0JzogcmV0dXJuIHRoaXMucmVzZXRDb21wb25lbnQoYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgY2FzZSAnbGlzdF90eXBlcyc6IHJldHVybiB0aGlzLmxpc3RUeXBlcyhhcmdzLmZpbHRlcik7XHJcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2RldGFpbCc6IHJldHVybiB0aGlzLnF1ZXJ5RGV0YWlsKGFyZ3MuY29tcG9uZW50VXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2V4ZWN1dGVfbWV0aG9kJzogcmV0dXJuIHRoaXMuZXhlY3V0ZU1ldGhvZChhcmdzLnV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSwgYXJncy5tZXRob2QsIGFyZ3MuYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2xpc3RfYWxsJzogcmV0dXJuIHRoaXMubGlzdEFsbChhcmdzLmZpbHRlcik7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gY29tcG9uZW50IHRvb2w6ICR7dG9vbE5hbWV9YCB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gVG9vbCBJbXBsZW1lbnRhdGlvbnMgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBhZGRDb21wb25lbnQobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICAvLyBDb3VudCBjb21wb25lbnRzIGJlZm9yZVxyXG4gICAgICAgIGNvbnN0IGJlZm9yZURhdGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XHJcbiAgICAgICAgaWYgKCFiZWZvcmVEYXRhKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgY29uc3QgY291bnRCZWZvcmUgPSBiZWZvcmVEYXRhPy5fX2NvbXBzX18/Lmxlbmd0aCB8fCAwO1xyXG5cclxuICAgICAgICAvLyBUcnkgRWRpdG9yIEFQSSAobWF5IHRocm93IG9uIGNvbmZsaWN0IOKAlCB0aGF0J3MgZmluZSwgd2UgdmVyaWZ5IGJlbG93KVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1jb21wb25lbnQnLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogY29tcG9uZW50VHlwZSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaCB7IC8qIHdpbGwgdmVyaWZ5IGJlbG93ICovIH1cclxuXHJcbiAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgzMDApO1xyXG5cclxuICAgICAgICAvLyBWZXJpZnkgY29tcG9uZW50IHdhcyBhY3R1YWxseSBhZGRlZCAoY2hlY2sgY291bnQgQU5EIHNwZWNpZmljIHR5cGUpXHJcbiAgICAgICAgY29uc3QgYWZ0ZXJEYXRhOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xyXG4gICAgICAgIGNvbnN0IGFmdGVyQ29tcHMgPSBhZnRlckRhdGE/Ll9fY29tcHNfXyB8fCBbXTtcclxuICAgICAgICBpZiAoYWZ0ZXJDb21wcy5sZW5ndGggPiBjb3VudEJlZm9yZSkge1xyXG4gICAgICAgICAgICBjb25zdCBmb3VuZCA9IGFmdGVyQ29tcHMuc29tZSgoYzogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0ID0gYy50eXBlIHx8IGMuX190eXBlX18gfHwgYy5jaWQgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdCA9PT0gY29tcG9uZW50VHlwZSB8fCB0LmluY2x1ZGVzKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgaWYgKGZvdW5kKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQWRkZWQgJHtjb21wb25lbnRUeXBlfSB0byBub2RlICR7bm9kZVV1aWR9YCB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgZXJyb3I6IGBGYWlsZWQgdG8gYWRkICR7Y29tcG9uZW50VHlwZX06IG1heSBjb25mbGljdCB3aXRoIGV4aXN0aW5nIHJlbmRlcmVyIG9yIGNvbXBvbmVudCBvbiB0aGlzIG5vZGVgLFxyXG4gICAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZW1vdmVDb21wb25lbnQobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICAvLyBGaW5kIGNvbXBvbmVudCBpbmZvIChpbmNsdWRpbmcgaXRzIG93biBVVUlEKVxyXG4gICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCB0aGlzLmZpbmRDb21wb25lbnRJbmZvKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICBpZiAoJ3N1Y2Nlc3MnIGluIGluZm8pIHJldHVybiBpbmZvIGFzIFRvb2xSZXNwb25zZTtcclxuXHJcbiAgICAgICAgLy8gRWRpdG9yIEFQSSBleHBlY3RzIGNvbXBvbmVudCBVVUlELCBub3Qgbm9kZSBVVUlEXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgaWYgKGluZm8udXVpZCkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncmVtb3ZlLWNvbXBvbmVudCcsIHsgdXVpZDogaW5mby51dWlkIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMjAwKTtcclxuICAgICAgICB9IGNhdGNoIHsgLyogd2lsbCB2ZXJpZnkgYmVsb3cgKi8gfVxyXG5cclxuICAgICAgICAvLyBWZXJpZnkgcmVtb3ZhbFxyXG4gICAgICAgIGNvbnN0IGNoZWNrID0gYXdhaXQgdGhpcy5maW5kQ29tcG9uZW50SW5mbyhub2RlVXVpZCwgY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgaWYgKCdzdWNjZXNzJyBpbiBjaGVjaykge1xyXG4gICAgICAgICAgICAvLyBDb21wb25lbnQgbm8gbG9uZ2VyIGZvdW5kID0gcmVtb3ZlZCBzdWNjZXNzZnVsbHlcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFJlbW92ZWQgJHtjb21wb25lbnRUeXBlfSBmcm9tIG5vZGUgJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBFZGl0b3IgQVBJIGZhaWxlZCDigJQgdHJ5IHNjZW5lIHNjcmlwdCBmYWxsYmFja1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3JlbW92ZUNvbXBvbmVudEZyb21Ob2RlJyxcclxuICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV0sXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZiAocmVzdWx0Py5zdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgUmVtb3ZlZCAke2NvbXBvbmVudFR5cGV9IGZyb20gbm9kZSAke25vZGVVdWlkfWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIHJlbW92ZSAke2NvbXBvbmVudFR5cGV9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeUNvbXBvbmVudHMobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZT86IHN0cmluZywgdmVyYm9zZTogYm9vbGVhbiA9IGZhbHNlKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSBub3QgZm91bmQ6ICR7bm9kZVV1aWR9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wcyA9IG5vZGVEYXRhLl9fY29tcHNfXyB8fCBbXTtcclxuXHJcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50VHlwZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gUmV0dXJuIGNvbXBhY3QgdHlwZSBsaXN0IG9ubHkgKGluY2x1ZGUgdXVpZCBmb3IgcmVmZXJlbmNlKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdHlwZXMgPSBjb21wcy5tYXAoKGM6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogYy5lbmFibGVkPy52YWx1ZSA/PyBjLmVuYWJsZWQgPz8gdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBjLnZhbHVlPy51dWlkPy52YWx1ZSB8fCBjLnV1aWQ/LnZhbHVlIHx8IGMudXVpZCB8fCB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG5vZGVVdWlkLCBjb21wb25lbnRzOiB0eXBlcyB9IH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEZpbmQgc3BlY2lmaWMgY29tcG9uZW50IGFuZCByZXR1cm4gZGV0YWlsZWQgaW5mb1xyXG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBjb21wcy5maW5kKChjOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCB8fCAnJztcclxuICAgICAgICAgICAgICAgIHJldHVybiB0ID09PSBjb21wb25lbnRUeXBlIHx8IHQuaW5jbHVkZXMoY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IGNvbXBzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCkuam9pbignLCAnKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZC4gQXZhaWxhYmxlOiAke2F2YWlsYWJsZX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSB0aGlzLmV4dHJhY3RQcm9wZXJ0aWVzKHRhcmdldCwgdmVyYm9zZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHRhcmdldC50eXBlIHx8IHRhcmdldC5fX3R5cGVfXyB8fCB0YXJnZXQuY2lkLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRhcmdldC5lbmFibGVkPy52YWx1ZSA/PyB0YXJnZXQuZW5hYmxlZCA/PyB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXRDb21wb25lbnRJbmZvJyxcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGVdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gZGF0YSByZXR1cm5lZCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNldFByb3BlcnR5KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3QgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSB9ID0gYXJncztcclxuXHJcbiAgICAgICAgLy8gQmF0Y2ggbW9kZTogcHJvcGVydGllcyBhcnJheVxyXG4gICAgICAgIGlmIChhcmdzLnByb3BlcnRpZXMgJiYgQXJyYXkuaXNBcnJheShhcmdzLnByb3BlcnRpZXMpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldFByb3BlcnR5QmF0Y2gobm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIGFyZ3MucHJvcGVydGllcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBTaW5nbGUgbW9kZSAoYmFja3dhcmQgY29tcGF0aWJsZSlcclxuICAgICAgICBjb25zdCB7IHByb3BlcnR5LCBwcm9wZXJ0eVR5cGUsIHZhbHVlIH0gPSBhcmdzO1xyXG4gICAgICAgIGlmICghcHJvcGVydHkgfHwgIXByb3BlcnR5VHlwZSB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1Byb3ZpZGUgXCJwcm9wZXJ0eVwiK1wicHJvcGVydHlUeXBlXCIrXCJ2YWx1ZVwiIG9yIFwicHJvcGVydGllc1wiIGFycmF5JyB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2V0T25lUHJvcGVydHkobm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCBwcm9wZXJ0eVR5cGUsIHZhbHVlKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNldFByb3BlcnR5QmF0Y2gobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0aWVzOiBhbnlbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgLy8gUXVlcnkgbm9kZSBvbmNlIGZvciBhbGwgcHJvcGVydGllc1xyXG4gICAgICAgIGNvbnN0IGNvbXBJbmRleCA9IGF3YWl0IHRoaXMuZmluZENvbXBvbmVudEluZGV4KG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICBpZiAodHlwZW9mIGNvbXBJbmRleCA9PT0gJ29iamVjdCcpIHJldHVybiBjb21wSW5kZXg7IC8vIGVycm9yIHJlc3BvbnNlXHJcblxyXG4gICAgICAgIGNvbnN0IHJlc3VsdHM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgcHJvcGVydGllcykge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IGBfX2NvbXBzX18uJHtjb21wSW5kZXh9LiR7aXRlbS5wcm9wZXJ0eX1gO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZHVtcCA9IHRoaXMuYnVpbGREdW1wKGl0ZW0ucHJvcGVydHlUeXBlLCBpdGVtLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBwYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIGR1bXAsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChpdGVtLnByb3BlcnR5KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKGAke2l0ZW0ucHJvcGVydHl9OiAke2Vyci5tZXNzYWdlfWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhd2FpdCB0aGlzLmRlbGF5KDIwMCk7XHJcblxyXG4gICAgICAgIGlmIChlcnJvcnMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogcmVzdWx0cy5sZW5ndGggPiAwLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFNldDogWyR7cmVzdWx0cy5qb2luKCcsICcpfV1gICsgYCBFcnJvcnM6IFske2Vycm9ycy5qb2luKCc7ICcpfV1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgU2V0ICR7Y29tcG9uZW50VHlwZX06IFske3Jlc3VsdHMuam9pbignLCAnKX1dYCB9O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0T25lUHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCBwcm9wZXJ0eVR5cGU6IHN0cmluZywgdmFsdWU6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY29tcEluZGV4ID0gYXdhaXQgdGhpcy5maW5kQ29tcG9uZW50SW5kZXgobm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbXBJbmRleCA9PT0gJ29iamVjdCcpIHJldHVybiBjb21wSW5kZXg7IC8vIGVycm9yIHJlc3BvbnNlXHJcblxyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke2NvbXBJbmRleH0uJHtwcm9wZXJ0eX1gO1xyXG4gICAgICAgICAgICBjb25zdCBkdW1wID0gdGhpcy5idWlsZER1bXAocHJvcGVydHlUeXBlLCB2YWx1ZSk7XHJcblxyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgIHBhdGgsXHJcbiAgICAgICAgICAgICAgICBkdW1wLFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMjAwKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fSA9ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfWAgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHNjZW5lIHNjcmlwdFxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdzZXRDb21wb25lbnRQcm9wZXJ0eScsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBwcm9wZXJ0eSwgdmFsdWVdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHNldCBwcm9wZXJ0eScgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGZpbmRDb21wb25lbnRJbmRleChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPG51bWJlciB8IFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIGNvbnN0IG5vZGVEYXRhOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xyXG4gICAgICAgIGlmICghbm9kZURhdGEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSBub3QgZm91bmQ6ICR7bm9kZVV1aWR9YCB9O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgY29tcHMgPSBub2RlRGF0YS5fX2NvbXBzX18gfHwgW107XHJcbiAgICAgICAgY29uc3QgY29tcEluZGV4ID0gY29tcHMuZmluZEluZGV4KChjOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdCA9IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkIHx8ICcnO1xyXG4gICAgICAgICAgICByZXR1cm4gdCA9PT0gY29tcG9uZW50VHlwZSB8fCB0LmluY2x1ZGVzKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoY29tcEluZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICBjb25zdCBhdmFpbGFibGUgPSBjb21wcy5tYXAoKGM6IGFueSkgPT4gYy50eXBlIHx8IGMuX190eXBlX18gfHwgYy5jaWQpLmpvaW4oJywgJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZC4gQXZhaWxhYmxlOiAke2F2YWlsYWJsZX1gIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY29tcEluZGV4O1xyXG4gICAgfVxyXG5cclxuICAgIC8qKiBGaW5kIGNvbXBvbmVudCBieSB0eXBlIGFuZCByZXR1cm4gaXRzIGluZGV4LCBVVUlELCBhbmQgY2lkLiAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBmaW5kQ29tcG9uZW50SW5mbyhub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPHsgaW5kZXg6IG51bWJlcjsgdXVpZDogc3RyaW5nOyBjaWQ6IHN0cmluZyB9IHwgVG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3Qgbm9kZURhdGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XHJcbiAgICAgICAgaWYgKCFub2RlRGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb21wcyA9IG5vZGVEYXRhLl9fY29tcHNfXyB8fCBbXTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvbXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGMgPSBjb21wc1tpXTtcclxuICAgICAgICAgICAgY29uc3QgdCA9IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkIHx8ICcnO1xyXG4gICAgICAgICAgICBpZiAodCA9PT0gY29tcG9uZW50VHlwZSB8fCB0LmluY2x1ZGVzKGNvbXBvbmVudFR5cGUpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUcnkgbXVsdGlwbGUgcGF0aHMgdG8gZmluZCBjb21wb25lbnQgVVVJRFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdXVpZCA9IGMudmFsdWU/LnV1aWQ/LnZhbHVlIHx8IGMudXVpZD8udmFsdWUgfHwgYy51dWlkIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICBpbmRleDogaSxcclxuICAgICAgICAgICAgICAgICAgICB1dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGNpZDogYy5jaWQgfHwgYy5fX3R5cGVfXyB8fCBjb21wb25lbnRUeXBlLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gY29tcHMubWFwKChjOiBhbnkpID0+IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkKS5qb2luKCcsICcpO1xyXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZC4gQXZhaWxhYmxlOiAke2F2YWlsYWJsZX1gIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldENvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIC8vIEZpbmQgY29tcG9uZW50IGluZm8gKGluY2x1ZGluZyBpdHMgb3duIFVVSUQpXHJcbiAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IHRoaXMuZmluZENvbXBvbmVudEluZm8obm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgIGlmICgnc3VjY2VzcycgaW4gaW5mbykgcmV0dXJuIGluZm8gYXMgVG9vbFJlc3BvbnNlO1xyXG5cclxuICAgICAgICAvLyBFZGl0b3IgQVBJIGV4cGVjdHMgY29tcG9uZW50IFVVSURcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAoaW5mby51dWlkKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdyZXNldC1jb21wb25lbnQnLCB7IHV1aWQ6IGluZm8udXVpZCB9KTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMjAwKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBSZXNldCAke2NvbXBvbmVudFR5cGV9IG9uIG5vZGUgJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIHsgLyogdHJ5IGZhbGxiYWNrICovIH1cclxuXHJcbiAgICAgICAgLy8gRmFsbGJhY2s6IHNjZW5lIHNjcmlwdCByZW1vdmUgKyByZS1hZGRcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdyZXNldENvbXBvbmVudCcsXHJcbiAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGVdLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byByZXNldCAke2NvbXBvbmVudFR5cGV9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0VHlwZXMoZmlsdGVyPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjbGFzc2VzOiBhbnlbXSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3F1ZXJ5LWNsYXNzZXMnKTtcclxuICAgICAgICAgICAgaWYgKCFmaWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgIC8vIFdpdGhvdXQgZmlsdGVyLCByZXR1cm4gbmFtZXMgb25seSAobm8gbWV0YWRhdGEpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBjbGFzc2VzLm1hcCgoYzogYW55KSA9PiBjLm5hbWUgfHwgYykgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb25zdCBsb3dlckZpbHRlciA9IGZpbHRlci50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBmaWx0ZXJlZCA9IGNsYXNzZXNcclxuICAgICAgICAgICAgICAgIC5tYXAoKGM6IGFueSkgPT4gYy5uYW1lIHx8IGMpXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKChuYW1lOiBzdHJpbmcpID0+IG5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckZpbHRlcikpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBmaWx0ZXJlZCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBxdWVyeURldGFpbChjb21wb25lbnRVdWlkOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktY29tcG9uZW50JywgY29tcG9uZW50VXVpZCk7XHJcbiAgICAgICAgICAgIGlmICghcmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgbm90IGZvdW5kOiAke2NvbXBvbmVudFV1aWR9YCB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIFJldHVybiBjb21wYWN0IHZlcnNpb24gaW5zdGVhZCBvZiByYXcgZHVtcFxyXG4gICAgICAgICAgICBjb25zdCBwcm9wZXJ0aWVzID0gdGhpcy5leHRyYWN0UHJvcGVydGllcyhyZXN1bHQpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiByZXN1bHQudHlwZSB8fCByZXN1bHQuX190eXBlX18gfHwgcmVzdWx0LmNpZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogcmVzdWx0LmVuYWJsZWQ/LnZhbHVlID8/IHJlc3VsdC5lbmFibGVkID8/IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGV4ZWN1dGVNZXRob2QodXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIG1ldGhvZDogc3RyaW5nLCBhcmdzPzogYW55W10pOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBJbmRleCA9IGF3YWl0IHRoaXMuZmluZENvbXBvbmVudEluZGV4KHV1aWQsIGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGNvbXBJbmRleCA9PT0gJ29iamVjdCcpIHJldHVybiBjb21wSW5kZXg7XHJcblxyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ2V4ZWN1dGUtY29tcG9uZW50LW1ldGhvZCcsIHtcclxuICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICBpbmRleDogY29tcEluZGV4LFxyXG4gICAgICAgICAgICAgICAgbmFtZTogbWV0aG9kLFxyXG4gICAgICAgICAgICAgICAgYXJnczogYXJncyB8fCBbXSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdCwgbWVzc2FnZTogYEV4ZWN1dGVkICR7Y29tcG9uZW50VHlwZX0uJHttZXRob2R9KClgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RBbGwoZmlsdGVyPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnRzOiBhbnlbXSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3F1ZXJ5LWNvbXBvbmVudHMnKTtcclxuICAgICAgICAgICAgLy8gRXh0cmFjdCBjb21wYWN0IGluZm86IG5hbWUsIGNpZCBvbmx5XHJcbiAgICAgICAgICAgIGxldCByZXN1bHRzID0gKGNvbXBvbmVudHMgfHwgW10pLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogYy5uYW1lIHx8IGMuY2lkIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgIGNpZDogYy5jaWQsXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgaWYgKGZpbHRlcikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbG93ZXJGaWx0ZXIgPSBmaWx0ZXIudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMgPSByZXN1bHRzLmZpbHRlcigoYzogYW55KSA9PiBjLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckZpbHRlcikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdHMgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBIZWxwZXJzID09PVxyXG5cclxuICAgIHByaXZhdGUgYnVpbGREdW1wKHByb3BlcnR5VHlwZTogc3RyaW5nLCB2YWx1ZTogYW55KTogYW55IHtcclxuICAgICAgICBzd2l0Y2ggKHByb3BlcnR5VHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlICdjb2xvcic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHI6IHZhbHVlLnIgPz8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnOiB2YWx1ZS5nID8/IDI1NSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYjogdmFsdWUuYiA/PyAyNTUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGE6IHZhbHVlLmEgPz8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLkNvbG9yJyxcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICd2ZWMyJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgeDogdmFsdWUueCA/PyAwLCB5OiB2YWx1ZS55ID8/IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuVmVjMicsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAndmVjMyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHg6IHZhbHVlLnggPz8gMCwgeTogdmFsdWUueSA/PyAwLCB6OiB2YWx1ZS56ID8/IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuVmVjMycsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAnc2l6ZSc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHdpZHRoOiB2YWx1ZS53aWR0aCA/PyAwLCBoZWlnaHQ6IHZhbHVlLmhlaWdodCA/PyAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlNpemUnLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ25vZGUnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHsgdXVpZDogdmFsdWUgfSwgdHlwZTogJ2NjLk5vZGUnIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICdzcHJpdGVGcmFtZSc6XHJcbiAgICAgICAgICAgIGNhc2UgJ2Fzc2V0JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB7IHV1aWQ6IHZhbHVlIH0sIHR5cGU6IHRoaXMuZ2V0QXNzZXRUeXBlSGludChwcm9wZXJ0eVR5cGUpIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxyXG4gICAgICAgICAgICBjYXNlICdmbG9hdCc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogTnVtYmVyKHZhbHVlKSwgdHlwZTogJ0Zsb2F0JyB9O1xyXG4gICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBNYXRoLnJvdW5kKE51bWJlcih2YWx1ZSkpLCB0eXBlOiAnSW50ZWdlcicgfTtcclxuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogISF2YWx1ZSwgdHlwZTogJ0Jvb2xlYW4nIH07XHJcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogU3RyaW5nKHZhbHVlKSB9O1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWUgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRBc3NldFR5cGVIaW50KHByb3BlcnR5VHlwZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICBjb25zdCBoaW50czogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgICAgICAgc3ByaXRlRnJhbWU6ICdjYy5TcHJpdGVGcmFtZScsXHJcbiAgICAgICAgICAgIG1hdGVyaWFsOiAnY2MuTWF0ZXJpYWwnLFxyXG4gICAgICAgICAgICB0ZXh0dXJlOiAnY2MuVGV4dHVyZTJEJyxcclxuICAgICAgICAgICAgYXVkaW9DbGlwOiAnY2MuQXVkaW9DbGlwJyxcclxuICAgICAgICAgICAgcHJlZmFiOiAnY2MuUHJlZmFiJyxcclxuICAgICAgICAgICAgZm9udDogJ2NjLkZvbnQnLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIGhpbnRzW3Byb3BlcnR5VHlwZV07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIEV4dHJhY3QgY29tcGFjdCBwcm9wZXJ0aWVzOiBvbmx5IHZpc2libGUsIG5vbi1pbnRlcm5hbCwgbm9uLWRlZmF1bHQgZmllbGRzLiAqL1xyXG4gICAgcHJpdmF0ZSBleHRyYWN0UHJvcGVydGllcyhjb21wOiBhbnksIHZlcmJvc2U6IGJvb2xlYW4gPSBmYWxzZSk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGNvbXAudmFsdWUgfHwgY29tcDtcclxuICAgICAgICBjb25zdCBza2lwS2V5cyA9IG5ldyBTZXQoW1xyXG4gICAgICAgICAgICAnX190eXBlX18nLCAndHlwZScsICdjaWQnLCAnX25hbWUnLCAnX29iakZsYWdzJywgJ25vZGUnLCAnX19wcmVmYWInLCAnZmlsZUlkJyxcclxuICAgICAgICAgICAgJ3V1aWQnLCAnbmFtZScsICdlbmFibGVkJywgJ19lbmFibGVkJywgJ19fc2NyaXB0QXNzZXQnLFxyXG4gICAgICAgIF0pO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIG1ldGFdIG9mIE9iamVjdC5lbnRyaWVzKHNvdXJjZSkpIHtcclxuICAgICAgICAgICAgaWYgKHNraXBLZXlzLmhhcyhrZXkpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdfJykpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2VkaXRvcicpKSBjb250aW51ZTsgLy8gc2tpcCBlZGl0b3Itb25seSBkaXNwbGF5IGR1cGxpY2F0ZXNcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG0gPSBtZXRhIGFzIGFueTtcclxuICAgICAgICAgICAgaWYgKCFtIHx8IHR5cGVvZiBtICE9PSAnb2JqZWN0JykgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChtLnZpc2libGUgPT09IGZhbHNlKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKCF2ZXJib3NlICYmIG0ucmVhZG9ubHkgPT09IHRydWUpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoIXZlcmJvc2UgJiYgJ3ZhbHVlJyBpbiBtICYmICdkZWZhdWx0JyBpbiBtICYmIHRoaXMudmFsdWVFcXVhbHMobS52YWx1ZSwgbS5kZWZhdWx0KSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBpZiAoJ3ZhbHVlJyBpbiBtKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IG0udmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHZhbHVlRXF1YWxzKGE6IGFueSwgYjogYW55KTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKGEgPT09IGIpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBhICE9PSB0eXBlb2YgYikgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgYSAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcclxuICAgICAgICBjb25zdCBrYSA9IE9iamVjdC5rZXlzKGEpO1xyXG4gICAgICAgIGNvbnN0IGtiID0gT2JqZWN0LmtleXMoYik7XHJcbiAgICAgICAgaWYgKGthLmxlbmd0aCAhPT0ga2IubGVuZ3RoKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIGthLmV2ZXJ5KGsgPT4gdGhpcy52YWx1ZUVxdWFscyhhW2tdLCBiW2tdKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkZWxheShtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==