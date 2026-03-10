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
                description: 'List all available component types that can be added to nodes',
                inputSchema: { type: 'object', properties: {} },
            },
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'add': return this.addComponent(args.nodeUuid, args.componentType);
            case 'remove': return this.removeComponent(args.nodeUuid, args.componentType);
            case 'query': return this.queryComponents(args.nodeUuid, args.componentType);
            case 'set_property': return this.setProperty(args);
            case 'reset': return this.resetComponent(args.nodeUuid, args.componentType);
            case 'list_types': return this.listTypes();
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
    async queryComponents(nodeUuid, componentType) {
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
            const properties = this.extractProperties(target);
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
    async listTypes() {
        try {
            const classes = await Editor.Message.request('scene', 'query-classes');
            return { success: true, data: classes };
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
    extractProperties(comp) {
        const result = {};
        const skipKeys = new Set(['__type__', 'type', 'cid', '_name', '_objFlags', 'node', '__prefab', 'fileId']);
        for (const [key, val] of Object.entries(comp)) {
            if (skipKeys.has(key))
                continue;
            if (key.startsWith('_') && key !== '_enabled')
                continue;
            if (val && typeof val === 'object' && 'value' in val) {
                result[key] = val.value;
            }
            else {
                result[key] = val;
            }
        }
        return result;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.ComponentTools = ComponentTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQztBQUU3QyxNQUFhLGNBQWM7SUFFdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsS0FBSztnQkFDWCxXQUFXLEVBQUUsMkJBQTJCO2dCQUN4QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7d0JBQzVCLGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdDQUF3QyxFQUFFO3FCQUMzRjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLDBEQUEwRDtnQkFDdkUsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO3dCQUM1QixhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRTtxQkFDMUU7b0JBQ0QsUUFBUSxFQUFFLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQztpQkFDMUM7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSwwRUFBMEU7Z0JBQ3ZGLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDNUIsYUFBYSxFQUFF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QUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM1QyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO2dCQUFFLFNBQVM7WUFDaEMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxVQUFVO2dCQUFFLFNBQVM7WUFFeEQsSUFBSSxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLE9BQU8sSUFBSyxHQUFXLEVBQUUsQ0FBQztnQkFDNUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFJLEdBQVcsQ0FBQyxLQUFLLENBQUM7WUFDckMsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDdEIsQ0FBQztRQUNMLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRU8sS0FBSyxDQUFDLEVBQVU7UUFDcEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0NBQ0o7QUFsYUQsd0NBa2FDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuY29uc3QgRVhURU5TSU9OX05BTUUgPSAnY29jb3MtbWNwLWV4dGVuc2lvbic7XHJcblxyXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50VG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdhZGQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBZGQgYSBjb21wb25lbnQgdG8gYSBub2RlJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ2UuZy4gY2MuU3ByaXRlLCBjYy5MYWJlbCwgY2MuUmlnaWRCb2R5JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZSddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlbW92ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlbW92ZSBhIGNvbXBvbmVudCBmcm9tIGEgbm9kZSAodXNlcyBjb21wb25lbnQgdHlwZS9jaWQpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIG9yIGNpZCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IGNvbXBvbmVudHMgb24gYSBub2RlLiBXaXRob3V0IGNvbXBvbmVudFR5cGUgcmV0dXJucyB0eXBlIGxpc3Qgb25seScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTcGVjaWZpYyBjb21wb25lbnQgdHlwZSBmb3IgZGV0YWlsZWQgaW5mbycgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2V0X3Byb3BlcnR5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2V0IG9uZSBvciBtdWx0aXBsZSBjb21wb25lbnQgcHJvcGVydGllcyBhdCBvbmNlLiBVc2UgXCJwcm9wZXJ0aWVzXCIgYXJyYXkgZm9yIGJhdGNoLCBvciBzaW5nbGUgXCJwcm9wZXJ0eVwiK1wicHJvcGVydHlUeXBlXCIrXCJ2YWx1ZVwiJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RhcmdldCBjb21wb25lbnQgdHlwZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU2luZ2xlIG1vZGU6IHByb3BlcnR5IG5hbWUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTaW5nbGUgbW9kZSB0eXBlIGhpbnQ6IHN0cmluZywgbnVtYmVyLCBib29sZWFuLCBjb2xvciwgdmVjMiwgdmVjMywgc2l6ZSwgbm9kZSwgc3ByaXRlRnJhbWUsIGFzc2V0JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyBkZXNjcmlwdGlvbjogJ1NpbmdsZSBtb2RlOiBwcm9wZXJ0eSB2YWx1ZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQmF0Y2ggbW9kZTogW3twcm9wZXJ0eSwgcHJvcGVydHlUeXBlLCB2YWx1ZX0sIC4uLl0nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5OiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnR5VHlwZTogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZToge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydwcm9wZXJ0eScsICdwcm9wZXJ0eVR5cGUnLCAndmFsdWUnXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAncmVzZXQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZXNldCBhIGNvbXBvbmVudCB0byBpdHMgZGVmYXVsdCB2YWx1ZXMnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiB7IHR5cGU6ICdzdHJpbmcnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnQ29tcG9uZW50IHR5cGUgdG8gcmVzZXQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnbGlzdF90eXBlcycsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYWxsIGF2YWlsYWJsZSBjb21wb25lbnQgdHlwZXMgdGhhdCBjYW4gYmUgYWRkZWQgdG8gbm9kZXMnLFxyXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHsgdHlwZTogJ29iamVjdCcsIHByb3BlcnRpZXM6IHt9IH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdhZGQnOiByZXR1cm4gdGhpcy5hZGRDb21wb25lbnQoYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgY2FzZSAncmVtb3ZlJzogcmV0dXJuIHRoaXMucmVtb3ZlQ29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5JzogcmV0dXJuIHRoaXMucXVlcnlDb21wb25lbnRzKGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NldF9wcm9wZXJ0eSc6IHJldHVybiB0aGlzLnNldFByb3BlcnR5KGFyZ3MpO1xyXG4gICAgICAgICAgICBjYXNlICdyZXNldCc6IHJldHVybiB0aGlzLnJlc2V0Q29tcG9uZW50KGFyZ3Mubm9kZVV1aWQsIGFyZ3MuY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ2xpc3RfdHlwZXMnOiByZXR1cm4gdGhpcy5saXN0VHlwZXMoKTtcclxuICAgICAgICAgICAgZGVmYXVsdDogcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgVW5rbm93biBjb21wb25lbnQgdG9vbDogJHt0b29sTmFtZX1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vID09PSBUb29sIEltcGxlbWVudGF0aW9ucyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIGFkZENvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1jb21wb25lbnQnLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogY29tcG9uZW50VHlwZSxcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBXYWl0IGZvciBlZGl0b3IgdG8gcHJvY2Vzc1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLmRlbGF5KDEwMCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBZGRlZCAke2NvbXBvbmVudFR5cGV9IHRvIG5vZGUgJHtub2RlVXVpZH1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAvLyBGYWxsYmFjazogc2NlbmUgc2NyaXB0XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2FkZENvbXBvbmVudFRvTm9kZScsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21wb25lbnRUeXBlXSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBhZGQgY29tcG9uZW50JyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVtb3ZlQ29tcG9uZW50KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncmVtb3ZlLWNvbXBvbmVudCcsIHtcclxuICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgY29tcG9uZW50OiBjb21wb25lbnRUeXBlLFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFJlbW92ZWQgJHtjb21wb25lbnRUeXBlfSBmcm9tIG5vZGUgJHtub2RlVXVpZH1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdyZW1vdmVDb21wb25lbnRGcm9tTm9kZScsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21wb25lbnRUeXBlXSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byByZW1vdmUgY29tcG9uZW50JyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcXVlcnlDb21wb25lbnRzKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVEYXRhOiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICBpZiAoIW5vZGVEYXRhKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBzID0gbm9kZURhdGEuX19jb21wc19fIHx8IFtdO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFjb21wb25lbnRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBSZXR1cm4gY29tcGFjdCB0eXBlIGxpc3Qgb25seVxyXG4gICAgICAgICAgICAgICAgY29uc3QgdHlwZXMgPSBjb21wcy5tYXAoKGM6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogYy5lbmFibGVkPy52YWx1ZSA/PyBjLmVuYWJsZWQgPz8gdHJ1ZSxcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbm9kZVV1aWQsIGNvbXBvbmVudHM6IHR5cGVzIH0gfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRmluZCBzcGVjaWZpYyBjb21wb25lbnQgYW5kIHJldHVybiBkZXRhaWxlZCBpbmZvXHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGNvbXBzLmZpbmQoKGM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdCA9IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHQgPT09IGNvbXBvbmVudFR5cGUgfHwgdC5pbmNsdWRlcyhjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXZhaWxhYmxlID0gY29tcHMubWFwKChjOiBhbnkpID0+IGMudHlwZSB8fCBjLl9fdHlwZV9fIHx8IGMuY2lkKS5qb2luKCcsICcpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kLiBBdmFpbGFibGU6ICR7YXZhaWxhYmxlfWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgcHJvcGVydGllcyA9IHRoaXMuZXh0cmFjdFByb3BlcnRpZXModGFyZ2V0KTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogdGFyZ2V0LnR5cGUgfHwgdGFyZ2V0Ll9fdHlwZV9fIHx8IHRhcmdldC5jaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdGFyZ2V0LmVuYWJsZWQ/LnZhbHVlID8/IHRhcmdldC5lbmFibGVkID8/IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllcyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldENvbXBvbmVudEluZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBkYXRhIHJldHVybmVkJyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydHkoYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBjb25zdCB7IG5vZGVVdWlkLCBjb21wb25lbnRUeXBlIH0gPSBhcmdzO1xyXG5cclxuICAgICAgICAvLyBCYXRjaCBtb2RlOiBwcm9wZXJ0aWVzIGFycmF5XHJcbiAgICAgICAgaWYgKGFyZ3MucHJvcGVydGllcyAmJiBBcnJheS5pc0FycmF5KGFyZ3MucHJvcGVydGllcykpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0UHJvcGVydHlCYXRjaChub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgYXJncy5wcm9wZXJ0aWVzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNpbmdsZSBtb2RlIChiYWNrd2FyZCBjb21wYXRpYmxlKVxyXG4gICAgICAgIGNvbnN0IHsgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUgfSA9IGFyZ3M7XHJcbiAgICAgICAgaWYgKCFwcm9wZXJ0eSB8fCAhcHJvcGVydHlUeXBlIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUHJvdmlkZSBcInByb3BlcnR5XCIrXCJwcm9wZXJ0eVR5cGVcIitcInZhbHVlXCIgb3IgXCJwcm9wZXJ0aWVzXCIgYXJyYXknIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5zZXRPbmVQcm9wZXJ0eShub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgc2V0UHJvcGVydHlCYXRjaChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnRpZXM6IGFueVtdKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICAvLyBRdWVyeSBub2RlIG9uY2UgZm9yIGFsbCBwcm9wZXJ0aWVzXHJcbiAgICAgICAgY29uc3QgY29tcEluZGV4ID0gYXdhaXQgdGhpcy5maW5kQ29tcG9uZW50SW5kZXgobm9kZVV1aWQsIGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgIGlmICh0eXBlb2YgY29tcEluZGV4ID09PSAnb2JqZWN0JykgcmV0dXJuIGNvbXBJbmRleDsgLy8gZXJyb3IgcmVzcG9uc2VcclxuXHJcbiAgICAgICAgY29uc3QgcmVzdWx0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBwcm9wZXJ0aWVzKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke2NvbXBJbmRleH0uJHtpdGVtLnByb3BlcnR5fWA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkdW1wID0gdGhpcy5idWlsZER1bXAoaXRlbS5wcm9wZXJ0eVR5cGUsIGl0ZW0udmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnc2V0LXByb3BlcnR5Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZHVtcCxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZW0ucHJvcGVydHkpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgZXJyb3JzLnB1c2goYCR7aXRlbS5wcm9wZXJ0eX06ICR7ZXJyLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMjAwKTtcclxuXHJcbiAgICAgICAgaWYgKGVycm9ycy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiByZXN1bHRzLmxlbmd0aCA+IDAsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgU2V0OiBbJHtyZXN1bHRzLmpvaW4oJywgJyl9XWAgKyBgIEVycm9yczogWyR7ZXJyb3JzLmpvaW4oJzsgJyl9XWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQgJHtjb21wb25lbnRUeXBlfTogWyR7cmVzdWx0cy5qb2luKCcsICcpfV1gIH07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBzZXRPbmVQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcsIHByb3BlcnR5VHlwZTogc3RyaW5nLCB2YWx1ZTogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjb21wSW5kZXggPSBhd2FpdCB0aGlzLmZpbmRDb21wb25lbnRJbmRleChub2RlVXVpZCwgY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY29tcEluZGV4ID09PSAnb2JqZWN0JykgcmV0dXJuIGNvbXBJbmRleDsgLy8gZXJyb3IgcmVzcG9uc2VcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHBhdGggPSBgX19jb21wc19fLiR7Y29tcEluZGV4fS4ke3Byb3BlcnR5fWA7XHJcbiAgICAgICAgICAgIGNvbnN0IGR1bXAgPSB0aGlzLmJ1aWxkRHVtcChwcm9wZXJ0eVR5cGUsIHZhbHVlKTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHtcclxuICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgcGF0aCxcclxuICAgICAgICAgICAgICAgIGR1bXAsXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgyMDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFNldCAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9ID0gJHtKU09OLnN0cmluZ2lmeSh2YWx1ZSl9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAvLyBGYWxsYmFjazogc2NlbmUgc2NyaXB0XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQ6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IEVYVEVOU0lPTl9OQU1FLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ3NldENvbXBvbmVudFByb3BlcnR5JyxcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGUsIHByb3BlcnR5LCB2YWx1ZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gc2V0IHByb3BlcnR5JyB9O1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgZmluZENvbXBvbmVudEluZGV4KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyIHwgVG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3Qgbm9kZURhdGE6IGFueSA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCBub2RlVXVpZCk7XHJcbiAgICAgICAgaWYgKCFub2RlRGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBOb2RlIG5vdCBmb3VuZDogJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCBjb21wcyA9IG5vZGVEYXRhLl9fY29tcHNfXyB8fCBbXTtcclxuICAgICAgICBjb25zdCBjb21wSW5kZXggPSBjb21wcy5maW5kSW5kZXgoKGM6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB0ID0gYy50eXBlIHx8IGMuX190eXBlX18gfHwgYy5jaWQgfHwgJyc7XHJcbiAgICAgICAgICAgIHJldHVybiB0ID09PSBjb21wb25lbnRUeXBlIHx8IHQuaW5jbHVkZXMoY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGlmIChjb21wSW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IGNvbXBzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCkuam9pbignLCAnKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kLiBBdmFpbGFibGU6ICR7YXZhaWxhYmxlfWAgfTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjb21wSW5kZXg7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyByZXNldENvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXBJbmRleCA9IGF3YWl0IHRoaXMuZmluZENvbXBvbmVudEluZGV4KG5vZGVVdWlkLCBjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBjb21wSW5kZXggPT09ICdvYmplY3QnKSByZXR1cm4gY29tcEluZGV4O1xyXG5cclxuICAgICAgICAgICAgYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncmVzZXQtY29tcG9uZW50Jywge1xyXG4gICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICBpbmRleDogY29tcEluZGV4LFxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFJlc2V0ICR7Y29tcG9uZW50VHlwZX0gb24gbm9kZSAke25vZGVVdWlkfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgbGlzdFR5cGVzKCk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2xhc3NlczogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnc2NlbmUnLCAncXVlcnktY2xhc3NlcycpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBjbGFzc2VzIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnIubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSGVscGVycyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGJ1aWxkRHVtcChwcm9wZXJ0eVR5cGU6IHN0cmluZywgdmFsdWU6IGFueSk6IGFueSB7XHJcbiAgICAgICAgc3dpdGNoIChwcm9wZXJ0eVR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSAnY29sb3InOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByOiB2YWx1ZS5yID8/IDI1NSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZzogdmFsdWUuZyA/PyAyNTUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGI6IHZhbHVlLmIgPz8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhOiB2YWx1ZS5hID8/IDI1NSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Db2xvcicsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAndmVjMic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHg6IHZhbHVlLnggPz8gMCwgeTogdmFsdWUueSA/PyAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlZlYzInLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3ZlYzMnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyB4OiB2YWx1ZS54ID8/IDAsIHk6IHZhbHVlLnkgPz8gMCwgejogdmFsdWUueiA/PyAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlZlYzMnLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3NpemUnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyB3aWR0aDogdmFsdWUud2lkdGggPz8gMCwgaGVpZ2h0OiB2YWx1ZS5oZWlnaHQgPz8gMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5TaXplJyxcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICdub2RlJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB7IHV1aWQ6IHZhbHVlIH0sIHR5cGU6ICdjYy5Ob2RlJyB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAnc3ByaXRlRnJhbWUnOlxyXG4gICAgICAgICAgICBjYXNlICdhc3NldCc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogeyB1dWlkOiB2YWx1ZSB9LCB0eXBlOiB0aGlzLmdldEFzc2V0VHlwZUhpbnQocHJvcGVydHlUeXBlKSB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAnbnVtYmVyJzpcclxuICAgICAgICAgICAgY2FzZSAnaW50ZWdlcic6XHJcbiAgICAgICAgICAgIGNhc2UgJ2Zsb2F0JzpcclxuICAgICAgICAgICAgY2FzZSAnc3RyaW5nJzpcclxuICAgICAgICAgICAgY2FzZSAnYm9vbGVhbic6XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGdldEFzc2V0VHlwZUhpbnQocHJvcGVydHlUeXBlOiBzdHJpbmcpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gICAgICAgIGNvbnN0IGhpbnRzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgICAgICBzcHJpdGVGcmFtZTogJ2NjLlNwcml0ZUZyYW1lJyxcclxuICAgICAgICAgICAgbWF0ZXJpYWw6ICdjYy5NYXRlcmlhbCcsXHJcbiAgICAgICAgICAgIHRleHR1cmU6ICdjYy5UZXh0dXJlMkQnLFxyXG4gICAgICAgICAgICBhdWRpb0NsaXA6ICdjYy5BdWRpb0NsaXAnLFxyXG4gICAgICAgICAgICBwcmVmYWI6ICdjYy5QcmVmYWInLFxyXG4gICAgICAgICAgICBmb250OiAnY2MuRm9udCcsXHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gaGludHNbcHJvcGVydHlUeXBlXTtcclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGV4dHJhY3RQcm9wZXJ0aWVzKGNvbXA6IGFueSk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdDogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG4gICAgICAgIGNvbnN0IHNraXBLZXlzID0gbmV3IFNldChbJ19fdHlwZV9fJywgJ3R5cGUnLCAnY2lkJywgJ19uYW1lJywgJ19vYmpGbGFncycsICdub2RlJywgJ19fcHJlZmFiJywgJ2ZpbGVJZCddKTtcclxuXHJcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCB2YWxdIG9mIE9iamVjdC5lbnRyaWVzKGNvbXApKSB7XHJcbiAgICAgICAgICAgIGlmIChza2lwS2V5cy5oYXMoa2V5KSkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnXycpICYmIGtleSAhPT0gJ19lbmFibGVkJykgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICBpZiAodmFsICYmIHR5cGVvZiB2YWwgPT09ICdvYmplY3QnICYmICd2YWx1ZScgaW4gKHZhbCBhcyBhbnkpKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRba2V5XSA9ICh2YWwgYXMgYW55KS52YWx1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gdmFsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBkZWxheShtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xyXG4gICAgfVxyXG59XHJcbiJdfQ==