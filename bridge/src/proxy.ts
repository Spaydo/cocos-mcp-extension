import * as http from 'http';
import { ToolDefinition } from './types';

/**
 * Forward a JSON-RPC request to the editor's /mcp endpoint.
 */
export function forwardJsonRpc(port: number, method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params,
        });

        const req = http.request({
            hostname: '127.0.0.1',
            port,
            path: '/mcp',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
            timeout: 30000,
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve(parsed);
                } catch (err) {
                    reject(new Error(`Invalid JSON response from editor: ${data.substring(0, 200)}`));
                }
            });
        });

        req.on('error', (err) => reject(err));
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
        req.write(body);
        req.end();
    });
}

/**
 * Fetch the tool list from the editor.
 */
export async function fetchToolList(port: number): Promise<ToolDefinition[]> {
    const response = await forwardJsonRpc(port, 'tools/list', {});
    if (response?.result?.tools) {
        return response.result.tools;
    }
    throw new Error('Failed to fetch tool list from editor');
}

/**
 * Forward a tool call to the editor and return the MCP-formatted result.
 */
export async function forwardToolCall(port: number, toolName: string, args: any): Promise<{ content: Array<{ type: string; text: string }> }> {
    const response = await forwardJsonRpc(port, 'tools/call', {
        name: toolName,
        arguments: args,
    });

    // The editor returns { result: { content: [...] } }
    if (response?.result?.content) {
        return { content: response.result.content };
    }

    // Handle errors from editor
    if (response?.error) {
        return {
            content: [{ type: 'text', text: JSON.stringify({ success: false, error: response.error.message || 'Unknown error' }) }],
        };
    }

    return {
        content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Unexpected response from editor' }) }],
    };
}

export function log(msg: string): void {
    process.stderr.write(`[cocos-mcp-bridge] ${msg}\n`);
}
