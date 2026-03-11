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
4. In the **Tool Categories** section, check the tool categories you want to enable
5. Enable the MCP Server toggle
6. Once the status shows "Running", you're ready to connect

## AI Client MCP Configuration

After starting the MCP Server, configure the connection in your AI tool. See [`mcp-configs/README.md`](mcp-configs/README.md) for example configs and instructions.

Supported AI tools: VS Code + Claude Code, Claude Desktop / CLI, Cursor, Windsurf.

Verify connection:

```bash
curl http://localhost:3000/health
# Expected response: {"status":"ok","tools":88,...}
```

## Supported Tools

88 tools across 11 categories (7 core + 4 advanced). MCP tool names follow the `category_action` format.

You can enable/disable tool categories in the panel's **Tool Categories** section to reduce AI token usage.

### Scene — 13 tools

| Tool Name | Description |
|-----------|-------------|
| `scene_query` | Get current scene info and hierarchy tree |
| `scene_list` | List all scene files in the project |
| `scene_open` | Open a scene by `db://` path |
| `scene_save` | Save the current scene |
| `scene_create` | Create a new scene asset |
| `scene_snapshot` | Create an undo snapshot of the current scene |
| `scene_dirty` | Check if scene has unsaved changes |
| `scene_reload` | Soft reload the current scene |
| `scene_classes` | List all registered component classes |
| `scene_close` | Close the current scene |
| `scene_save_as` | Save the current scene as a new file |
| `scene_ready` | Check if the scene editor is ready |
| `scene_bounds` | Get the bounding box of the scene view |

### Node — 8 tools

| Tool Name | Description |
|-----------|-------------|
| `node_query` | Query node by UUID, name, or list all nodes (supports includeComponents) |
| `node_create` | Create a new node (supports setting position, rotation, scale, components in one call) |
| `node_delete` | Delete a node from the scene |
| `node_set_property` | Set node property (supports batch mode) |
| `node_move` | Move node to a new parent |
| `node_duplicate` | Duplicate a node |
| `node_reset_transform` | Reset node position/rotation/scale to defaults |
| `node_find_by_asset` | Find all nodes using a specific asset |

### Component — 9 tools

| Tool Name | Description |
|-----------|-------------|
| `component_add` | Add a component to a node |
| `component_remove` | Remove a component from a node |
| `component_query` | Query components on a node with optional detailed properties |
| `component_set_property` | Set component property (supports batch mode, node, color, vec3, etc.) |
| `component_reset` | Reset a component to default values |
| `component_list_types` | List all available component types |
| `component_query_detail` | Query a single component by UUID for full details |
| `component_execute_method` | Execute a method on a component at runtime |
| `component_list_all` | List all registered components (with name, cid, script path, asset UUID) |

### Asset — 14 tools

| Tool Name | Description |
|-----------|-------------|
| `asset_query` | Query assets by pattern, UUID, or URL |
| `asset_create` | Create a new asset file |
| `asset_delete` | Delete an asset |
| `asset_move` | Move or rename an asset |
| `asset_import` | Import an external file as an asset |
| `asset_info` | Get detailed asset metadata and dependencies |
| `asset_query_uuid` | Convert between asset URL and UUID |
| `asset_copy` | Copy an asset to a new location |
| `asset_save` | Save/overwrite content of an existing asset |
| `asset_query_meta` | Get asset meta information (import settings, etc.) |
| `asset_query_users` | Reverse dependency: find which assets reference this one |
| `asset_query_dependencies` | Forward dependency: find which assets this one depends on |
| `asset_open` | Open an asset in the editor |
| `asset_reimport` | Re-import an asset (regenerate compiled/library files) |

### Prefab — 6 tools

| Tool Name | Description |
|-----------|-------------|
| `prefab_query` | Query prefab internal node/component hierarchy (reads .prefab file, does not modify scene) |
| `prefab_list` | List all prefab assets in the project |
| `prefab_instantiate` | Instantiate a prefab into the scene (with proper prefab linking) |
| `prefab_create` | Create a prefab from an existing scene node |
| `prefab_restore` | Restore a prefab instance to its original state |
| `prefab_create_empty` | Create a new empty prefab asset directly (no scene node needed) |

### Project — 6 tools

| Tool Name | Description |
|-----------|-------------|
| `project_info` | Get project path, engine version, and settings |
| `project_refresh` | Refresh the asset database |
| `project_build` | Build project for a target platform |
| `project_preview` | Start or stop game preview |
| `project_query_config` | Read a project-level configuration value |
| `project_set_config` | Set a project-level configuration value |

### Debug — 3 tools

| Tool Name | Description |
|-----------|-------------|
| `debug_get_logs` | Get recent console/editor logs (supports errors_only, since timestamp filtering) |
| `debug_clear_logs` | Clear the log buffer |
| `debug_execute_script` | Execute JavaScript in scene context (has access to cc.* APIs) |

### Scene View — 10 tools *(advanced)*

| Tool Name | Description |
|-----------|-------------|
| `scene_view_gizmo_tool` | Get or set gizmo tool (position/rotation/scale/rect) |
| `scene_view_gizmo_pivot` | Get or set gizmo pivot (pivot/center) |
| `scene_view_gizmo_coordinate` | Get or set coordinate system (local/global) |
| `scene_view_view_mode` | Get or set 2D/3D view mode |
| `scene_view_grid` | Show or hide the scene grid |
| `scene_view_focus` | Focus scene camera on specific node(s) |
| `scene_view_align_camera` | Align scene camera with current view |
| `scene_view_align_view` | Align view with a specific node |
| `scene_view_icon_gizmo` | Get or set icon gizmo 3D mode and size |
| `scene_view_status` | Get all scene view settings at once |

### Editor — 8 tools *(advanced)*

| Tool Name | Description |
|-----------|-------------|
| `editor_preferences_query` | Read editor or project preferences |
| `editor_preferences_set` | Write editor or project preferences |
| `editor_open_settings` | Open the preferences panel |
| `editor_network_info` | Get server IPs and port info |
| `editor_editor_info` | Get editor version, platform, Node.js version |
| `editor_engine_info` | Get engine version, path, and native engine info |
| `editor_open_url` | Open a URL or external program |
| `editor_query_devices` | Query connected devices (for native platform debugging) |

### Reference Image — 7 tools *(advanced)*

| Tool Name | Description |
|-----------|-------------|
| `reference_image_add` | Add a reference image to the scene view |
| `reference_image_remove` | Remove a reference image |
| `reference_image_switch` | Switch active reference image |
| `reference_image_set_property` | Set reference image position, scale, opacity |
| `reference_image_query` | Get all reference image configurations |
| `reference_image_query_current` | Get current active reference image info |
| `reference_image_clear` | Remove all reference images |

### Animation — 4 tools *(advanced)*

| Tool Name | Description |
|-----------|-------------|
| `animation_list_clips` | List animation clips on a node |
| `animation_play` | Play an animation clip |
| `animation_stop` | Stop animation playback |
| `animation_set_clip` | Set default animation clip or animation properties |

## Compatibility

- Cocos Creator >= 3.8.4
