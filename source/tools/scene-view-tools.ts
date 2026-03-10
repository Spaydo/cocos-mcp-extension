import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class SceneViewTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'gizmo_tool',
                description: 'Get or set gizmo tool type (position/rotation/scale/rect)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        tool: { type: 'string', description: 'Set tool: position, rotation, scale, rect. Omit to get current' },
                    },
                },
            },
            {
                name: 'gizmo_pivot',
                description: 'Get or set gizmo pivot (pivot/center)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        pivot: { type: 'string', description: 'Set pivot: pivot, center. Omit to get current' },
                    },
                },
            },
            {
                name: 'gizmo_coordinate',
                description: 'Get or set gizmo coordinate system (local/global)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        coordinate: { type: 'string', description: 'Set: local, global. Omit to get current' },
                    },
                },
            },
            {
                name: 'view_mode',
                description: 'Get or set 2D/3D view mode',
                inputSchema: {
                    type: 'object',
                    properties: {
                        mode: { type: 'string', description: 'Set: 2d, 3d. Omit to get current' },
                    },
                },
            },
            {
                name: 'grid',
                description: 'Show or hide the scene grid',
                inputSchema: {
                    type: 'object',
                    properties: {
                        visible: { type: 'boolean', description: 'Set grid visibility. Omit to get current' },
                    },
                },
            },
            {
                name: 'focus',
                description: 'Focus scene camera on specific node(s)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuids: {
                            type: 'array',
                            items: { type: 'string' },
                            description: 'Node UUIDs to focus on',
                        },
                    },
                    required: ['uuids'],
                },
            },
            {
                name: 'align_camera',
                description: 'Align scene camera with current view',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'align_view',
                description: 'Align view with a specific node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Node UUID to align view with' },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'icon_gizmo',
                description: 'Get or set icon gizmo settings (3D mode and size)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        is3D: { type: 'boolean', description: 'Set 3D icon mode' },
                        size: { type: 'number', description: 'Set icon size' },
                    },
                },
            },
            {
                name: 'status',
                description: 'Get all scene view settings at once',
                inputSchema: { type: 'object', properties: {} },
            },
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'gizmo_tool': return this.gizmoTool(args?.tool);
            case 'gizmo_pivot': return this.gizmoPivot(args?.pivot);
            case 'gizmo_coordinate': return this.gizmoCoordinate(args?.coordinate);
            case 'view_mode': return this.viewMode(args?.mode);
            case 'grid': return this.grid(args?.visible);
            case 'focus': return this.focus(args.uuids);
            case 'align_camera': return this.alignCamera();
            case 'align_view': return this.alignView(args.uuid);
            case 'icon_gizmo': return this.iconGizmo(args);
            case 'status': return this.status();
            default: return { success: false, error: `Unknown scene_view tool: ${toolName}` };
        }
    }

    private async gizmoTool(tool?: string): Promise<ToolResponse> {
        try {
            if (tool) {
                await Editor.Message.request('scene', 'set-transform-tool', tool);
                return { success: true, message: `Gizmo tool set to: ${tool}` };
            }
            const current: any = await Editor.Message.request('scene', 'query-transform-tool');
            return { success: true, data: { tool: current } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async gizmoPivot(pivot?: string): Promise<ToolResponse> {
        try {
            if (pivot) {
                await Editor.Message.request('scene', 'set-pivot', pivot);
                return { success: true, message: `Pivot set to: ${pivot}` };
            }
            const current: any = await Editor.Message.request('scene', 'query-pivot');
            return { success: true, data: { pivot: current } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async gizmoCoordinate(coordinate?: string): Promise<ToolResponse> {
        try {
            if (coordinate) {
                await Editor.Message.request('scene', 'set-coordinate', coordinate);
                return { success: true, message: `Coordinate system set to: ${coordinate}` };
            }
            const current: any = await Editor.Message.request('scene', 'query-coordinate');
            return { success: true, data: { coordinate: current } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async viewMode(mode?: string): Promise<ToolResponse> {
        try {
            if (mode) {
                const is3D = mode === '3d';
                await Editor.Message.request('scene', 'set-is3d', is3D);
                return { success: true, message: `View mode set to: ${mode}` };
            }
            const is3D: any = await Editor.Message.request('scene', 'query-is3d');
            return { success: true, data: { mode: is3D ? '3d' : '2d' } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async grid(visible?: boolean): Promise<ToolResponse> {
        try {
            if (visible !== undefined) {
                await Editor.Message.request('scene', 'set-grid-visible', visible);
                return { success: true, message: `Grid ${visible ? 'shown' : 'hidden'}` };
            }
            const current: any = await Editor.Message.request('scene', 'query-grid-visible');
            return { success: true, data: { visible: current } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async focus(uuids: string[]): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'focus-node', uuids);
            return { success: true, message: `Focused on ${uuids.length} node(s)` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async alignCamera(): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'align-node-to-scene-view');
            return { success: true, message: 'Camera aligned with view' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async alignView(uuid: string): Promise<ToolResponse> {
        try {
            await Editor.Message.request('scene', 'align-scene-view-to-node', uuid);
            return { success: true, message: `View aligned with node ${uuid}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async iconGizmo(args: any): Promise<ToolResponse> {
        try {
            if (args?.is3D !== undefined) {
                await Editor.Message.request('scene', 'set-icon-gizmo-3d', args.is3D);
            }
            if (args?.size !== undefined) {
                await Editor.Message.request('scene', 'set-icon-gizmo-size', args.size);
            }
            if (args?.is3D !== undefined || args?.size !== undefined) {
                return { success: true, message: 'Icon gizmo settings updated' };
            }
            // Query current settings
            const is3D: any = await Editor.Message.request('scene', 'query-icon-gizmo-3d');
            const size: any = await Editor.Message.request('scene', 'query-icon-gizmo-size');
            return { success: true, data: { is3D, size } };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async status(): Promise<ToolResponse> {
        try {
            const results: any = {};
            const queries: [string, string][] = [
                ['tool', 'query-transform-tool'],
                ['pivot', 'query-pivot'],
                ['coordinate', 'query-coordinate'],
                ['is3D', 'query-is3d'],
                ['gridVisible', 'query-grid-visible'],
            ];
            for (const [key, msg] of queries) {
                try {
                    results[key] = await Editor.Message.request('scene', msg);
                } catch {
                    results[key] = null;
                }
            }
            return { success: true, data: results };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
