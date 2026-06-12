**English** | **[中文](README.md)**

# Cocos MCP Extension

Control the Cocos Creator editor from AI assistants (Claude Code, Cursor, Windsurf...) via the standard **MCP (Model Context Protocol)**.

- Built on the official [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) and the official editor API (`@cocos/creator-types`)
- Supports Cocos Creator **3.8.4 and 3.8.8** — version differences are absorbed by a built-in adapter layer
- **9 tools, 76 actions**: scene, nodes, components, assets, prefabs, scene view, editor operations

## Architecture

```
MCP client (Claude Code / Cursor / Windsurf)
   │  stdio (standard MCP)
   ▼
Sidecar — MCP server (system Node ≥ 18, official SDK)
   │  HTTP (127.0.0.1 + token, internal channel)
   ▼
Editor extension bridge (editor main process)
   │  Editor.Message.request(...)
   ▼
Cocos Creator editor
```

Why a sidecar: the 3.8.4 editor embeds Node 14.16 which cannot run the MCP SDK (requires Node ≥ 18). Running the MCP server on the system Node makes both editor versions connect identically and isolates protocol issues from the editor process.

## Install

1. Copy this folder into your project's `extensions/` directory:

```bash
cd <your-project>/extensions/cocos-mcp-extension
npm install
npm run build
```

2. Enable it in the editor: **Extension → Extension Manager → Installed**
3. Requirement: **Node.js ≥ 18** on your system (for the sidecar)

> Precompiled `dist/` and `dist-sidecar/` are included; rebuilding is only needed after source changes.

## Connect an AI client

1. Open the editor, then **Extension → Cocos MCP** panel; confirm the status is `● Running` (auto-starts by default)
2. Copy the **one-shot setup command** from the panel and run it once in a terminal:
   - Registered with `--scope user`: works for **all projects, set up once**
   - The command contains **no machine-specific paths** — at launch it locates the Cocos project (with this extension) at or below the client's working directory; the same command works on any machine
   - Identical on macOS (zsh/bash) and Windows (PowerShell); for legacy cmd.exe use the manual JSON config (also shown on the panel)
3. Open Claude Code inside the project folder (or one level above for multi-project roots); `/mcp` should show `cocos` connected

Multi-instance: with several editors and several AI clients open, each client connects to the project that matches its working directory. If the editor isn't running, tools return a clear error and recover automatically once it starts.

## Tools

| Tool | actions | Scope |
|---|---|---|
| `project` | 7 | Project/editor/engine info, project settings & preferences read/write, preview server info |
| `scene` | 9 | Open/save/close scene, dirty/ready/bounds queries, soft reload |
| `node` | 14 | Tree query (depth-limited), create (asset instantiation + components), delete, rename, transform, reparent, duplicate, paste, sibling order, generic property get/set |
| `component` | 8 | List/available classes, add/remove, property get/set (asset refs/colors/enums), reset, execute method |
| `asset` | 17 | Query/create/import/save/copy/move/delete, meta read/write, uuid/url/path conversion, dependency queries |
| `prefab` | 3 | Instantiate (official create-node + assetUuid flow), restore, query instances |
| `scene_view` | 10 | Gizmo tool/pivot/coordinate, 2D/3D mode, grid, icon gizmos, camera focus/align |
| `editor` | 8 | Selection, panels, console log query/clear, scene-script execution, event polling (experimental) |
| `dev` | 1 | Hot-reload tools (development) |

All tools are consolidated: one tool with an `action` parameter, e.g. `{ "action": "create", "name": "Enemy", ... }`.

## Development

```bash
npm run build            # compile (editor side + sidecar)
npm test                 # automated tests, no editor needed (49 checks)
node test/verify-3b.mjs  # live verification: core tools (editor must be running)
node test/verify-3c.mjs  # live verification: peripheral tools
```

- After changing tool-layer code (`source/tools/`, `source/adapters.ts`): build, then call the `dev` tool's `reload_tools` action — **no editor restart needed**. Changes to `main.ts`/`bridge/`/`scene.ts` require a restart.
- API reference: [docs/api-reference/](docs/api-reference/00-README.md) (full 3.8.4/3.8.8 API catalog, version diffs, runtime pitfalls discovered through testing)
- Architecture: [docs/design/01-architecture-and-tools.md](docs/design/01-architecture-and-tools.md)
- Testing guide: [docs/testing.md](docs/testing.md)

## Known limitations

- `scene.save_as` / `scene.close` (with unsaved changes) trigger native editor dialogs; prefer `scene.save` + `asset.copy` for automation
- `editor.events_poll` is experimental (relies on an internal broadcast API)
- Creating a prefab asset from a node is not provided (no public API in 3.8.4)
- `asset.query_users` / `asset.query_dependencies` are protected APIs on 3.8.4 (work, but not officially guaranteed)
- Settings/preferences read/write only works for packages with registered profiles (e.g. project, engine, device)

## Version compatibility

| | 3.8.4 | 3.8.8 |
|---|---|---|
| Embedded Node | 14.16 (Electron 13) | 20.15 (Electron 31) |
| Status | ✅ fully verified live | ✅ supported (adapter layer) |

All cross-version differences (`create-node` result type, `query-components` shape, protected message migrations...) are centralized in `source/adapters.ts`; check current capability flags via `project.info`.
