import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

const EXTENSION_NAME = 'cocos-mcp-extension';

export class NodeTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
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

    private async query(args: any): Promise<ToolResponse> {
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

    private async getNodeInfo(uuid: string): Promise<ToolResponse> {
        try {
            const nodeData: any = await Editor.Message.request('scene', 'query-node', uuid);
            if (!nodeData) {
                return { success: false, error: `Node not found: ${uuid}` };
            }
            return { success: true, data: this.parseNodeData(nodeData, uuid) };
        } catch {
            // Fallback: scene script
            try {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'getNodeInfo',
                    args: [uuid],
                });
                return result || { success: false, error: 'No data returned' };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }
    }

    private async findByName(name: string): Promise<ToolResponse> {
        try {
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return { success: false, error: 'No scene tree available' };
            }
            const results: any[] = [];
            this.searchTree(tree, name, '', results);
            if (results.length === 0) {
                return { success: false, error: `No node found with name: ${name}` };
            }
            return { success: true, data: results };
        } catch {
            try {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'findNodeByName',
                    args: [name],
                });
                return result || { success: false, error: 'No data returned' };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }
    }

    private async listAll(): Promise<ToolResponse> {
        try {
            const tree = await Editor.Message.request('scene', 'query-node-tree');
            if (!tree) {
                return { success: false, error: 'No scene tree available' };
            }
            const nodes: any[] = [];
            this.collectNodes(tree, nodes);
            return { success: true, data: { totalNodes: nodes.length, nodes } };
        } catch {
            try {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'getAllNodes',
                    args: [],
                });
                return result || { success: false, error: 'No data returned' };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }
    }

    private async createNode(args: any): Promise<ToolResponse> {
        try {
            let parentUuid = args.parentUuid;

            // If no parent specified, get scene root
            if (!parentUuid) {
                try {
                    const tree: any = await Editor.Message.request('scene', 'query-node-tree');
                    parentUuid = tree?.uuid;
                } catch {
                    const sceneInfo: any = await Editor.Message.request('scene', 'query-current-scene');
                    parentUuid = sceneInfo?.uuid;
                }
            }

            if (!parentUuid) {
                return { success: false, error: 'Cannot determine scene root' };
            }

            const options: any = {
                parent: parentUuid,
                name: args.name,
            };

            if (args.assetUuid) {
                options.assetUuid = args.assetUuid;
            }

            if (args.type) {
                options.type = args.type;
            }

            const uuid: any = await Editor.Message.request('scene', 'create-node', options);
            return {
                success: true,
                data: { uuid, name: args.name },
                message: `Node created: ${args.name}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async deleteNode(uuid: string): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'remove-node', { uuid });
            return { success: true, message: `Node deleted: ${uuid}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async setProperty(uuid: string, property: string, value: any): Promise<ToolResponse> {
        // Map common property names to Editor API paths
        const propertyMap: Record<string, string> = {
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
            } else {
                await Editor.Message.request('scene', 'set-property', {
                    uuid,
                    path: editorPath,
                    dump: { value },
                });
            }

            return { success: true, message: `Set ${property} on ${uuid}` };
        } catch {
            // Fallback: scene script
            try {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'setNodeProperty',
                    args: [uuid, property, value],
                });
                return result || { success: false, error: 'Failed to set property' };
            } catch (err: any) {
                return { success: false, error: err.message };
            }
        }
    }

    private async moveNode(uuid: string, parentUuid: string, siblingIndex?: number): Promise<ToolResponse> {
        try {
            const options: any = {
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
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    // === Helpers ===

    private parseNodeData(data: any, uuid: string): any {
        const info: any = {
            uuid,
            name: data.name?.value ?? data.name ?? 'unknown',
            active: data.active?.value ?? data.active ?? true,
        };

        // Extract position
        if (data.position?.value) {
            const p = data.position.value;
            info.position = { x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0 };
        }

        // Extract rotation (euler)
        if (data.euler?.value) {
            const r = data.euler.value;
            info.rotation = { x: r.x ?? 0, y: r.y ?? 0, z: r.z ?? 0 };
        }

        // Extract scale
        if (data.scale?.value) {
            const s = data.scale.value;
            info.scale = { x: s.x ?? 1, y: s.y ?? 1, z: s.z ?? 1 };
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
        if (data.layer?.value !== undefined) {
            info.layer = data.layer.value;
        }

        // Extract components
        if (data.__comps__) {
            info.components = data.__comps__.map((c: any) => ({
                type: c.type || c.__type__ || c.cid || 'unknown',
                enabled: c.enabled?.value ?? c.enabled ?? true,
            }));
        }

        return info;
    }

    private searchTree(node: any, targetName: string, path: string, results: any[]): void {
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

    private collectNodes(node: any, results: any[]): void {
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
