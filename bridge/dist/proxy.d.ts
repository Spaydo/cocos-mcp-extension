import { ToolDefinition } from './types';
/**
 * Forward a JSON-RPC request to the editor's /mcp endpoint.
 */
export declare function forwardJsonRpc(port: number, method: string, params: any): Promise<any>;
/**
 * Fetch the tool list from the editor.
 */
export declare function fetchToolList(port: number): Promise<ToolDefinition[]>;
/**
 * Forward a tool call to the editor and return the MCP-formatted result.
 */
export declare function forwardToolCall(port: number, toolName: string, args: any): Promise<{
    content: Array<{
        type: string;
        text: string;
    }>;
}>;
export declare function log(msg: string): void;
//# sourceMappingURL=proxy.d.ts.map