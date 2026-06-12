/**
 * component 工具：組件操作。
 * 對應 message 簽名見 docs/api-reference/02-messages-scene.md §4/§9。
 * 重點修復（相對舊版擴展）：
 * - remove/reset/execute_method 一律使用「組件 uuid」（舊版誤用節點 uuid）
 * - query-classes 必傳 { extends } 參數
 * - 組件可由 node_uuid + component（類名）或 index 解析，免去呼叫端自查 uuid
 */
import { ToolDef } from '../types';
import { componentsBrief, request, simplifyComponent } from './helpers';

interface ResolvedComponent {
    nodeUuid: string;
    index: number;
    type: string;
    uuid: string;
}

/** 由 node_uuid + component 類名（或 index）解析出組件 uuid */
async function resolveComponent(args: Record<string, any>): Promise<ResolvedComponent> {
    const nodeUuid = String(args.node_uuid ?? '');
    if (!nodeUuid) {
        throw new Error('node_uuid is required');
    }
    const dump = await request('scene', 'query-node', nodeUuid);
    if (!dump) throw new Error(`Node not found: ${nodeUuid}`);
    const comps = componentsBrief(dump);
    if (comps.length === 0) {
        throw new Error(`Node ${nodeUuid} has no components`);
    }
    let found;
    if (typeof args.index === 'number') {
        found = comps[args.index];
        if (!found) {
            throw new Error(`Component index ${args.index} out of range (0-${comps.length - 1})`);
        }
    } else if (args.component) {
        const name = String(args.component);
        found = comps.find((c) => c.type === name);
        if (!found) {
            throw new Error(
                `Component "${name}" not found on node. Available: ${comps.map((c) => c.type).join(', ')}`,
            );
        }
    } else {
        throw new Error('Provide either "component" (class name) or "index"');
    }
    if (!found.uuid) {
        throw new Error(`Cannot resolve uuid of component ${found.type}`);
    }
    return { nodeUuid, index: found.index, type: found.type, uuid: found.uuid };
}

const COMPONENT_LOCATOR_PARAMS: Record<string, unknown> = {
    node_uuid: { type: 'string', description: 'Node uuid that holds the component.' },
    component: { type: 'string', description: 'Component class name (e.g. cc.Sprite). Alternative to index.' },
    index: { type: 'number', description: 'Component index on the node (from component.list).' },
};

export function createComponentTool(): ToolDef {
    return {
        name: 'component',
        description:
            'Component operations on scene nodes. Locate a component by node_uuid + component class name (or index).',
        actions: {
            list: {
                description: 'List components on a node (index/type/uuid/enabled).',
                params: {
                    node_uuid: { type: 'string', description: 'Node uuid.' },
                },
                required: ['node_uuid'],
                handler: async (args) => {
                    const dump = await request('scene', 'query-node', String(args.node_uuid));
                    if (!dump) throw new Error(`Node not found: ${args.node_uuid}`);
                    return { components: componentsBrief(dump) };
                },
            },
            list_classes: {
                description:
                    'List registered component classes you can add (built-in and project scripts). Optionally filter by base class.',
                params: {
                    base: { type: 'string', description: 'Base class filter (default cc.Component).' },
                },
                handler: async (args) => {
                    const classes = await request('scene', 'query-classes', {
                        extends: args.base ? String(args.base) : 'cc.Component',
                        excludeSelf: true,
                    });
                    const names = (Array.isArray(classes) ? classes : [])
                        .map((c: any) => (typeof c === 'string' ? c : c?.name))
                        .filter(Boolean);
                    return { count: names.length, classes: names };
                },
            },
            add: {
                description: 'Add a component to a node by class name.',
                params: {
                    node_uuid: { type: 'string', description: 'Node uuid.' },
                    component: { type: 'string', description: 'Component class name (e.g. cc.Sprite or a script class).' },
                },
                required: ['node_uuid', 'component'],
                handler: async (args) => {
                    const nodeUuid = String(args.node_uuid);
                    await request('scene', 'create-component', {
                        uuid: nodeUuid,
                        component: String(args.component),
                    });
                    // create-component 跨版回傳不可依賴（boolean/void）→ 重查確認
                    const dump = await request('scene', 'query-node', nodeUuid);
                    const comps = componentsBrief(dump);
                    const added = comps.filter((c) => c.type === String(args.component)).pop();
                    if (!added) {
                        throw new Error(
                            `Component "${args.component}" was not added. Check the class name via component.list_classes.`,
                        );
                    }
                    return { added };
                },
            },
            remove: {
                description: 'Remove a component from a node.',
                params: COMPONENT_LOCATOR_PARAMS,
                required: ['node_uuid'],
                handler: async (args) => {
                    const comp = await resolveComponent(args);
                    await request('scene', 'remove-component', { uuid: comp.uuid });
                    return { removed: { type: comp.type, uuid: comp.uuid } };
                },
            },
            query: {
                description: 'Query a component\'s editable properties (values, types, enum options).',
                params: {
                    ...COMPONENT_LOCATOR_PARAMS,
                    raw: { type: 'boolean', description: 'Return the full raw dump (verbose).' },
                },
                required: ['node_uuid'],
                handler: async (args) => {
                    const comp = await resolveComponent(args);
                    const dump = await request('scene', 'query-component', comp.uuid);
                    if (!dump) throw new Error(`Component not found: ${comp.uuid}`);
                    return args.raw ? dump : { index: comp.index, ...simplifyComponent(dump) };
                },
            },
            set_property: {
                description:
                    'Set a component property. For asset/node references pass value={"uuid":"..."} with value_type ' +
                    '(e.g. cc.SpriteFrame). Property names come from component.query.',
                params: {
                    ...COMPONENT_LOCATOR_PARAMS,
                    property: { type: 'string', description: 'Property name (may be a dot path inside the component).' },
                    value: { description: 'New value.' },
                    value_type: { type: 'string', description: 'cc type name for references/value types.' },
                },
                required: ['node_uuid', 'property'],
                handler: async (args) => {
                    const comp = await resolveComponent(args);
                    const dump: Record<string, any> = { value: args.value };
                    if (args.value_type) dump.type = String(args.value_type);
                    const ok = await request('scene', 'set-property', {
                        uuid: comp.nodeUuid,
                        path: `__comps__.${comp.index}.${String(args.property)}`,
                        dump,
                    });
                    return { success: Boolean(ok), component: comp.type, property: args.property };
                },
            },
            reset: {
                description: 'Reset a component to its default values (official reset-component, keeps uuid & references).',
                params: COMPONENT_LOCATOR_PARAMS,
                required: ['node_uuid'],
                handler: async (args) => {
                    const comp = await resolveComponent(args);
                    await request('scene', 'reset-component', { uuid: comp.uuid });
                    return { reset: { type: comp.type, uuid: comp.uuid } };
                },
            },
            execute_method: {
                description:
                    'Execute a method on a component (runs in the editor scene process). Use with care.',
                params: {
                    ...COMPONENT_LOCATOR_PARAMS,
                    method: { type: 'string', description: 'Method name on the component.' },
                    args: { type: 'array', description: 'Arguments array (JSON-serializable).' },
                },
                required: ['node_uuid', 'method'],
                handler: async (args) => {
                    const comp = await resolveComponent(args);
                    const result = await request('scene', 'execute-component-method', {
                        uuid: comp.uuid,
                        name: String(args.method),
                        args: Array.isArray(args.args) ? args.args : [],
                    });
                    return { result: result === undefined ? null : result };
                },
            },
        },
    };
}
