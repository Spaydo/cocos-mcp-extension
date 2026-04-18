#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Discovery } from './discovery';
import { fetchToolList, forwardToolCall, log } from './proxy';
import { ToolDefinition } from './types';

async function main() {
    const cwd = process.cwd();
    const discovery = new Discovery(cwd);

    // Create MCP server — starts instantly, no discovery yet (lazy)
    const server = new McpServer({
        name: 'cocos-creator',
        version: '1.0.0',
    });

    let cachedTools: ToolDefinition[] | null = null;

    // Helper: ensure we have a valid editor connection
    async function ensureEditor(): Promise<number> {
        const editor = await discovery.getEditor();
        if (!editor) {
            throw new Error(
                'No Cocos Creator editor found for this project. ' +
                'Please ensure the editor is running with the MCP extension enabled.\n' +
                `Searched for project matching: ${cwd}`
            );
        }
        return editor.port;
    }

    // Helper: get tools (with lazy fetch + cache)
    async function getTools(): Promise<ToolDefinition[]> {
        if (cachedTools) return cachedTools;
        const port = await ensureEditor();
        cachedTools = await fetchToolList(port);
        return cachedTools;
    }

    // Register the tools/list handler
    // The MCP SDK calls this when a client requests the tool list
    // We need to register tools dynamically based on what the editor exposes

    // Since the MCP SDK requires tools to be registered upfront via server.tool(),
    // we use a different approach: register a catch-all via the low-level API,
    // or we fetch tools at startup and register them.
    //
    // Best approach: use server.setRequestHandler for tools/list and tools/call

    // Use the low-level Server API for more control
    const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
    const { ListToolsRequestSchema, CallToolRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');

    const lowServer = new Server(
        { name: 'cocos-creator', version: '1.0.0' },
        { capabilities: { tools: {} } }
    );

    // Handle tools/list
    lowServer.setRequestHandler(ListToolsRequestSchema, async () => {
        try {
            const tools = await getTools();
            return { tools };
        } catch (err: any) {
            log(`tools/list error: ${err.message}`);
            return { tools: [] };
        }
    });

    // Handle tools/call
    lowServer.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;

        try {
            const port = await ensureEditor();
            const result = await forwardToolCall(port, name, args || {});
            return result;
        } catch (err: any) {
            // Connection failed — clear cache so next call retries
            discovery.clearCache();
            cachedTools = null;

            // Try once more after re-discovery
            try {
                const port = await ensureEditor();
                const result = await forwardToolCall(port, name, args || {});
                return result;
            } catch (retryErr: any) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: `Editor connection failed: ${retryErr.message}. Please check if Cocos Creator is running.`,
                        }),
                    }],
                };
            }
        }
    });

    // Start stdio transport
    const transport = new StdioServerTransport();
    await lowServer.connect(transport);
    log(`Ready. Will auto-discover editor for: ${cwd}`);
}

main().catch((err) => {
    process.stderr.write(`[cocos-mcp-bridge] Fatal: ${err.message}\n`);
    process.exit(1);
});
