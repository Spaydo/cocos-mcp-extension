export interface RegistryEntry {
    port: number;
    projectPath: string;
    pid: number;
    startedAt: string;
}

export interface Registry {
    instances: RegistryEntry[];
}

export interface HealthResponse {
    status: string;
    tools: number;
    actions: number;
    projectPath: string;
    server: { name: string; version: string };
}

export interface EditorConnection {
    port: number;
    projectPath: string;
}

export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: any;
}
