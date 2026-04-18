"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationTools = void 0;
// @ts-ignore
const package_json_1 = __importDefault(require("../../package.json"));
class ValidationTools {
    constructor() {
        this.snapshots = new Map();
        this.snapshotCounter = 0;
    }
    getTools() {
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
    async execute(actionName, args) {
        switch (actionName) {
            case 'validate_scene': return this.validateScene(args === null || args === void 0 ? void 0 : args.maxDepth);
            case 'validate_node': return this.validateNode(args === null || args === void 0 ? void 0 : args.uuid);
            case 'validate_components': return this.validateComponents(args === null || args === void 0 ? void 0 : args.componentType);
            case 'take_snapshot': return this.takeSnapshot(args === null || args === void 0 ? void 0 : args.label);
            case 'compare_snapshots': return this.compareSnapshots(args === null || args === void 0 ? void 0 : args.snapshotId1, args === null || args === void 0 ? void 0 : args.snapshotId2);
            case 'get_scene_stats': return this.getSceneStats();
            case 'validate_references': return this.validateReferences(args === null || args === void 0 ? void 0 : args.pattern);
            default:
                return { success: false, error: `Unknown validation action: ${actionName}` };
        }
    }
    async validateScene(maxDepth) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: package_json_1.default.name,
                method: 'validateScene',
                args: [maxDepth !== null && maxDepth !== void 0 ? maxDepth : 10],
            });
            return result;
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async validateNode(uuid) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: package_json_1.default.name,
                method: 'validateNode',
                args: [uuid],
            });
            return result;
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async validateComponents(componentType) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: package_json_1.default.name,
                method: 'validateComponents',
                args: [componentType],
            });
            return result;
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async takeSnapshot(label) {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: package_json_1.default.name,
                method: 'getSceneSnapshot',
                args: [],
            });
            if (!(result === null || result === void 0 ? void 0 : result.success)) {
                return result;
            }
            this.snapshotCounter++;
            const id = `snapshot_${this.snapshotCounter}`;
            const entry = {
                id,
                label: label || `Snapshot #${this.snapshotCounter}`,
                timestamp: Date.now(),
                data: result.data,
            };
            this.snapshots.set(id, entry);
            // Evict oldest snapshots if over limit
            while (this.snapshots.size > ValidationTools.MAX_SNAPSHOTS) {
                const oldest = this.snapshots.keys().next().value;
                if (oldest)
                    this.snapshots.delete(oldest);
            }
            return {
                success: true,
                data: { snapshotId: id, label: entry.label, nodeCount: result.data.nodeCount },
                message: `Snapshot taken: ${entry.label} (${result.data.nodeCount} nodes)`,
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async compareSnapshots(id1, id2) {
        const snap1 = this.snapshots.get(id1);
        const snap2 = this.snapshots.get(id2);
        if (!snap1)
            return { success: false, error: `Snapshot not found: ${id1}` };
        if (!snap2)
            return { success: false, error: `Snapshot not found: ${id2}` };
        const nodes1 = new Map();
        const nodes2 = new Map();
        for (const n of snap1.data.nodes)
            nodes1.set(n.uuid, n);
        for (const n of snap2.data.nodes)
            nodes2.set(n.uuid, n);
        const added = [];
        const removed = [];
        const modified = [];
        // Find added and modified
        for (const [uuid, node2] of nodes2) {
            const node1 = nodes1.get(uuid);
            if (!node1) {
                added.push({ uuid, name: node2.name });
            }
            else {
                const changes = [];
                if (node1.name !== node2.name)
                    changes.push(`name: '${node1.name}' → '${node2.name}'`);
                if (node1.active !== node2.active)
                    changes.push(`active: ${node1.active} → ${node2.active}`);
                if (JSON.stringify(node1.position) !== JSON.stringify(node2.position))
                    changes.push('position changed');
                if (JSON.stringify(node1.rotation) !== JSON.stringify(node2.rotation))
                    changes.push('rotation changed');
                if (JSON.stringify(node1.scale) !== JSON.stringify(node2.scale))
                    changes.push('scale changed');
                if (JSON.stringify(node1.components) !== JSON.stringify(node2.components))
                    changes.push('components changed');
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
    async getSceneStats() {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: package_json_1.default.name,
                method: 'getSceneStats',
                args: [],
            });
            return result;
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
    async validateReferences(pattern) {
        try {
            const searchPattern = pattern || 'db://assets/**/*.*';
            const assets = await Editor.Message.request('asset-db', 'query-assets', { pattern: searchPattern });
            if (!assets || !Array.isArray(assets)) {
                return { success: true, data: { totalAssets: 0, totalReferences: 0, brokenReferences: [], valid: true } };
            }
            const brokenReferences = [];
            let totalReferences = 0;
            for (const asset of assets) {
                try {
                    const deps = await Editor.Message.request('asset-db', 'query-asset-dependencies', asset.uuid);
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
                            }
                            catch (_a) {
                                brokenReferences.push({
                                    assetName: asset.name,
                                    assetUuid: asset.uuid,
                                    missingDependency: depUuid,
                                });
                            }
                        }
                    }
                }
                catch (_b) {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    }
}
exports.ValidationTools = ValidationTools;
ValidationTools.MAX_SNAPSHOTS = 20;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy92YWxpZGF0aW9uLXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7OztBQUVBLGFBQWE7QUFDYixzRUFBNkM7QUFTN0MsTUFBYSxlQUFlO0lBQTVCO1FBRVksY0FBUyxHQUErQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2xELG9CQUFlLEdBQVcsQ0FBQyxDQUFDO0lBcVN4QyxDQUFDO0lBblNHLFFBQVE7UUFDSixPQUFPO1lBQ0g7Z0JBQ0ksSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsV0FBVyxFQUFFLCtFQUErRTtnQkFDNUYsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxzQ0FBc0MsRUFBRTtxQkFDcEY7aUJBQ0o7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxlQUFlO2dCQUNyQixXQUFXLEVBQUUsNkVBQTZFO2dCQUMxRixXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHVCQUF1QixFQUFFO3FCQUNqRTtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxNQUFNLENBQUM7aUJBQ3JCO2FBQ0o7WUFDRDtnQkFDSSxJQUFJLEVBQUUscUJBQXFCO2dCQUMzQixXQUFXLEVBQUUsb0ZBQW9GO2dCQUNqRyxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHFDQUFxQyxFQUFFO3FCQUN4RjtpQkFDSjthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLGVBQWU7Z0JB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TCxDQUFDOzRCQUFDLFdBQU0sQ0FBQztnQ0FDTCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7b0NBQ2xCLFNBQVMsRUFBRSxLQUFLLENBQUMsSUFBSTtvQ0FDckIsU0FBUyxFQUFFLEtBQUssQ0FBQyxJQUFJO29DQUNyQixpQkFBaUIsRUFBRSxPQUFPO2lDQUM3QixDQUFDLENBQUM7NEJBQ1AsQ0FBQzt3QkFDTCxDQUFDO29CQUNMLENBQUM7Z0JBQ0wsQ0FBQztnQkFBQyxXQUFNLENBQUM7b0JBQ0wsb0RBQW9EO2dCQUN4RCxDQUFDO1lBQ0wsQ0FBQztZQUVELE9BQU87Z0JBQ0gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFO29CQUNGLFdBQVcsRUFBRSxNQUFNLENBQUMsTUFBTTtvQkFDMUIsZUFBZTtvQkFDZixXQUFXLEVBQUUsZ0JBQWdCLENBQUMsTUFBTTtvQkFDcEMsZ0JBQWdCO29CQUNoQixLQUFLLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxLQUFLLENBQUM7aUJBQ3ZDO2FBQ0osQ0FBQztRQUNOLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEQsQ0FBQztJQUNMLENBQUM7O0FBdlNMLDBDQXdTQztBQXZTa0IsNkJBQWEsR0FBRyxFQUFFLEFBQUwsQ0FBTSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvb2xEZWZpbml0aW9uLCBUb29sUmVzcG9uc2UsIFRvb2xFeGVjdXRvciB9IGZyb20gJy4uL3R5cGVzJztcblxuLy8gQHRzLWlnbm9yZVxuaW1wb3J0IHBhY2thZ2VKU09OIGZyb20gJy4uLy4uL3BhY2thZ2UuanNvbic7XG5cbmludGVyZmFjZSBTbmFwc2hvdEVudHJ5IHtcbiAgICBpZDogc3RyaW5nO1xuICAgIGxhYmVsOiBzdHJpbmc7XG4gICAgdGltZXN0YW1wOiBudW1iZXI7XG4gICAgZGF0YTogYW55O1xufVxuXG5leHBvcnQgY2xhc3MgVmFsaWRhdGlvblRvb2xzIGltcGxlbWVudHMgVG9vbEV4ZWN1dG9yIHtcbiAgICBwcml2YXRlIHN0YXRpYyBNQVhfU05BUFNIT1RTID0gMjA7XG4gICAgcHJpdmF0ZSBzbmFwc2hvdHM6IE1hcDxzdHJpbmcsIFNuYXBzaG90RW50cnk+ID0gbmV3IE1hcCgpO1xuICAgIHByaXZhdGUgc25hcHNob3RDb3VudGVyOiBudW1iZXIgPSAwO1xuXG4gICAgZ2V0VG9vbHMoKTogVG9vbERlZmluaXRpb25bXSB7XG4gICAgICAgIHJldHVybiBbXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3ZhbGlkYXRlX3NjZW5lJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0Z1bGwgc2NlbmUgaGVhbHRoIGNoZWNrOiBub2RlIHRyZWUgaW50ZWdyaXR5LCBtaXNzaW5nIGNvbXBvbmVudHMsIGVtcHR5IG5hbWVzJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbWF4RGVwdGg6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnTWF4IHRyZWUgZGVwdGggdG8gY2hlY2sgKGRlZmF1bHQgMTApJyB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIG5hbWU6ICd2YWxpZGF0ZV9ub2RlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RlZXAgdmFsaWRhdGlvbiBvZiBhIHNpbmdsZSBub2RlOiBjb21wb25lbnQgcmVxdWlyZW1lbnRzLCBwcm9wZXJ0eSB2YWxpZGl0eScsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTm9kZSBVVUlEIHRvIHZhbGlkYXRlJyB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3ZhbGlkYXRlX2NvbXBvbmVudHMnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRmluZCBub2RlcyBtaXNzaW5nIHJlcXVpcmVkIGNvbXBhbmlvbiBjb21wb25lbnRzIChlLmcuIFNwcml0ZSB3aXRob3V0IFVJVHJhbnNmb3JtKScsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRmlsdGVyIGJ5IGNvbXBvbmVudCB0eXBlIChvcHRpb25hbCknIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3Rha2Vfc25hcHNob3QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2FwdHVyZSBjdXJyZW50IHNjZW5lIHN0YXRlIGFzIGEgbmFtZWQgc25hcHNob3QuIFJldHVybnMgc25hcHNob3QgSUQgZm9yIGNvbXBhcmVfc25hcHNob3RzJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3B0aW9uYWwgbGFiZWwgZm9yIHRoaXMgc25hcHNob3QnIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2NvbXBhcmVfc25hcHNob3RzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBhcmUgdHdvIHByZXZpb3VzbHkgdGFrZW4gc25hcHNob3RzLCBsaXN0aW5nIGFkZGVkL3JlbW92ZWQvbW9kaWZpZWQgbm9kZXMnLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzbmFwc2hvdElkMTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdGaXJzdCBzbmFwc2hvdCBJRCcgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNuYXBzaG90SWQyOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NlY29uZCBzbmFwc2hvdCBJRCcgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnc25hcHNob3RJZDEnLCAnc25hcHNob3RJZDInXSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnZ2V0X3NjZW5lX3N0YXRzJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NjZW5lIHN0YXRpc3RpY3M6IG5vZGUgY291bnQsIGNvbXBvbmVudCBjb3VudCwgaGllcmFyY2h5IGRlcHRoLCBjb21wb25lbnQgZGlzdHJpYnV0aW9uJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge30sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3ZhbGlkYXRlX3JlZmVyZW5jZXMnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVmVyaWZ5IGFsbCBhc3NldCByZWZlcmVuY2VzIGluIHRoZSBwcm9qZWN0IGV4aXN0IChjaGVjayBmb3IgYnJva2VuIHJlZmVyZW5jZXMpJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGF0dGVybjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCBwYXR0ZXJuIHRvIGNoZWNrIChkZWZhdWx0OiBkYjovL2Fzc2V0cy8qKi8qLiopJyB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICBdO1xuICAgIH1cblxuICAgIGFzeW5jIGV4ZWN1dGUoYWN0aW9uTmFtZTogc3RyaW5nLCBhcmdzOiBhbnkpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICBzd2l0Y2ggKGFjdGlvbk5hbWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ3ZhbGlkYXRlX3NjZW5lJzogICAgIHJldHVybiB0aGlzLnZhbGlkYXRlU2NlbmUoYXJncz8ubWF4RGVwdGgpO1xuICAgICAgICAgICAgY2FzZSAndmFsaWRhdGVfbm9kZSc6ICAgICAgcmV0dXJuIHRoaXMudmFsaWRhdGVOb2RlKGFyZ3M/LnV1aWQpO1xuICAgICAgICAgICAgY2FzZSAndmFsaWRhdGVfY29tcG9uZW50cyc6IHJldHVybiB0aGlzLnZhbGlkYXRlQ29tcG9uZW50cyhhcmdzPy5jb21wb25lbnRUeXBlKTtcbiAgICAgICAgICAgIGNhc2UgJ3Rha2Vfc25hcHNob3QnOiAgICAgIHJldHVybiB0aGlzLnRha2VTbmFwc2hvdChhcmdzPy5sYWJlbCk7XG4gICAgICAgICAgICBjYXNlICdjb21wYXJlX3NuYXBzaG90cyc6ICByZXR1cm4gdGhpcy5jb21wYXJlU25hcHNob3RzKGFyZ3M/LnNuYXBzaG90SWQxLCBhcmdzPy5zbmFwc2hvdElkMik7XG4gICAgICAgICAgICBjYXNlICdnZXRfc2NlbmVfc3RhdHMnOiAgICByZXR1cm4gdGhpcy5nZXRTY2VuZVN0YXRzKCk7XG4gICAgICAgICAgICBjYXNlICd2YWxpZGF0ZV9yZWZlcmVuY2VzJzogcmV0dXJuIHRoaXMudmFsaWRhdGVSZWZlcmVuY2VzKGFyZ3M/LnBhdHRlcm4pO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIHZhbGlkYXRpb24gYWN0aW9uOiAke2FjdGlvbk5hbWV9YCB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZVNjZW5lKG1heERlcHRoPzogbnVtYmVyKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xuICAgICAgICAgICAgICAgIG5hbWU6IHBhY2thZ2VKU09OLm5hbWUsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAndmFsaWRhdGVTY2VuZScsXG4gICAgICAgICAgICAgICAgYXJnczogW21heERlcHRoID8/IDEwXSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCBhcyBUb29sUmVzcG9uc2U7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZU5vZGUodXVpZDogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0Jywge1xuICAgICAgICAgICAgICAgIG5hbWU6IHBhY2thZ2VKU09OLm5hbWUsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAndmFsaWRhdGVOb2RlJyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbdXVpZF0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgYXMgVG9vbFJlc3BvbnNlO1xuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgdmFsaWRhdGVDb21wb25lbnRzKGNvbXBvbmVudFR5cGU/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogcGFja2FnZUpTT04ubmFtZSxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICd2YWxpZGF0ZUNvbXBvbmVudHMnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtjb21wb25lbnRUeXBlXSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCBhcyBUb29sUmVzcG9uc2U7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB0YWtlU25hcHNob3QobGFiZWw/OiBzdHJpbmcpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0OiBhbnkgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsIHtcbiAgICAgICAgICAgICAgICBuYW1lOiBwYWNrYWdlSlNPTi5uYW1lLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ2dldFNjZW5lU25hcHNob3QnLFxuICAgICAgICAgICAgICAgIGFyZ3M6IFtdLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGlmICghcmVzdWx0Py5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCBhcyBUb29sUmVzcG9uc2U7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHRoaXMuc25hcHNob3RDb3VudGVyKys7XG4gICAgICAgICAgICBjb25zdCBpZCA9IGBzbmFwc2hvdF8ke3RoaXMuc25hcHNob3RDb3VudGVyfWA7XG4gICAgICAgICAgICBjb25zdCBlbnRyeTogU25hcHNob3RFbnRyeSA9IHtcbiAgICAgICAgICAgICAgICBpZCxcbiAgICAgICAgICAgICAgICBsYWJlbDogbGFiZWwgfHwgYFNuYXBzaG90ICMke3RoaXMuc25hcHNob3RDb3VudGVyfWAsXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxuICAgICAgICAgICAgICAgIGRhdGE6IHJlc3VsdC5kYXRhLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHRoaXMuc25hcHNob3RzLnNldChpZCwgZW50cnkpO1xuXG4gICAgICAgICAgICAvLyBFdmljdCBvbGRlc3Qgc25hcHNob3RzIGlmIG92ZXIgbGltaXRcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnNuYXBzaG90cy5zaXplID4gVmFsaWRhdGlvblRvb2xzLk1BWF9TTkFQU0hPVFMpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvbGRlc3QgPSB0aGlzLnNuYXBzaG90cy5rZXlzKCkubmV4dCgpLnZhbHVlO1xuICAgICAgICAgICAgICAgIGlmIChvbGRlc3QpIHRoaXMuc25hcHNob3RzLmRlbGV0ZShvbGRlc3QpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogeyBzbmFwc2hvdElkOiBpZCwgbGFiZWw6IGVudHJ5LmxhYmVsLCBub2RlQ291bnQ6IHJlc3VsdC5kYXRhLm5vZGVDb3VudCB9LFxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBTbmFwc2hvdCB0YWtlbjogJHtlbnRyeS5sYWJlbH0gKCR7cmVzdWx0LmRhdGEubm9kZUNvdW50fSBub2RlcylgLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIGFzeW5jIGNvbXBhcmVTbmFwc2hvdHMoaWQxOiBzdHJpbmcsIGlkMjogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcbiAgICAgICAgY29uc3Qgc25hcDEgPSB0aGlzLnNuYXBzaG90cy5nZXQoaWQxKTtcbiAgICAgICAgY29uc3Qgc25hcDIgPSB0aGlzLnNuYXBzaG90cy5nZXQoaWQyKTtcblxuICAgICAgICBpZiAoIXNuYXAxKSByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBTbmFwc2hvdCBub3QgZm91bmQ6ICR7aWQxfWAgfTtcbiAgICAgICAgaWYgKCFzbmFwMikgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgU25hcHNob3Qgbm90IGZvdW5kOiAke2lkMn1gIH07XG5cbiAgICAgICAgY29uc3Qgbm9kZXMxID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKTtcbiAgICAgICAgY29uc3Qgbm9kZXMyID0gbmV3IE1hcDxzdHJpbmcsIGFueT4oKTtcblxuICAgICAgICBmb3IgKGNvbnN0IG4gb2Ygc25hcDEuZGF0YS5ub2Rlcykgbm9kZXMxLnNldChuLnV1aWQsIG4pO1xuICAgICAgICBmb3IgKGNvbnN0IG4gb2Ygc25hcDIuZGF0YS5ub2Rlcykgbm9kZXMyLnNldChuLnV1aWQsIG4pO1xuXG4gICAgICAgIGNvbnN0IGFkZGVkOiBhbnlbXSA9IFtdO1xuICAgICAgICBjb25zdCByZW1vdmVkOiBhbnlbXSA9IFtdO1xuICAgICAgICBjb25zdCBtb2RpZmllZDogYW55W10gPSBbXTtcblxuICAgICAgICAvLyBGaW5kIGFkZGVkIGFuZCBtb2RpZmllZFxuICAgICAgICBmb3IgKGNvbnN0IFt1dWlkLCBub2RlMl0gb2Ygbm9kZXMyKSB7XG4gICAgICAgICAgICBjb25zdCBub2RlMSA9IG5vZGVzMS5nZXQodXVpZCk7XG4gICAgICAgICAgICBpZiAoIW5vZGUxKSB7XG4gICAgICAgICAgICAgICAgYWRkZWQucHVzaCh7IHV1aWQsIG5hbWU6IG5vZGUyLm5hbWUgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNoYW5nZXM6IHN0cmluZ1tdID0gW107XG4gICAgICAgICAgICAgICAgaWYgKG5vZGUxLm5hbWUgIT09IG5vZGUyLm5hbWUpIGNoYW5nZXMucHVzaChgbmFtZTogJyR7bm9kZTEubmFtZX0nIOKGkiAnJHtub2RlMi5uYW1lfSdgKTtcbiAgICAgICAgICAgICAgICBpZiAobm9kZTEuYWN0aXZlICE9PSBub2RlMi5hY3RpdmUpIGNoYW5nZXMucHVzaChgYWN0aXZlOiAke25vZGUxLmFjdGl2ZX0g4oaSICR7bm9kZTIuYWN0aXZlfWApO1xuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShub2RlMS5wb3NpdGlvbikgIT09IEpTT04uc3RyaW5naWZ5KG5vZGUyLnBvc2l0aW9uKSkgY2hhbmdlcy5wdXNoKCdwb3NpdGlvbiBjaGFuZ2VkJyk7XG4gICAgICAgICAgICAgICAgaWYgKEpTT04uc3RyaW5naWZ5KG5vZGUxLnJvdGF0aW9uKSAhPT0gSlNPTi5zdHJpbmdpZnkobm9kZTIucm90YXRpb24pKSBjaGFuZ2VzLnB1c2goJ3JvdGF0aW9uIGNoYW5nZWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoSlNPTi5zdHJpbmdpZnkobm9kZTEuc2NhbGUpICE9PSBKU09OLnN0cmluZ2lmeShub2RlMi5zY2FsZSkpIGNoYW5nZXMucHVzaCgnc2NhbGUgY2hhbmdlZCcpO1xuICAgICAgICAgICAgICAgIGlmIChKU09OLnN0cmluZ2lmeShub2RlMS5jb21wb25lbnRzKSAhPT0gSlNPTi5zdHJpbmdpZnkobm9kZTIuY29tcG9uZW50cykpIGNoYW5nZXMucHVzaCgnY29tcG9uZW50cyBjaGFuZ2VkJyk7XG4gICAgICAgICAgICAgICAgaWYgKGNoYW5nZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBtb2RpZmllZC5wdXNoKHsgdXVpZCwgbmFtZTogbm9kZTIubmFtZSwgY2hhbmdlcyB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaW5kIHJlbW92ZWRcbiAgICAgICAgZm9yIChjb25zdCBbdXVpZCwgbm9kZTFdIG9mIG5vZGVzMSkge1xuICAgICAgICAgICAgaWYgKCFub2RlczIuaGFzKHV1aWQpKSB7XG4gICAgICAgICAgICAgICAgcmVtb3ZlZC5wdXNoKHsgdXVpZCwgbmFtZTogbm9kZTEubmFtZSB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgIHNuYXBzaG90MTogeyBpZDogaWQxLCBsYWJlbDogc25hcDEubGFiZWwsIHRpbWVzdGFtcDogc25hcDEudGltZXN0YW1wIH0sXG4gICAgICAgICAgICAgICAgc25hcHNob3QyOiB7IGlkOiBpZDIsIGxhYmVsOiBzbmFwMi5sYWJlbCwgdGltZXN0YW1wOiBzbmFwMi50aW1lc3RhbXAgfSxcbiAgICAgICAgICAgICAgICBhZGRlZCxcbiAgICAgICAgICAgICAgICByZW1vdmVkLFxuICAgICAgICAgICAgICAgIG1vZGlmaWVkLFxuICAgICAgICAgICAgICAgIHN1bW1hcnk6IGAke2FkZGVkLmxlbmd0aH0gYWRkZWQsICR7cmVtb3ZlZC5sZW5ndGh9IHJlbW92ZWQsICR7bW9kaWZpZWQubGVuZ3RofSBtb2RpZmllZGAsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH1cblxuICAgIHByaXZhdGUgYXN5bmMgZ2V0U2NlbmVTdGF0cygpOiBQcm9taXNlPFRvb2xSZXNwb25zZT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7XG4gICAgICAgICAgICAgICAgbmFtZTogcGFja2FnZUpTT04ubmFtZSxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICdnZXRTY2VuZVN0YXRzJyxcbiAgICAgICAgICAgICAgICBhcmdzOiBbXSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCBhcyBUb29sUmVzcG9uc2U7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBhc3luYyB2YWxpZGF0ZVJlZmVyZW5jZXMocGF0dGVybj86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hQYXR0ZXJuID0gcGF0dGVybiB8fCAnZGI6Ly9hc3NldHMvKiovKi4qJztcbiAgICAgICAgICAgIGNvbnN0IGFzc2V0czogYW55ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXRzJywgeyBwYXR0ZXJuOiBzZWFyY2hQYXR0ZXJuIH0pO1xuXG4gICAgICAgICAgICBpZiAoIWFzc2V0cyB8fCAhQXJyYXkuaXNBcnJheShhc3NldHMpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0b3RhbEFzc2V0czogMCwgdG90YWxSZWZlcmVuY2VzOiAwLCBicm9rZW5SZWZlcmVuY2VzOiBbXSwgdmFsaWQ6IHRydWUgfSB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCBicm9rZW5SZWZlcmVuY2VzOiBhbnlbXSA9IFtdO1xuICAgICAgICAgICAgbGV0IHRvdGFsUmVmZXJlbmNlcyA9IDA7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgYXNzZXQgb2YgYXNzZXRzKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVwczogYW55ID0gYXdhaXQgKEVkaXRvci5NZXNzYWdlLnJlcXVlc3QgYXMgYW55KSgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtZGVwZW5kZW5jaWVzJywgYXNzZXQudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXBzICYmIEFycmF5LmlzQXJyYXkoZGVwcykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZGVwVXVpZCBvZiBkZXBzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxSZWZlcmVuY2VzKys7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5mbyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LWluZm8nLCBkZXBVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpbmZvKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicm9rZW5SZWZlcmVuY2VzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0TmFtZTogYXNzZXQubmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhc3NldFV1aWQ6IGFzc2V0LnV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2luZ0RlcGVuZGVuY3k6IGRlcFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicm9rZW5SZWZlcmVuY2VzLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXROYW1lOiBhc3NldC5uYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXNzZXRVdWlkOiBhc3NldC51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWlzc2luZ0RlcGVuZGVuY3k6IGRlcFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgICAgICAvLyBTa2lwIGFzc2V0cyB0aGF0IGRvbid0IHN1cHBvcnQgZGVwZW5kZW5jeSBxdWVyaWVzXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICB0b3RhbEFzc2V0czogYXNzZXRzLmxlbmd0aCxcbiAgICAgICAgICAgICAgICAgICAgdG90YWxSZWZlcmVuY2VzLFxuICAgICAgICAgICAgICAgICAgICBicm9rZW5Db3VudDogYnJva2VuUmVmZXJlbmNlcy5sZW5ndGgsXG4gICAgICAgICAgICAgICAgICAgIGJyb2tlblJlZmVyZW5jZXMsXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkOiBicm9rZW5SZWZlcmVuY2VzLmxlbmd0aCA9PT0gMCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG59XG4iXX0=