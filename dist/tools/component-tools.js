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
        try {
            await Editor.Message.request('scene', 'create-component', {
                uuid: nodeUuid,
                component: componentType,
            });
            // Wait for editor to process
            await this.delay(100);
            return {
                success: true,
                message: `Added ${componentType} to node ${nodeUuid}`,
            };
        }
        catch (_a) {
            // Fallback: scene script
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'addComponentToNode',
                    args: [nodeUuid, componentType],
                });
                return result || { success: false, error: 'Failed to add component' };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
        }
    }
    async removeComponent(nodeUuid, componentType) {
        try {
            await Editor.Message.request('scene', 'remove-component', {
                uuid: nodeUuid,
                component: componentType,
            });
            return {
                success: true,
                message: `Removed ${componentType} from node ${nodeUuid}`,
            };
        }
        catch (_a) {
            try {
                const result = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'removeComponentFromNode',
                    args: [nodeUuid, componentType],
                });
                return result || { success: false, error: 'Failed to remove component' };
            }
            catch (err) {
                return { success: false, error: err.message };
            }
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
                // Return compact type list only
                const types = comps.map((c) => {
                    var _a, _b, _c;
                    return ({
                        type: c.type || c.__type__ || c.cid || 'unknown',
                        enabled: (_c = (_b = (_a = c.enabled) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : c.enabled) !== null && _c !== void 0 ? _c : true,
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
    async resetComponent(nodeUuid, componentType) {
        try {
            const compIndex = await this.findComponentIndex(nodeUuid, componentType);
            if (typeof compIndex === 'object')
                return compIndex;
            await Editor.Message.request('scene', 'reset-component', {
                uuid: nodeUuid,
                index: compIndex,
            });
            return { success: true, message: `Reset ${componentType} on node ${nodeUuid}` };
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
            case 'integer':
            case 'float':
            case 'string':
            case 'boolean':
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQztBQUU3QyxNQUFhLGNBQWM7SUFFdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsS0FBSztnQkFDWCxXQUFXLEVBQUUsMkJBQTJCO2dCQUN4QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7d0JBQzVCLGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdDQUF3QyxFQUFFO3FCQUMzRjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLDBEQUEwRDtnQkFDdkUsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO3dCQUM1QixhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRTtxQkFDMUU7b0JBQ0QsUUFBUSxFQUFFLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQztpQkFDMUM7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSwwRUFBMEU7Z0JBQ3ZGLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDNUIsYUFBYSxFQUFF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Q0FBQyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUM7WUFDMUIsQ0FBQztRQUNMLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRU8sV0FBVyxDQUFDLENBQU0sRUFBRSxDQUFNO1FBQzlCLElBQUksQ0FBQyxLQUFLLENBQUM7WUFBRSxPQUFPLElBQUksQ0FBQztRQUN6QixJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUk7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUN6QyxJQUFJLE9BQU8sQ0FBQyxLQUFLLE9BQU8sQ0FBQztZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ3hDLElBQUksT0FBTyxDQUFDLEtBQUssUUFBUTtZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ3hDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixJQUFJLEVBQUUsQ0FBQyxNQUFNLEtBQUssRUFBRSxDQUFDLE1BQU07WUFBRSxPQUFPLEtBQUssQ0FBQztRQUMxQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFTyxLQUFLLENBQUMsRUFBVTtRQUNwQixPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzNELENBQUM7Q0FDSjtBQW5pQkQsd0NBbWlCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcclxuXHJcbmNvbnN0IEVYVEVOU0lPTl9OQU1FID0gJ2NvY29zLW1jcC1leHRlbnNpb24nO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbXBvbmVudFRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcclxuXHJcbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcclxuICAgICAgICByZXR1cm4gW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnYWRkJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWRkIGEgY29tcG9uZW50IHRvIGEgbm9kZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdlLmcuIGNjLlNwcml0ZSwgY2MuTGFiZWwsIGNjLlJpZ2lkQm9keScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZW1vdmUnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZW1vdmUgYSBjb21wb25lbnQgZnJvbSBhIG5vZGUgKHVzZXMgY29tcG9uZW50IHR5cGUvY2lkKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSBvciBjaWQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncXVlcnknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdRdWVyeSBjb21wb25lbnRzIG9uIGEgbm9kZS4gV2l0aG91dCBjb21wb25lbnRUeXBlIHJldHVybnMgdHlwZSBsaXN0IG9ubHknLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU3BlY2lmaWMgY29tcG9uZW50IHR5cGUgZm9yIGRldGFpbGVkIGluZm8nIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZlcmJvc2U6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ0luY2x1ZGUgcmVhZG9ubHkgcHJvcHMgYW5kIGRlZmF1bHQgdmFsdWVzJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdzZXRfcHJvcGVydHknLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTZXQgb25lIG9yIG11bHRpcGxlIGNvbXBvbmVudCBwcm9wZXJ0aWVzIGF0IG9uY2UuIFVzZSBcInByb3BlcnRpZXNcIiBhcnJheSBmb3IgYmF0Y2gsIG9yIHNpbmdsZSBcInByb3BlcnR5XCIrXCJwcm9wZXJ0eVR5cGVcIitcInZhbHVlXCInLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IGNvbXBvbmVudCB0eXBlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0eTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTaW5nbGUgbW9kZTogcHJvcGVydHkgbmFtZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NpbmdsZSBtb2RlIHR5cGUgaGludDogc3RyaW5nLCBudW1iZXIsIGJvb2xlYW4sIGNvbG9yLCB2ZWMyLCB2ZWMzLCBzaXplLCBub2RlLCBzcHJpdGVGcmFtZSwgYXNzZXQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IGRlc2NyaXB0aW9uOiAnU2luZ2xlIG1vZGU6IHByb3BlcnR5IHZhbHVlJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdCYXRjaCBtb2RlOiBbe3Byb3BlcnR5LCBwcm9wZXJ0eVR5cGUsIHZhbHVlfSwgLi4uXScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7fSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3Byb3BlcnR5JywgJ3Byb3BlcnR5VHlwZScsICd2YWx1ZSddLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdyZXNldCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Jlc2V0IGEgY29tcG9uZW50IHRvIGl0cyBkZWZhdWx0IHZhbHVlcycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSB0byByZXNldCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsaXN0X3R5cGVzJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTGlzdCBhbGwgYXZhaWxhYmxlIGNvbXBvbmVudCB0eXBlcy4gVXNlIGZpbHRlciB0byBuYXJyb3cgcmVzdWx0cyAoZS5nLiBcIlVJXCIsIFwiU3ByaXRlXCIsIFwiUGh5c2ljc1wiKScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1N1YnN0cmluZyBmaWx0ZXIgZm9yIGNsYXNzIG5hbWVzIChjYXNlLWluc2Vuc2l0aXZlKScgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5X2RldGFpbCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IGEgc2luZ2xlIGNvbXBvbmVudCBieSBpdHMgVVVJRCAoZnJvbSBxdWVyeS1ub2RlIHJlc3VsdHMpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRVdWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCBVVUlEJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnY29tcG9uZW50VXVpZCddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ2V4ZWN1dGVfbWV0aG9kJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRXhlY3V0ZSBhIG1ldGhvZCBvbiBhIGNvbXBvbmVudCBhdCBydW50aW1lJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05vZGUgVVVJRCcgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdDb21wb25lbnQgdHlwZSwgZS5nLiBjYy5TcHJpdGUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdNZXRob2QgbmFtZSB0byBjYWxsJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiB7IHR5cGU6ICdhcnJheScsIGRlc2NyaXB0aW9uOiAnQXJndW1lbnRzIHRvIHBhc3MgdG8gdGhlIG1ldGhvZCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnLCAnY29tcG9uZW50VHlwZScsICdtZXRob2QnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdsaXN0X2FsbCcsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIHJlZ2lzdGVyZWQgY29tcG9uZW50cyB3aXRoIGRldGFpbHMuIFVzZSBmaWx0ZXIgdG8gbmFycm93IHJlc3VsdHMnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTdWJzdHJpbmcgZmlsdGVyIGZvciBjb21wb25lbnQgbmFtZXMgKGNhc2UtaW5zZW5zaXRpdmUpJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgIF07XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZXhlY3V0ZSh0b29sTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHN3aXRjaCAodG9vbE5hbWUpIHtcclxuICAgICAgICAgICAgY2FzZSAnYWRkJzogcmV0dXJuIHRoaXMuYWRkQ29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3JlbW92ZSc6IHJldHVybiB0aGlzLnJlbW92ZUNvbXBvbmVudChhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBjYXNlICdxdWVyeSc6IHJldHVybiB0aGlzLnF1ZXJ5Q29tcG9uZW50cyhhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUsICEhYXJncy52ZXJib3NlKTtcclxuICAgICAgICAgICAgY2FzZSAnc2V0X3Byb3BlcnR5JzogcmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3Jlc2V0JzogcmV0dXJuIHRoaXMucmVzZXRDb21wb25lbnQoYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgY2FzZSAnbGlzdF90eXBlcyc6IHJldHVybiB0aGlzLmxpc3RUeXBlcyhhcmdzLmZpbHRlcik7XHJcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X2RldGFpbCc6IHJldHVybiB0aGlzLnF1ZXJ5RGV0YWlsKGFyZ3MuY29tcG9uZW50VXVpZCk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2V4ZWN1dGVfbWV0aG9kJzogcmV0dXJuIHRoaXMuZXhlY3V0ZU1ldGhvZChhcmdzLnV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSwgYXJncy5tZXRob2QsIGFyZ3MuYXJncyk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2xpc3RfYWxsJzogcmV0dXJuIHRoaXMubGlzdEFsbChhcmdzLmZpbHRlcik7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gY29tcG9uZW50IHRvb2w6ICR7dG9vbE5hbWV9YCB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gVG9vbCBJbXBsZW1lbnRhdGlvbnMgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBhZGRDb21wb25lbnQobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50Jywge1xyXG4gICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICBjb21wb25lbnQ6IGNvbXBvbmVudFR5cGUsXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gV2FpdCBmb3IgZWRpdG9yIHRvIHByb2Nlc3NcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgxMDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQWRkZWQgJHtjb21wb25lbnRUeXBlfSB0byBub2RlICR7bm9kZVV1aWR9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHNjZW5lIHNjcmlwdFxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdhZGRDb21wb25lbnRUb05vZGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gYWRkIGNvbXBvbmVudCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlbW92ZUNvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3JlbW92ZS1jb21wb25lbnQnLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogY29tcG9uZW50VHlwZSxcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBSZW1vdmVkICR7Y29tcG9uZW50VHlwZX0gZnJvbSBub2RlICR7bm9kZVV1aWR9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAncmVtb3ZlQ29tcG9uZW50RnJvbU5vZGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gcmVtb3ZlIGNvbXBvbmVudCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5Q29tcG9uZW50cyhub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlPzogc3RyaW5nLCB2ZXJib3NlOiBib29sZWFuID0gZmFsc2UpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gbm9kZURhdGEuX19jb21wc19fIHx8IFtdO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFjb21wb25lbnRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBSZXR1cm4gY29tcGFjdCB0eXBlIGxpc3Qgb25seVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdHlwZXMgPSBjb21wcy5tYXAoKGM6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogYy5lbmFibGVkPy52YWx1ZSA/PyBjLmVuYWJsZWQgPz8gdHJ1ZSxcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbm9kZVV1aWQsIGNvbXBvbmVudHM6IHR5cGVzIH0gfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRmluZCBzcGVjaWZpYyBjb21wb25lbnQgYW5kIHJldHVybiBkZXRhaWxlZCBpbmZvXHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGNvbXBzLmZpbmQoKGM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdCA9IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHQgPT09IGNvbXBvbmVudFR5cGUgfHwgdC5pbmNsdWRlcyhjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gY29tcHMubWFwKChjOiBhbnkpID0+IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkKS5qb2luKCcsICcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kLiBBdmFpbGFibGU6ICR7YXZhaWxhYmxlfWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IHRoaXMuZXh0cmFjdFByb3BlcnRpZXModGFyZ2V0LCB2ZXJib3NlKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogdGFyZ2V0LnR5cGUgfHwgdGFyZ2V0Ll9fdHlwZV9fIHx8IHRhcmdldC5jaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdGFyZ2V0LmVuYWJsZWQ/LnZhbHVlID8/IHRhcmdldC5lbmFibGVkID8/IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldENvbXBvbmVudEluZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBkYXRhIHJldHVybmVkJyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydHkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBjb25zdCB7IG5vZGVVdWlkLCBjb21wb25lbnRUeXBlIH0gPSBhcmdzO1xyXG5cclxuICAgICAgICAvLyBCYXRjaCBtb2RlOiBwcm9wZXJ0aWVzIGFycmF5XHJcbiAgICAgICAgaWYgKGFyZ3MucHJvcGVydGllcyAmJiBBcnJheS5pc0FycmF5KGFyZ3MucHJvcGVydGllcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0UHJvcGVydHlCYXRjaChub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgYXJncy5wcm9wZXJ0aWVzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNpbmdsZSBtb2RlIChiYWNrd2FyZCBjb21wYXRpYmxlKVxyXG4gICAgICAgIGNvbnN0IHsgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUgfSA9IGFyZ3M7XHJcbiAgICAgICAgaWYgKCFwcm9wZXJ0eSB8fCAhcHJvcGVydHlUeXBlIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJvdmlkZSBcInByb3BlcnR5XCIrXCJwcm9wZXJ0eVR5cGVcIitcInZhbHVlXCIgb3IgXCJwcm9wZXJ0aWVzXCIgYXJyYXknIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5zZXRPbmVQcm9wZXJ0eShub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydHlCYXRjaChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnRpZXM6IGFueVtdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICAvLyBRdWVyeSBub2RlIG9uY2UgZm9yIGFsbCBwcm9wZXJ0aWVzXHJcbiAgICAgICAgY29uc3QgY29tcEluZGV4ID0gYXdhaXQgdGhpcy5maW5kQ29tcG9uZW50SW5kZXgobm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgIGlmICh0eXBlb2YgY29tcEluZGV4ID09PSAnb2JqZWN0JykgcmV0dXJuIGNvbXBJbmRleDsgLy8gZXJyb3IgcmVzcG9uc2VcclxuXHJcbiAgICAgICAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBwcm9wZXJ0aWVzKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke2NvbXBJbmRleH0uJHtpdGVtLnByb3BlcnR5fWA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkdW1wID0gdGhpcy5idWlsZER1bXAoaXRlbS5wcm9wZXJ0eVR5cGUsIGl0ZW0udmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcCxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZW0ucHJvcGVydHkpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goYCR7aXRlbS5wcm9wZXJ0eX06ICR7ZXJyLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMjAwKTtcclxuXHJcbiAgICAgICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiByZXN1bHRzLmxlbmd0aCA+IDAsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2V0OiBbJHtyZXN1bHRzLmpvaW4oJywgJyl9XWAgKyBgIEVycm9yczogWyR7ZXJyb3JzLmpvaW4oJzsgJyl9XWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQgJHtjb21wb25lbnRUeXBlfTogWyR7cmVzdWx0cy5qb2luKCcsICcpfV1gIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRPbmVQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcsIHByb3BlcnR5VHlwZTogc3RyaW5nLCB2YWx1ZTogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb21wSW5kZXggPSBhd2FpdCB0aGlzLmZpbmRDb21wb25lbnRJbmRleChub2RlVXVpZCwgY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29tcEluZGV4ID09PSAnb2JqZWN0JykgcmV0dXJuIGNvbXBJbmRleDsgLy8gZXJyb3IgcmVzcG9uc2VcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgX19jb21wc19fLiR7Y29tcEluZGV4fS4ke3Byb3BlcnR5fWA7XHJcbiAgICAgICAgICAgIGNvbnN0IGR1bXAgPSB0aGlzLmJ1aWxkRHVtcChwcm9wZXJ0eVR5cGUsIHZhbHVlKTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgcGF0aCxcclxuICAgICAgICAgICAgICAgIGR1bXAsXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyMDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFNldCAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9ID0gJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAvLyBGYWxsYmFjazogc2NlbmUgc2NyaXB0XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ3NldENvbXBvbmVudFByb3BlcnR5JyxcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCB2YWx1ZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gc2V0IHByb3BlcnR5JyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZmluZENvbXBvbmVudEluZGV4KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgVG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3Qgbm9kZURhdGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XHJcbiAgICAgICAgaWYgKCFub2RlRGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb21wcyA9IG5vZGVEYXRhLl9fY29tcHNfXyB8fCBbXTtcclxuICAgICAgICBjb25zdCBjb21wSW5kZXggPSBjb21wcy5maW5kSW5kZXgoKGM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0ID0gYy50eXBlIHx8IGMuX190eXBlX18gfHwgYy5jaWQgfHwgJyc7XHJcbiAgICAgICAgICAgIHJldHVybiB0ID09PSBjb21wb25lbnRUeXBlIHx8IHQuaW5jbHVkZXMoY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmIChjb21wSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IGNvbXBzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCkuam9pbignLCAnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kLiBBdmFpbGFibGU6ICR7YXZhaWxhYmxlfWAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb21wSW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldENvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBJbmRleCA9IGF3YWl0IHRoaXMuZmluZENvbXBvbmVudEluZGV4KG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb21wSW5kZXggPT09ICdvYmplY3QnKSByZXR1cm4gY29tcEluZGV4O1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncmVzZXQtY29tcG9uZW50Jywge1xyXG4gICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICBpbmRleDogY29tcEluZGV4LFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFJlc2V0ICR7Y29tcG9uZW50VHlwZX0gb24gbm9kZSAke25vZGVVdWlkfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbGlzdFR5cGVzKGZpbHRlcj86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2xhc3NlczogYW55W10gPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdzY2VuZScsICdxdWVyeS1jbGFzc2VzJyk7XHJcbiAgICAgICAgICAgIGlmICghZmlsdGVyKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBXaXRob3V0IGZpbHRlciwgcmV0dXJuIG5hbWVzIG9ubHkgKG5vIG1ldGFkYXRhKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogY2xhc3Nlcy5tYXAoKGM6IGFueSkgPT4gYy5uYW1lIHx8IGMpIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgbG93ZXJGaWx0ZXIgPSBmaWx0ZXIudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgY29uc3QgZmlsdGVyZWQgPSBjbGFzc2VzXHJcbiAgICAgICAgICAgICAgICAubWFwKChjOiBhbnkpID0+IGMubmFtZSB8fCBjKVxyXG4gICAgICAgICAgICAgICAgLmZpbHRlcigobmFtZTogc3RyaW5nKSA9PiBuYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJGaWx0ZXIpKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogZmlsdGVyZWQgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlEZXRhaWwoY29tcG9uZW50VXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWNvbXBvbmVudCcsIGNvbXBvbmVudFV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIXJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IG5vdCBmb3VuZDogJHtjb21wb25lbnRVdWlkfWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBSZXR1cm4gY29tcGFjdCB2ZXJzaW9uIGluc3RlYWQgb2YgcmF3IGR1bXBcclxuICAgICAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IHRoaXMuZXh0cmFjdFByb3BlcnRpZXMocmVzdWx0KTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogcmVzdWx0LnR5cGUgfHwgcmVzdWx0Ll9fdHlwZV9fIHx8IHJlc3VsdC5jaWQgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHJlc3VsdC5lbmFibGVkPy52YWx1ZSA/PyByZXN1bHQuZW5hYmxlZCA/PyB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlTWV0aG9kKHV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBtZXRob2Q6IHN0cmluZywgYXJncz86IGFueVtdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb21wSW5kZXggPSBhd2FpdCB0aGlzLmZpbmRDb21wb25lbnRJbmRleCh1dWlkLCBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb21wSW5kZXggPT09ICdvYmplY3QnKSByZXR1cm4gY29tcEluZGV4O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdzY2VuZScsICdleGVjdXRlLWNvbXBvbmVudC1tZXRob2QnLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkLFxyXG4gICAgICAgICAgICAgICAgaW5kZXg6IGNvbXBJbmRleCxcclxuICAgICAgICAgICAgICAgIG5hbWU6IG1ldGhvZCxcclxuICAgICAgICAgICAgICAgIGFyZ3M6IGFyZ3MgfHwgW10sXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXN1bHQsIG1lc3NhZ2U6IGBFeGVjdXRlZCAke2NvbXBvbmVudFR5cGV9LiR7bWV0aG9kfSgpYCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBsaXN0QWxsKGZpbHRlcj86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50czogYW55W10gPSBhd2FpdCAoRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCBhcyBhbnkpKCdzY2VuZScsICdxdWVyeS1jb21wb25lbnRzJyk7XHJcbiAgICAgICAgICAgIC8vIEV4dHJhY3QgY29tcGFjdCBpbmZvOiBuYW1lLCBjaWQgb25seVxyXG4gICAgICAgICAgICBsZXQgcmVzdWx0cyA9IChjb21wb25lbnRzIHx8IFtdKS5tYXAoKGM6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgIG5hbWU6IGMubmFtZSB8fCBjLmNpZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICBjaWQ6IGMuY2lkLFxyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgIGlmIChmaWx0ZXIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvd2VyRmlsdGVyID0gZmlsdGVyLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gcmVzdWx0cy5maWx0ZXIoKGM6IGFueSkgPT4gYy5uYW1lLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMobG93ZXJGaWx0ZXIpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXN1bHRzIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSGVscGVycyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGJ1aWxkRHVtcChwcm9wZXJ0eVR5cGU6IHN0cmluZywgdmFsdWU6IGFueSk6IGFueSB7XHJcbiAgICAgICAgc3dpdGNoIChwcm9wZXJ0eVR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSAnY29sb3InOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByOiB2YWx1ZS5yID8/IDI1NSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZzogdmFsdWUuZyA/PyAyNTUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGI6IHZhbHVlLmIgPz8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhOiB2YWx1ZS5hID8/IDI1NSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Db2xvcicsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAndmVjMic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHg6IHZhbHVlLnggPz8gMCwgeTogdmFsdWUueSA/PyAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlZlYzInLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3ZlYzMnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyB4OiB2YWx1ZS54ID8/IDAsIHk6IHZhbHVlLnkgPz8gMCwgejogdmFsdWUueiA/PyAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlZlYzMnLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3NpemUnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyB3aWR0aDogdmFsdWUud2lkdGggPz8gMCwgaGVpZ2h0OiB2YWx1ZS5oZWlnaHQgPz8gMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5TaXplJyxcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICdub2RlJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB7IHV1aWQ6IHZhbHVlIH0sIHR5cGU6ICdjYy5Ob2RlJyB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAnc3ByaXRlRnJhbWUnOlxyXG4gICAgICAgICAgICBjYXNlICdhc3NldCc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogeyB1dWlkOiB2YWx1ZSB9LCB0eXBlOiB0aGlzLmdldEFzc2V0VHlwZUhpbnQocHJvcGVydHlUeXBlKSB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcclxuICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XHJcbiAgICAgICAgICAgIGNhc2UgJ2Zsb2F0JzpcclxuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcclxuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldEFzc2V0VHlwZUhpbnQocHJvcGVydHlUeXBlOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIGNvbnN0IGhpbnRzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgICAgICBzcHJpdGVGcmFtZTogJ2NjLlNwcml0ZUZyYW1lJyxcclxuICAgICAgICAgICAgbWF0ZXJpYWw6ICdjYy5NYXRlcmlhbCcsXHJcbiAgICAgICAgICAgIHRleHR1cmU6ICdjYy5UZXh0dXJlMkQnLFxyXG4gICAgICAgICAgICBhdWRpb0NsaXA6ICdjYy5BdWRpb0NsaXAnLFxyXG4gICAgICAgICAgICBwcmVmYWI6ICdjYy5QcmVmYWInLFxyXG4gICAgICAgICAgICBmb250OiAnY2MuRm9udCcsXHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gaGludHNbcHJvcGVydHlUeXBlXTtcclxuICAgIH1cclxuXHJcbiAgICAvKiogRXh0cmFjdCBjb21wYWN0IHByb3BlcnRpZXM6IG9ubHkgdmlzaWJsZSwgbm9uLWludGVybmFsLCBub24tZGVmYXVsdCBmaWVsZHMuICovXHJcbiAgICBwcml2YXRlIGV4dHJhY3RQcm9wZXJ0aWVzKGNvbXA6IGFueSwgdmVyYm9zZTogYm9vbGVhbiA9IGZhbHNlKTogUmVjb3JkPHN0cmluZywgYW55PiB7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0OiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XHJcbiAgICAgICAgY29uc3Qgc291cmNlID0gY29tcC52YWx1ZSB8fCBjb21wO1xyXG4gICAgICAgIGNvbnN0IHNraXBLZXlzID0gbmV3IFNldChbXHJcbiAgICAgICAgICAgICdfX3R5cGVfXycsICd0eXBlJywgJ2NpZCcsICdfbmFtZScsICdfb2JqRmxhZ3MnLCAnbm9kZScsICdfX3ByZWZhYicsICdmaWxlSWQnLFxyXG4gICAgICAgICAgICAndXVpZCcsICduYW1lJywgJ2VuYWJsZWQnLCAnX2VuYWJsZWQnLCAnX19zY3JpcHRBc3NldCcsXHJcbiAgICAgICAgXSk7XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgbWV0YV0gb2YgT2JqZWN0LmVudHJpZXMoc291cmNlKSkge1xyXG4gICAgICAgICAgICBpZiAoc2tpcEtleXMuaGFzKGtleSkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ18nKSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnZWRpdG9yJykpIGNvbnRpbnVlOyAvLyBza2lwIGVkaXRvci1vbmx5IGRpc3BsYXkgZHVwbGljYXRlc1xyXG5cclxuICAgICAgICAgICAgY29uc3QgbSA9IG1ldGEgYXMgYW55O1xyXG4gICAgICAgICAgICBpZiAoIW0gfHwgdHlwZW9mIG0gIT09ICdvYmplY3QnKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKG0udmlzaWJsZSA9PT0gZmFsc2UpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoIXZlcmJvc2UgJiYgbS5yZWFkb25seSA9PT0gdHJ1ZSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmICghdmVyYm9zZSAmJiAndmFsdWUnIGluIG0gJiYgJ2RlZmF1bHQnIGluIG0gJiYgdGhpcy52YWx1ZUVxdWFscyhtLnZhbHVlLCBtLmRlZmF1bHQpKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgICAgIGlmICgndmFsdWUnIGluIG0pIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gbS52YWx1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgdmFsdWVFcXVhbHMoYTogYW55LCBiOiBhbnkpOiBib29sZWFuIHtcclxuICAgICAgICBpZiAoYSA9PT0gYikgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgaWYgKGEgPT0gbnVsbCB8fCBiID09IG51bGwpIHJldHVybiBmYWxzZTtcclxuICAgICAgICBpZiAodHlwZW9mIGEgIT09IHR5cGVvZiBiKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBhICE9PSAnb2JqZWN0JykgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGNvbnN0IGthID0gT2JqZWN0LmtleXMoYSk7XHJcbiAgICAgICAgY29uc3Qga2IgPSBPYmplY3Qua2V5cyhiKTtcclxuICAgICAgICBpZiAoa2EubGVuZ3RoICE9PSBrYi5sZW5ndGgpIHJldHVybiBmYWxzZTtcclxuICAgICAgICByZXR1cm4ga2EuZXZlcnkoayA9PiB0aGlzLnZhbHVlRXF1YWxzKGFba10sIGJba10pKTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGRlbGF5KG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgICB9XHJcbn1cclxuIl19