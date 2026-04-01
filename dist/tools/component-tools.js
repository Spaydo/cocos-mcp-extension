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
            {
                name: 'query_has_script',
                description: 'Check if a component class has an associated user script',
                inputSchema: {
                    type: 'object',
                    properties: {
                        className: { type: 'string', description: 'Component class name (e.g. cc.Sprite, MyComponent)' },
                    },
                    required: ['className'],
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
            case 'query_has_script': return this.queryHasScript(args === null || args === void 0 ? void 0 : args.className);
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
    async queryHasScript(className) {
        try {
            const result = await Editor.Message.request('scene', 'query-component-has-script', className);
            return { success: true, data: { className, hasScript: !!result } };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQztBQUU3QyxNQUFhLGNBQWM7SUFFdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsS0FBSztnQkFDWCxXQUFXLEVBQUUsMkJBQTJCO2dCQUN4QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7d0JBQzVCLGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdDQUF3QyxFQUFFO3FCQUMzRjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLDBEQUEwRDtnQkFDdkUsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO3dCQUM1QixhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRTtxQkFDMUU7b0JBQ0QsUUFBUSxFQUFFLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQztpQkFDMUM7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSwwRUFBMEU7Z0JBQ3ZGLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDNUIsYUFBYSxFQUFF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LE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0QsQ0FBQztDQUNKO0FBcG5CRCx3Q0FvbkJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuY29uc3QgRVhURU5TSU9OX05BTUUgPSAnY29jb3MtbWNwLWV4dGVuc2lvbic7XHJcblxyXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50VG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdhZGQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBZGQgYSBjb21wb25lbnQgdG8gYSBub2RlJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ2UuZy4gY2MuU3ByaXRlLCBjYy5MYWJlbCwgY2MuUmlnaWRCb2R5JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZSddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlbW92ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlbW92ZSBhIGNvbXBvbmVudCBmcm9tIGEgbm9kZSAodXNlcyBjb21wb25lbnQgdHlwZS9jaWQpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIG9yIGNpZCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IGNvbXBvbmVudHMgb24gYSBub2RlLiBXaXRob3V0IGNvbXBvbmVudFR5cGUgcmV0dXJucyB0eXBlIGxpc3Qgb25seScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTcGVjaWZpYyBjb21wb25lbnQgdHlwZSBmb3IgZGV0YWlsZWQgaW5mbycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmVyYm9zZTogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnSW5jbHVkZSByZWFkb25seSBwcm9wcyBhbmQgZGVmYXVsdCB2YWx1ZXMnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3NldF9wcm9wZXJ0eScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NldCBvbmUgb3IgbXVsdGlwbGUgY29tcG9uZW50IHByb3BlcnRpZXMgYXQgb25jZS4gVXNlIFwicHJvcGVydGllc1wiIGFycmF5IGZvciBiYXRjaCwgb3Igc2luZ2xlIFwicHJvcGVydHlcIitcInByb3BlcnR5VHlwZVwiK1widmFsdWVcIicsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUYXJnZXQgY29tcG9uZW50IHR5cGUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NpbmdsZSBtb2RlOiBwcm9wZXJ0eSBuYW1lJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU2luZ2xlIG1vZGUgdHlwZSBoaW50OiBzdHJpbmcsIG51bWJlciwgYm9vbGVhbiwgY29sb3IsIHZlYzIsIHZlYzMsIHNpemUsIG5vZGUsIHNwcml0ZUZyYW1lLCBhc3NldCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgZGVzY3JpcHRpb246ICdTaW5nbGUgbW9kZTogcHJvcGVydHkgdmFsdWUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdhcnJheScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0JhdGNoIG1vZGU6IFt7cHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWV9LCAuLi5dJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eVR5cGU6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHt9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncHJvcGVydHknLCAncHJvcGVydHlUeXBlJywgJ3ZhbHVlJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZSddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3Jlc2V0JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmVzZXQgYSBjb21wb25lbnQgdG8gaXRzIGRlZmF1bHQgdmFsdWVzJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIHRvIHJlc2V0JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZSddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2xpc3RfdHlwZXMnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdMaXN0IGFsbCBhdmFpbGFibGUgY29tcG9uZW50IHR5cGVzLiBVc2UgZmlsdGVyIHRvIG5hcnJvdyByZXN1bHRzIChlLmcuIFwiVUlcIiwgXCJTcHJpdGVcIiwgXCJQaHlzaWNzXCIpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXI6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU3Vic3RyaW5nIGZpbHRlciBmb3IgY2xhc3MgbmFtZXMgKGNhc2UtaW5zZW5zaXRpdmUpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnlfZGV0YWlsJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUXVlcnkgYSBzaW5nbGUgY29tcG9uZW50IGJ5IGl0cyBVVUlEIChmcm9tIHF1ZXJ5LW5vZGUgcmVzdWx0cyknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IFVVSUQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydjb21wb25lbnRVdWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnZXhlY3V0ZV9tZXRob2QnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdFeGVjdXRlIGEgbWV0aG9kIG9uIGEgY29tcG9uZW50IGF0IHJ1bnRpbWUnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlLCBlLmcuIGNjLlNwcml0ZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ01ldGhvZCBuYW1lIHRvIGNhbGwnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IHsgdHlwZTogJ2FycmF5JywgZGVzY3JpcHRpb246ICdBcmd1bWVudHMgdG8gcGFzcyB0byB0aGUgbWV0aG9kJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCcsICdjb21wb25lbnRUeXBlJywgJ21ldGhvZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2xpc3RfYWxsJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgcmVnaXN0ZXJlZCBjb21wb25lbnRzIHdpdGggZGV0YWlscy4gVXNlIGZpbHRlciB0byBuYXJyb3cgcmVzdWx0cycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1N1YnN0cmluZyBmaWx0ZXIgZm9yIGNvbXBvbmVudCBuYW1lcyAoY2FzZS1pbnNlbnNpdGl2ZSknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeV9oYXNfc2NyaXB0JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hlY2sgaWYgYSBjb21wb25lbnQgY2xhc3MgaGFzIGFuIGFzc29jaWF0ZWQgdXNlciBzY3JpcHQnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDb21wb25lbnQgY2xhc3MgbmFtZSAoZS5nLiBjYy5TcHJpdGUsIE15Q29tcG9uZW50KScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2NsYXNzTmFtZSddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ2FkZCc6IHJldHVybiB0aGlzLmFkZENvbXBvbmVudChhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBjYXNlICdyZW1vdmUnOiByZXR1cm4gdGhpcy5yZW1vdmVDb21wb25lbnQoYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgY2FzZSAncXVlcnknOiByZXR1cm4gdGhpcy5xdWVyeUNvbXBvbmVudHMoYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlLCAhIWFyZ3MudmVyYm9zZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NldF9wcm9wZXJ0eSc6IHJldHVybiB0aGlzLnNldFByb3BlcnR5KGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdyZXNldCc6IHJldHVybiB0aGlzLnJlc2V0Q29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2xpc3RfdHlwZXMnOiByZXR1cm4gdGhpcy5saXN0VHlwZXMoYXJncy5maWx0ZXIpO1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeV9kZXRhaWwnOiByZXR1cm4gdGhpcy5xdWVyeURldGFpbChhcmdzLmNvbXBvbmVudFV1aWQpO1xyXG4gICAgICAgICAgICBjYXNlICdleGVjdXRlX21ldGhvZCc6IHJldHVybiB0aGlzLmV4ZWN1dGVNZXRob2QoYXJncy51dWlkLCBhcmdzLmNvbXBvbmVudFR5cGUsIGFyZ3MubWV0aG9kLCBhcmdzLmFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdsaXN0X2FsbCc6IHJldHVybiB0aGlzLmxpc3RBbGwoYXJncy5maWx0ZXIpO1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeV9oYXNfc2NyaXB0JzogcmV0dXJuIHRoaXMucXVlcnlIYXNTY3JpcHQoYXJncz8uY2xhc3NOYW1lKTtcclxuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBjb21wb25lbnQgdG9vbDogJHt0b29sTmFtZX1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIEltcGxlbWVudGF0aW9ucyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGFkZENvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIC8vIENvdW50IGNvbXBvbmVudHMgYmVmb3JlXHJcbiAgICAgICAgY29uc3QgYmVmb3JlRGF0YTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcclxuICAgICAgICBpZiAoIWJlZm9yZURhdGEpIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgbm90IGZvdW5kOiAke25vZGVVdWlkfWAgfTtcclxuICAgICAgICBjb25zdCBjb3VudEJlZm9yZSA9IGJlZm9yZURhdGE/Ll9fY29tcHNfXz8ubGVuZ3RoIHx8IDA7XHJcblxyXG4gICAgICAgIC8vIFRyeSBFZGl0b3IgQVBJIChtYXkgdGhyb3cgb24gY29uZmxpY3Qg4oCUIHRoYXQncyBmaW5lLCB3ZSB2ZXJpZnkgYmVsb3cpXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLWNvbXBvbmVudCcsIHtcclxuICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgY29tcG9uZW50OiBjb21wb25lbnRUeXBlLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGNhdGNoIHsgLyogd2lsbCB2ZXJpZnkgYmVsb3cgKi8gfVxyXG5cclxuICAgICAgICBhd2FpdCB0aGlzLmRlbGF5KDMwMCk7XHJcblxyXG4gICAgICAgIC8vIFZlcmlmeSBjb21wb25lbnQgd2FzIGFjdHVhbGx5IGFkZGVkIChjaGVjayBjb3VudCBBTkQgc3BlY2lmaWMgdHlwZSlcclxuICAgICAgICBjb25zdCBhZnRlckRhdGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XHJcbiAgICAgICAgY29uc3QgYWZ0ZXJDb21wcyA9IGFmdGVyRGF0YT8uX19jb21wc19fIHx8IFtdO1xyXG4gICAgICAgIGlmIChhZnRlckNvbXBzLmxlbmd0aCA+IGNvdW50QmVmb3JlKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gYWZ0ZXJDb21wcy5zb21lKChjOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCB8fCAnJztcclxuICAgICAgICAgICAgICAgIHJldHVybiB0ID09PSBjb21wb25lbnRUeXBlIHx8IHQuaW5jbHVkZXMoY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZiAoZm91bmQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBBZGRlZCAke2NvbXBvbmVudFR5cGV9IHRvIG5vZGUgJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICBlcnJvcjogYEZhaWxlZCB0byBhZGQgJHtjb21wb25lbnRUeXBlfTogbWF5IGNvbmZsaWN0IHdpdGggZXhpc3RpbmcgcmVuZGVyZXIgb3IgY29tcG9uZW50IG9uIHRoaXMgbm9kZWAsXHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlbW92ZUNvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIC8vIEZpbmQgY29tcG9uZW50IGluZm8gKGluY2x1ZGluZyBpdHMgb3duIFVVSUQpXHJcbiAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IHRoaXMuZmluZENvbXBvbmVudEluZm8obm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgIGlmICgnc3VjY2VzcycgaW4gaW5mbykgcmV0dXJuIGluZm8gYXMgVG9vbFJlc3BvbnNlO1xyXG5cclxuICAgICAgICAvLyBFZGl0b3IgQVBJIGV4cGVjdHMgY29tcG9uZW50IFVVSUQsIG5vdCBub2RlIFVVSURcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAoaW5mby51dWlkKSB7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdyZW1vdmUtY29tcG9uZW50JywgeyB1dWlkOiBpbmZvLnV1aWQgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyMDApO1xyXG4gICAgICAgIH0gY2F0Y2ggeyAvKiB3aWxsIHZlcmlmeSBiZWxvdyAqLyB9XHJcblxyXG4gICAgICAgIC8vIFZlcmlmeSByZW1vdmFsXHJcbiAgICAgICAgY29uc3QgY2hlY2sgPSBhd2FpdCB0aGlzLmZpbmRDb21wb25lbnRJbmZvKG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICBpZiAoJ3N1Y2Nlc3MnIGluIGNoZWNrKSB7XHJcbiAgICAgICAgICAgIC8vIENvbXBvbmVudCBubyBsb25nZXIgZm91bmQgPSByZW1vdmVkIHN1Y2Nlc3NmdWxseVxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgUmVtb3ZlZCAke2NvbXBvbmVudFR5cGV9IGZyb20gbm9kZSAke25vZGVVdWlkfWAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEVkaXRvciBBUEkgZmFpbGVkIOKAlCB0cnkgc2NlbmUgc2NyaXB0IGZhbGxiYWNrXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAncmVtb3ZlQ29tcG9uZW50RnJvbU5vZGUnLFxyXG4gICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21wb25lbnRUeXBlXSxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQ/LnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBSZW1vdmVkICR7Y29tcG9uZW50VHlwZX0gZnJvbSBub2RlICR7bm9kZVV1aWR9YCB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBGYWlsZWQgdG8gcmVtb3ZlICR7Y29tcG9uZW50VHlwZX1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5Q29tcG9uZW50cyhub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlPzogc3RyaW5nLCB2ZXJib3NlOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gbm9kZURhdGEuX19jb21wc19fIHx8IFtdO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFjb21wb25lbnRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBSZXR1cm4gY29tcGFjdCB0eXBlIGxpc3Qgb25seSAoaW5jbHVkZSB1dWlkIGZvciByZWZlcmVuY2UpXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0eXBlcyA9IGNvbXBzLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjLmVuYWJsZWQ/LnZhbHVlID8/IGMuZW5hYmxlZCA/PyB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IGMudmFsdWU/LnV1aWQ/LnZhbHVlIHx8IGMudXVpZD8udmFsdWUgfHwgYy51dWlkIHx8IHVuZGVmaW5lZCxcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbm9kZVV1aWQsIGNvbXBvbmVudHM6IHR5cGVzIH0gfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRmluZCBzcGVjaWZpYyBjb21wb25lbnQgYW5kIHJldHVybiBkZXRhaWxlZCBpbmZvXHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGNvbXBzLmZpbmQoKGM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdCA9IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHQgPT09IGNvbXBvbmVudFR5cGUgfHwgdC5pbmNsdWRlcyhjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gY29tcHMubWFwKChjOiBhbnkpID0+IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkKS5qb2luKCcsICcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kLiBBdmFpbGFibGU6ICR7YXZhaWxhYmxlfWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IHRoaXMuZXh0cmFjdFByb3BlcnRpZXModGFyZ2V0LCB2ZXJib3NlKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogdGFyZ2V0LnR5cGUgfHwgdGFyZ2V0Ll9fdHlwZV9fIHx8IHRhcmdldC5jaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdGFyZ2V0LmVuYWJsZWQ/LnZhbHVlID8/IHRhcmdldC5lbmFibGVkID8/IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldENvbXBvbmVudEluZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBkYXRhIHJldHVybmVkJyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydHkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBjb25zdCB7IG5vZGVVdWlkLCBjb21wb25lbnRUeXBlIH0gPSBhcmdzO1xyXG5cclxuICAgICAgICAvLyBCYXRjaCBtb2RlOiBwcm9wZXJ0aWVzIGFycmF5XHJcbiAgICAgICAgaWYgKGFyZ3MucHJvcGVydGllcyAmJiBBcnJheS5pc0FycmF5KGFyZ3MucHJvcGVydGllcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0UHJvcGVydHlCYXRjaChub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgYXJncy5wcm9wZXJ0aWVzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNpbmdsZSBtb2RlIChiYWNrd2FyZCBjb21wYXRpYmxlKVxyXG4gICAgICAgIGNvbnN0IHsgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUgfSA9IGFyZ3M7XHJcbiAgICAgICAgaWYgKCFwcm9wZXJ0eSB8fCAhcHJvcGVydHlUeXBlIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJvdmlkZSBcInByb3BlcnR5XCIrXCJwcm9wZXJ0eVR5cGVcIitcInZhbHVlXCIgb3IgXCJwcm9wZXJ0aWVzXCIgYXJyYXknIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5zZXRPbmVQcm9wZXJ0eShub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydHlCYXRjaChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnRpZXM6IGFueVtdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICAvLyBRdWVyeSBub2RlIG9uY2UgZm9yIGFsbCBwcm9wZXJ0aWVzXHJcbiAgICAgICAgY29uc3QgY29tcEluZGV4ID0gYXdhaXQgdGhpcy5maW5kQ29tcG9uZW50SW5kZXgobm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgIGlmICh0eXBlb2YgY29tcEluZGV4ID09PSAnb2JqZWN0JykgcmV0dXJuIGNvbXBJbmRleDsgLy8gZXJyb3IgcmVzcG9uc2VcclxuXHJcbiAgICAgICAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBwcm9wZXJ0aWVzKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke2NvbXBJbmRleH0uJHtpdGVtLnByb3BlcnR5fWA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkdW1wID0gdGhpcy5idWlsZER1bXAoaXRlbS5wcm9wZXJ0eVR5cGUsIGl0ZW0udmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcCxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZW0ucHJvcGVydHkpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goYCR7aXRlbS5wcm9wZXJ0eX06ICR7ZXJyLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMjAwKTtcclxuXHJcbiAgICAgICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiByZXN1bHRzLmxlbmd0aCA+IDAsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2V0OiBbJHtyZXN1bHRzLmpvaW4oJywgJyl9XWAgKyBgIEVycm9yczogWyR7ZXJyb3JzLmpvaW4oJzsgJyl9XWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQgJHtjb21wb25lbnRUeXBlfTogWyR7cmVzdWx0cy5qb2luKCcsICcpfV1gIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRPbmVQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcsIHByb3BlcnR5VHlwZTogc3RyaW5nLCB2YWx1ZTogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb21wSW5kZXggPSBhd2FpdCB0aGlzLmZpbmRDb21wb25lbnRJbmRleChub2RlVXVpZCwgY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29tcEluZGV4ID09PSAnb2JqZWN0JykgcmV0dXJuIGNvbXBJbmRleDsgLy8gZXJyb3IgcmVzcG9uc2VcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgX19jb21wc19fLiR7Y29tcEluZGV4fS4ke3Byb3BlcnR5fWA7XHJcbiAgICAgICAgICAgIGNvbnN0IGR1bXAgPSB0aGlzLmJ1aWxkRHVtcChwcm9wZXJ0eVR5cGUsIHZhbHVlKTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgcGF0aCxcclxuICAgICAgICAgICAgICAgIGR1bXAsXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyMDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFNldCAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9ID0gJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAvLyBGYWxsYmFjazogc2NlbmUgc2NyaXB0XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ3NldENvbXBvbmVudFByb3BlcnR5JyxcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCB2YWx1ZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gc2V0IHByb3BlcnR5JyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZmluZENvbXBvbmVudEluZGV4KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgVG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3Qgbm9kZURhdGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XHJcbiAgICAgICAgaWYgKCFub2RlRGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb21wcyA9IG5vZGVEYXRhLl9fY29tcHNfXyB8fCBbXTtcclxuICAgICAgICBjb25zdCBjb21wSW5kZXggPSBjb21wcy5maW5kSW5kZXgoKGM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0ID0gYy50eXBlIHx8IGMuX190eXBlX18gfHwgYy5jaWQgfHwgJyc7XHJcbiAgICAgICAgICAgIHJldHVybiB0ID09PSBjb21wb25lbnRUeXBlIHx8IHQuaW5jbHVkZXMoY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmIChjb21wSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IGNvbXBzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCkuam9pbignLCAnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kLiBBdmFpbGFibGU6ICR7YXZhaWxhYmxlfWAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb21wSW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIEZpbmQgY29tcG9uZW50IGJ5IHR5cGUgYW5kIHJldHVybiBpdHMgaW5kZXgsIFVVSUQsIGFuZCBjaWQuICovXHJcbiAgICBwcml2YXRlIGFzeW5jIGZpbmRDb21wb25lbnRJbmZvKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8eyBpbmRleDogbnVtYmVyOyB1dWlkOiBzdHJpbmc7IGNpZDogc3RyaW5nIH0gfCBUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBjb25zdCBub2RlRGF0YTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcclxuICAgICAgICBpZiAoIW5vZGVEYXRhKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYE5vZGUgbm90IGZvdW5kOiAke25vZGVVdWlkfWAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0IGNvbXBzID0gbm9kZURhdGEuX19jb21wc19fIHx8IFtdO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29tcHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgY29uc3QgYyA9IGNvbXBzW2ldO1xyXG4gICAgICAgICAgICBjb25zdCB0ID0gYy50eXBlIHx8IGMuX190eXBlX18gfHwgYy5jaWQgfHwgJyc7XHJcbiAgICAgICAgICAgIGlmICh0ID09PSBjb21wb25lbnRUeXBlIHx8IHQuaW5jbHVkZXMoY29tcG9uZW50VHlwZSkpIHtcclxuICAgICAgICAgICAgICAgIC8vIFRyeSBtdWx0aXBsZSBwYXRocyB0byBmaW5kIGNvbXBvbmVudCBVVUlEXHJcbiAgICAgICAgICAgICAgICBjb25zdCB1dWlkID0gYy52YWx1ZT8udXVpZD8udmFsdWUgfHwgYy51dWlkPy52YWx1ZSB8fCBjLnV1aWQgfHwgJyc7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGluZGV4OiBpLFxyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgY2lkOiBjLmNpZCB8fCBjLl9fdHlwZV9fIHx8IGNvbXBvbmVudFR5cGUsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBhdmFpbGFibGUgPSBjb21wcy5tYXAoKGM6IGFueSkgPT4gYy50eXBlIHx8IGMuX190eXBlX18gfHwgYy5jaWQpLmpvaW4oJywgJyk7XHJcbiAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kLiBBdmFpbGFibGU6ICR7YXZhaWxhYmxlfWAgfTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlc2V0Q29tcG9uZW50KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgLy8gRmluZCBjb21wb25lbnQgaW5mbyAoaW5jbHVkaW5nIGl0cyBvd24gVVVJRClcclxuICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgdGhpcy5maW5kQ29tcG9uZW50SW5mbyhub2RlVXVpZCwgY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgaWYgKCdzdWNjZXNzJyBpbiBpbmZvKSByZXR1cm4gaW5mbyBhcyBUb29sUmVzcG9uc2U7XHJcblxyXG4gICAgICAgIC8vIEVkaXRvciBBUEkgZXhwZWN0cyBjb21wb25lbnQgVVVJRFxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGlmIChpbmZvLnV1aWQpIHtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3Jlc2V0LWNvbXBvbmVudCcsIHsgdXVpZDogaW5mby51dWlkIH0pO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyMDApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFJlc2V0ICR7Y29tcG9uZW50VHlwZX0gb24gbm9kZSAke25vZGVVdWlkfWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggeyAvKiB0cnkgZmFsbGJhY2sgKi8gfVxyXG5cclxuICAgICAgICAvLyBGYWxsYmFjazogc2NlbmUgc2NyaXB0IHJlbW92ZSArIHJlLWFkZFxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3Jlc2V0Q29tcG9uZW50JyxcclxuICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV0sXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIHJlc2V0ICR7Y29tcG9uZW50VHlwZX1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RUeXBlcyhmaWx0ZXI/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNsYXNzZXM6IGFueVtdID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncXVlcnktY2xhc3NlcycpO1xyXG4gICAgICAgICAgICBpZiAoIWZpbHRlcikge1xyXG4gICAgICAgICAgICAgICAgLy8gV2l0aG91dCBmaWx0ZXIsIHJldHVybiBuYW1lcyBvbmx5IChubyBtZXRhZGF0YSlcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGNsYXNzZXMubWFwKChjOiBhbnkpID0+IGMubmFtZSB8fCBjKSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IGxvd2VyRmlsdGVyID0gZmlsdGVyLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbHRlcmVkID0gY2xhc3Nlc1xyXG4gICAgICAgICAgICAgICAgLm1hcCgoYzogYW55KSA9PiBjLm5hbWUgfHwgYylcclxuICAgICAgICAgICAgICAgIC5maWx0ZXIoKG5hbWU6IHN0cmluZykgPT4gbmFtZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGxvd2VyRmlsdGVyKSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGZpbHRlcmVkIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5RGV0YWlsKGNvbXBvbmVudFV1aWQ6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1jb21wb25lbnQnLCBjb21wb25lbnRVdWlkKTtcclxuICAgICAgICAgICAgaWYgKCFyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCBub3QgZm91bmQ6ICR7Y29tcG9uZW50VXVpZH1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gUmV0dXJuIGNvbXBhY3QgdmVyc2lvbiBpbnN0ZWFkIG9mIHJhdyBkdW1wXHJcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSB0aGlzLmV4dHJhY3RQcm9wZXJ0aWVzKHJlc3VsdCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHJlc3VsdC50eXBlIHx8IHJlc3VsdC5fX3R5cGVfXyB8fCByZXN1bHQuY2lkIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiByZXN1bHQuZW5hYmxlZD8udmFsdWUgPz8gcmVzdWx0LmVuYWJsZWQgPz8gdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZXhlY3V0ZU1ldGhvZCh1dWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgbWV0aG9kOiBzdHJpbmcsIGFyZ3M/OiBhbnlbXSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY29tcEluZGV4ID0gYXdhaXQgdGhpcy5maW5kQ29tcG9uZW50SW5kZXgodXVpZCwgY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29tcEluZGV4ID09PSAnb2JqZWN0JykgcmV0dXJuIGNvbXBJbmRleDtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAnZXhlY3V0ZS1jb21wb25lbnQtbWV0aG9kJywge1xyXG4gICAgICAgICAgICAgICAgdXVpZCxcclxuICAgICAgICAgICAgICAgIGluZGV4OiBjb21wSW5kZXgsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBtZXRob2QsXHJcbiAgICAgICAgICAgICAgICBhcmdzOiBhcmdzIHx8IFtdLFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0LCBtZXNzYWdlOiBgRXhlY3V0ZWQgJHtjb21wb25lbnRUeXBlfS4ke21ldGhvZH0oKWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlIYXNTY3JpcHQoY2xhc3NOYW1lOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncXVlcnktY29tcG9uZW50LWhhcy1zY3JpcHQnLCBjbGFzc05hbWUpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IGNsYXNzTmFtZSwgaGFzU2NyaXB0OiAhIXJlc3VsdCB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGxpc3RBbGwoZmlsdGVyPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnRzOiBhbnlbXSA9IGF3YWl0IChFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0IGFzIGFueSkoJ3NjZW5lJywgJ3F1ZXJ5LWNvbXBvbmVudHMnKTtcclxuICAgICAgICAgICAgLy8gRXh0cmFjdCBjb21wYWN0IGluZm86IG5hbWUsIGNpZCBvbmx5XHJcbiAgICAgICAgICAgIGxldCByZXN1bHRzID0gKGNvbXBvbmVudHMgfHwgW10pLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogYy5uYW1lIHx8IGMuY2lkIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgIGNpZDogYy5jaWQsXHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgaWYgKGZpbHRlcikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbG93ZXJGaWx0ZXIgPSBmaWx0ZXIudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMgPSByZXN1bHRzLmZpbHRlcigoYzogYW55KSA9PiBjLm5hbWUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhsb3dlckZpbHRlcikpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdHMgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBIZWxwZXJzID09PVxyXG5cclxuICAgIHByaXZhdGUgYnVpbGREdW1wKHByb3BlcnR5VHlwZTogc3RyaW5nLCB2YWx1ZTogYW55KTogYW55IHtcclxuICAgICAgICBzd2l0Y2ggKHByb3BlcnR5VHlwZSkge1xyXG4gICAgICAgICAgICBjYXNlICdjb2xvcic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHI6IHZhbHVlLnIgPz8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBnOiB2YWx1ZS5nID8/IDI1NSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYjogdmFsdWUuYiA/PyAyNTUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGE6IHZhbHVlLmEgPz8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLkNvbG9yJyxcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICd2ZWMyJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgeDogdmFsdWUueCA/PyAwLCB5OiB2YWx1ZS55ID8/IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuVmVjMicsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAndmVjMyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHg6IHZhbHVlLnggPz8gMCwgeTogdmFsdWUueSA/PyAwLCB6OiB2YWx1ZS56ID8/IDAgfSxcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY2MuVmVjMycsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAnc2l6ZSc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHdpZHRoOiB2YWx1ZS53aWR0aCA/PyAwLCBoZWlnaHQ6IHZhbHVlLmhlaWdodCA/PyAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlNpemUnLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ25vZGUnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHsgdXVpZDogdmFsdWUgfSwgdHlwZTogJ2NjLk5vZGUnIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICdzcHJpdGVGcmFtZSc6XHJcbiAgICAgICAgICAgIGNhc2UgJ2Fzc2V0JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB7IHV1aWQ6IHZhbHVlIH0sIHR5cGU6IHRoaXMuZ2V0QXNzZXRUeXBlSGludChwcm9wZXJ0eVR5cGUpIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICdudW1iZXInOlxyXG4gICAgICAgICAgICBjYXNlICdmbG9hdCc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogTnVtYmVyKHZhbHVlKSwgdHlwZTogJ0Zsb2F0JyB9O1xyXG4gICAgICAgICAgICBjYXNlICdpbnRlZ2VyJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBNYXRoLnJvdW5kKE51bWJlcih2YWx1ZSkpLCB0eXBlOiAnSW50ZWdlcicgfTtcclxuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogISF2YWx1ZSwgdHlwZTogJ0Jvb2xlYW4nIH07XHJcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogU3RyaW5nKHZhbHVlKSB9O1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWUgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRBc3NldFR5cGVIaW50KHByb3BlcnR5VHlwZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICBjb25zdCBoaW50czogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgICAgICAgc3ByaXRlRnJhbWU6ICdjYy5TcHJpdGVGcmFtZScsXHJcbiAgICAgICAgICAgIG1hdGVyaWFsOiAnY2MuTWF0ZXJpYWwnLFxyXG4gICAgICAgICAgICB0ZXh0dXJlOiAnY2MuVGV4dHVyZTJEJyxcclxuICAgICAgICAgICAgYXVkaW9DbGlwOiAnY2MuQXVkaW9DbGlwJyxcclxuICAgICAgICAgICAgcHJlZmFiOiAnY2MuUHJlZmFiJyxcclxuICAgICAgICAgICAgZm9udDogJ2NjLkZvbnQnLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIGhpbnRzW3Byb3BlcnR5VHlwZV07XHJcbiAgICB9XHJcblxyXG4gICAgLyoqIEV4dHJhY3QgY29tcGFjdCBwcm9wZXJ0aWVzOiBvbmx5IHZpc2libGUsIG5vbi1pbnRlcm5hbCwgbm9uLWRlZmF1bHQgZmllbGRzLiAqL1xyXG4gICAgcHJpdmF0ZSBleHRyYWN0UHJvcGVydGllcyhjb21wOiBhbnksIHZlcmJvc2U6IGJvb2xlYW4gPSBmYWxzZSk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG4gICAgICAgIGNvbnN0IHNvdXJjZSA9IGNvbXAudmFsdWUgfHwgY29tcDtcclxuICAgICAgICBjb25zdCBza2lwS2V5cyA9IG5ldyBTZXQoW1xyXG4gICAgICAgICAgICAnX190eXBlX18nLCAndHlwZScsICdjaWQnLCAnX25hbWUnLCAnX29iakZsYWdzJywgJ25vZGUnLCAnX19wcmVmYWInLCAnZmlsZUlkJyxcclxuICAgICAgICAgICAgJ3V1aWQnLCAnbmFtZScsICdlbmFibGVkJywgJ19lbmFibGVkJywgJ19fc2NyaXB0QXNzZXQnLFxyXG4gICAgICAgIF0pO1xyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIG1ldGFdIG9mIE9iamVjdC5lbnRyaWVzKHNvdXJjZSkpIHtcclxuICAgICAgICAgICAgaWYgKHNraXBLZXlzLmhhcyhrZXkpKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKGtleS5zdGFydHNXaXRoKCdfJykpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ2VkaXRvcicpKSBjb250aW51ZTsgLy8gc2tpcCBlZGl0b3Itb25seSBkaXNwbGF5IGR1cGxpY2F0ZXNcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG0gPSBtZXRhIGFzIGFueTtcclxuICAgICAgICAgICAgaWYgKCFtIHx8IHR5cGVvZiBtICE9PSAnb2JqZWN0JykgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChtLnZpc2libGUgPT09IGZhbHNlKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKCF2ZXJib3NlICYmIG0ucmVhZG9ubHkgPT09IHRydWUpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoIXZlcmJvc2UgJiYgJ3ZhbHVlJyBpbiBtICYmICdkZWZhdWx0JyBpbiBtICYmIHRoaXMudmFsdWVFcXVhbHMobS52YWx1ZSwgbS5kZWZhdWx0KSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBpZiAoJ3ZhbHVlJyBpbiBtKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IG0udmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIHZhbHVlRXF1YWxzKGE6IGFueSwgYjogYW55KTogYm9vbGVhbiB7XHJcbiAgICAgICAgaWYgKGEgPT09IGIpIHJldHVybiB0cnVlO1xyXG4gICAgICAgIGlmIChhID09IG51bGwgfHwgYiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBhICE9PSB0eXBlb2YgYikgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmICh0eXBlb2YgYSAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcclxuICAgICAgICBjb25zdCBrYSA9IE9iamVjdC5rZXlzKGEpO1xyXG4gICAgICAgIGNvbnN0IGtiID0gT2JqZWN0LmtleXMoYik7XHJcbiAgICAgICAgaWYgKGthLmxlbmd0aCAhPT0ga2IubGVuZ3RoKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIGthLmV2ZXJ5KGsgPT4gdGhpcy52YWx1ZUVxdWFscyhhW2tdLCBiW2tdKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkZWxheShtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==