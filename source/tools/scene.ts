/**
 * scene 工具：場景生命週期。
 * 對應 message 簽名見 docs/api-reference/02-messages-scene.md §1/§7/§9。
 */
import { buildSaveAsSceneArgs, normalizeNodeTree, normalizeSaveSceneResult } from '../adapters';
import { ToolDef } from '../types';
import { request, v } from './helpers';

export function createSceneTool(): ToolDef {
    return {
        name: 'scene',
        description: 'Scene lifecycle: open/save/close, dirty state and scene info.',
        actions: {
            query_ready: {
                description: 'Whether the scene editing process is ready to accept commands.',
                handler: async () => {
                    return { ready: Boolean(await request('scene', 'query-is-ready')) };
                },
            },
            query_current: {
                description: 'Get info about the currently open scene (root name/uuid, child count, dirty flag).',
                handler: async () => {
                    const tree = normalizeNodeTree(await request('scene', 'query-node-tree')) as any;
                    const dirty = Boolean(await request('scene', 'query-dirty'));
                    if (!tree) {
                        return { open: false, dirty };
                    }
                    return {
                        open: true,
                        name: v(tree.name) ?? tree.name,
                        uuid: v(tree.uuid) ?? tree.uuid,
                        type: tree.type ?? tree.__type__,
                        childCount: Array.isArray(tree.children) ? tree.children.length : 0,
                        dirty,
                    };
                },
            },
            open: {
                description: 'Open a scene by its asset uuid or db:// url.',
                params: {
                    uuid: { type: 'string', description: 'Scene asset uuid or db:// url.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    let uuid = String(args.uuid);
                    if (uuid.startsWith('db://')) {
                        const converted = await request('asset-db', 'query-uuid', uuid);
                        if (!converted) throw new Error(`Scene asset not found: ${uuid}`);
                        uuid = converted;
                    }
                    await request('scene', 'open-scene', uuid);
                    return { opened: uuid };
                },
            },
            save: {
                description: 'Save the currently open scene.',
                handler: async () => {
                    return normalizeSaveSceneResult(await request('scene', 'save-scene'));
                },
            },
            save_as: {
                description:
                    'Save the current scene as a new asset. WARNING: opens an interactive save dialog in the editor UI; prefer asset.copy for automation.',
                handler: async (_args, ctx) => {
                    const params = buildSaveAsSceneArgs(ctx.env.capabilities.saveAsSceneNeedsFlag);
                    return normalizeSaveSceneResult(await request('scene', 'save-as-scene', ...params));
                },
            },
            close: {
                description:
                    'Close the current scene. WARNING: if the scene has unsaved changes the editor may show a confirm dialog; call scene.save first.',
                handler: async () => {
                    return { closed: Boolean(await request('scene', 'close-scene')) };
                },
            },
            query_dirty: {
                description: 'Whether the current scene has unsaved modifications.',
                handler: async () => {
                    return { dirty: Boolean(await request('scene', 'query-dirty')) };
                },
            },
            query_bounds: {
                description: 'Bounding rect (x/y/width/height) of the current scene content.',
                handler: async () => {
                    return request('scene', 'query-scene-bounds');
                },
            },
            soft_reload: {
                description: 'Soft-reload the scene (re-apply scene data without restarting the scene process).',
                handler: async () => {
                    await request('scene', 'soft-reload');
                    return { reloaded: true };
                },
            },
        },
    };
}
