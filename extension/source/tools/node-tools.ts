import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

const EXTENSION_NAME = 'cocos-mcp-extension';

export class NodeTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
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

    async execute(toolName: string, args: any): Promise<ToolResponse> {
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

    private async query(args: any): Promise<ToolResponse> {
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

    private async getComponentDetails(nodeUuid: string, verbose: boolean = false): Promise<any[]> {
        try {
            const nodeData: any = await Editor.Message.request('scene', 'query-node', nodeUuid);
            if (!nodeData || !nodeData.__comps__) return [];

            return nodeData.__comps__.map((comp: any) =>
                this.extractCompact(comp, verbose)
            );
        } catch {
            return [];
        }
    }

    /** Extract compact component info: only visible, non-internal, non-default properties. */
    private extractCompact(comp: any, verbose: boolean = false): any {
        const info: any = {
            type: comp.type || comp.__type__ || comp.cid || 'unknown',
            enabled: comp.enabled?.value ?? comp.enabled ?? true,
            properties: {},
        };

        // comp.value holds per-property metadata; fall back to comp itself
        const source = comp.value || comp;
        const skipKeys = new Set([
            '__type__', 'type', 'cid', '_name', '_objFlags', 'node', '__prefab', 'fileId',
            'uuid', 'name', 'enabled', '_enabled', '__scriptAsset',
        ]);

        for (const [key, meta] of Object.entries(source)) {
            if (skipKeys.has(key)) continue;
            if (key.startsWith('_')) continue;
            if (key.startsWith('editor')) continue; // skip editor-only display duplicates

            const m = meta as any;
            if (!m || typeof m !== 'object') continue;
            if (m.visible === false) continue;
            if (!verbose && m.readonly === true) continue;
            if (!verbose && 'value' in m && 'default' in m && this.valueEquals(m.value, m.default)) continue;

            if ('value' in m) {
                info.properties[key] = m.value;
            }
        }

        return info;
    }

    /** Deep equality check for property values. */
    private valueEquals(a: any, b: any): boolean {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== typeof b) return false;
        if (typeof a !== 'object') return false;
        const ka = Object.keys(a);
        const kb = Object.keys(b);
        if (ka.length !== kb.length) return false;
        return ka.every(k => this.valueEquals(a[k], b[k]));
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
            let nodeUuid: string;
            let nodeName = args.name;

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

            // If assetUuid is provided, use cc.instantiate via scene script for proper prefab linking
            if (args.assetUuid) {
                const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                    name: EXTENSION_NAME,
                    method: 'instantiatePrefab',
                    args: [args.assetUuid, parentUuid, args.name],
                });
                if (!result || !result.success) {
                    return result || { success: false, error: 'Prefab instantiation failed' };
                }
                nodeUuid = result.data.uuid;
                nodeName = result.data.name;
            } else {
                // Standard node creation
                const options: any = {
                    parent: parentUuid,
                    name: args.name,
                };
                if (args.type) {
                    options.type = args.type;
                }
                nodeUuid = await Editor.Message.request('scene', 'create-node', options) as any;
            }

            const applied: string[] = [];

            // Auto-add cc.UITransform for 2D nodes
            if (args.type === '2DNode') {
                try {
                    await Editor.Message.request('scene', 'create-component', {
                        uuid: nodeUuid,
                        component: 'cc.UITransform',
                    });
                    applied.push('+cc.UITransform');
                } catch {
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
                    } catch (err: any) {
                        applied.push(`!${compType}(${err.message})`);
                    }
                }
            }

            return {
                success: true,
                data: { uuid: nodeUuid, name: nodeName, applied },
                message: `Node created: ${nodeName}` + (applied.length ? ` [${applied.join(', ')}]` : ''),
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

    // Dispatch: single property or batch properties
    private async setPropertyDispatch(args: any): Promise<ToolResponse> {
        const { uuid } = args;

        // Batch mode
        if (args.properties && typeof args.properties === 'object') {
            const results: string[] = [];
            const errors: string[] = [];

            for (const [prop, val] of Object.entries(args.properties)) {
                const r = await this.setProperty(uuid, prop, val);
                if (r.success) {
                    results.push(prop);
                } else {
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
            } else if (property === 'active') {
                // active needs proper boolean parsing (string "false" must become false)
                const boolVal = typeof value === 'string'
                    ? value.toLowerCase() !== 'false' && value !== '0' && value !== ''
                    : !!value;
                await Editor.Message.request('scene', 'set-property', {
                    uuid,
                    path: 'active',
                    dump: { value: boolVal, type: 'Boolean' },
                });
            } else {
                await Editor.Message.request('scene', 'set-property', {
                    uuid,
                    path: editorPath,
                    dump: { value },
                });
            }

            await this.delay(100);

            // Verify for properties that can silently fail
            if (property === 'active' || property === 'name') {
                const nodeData: any = await Editor.Message.request('scene', 'query-node', uuid);
                const actual = nodeData?.[editorPath]?.value;
                // For active, compare as booleans (value may be string "false")
                const expected = property === 'active'
                    ? (typeof value === 'string' ? value.toLowerCase() !== 'false' && value !== '0' && value !== '' : !!value)
                    : value;
                if (actual !== expected) {
                    // Editor API failed — use scene script fallback
                    const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                        name: EXTENSION_NAME,
                        method: 'setNodeProperty',
                        args: [uuid, property, expected],
                    });
                    if (result?.success) return result;
                    return { success: false, error: `Failed to set ${property}` };
                }
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

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
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

    private async duplicateNode(uuid: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('scene', 'duplicate-node', [uuid]);
            return {
                success: true,
                data: { duplicatedUuids: result },
                message: `Node duplicated: ${uuid}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async resetTransform(uuid: string): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'reset-node', { uuid });
            return { success: true, message: `Transform reset on node ${uuid}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async findByAsset(assetUuid: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('scene', 'query-nodes-by-asset-uuid', assetUuid);
            return { success: true, data: result || [] };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async copyNodes(uuids: string[]): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'copy-node', uuids);
            return { success: true, message: `Copied ${uuids.length} node(s) to clipboard` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async pasteNodes(args: any): Promise<ToolResponse> {
        try {
            const result: any = await (Editor.Message.request as any)('scene', 'paste-node', {
                target: args.target,
                keepWorldTransform: args.keepWorldTransform || false,
            });
            return {
                success: true,
                data: { pastedUuids: result },
                message: 'Node(s) pasted from clipboard',
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async cutNodes(uuids: string[]): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'cut-node', uuids);
            return { success: true, message: `Cut ${uuids.length} node(s) to clipboard` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async createPrimitive(args: any): Promise<ToolResponse> {
        try {
            const prefabUrl = `db://internal/default_prefab/3d/${args.type}.prefab`;
            const uuidResult: any = await Editor.Message.request('asset-db', 'query-uuid', prefabUrl);
            const uuid = typeof uuidResult === 'string' ? uuidResult : uuidResult?.uuid;
            if (!uuid) {
                return { success: false, error: `Primitive type '${args.type}' not found` };
            }

            let parentUuid = args.parentUuid;
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

            const nodeUuid: any = await Editor.Message.request('scene', 'create-node', {
                parent: parentUuid,
                assetUuid: uuid,
                name: args.name || args.type,
            } as any);

            return {
                success: true,
                data: { uuid: nodeUuid, name: args.name || args.type },
                message: `Primitive '${args.name || args.type}' created`,
            };
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

        // Extract parent (just UUID)
        if (data.parent) {
            const parentUuid = data.parent?.value?.uuid ?? data.parent?.uuid ?? data.parent;
            if (parentUuid) info.parentUuid = typeof parentUuid === 'string' ? parentUuid : parentUuid;
        }

        // Extract children (just UUIDs)
        if (data.children) {
            const kids = Array.isArray(data.children) ? data.children : [];
            info.children = kids.map((c: any) => c?.value?.uuid ?? c?.uuid ?? c);
        }

        // Extract layer
        if (data.layer?.value !== undefined) {
            info.layer = data.layer.value;
        }

        // Extract components (compact)
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
