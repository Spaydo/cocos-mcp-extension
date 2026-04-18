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
exports.forwardJsonRpc = forwardJsonRpc;
exports.fetchToolList = fetchToolList;
exports.forwardToolCall = forwardToolCall;
exports.log = log;
const http = __importStar(require("http"));
/**
 * Forward a JSON-RPC request to the editor's /mcp endpoint.
 */
function forwardJsonRpc(port, method, params) {
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
                }
                catch (err) {
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
async function fetchToolList(port) {
    const response = await forwardJsonRpc(port, 'tools/list', {});
    if (response?.result?.tools) {
        return response.result.tools;
    }
    throw new Error('Failed to fetch tool list from editor');
}
/**
 * Forward a tool call to the editor and return the MCP-formatted result.
 */
async function forwardToolCall(port, toolName, args) {
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
function log(msg) {
    process.stderr.write(`[cocos-mcp-bridge] ${msg}\n`);
}
//# sourceMappingURL=proxy.js.map