import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

// @ts-ignore
import packageJSON from '../../package.json';

interface SnapshotEntry {
    id: string;
    label: string;
    timestamp: number;
    data: any;
}

export class ValidationTools implements ToolExecutor {
    private static MAX_SNAPSHOTS = 20;
    private snapshots: Map<string, SnapshotEntry> = new Map();
    private snapshotCounter: number = 0;

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'validate_scene',
                description: 'Full scene health check: node tree integrity, missing components, empty names',
                inputSchema: {
                    type: 'object',
                    properties: {
                        maxDepth: { type: 'number', description: 'Max tree depth to check (default 10)' },
                    },
                },
            },
            {
                name: 'validate_node',
                description: 'Deep validation of a single node: component requirements, property validity',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Node UUID to validate' },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'validate_components',
                description: 'Find nodes missing required companion components (e.g. Sprite without UITransform)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        componentType: { type: 'string', description: 'Filter by component type (optional)' },
                    },
                },
            },
            {
                name: 'take_snapshot',
                description: 'Capture current scene state as a named snapshot. Returns snapshot ID for compare_snapshots',
                inputSchema: {
                    type: 'object',
                    properties: {
                        label: { type: 'string', description: 'Optional label for this snapshot' },
                    },
                },
            },
            {
                name: 'compare_snapshots',
                description: 'Compare two previously taken snapshots, listing added/removed/modified nodes',
                inputSchema: {
                    type: 'object',
                    properties: {
                        snapshotId1: { type: 'string', description: 'First snapshot ID' },
                        snapshotId2: { type: 'string', description: 'Second snapshot ID' },
                    },
                    required: ['snapshotId1', 'snapshotId2'],
                },
            },
            {
                name: 'get_scene_stats',
                description: 'Scene statistics: node count, component count, hierarchy depth, component distribution',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'validate_references',
                description: 'Verify all asset references in the project exist (check for broken references)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pattern: { type: 'string', description: 'Asset pattern to check (default: db://assets/**/*.*)' },
                    },
                },
            },
        ];
    }

    async execute(actionName: string, args: any): Promise<ToolResponse> {
        switch (actionName) {
            case 'validate_scene':     return this.validateScene(args?.maxDepth);
            case 'validate_node':      return this.validateNode(args?.uuid);
            case 'validate_components': return this.validateComponents(args?.componentType);
            case 'take_snapshot':      return this.takeSnapshot(args?.label);
            case 'compare_snapshots':  return this.compareSnapshots(args?.snapshotId1, args?.snapshotId2);
            case 'get_scene_stats':    return this.getSceneStats();
            case 'validate_references': return this.validateReferences(args?.pattern);
            default:
                return { success: false, error: `Unknown validation action: ${actionName}` };
        }
    }

    private async validateScene(maxDepth?: number): Promise<ToolResponse> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: packageJSON.name,
                method: 'validateScene',
                args: [maxDepth ?? 10],
            });
            return result as ToolResponse;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async validateNode(uuid: string): Promise<ToolResponse> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: packageJSON.name,
                method: 'validateNode',
                args: [uuid],
            });
            return result as ToolResponse;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async validateComponents(componentType?: string): Promise<ToolResponse> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: packageJSON.name,
                method: 'validateComponents',
                args: [componentType],
            });
            return result as ToolResponse;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async takeSnapshot(label?: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: packageJSON.name,
                method: 'getSceneSnapshot',
                args: [],
            });

            if (!result?.success) {
                return result as ToolResponse;
            }

            this.snapshotCounter++;
            const id = `snapshot_${this.snapshotCounter}`;
            const entry: SnapshotEntry = {
                id,
                label: label || `Snapshot #${this.snapshotCounter}`,
                timestamp: Date.now(),
                data: result.data,
            };
            this.snapshots.set(id, entry);

            // Evict oldest snapshots if over limit
            while (this.snapshots.size > ValidationTools.MAX_SNAPSHOTS) {
                const oldest = this.snapshots.keys().next().value;
                if (oldest) this.snapshots.delete(oldest);
            }

            return {
                success: true,
                data: { snapshotId: id, label: entry.label, nodeCount: result.data.nodeCount },
                message: `Snapshot taken: ${entry.label} (${result.data.nodeCount} nodes)`,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async compareSnapshots(id1: string, id2: string): Promise<ToolResponse> {
        const snap1 = this.snapshots.get(id1);
        const snap2 = this.snapshots.get(id2);

        if (!snap1) return { success: false, error: `Snapshot not found: ${id1}` };
        if (!snap2) return { success: false, error: `Snapshot not found: ${id2}` };

        const nodes1 = new Map<string, any>();
        const nodes2 = new Map<string, any>();

        for (const n of snap1.data.nodes) nodes1.set(n.uuid, n);
        for (const n of snap2.data.nodes) nodes2.set(n.uuid, n);

        const added: any[] = [];
        const removed: any[] = [];
        const modified: any[] = [];

        // Find added and modified
        for (const [uuid, node2] of nodes2) {
            const node1 = nodes1.get(uuid);
            if (!node1) {
                added.push({ uuid, name: node2.name });
            } else {
                const changes: string[] = [];
                if (node1.name !== node2.name) changes.push(`name: '${node1.name}' → '${node2.name}'`);
                if (node1.active !== node2.active) changes.push(`active: ${node1.active} → ${node2.active}`);
                if (JSON.stringify(node1.position) !== JSON.stringify(node2.position)) changes.push('position changed');
                if (JSON.stringify(node1.rotation) !== JSON.stringify(node2.rotation)) changes.push('rotation changed');
                if (JSON.stringify(node1.scale) !== JSON.stringify(node2.scale)) changes.push('scale changed');
                if (JSON.stringify(node1.components) !== JSON.stringify(node2.components)) changes.push('components changed');
                if (changes.length > 0) {
                    modified.push({ uuid, name: node2.name, changes });
                }
            }
        }

        // Find removed
        for (const [uuid, node1] of nodes1) {
            if (!nodes2.has(uuid)) {
                removed.push({ uuid, name: node1.name });
            }
        }

        return {
            success: true,
            data: {
                snapshot1: { id: id1, label: snap1.label, timestamp: snap1.timestamp },
                snapshot2: { id: id2, label: snap2.label, timestamp: snap2.timestamp },
                added,
                removed,
                modified,
                summary: `${added.length} added, ${removed.length} removed, ${modified.length} modified`,
            },
        };
    }

    private async getSceneStats(): Promise<ToolResponse> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: packageJSON.name,
                method: 'getSceneStats',
                args: [],
            });
            return result as ToolResponse;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async validateReferences(pattern?: string): Promise<ToolResponse> {
        try {
            const searchPattern = pattern || 'db://assets/**/*.*';
            const assets: any = await Editor.Message.request('asset-db', 'query-assets', { pattern: searchPattern });

            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: { totalAssets: 0, totalReferences: 0, brokenReferences: [], valid: true } };
            }

            const brokenReferences: any[] = [];
            let totalReferences = 0;

            for (const asset of assets) {
                try {
                    const deps: any = await (Editor.Message.request as any)('asset-db', 'query-asset-dependencies', asset.uuid);
                    if (deps && Array.isArray(deps)) {
                        for (const depUuid of deps) {
                            totalReferences++;
                            try {
                                const info = await Editor.Message.request('asset-db', 'query-asset-info', depUuid);
                                if (!info) {
                                    brokenReferences.push({
                                        assetName: asset.name,
                                        assetUuid: asset.uuid,
                                        missingDependency: depUuid,
                                    });
                                }
                            } catch {
                                brokenReferences.push({
                                    assetName: asset.name,
                                    assetUuid: asset.uuid,
                                    missingDependency: depUuid,
                                });
                            }
                        }
                    }
                } catch {
                    // Skip assets that don't support dependency queries
                }
            }

            return {
                success: true,
                data: {
                    totalAssets: assets.length,
                    totalReferences,
                    brokenCount: brokenReferences.length,
                    brokenReferences,
                    valid: brokenReferences.length === 0,
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
