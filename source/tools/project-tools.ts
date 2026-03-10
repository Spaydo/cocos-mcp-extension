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
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'info': return this.info(args?.settingsKey);
            case 'refresh': return this.refresh(args?.path);
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
