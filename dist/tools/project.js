"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectTool = createProjectTool;
function createProjectTool() {
    return {
        name: 'project',
        description: 'Project and Cocos Creator editor information.',
        actions: {
            info: {
                description: 'Get current project info (path/name/uuid), editor version and version capability flags.',
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
                            electron: process.versions.electron,
                        },
                        capabilities: ctx.env.capabilities,
                    };
                },
            },
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9wcm9qZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBTUEsOENBMkJDO0FBM0JELFNBQWdCLGlCQUFpQjtJQUM3QixPQUFPO1FBQ0gsSUFBSSxFQUFFLFNBQVM7UUFDZixXQUFXLEVBQUUsK0NBQStDO1FBQzVELE9BQU8sRUFBRTtZQUNMLElBQUksRUFBRTtnQkFDRixXQUFXLEVBQ1AseUZBQXlGO2dCQUM3RixPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtvQkFDMUIsT0FBTzt3QkFDSCxPQUFPLEVBQUU7NEJBQ0wsSUFBSSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSTs0QkFDekIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSTs0QkFDekIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSTt5QkFDNUI7d0JBQ0QsTUFBTSxFQUFFOzRCQUNKLE9BQU8sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHOzRCQUM1QixJQUFJLEVBQUUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJOzRCQUNyQixJQUFJLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJOzRCQUMzQixRQUFRLEVBQUcsT0FBTyxDQUFDLFFBQW1DLENBQUMsUUFBUTt5QkFDbEU7d0JBQ0QsWUFBWSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsWUFBWTtxQkFDckMsQ0FBQztnQkFDTixDQUFDO2FBQ0o7U0FDSjtLQUNKLENBQUM7QUFDTixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBwcm9qZWN0IOW3peWFt++8muWwiOahiOiIh+e3qOi8r+WZqOizh+ioiuOAglxuICogM0Eg5YOF5ZCrIGluZm/vvJvlhbbppJggYWN0aW9uc++8iHNldHRpbmdzL3ByZWZlcmVuY2VzL2VuZ2luZV9pbmZvL3NlcnZlcl9pbmZv77yJ5pa8IDNDIOijnOm9iuOAglxuICovXG5pbXBvcnQgeyBUb29sRGVmIH0gZnJvbSAnLi4vdHlwZXMnO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJvamVjdFRvb2woKTogVG9vbERlZiB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogJ3Byb2plY3QnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb2plY3QgYW5kIENvY29zIENyZWF0b3IgZWRpdG9yIGluZm9ybWF0aW9uLicsXG4gICAgICAgIGFjdGlvbnM6IHtcbiAgICAgICAgICAgIGluZm86IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ0dldCBjdXJyZW50IHByb2plY3QgaW5mbyAocGF0aC9uYW1lL3V1aWQpLCBlZGl0b3IgdmVyc2lvbiBhbmQgdmVyc2lvbiBjYXBhYmlsaXR5IGZsYWdzLicsXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKF9hcmdzLCBjdHgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBFZGl0b3IuUHJvamVjdC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IEVkaXRvci5Qcm9qZWN0Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogRWRpdG9yLlByb2plY3QudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0b3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBjdHguZW52LnZlcnNpb24ucmF3LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IEVkaXRvci5BcHAucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlOiBwcm9jZXNzLnZlcnNpb25zLm5vZGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlY3Ryb246IChwcm9jZXNzLnZlcnNpb25zIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pLmVsZWN0cm9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcGFiaWxpdGllczogY3R4LmVudi5jYXBhYmlsaXRpZXMsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgfTtcbn1cbiJdfQ==