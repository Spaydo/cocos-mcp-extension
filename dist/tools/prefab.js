"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPrefabTool = createPrefabTool;
/**
 * prefab 工具：預製體操作。
 * instantiate 走官方正規做法 create-node + assetUuid（取代舊版 runtime 實例化，
 * 具備完整編輯器簿記：undo / Hierarchy 同步 / PrefabInstance 記錄）。
 * 註：節點→prefab 資產（create_prefab）官方 3.8.4 無公開 message，暫不提供。
 */
const adapters_1 = require("../adapters");
const helpers_1 = require("./helpers");
function createPrefabTool() {
    return {
        name: 'prefab',
        description: 'Prefab operations: instantiate into the scene, restore instances, find instances.',
        actions: {
            instantiate: {
                description: 'Instantiate a prefab asset into the current scene (official create-node + assetUuid flow).',
                params: {
                    asset_uuid: { type: 'string', description: 'Prefab asset uuid or db:// url.' },
                    parent: { type: 'string', description: 'Parent node uuid. Omit for scene root.' },
                    name: { type: 'string', description: 'Override node name.' },
                    position: {
                        type: 'object',
                        description: 'Initial position {x,y,z}.',
                        properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                    },
                    unlink_prefab: { type: 'boolean', description: 'Unlink from prefab after instantiation.' },
                },
                required: ['asset_uuid'],
                handler: async (args) => {
                    const assetUuid = await (0, helpers_1.toUuid)(String(args.asset_uuid));
                    // createNodeFromAsset 需要 type 參數（CreateNodeOptions.type，實測必要）
                    const options = { assetUuid, type: 'cc.Prefab' };
                    if (args.parent)
                        options.parent = String(args.parent);
                    if (args.name)
                        options.name = String(args.name);
                    if (args.unlink_prefab)
                        options.unlinkPrefab = true;
                    const result = await (0, helpers_1.request)('scene', 'create-node', options);
                    const uuid = (0, adapters_1.normalizeCreateNodeResult)(result);
                    if (!uuid)
                        throw new Error('create-node (from prefab) returned no uuid');
                    if (args.position) {
                        await (0, helpers_1.request)('scene', 'set-property', {
                            uuid,
                            path: 'position',
                            dump: { value: args.position, type: 'cc.Vec3' },
                        });
                    }
                    return { uuid };
                },
            },
            restore: {
                description: 'Restore a prefab instance node to its prefab asset state (discard local overrides).',
                params: {
                    node_uuid: { type: 'string', description: 'Prefab instance root node uuid.' },
                },
                required: ['node_uuid'],
                handler: async (args) => {
                    await (0, helpers_1.request)('scene', 'restore-prefab', { uuid: String(args.node_uuid) });
                    return { restored: String(args.node_uuid) };
                },
            },
            query_instances: {
                description: 'Find all scene nodes that use the given prefab (or any asset).',
                params: {
                    asset_uuid: { type: 'string', description: 'Prefab/asset uuid or db:// url.' },
                },
                required: ['asset_uuid'],
                handler: async (args) => {
                    const assetUuid = await (0, helpers_1.toUuid)(String(args.asset_uuid));
                    const uuids = await (0, helpers_1.request)('scene', 'query-nodes-by-asset-uuid', assetUuid);
                    return { uuids: Array.isArray(uuids) ? uuids : [] };
                },
            },
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmFiLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc291cmNlL3Rvb2xzL3ByZWZhYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQVVBLDRDQWtFQztBQTVFRDs7Ozs7R0FLRztBQUNILDBDQUF3RDtBQUV4RCx1Q0FBNEM7QUFFNUMsU0FBZ0IsZ0JBQWdCO0lBQzVCLE9BQU87UUFDSCxJQUFJLEVBQUUsUUFBUTtRQUNkLFdBQVcsRUFBRSxtRkFBbUY7UUFDaEcsT0FBTyxFQUFFO1lBQ0wsV0FBVyxFQUFFO2dCQUNULFdBQVcsRUFDUCw0RkFBNEY7Z0JBQ2hHLE1BQU0sRUFBRTtvQkFDSixVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxpQ0FBaUMsRUFBRTtvQkFDOUUsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsd0NBQXdDLEVBQUU7b0JBQ2pGLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHFCQUFxQixFQUFFO29CQUM1RCxRQUFRLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFFBQVE7d0JBQ2QsV0FBVyxFQUFFLDJCQUEyQjt3QkFDeEMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUU7cUJBQ3RGO29CQUNELGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLHlDQUF5QyxFQUFFO2lCQUM3RjtnQkFDRCxRQUFRLEVBQUUsQ0FBQyxZQUFZLENBQUM7Z0JBQ3hCLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7b0JBQ3BCLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDeEQsOERBQThEO29CQUM5RCxNQUFNLE9BQU8sR0FBd0IsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxDQUFDO29CQUN0RSxJQUFJLElBQUksQ0FBQyxNQUFNO3dCQUFFLE9BQU8sQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDdEQsSUFBSSxJQUFJLENBQUMsSUFBSTt3QkFBRSxPQUFPLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2hELElBQUksSUFBSSxDQUFDLGFBQWE7d0JBQUUsT0FBTyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7b0JBQ3BELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxpQkFBTyxFQUFDLE9BQU8sRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzlELE1BQU0sSUFBSSxHQUFHLElBQUEsb0NBQXlCLEVBQUMsTUFBTSxDQUFDLENBQUM7b0JBQy9DLElBQUksQ0FBQyxJQUFJO3dCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQztvQkFDekUsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQ2hCLE1BQU0sSUFBQSxpQkFBTyxFQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUU7NEJBQ25DLElBQUk7NEJBQ0osSUFBSSxFQUFFLFVBQVU7NEJBQ2hCLElBQUksRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUU7eUJBQ2xELENBQUMsQ0FBQztvQkFDUCxDQUFDO29CQUNELE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztnQkFDcEIsQ0FBQzthQUNKO1lBQ0QsT0FBTyxFQUFFO2dCQUNMLFdBQVcsRUFDUCxxRkFBcUY7Z0JBQ3pGLE1BQU0sRUFBRTtvQkFDSixTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxpQ0FBaUMsRUFBRTtpQkFDaEY7Z0JBQ0QsUUFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO2dCQUN2QixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO29CQUNwQixNQUFNLElBQUEsaUJBQU8sRUFBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUNoRCxDQUFDO2FBQ0o7WUFDRCxlQUFlLEVBQUU7Z0JBQ2IsV0FBVyxFQUFFLGdFQUFnRTtnQkFDN0UsTUFBTSxFQUFFO29CQUNKLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLGlDQUFpQyxFQUFFO2lCQUNqRjtnQkFDRCxRQUFRLEVBQUUsQ0FBQyxZQUFZLENBQUM7Z0JBQ3hCLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7b0JBQ3BCLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDeEQsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFBLGlCQUFPLEVBQUMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3hELENBQUM7YUFDSjtTQUNKO0tBQ0osQ0FBQztBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIHByZWZhYiDlt6XlhbfvvJrpoJDoo73pq5Tmk43kvZzjgIJcbiAqIGluc3RhbnRpYXRlIOi1sOWumOaWueato+imj+WBmuazlSBjcmVhdGUtbm9kZSArIGFzc2V0VXVpZO+8iOWPluS7o+iIiueJiCBydW50aW1lIOWvpuS+i+WMlu+8jFxuICog5YW35YKZ5a6M5pW057eo6Lyv5Zmo57C/6KiY77yadW5kbyAvIEhpZXJhcmNoeSDlkIzmraUgLyBQcmVmYWJJbnN0YW5jZSDoqJjpjITvvInjgIJcbiAqIOiou++8muevgOm7nuKGknByZWZhYiDos4fnlKLvvIhjcmVhdGVfcHJlZmFi77yJ5a6Y5pa5IDMuOC40IOeEoeWFrOmWiyBtZXNzYWdl77yM5pqr5LiN5o+Q5L6b44CCXG4gKi9cbmltcG9ydCB7IG5vcm1hbGl6ZUNyZWF0ZU5vZGVSZXN1bHQgfSBmcm9tICcuLi9hZGFwdGVycyc7XG5pbXBvcnQgeyBUb29sRGVmIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgcmVxdWVzdCwgdG9VdWlkIH0gZnJvbSAnLi9oZWxwZXJzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByZWZhYlRvb2woKTogVG9vbERlZiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogJ3ByZWZhYicsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUHJlZmFiIG9wZXJhdGlvbnM6IGluc3RhbnRpYXRlIGludG8gdGhlIHNjZW5lLCByZXN0b3JlIGluc3RhbmNlcywgZmluZCBpbnN0YW5jZXMuJyxcbiAgICAgICAgYWN0aW9uczoge1xuICAgICAgICAgICAgaW5zdGFudGlhdGU6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ0luc3RhbnRpYXRlIGEgcHJlZmFiIGFzc2V0IGludG8gdGhlIGN1cnJlbnQgc2NlbmUgKG9mZmljaWFsIGNyZWF0ZS1ub2RlICsgYXNzZXRVdWlkIGZsb3cpLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGFzc2V0X3V1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJlZmFiIGFzc2V0IHV1aWQgb3IgZGI6Ly8gdXJsLicgfSxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1BhcmVudCBub2RlIHV1aWQuIE9taXQgZm9yIHNjZW5lIHJvb3QuJyB9LFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ092ZXJyaWRlIG5vZGUgbmFtZS4nIH0sXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5pdGlhbCBwb3NpdGlvbiB7eCx5LHp9LicsXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7IHg6IHsgdHlwZTogJ251bWJlcicgfSwgeTogeyB0eXBlOiAnbnVtYmVyJyB9LCB6OiB7IHR5cGU6ICdudW1iZXInIH0gfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdW5saW5rX3ByZWZhYjogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnVW5saW5rIGZyb20gcHJlZmFiIGFmdGVyIGluc3RhbnRpYXRpb24uJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnYXNzZXRfdXVpZCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFzc2V0VXVpZCA9IGF3YWl0IHRvVXVpZChTdHJpbmcoYXJncy5hc3NldF91dWlkKSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIGNyZWF0ZU5vZGVGcm9tQXNzZXQg6ZyA6KaBIHR5cGUg5Y+D5pW477yIQ3JlYXRlTm9kZU9wdGlvbnMudHlwZe+8jOWvpua4rOW/heimge+8iVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0geyBhc3NldFV1aWQsIHR5cGU6ICdjYy5QcmVmYWInIH07XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLnBhcmVudCkgb3B0aW9ucy5wYXJlbnQgPSBTdHJpbmcoYXJncy5wYXJlbnQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5uYW1lKSBvcHRpb25zLm5hbWUgPSBTdHJpbmcoYXJncy5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MudW5saW5rX3ByZWZhYikgb3B0aW9ucy51bmxpbmtQcmVmYWIgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdjcmVhdGUtbm9kZScsIG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1dWlkID0gbm9ybWFsaXplQ3JlYXRlTm9kZVJlc3VsdChyZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXV1aWQpIHRocm93IG5ldyBFcnJvcignY3JlYXRlLW5vZGUgKGZyb20gcHJlZmFiKSByZXR1cm5lZCBubyB1dWlkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLnBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdzZXQtcHJvcGVydHknLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiAncG9zaXRpb24nLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGR1bXA6IHsgdmFsdWU6IGFyZ3MucG9zaXRpb24sIHR5cGU6ICdjYy5WZWMzJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdXVpZCB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVzdG9yZToge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICAnUmVzdG9yZSBhIHByZWZhYiBpbnN0YW5jZSBub2RlIHRvIGl0cyBwcmVmYWIgYXNzZXQgc3RhdGUgKGRpc2NhcmQgbG9jYWwgb3ZlcnJpZGVzKS4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBub2RlX3V1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJlZmFiIGluc3RhbmNlIHJvb3Qgbm9kZSB1dWlkLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ25vZGVfdXVpZCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3Jlc3RvcmUtcHJlZmFiJywgeyB1dWlkOiBTdHJpbmcoYXJncy5ub2RlX3V1aWQpIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyByZXN0b3JlZDogU3RyaW5nKGFyZ3Mubm9kZV91dWlkKSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcXVlcnlfaW5zdGFuY2VzOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaW5kIGFsbCBzY2VuZSBub2RlcyB0aGF0IHVzZSB0aGUgZ2l2ZW4gcHJlZmFiIChvciBhbnkgYXNzZXQpLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGFzc2V0X3V1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUHJlZmFiL2Fzc2V0IHV1aWQgb3IgZGI6Ly8gdXJsLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2Fzc2V0X3V1aWQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhc3NldFV1aWQgPSBhd2FpdCB0b1V1aWQoU3RyaW5nKGFyZ3MuYXNzZXRfdXVpZCkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1dWlkcyA9IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGVzLWJ5LWFzc2V0LXV1aWQnLCBhc3NldFV1aWQpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkczogQXJyYXkuaXNBcnJheSh1dWlkcykgPyB1dWlkcyA6IFtdIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgfTtcbn1cbiJdfQ==