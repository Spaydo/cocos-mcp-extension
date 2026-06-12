/**
 * node 工具：節點操作。
 * 對應 message 簽名見 docs/api-reference/02-messages-scene.md §2/§3/§9。
 * 重點修復（相對舊版擴展）：
 * - rotation 的 dump 欄位名是 `rotation`（對應 eulerAngles），不是 `euler`
 * - create-node result 跨版正規化（3.8.4 string[] / 3.8.8 string）
 * - copy/paste 正確串接（copy-node 的回傳要傳給 paste-node 的 uuids）
 * - 兄弟順序調整走官方 move-array-element（對 parent 的 children path）
 */
import { normalizeCreateNodeResult, normalizeNodeTree } from '../adapters';
import { ToolDef } from '../types';
import { extractUuid, request, simplifyNode, simplifyTree } from './helpers';

function asArray(x: string | string[]): string[] {
    return Array.isArray(x) ? x : [x];
}

async function setProperty(uuid: string, path: string, value: any, type?: string): Promise<boolean> {
    const dump: Record<string, any> = { value };
    if (type) dump.type = type;
    return request('scene', 'set-property', { uuid, path, dump });
}

export function createNodeTool(): ToolDef {
    return {
        name: 'node',
        description:
            'Scene node operations: query tree, create/delete/duplicate, transform, parenting, generic property set. ' +
            'Node "rotation" is in euler angles (degrees).',
        actions: {
            query_tree: {
                description:
                    'Query the scene node tree (or a subtree). Returns name/uuid/type/childCount per node, depth-limited.',
                params: {
                    uuid: { type: 'string', description: 'Subtree root node uuid. Omit for the whole scene.' },
                    depth: { type: 'number', description: 'Max depth of children to include (default 5).' },
                },
                handler: async (args) => {
                    const raw = args.uuid
                        ? await request('scene', 'query-node-tree', String(args.uuid))
                        : await request('scene', 'query-node-tree');
                    const tree = normalizeNodeTree(raw);
                    const depth = typeof args.depth === 'number' ? args.depth : 5;
                    return simplifyTree(tree, depth);
                },
            },
            query: {
                description:
                    'Query full info of one node (transform, components list). Set raw=true for the unsimplified editor dump.',
                params: {
                    uuid: { type: 'string', description: 'Node uuid.' },
                    raw: { type: 'boolean', description: 'Return the full raw dump (verbose).' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    const dump = await request('scene', 'query-node', String(args.uuid));
                    if (!dump) throw new Error(`Node not found: ${args.uuid}`);
                    return args.raw ? dump : simplifyNode(dump);
                },
            },
            create: {
                description:
                    'Create a node. Optionally instantiate from an asset (prefab/image/model via asset_uuid), ' +
                    'attach components, and set initial position.',
                params: {
                    name: { type: 'string', description: 'Node name.' },
                    parent: { type: 'string', description: 'Parent node uuid. Omit for scene root.' },
                    asset_uuid: {
                        type: 'string',
                        description: 'Create from this asset (prefab/image/model...). This is the official way to instantiate a prefab.',
                    },
                    components: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Component class names to add after creation (e.g. ["cc.Sprite"]).',
                    },
                    position: {
                        type: 'object',
                        description: 'Initial position {x,y,z}.',
                        properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                    },
                    keep_world_transform: { type: 'boolean' },
                    unlink_prefab: { type: 'boolean', description: 'Unlink from prefab after creation.' },
                },
                handler: async (args) => {
                    const options: Record<string, any> = {};
                    if (args.name) options.name = String(args.name);
                    if (args.parent) options.parent = String(args.parent);
                    if (args.asset_uuid) {
                        options.assetUuid = String(args.asset_uuid);
                        // createNodeFromAsset 需要 type（資源的 cc 型別，實測必要）→ 自動查詢
                        const info = await request('asset-db', 'query-asset-info', options.assetUuid);
                        if (info && info.type) options.type = String(info.type);
                    }
                    if (args.keep_world_transform) options.keepWorldTransform = true;
                    if (args.unlink_prefab) options.unlinkPrefab = true;
                    const result = await request('scene', 'create-node', options);
                    const uuid = normalizeCreateNodeResult(result);
                    if (!uuid) throw new Error('create-node returned no uuid');
                    if (args.position) {
                        // CreateNodeOptions.position 在 3.8.4 對一般節點不生效（實測）→ 建立後補設
                        await setProperty(uuid, 'position', args.position, 'cc.Vec3');
                    }
                    const added: string[] = [];
                    if (Array.isArray(args.components)) {
                        for (const component of args.components) {
                            await request('scene', 'create-component', { uuid, component: String(component) });
                            added.push(String(component));
                        }
                    }
                    return { uuid, components: added };
                },
            },
            delete: {
                description: 'Delete node(s).',
                params: {
                    uuid: {
                        type: ['string', 'array'],
                        items: { type: 'string' },
                        description: 'Node uuid or array of uuids.',
                    },
                },
                required: ['uuid'],
                handler: async (args) => {
                    await request('scene', 'remove-node', { uuid: args.uuid });
                    return { deleted: asArray(args.uuid) };
                },
            },
            rename: {
                description: 'Rename a node.',
                params: {
                    uuid: { type: 'string', description: 'Node uuid.' },
                    name: { type: 'string', description: 'New name.' },
                },
                required: ['uuid', 'name'],
                handler: async (args) => {
                    const ok = await setProperty(String(args.uuid), 'name', String(args.name), 'String');
                    return { success: Boolean(ok) };
                },
            },
            set_parent: {
                description: 'Move node(s) under a new parent.',
                params: {
                    uuid: {
                        type: ['string', 'array'],
                        items: { type: 'string' },
                        description: 'Node uuid(s) to move.',
                    },
                    parent: { type: 'string', description: 'New parent node uuid.' },
                    keep_world_transform: { type: 'boolean', description: 'Keep world transform (default false).' },
                },
                required: ['uuid', 'parent'],
                handler: async (args) => {
                    const moved = await request('scene', 'set-parent', {
                        parent: String(args.parent),
                        uuids: args.uuid,
                        keepWorldTransform: Boolean(args.keep_world_transform),
                    });
                    return { moved: moved ?? asArray(args.uuid) };
                },
            },
            duplicate: {
                description: 'Duplicate node(s) in place (like Ctrl+D). Returns new node uuids.',
                params: {
                    uuid: {
                        type: ['string', 'array'],
                        items: { type: 'string' },
                        description: 'Node uuid(s) to duplicate.',
                    },
                },
                required: ['uuid'],
                handler: async (args) => {
                    const uuids = await request('scene', 'duplicate-node', args.uuid);
                    return { uuids: Array.isArray(uuids) ? uuids : [uuids].filter(Boolean) };
                },
            },
            paste: {
                description: 'Copy node(s) and paste them under a target node. Returns new node uuids.',
                params: {
                    uuid: {
                        type: ['string', 'array'],
                        items: { type: 'string' },
                        description: 'Source node uuid(s) to copy.',
                    },
                    target: { type: 'string', description: 'Target parent node uuid.' },
                    keep_world_transform: { type: 'boolean' },
                },
                required: ['uuid', 'target'],
                handler: async (args) => {
                    // copy-node 回傳的 uuids 必須原樣傳給 paste-node（舊版斷鏈修復）
                    const copied = await request('scene', 'copy-node', args.uuid);
                    const pasted = await request('scene', 'paste-node', {
                        target: String(args.target),
                        uuids: copied ?? args.uuid,
                        keepWorldTransform: Boolean(args.keep_world_transform),
                    });
                    return { uuids: Array.isArray(pasted) ? pasted : [pasted].filter(Boolean) };
                },
            },
            move_sibling: {
                description: 'Change the sibling order of a node under its parent (move to the given child index).',
                params: {
                    uuid: { type: 'string', description: 'Node uuid.' },
                    index: { type: 'number', description: 'Target child index under the parent (0-based).' },
                },
                required: ['uuid', 'index'],
                handler: async (args) => {
                    const uuid = String(args.uuid);
                    const dump = await request('scene', 'query-node', uuid);
                    if (!dump) throw new Error(`Node not found: ${uuid}`);
                    const parentUuid = extractUuid(dump.parent);
                    if (!parentUuid) throw new Error('Node has no parent (cannot reorder scene root)');
                    const parentDump = await request('scene', 'query-node', parentUuid);
                    const children: any[] = Array.isArray(parentDump?.children) ? parentDump.children : [];
                    const current = children.findIndex((c) => extractUuid(c) === uuid);
                    if (current < 0) throw new Error('Node not found in parent children list');
                    const target = Math.max(0, Math.min(Number(args.index), children.length - 1));
                    if (target === current) {
                        return { index: current, moved: false };
                    }
                    await request('scene', 'move-array-element', {
                        uuid: parentUuid,
                        path: 'children',
                        target: current,
                        offset: target - current,
                    });
                    return { index: target, moved: true };
                },
            },
            set_transform: {
                description:
                    'Set node transform / common fields in one call: position, rotation (euler degrees), scale, active, layer.',
                params: {
                    uuid: { type: 'string', description: 'Node uuid.' },
                    position: {
                        type: 'object',
                        properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                    },
                    rotation: {
                        type: 'object',
                        description: 'Euler angles in degrees {x,y,z}.',
                        properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                    },
                    scale: {
                        type: 'object',
                        properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                    },
                    active: { type: 'boolean' },
                    layer: { type: 'number' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    const uuid = String(args.uuid);
                    const applied: string[] = [];
                    if (args.position) {
                        await setProperty(uuid, 'position', args.position, 'cc.Vec3');
                        applied.push('position');
                    }
                    if (args.rotation) {
                        // dump 欄位名為 rotation（實際指向 eulerAngles）
                        await setProperty(uuid, 'rotation', args.rotation, 'cc.Vec3');
                        applied.push('rotation');
                    }
                    if (args.scale) {
                        await setProperty(uuid, 'scale', args.scale, 'cc.Vec3');
                        applied.push('scale');
                    }
                    if (typeof args.active === 'boolean') {
                        await setProperty(uuid, 'active', args.active, 'Boolean');
                        applied.push('active');
                    }
                    if (typeof args.layer === 'number') {
                        await setProperty(uuid, 'layer', args.layer);
                        applied.push('layer');
                    }
                    if (applied.length === 0) {
                        throw new Error('No transform field given (position/rotation/scale/active/layer)');
                    }
                    return { applied };
                },
            },
            set_property: {
                description:
                    'Set any node property by dump path (e.g. path="position", path="__comps__.0.spriteFrame"). ' +
                    'For asset/node references pass value={"uuid":"..."} with the cc type (e.g. value_type="cc.SpriteFrame").',
                params: {
                    uuid: { type: 'string', description: 'Node uuid.' },
                    path: { type: 'string', description: 'Property dump path.' },
                    value: { description: 'New value (bare value, {x,y,z}, {uuid}, {r,g,b,a}...).' },
                    value_type: { type: 'string', description: 'cc type name, e.g. cc.Vec3 / cc.Color / cc.SpriteFrame.' },
                },
                required: ['uuid', 'path', 'value'],
                handler: async (args) => {
                    const ok = await setProperty(
                        String(args.uuid),
                        String(args.path),
                        args.value,
                        args.value_type ? String(args.value_type) : undefined,
                    );
                    return { success: Boolean(ok) };
                },
            },
            reset_property: {
                description: 'Reset a node property to its default value.',
                params: {
                    uuid: { type: 'string', description: 'Node uuid.' },
                    path: { type: 'string', description: 'Property dump path.' },
                },
                required: ['uuid', 'path'],
                handler: async (args) => {
                    const ok = await request('scene', 'reset-property', {
                        uuid: String(args.uuid),
                        path: String(args.path),
                        dump: { value: null },
                    });
                    return { success: Boolean(ok) };
                },
            },
            reset: {
                description: 'Reset node position/rotation/scale to defaults.',
                params: {
                    uuid: {
                        type: ['string', 'array'],
                        items: { type: 'string' },
                        description: 'Node uuid(s).',
                    },
                },
                required: ['uuid'],
                handler: async (args) => {
                    await request('scene', 'reset-node', { uuid: args.uuid });
                    return { reset: asArray(args.uuid) };
                },
            },
            query_by_asset: {
                description: 'Find all nodes that use the given asset (uuid).',
                params: {
                    asset_uuid: { type: 'string', description: 'Asset uuid.' },
                },
                required: ['asset_uuid'],
                handler: async (args) => {
                    const uuids = await request('scene', 'query-nodes-by-asset-uuid', String(args.asset_uuid));
                    return { uuids: Array.isArray(uuids) ? uuids : [] };
                },
            },
        },
    };
}
