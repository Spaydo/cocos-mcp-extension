import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import { getEditorVersion } from '../main';

export class ProjectTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'info',
                description: 'Get project path, engine version, and optional settings',
                inputSchema: {
                    type: 'object',
                    properties: {
                        settingsKey: { type: 'string', description: 'Optional project settings key to read' },
                    },
                },
            },
            {
                name: 'refresh',
                description: 'Refresh the asset database',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Optional db:// path to refresh (default: all)' },
                    },
                },
            },
            {
                name: 'build',
                description: 'Build project for a target platform',
                inputSchema: {
                    type: 'object',
                    properties: {
                        platform: { type: 'string', description: 'Target platform: web-mobile, web-desktop, android, ios, win32, mac' },
                        buildPath: { type: 'string', description: 'Custom build output path (optional)' },
                    },
                    required: ['platform'],
                },
            },
            {
                name: 'preview',
                description: 'Start or stop game preview in browser',
                inputSchema: {
                    type: 'object',
                    properties: {
                        action: { type: 'string', description: 'start or stop' },
                    },
                    required: ['action'],
                },
            },
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'info': return this.info(args?.settingsKey);
            case 'refresh': return this.refresh(args?.path);
            case 'build': return this.build(args.platform, args.buildPath);
            case 'preview': return this.preview(args.action);
            default: return { success: false, error: `Unknown project tool: ${toolName}` };
        }
    }

    private async info(settingsKey?: string): Promise<ToolResponse> {
        try {
            const data: any = {
                projectPath: Editor.Project.path,
                editorVersion: getEditorVersion(),
            };

            if (settingsKey) {
                try {
                    const value = await Editor.Profile.getProject('project', settingsKey);
                    data.settings = { [settingsKey]: value };
                } catch {
                    data.settings = { [settingsKey]: null };
                }
            }

            return { success: true, data };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async build(platform: string, buildPath?: string): Promise<ToolResponse> {
        try {
            const options: any = { platform };
            if (buildPath) {
                options.buildPath = buildPath;
            }
            await (Editor.Message.request as any)('builder', 'build-start', options);
            return { success: true, message: `Build started for platform: ${platform}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async preview(action: string): Promise<ToolResponse> {
        try {
            if (action === 'start') {
                await (Editor.Message.request as any)('preview', 'start');
                return { success: true, message: 'Preview started' };
            } else if (action === 'stop') {
                await (Editor.Message.request as any)('preview', 'stop');
                return { success: true, message: 'Preview stopped' };
            }
            return { success: false, error: 'Action must be "start" or "stop"' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async refresh(path?: string): Promise<ToolResponse> {
        try {
            if (path) {
                await Editor.Message.request('asset-db', 'refresh-asset', path);
            } else {
                await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets');
            }
            return { success: true, message: `Asset database refreshed${path ? `: ${path}` : ''}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
