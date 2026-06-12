"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSceneViewTool = createSceneViewTool;
const helpers_1 = require("./helpers");
function createSceneViewTool() {
    return {
        name: 'scene_view',
        description: 'Scene view controls: gizmo tool/pivot/coordinate, 2D/3D mode, grid, icon gizmos, camera focus/align.',
        actions: {
            query_state: {
                description: 'Query all scene view states at once (tool, pivot, coordinate, 2D mode, grid, icon gizmo).',
                handler: async () => {
                    const [tool, pivot, coordinate, is2D, gridVisible, iconGizmo3d, iconGizmoSize] = await Promise.all([
                        (0, helpers_1.request)('scene', 'query-gizmo-tool-name'),
                        (0, helpers_1.request)('scene', 'query-gizmo-pivot'),
                        (0, helpers_1.request)('scene', 'query-gizmo-coordinate'),
                        (0, helpers_1.request)('scene', 'query-is2D'),
                        (0, helpers_1.request)('scene', 'query-is-grid-visible'),
                        (0, helpers_1.request)('scene', 'query-is-icon-gizmo-3d'),
                        (0, helpers_1.request)('scene', 'query-icon-gizmo-size'),
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
                    await (0, helpers_1.request)('scene', 'change-gizmo-tool', String(args.tool));
                    return { tool: await (0, helpers_1.request)('scene', 'query-gizmo-tool-name') };
                },
            },
            set_pivot: {
                description: 'Switch the gizmo pivot mode.',
                params: {
                    pivot: { type: 'string', enum: ['pivot', 'center'], description: 'Pivot mode.' },
                },
                required: ['pivot'],
                handler: async (args) => {
                    await (0, helpers_1.request)('scene', 'change-gizmo-pivot', String(args.pivot));
                    return { pivot: await (0, helpers_1.request)('scene', 'query-gizmo-pivot') };
                },
            },
            set_coordinate: {
                description: 'Switch the gizmo coordinate system.',
                params: {
                    coordinate: { type: 'string', enum: ['local', 'global'], description: 'Coordinate system.' },
                },
                required: ['coordinate'],
                handler: async (args) => {
                    await (0, helpers_1.request)('scene', 'change-gizmo-coordinate', String(args.coordinate));
                    return { coordinate: await (0, helpers_1.request)('scene', 'query-gizmo-coordinate') };
                },
            },
            set_2d: {
                description: 'Switch the scene view between 2D and 3D editing mode.',
                params: {
                    is2d: { type: 'boolean', description: 'true = 2D mode, false = 3D mode.' },
                },
                required: ['is2d'],
                handler: async (args) => {
                    await (0, helpers_1.request)('scene', 'change-is2D', Boolean(args.is2d));
                    return { is2D: await (0, helpers_1.request)('scene', 'query-is2D') };
                },
            },
            set_grid: {
                description: 'Show or hide the scene grid.',
                params: {
                    visible: { type: 'boolean' },
                },
                required: ['visible'],
                handler: async (args) => {
                    await (0, helpers_1.request)('scene', 'set-grid-visible', Boolean(args.visible));
                    return { gridVisible: await (0, helpers_1.request)('scene', 'query-is-grid-visible') };
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
                        await (0, helpers_1.request)('scene', 'set-icon-gizmo-3d', args.is3d);
                    }
                    if (typeof args.size === 'number') {
                        await (0, helpers_1.request)('scene', 'set-icon-gizmo-size', args.size);
                    }
                    return {
                        iconGizmo3d: await (0, helpers_1.request)('scene', 'query-is-icon-gizmo-3d'),
                        iconGizmoSize: await (0, helpers_1.request)('scene', 'query-icon-gizmo-size'),
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
                    await (0, helpers_1.request)('scene', 'focus-camera', uuids);
                    return { focused: uuids };
                },
            },
            align_with_view: {
                description: 'Align the currently SELECTED nodes with the scene camera view (select nodes first via editor.select).',
                handler: async () => {
                    await (0, helpers_1.request)('scene', 'align-with-view');
                    return { ok: true };
                },
            },
            align_view_with_node: {
                description: 'Align the scene camera with the currently SELECTED node (select a node first via editor.select).',
                handler: async () => {
                    await (0, helpers_1.request)('scene', 'align-view-with-node');
                    return { ok: true };
                },
            },
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUtdmlldy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9zY2VuZS12aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBUUEsa0RBb0lDO0FBdElELHVDQUFvQztBQUVwQyxTQUFnQixtQkFBbUI7SUFDL0IsT0FBTztRQUNILElBQUksRUFBRSxZQUFZO1FBQ2xCLFdBQVcsRUFDUCxzR0FBc0c7UUFDMUcsT0FBTyxFQUFFO1lBQ0wsV0FBVyxFQUFFO2dCQUNULFdBQVcsRUFBRSwyRkFBMkY7Z0JBQ3hHLE9BQU8sRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDaEIsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLGFBQWEsQ0FBQyxHQUMxRSxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7d0JBQ2QsSUFBQSxpQkFBTyxFQUFDLE9BQU8sRUFBRSx1QkFBdUIsQ0FBQzt3QkFDekMsSUFBQSxpQkFBTyxFQUFDLE9BQU8sRUFBRSxtQkFBbUIsQ0FBQzt3QkFDckMsSUFBQSxpQkFBTyxFQUFDLE9BQU8sRUFBRSx3QkFBd0IsQ0FBQzt3QkFDMUMsSUFBQSxpQkFBTyxFQUFDLE9BQU8sRUFBRSxZQUFZLENBQUM7d0JBQzlCLElBQUEsaUJBQU8sRUFBQyxPQUFPLEVBQUUsdUJBQXVCLENBQUM7d0JBQ3pDLElBQUEsaUJBQU8sRUFBQyxPQUFPLEVBQUUsd0JBQXdCLENBQUM7d0JBQzFDLElBQUEsaUJBQU8sRUFBQyxPQUFPLEVBQUUsdUJBQXVCLENBQUM7cUJBQzVDLENBQUMsQ0FBQztvQkFDUCxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLENBQUM7Z0JBQ3RGLENBQUM7YUFDSjtZQUNELFFBQVEsRUFBRTtnQkFDTixXQUFXLEVBQUUsa0NBQWtD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bnRlbnQiOlsiLyoqXG4gKiBzY2VuZV92aWV3IOW3peWFt++8muWgtOaZr+imluWclu+8iGdpem1vIC8g6KaW6KeSIC8g6aGv56S677yJ5o6n5Yi244CCXG4gKiDlhajpg6jkvb/nlKjlrpjmlrnmraPnorogbWVzc2FnZSDlkI3vvIhkb2NzL2FwaS1yZWZlcmVuY2UvMDIgwqc477yb6IiK54mI5pO05bGV5q2k6aGe5Yil5bm+5LmO5YWo6YOo5Y+r6Yyv5ZCN56ix77yJ44CCXG4gKiDms6jmhI/lrpjmlrnoqp7mhI/mmK8gaXMyRO+8iOiIiueJiOeahCBpczNEIOiqnuaEj+ebuOWPje+8ieOAglxuICovXG5pbXBvcnQgeyBUb29sRGVmIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgcmVxdWVzdCB9IGZyb20gJy4vaGVscGVycyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTY2VuZVZpZXdUb29sKCk6IFRvb2xEZWYge1xuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6ICdzY2VuZV92aWV3JyxcbiAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAnU2NlbmUgdmlldyBjb250cm9sczogZ2l6bW8gdG9vbC9waXZvdC9jb29yZGluYXRlLCAyRC8zRCBtb2RlLCBncmlkLCBpY29uIGdpem1vcywgY2FtZXJhIGZvY3VzL2FsaWduLicsXG4gICAgICAgIGFjdGlvbnM6IHtcbiAgICAgICAgICAgIHF1ZXJ5X3N0YXRlOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdRdWVyeSBhbGwgc2NlbmUgdmlldyBzdGF0ZXMgYXQgb25jZSAodG9vbCwgcGl2b3QsIGNvb3JkaW5hdGUsIDJEIG1vZGUsIGdyaWQsIGljb24gZ2l6bW8pLicsXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBbdG9vbCwgcGl2b3QsIGNvb3JkaW5hdGUsIGlzMkQsIGdyaWRWaXNpYmxlLCBpY29uR2l6bW8zZCwgaWNvbkdpem1vU2l6ZV0gPVxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWdpem1vLXRvb2wtbmFtZScpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWdpem1vLXBpdm90JyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdCgnc2NlbmUnLCAncXVlcnktZ2l6bW8tY29vcmRpbmF0ZScpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWlzMkQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1pcy1ncmlkLXZpc2libGUnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1pcy1pY29uLWdpem1vLTNkJyksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdCgnc2NlbmUnLCAncXVlcnktaWNvbi1naXptby1zaXplJyksXG4gICAgICAgICAgICAgICAgICAgICAgICBdKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdG9vbCwgcGl2b3QsIGNvb3JkaW5hdGUsIGlzMkQsIGdyaWRWaXNpYmxlLCBpY29uR2l6bW8zZCwgaWNvbkdpem1vU2l6ZSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0X3Rvb2w6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1N3aXRjaCB0aGUgZ2l6bW8gdHJhbnNmb3JtIHRvb2wuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdG9vbDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3N0cmluZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnVtOiBbJ3Bvc2l0aW9uJywgJ3JvdGF0aW9uJywgJ3NjYWxlJywgJ3JlY3QnXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2l6bW8gdG9vbCBuYW1lLicsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd0b29sJ10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAnY2hhbmdlLWdpem1vLXRvb2wnLCBTdHJpbmcoYXJncy50b29sKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHRvb2w6IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWdpem1vLXRvb2wtbmFtZScpIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXRfcGl2b3Q6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1N3aXRjaCB0aGUgZ2l6bW8gcGl2b3QgbW9kZS4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBwaXZvdDogeyB0eXBlOiAnc3RyaW5nJywgZW51bTogWydwaXZvdCcsICdjZW50ZXInXSwgZGVzY3JpcHRpb246ICdQaXZvdCBtb2RlLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3Bpdm90J10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAnY2hhbmdlLWdpem1vLXBpdm90JywgU3RyaW5nKGFyZ3MucGl2b3QpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgcGl2b3Q6IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWdpem1vLXBpdm90JykgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldF9jb29yZGluYXRlOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdTd2l0Y2ggdGhlIGdpem1vIGNvb3JkaW5hdGUgc3lzdGVtLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIGNvb3JkaW5hdGU6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnbG9jYWwnLCAnZ2xvYmFsJ10sIGRlc2NyaXB0aW9uOiAnQ29vcmRpbmF0ZSBzeXN0ZW0uJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnY29vcmRpbmF0ZSddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ2NoYW5nZS1naXptby1jb29yZGluYXRlJywgU3RyaW5nKGFyZ3MuY29vcmRpbmF0ZSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBjb29yZGluYXRlOiBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1naXptby1jb29yZGluYXRlJykgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldF8yZDoge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU3dpdGNoIHRoZSBzY2VuZSB2aWV3IGJldHdlZW4gMkQgYW5kIDNEIGVkaXRpbmcgbW9kZS4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBpczJkOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICd0cnVlID0gMkQgbW9kZSwgZmFsc2UgPSAzRCBtb2RlLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2lzMmQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdjaGFuZ2UtaXMyRCcsIEJvb2xlYW4oYXJncy5pczJkKSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGlzMkQ6IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWlzMkQnKSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0X2dyaWQ6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Nob3cgb3IgaGlkZSB0aGUgc2NlbmUgZ3JpZC4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB2aXNpYmxlOiB7IHR5cGU6ICdib29sZWFuJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndmlzaWJsZSddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3NldC1ncmlkLXZpc2libGUnLCBCb29sZWFuKGFyZ3MudmlzaWJsZSkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBncmlkVmlzaWJsZTogYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAncXVlcnktaXMtZ3JpZC12aXNpYmxlJykgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNldF9pY29uX2dpem1vOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb25maWd1cmUgaWNvbiBnaXptb3MgKDNEIHJlbmRlcmluZyBtb2RlIGFuZC9vciBzaXplKS4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBpczNkOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdSZW5kZXIgaWNvbiBnaXptb3MgaW4gM0QuJyB9LFxuICAgICAgICAgICAgICAgICAgICBzaXplOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0ljb24gZ2l6bW8gc2l6ZS4nIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGFyZ3MuaXMzZCA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdzZXQtaWNvbi1naXptby0zZCcsIGFyZ3MuaXMzZCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmdzLnNpemUgPT09ICdudW1iZXInKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdzZXQtaWNvbi1naXptby1zaXplJywgYXJncy5zaXplKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWNvbkdpem1vM2Q6IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWlzLWljb24tZ2l6bW8tM2QnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGljb25HaXptb1NpemU6IGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LWljb24tZ2l6bW8tc2l6ZScpLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZm9jdXM6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0ZvY3VzIHRoZSBzY2VuZSBjYW1lcmEgb24gdGhlIGdpdmVuIG5vZGUocykuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDoge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogWydzdHJpbmcnLCAnYXJyYXknXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW1zOiB7IHR5cGU6ICdzdHJpbmcnIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ05vZGUgdXVpZChzKSB0byBmb2N1cyBvbi4nLFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHV1aWRzID0gQXJyYXkuaXNBcnJheShhcmdzLnV1aWQpID8gYXJncy51dWlkIDogW2FyZ3MudXVpZF07XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ2ZvY3VzLWNhbWVyYScsIHV1aWRzKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgZm9jdXNlZDogdXVpZHMgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFsaWduX3dpdGhfdmlldzoge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWxpZ24gdGhlIGN1cnJlbnRseSBTRUxFQ1RFRCBub2RlcyB3aXRoIHRoZSBzY2VuZSBjYW1lcmEgdmlldyAoc2VsZWN0IG5vZGVzIGZpcnN0IHZpYSBlZGl0b3Iuc2VsZWN0KS4nLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAnYWxpZ24td2l0aC12aWV3Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IG9rOiB0cnVlIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhbGlnbl92aWV3X3dpdGhfbm9kZToge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQWxpZ24gdGhlIHNjZW5lIGNhbWVyYSB3aXRoIHRoZSBjdXJyZW50bHkgU0VMRUNURUQgbm9kZSAoc2VsZWN0IGEgbm9kZSBmaXJzdCB2aWEgZWRpdG9yLnNlbGVjdCkuJyxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ2FsaWduLXZpZXctd2l0aC1ub2RlJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IG9rOiB0cnVlIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgfTtcbn1cbiJdfQ==