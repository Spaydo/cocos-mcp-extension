/**
 * editor 工具：選取狀態、面板、日誌、場景腳本、事件輪詢。
 * - selection 用官方 Editor.Selection API
 * - logs 用 Editor.Logger.query()（protected 層，docs/api-reference/01）
 * - events_poll 用 Editor.Message.addBroadcastListener（protected API，標註實驗性；
 *   事件緩衝放在 global 單例上，dev.reload_tools 熱重載後不會遺失/重複註冊）
 */
import { ToolDef } from '../types';
import { request } from './helpers';

const PKG_NAME = 'cocos-mcp-extension';

// ---------- 事件緩衝（global 單例，跨熱重載存活） ----------

interface BufferedEvent {
    seq: number;
    channel: string;
    time: number;
    args: any[];
}

interface EventHub {
    seq: number;
    buffer: BufferedEvent[];
    handlers: Map<string, (...args: any[]) => void>;
    unavailable: boolean;
}

const DEFAULT_CHANNELS = [
    'scene:ready',
    'scene:close',
    'asset-db:asset-add',
    'asset-db:asset-change',
    'asset-db:asset-delete',
    'selection:select',
    'selection:unselect',
];

const MAX_BUFFER = 500;

function hub(): EventHub {
    const g = global as any;
    if (!g.__cocosMcpEventHub) {
        g.__cocosMcpEventHub = {
            seq: 0,
            buffer: [],
            handlers: new Map(),
            unavailable: false,
        } as EventHub;
    }
    return g.__cocosMcpEventHub as EventHub;
}

/** 確保監聽了指定頻道（重複呼叫安全）。回傳實際監聽中的頻道。 */
function ensureListening(channels: string[]): string[] {
    const h = hub();
    const addListener = (Editor.Message as any).addBroadcastListener;
    if (typeof addListener !== 'function') {
        h.unavailable = true;
        return [];
    }
    for (const channel of channels) {
        if (h.handlers.has(channel)) continue;
        const handler = (...args: any[]) => {
            h.buffer.push({ seq: ++h.seq, channel, time: Date.now(), args });
            if (h.buffer.length > MAX_BUFFER) {
                h.buffer.splice(0, h.buffer.length - MAX_BUFFER);
            }
        };
        try {
            addListener.call(Editor.Message, channel, handler);
            h.handlers.set(channel, handler);
        } catch (err) {
            console.warn(`[cocos-mcp] addBroadcastListener(${channel}) failed:`, err);
        }
    }
    return Array.from(h.handlers.keys());
}

// ---------- 工具定義 ----------

export function createEditorTool(): ToolDef {
    return {
        name: 'editor',
        description:
            'Editor-level operations: selection (Hierarchy/Assets), panels, console logs, ' +
            'scene-script execution and editor event polling.',
        actions: {
            selection_query: {
                description: 'Get currently selected node/asset uuids.',
                params: {
                    type: { type: 'string', enum: ['node', 'asset'], description: 'Limit to one type.' },
                },
                handler: async (args) => {
                    if (args.type) {
                        const type = String(args.type);
                        return { [type]: Editor.Selection.getSelected(type) };
                    }
                    return {
                        node: Editor.Selection.getSelected('node'),
                        asset: Editor.Selection.getSelected('asset'),
                        lastType: Editor.Selection.getLastSelectedType(),
                    };
                },
            },
            select: {
                description: 'Select element(s) in the editor (Hierarchy node or Assets asset).',
                params: {
                    type: { type: 'string', enum: ['node', 'asset'], description: 'Element type.' },
                    uuid: {
                        type: ['string', 'array'],
                        items: { type: 'string' },
                        description: 'Uuid(s) to select.',
                    },
                    additive: { type: 'boolean', description: 'Add to current selection instead of replacing it.' },
                },
                required: ['type', 'uuid'],
                handler: async (args) => {
                    const type = String(args.type);
                    const uuids: string[] = Array.isArray(args.uuid) ? args.uuid.map(String) : [String(args.uuid)];
                    if (args.additive) {
                        Editor.Selection.select(type, uuids);
                    } else {
                        Editor.Selection.update(type, uuids);
                    }
                    return { selected: Editor.Selection.getSelected(type) };
                },
            },
            unselect: {
                description: 'Unselect element(s); omit uuid to clear the whole selection of that type.',
                params: {
                    type: { type: 'string', enum: ['node', 'asset'], description: 'Element type.' },
                    uuid: {
                        type: ['string', 'array'],
                        items: { type: 'string' },
                        description: 'Uuid(s) to unselect. Omit to clear all.',
                    },
                },
                required: ['type'],
                handler: async (args) => {
                    const type = String(args.type);
                    if (args.uuid) {
                        Editor.Selection.unselect(type, args.uuid);
                    } else {
                        Editor.Selection.clear(type);
                    }
                    return { selected: Editor.Selection.getSelected(type) };
                },
            },
            panel_open: {
                description:
                    'Open an editor panel. Common names: console, assets, hierarchy, inspector, scene, ' +
                    'or "<package>.<panel>" for extension panels.',
                params: {
                    panel: { type: 'string', description: 'Panel name.' },
                },
                required: ['panel'],
                handler: async (args) => {
                    await Editor.Panel.open(String(args.panel) as any);
                    return { opened: String(args.panel) };
                },
            },
            logs: {
                description:
                    'Query editor console logs (newest last). Filter by type/keyword, paginate with limit. ' +
                    'Useful for reading script compile errors and runtime warnings.',
                params: {
                    type: {
                        type: 'string',
                        enum: ['log', 'info', 'warn', 'error'],
                        description: 'Only this log level.',
                    },
                    contains: { type: 'string', description: 'Only messages containing this substring.' },
                    limit: { type: 'number', description: 'Max entries to return, taken from the end (default 50).' },
                    include_stack: { type: 'boolean', description: 'Include stack traces (verbose).' },
                    since_time: { type: 'number', description: 'Only logs with time >= this (ms timestamp).' },
                },
                handler: async (args) => {
                    const all: any[] = (Editor.Logger as any).query() ?? [];
                    let filtered = all;
                    if (args.type) filtered = filtered.filter((l) => l.type === args.type);
                    if (args.contains) {
                        const kw = String(args.contains);
                        filtered = filtered.filter((l) => String(l.message ?? '').includes(kw));
                    }
                    if (typeof args.since_time === 'number') {
                        filtered = filtered.filter((l) => Number(l.time) >= args.since_time);
                    }
                    const limit = typeof args.limit === 'number' ? args.limit : 50;
                    const slice = filtered.slice(-limit);
                    return {
                        total: filtered.length,
                        returned: slice.length,
                        logs: slice.map((l) => ({
                            type: l.type,
                            time: l.time,
                            message: String(l.message ?? '').slice(0, 2000),
                            ...(args.include_stack && l.stack ? { stack: String(l.stack).slice(0, 2000) } : {}),
                        })),
                    };
                },
            },
            logs_clear: {
                description: 'Clear the editor console logs.',
                handler: async () => {
                    (Editor.Logger as any).clear();
                    return { cleared: true };
                },
            },
            execute_scene_script: {
                description:
                    'Execute a whitelisted method of this extension\'s scene script inside the scene process ' +
                    '(runs with full cc engine access). Available methods: queryEngineInfo.',
                params: {
                    method: { type: 'string', description: 'Scene script method name.' },
                    args: { type: 'array', description: 'Arguments array (JSON-serializable).' },
                },
                required: ['method'],
                handler: async (args) => {
                    const result = await request('scene', 'execute-scene-script', {
                        name: PKG_NAME,
                        method: String(args.method),
                        args: Array.isArray(args.args) ? args.args : [],
                    });
                    return { result: result === undefined ? null : result };
                },
            },
            events_poll: {
                description:
                    '[experimental] Poll buffered editor broadcast events (scene:ready, asset-db:asset-add/change/delete, ' +
                    'selection changes...). First call starts listening; pass since=lastSeq to get only new events.',
                params: {
                    channels: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Extra broadcast channels to listen to (defaults always included).',
                    },
                    since: { type: 'number', description: 'Only events with seq > since.' },
                    limit: { type: 'number', description: 'Max events to return (default 100).' },
                },
                handler: async (args) => {
                    const extra = Array.isArray(args.channels) ? args.channels.map(String) : [];
                    const listening = ensureListening([...DEFAULT_CHANNELS, ...extra]);
                    const h = hub();
                    if (h.unavailable) {
                        throw new Error(
                            'Editor.Message.addBroadcastListener is not available in this editor version',
                        );
                    }
                    const since = typeof args.since === 'number' ? args.since : 0;
                    const limit = typeof args.limit === 'number' ? args.limit : 100;
                    const events = h.buffer.filter((e) => e.seq > since).slice(-limit);
                    return { lastSeq: h.seq, listening, events };
                },
            },
        },
    };
}
