#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const discovery_1 = require("./discovery");
const proxy_1 = require("./proxy");
async function main() {
    const cwd = process.cwd();
    const discovery = new discovery_1.Discovery(cwd);
    // Create MCP server — starts instantly, no discovery yet (lazy)
    const server = new mcp_js_1.McpServer({
        name: 'cocos-creator',
        version: '1.0.0',
    });
    let cachedTools = null;
    // Helper: ensure we have a valid editor connection
    async function ensureEditor() {
        const editor = await discovery.getEditor();
        if (!editor) {
            throw new Error('No Cocos Creator editor found for this project. ' +
                'Please ensure the editor is running with the MCP extension enabled.\n' +
                `Searched for project matching: ${cwd}`);
        }
        return editor.port;
    }
    // Helper: get tools (with lazy fetch + cache)
    async function getTools() {
        if (cachedTools)
            return cachedTools;
        const port = await ensureEditor();
        cachedTools = await (0, proxy_1.fetchToolList)(port);
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
    const { Server } = await Promise.resolve().then(() => __importStar(require('@modelcontextprotocol/sdk/server/index.js')));
    const { ListToolsRequestSchema, CallToolRequestSchema } = await Promise.resolve().then(() => __importStar(require('@modelcontextprotocol/sdk/types.js')));
    const lowServer = new Server({ name: 'cocos-creator', version: '1.0.0' }, { capabilities: { tools: {} } });
    // Handle tools/list
    lowServer.setRequestHandler(ListToolsRequestSchema, async () => {
        try {
            const tools = await getTools();
            return { tools };
        }
        catch (err) {
            (0, proxy_1.log)(`tools/list error: ${err.message}`);
            return { tools: [] };
        }
    });
    // Handle tools/call
    lowServer.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            const port = await ensureEditor();
            const result = await (0, proxy_1.forwardToolCall)(port, name, args || {});
            return result;
        }
        catch (err) {
            // Connection failed — clear cache so next call retries
            discovery.clearCache();
            cachedTools = null;
            // Try once more after re-discovery
            try {
                const port = await ensureEditor();
                const result = await (0, proxy_1.forwardToolCall)(port, name, args || {});
                return result;
            }
            catch (retryErr) {
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
    const transport = new stdio_js_1.StdioServerTransport();
    await lowServer.connect(transport);
    (0, proxy_1.log)(`Ready. Will auto-discover editor for: ${cwd}`);
}
main().catch((err) => {
    process.stderr.write(`[cocos-mcp-bridge] Fatal: ${err.message}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map