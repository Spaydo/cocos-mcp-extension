import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

export class ReferenceImageTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'add',
                description: 'Add a reference image to the scene view',
                inputSchema: {
                    type: 'object',
                    properties: {
                        path: { type: 'string', description: 'Image file path or db:// URL' },
                    },
                    required: ['path'],
                },
            },
            {
                name: 'remove',
                description: 'Remove a reference image by index',
                inputSchema: {
                    type: 'object',
                    properties: {
                        index: { type: 'number', description: 'Reference image index to remove' },
                    },
                    required: ['index'],
                },
            },
            {
                name: 'switch',
                description: 'Switch active reference image by index',
                inputSchema: {
                    type: 'object',
                    properties: {
                        index: { type: 'number', description: 'Reference image index to activate' },
                    },
                    required: ['index'],
                },
            },
            {
                name: 'set_property',
                description: 'Set reference image properties (position, scale, opacity)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        x: { type: 'number', description: 'X position offset' },
                        y: { type: 'number', description: 'Y position offset' },
                        scale: { type: 'number', description: 'Scale factor' },
                        opacity: { type: 'number', description: 'Opacity (0-1)' },
                    },
                },
            },
            {
                name: 'query',
                description: 'Get all reference image configurations',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'query_current',
                description: 'Get the current active reference image info',
                inputSchema: { type: 'object', properties: {} },
            },
            {
                name: 'clear',
                description: 'Remove all reference images',
                inputSchema: { type: 'object', properties: {} },
            },
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'add': return this.add(args.path);
            case 'remove': return this.remove(args.index);
            case 'switch': return this.switchImage(args.index);
            case 'set_property': return this.setProperty(args);
            case 'query': return this.query();
            case 'query_current': return this.queryCurrent();
            case 'clear': return this.clear();
            default: return { success: false, error: `Unknown reference_image tool: ${toolName}` };
        }
    }

    private async add(path: string): Promise<ToolResponse> {
        try {
            await Editor.Message.request('reference-image', 'add', path);
            return { success: true, message: `Reference image added: ${path}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async remove(index: number): Promise<ToolResponse> {
        try {
            await Editor.Message.request('reference-image', 'remove', index);
            return { success: true, message: `Reference image ${index} removed` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async switchImage(index: number): Promise<ToolResponse> {
        try {
            await Editor.Message.request('reference-image', 'switch', index);
            return { success: true, message: `Switched to reference image ${index}` };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async setProperty(args: any): Promise<ToolResponse> {
        try {
            const config: any = {};
            if (args.x !== undefined) config.x = args.x;
            if (args.y !== undefined) config.y = args.y;
            if (args.scale !== undefined) config.scale = args.scale;
            if (args.opacity !== undefined) config.opacity = args.opacity;
            await Editor.Message.request('reference-image', 'set-config', config);
            return { success: true, message: 'Reference image properties updated' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async query(): Promise<ToolResponse> {
        try {
            const config: any = await Editor.Message.request('reference-image', 'query-config');
            return { success: true, data: config };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async queryCurrent(): Promise<ToolResponse> {
        try {
            const current: any = await Editor.Message.request('reference-image', 'query-current');
            return { success: true, data: current };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async clear(): Promise<ToolResponse> {
        try {
            await Editor.Message.request('reference-image', 'clear');
            return { success: true, message: 'All reference images removed' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
