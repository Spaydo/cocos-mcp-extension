"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSceneTool = createSceneTool;
/**
 * scene 工具：場景生命週期。
 * 對應 message 簽名見 docs/api-reference/02-messages-scene.md §1/§7/§9。
 */
const adapters_1 = require("../adapters");
const helpers_1 = require("./helpers");
function createSceneTool() {
    return {
        name: 'scene',
        description: 'Scene lifecycle: open/save/close, dirty state and scene info.',
        actions: {
            query_ready: {
                description: 'Whether the scene editing process is ready to accept commands.',
                handler: async () => {
                    return { ready: Boolean(await (0, helpers_1.request)('scene', 'query-is-ready')) };
                },
            },
            query_current: {
                description: 'Get info about the currently open scene (root name/uuid, child count, dirty flag).',
                handler: async () => {
                    var _a, _b, _c;
                    const tree = (0, adapters_1.normalizeNodeTree)(await (0, helpers_1.request)('scene', 'query-node-tree'));
                    const dirty = Boolean(await (0, helpers_1.request)('scene', 'query-dirty'));
                    if (!tree) {
                        return { open: false, dirty };
                    }
                    return {
                        open: true,
                        name: (_a = (0, helpers_1.v)(tree.name)) !== null && _a !== void 0 ? _a : tree.name,
                        uuid: (_b = (0, helpers_1.v)(tree.uuid)) !== null && _b !== void 0 ? _b : tree.uuid,
                        type: (_c = tree.type) !== null && _c !== void 0 ? _c : tree.__type__,
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
                        const converted = await (0, helpers_1.request)('asset-db', 'query-uuid', uuid);
                        if (!converted)
                            throw new Error(`Scene asset not found: ${uuid}`);
                        uuid = converted;
                    }
                    await (0, helpers_1.request)('scene', 'open-scene', uuid);
                    return { opened: uuid };
                },
            },
            save: {
                description: 'Save the currently open scene.',
                handler: async () => {
                    return (0, adapters_1.normalizeSaveSceneResult)(await (0, helpers_1.request)('scene', 'save-scene'));
                },
            },
            save_as: {
                description: 'Save the current scene as a new asset. WARNING: opens an interactive save dialog in the editor UI; prefer asset.copy for automation.',
                handler: async (_args, ctx) => {
                    const params = (0, adapters_1.buildSaveAsSceneArgs)(ctx.env.capabilities.saveAsSceneNeedsFlag);
                    return (0, adapters_1.normalizeSaveSceneResult)(await (0, helpers_1.request)('scene', 'save-as-scene', ...params));
                },
            },
            close: {
                description: 'Close the current scene. WARNING: if the scene has unsaved changes the editor may show a confirm dialog; call scene.save first.',
                handler: async () => {
                    return { closed: Boolean(await (0, helpers_1.request)('scene', 'close-scene')) };
                },
            },
            query_dirty: {
                description: 'Whether the current scene has unsaved modifications.',
                handler: async () => {
                    return { dirty: Boolean(await (0, helpers_1.request)('scene', 'query-dirty')) };
                },
            },
            query_bounds: {
                description: 'Bounding rect (x/y/width/height) of the current scene content.',
                handler: async () => {
                    return (0, helpers_1.request)('scene', 'query-scene-bounds');
                },
            },
            soft_reload: {
                description: 'Soft-reload the scene (re-apply scene data without restarting the scene process).',
                handler: async () => {
                    await (0, helpers_1.request)('scene', 'soft-reload');
                    return { reloaded: true };
                },
            },
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFRQSwwQ0F3RkM7QUFoR0Q7OztHQUdHO0FBQ0gsMENBQWdHO0FBRWhHLHVDQUF1QztBQUV2QyxTQUFnQixlQUFlO0lBQzNCLE9BQU87UUFDSCxJQUFJLEVBQUUsT0FBTztRQUNiLFdBQVcsRUFBRSwrREFBK0Q7UUFDNUUsT0FBTyxFQUFFO1lBQ0wsV0FBVyxFQUFFO2dCQUNULFdBQVcsRUFBRSxnRUFBZ0U7Z0JBQzdFLE9BQU8sRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDaEIsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsTUFBTSxJQUFBLGlCQUFPLEVBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUN4RSxDQUFDO2FBQ0o7WUFDRCxhQUFhLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLG9GQUFvRjtnQkFDakcsT0FBTyxFQUFFLEtBQUssSUFBSSxFQUFFOztvQkFDaEIsTUFBTSxJQUFJLEdBQUcsSUFBQSw0QkFBaUIsRUFBQyxNQUFNLElBQUEsaUJBQU8sRUFBQyxPQUFPLEVBQUUsaUJBQWlCLENBQUMsQ0FBUSxDQUFDO29CQUNqRixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFBLGlCQUFPLEVBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUM7b0JBQzdELElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQzt3QkFDUixPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQztvQkFDbEMsQ0FBQztvQkFDRCxPQUFPO3dCQUNILElBQUksRUFBRSxJQUFJO3dCQUNWLElBQUksRUFBRSxNQUFBLElBQUEsV0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsbUNBQUksSUFBSSxDQUFDLElBQUk7d0JBQy9CLElBQUksRUFBRSxNQUFBLElBQUEsV0FBQyxFQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsbUNBQUksSUFBSSxDQUFDLElBQUk7d0JBQy9CLElBQUksRUFBRSxNQUFBLElBQUksQ0FBQyxJQUFJLG1DQUFJLElBQUksQ0FBQyxRQUFRO3dCQUNoQyxVQUFVLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNuRSxLQUFLO3FCQUNSLENBQUM7Z0JBQ04sQ0FBQzthQUNKO1lBQ0QsSUFBSSxFQUFFO2dCQUNGLFdBQVcsRUFBRSw4Q0FBOEM7Z0JBQzNELE1BQU0sRUFBRTtvQkFDSixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxnQ0FBZ0MsRUFBRTtpQkFDMUU7Z0JBQ0QsUUFBUSxFQUFFLENBQUMsTUFBTSxDQUFDO2dCQUNsQixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFO29CQUNwQixJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUM3QixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQzt3QkFDM0IsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFBLGlCQUFPLEVBQUMsVUFBVSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDaEUsSUFBSSxDQUFDLFNBQVM7NEJBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsSUFBSSxFQUFFLENBQUMsQ0FBQzt3QkFDbEUsSUFBSSxHQUFHLFNBQVMsQ0FBQztvQkFDckIsQ0FBQztvQkFDRCxNQUFNLElBQUEsaUJBQU8sRUFBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUMzQyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO2dCQUM1QixDQUFDO2FBQ0o7WUFDRCxJQUFJLEVBQUU7Z0JBQ0YsV0FBVyxFQUFFLGdDQUFnQztnQkFDN0MsT0FBTyxFQUFFLEtBQUssSUFBSSxFQUFFO29CQUNoQixPQUFPLElBQUEsbUNBQXdCLEVBQUMsTUFBTSxJQUFBLGlCQUFPLEVBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQzFFLENBQUM7YUFDSjtZQUNELE9BQU8sRUFBRTtnQkFDTCxXQUFXLEVBQ1Asc0lBQXNJO2dCQUMxSSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtvQkFDMUIsTUFBTSxNQUFNLEdBQUcsSUFBQSwrQkFBb0IsRUFBQyxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO29CQUMvRSxPQUFPLElBQUEsbUNBQXdCLEVBQUMsTUFBTSxJQUFBLGlCQUFPLEVBQUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ3hGLENBQUM7YUFDSjtZQUNELEtBQUssRUFBRTtnQkFDSCxXQUFXLEVBQ1AsaUlBQWlJO2dCQUNySSxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ2hCLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sSUFBQSxpQkFBTyxFQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RFLENBQUM7YUFDSjtZQUNELFdBQVcsRUFBRTtnQkFDVCxXQUFXLEVBQUUsc0RBQXNEO2dCQUNuRSxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ2hCLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLE1BQU0sSUFBQSxpQkFBTyxFQUFDLE9BQU8sRUFBRSxhQUFhLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JFLENBQUM7YUFDSjtZQUNELFlBQVksRUFBRTtnQkFDVixXQUFXLEVBQUUsZ0VBQWdFO2dCQUM3RSxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ2hCLE9BQU8sSUFBQSxpQkFBTyxFQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO2dCQUNsRCxDQUFDO2FBQ0o7WUFDRCxXQUFXLEVBQUU7Z0JBQ1QsV0FBVyxFQUFFLG1GQUFtRjtnQkFDaEcsT0FBTyxFQUFFLEtBQUssSUFBSSxFQUFFO29CQUNoQixNQUFNLElBQUEsaUJBQU8sRUFBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7b0JBQ3RDLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7Z0JBQzlCLENBQUM7YUFDSjtTQUNKO0tBQ0osQ0FBQztBQUNOLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIHNjZW5lIOW3peWFt++8muWgtOaZr+eUn+WRvemAseacn+OAglxuICog5bCN5oeJIG1lc3NhZ2Ug57C95ZCN6KaLIGRvY3MvYXBpLXJlZmVyZW5jZS8wMi1tZXNzYWdlcy1zY2VuZS5tZCDCpzEvwqc3L8KnOeOAglxuICovXG5pbXBvcnQgeyBidWlsZFNhdmVBc1NjZW5lQXJncywgbm9ybWFsaXplTm9kZVRyZWUsIG5vcm1hbGl6ZVNhdmVTY2VuZVJlc3VsdCB9IGZyb20gJy4uL2FkYXB0ZXJzJztcbmltcG9ydCB7IFRvb2xEZWYgfSBmcm9tICcuLi90eXBlcyc7XG5pbXBvcnQgeyByZXF1ZXN0LCB2IH0gZnJvbSAnLi9oZWxwZXJzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVNjZW5lVG9vbCgpOiBUb29sRGVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiAnc2NlbmUnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1NjZW5lIGxpZmVjeWNsZTogb3Blbi9zYXZlL2Nsb3NlLCBkaXJ0eSBzdGF0ZSBhbmQgc2NlbmUgaW5mby4nLFxuICAgICAgICBhY3Rpb25zOiB7XG4gICAgICAgICAgICBxdWVyeV9yZWFkeToge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnV2hldGhlciB0aGUgc2NlbmUgZWRpdGluZyBwcm9jZXNzIGlzIHJlYWR5IHRvIGFjY2VwdCBjb21tYW5kcy4nLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgcmVhZHk6IEJvb2xlYW4oYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAncXVlcnktaXMtcmVhZHknKSkgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHF1ZXJ5X2N1cnJlbnQ6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0dldCBpbmZvIGFib3V0IHRoZSBjdXJyZW50bHkgb3BlbiBzY2VuZSAocm9vdCBuYW1lL3V1aWQsIGNoaWxkIGNvdW50LCBkaXJ0eSBmbGFnKS4nLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJlZSA9IG5vcm1hbGl6ZU5vZGVUcmVlKGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LW5vZGUtdHJlZScpKSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRpcnR5ID0gQm9vbGVhbihhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdxdWVyeS1kaXJ0eScpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0cmVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBvcGVuOiBmYWxzZSwgZGlydHkgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IHYodHJlZS5uYW1lKSA/PyB0cmVlLm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICB1dWlkOiB2KHRyZWUudXVpZCkgPz8gdHJlZS51dWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogdHJlZS50eXBlID8/IHRyZWUuX190eXBlX18sXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGlsZENvdW50OiBBcnJheS5pc0FycmF5KHRyZWUuY2hpbGRyZW4pID8gdHJlZS5jaGlsZHJlbi5sZW5ndGggOiAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGlydHksXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvcGVuOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdPcGVuIGEgc2NlbmUgYnkgaXRzIGFzc2V0IHV1aWQgb3IgZGI6Ly8gdXJsLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU2NlbmUgYXNzZXQgdXVpZCBvciBkYjovLyB1cmwuJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGxldCB1dWlkID0gU3RyaW5nKGFyZ3MudXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh1dWlkLnN0YXJ0c1dpdGgoJ2RiOi8vJykpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnZlcnRlZCA9IGF3YWl0IHJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LXV1aWQnLCB1dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghY29udmVydGVkKSB0aHJvdyBuZXcgRXJyb3IoYFNjZW5lIGFzc2V0IG5vdCBmb3VuZDogJHt1dWlkfWApO1xuICAgICAgICAgICAgICAgICAgICAgICAgdXVpZCA9IGNvbnZlcnRlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdvcGVuLXNjZW5lJywgdXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IG9wZW5lZDogdXVpZCB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2F2ZToge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnU2F2ZSB0aGUgY3VycmVudGx5IG9wZW4gc2NlbmUuJyxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBub3JtYWxpemVTYXZlU2NlbmVSZXN1bHQoYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAnc2F2ZS1zY2VuZScpKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNhdmVfYXM6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ1NhdmUgdGhlIGN1cnJlbnQgc2NlbmUgYXMgYSBuZXcgYXNzZXQuIFdBUk5JTkc6IG9wZW5zIGFuIGludGVyYWN0aXZlIHNhdmUgZGlhbG9nIGluIHRoZSBlZGl0b3IgVUk7IHByZWZlciBhc3NldC5jb3B5IGZvciBhdXRvbWF0aW9uLicsXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKF9hcmdzLCBjdHgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gYnVpbGRTYXZlQXNTY2VuZUFyZ3MoY3R4LmVudi5jYXBhYmlsaXRpZXMuc2F2ZUFzU2NlbmVOZWVkc0ZsYWcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbm9ybWFsaXplU2F2ZVNjZW5lUmVzdWx0KGF3YWl0IHJlcXVlc3QoJ3NjZW5lJywgJ3NhdmUtYXMtc2NlbmUnLCAuLi5wYXJhbXMpKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNsb3NlOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICdDbG9zZSB0aGUgY3VycmVudCBzY2VuZS4gV0FSTklORzogaWYgdGhlIHNjZW5lIGhhcyB1bnNhdmVkIGNoYW5nZXMgdGhlIGVkaXRvciBtYXkgc2hvdyBhIGNvbmZpcm0gZGlhbG9nOyBjYWxsIHNjZW5lLnNhdmUgZmlyc3QuJyxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGNsb3NlZDogQm9vbGVhbihhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdjbG9zZS1zY2VuZScpKSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcXVlcnlfZGlydHk6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1doZXRoZXIgdGhlIGN1cnJlbnQgc2NlbmUgaGFzIHVuc2F2ZWQgbW9kaWZpY2F0aW9ucy4nLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgZGlydHk6IEJvb2xlYW4oYXdhaXQgcmVxdWVzdCgnc2NlbmUnLCAncXVlcnktZGlydHknKSkgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHF1ZXJ5X2JvdW5kczoge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQm91bmRpbmcgcmVjdCAoeC95L3dpZHRoL2hlaWdodCkgb2YgdGhlIGN1cnJlbnQgc2NlbmUgY29udGVudC4nLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3QoJ3NjZW5lJywgJ3F1ZXJ5LXNjZW5lLWJvdW5kcycpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc29mdF9yZWxvYWQ6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvZnQtcmVsb2FkIHRoZSBzY2VuZSAocmUtYXBwbHkgc2NlbmUgZGF0YSB3aXRob3V0IHJlc3RhcnRpbmcgdGhlIHNjZW5lIHByb2Nlc3MpLicsXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCByZXF1ZXN0KCdzY2VuZScsICdzb2Z0LXJlbG9hZCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyByZWxvYWRlZDogdHJ1ZSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH07XG59XG4iXX0=