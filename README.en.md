**English** | **[中文](README.md)**

# Cocos MCP Extension

A Cocos Creator editor extension that provides an MCP (Model Context Protocol) HTTP Server, enabling AI assistants (Claude Code, Cursor, etc.) to remotely control the Cocos Creator editor via JSON-RPC 2.0.

## Installation

Copy the `cocos-mcp-extension` directory into your Cocos Creator project's `extensions/` directory, then enable it in the editor.

```bash
cd extensions/cocos-mcp-extension
npm install
npm run build
```

> **Note:** Pre-built extensions work out of the box. These commands are only needed after modifying the source code.

## Usage

1. In Cocos Creator, open **Extension → Extension Manager → Installed** and enable the extension
2. Open **Extension → Cocos MCP → MCP Server Panel**
3. Set the port (default: 3000)
4. Enable the MCP Server toggle
5. Once the status shows "Running", you're ready to connect

## AI Client MCP Configuration

After starting the MCP Server, configure the connection in your AI tool. See [`mcp-configs/README.md`](mcp-configs/README.md) for example configs and instructions.

Supported AI tools: VS Code + Claude Code, Claude Desktop / CLI, Cursor, Windsurf.

Verify connection:

```bash
curl http://localhost:3000/health
# Expected response: {"status":"ok","tools":29,...}
```

## Supported Tools

29 tools across 7 categories. MCP tool names follow the `category_action` format.

### Scene — 6 tools

| Tool Name | Description |
|-----------|-------------|
| `scene_query` | Get current scene info and hierarchy tree |
| `scene_list` | List all scene files in the project |
| `scene_open` | Open a scene by `db://` path |
| `scene_save` | Save the current scene |
| `scene_create` | Create a new scene asset |
| `scene_snapshot` | Create an undo snapshot of the current scene |

### Node — 5 tools

| Tool Name | Description |
|-----------|-------------|
| `node_query` | Query node by UUID, name, or list all nodes |
| `node_create` | Create a new node in the scene |
| `node_delete` | Delete a node from the scene |
| `node_set_property` | Set node property (name, active, position, rotation, scale, layer) |
| `node_move` | Move node to a new parent |

### Component — 4 tools

| Tool Name | Description |
|-----------|-------------|
| `component_add` | Add a component to a node |
| `component_remove` | Remove a component from a node |
| `component_query` | Query components on a node with optional detailed properties |
| `component_set_property` | Set a component property value (supports node, color, vec3, etc.) |

### Asset — 5 tools

| Tool Name | Description |
|-----------|-------------|
| `asset_query` | Query assets by pattern, UUID, or URL |
| `asset_create` | Create a new asset file |
| `asset_delete` | Delete an asset |
| `asset_move` | Move or rename an asset |
| `asset_query_uuid` | Convert between asset URL and UUID |

### Prefab — 4 tools

| Tool Name | Description |
|-----------|-------------|
| `prefab_list` | List all prefab assets in the project |
| `prefab_instantiate` | Instantiate a prefab into the scene (with proper prefab linking) |
| `prefab_create` | Create a prefab from an existing scene node |
| `prefab_create_empty` | Create a new empty prefab asset directly (no scene node needed) |

### Project — 2 tools

| Tool Name | Description |
|-----------|-------------|
| `project_info` | Get project path, engine version, and settings |
| `project_refresh` | Refresh the asset database |

### Debug — 3 tools

| Tool Name | Description |
|-----------|-------------|
| `debug_get_logs` | Get recent console logs from the extension |
| `debug_clear_logs` | Clear the log buffer |
| `debug_execute_script` | Execute JavaScript in scene context (has access to cc.* APIs) |

## Compatibility

- Cocos Creator >= 3.8.4
