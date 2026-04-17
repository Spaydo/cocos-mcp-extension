# Standalone MCP Bridge — Design Spec

**Date:** 2026-04-17
**Status:** Draft
**Scope:** Standalone stdio MCP server + editor auto-port + registry, enabling multi-project multi-editor control

## 1. Problem

The current MCP server runs inside the Cocos Creator extension. When two editors open simultaneously, they compete for the same port (default 3000), causing the second to fail. There is no way for an AI session to automatically route tool calls to the correct editor based on which project it's working on.

## 2. Solution Overview

Two changes:

1. **Editor extension enhancement** — auto-port fallback + instance registry file
2. **New standalone `cocos-mcp-bridge` package** — stdio MCP server that auto-discovers the correct editor and proxies all tool calls

### Architecture

```
Project A Claude Code session              Project B Claude Code session
       ↓ stdio                                     ↓ stdio
  cocos-mcp-bridge (process A)              cocos-mcp-bridge (process B)
       │ auto-discover via registry               │ auto-discover via registry
       │ match cwd to projectPath                 │ match cwd to projectPath
       ↓ HTTP forward                             ↓ HTTP forward
Cocos Editor A (auto port 3000)         Cocos Editor B (auto port 3001)
  └── Extension HTTP relay                └── Extension HTTP relay
       └── Editor.Message IPC                 └── Editor.Message IPC
```

## 3. Component 1: Editor Extension Enhancement

### 3.1 Auto-Port (mcp-server.ts)

Modify `start()` to try ports sequentially:

```
1. Try configured port (default 3000)
2. If EADDRINUSE, try port+1, port+2, ... up to port+10
3. If all fail, report error
4. On success, record actual port
```

### 3.2 Health Endpoint Enhancement

Current `/health` returns:
```json
{ "status": "ok", "tools": 8, "actions": 86, "server": {...} }
```

Add `projectPath`:
```json
{
  "status": "ok",
  "tools": 8,
  "actions": 86,
  "projectPath": "C:/Users/1123j/_data/cocos_mcp_extension/dev-cocos-extension",
  "server": { "name": "cocos-mcp-extension", "version": "1.0.0" }
}
```

`projectPath` comes from `Editor.Project.path`.

### 3.3 Instance Registry

On server start, write to `~/.cocos-mcp-registry.json`:
```json
{
  "instances": [
    {
      "port": 3000,
      "projectPath": "C:/projects/game-a",
      "pid": 12345,
      "startedAt": "2026-04-17T10:00:00.000Z"
    }
  ]
}
```

- On start: append own entry (or update if same projectPath already exists)
- On stop (unload): remove own entry
- Registry file locked during writes (use atomic write with temp file + rename)
- Stale entries (PID no longer running) are cleaned on each read

### 3.4 Files Modified

- `source/mcp-server.ts` — auto-port logic in `start()`, projectPath in `handleHealth()`, registry write/remove
- No other files need changes

## 4. Component 2: Standalone MCP Bridge (`cocos-mcp-bridge`)

### 4.1 Location

New directory: `C:\Users\1123j\_data\cocos_mcp_extension\cocos-mcp-bridge\`

This is a **separate npm package**, independent from the editor extension.

### 4.2 Package Structure

```
cocos-mcp-bridge/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Entry: create MCP server, start stdio transport
│   ├── discovery.ts      # Find the correct editor instance
│   ├── proxy.ts          # Forward tool calls via HTTP
│   └── types.ts          # Shared types
└── dist/
    └── index.js          # Compiled entry point
```

### 4.3 Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.18.0"
  }
}
```

No other external dependencies. Uses Node.js built-in `http` module for forwarding.

### 4.4 Discovery Logic (discovery.ts) — Lazy Discovery

The bridge does NOT discover the editor at startup. Instead, it discovers **lazily on first tool call** and re-discovers automatically when the connection fails.

```
State: cachedEditor: { port, projectPath } | null = null

findEditor(cwd: string): Promise<{ port: number, projectPath: string }>
  If cachedEditor is valid (health check passes) → return cached
  Otherwise:
    1. Read ~/.cocos-mcp-registry.json
    2. Clean stale entries (PID check via process.kill(pid, 0))
    3. For each live entry:
       a. HTTP GET http://localhost:{port}/health (timeout 2s)
       b. If reachable and response.projectPath matches:
          - Exact match: cwd === projectPath → return immediately
          - Contains match: cwd starts with projectPath → candidate
          - Reverse: projectPath starts with cwd → candidate
    4. If exactly one candidate → cache and return it
    5. If multiple candidates → pick the most specific (longest projectPath)
    6. If no candidates from registry:
       a. Port scan 3000-3010: GET /health on each
       b. Apply same matching logic
    7. If still no match → return error:
       "No Cocos Creator editor found for this project.
        Please ensure the editor is running with the MCP extension enabled."
```

**Key behaviors:**
- Editor can start before OR after Claude Code — the bridge waits
- If the editor restarts (new port), the next tool call re-discovers automatically
- Cached connection is validated with a quick `/health` check before each tool call
- Health check failures clear the cache, triggering re-discovery

### 4.5 Tool Proxy (proxy.ts)

The bridge does NOT hardcode any tool definitions. It dynamically mirrors whatever the editor exposes. Tool list is fetched lazily on first `tools/list` request and refreshed on re-discovery.

```
1. On tools/list: POST {jsonrpc, method: "tools/list"} to editor /mcp (discovered lazily)
2. Parse the tool list from response, cache it
3. Forward each tool definition to the MCP client via stdio
4. On tool call: POST {jsonrpc, method: "tools/call", params: {name, arguments}} to editor /mcp
5. If HTTP fails: clear cache, re-discover, retry once
6. Return the response to Claude Code via stdio
```

This means:
- If the editor enables/disables categories, the bridge automatically reflects it
- New tools added to the editor are instantly available without bridge changes
- The bridge is stateless — it's a pure proxy

### 4.6 Entry Point (index.ts)

```typescript
async function main() {
    const cwd = process.cwd();
    const proxy = new EditorProxy(cwd);  // Holds discovery + forwarding logic
    
    // 1. Create MCP server (no discovery yet — lazy)
    const server = new McpServer({ name: "cocos-creator", version: "1.0.0" });
    
    // 2. Register tools/list handler (fetches from editor on demand)
    // 3. Register tool call handler (discovers editor + forwards on demand)
    proxy.registerHandlers(server);
    
    // 4. Start stdio transport — bridge is ready immediately
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`[cocos-mcp-bridge] Ready. Will auto-discover editor for: ${cwd}`);
}
```

The bridge starts instantly (< 100ms) without waiting for any editor. Discovery happens on the first actual tool interaction.

### 4.7 Error Handling

| Scenario | Behavior |
|---|---|
| No editor found (lazy) | Tool call returns `{ success: false, error: "No Cocos Creator editor found for this project. Please ensure the editor is running with the MCP extension enabled." }`. Does NOT exit — will retry on next call. |
| Editor disconnects mid-session | Clear cached connection, re-discover on next call. If re-discovery fails, return error but keep bridge alive for future retries. |
| Health check timeout | Skip that port, continue scanning |
| Registry file missing | Fall back to port scan |
| Multiple matches | Pick most specific path match |

## 5. MCP Client Configuration

### 5.1 Per-project .mcp.json

Place in each Cocos project root:

```json
{
  "mcpServers": {
    "cocos-creator": {
      "command": "node",
      "args": ["C:/Users/1123j/_data/cocos_mcp_extension/cocos-mcp-bridge/dist/index.js"]
    }
  }
}
```

Or, if installed globally via npm:

```json
{
  "mcpServers": {
    "cocos-creator": {
      "command": "cocos-mcp-bridge"
    }
  }
}
```

### 5.2 How It Works

1. Claude Code opens project A → starts `cocos-mcp-bridge` via stdio
2. Bridge runs, `cwd` = project A's directory
3. Bridge discovers editor at port 3000 (projectPath matches)
4. Claude Code opens project B → starts another `cocos-mcp-bridge` via stdio
5. This bridge's `cwd` = project B's directory
6. Bridge discovers editor at port 3001 (projectPath matches)
7. Two independent sessions, each controlling their own editor

## 6. Implementation Order

1. **Editor enhancement** — auto-port + health projectPath + registry (mcp-server.ts only)
2. **cocos-mcp-bridge** — new package, 4 files
3. **Build + test** — verify two editors can run simultaneously
4. **.mcp.json config** — set up for both projects

## 7. Non-Goals

- No WebSocket or TCP transport (HTTP forwarding only)
- No tool list caching (always fetch fresh from editor)
- No authentication between bridge and editor (localhost only)
- No changes to the 125 existing tool actions
- No npm publishing (local path reference)

## 8. Success Criteria

1. Two Cocos Creator editors can run simultaneously on different auto-assigned ports
2. Each Claude Code session automatically finds and connects to the correct editor
3. All 125 tool actions work through the bridge with no behavior changes
4. No manual port configuration needed
5. Bridge startup takes < 100ms (lazy — no discovery at startup)
6. Editor can start before or after Claude Code — bridge auto-discovers when needed
7. Editor restart is handled gracefully — bridge re-discovers on next tool call
