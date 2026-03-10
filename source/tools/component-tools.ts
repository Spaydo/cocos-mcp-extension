import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

const EXTENSION_NAME = 'cocos-mcp-extension';

export class ComponentTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'add': return this.addComponent(args.nodeUuid, args.componentType);
            case 'remove': return this.removeComponent(args.nodeUuid, args.componentType);
            case 'query': return this.queryComponents(args.nodeUuid, args.componentType);
            case 'set_property': return this.setProperty(args);
            default: return { success: false, error: `Unknown component tool: ${toolName}` };
        }
    }

    // === Tool Implementations ===

    private async addComponent(nodeUuid: string, componentType: string): Promise<ToolResponse> {
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
        } catch {
            // Fallback: scene script
            try {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'addComponentToNode',
                    args: [nodeUuid, componentType],
                });
                return result || { success: false, error: 'Failed to add component' };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }
    }

    private async removeComponent(nodeUuid: string, componentType: string): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'remove-component', {
                uuid: nodeUuid,
                component: componentType,
            });

            return {
                success: true,
                message: `Removed ${componentType} from node ${nodeUuid}`,
            };
        } catch {
            try {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'removeComponentFromNode',
                    args: [nodeUuid, componentType],
                });
                return result || { success: false, error: 'Failed to remove component' };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }
    }

    private async queryComponents(nodeUuid: string, componentType?: string): Promise<ToolResponse> {
        try {
            const nodeData: any = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeData) {
                return { success: false, error: `Node not found: ${nodeUuid}` };
            }

            const comps = nodeData.__comps__ || [];

            if (!componentType) {
                // Return compact type list only
                const types = comps.map((c: any) => ({
                    type: c.type || c.__type__ || c.cid || 'unknown',
                    enabled: c.enabled?.value ?? c.enabled ?? true,
                }));
                return { success: true, data: { nodeUuid, components: types } };
            }

            // Find specific component and return detailed info
            const target = comps.find((c: any) => {
                const t = c.type || c.__type__ || c.cid || '';
                return t === componentType || t.includes(componentType);
            });

            if (!target) {
                const available = comps.map((c: any) => c.type || c.__type__ || c.cid).join(', ');
                return { success: false, error: `Component ${componentType} not found. Available: ${available}` };
            }

            const properties = this.extractProperties(target);
            return {
                success: true,
                data: {
                    nodeUuid,
                    componentType: target.type || target.__type__ || target.cid,
                    enabled: target.enabled?.value ?? target.enabled ?? true,
                    properties,
                },
            };
        } catch {
            try {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'getComponentInfo',
                    args: [nodeUuid, componentType],
                });
                return result || { success: false, error: 'No data returned' };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }
    }

    private async setProperty(args: any): Promise<ToolResponse> {
        const { nodeUuid, componentType, property, propertyType, value } = args;

        try {
            // Step 1: Query node to find component index
            const nodeData: any = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeData) {
                return { success: false, error: `Node not found: ${nodeUuid}` };
            }

            const comps = nodeData.__comps__ || [];
            const compIndex = comps.findIndex((c: any) => {
                const t = c.type || c.__type__ || c.cid || '';
                return t === componentType || t.includes(componentType);
            });

            if (compIndex === -1) {
                const available = comps.map((c: any) => c.type || c.__type__ || c.cid).join(', ');
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
        } catch {
            // Fallback: scene script
            try {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'setComponentProperty',
                    args: [nodeUuid, componentType, property, value],
                });
                return result || { success: false, error: 'Failed to set property' };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }
    }

    // === Helpers ===

    private buildDump(propertyType: string, value: any): any {
        switch (propertyType) {
            case 'color':
                return {
                    value: {
                        r: value.r ?? 255,
                        g: value.g ?? 255,
                        b: value.b ?? 255,
                        a: value.a ?? 255,
                    },
                    type: 'cc.Color',
                };

            case 'vec2':
                return {
                    value: { x: value.x ?? 0, y: value.y ?? 0 },
                    type: 'cc.Vec2',
                };

            case 'vec3':
                return {
                    value: { x: value.x ?? 0, y: value.y ?? 0, z: value.z ?? 0 },
                    type: 'cc.Vec3',
                };

            case 'size':
                return {
                    value: { width: value.width ?? 0, height: value.height ?? 0 },
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

    private getAssetTypeHint(propertyType: string): string | undefined {
        const hints: Record<string, string> = {
            spriteFrame: 'cc.SpriteFrame',
            material: 'cc.Material',
            texture: 'cc.Texture2D',
            audioClip: 'cc.AudioClip',
            prefab: 'cc.Prefab',
            font: 'cc.Font',
        };
        return hints[propertyType];
    }

    private extractProperties(comp: any): Record<string, any> {
        const result: Record<string, any> = {};
        const skipKeys = new Set(['__type__', 'type', 'cid', '_name', '_objFlags', 'node', '__prefab', 'fileId']);

        for (const [key, val] of Object.entries(comp)) {
            if (skipKeys.has(key)) continue;
            if (key.startsWith('_') && key !== '_enabled') continue;

            if (val && typeof val === 'object' && 'value' in (val as any)) {
                result[key] = (val as any).value;
            } else {
                result[key] = val;
            }
        }
        return result;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
