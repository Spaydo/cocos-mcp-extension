import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

const EXTENSION_NAME = 'cocos-mcp-extension';

export class AnimationTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'list_clips',
                description: 'List animation clips on a node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string', description: 'Node UUID with Animation/AnimationController component' },
                    },
                    required: ['nodeUuid'],
                },
            },
            {
                name: 'play',
                description: 'Play an animation clip on a node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string', description: 'Node UUID' },
                        clipName: { type: 'string', description: 'Animation clip name (optional, plays default if omitted)' },
                    },
                    required: ['nodeUuid'],
                },
            },
            {
                name: 'stop',
                description: 'Stop animation on a node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string', description: 'Node UUID' },
                    },
                    required: ['nodeUuid'],
                },
            },
            {
                name: 'set_clip',
                description: 'Set default animation clip or animation properties on a node',
                inputSchema: {
                    type: 'object',
                    properties: {
                        nodeUuid: { type: 'string', description: 'Node UUID' },
                        defaultClip: { type: 'string', description: 'Default clip name' },
                        playOnLoad: { type: 'boolean', description: 'Play animation on load' },
                    },
                    required: ['nodeUuid'],
                },
            },
        ];
    }

    async execute(toolName: string, args: any): Promise<ToolResponse> {
        switch (toolName) {
            case 'list_clips': return this.listClips(args.nodeUuid);
            case 'play': return this.play(args.nodeUuid, args.clipName);
            case 'stop': return this.stop(args.nodeUuid);
            case 'set_clip': return this.setClip(args);
            default: return { success: false, error: `Unknown animation tool: ${toolName}` };
        }
    }

    private async listClips(nodeUuid: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'getAnimationClips',
                args: [nodeUuid],
            });
            return result || { success: false, error: 'No data returned' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async play(nodeUuid: string, clipName?: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'playAnimation',
                args: [nodeUuid, clipName],
            });
            return result || { success: false, error: 'No data returned' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async stop(nodeUuid: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'stopAnimation',
                args: [nodeUuid],
            });
            return result || { success: false, error: 'No data returned' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private async setClip(args: any): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: EXTENSION_NAME,
                method: 'setAnimationProperty',
                args: [args.nodeUuid, args.defaultClip, args.playOnLoad],
            });
            return result || { success: false, error: 'No data returned' };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
