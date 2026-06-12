/**
 * prefab 工具：預製體操作。
 * instantiate 走官方正規做法 create-node + assetUuid（取代舊版 runtime 實例化，
 * 具備完整編輯器簿記：undo / Hierarchy 同步 / PrefabInstance 記錄）。
 * 註：節點→prefab 資產（create_prefab）官方 3.8.4 無公開 message，暫不提供。
 */
import { normalizeCreateNodeResult } from '../adapters';
import { ToolDef } from '../types';
import { request, toUuid } from './helpers';

export function createPrefabTool(): ToolDef {
    return {
        name: 'prefab',
        description: 'Prefab operations: instantiate into the scene, restore instances, find instances.',
        actions: {
            instantiate: {
                description:
                    'Instantiate a prefab asset into the current scene (official create-node + assetUuid flow).',
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
                    const assetUuid = await toUuid(String(args.asset_uuid));
                    // createNodeFromAsset 需要 type 參數（CreateNodeOptions.type，實測必要）
                    const options: Record<string, any> = { assetUuid, type: 'cc.Prefab' };
                    if (args.parent) options.parent = String(args.parent);
                    if (args.name) options.name = String(args.name);
                    if (args.unlink_prefab) options.unlinkPrefab = true;
                    const result = await request('scene', 'create-node', options);
                    const uuid = normalizeCreateNodeResult(result);
                    if (!uuid) throw new Error('create-node (from prefab) returned no uuid');
                    if (args.position) {
                        await request('scene', 'set-property', {
                            uuid,
                            path: 'position',
                            dump: { value: args.position, type: 'cc.Vec3' },
                        });
                    }
                    return { uuid };
                },
            },
            restore: {
                description:
                    'Restore a prefab instance node to its prefab asset state (discard local overrides).',
                params: {
                    node_uuid: { type: 'string', description: 'Prefab instance root node uuid.' },
                },
                required: ['node_uuid'],
                handler: async (args) => {
                    await request('scene', 'restore-prefab', { uuid: String(args.node_uuid) });
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
                    const assetUuid = await toUuid(String(args.asset_uuid));
                    const uuids = await request('scene', 'query-nodes-by-asset-uuid', assetUuid);
                    return { uuids: Array.isArray(uuids) ? uuids : [] };
                },
            },
        },
    };
}
