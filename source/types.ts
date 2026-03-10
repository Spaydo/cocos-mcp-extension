/**
 * Shared interfaces for cocos-mcp-extension
 */

// === Server Configuration ===

export interface MCPServerSettings {
    port: number;
    autoStart: boolean;
    enableDebugLog: boolean;
    enabledCategories: Record<string, boolean>;
}

export const DEFAULT_ENABLED_CATEGORIES: Record<string, boolean> = {
    scene: true,
    node: true,
    component: true,
    asset: true,
    prefab: true,
    project: true,
    debug: true,
    scene_view: false,
    editor: false,
    reference_image: false,
    animation: false,
};

export interface ServerStatus {
    running: boolean;
    port: number;
}

// === Tool System ===

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
}

export interface ToolResponse {
    success: boolean;
    data?: any;
    message?: string;
    error?: string;
}

export interface ToolExecutor {
    getTools(): ToolDefinition[];
    execute(toolName: string, args: any): Promise<ToolResponse>;
}

// === Domain Types ===

export interface NodeInfo {
    uuid: string;
    name: string;
    active: boolean;
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number };
    scale?: { x: number; y: number; z: number };
    parent?: string;
    children?: string[];
    components?: ComponentInfo[];
}

export interface ComponentInfo {
    type: string;
    enabled: boolean;
}

export interface SceneInfo {
    name: string;
    uuid: string;
    path?: string;
}

export interface AssetInfo {
    name: string;
    uuid: string;
    url: string;
    type: string;
}
