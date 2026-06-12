/**
 * scene_view 工具：場景視圖（gizmo / 視角 / 顯示）控制。
 * 全部使用官方正確 message 名（docs/api-reference/02 §8；舊版擴展此類別幾乎全部叫錯名稱）。
 * 注意官方語意是 is2D（舊版的 is3D 語意相反）。
 */
import { ToolDef } from '../types';
import { request } from './helpers';

export function createSceneViewTool(): ToolDef {
    return {
        name: 'scene_view',
        description:
            'Scene view controls: gizmo tool/pivot/coordinate, 2D/3D mode, grid, icon gizmos, camera focus/align.',
        actions: {
            query_state: {
                description: 'Query all scene view states at once (tool, pivot, coordinate, 2D mode, grid, icon gizmo).',
                handler: async () => {
                    const [tool, pivot, coordinate, is2D, gridVisible, iconGizmo3d, iconGizmoSize] =
                        await Promise.all([
                            request('scene', 'query-gizmo-tool-name'),
                            request('scene', 'query-gizmo-pivot'),
                            request('scene', 'query-gizmo-coordinate'),
                            request('scene', 'query-is2D'),
                            request('scene', 'query-is-grid-visible'),
                            request('scene', 'query-is-icon-gizmo-3d'),
                            request('scene', 'query-icon-gizmo-size'),
                        ]);
                    return { tool, pivot, coordinate, is2D, gridVisible, iconGizmo3d, iconGizmoSize };
                },
            },
            set_tool: {
                description: 'Switch the gizmo transform tool.',
                params: {
                    tool: {
                        type: 'string',
                        enum: ['position', 'rotation', 'scale', 'rect'],
                        description: 'Gizmo tool name.',
                    },
                },
                required: ['tool'],
                handler: async (args) => {
                    await request('scene', 'change-gizmo-tool', String(args.tool));
                    return { tool: await request('scene', 'query-gizmo-tool-name') };
                },
            },
            set_pivot: {
                description: 'Switch the gizmo pivot mode.',
                params: {
                    pivot: { type: 'string', enum: ['pivot', 'center'], description: 'Pivot mode.' },
                },
                required: ['pivot'],
                handler: async (args) => {
                    await request('scene', 'change-gizmo-pivot', String(args.pivot));
                    return { pivot: await request('scene', 'query-gizmo-pivot') };
                },
            },
            set_coordinate: {
                description: 'Switch the gizmo coordinate system.',
                params: {
                    coordinate: { type: 'string', enum: ['local', 'global'], description: 'Coordinate system.' },
                },
                required: ['coordinate'],
                handler: async (args) => {
                    await request('scene', 'change-gizmo-coordinate', String(args.coordinate));
                    return { coordinate: await request('scene', 'query-gizmo-coordinate') };
                },
            },
            set_2d: {
                description: 'Switch the scene view between 2D and 3D editing mode.',
                params: {
                    is2d: { type: 'boolean', description: 'true = 2D mode, false = 3D mode.' },
                },
                required: ['is2d'],
                handler: async (args) => {
                    await request('scene', 'change-is2D', Boolean(args.is2d));
                    return { is2D: await request('scene', 'query-is2D') };
                },
            },
            set_grid: {
                description: 'Show or hide the scene grid.',
                params: {
                    visible: { type: 'boolean' },
                },
                required: ['visible'],
                handler: async (args) => {
                    await request('scene', 'set-grid-visible', Boolean(args.visible));
                    return { gridVisible: await request('scene', 'query-is-grid-visible') };
                },
            },
            set_icon_gizmo: {
                description: 'Configure icon gizmos (3D rendering mode and/or size).',
                params: {
                    is3d: { type: 'boolean', description: 'Render icon gizmos in 3D.' },
                    size: { type: 'number', description: 'Icon gizmo size.' },
                },
                handler: async (args) => {
                    if (typeof args.is3d === 'boolean') {
                        await request('scene', 'set-icon-gizmo-3d', args.is3d);
                    }
                    if (typeof args.size === 'number') {
                        await request('scene', 'set-icon-gizmo-size', args.size);
                    }
                    return {
                        iconGizmo3d: await request('scene', 'query-is-icon-gizmo-3d'),
                        iconGizmoSize: await request('scene', 'query-icon-gizmo-size'),
                    };
                },
            },
            focus: {
                description: 'Focus the scene camera on the given node(s).',
                params: {
                    uuid: {
                        type: ['string', 'array'],
                        items: { type: 'string' },
                        description: 'Node uuid(s) to focus on.',
                    },
                },
                required: ['uuid'],
                handler: async (args) => {
                    const uuids = Array.isArray(args.uuid) ? args.uuid : [args.uuid];
                    await request('scene', 'focus-camera', uuids);
                    return { focused: uuids };
                },
            },
            align_with_view: {
                description: 'Align the currently SELECTED nodes with the scene camera view (select nodes first via editor.select).',
                handler: async () => {
                    await request('scene', 'align-with-view');
                    return { ok: true };
                },
            },
            align_view_with_node: {
                description: 'Align the scene camera with the currently SELECTED node (select a node first via editor.select).',
                handler: async () => {
                    await request('scene', 'align-view-with-node');
                    return { ok: true };
                },
            },
        },
    };
}
