/**
 * project 工具：專案與編輯器資訊。
 * 3A 僅含 info；其餘 actions（settings/preferences/engine_info/server_info）於 3C 補齊。
 */
import { ToolDef } from '../types';

export function createProjectTool(): ToolDef {
    return {
        name: 'project',
        description: 'Project and Cocos Creator editor information.',
        actions: {
            info: {
                description:
                    'Get current project info (path/name/uuid), editor version and version capability flags.',
                handler: async (_args, ctx) => {
                    return {
                        project: {
                            path: Editor.Project.path,
                            name: Editor.Project.name,
                            uuid: Editor.Project.uuid,
                        },
                        editor: {
                            version: ctx.env.version.raw,
                            path: Editor.App.path,
                            node: process.versions.node,
                            electron: (process.versions as Record<string, string>).electron,
                        },
                        capabilities: ctx.env.capabilities,
                    };
                },
            },
        },
    };
}
