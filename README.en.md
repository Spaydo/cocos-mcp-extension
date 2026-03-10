# Cocos MCP Extension

A Cocos Creator editor extension that provides an MCP (Model Context Protocol) HTTP Server, enabling AI assistants (Claude Code, Cursor, etc.) to remotely control the Cocos Creator editor via JSON-RPC 2.0.

## Installation

Copy the `cocos-mcp-extension` directory into your Cocos Creator project's `extensions/` directory, then enable it in the editor.

```bash
cd extensions/cocos-mcp-extension
npm install
npm run build
```

## Usage

1. In Cocos Creator, open **Extension → Cocos MCP → MCP Server Panel**
2. Set the port (default: 3000)
3. Enable the MCP Server toggle
4. Once the status shows "Running", you're ready to connect

## AI Client MCP Configuration

After starting the MCP Server, you need to configure the connection in your AI tool. Each tool has its own configuration format. Example config files are available in the [`mcp-configs/`](mcp-configs/) directory.

> **Port note:** All examples below use the default port `3000`. If you changed the port in the extension settings, update the URL accordingly.

### VS Code + Claude Code Extension

Copy `.mcp.json` to your **project root directory** (not the extension directory):

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

**File location:** `<your-project-root>/.mcp.json`

Restart the Claude Code session after adding the config.

### Claude Desktop / Claude Code CLI

Quick setup via CLI:

```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

Or manually edit the config file. Claude Desktop config is located at:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "url",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

### Cursor

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

**File location:** `<your-project-root>/.cursor/mcp.json`

### Windsurf

Create `.windsurf/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "cocos-creator": {
      "serverUrl": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

**File location:** `<your-project-root>/.windsurf/mcp.json`

### Verify Connection

After configuration, verify the server is running:

```bash
curl http://localhost:3000/health
# Expected response: {"status":"ok","tools":28,...}
```

## Supported Tools

| Category | Count | Features |
|----------|-------|----------|
| scene | 6 | Scene query, open, save, create |
| node | 5 | Node query, create, delete, set properties, move |
| component | 4 | Component add, remove, query, set properties |
| asset | 5 | Asset query, create, delete, move, UUID lookup |
| prefab | 3 | Prefab list, instantiate, create |
| project | 2 | Project info, refresh assets |
| debug | 3 | Console logs, execute scripts |

28 tools in total.

## Compatibility

- Cocos Creator >= 3.8.4
