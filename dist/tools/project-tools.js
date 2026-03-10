"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTools = void 0;
const main_1 = require("../main");
class ProjectTools {
    getTools() {
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
    async execute(toolName, args) {
        switch (toolName) {
            case 'info': return this.info(args === null || args === void 0 ? void 0 : args.settingsKey);
            case 'refresh': return this.refresh(args === null || args === void 0 ? void 0 : args.path);
            default: return { success: false, error: `Unknown project tool: ${toolName}` };
        }
    }
    async info(settingsKey) {
        try {
            const data = {
                projectPath: Editor.Project.path,
                editorVersion: (0, main_1.getEditorVersion)(),
            };
            if (settingsKey) {
                try {
                    const value = await Editor.Profile.getProject('project', settingsKey);
                    data.settings = { [settingsKey]: value };
                }
                catch (_a) {
                    data.settings = { [settingsKey]: null };
                }
            }
            return { success: true, data };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    async refresh(path) {
        try {
            if (path) {
                await Editor.Message.request('asset-db', 'refresh-asset', path);
            }
            else {
                await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets');
            }
            return { success: true, message: `Asset database refreshed${path ? `: ${path}` : ''}` };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
}
exports.ProjectTools = ProjectTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC10b29scy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9wcm9qZWN0LXRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtDQUEyQztBQUUzQyxNQUFhLFlBQVk7SUFFckIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsTUFBTTtnQkFDWixXQUFXLEVBQUUseURBQXlEO2dCQUN0RSxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHVDQUF1QyxFQUFFO3FCQUN4RjtpQkFDSjthQUNKO1lBQ0Q7Z0JBQ0ksSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsV0FBVyxFQUFFLDRCQUE0QjtnQkFDekMsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSwrQ0FBK0MsRUFBRTtxQkFDekY7aUJBQ0o7YUFDSjtTQUNKLENBQUM7SUFDTixDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFnQixFQUFFLElBQVM7UUFDckMsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNmLEtBQUssTUFBTSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksYUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxXQUFXLENBQUMsQ0FBQztZQUNqRCxLQUFLLFNBQVMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsSUFBSSxDQUFDLENBQUM7WUFDaEQsT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHlCQUF5QixRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQ25GLENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFvQjtRQUNuQyxJQUFJLENBQUM7WUFDRCxNQUFNLElBQUksR0FBUTtnQkFDZCxXQUFXLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJO2dCQUNoQyxhQUFhLEVBQUUsSUFBQSx1QkFBZ0IsR0FBRTthQUNwQyxDQUFDO1lBRUYsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDZCxJQUFJLENBQUM7b0JBQ0QsTUFBTSxLQUFLLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7b0JBQ3RFLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDO2dCQUM3QyxDQUFDO2dCQUFDLFdBQU0sQ0FBQztvQkFDTCxJQUFJLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQztnQkFDNUMsQ0FBQztZQUNMLENBQUM7WUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUNuQyxDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0lBRU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFhO1FBQy9CLElBQUksQ0FBQztZQUNELElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1AsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxVQUFVLEVBQUUsZUFBZSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3BFLENBQUM7aUJBQU0sQ0FBQztnQkFDSixNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxlQUFlLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDN0UsQ0FBQztZQUNELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSwyQkFBMkIsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDO1FBQzVGLENBQUM7UUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEQsQ0FBQztJQUNMLENBQUM7Q0FDSjtBQXJFRCxvQ0FxRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBUb29sRGVmaW5pdGlvbiwgVG9vbFJlc3BvbnNlLCBUb29sRXhlY3V0b3IgfSBmcm9tICcuLi90eXBlcyc7XHJcbmltcG9ydCB7IGdldEVkaXRvclZlcnNpb24gfSBmcm9tICcuLi9tYWluJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQcm9qZWN0VG9vbHMgaW1wbGVtZW50cyBUb29sRXhlY3V0b3Ige1xyXG5cclxuICAgIGdldFRvb2xzKCk6IFRvb2xEZWZpbml0aW9uW10ge1xyXG4gICAgICAgIHJldHVybiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIG5hbWU6ICdpbmZvJyxcclxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2V0IHByb2plY3QgcGF0aCwgZW5naW5lIHZlcnNpb24sIGFuZCBvcHRpb25hbCBzZXR0aW5ncycsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0dGluZ3NLZXk6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnT3B0aW9uYWwgcHJvamVjdCBzZXR0aW5ncyBrZXkgdG8gcmVhZCcgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlZnJlc2gnLFxyXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdSZWZyZXNoIHRoZSBhc3NldCBkYXRhYmFzZScsXHJcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdPcHRpb25hbCBkYjovLyBwYXRoIHRvIHJlZnJlc2ggKGRlZmF1bHQ6IGFsbCknIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgXTtcclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBleGVjdXRlKHRvb2xOYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgc3dpdGNoICh0b29sTmFtZSkge1xyXG4gICAgICAgICAgICBjYXNlICdpbmZvJzogcmV0dXJuIHRoaXMuaW5mbyhhcmdzPy5zZXR0aW5nc0tleSk7XHJcbiAgICAgICAgICAgIGNhc2UgJ3JlZnJlc2gnOiByZXR1cm4gdGhpcy5yZWZyZXNoKGFyZ3M/LnBhdGgpO1xyXG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIHByb2plY3QgdG9vbDogJHt0b29sTmFtZX1gIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgaW5mbyhzZXR0aW5nc0tleT86IHN0cmluZyk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZGF0YTogYW55ID0ge1xyXG4gICAgICAgICAgICAgICAgcHJvamVjdFBhdGg6IEVkaXRvci5Qcm9qZWN0LnBhdGgsXHJcbiAgICAgICAgICAgICAgICBlZGl0b3JWZXJzaW9uOiBnZXRFZGl0b3JWZXJzaW9uKCksXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBpZiAoc2V0dGluZ3NLZXkpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCBFZGl0b3IuUHJvZmlsZS5nZXRQcm9qZWN0KCdwcm9qZWN0Jywgc2V0dGluZ3NLZXkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGRhdGEuc2V0dGluZ3MgPSB7IFtzZXR0aW5nc0tleV06IHZhbHVlIH07XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICBkYXRhLnNldHRpbmdzID0geyBbc2V0dGluZ3NLZXldOiBudWxsIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGEgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHByaXZhdGUgYXN5bmMgcmVmcmVzaChwYXRoPzogc3RyaW5nKTogUHJvbWlzZTxUb29sUmVzcG9uc2U+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBpZiAocGF0aCkge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncmVmcmVzaC1hc3NldCcsIHBhdGgpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnYXNzZXQtZGInLCAncmVmcmVzaC1hc3NldCcsICdkYjovL2Fzc2V0cycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBBc3NldCBkYXRhYmFzZSByZWZyZXNoZWQke3BhdGggPyBgOiAke3BhdGh9YCA6ICcnfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbiJdfQ==