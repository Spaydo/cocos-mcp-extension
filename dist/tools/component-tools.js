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
                description: 'Set a component property value',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string' },
                        componentType: { type: 'string', description: 'Target component type' },
                        property: { type: 'string' },
                        propertyType: { type: 'string', description: 'Type hint: string, number, boolean, color, vec2, vec3, size, node, spriteFrame, asset' },
                        value: { description: 'Property value' },
                    },
                    required: ['nodeUuid', 'componentType', 'property', 'propertyType', 'value'],
                },
            },
        ];
    }
    async execute(toolName, args) {
        switch (toolName) {
            case 'add': return this.addComponent(args.nodeUuid, args.componentType);
            case 'remove': return this.removeComponent(args.nodeUuid, args.componentType);
            case 'query': return this.queryComponents(args.nodeUuid, args.componentType);
            case 'set_property': return this.setProperty(args);
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
        const { nodeUuid, componentType, property, propertyType, value } = args;
        try {
            // Step 1: Query node to find component index
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
            // Step 2: Build property path
            const path = `__comps__.${compIndex}.${property}`;
            // Step 3: Process value based on propertyType
            const dump = this.buildDump(propertyType, value);
            // Step 4: Set property
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
                return { value: { uuid: value } };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9uZW50LXRvb2xzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL2NvbXBvbmVudC10b29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFQSxNQUFNLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQztBQUU3QyxNQUFhLGNBQWM7SUFFdkIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsS0FBSztnQkFDWCxXQUFXLEVBQUUsMkJBQTJCO2dCQUN4QyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUU7d0JBQzVCLGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHdDQUF3QyxFQUFFO3FCQUMzRjtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsZUFBZSxDQUFDO2lCQUMxQzthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLDBEQUEwRDtnQkFDdkUsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFO3dCQUM1QixhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSx1QkFBdUIsRUFBRTtxQkFDMUU7b0JBQ0QsUUFBUSxFQUFFLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQztpQkFDMUM7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxPQUFPO2dCQUNiLFdBQVcsRUFBRSwwRUFBMEU7Z0JBQ3ZGLFdBQVcsRUFBRTtvQkFDVCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxVQUFVLEVBQUU7d0JBQ1IsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRTt3QkFDNUIsYUFBYSxFQUFF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VUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFMUcsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM1QyxJQUFJLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO2dCQUFFLFNBQVM7WUFDaEMsSUFBSSxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsS0FBSyxVQUFVO2dCQUFFLFNBQVM7WUFFeEQsSUFBSSxHQUFHLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLE9BQU8sSUFBSyxHQUFXLEVBQUUsQ0FBQztnQkFDNUQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFJLEdBQVcsQ0FBQyxLQUFLLENBQUM7WUFDckMsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7WUFDdEIsQ0FBQztRQUNMLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNsQixDQUFDO0lBRU8sS0FBSyxDQUFDLEVBQVU7UUFDcEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0NBQ0o7QUF2VEQsd0NBdVRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xyXG5cclxuY29uc3QgRVhURU5TSU9OX05BTUUgPSAnY29jb3MtbWNwLWV4dGVuc2lvbic7XHJcblxyXG5leHBvcnQgY2xhc3MgQ29tcG9uZW50VG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdhZGQnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBZGQgYSBjb21wb25lbnQgdG8gYSBub2RlJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ2UuZy4gY2MuU3ByaXRlLCBjYy5MYWJlbCwgY2MuUmlnaWRCb2R5JyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnbm9kZVV1aWQnLCAnY29tcG9uZW50VHlwZSddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlbW92ZScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlbW92ZSBhIGNvbXBvbmVudCBmcm9tIGEgbm9kZSAodXNlcyBjb21wb25lbnQgdHlwZS9jaWQpJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCB0eXBlIG9yIGNpZCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJywgJ2NvbXBvbmVudFR5cGUnXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdxdWVyeScsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1F1ZXJ5IGNvbXBvbmVudHMgb24gYSBub2RlLiBXaXRob3V0IGNvbXBvbmVudFR5cGUgcmV0dXJucyB0eXBlIGxpc3Qgb25seScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTcGVjaWZpYyBjb21wb25lbnQgdHlwZSBmb3IgZGV0YWlsZWQgaW5mbycgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVVdWlkJ10sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiAnc2V0X3Byb3BlcnR5JyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2V0IGEgY29tcG9uZW50IHByb3BlcnR5IHZhbHVlJyxcclxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogeyB0eXBlOiAnc3RyaW5nJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RhcmdldCBjb21wb25lbnQgdHlwZScgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHk6IHsgdHlwZTogJ3N0cmluZycgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydHlUeXBlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1R5cGUgaGludDogc3RyaW5nLCBudW1iZXIsIGJvb2xlYW4sIGNvbG9yLCB2ZWMyLCB2ZWMzLCBzaXplLCBub2RlLCBzcHJpdGVGcmFtZSwgYXNzZXQnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IGRlc2NyaXB0aW9uOiAnUHJvcGVydHkgdmFsdWUnIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWydub2RlVXVpZCcsICdjb21wb25lbnRUeXBlJywgJ3Byb3BlcnR5JywgJ3Byb3BlcnR5VHlwZScsICd2YWx1ZSddLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICBdO1xyXG4gICAgfVxyXG5cclxuICAgIGFzeW5jIGV4ZWN1dGUodG9vbE5hbWU6IHN0cmluZywgYXJnczogYW55KTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICBzd2l0Y2ggKHRvb2xOYW1lKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ2FkZCc6IHJldHVybiB0aGlzLmFkZENvbXBvbmVudChhcmdzLm5vZGVVdWlkLCBhcmdzLmNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBjYXNlICdyZW1vdmUnOiByZXR1cm4gdGhpcy5yZW1vdmVDb21wb25lbnQoYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgY2FzZSAncXVlcnknOiByZXR1cm4gdGhpcy5xdWVyeUNvbXBvbmVudHMoYXJncy5ub2RlVXVpZCwgYXJncy5jb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgY2FzZSAnc2V0X3Byb3BlcnR5JzogcmV0dXJuIHRoaXMuc2V0UHJvcGVydHkoYXJncyk7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYFVua25vd24gY29tcG9uZW50IHRvb2w6ICR7dG9vbE5hbWV9YCB9O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gVG9vbCBJbXBsZW1lbnRhdGlvbnMgPT09XHJcblxyXG4gICAgcHJpdmF0ZSBhc3luYyBhZGRDb21wb25lbnQobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtY29tcG9uZW50Jywge1xyXG4gICAgICAgICAgICAgICAgdXVpZDogbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICBjb21wb25lbnQ6IGNvbXBvbmVudFR5cGUsXHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gV2FpdCBmb3IgZWRpdG9yIHRvIHByb2Nlc3NcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5kZWxheSgxMDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQWRkZWQgJHtjb21wb25lbnRUeXBlfSB0byBub2RlICR7bm9kZVV1aWR9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHNjZW5lIHNjcmlwdFxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdhZGRDb21wb25lbnRUb05vZGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gYWRkIGNvbXBvbmVudCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHJlbW92ZUNvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ3JlbW92ZS1jb21wb25lbnQnLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgIGNvbXBvbmVudDogY29tcG9uZW50VHlwZSxcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBSZW1vdmVkICR7Y29tcG9uZW50VHlwZX0gZnJvbSBub2RlICR7bm9kZVV1aWR9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdDogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogRVhURU5TSU9OX05BTUUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAncmVtb3ZlQ29tcG9uZW50RnJvbU5vZGUnLFxyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtub2RlVXVpZCwgY29tcG9uZW50VHlwZV0sXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gcmVtb3ZlIGNvbXBvbmVudCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHF1ZXJ5Q29tcG9uZW50cyhub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSBub3QgZm91bmQ6ICR7bm9kZVV1aWR9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wcyA9IG5vZGVEYXRhLl9fY29tcHNfXyB8fCBbXTtcclxuXHJcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50VHlwZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gUmV0dXJuIGNvbXBhY3QgdHlwZSBsaXN0IG9ubHlcclxuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVzID0gY29tcHMubWFwKChjOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogYy50eXBlIHx8IGMuX190eXBlX18gfHwgYy5jaWQgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGMuZW5hYmxlZD8udmFsdWUgPz8gYy5lbmFibGVkID8/IHRydWUsXHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG5vZGVVdWlkLCBjb21wb25lbnRzOiB0eXBlcyB9IH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEZpbmQgc3BlY2lmaWMgY29tcG9uZW50IGFuZCByZXR1cm4gZGV0YWlsZWQgaW5mb1xyXG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBjb21wcy5maW5kKChjOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCB8fCAnJztcclxuICAgICAgICAgICAgICAgIHJldHVybiB0ID09PSBjb21wb25lbnRUeXBlIHx8IHQuaW5jbHVkZXMoY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKCF0YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IGNvbXBzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCkuam9pbignLCAnKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZC4gQXZhaWxhYmxlOiAke2F2YWlsYWJsZX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHByb3BlcnRpZXMgPSB0aGlzLmV4dHJhY3RQcm9wZXJ0aWVzKHRhcmdldCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHRhcmdldC50eXBlIHx8IHRhcmdldC5fX3R5cGVfXyB8fCB0YXJnZXQuY2lkLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRhcmdldC5lbmFibGVkPy52YWx1ZSA/PyB0YXJnZXQuZW5hYmxlZCA/PyB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXMsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXRDb21wb25lbnRJbmZvJyxcclxuICAgICAgICAgICAgICAgICAgICBhcmdzOiBbbm9kZVV1aWQsIGNvbXBvbmVudFR5cGVdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gZGF0YSByZXR1cm5lZCcgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwcml2YXRlIGFzeW5jIHNldFByb3BlcnR5KGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgY29uc3QgeyBub2RlVXVpZCwgY29tcG9uZW50VHlwZSwgcHJvcGVydHksIHByb3BlcnR5VHlwZSwgdmFsdWUgfSA9IGFyZ3M7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFN0ZXAgMTogUXVlcnkgbm9kZSB0byBmaW5kIGNvbXBvbmVudCBpbmRleFxyXG4gICAgICAgICAgICBjb25zdCBub2RlRGF0YTogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgaWYgKCFub2RlRGF0YSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm9kZSBub3QgZm91bmQ6ICR7bm9kZVV1aWR9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wcyA9IG5vZGVEYXRhLl9fY29tcHNfXyB8fCBbXTtcclxuICAgICAgICAgICAgY29uc3QgY29tcEluZGV4ID0gY29tcHMuZmluZEluZGV4KChjOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHQgPSBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCB8fCAnJztcclxuICAgICAgICAgICAgICAgIHJldHVybiB0ID09PSBjb21wb25lbnRUeXBlIHx8IHQuaW5jbHVkZXMoY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGNvbXBJbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGF2YWlsYWJsZSA9IGNvbXBzLm1hcCgoYzogYW55KSA9PiBjLnR5cGUgfHwgYy5fX3R5cGVfXyB8fCBjLmNpZCkuam9pbignLCAnKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZC4gQXZhaWxhYmxlOiAke2F2YWlsYWJsZX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFN0ZXAgMjogQnVpbGQgcHJvcGVydHkgcGF0aFxyXG4gICAgICAgICAgICBjb25zdCBwYXRoID0gYF9fY29tcHNfXy4ke2NvbXBJbmRleH0uJHtwcm9wZXJ0eX1gO1xyXG5cclxuICAgICAgICAgICAgLy8gU3RlcCAzOiBQcm9jZXNzIHZhbHVlIGJhc2VkIG9uIHByb3BlcnR5VHlwZVxyXG4gICAgICAgICAgICBjb25zdCBkdW1wID0gdGhpcy5idWlsZER1bXAocHJvcGVydHlUeXBlLCB2YWx1ZSk7XHJcblxyXG4gICAgICAgICAgICAvLyBTdGVwIDQ6IFNldCBwcm9wZXJ0eVxyXG4gICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XHJcbiAgICAgICAgICAgICAgICB1dWlkOiBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgIHBhdGgsXHJcbiAgICAgICAgICAgICAgICBkdW1wLFxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMuZGVsYXkoMjAwKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fSA9ICR7SlNPTi5zdHJpbmdpZnkodmFsdWUpfWAgfTtcclxuICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgLy8gRmFsbGJhY2s6IHNjZW5lIHNjcmlwdFxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBFWFRFTlNJT05fTkFNRSxcclxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICdzZXRDb21wb25lbnRQcm9wZXJ0eScsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJnczogW25vZGVVdWlkLCBjb21wb25lbnRUeXBlLCBwcm9wZXJ0eSwgdmFsdWVdLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHNldCBwcm9wZXJ0eScgfTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyA9PT0gSGVscGVycyA9PT1cclxuXHJcbiAgICBwcml2YXRlIGJ1aWxkRHVtcChwcm9wZXJ0eVR5cGU6IHN0cmluZywgdmFsdWU6IGFueSk6IGFueSB7XHJcbiAgICAgICAgc3dpdGNoIChwcm9wZXJ0eVR5cGUpIHtcclxuICAgICAgICAgICAgY2FzZSAnY29sb3InOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByOiB2YWx1ZS5yID8/IDI1NSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZzogdmFsdWUuZyA/PyAyNTUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGI6IHZhbHVlLmIgPz8gMjU1LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhOiB2YWx1ZS5hID8/IDI1NSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5Db2xvcicsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY2FzZSAndmVjMic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHg6IHZhbHVlLnggPz8gMCwgeTogdmFsdWUueSA/PyAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlZlYzInLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3ZlYzMnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyB4OiB2YWx1ZS54ID8/IDAsIHk6IHZhbHVlLnkgPz8gMCwgejogdmFsdWUueiA/PyAwIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2NjLlZlYzMnLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3NpemUnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyB3aWR0aDogdmFsdWUud2lkdGggPz8gMCwgaGVpZ2h0OiB2YWx1ZS5oZWlnaHQgPz8gMCB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjYy5TaXplJyxcclxuICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBjYXNlICdub2RlJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB7IHV1aWQ6IHZhbHVlIH0gfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ3Nwcml0ZUZyYW1lJzpcclxuICAgICAgICAgICAgY2FzZSAnYXNzZXQnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHsgdXVpZDogdmFsdWUgfSwgdHlwZTogdGhpcy5nZXRBc3NldFR5cGVIaW50KHByb3BlcnR5VHlwZSkgfTtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ251bWJlcic6XHJcbiAgICAgICAgICAgIGNhc2UgJ2ludGVnZXInOlxyXG4gICAgICAgICAgICBjYXNlICdmbG9hdCc6XHJcbiAgICAgICAgICAgIGNhc2UgJ3N0cmluZyc6XHJcbiAgICAgICAgICAgIGNhc2UgJ2Jvb2xlYW4nOlxyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWUgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBnZXRBc3NldFR5cGVIaW50KHByb3BlcnR5VHlwZTogc3RyaW5nKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgICAgICBjb25zdCBoaW50czogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICAgICAgICAgc3ByaXRlRnJhbWU6ICdjYy5TcHJpdGVGcmFtZScsXHJcbiAgICAgICAgICAgIG1hdGVyaWFsOiAnY2MuTWF0ZXJpYWwnLFxyXG4gICAgICAgICAgICB0ZXh0dXJlOiAnY2MuVGV4dHVyZTJEJyxcclxuICAgICAgICAgICAgYXVkaW9DbGlwOiAnY2MuQXVkaW9DbGlwJyxcclxuICAgICAgICAgICAgcHJlZmFiOiAnY2MuUHJlZmFiJyxcclxuICAgICAgICAgICAgZm9udDogJ2NjLkZvbnQnLFxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIGhpbnRzW3Byb3BlcnR5VHlwZV07XHJcbiAgICB9XHJcblxyXG4gICAgcHJpdmF0ZSBleHRyYWN0UHJvcGVydGllcyhjb21wOiBhbnkpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcclxuICAgICAgICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7fTtcclxuICAgICAgICBjb25zdCBza2lwS2V5cyA9IG5ldyBTZXQoWydfX3R5cGVfXycsICd0eXBlJywgJ2NpZCcsICdfbmFtZScsICdfb2JqRmxhZ3MnLCAnbm9kZScsICdfX3ByZWZhYicsICdmaWxlSWQnXSk7XHJcblxyXG4gICAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsXSBvZiBPYmplY3QuZW50cmllcyhjb21wKSkge1xyXG4gICAgICAgICAgICBpZiAoc2tpcEtleXMuaGFzKGtleSkpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJ18nKSAmJiBrZXkgIT09ICdfZW5hYmxlZCcpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgaWYgKHZhbCAmJiB0eXBlb2YgdmFsID09PSAnb2JqZWN0JyAmJiAndmFsdWUnIGluICh2YWwgYXMgYW55KSkge1xyXG4gICAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSAodmFsIGFzIGFueSkudmFsdWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IHZhbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgZGVsYXkobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICAgIH1cclxufVxyXG4iXX0=