"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeTool = createNodeTool;
/**
 * node 工具：節點操作。
 * 對應 message 簽名見 docs/api-reference/02-messages-scene.md §2/§3/§9。
 * 重點修復（相對舊版擴展）：
 * - rotation 的 dump 欄位名是 `rotation`（對應 eulerAngles），不是 `euler`
 * - create-node result 跨版正規化（3.8.4 string[] / 3.8.8 string）
 * - copy/paste 正確串接（copy-node 的回傳要傳給 paste-node 的 uuids）
 * - 兄弟順序調整走官方 move-array-element（對 parent 的 children path）
 */
const adapters_1 = require("../adapters");
const helpers_1 = require("./helpers");
function asArray(x) {
    return Array.isArray(x) ? x : [x];
}
async function setProperty(uuid, path, value, type) {
    const dump = { value };
    if (type)
        dump.type = type;
    return (0, helpers_1.request)('scene', 'set-property', { uuid, path, dump });
}
function createNodeTool() {
    return {
        name: 'node',
        description: 'Scene node operations: query tree, create/delete/duplicate, transform, parenting, generic property set. ' +
            'Node "rotation" is in euler angles (degrees).',
        actions: {
            query_tree: {
                description: 'Query the scene node tree (or a subtree). Returns name/uuid/type/childCount per node, depth-limited.',
                params: {
                    uuid: { type: 'string', description: 'Subtree root node uuid. Omit for the whole scene.' },
                    depth: { type: 'number', description: 'Max depth of children to include (default 5).' },
                },
                handler: async (args) => {
                    const raw = args.uuid
                        ? await (0, helpers_1.request)('scene', 'query-node-tree', String(args.uuid))
                        : await (0, helpers_1.request)('scene', 'query-node-tree');
                    const tree = (0, adapters_1.normalizeNodeTree)(raw);
                    const depth = typeof args.depth === 'number' ? args.depth : 5;
                    return (0, helpers_1.simplifyTree)(tree, depth);
                },
            },
            query: {
                description: 'Query full info of one node (transform, components list). Set raw=true for the unsimplified editor dump.',
                params: {
                    uuid: { type: 'string', description: 'Node uuid.' },
                    raw: { type: 'boolean', description: 'Return the full raw dump (verbose).' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    const dump = await (0, helpers_1.request)('scene', 'query-node', String(args.uuid));
                    if (!dump)
                        throw new Error(`Node not found: ${args.uuid}`);
                    return args.raw ? dump : (0, helpers_1.simplifyNode)(dump);
                },
            },
            create: {
                description: 'Create a node. Optionally instantiate from an asset (prefab/image/model via asset_uuid), ' +
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
                    const options = {};
                    if (args.name)
                        options.name = String(args.name);
                    if (args.parent)
                        options.parent = String(args.parent);
                    if (args.asset_uuid) {
                        options.assetUuid = String(args.asset_uuid);
                        // createNodeFromAsset 需要 type（資源的 cc 型別，實測必要）→ 自動查詢
                        const info = await (0, helpers_1.request)('asset-db', 'query-asset-info', options.assetUuid);
                        if (info && info.type)
                            options.type = String(info.type);
                    }
                    if (args.keep_world_transform)
                        options.keepWorldTransform = true;
                    if (args.unlink_prefab)
                        options.unlinkPrefab = true;
                    const result = await (0, helpers_1.request)('scene', 'create-node', options);
                    const uuid = (0, adapters_1.normalizeCreateNodeResult)(result);
                    if (!uuid)
                        throw new Error('create-node returned no uuid');
                    if (args.position) {
                        // CreateNodeOptions.position 在 3.8.4 對一般節點不生效（實測）→ 建立後補設
                        await setProperty(uuid, 'position', args.position, 'cc.Vec3');
                    }
                    const added = [];
                    if (Array.isArray(args.components)) {
                        for (const component of args.components) {
                            await (0, helpers_1.request)('scene', 'create-component', { uuid, component: String(component) });
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
                    await (0, helpers_1.request)('scene', 'remove-node', { uuid: args.uuid });
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
                    const moved = await (0, helpers_1.request)('scene', 'set-parent', {
                        parent: String(args.parent),
                        uuids: args.uuid,
                        keepWorldTransform: Boolean(args.keep_world_transform),
                    });
                    return { moved: moved !== null && moved !== void 0 ? moved : asArray(args.uuid) };
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
                    const uuids = await (0, helpers_1.request)('scene', 'duplicate-node', args.uuid);
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
                    const copied = await (0, helpers_1.request)('scene', 'copy-node', args.uuid);
                    const pasted = await (0, helpers_1.request)('scene', 'paste-node', {
                        target: String(args.target),
                        uuids: copied !== null && copied !== void 0 ? copied : args.uuid,
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
                    const dump = await (0, helpers_1.request)('scene', 'query-node', uuid);
                    if (!dump)
                        throw new Error(`Node not found: ${uuid}`);
                    const parentUuid = (0, helpers_1.extractUuid)(dump.parent);
                    if (!parentUuid)
                        throw new Error('Node has no parent (cannot reorder scene root)');
                    const parentDump = await (0, helpers_1.request)('scene', 'query-node', parentUuid);
                    const children = Array.isArray(parentDump === null || parentDump === void 0 ? void 0 : parentDump.children) ? parentDump.children : [];
                    const current = children.findIndex((c) => (0, helpers_1.extractUuid)(c) === uuid);
                    if (current < 0)
                        throw new Error('Node not found in parent children list');
                    const target = Math.max(0, Math.min(Number(args.index), children.length - 1));
                    if (target === current) {
                        return { index: current, moved: false };
                    }
                    await (0, helpers_1.request)('scene', 'move-array-element', {
                        uuid: parentUuid,
                        path: 'children',
                        target: current,
                        offset: target - current,
                    });
                    return { index: target, moved: true };
                },
            },
            set_transform: {
                description: 'Set node transform / common fields in one call: position, rotation (euler degrees), scale, active, layer.',
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
                    const applied = [];
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
                description: 'Set any node property by dump path (e.g. path="position", path="__comps__.0.spriteFrame"). ' +
                    'For asset/node references pass value={"uuid":"..."} with the cc type (e.g. value_type="cc.SpriteFrame").',
                params: {
                    uuid: { type: 'string', description: 'Node uuid.' },
                    path: { type: 'string', description: 'Property dump path.' },
                    value: { description: 'New value (bare value, {x,y,z}, {uuid}, {r,g,b,a}...).' },
                    value_type: { type: 'string', description: 'cc type name, e.g. cc.Vec3 / cc.Color / cc.SpriteFrame.' },
                },
                required: ['uuid', 'path', 'value'],
                handler: async (args) => {
                    const ok = await setProperty(String(args.uuid), String(args.path), args.value, args.value_type ? String(args.value_type) : undefined);
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
                    const ok = await (0, helpers_1.request)('scene', 'reset-property', {
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
                    await (0, helpers_1.request)('scene', 'reset-node', { uuid: args.uuid });
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
                    const uuids = await (0, helpers_1.request)('scene', 'query-nodes-by-asset-uuid', String(args.asset_uuid));
                    return { uuids: Array.isArray(uuids) ? uuids : [] };
                },
            },
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9ub2RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBdUJBLHdDQW1VQztBQTFWRDs7Ozs7Ozs7R0FRRztBQUNILDBDQUEyRTtBQUUzRSx1Q0FBNkU7QUFFN0UsU0FBUyxPQUFPLENBQUMsQ0FBb0I7SUFDakMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsQ0FBQztBQUVELEtBQUssVUFBVSxXQUFXLENBQUMsSUFBWSxFQUFFLElBQVksRUFBRSxLQUFVLEVBQUUsSUFBYTtJQUM1RSxNQUFNLElBQUksR0FBd0IsRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUM1QyxJQUFJLElBQUk7UUFBRSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUMzQixPQUFPLElBQUEsaUJBQU8sRUFBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ2xFLENBQUM7QUFFRCxTQUFnQixjQUFjO0lBQzFCLE9BQU87UUFDSCxJQUFJLEVBQUUsTUFBTTtRQUNaLFdBQVcsRUFDUCwwR0FBMEc7WUFDMUcsK0NBQStDO1FBQ25ELE9BQU8sRUFBRTtZQUNMLFVBQVUsRUFBRTtnQkFDUixXQUFXLEVBQ1Asc0dBQXNHO2dCQUMxRyxNQUFNLEVBQUU7b0JBQ0osSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsbURBQW1ELEVBQUU7b0JBQzFGLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLCtDQUErQyxFQUFFO2lCQUMxRjtnQkFDRCxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO29CQUNwQixNQUFNLEdB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RSxFQUFFLENBQUM7Z0JBQ3hELENBQUM7YUFDSjtTQUNKO0tBQ0osQ0FBQztBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIG5vZGUg5bel5YW377ya56+A6bue5pON5L2c44CCXG4gKiDlsI3mh4kgbWVzc2FnZSDnsL3lkI3oposgZG9jcy9hcGktcmVmZXJlbmNlLzAyLW1lc3NhZ2VzLXNjZW5lLm1kIMKnMi/CpzMvwqc544CCXG4gKiDph43pu57kv67lvqnvvIjnm7jlsI3oiIrniYjmk7TlsZXvvInvvJpcbiAqIC0gcm90YXRpb24g55qEIGR1bXAg5qyE5L2N5ZCN5pivIGByb3RhdGlvbmDvvIjlsI3mh4kgZXVsZXJBbmdsZXPvvInvvIzkuI3mmK8gYGV1bGVyYFxuICogLSBjcmVhdGUtbm9kZSByZXN1bHQg6Leo54mI5q2j6KaP5YyW77yIMy44LjQgc3RyaW5nW10gLyAzLjguOCBzdHJpbmfvvIlcbiAqIC0gY29weS9wYXN0ZSDmraPnorrkuLLmjqXvvIhjb3B5LW5vZGUg55qE5Zue5YKz6KaB5YKz57WmIHBhc3RlLW5vZGUg55qEIHV1aWRz77yJXG4gKiAtIOWFhOW8n+mghuW6j+iqv+aVtOi1sOWumOaWuSBtb3ZlLWFycmF5LWVsZW1lbnTvvIjlsI0gcGFyZW50IOeahCBjaGlsZHJlbiBwYXRo77yJXG4gKi9cbmltcG9ydCB7IG5vcm1hbGl6ZUNyZWF0ZU5vZGVSZXN1bHQsIG5vcm1hbGl6ZU5vZGVUcmVlIH0gZnJvbSAnLi4vYWRhcHRlcnMnO1xuaW1wb3J0IHsgVG9vbERlZiB9IGZyb20gJy4uL3R5cGVzJztcbmltcG9ydCB7IGV4dHJhY3RVdWlkLCByZXF1ZXN0LCBzaW1wbGlmeU5vZGUsIHNpbXBsaWZ5VHJlZSB9IGZyb20gJy4vaGVscGVycyc7XG5cbmZ1bmN0aW9uIGFzQXJyYXkoeDogc3RyaW5nIHwgc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkoeCkgPyB4IDogW3hdO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzZXRQcm9wZXJ0eSh1dWlkOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSwgdHlwZT86IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGR1bXA6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7IHZhbHVlIH07XG4gICAgaWYgKHR5cGUpIGR1bXAudHlwZSA9IHR5cGU7XG4gICAgcmV0dXJuIHJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wcm9wZXJ0eScsIHsgdXVpZCwgcGF0aCwgZHVtcCB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZU5vZGVUb29sKCk6IFRvb2xEZWYge1xuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6ICdub2RlJyxcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAnU2NlbmUgbm9kZSBvcGVyYXRpb25zOiBxdWVyeSB0cmVlLCBjcmVhdGUvZGVsZXRlL2R1cGxpY2F0ZSwgdHJhbnNmb3JtLCBwYXJlbnRpbmcsIGdlbmVyaWMgcHJvcGVydHkgc2V0LiAnICtcbiAgICAgICAgICAgICdOb2RlIFwicm90YXRpb25cIiBpcyBpbiBldWxlciBhbmdsZXMgKGRlZ3JlZXMpLicsXG4gICAgICAgIGFjdGlvbnM6IHtcbiAgICAgICAgICAgIHF1ZXJ5X3RyZWU6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ1F1ZXJ5IHRoZSBzY2VuZSBub2RlIHRyZWUgKG9yIGEgc3VidHJlZSkuIFJldHVybnMgbmFtZS91dWlkL3R5cGUvY2hpbGRDb3VudCBwZXIgbm9kZSwgZGVwdGgtbGltaXRlZC4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1N1YnRyZWUgcm9vdCBub2RlIHV1aWQuIE9taXQgZm9yIHRoZSB3aG9sZSBzY2VuZS4nIH0sXG4gICAgICAgICAgICAgICAgICAgIGRlcHRoOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ01heCBkZXB0aCBvZiBjaGlsZHJlbiB0byBpbmNsdWRlIChkZWZhdWx0IDUpLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJhdyA9IGFyZ3MudXVpZFxuICAgICAgICAgICAgICAgICAgICAgICAgPyBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlLXRyZWUnLCBTdHJpbmcoYXJncy51dWlkKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIDogYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZS10cmVlJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyZWUgPSBub3JtYWxpemVOb2RlVHJlZShyYXcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXB0aCA9IHR5cGVvZiBhcmdzLmRlcHRoID09PSAnbnVtYmVyJyA/IGFyZ3MuZGVwdGggOiA1O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2ltcGxpZnlUcmVlKHRyZWUsIGRlcHRoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHF1ZXJ5OiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICdRdWVyeSBmdWxsIGluZm8gb2Ygb25lIG5vZGUgKHRyYW5zZm9ybSwgY29tcG9uZW50cyBsaXN0KS4gU2V0IHJhdz10cnVlIGZvciB0aGUgdW5zaW1wbGlmaWVkIGVkaXRvciBkdW1wLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTm9kZSB1dWlkLicgfSxcbiAgICAgICAgICAgICAgICAgICAgcmF3OiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdSZXR1cm4gdGhlIGZ1bGwgcmF3IGR1bXAgKHZlcmJvc2UpLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBkdW1wID0gYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAncXVlcnktbm9kZScsIFN0cmluZyhhcmdzLnV1aWQpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkdW1wKSB0aHJvdyBuZXcgRXJyb3IoYE5vZGUgbm90IGZvdW5kOiAke2FyZ3MudXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFyZ3MucmF3ID8gZHVtcCA6IHNpbXBsaWZ5Tm9kZShkdW1wKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNyZWF0ZToge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICAnQ3JlYXRlIGEgbm9kZS4gT3B0aW9uYWxseSBpbnN0YW50aWF0ZSBmcm9tIGFuIGFzc2V0IChwcmVmYWIvaW1hZ2UvbW9kZWwgdmlhIGFzc2V0X3V1aWQpLCAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2F0dGFjaCBjb21wb25lbnRzLCBhbmQgc2V0IGluaXRpYWwgcG9zaXRpb24uJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOb2RlIG5hbWUuJyB9LFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUGFyZW50IG5vZGUgdXVpZC4gT21pdCBmb3Igc2NlbmUgcm9vdC4nIH0sXG4gICAgICAgICAgICAgICAgICAgIGFzc2V0X3V1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDcmVhdGUgZnJvbSB0aGlzIGFzc2V0IChwcmVmYWIvaW1hZ2UvbW9kZWwuLi4pLiBUaGlzIGlzIHRoZSBvZmZpY2lhbCB3YXkgdG8gaW5zdGFudGlhdGUgYSBwcmVmYWIuJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50czoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2FycmF5JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbXBvbmVudCBjbGFzcyBuYW1lcyB0byBhZGQgYWZ0ZXIgY3JlYXRpb24gKGUuZy4gW1wiY2MuU3ByaXRlXCJdKS4nLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0luaXRpYWwgcG9zaXRpb24ge3gseSx6fS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogeyB4OiB7IHR5cGU6ICdudW1iZXInIH0sIHk6IHsgdHlwZTogJ251bWJlcicgfSwgejogeyB0eXBlOiAnbnVtYmVyJyB9IH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGtlZXBfd29ybGRfdHJhbnNmb3JtOiB7IHR5cGU6ICdib29sZWFuJyB9LFxuICAgICAgICAgICAgICAgICAgICB1bmxpbmtfcHJlZmFiOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdVbmxpbmsgZnJvbSBwcmVmYWIgYWZ0ZXIgY3JlYXRpb24uJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9uczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5uYW1lKSBvcHRpb25zLm5hbWUgPSBTdHJpbmcoYXJncy5uYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MucGFyZW50KSBvcHRpb25zLnBhcmVudCA9IFN0cmluZyhhcmdzLnBhcmVudCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmFzc2V0X3V1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnMuYXNzZXRVdWlkID0gU3RyaW5nKGFyZ3MuYXNzZXRfdXVpZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBjcmVhdGVOb2RlRnJvbUFzc2V0IOmcgOimgSB0eXBl77yI6LOH5rqQ55qEIGNjIOWei+WIpe+8jOWvpua4rOW/heimge+8ieKGkiDoh6rli5Xmn6XoqaJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCByZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1pbmZvJywgb3B0aW9ucy5hc3NldFV1aWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGluZm8gJiYgaW5mby50eXBlKSBvcHRpb25zLnR5cGUgPSBTdHJpbmcoaW5mby50eXBlKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5rZWVwX3dvcmxkX3RyYW5zZm9ybSkgb3B0aW9ucy5rZWVwV29ybGRUcmFuc2Zvcm0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy51bmxpbmtfcHJlZmFiKSBvcHRpb25zLnVubGlua1ByZWZhYiA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ2NyZWF0ZS1ub2RlJywgb3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHV1aWQgPSBub3JtYWxpemVDcmVhdGVOb2RlUmVzdWx0KHJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghdXVpZCkgdGhyb3cgbmV3IEVycm9yKCdjcmVhdGUtbm9kZSByZXR1cm5lZCBubyB1dWlkJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLnBvc2l0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGVOb2RlT3B0aW9ucy5wb3NpdGlvbiDlnKggMy44LjQg5bCN5LiA6Iis56+A6bue5LiN55Sf5pWI77yI5a+m5ris77yJ4oaSIOW7uueri+W+jOijnOiorVxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHkodXVpZCwgJ3Bvc2l0aW9uJywgYXJncy5wb3NpdGlvbiwgJ2NjLlZlYzMnKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhZGRlZDogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkoYXJncy5jb21wb25lbnRzKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21wb25lbnQgb2YgYXJncy5jb21wb25lbnRzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAnY3JlYXRlLWNvbXBvbmVudCcsIHsgdXVpZCwgY29tcG9uZW50OiBTdHJpbmcoY29tcG9uZW50KSB9KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhZGRlZC5wdXNoKFN0cmluZyhjb21wb25lbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB1dWlkLCBjb21wb25lbnRzOiBhZGRlZCB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZGVsZXRlOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEZWxldGUgbm9kZShzKS4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBbJ3N0cmluZycsICdhcnJheSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnTm9kZSB1dWlkIG9yIGFycmF5IG9mIHV1aWRzLicsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAncmVtb3ZlLW5vZGUnLCB7IHV1aWQ6IGFyZ3MudXVpZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgZGVsZXRlZDogYXNBcnJheShhcmdzLnV1aWQpIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZW5hbWU6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlbmFtZSBhIG5vZGUuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOb2RlIHV1aWQuJyB9LFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05ldyBuYW1lLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnLCAnbmFtZSddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG9rID0gYXdhaXQgc2V0UHJvcGVydHkoU3RyaW5nKGFyZ3MudXVpZCksICduYW1lJywgU3RyaW5nKGFyZ3MubmFtZSksICdTdHJpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogQm9vbGVhbihvaykgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldF9wYXJlbnQ6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01vdmUgbm9kZShzKSB1bmRlciBhIG5ldyBwYXJlbnQuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogWydzdHJpbmcnLCAnYXJyYXknXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgdXVpZChzKSB0byBtb3ZlLicsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOZXcgcGFyZW50IG5vZGUgdXVpZC4nIH0sXG4gICAgICAgICAgICAgICAgICAgIGtlZXBfd29ybGRfdHJhbnNmb3JtOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdLZWVwIHdvcmxkIHRyYW5zZm9ybSAoZGVmYXVsdCBmYWxzZSkuJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCcsICdwYXJlbnQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb3ZlZCA9IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3NldC1wYXJlbnQnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IFN0cmluZyhhcmdzLnBhcmVudCksXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkczogYXJncy51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAga2VlcFdvcmxkVHJhbnNmb3JtOiBCb29sZWFuKGFyZ3Mua2VlcF93b3JsZF90cmFuc2Zvcm0pLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgbW92ZWQ6IG1vdmVkID8/IGFzQXJyYXkoYXJncy51dWlkKSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZHVwbGljYXRlOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEdXBsaWNhdGUgbm9kZShzKSBpbiBwbGFjZSAobGlrZSBDdHJsK0QpLiBSZXR1cm5zIG5ldyBub2RlIHV1aWRzLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IFsnc3RyaW5nJywgJ2FycmF5J10sXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtczogeyB0eXBlOiAnc3RyaW5nJyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdOb2RlIHV1aWQocykgdG8gZHVwbGljYXRlLicsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXVpZHMgPSBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdkdXBsaWNhdGUtbm9kZScsIGFyZ3MudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWRzOiBBcnJheS5pc0FycmF5KHV1aWRzKSA/IHV1aWRzIDogW3V1aWRzXS5maWx0ZXIoQm9vbGVhbikgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHBhc3RlOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb3B5IG5vZGUocykgYW5kIHBhc3RlIHRoZW0gdW5kZXIgYSB0YXJnZXQgbm9kZS4gUmV0dXJucyBuZXcgbm9kZSB1dWlkcy4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBbJ3N0cmluZycsICdhcnJheSddLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU291cmNlIG5vZGUgdXVpZChzKSB0byBjb3B5LicsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUYXJnZXQgcGFyZW50IG5vZGUgdXVpZC4nIH0sXG4gICAgICAgICAgICAgICAgICAgIGtlZXBfd29ybGRfdHJhbnNmb3JtOiB7IHR5cGU6ICdib29sZWFuJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCcsICd0YXJnZXQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBjb3B5LW5vZGUg5Zue5YKz55qEIHV1aWRzIOW/hemgiOWOn+aoo+WCs+e1piBwYXN0ZS1ub2Rl77yI6IiK54mI5pa36Y+I5L+u5b6p77yJXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvcGllZCA9IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ2NvcHktbm9kZScsIGFyZ3MudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhc3RlZCA9IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3Bhc3RlLW5vZGUnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IFN0cmluZyhhcmdzLnRhcmdldCksXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkczogY29waWVkID8/IGFyZ3MudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGtlZXBXb3JsZFRyYW5zZm9ybTogQm9vbGVhbihhcmdzLmtlZXBfd29ybGRfdHJhbnNmb3JtKSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWRzOiBBcnJheS5pc0FycmF5KHBhc3RlZCkgPyBwYXN0ZWQgOiBbcGFzdGVkXS5maWx0ZXIoQm9vbGVhbikgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1vdmVfc2libGluZzoge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ2hhbmdlIHRoZSBzaWJsaW5nIG9yZGVyIG9mIGEgbm9kZSB1bmRlciBpdHMgcGFyZW50IChtb3ZlIHRvIHRoZSBnaXZlbiBjaGlsZCBpbmRleCkuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOb2RlIHV1aWQuJyB9LFxuICAgICAgICAgICAgICAgICAgICBpbmRleDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdUYXJnZXQgY2hpbGQgaW5kZXggdW5kZXIgdGhlIHBhcmVudCAoMC1iYXNlZCkuJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCcsICdpbmRleCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHV1aWQgPSBTdHJpbmcoYXJncy51dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVtcCA9IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUnLCB1dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFkdW1wKSB0aHJvdyBuZXcgRXJyb3IoYE5vZGUgbm90IGZvdW5kOiAke3V1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudFV1aWQgPSBleHRyYWN0VXVpZChkdW1wLnBhcmVudCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGFyZW50VXVpZCkgdGhyb3cgbmV3IEVycm9yKCdOb2RlIGhhcyBubyBwYXJlbnQgKGNhbm5vdCByZW9yZGVyIHNjZW5lIHJvb3QpJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudER1bXAgPSBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1ub2RlJywgcGFyZW50VXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkcmVuOiBhbnlbXSA9IEFycmF5LmlzQXJyYXkocGFyZW50RHVtcD8uY2hpbGRyZW4pID8gcGFyZW50RHVtcC5jaGlsZHJlbiA6IFtdO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50ID0gY2hpbGRyZW4uZmluZEluZGV4KChjKSA9PiBleHRyYWN0VXVpZChjKSA9PT0gdXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50IDwgMCkgdGhyb3cgbmV3IEVycm9yKCdOb2RlIG5vdCBmb3VuZCBpbiBwYXJlbnQgY2hpbGRyZW4gbGlzdCcpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihOdW1iZXIoYXJncy5pbmRleCksIGNoaWxkcmVuLmxlbmd0aCAtIDEpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldCA9PT0gY3VycmVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgaW5kZXg6IGN1cnJlbnQsIG1vdmVkOiBmYWxzZSB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ21vdmUtYXJyYXktZWxlbWVudCcsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IHBhcmVudFV1aWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiAnY2hpbGRyZW4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiBjdXJyZW50LFxuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0OiB0YXJnZXQgLSBjdXJyZW50LFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgaW5kZXg6IHRhcmdldCwgbW92ZWQ6IHRydWUgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldF90cmFuc2Zvcm06IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ1NldCBub2RlIHRyYW5zZm9ybSAvIGNvbW1vbiBmaWVsZHMgaW4gb25lIGNhbGw6IHBvc2l0aW9uLCByb3RhdGlvbiAoZXVsZXIgZGVncmVlcyksIHNjYWxlLCBhY3RpdmUsIGxheWVyLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTm9kZSB1dWlkLicgfSxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogeyB4OiB7IHR5cGU6ICdudW1iZXInIH0sIHk6IHsgdHlwZTogJ251bWJlcicgfSwgejogeyB0eXBlOiAnbnVtYmVyJyB9IH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0aW9uOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRXVsZXIgYW5nbGVzIGluIGRlZ3JlZXMge3gseSx6fS4nLFxuICAgICAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczogeyB4OiB7IHR5cGU6ICdudW1iZXInIH0sIHk6IHsgdHlwZTogJ251bWJlcicgfSwgejogeyB0eXBlOiAnbnVtYmVyJyB9IH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNjYWxlOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHsgeDogeyB0eXBlOiAnbnVtYmVyJyB9LCB5OiB7IHR5cGU6ICdudW1iZXInIH0sIHo6IHsgdHlwZTogJ251bWJlcicgfSB9LFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IHsgdHlwZTogJ2Jvb2xlYW4nIH0sXG4gICAgICAgICAgICAgICAgICAgIGxheWVyOiB7IHR5cGU6ICdudW1iZXInIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXVpZCA9IFN0cmluZyhhcmdzLnV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcHBsaWVkOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5wb3NpdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgc2V0UHJvcGVydHkodXVpZCwgJ3Bvc2l0aW9uJywgYXJncy5wb3NpdGlvbiwgJ2NjLlZlYzMnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGxpZWQucHVzaCgncG9zaXRpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5yb3RhdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZHVtcCDmrITkvY3lkI3ngrogcm90YXRpb27vvIjlr6bpmpvmjIflkJEgZXVsZXJBbmdsZXPvvIlcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHNldFByb3BlcnR5KHV1aWQsICdyb3RhdGlvbicsIGFyZ3Mucm90YXRpb24sICdjYy5WZWMzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWVkLnB1c2goJ3JvdGF0aW9uJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3Muc2NhbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHNldFByb3BlcnR5KHV1aWQsICdzY2FsZScsIGFyZ3Muc2NhbGUsICdjYy5WZWMzJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWVkLnB1c2goJ3NjYWxlJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmdzLmFjdGl2ZSA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBzZXRQcm9wZXJ0eSh1dWlkLCAnYWN0aXZlJywgYXJncy5hY3RpdmUsICdCb29sZWFuJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBhcHBsaWVkLnB1c2goJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYXJncy5sYXllciA9PT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHNldFByb3BlcnR5KHV1aWQsICdsYXllcicsIGFyZ3MubGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwbGllZC5wdXNoKCdsYXllcicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcHBsaWVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyB0cmFuc2Zvcm0gZmllbGQgZ2l2ZW4gKHBvc2l0aW9uL3JvdGF0aW9uL3NjYWxlL2FjdGl2ZS9sYXllciknKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBhcHBsaWVkIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRfcHJvcGVydHk6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ1NldCBhbnkgbm9kZSBwcm9wZXJ0eSBieSBkdW1wIHBhdGggKGUuZy4gcGF0aD1cInBvc2l0aW9uXCIsIHBhdGg9XCJfX2NvbXBzX18uMC5zcHJpdGVGcmFtZVwiKS4gJyArXG4gICAgICAgICAgICAgICAgICAgICdGb3IgYXNzZXQvbm9kZSByZWZlcmVuY2VzIHBhc3MgdmFsdWU9e1widXVpZFwiOlwiLi4uXCJ9IHdpdGggdGhlIGNjIHR5cGUgKGUuZy4gdmFsdWVfdHlwZT1cImNjLlNwcml0ZUZyYW1lXCIpLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTm9kZSB1dWlkLicgfSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBkdW1wIHBhdGguJyB9LFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyBkZXNjcmlwdGlvbjogJ05ldyB2YWx1ZSAoYmFyZSB2YWx1ZSwge3gseSx6fSwge3V1aWR9LCB7cixnLGIsYX0uLi4pLicgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWVfdHlwZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdjYyB0eXBlIG5hbWUsIGUuZy4gY2MuVmVjMyAvIGNjLkNvbG9yIC8gY2MuU3ByaXRlRnJhbWUuJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCcsICdwYXRoJywgJ3ZhbHVlJ10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2sgPSBhd2FpdCBzZXRQcm9wZXJ0eShcbiAgICAgICAgICAgICAgICAgICAgICAgIFN0cmluZyhhcmdzLnV1aWQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgU3RyaW5nKGFyZ3MucGF0aCksXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy52YWx1ZV90eXBlID8gU3RyaW5nKGFyZ3MudmFsdWVfdHlwZSkgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IEJvb2xlYW4ob2spIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZXNldF9wcm9wZXJ0eToge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmVzZXQgYSBub2RlIHByb3BlcnR5IHRvIGl0cyBkZWZhdWx0IHZhbHVlLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTm9kZSB1dWlkLicgfSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQcm9wZXJ0eSBkdW1wIHBhdGguJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCcsICdwYXRoJ10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb2sgPSBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdyZXNldC1wcm9wZXJ0eScsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHV1aWQ6IFN0cmluZyhhcmdzLnV1aWQpLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogU3RyaW5nKGFyZ3MucGF0aCksXG4gICAgICAgICAgICAgICAgICAgICAgICBkdW1wOiB7IHZhbHVlOiBudWxsIH0sXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBCb29sZWFuKG9rKSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVzZXQ6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Jlc2V0IG5vZGUgcG9zaXRpb24vcm90YXRpb24vc2NhbGUgdG8gZGVmYXVsdHMuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogWydzdHJpbmcnLCAnYXJyYXknXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgdXVpZChzKS4nLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3Jlc2V0LW5vZGUnLCB7IHV1aWQ6IGFyZ3MudXVpZCB9KTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgcmVzZXQ6IGFzQXJyYXkoYXJncy51dWlkKSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcXVlcnlfYnlfYXNzZXQ6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZpbmQgYWxsIG5vZGVzIHRoYXQgdXNlIHRoZSBnaXZlbiBhc3NldCAodXVpZCkuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXRfdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCB1dWlkLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2Fzc2V0X3V1aWQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1dWlkcyA9IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGVzLWJ5LWFzc2V0LXV1aWQnLCBTdHJpbmcoYXJncy5hc3NldF91dWlkKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHV1aWRzOiBBcnJheS5pc0FycmF5KHV1aWRzKSA/IHV1aWRzIDogW10gfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICB9O1xufVxuIl19