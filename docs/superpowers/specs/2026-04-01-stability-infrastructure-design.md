# Cocos MCP Extension - Stability Infrastructure Design

**Date:** 2026-04-01
**Status:** Draft
**Scope:** Parameter validation, auto-refresh after writes, scene validation tools, test case checklist

## 1. Overview

The Cocos MCP Extension currently has 88 tools across 11 categories, providing a functional MCP bridge between AI assistants and the Cocos Creator editor. This design adds three stability infrastructure layers without modifying existing working tools:

1. **Parameter validation middleware** in `mcp-server.ts`
2. **Auto-refresh after write operations** — eliminate forgotten refresh calls
3. **Scene validation tools** as a new `validation` tool category
4. **Structured test case checklist** for repeatable MCP + Chrome-based verification

## 2. Parameter Validation Middleware

### 2.1 Problem

The current `executeToolCall` method (mcp-server.ts:374) only checks:
- Whether the executor exists for the given tool name
- Whether the `action` parameter is present

It does NOT check:
- Whether the action value is valid (typos like "qurey" pass through)
- Whether required parameters are provided
- Whether parameter types match the schema

This means invalid inputs reach the executor, causing unclear errors or unexpected behavior.

### 2.2 Solution

Add a validation step between action parsing and executor dispatch, using the existing `inputSchema` from each tool's `getTools()` definitions. No external dependencies required.

### 2.3 Validation Flow

```
executeToolCall(toolName, args)
  1. Check executor exists                     [existing]
  2. Check action parameter exists             [existing]
  3. Validate action is in allowed enum        [NEW]
     → On fail: list all available actions
  4. Find matching tool definition             [NEW]
  5. Validate required parameters present      [NEW]
     → On fail: list missing params with types
  6. Validate parameter types                  [NEW]
     → On fail: show expected vs actual type
  7. Execute executor.execute(action, args)    [existing]
```

### 2.4 Implementation Details

**New private method in MCPServer:**

```typescript
private validateArgs(category: string, action: string, args: any): void
```

This method:
1. Retrieves the tools list from `this.tools[category].getTools()`
2. Checks `action` against the list of tool names (the enum)
3. Finds the matching `ToolDefinition` by name
4. Iterates `inputSchema.required` to check all required params exist in `args`
5. Iterates `inputSchema.properties` to type-check provided params

**Error message format:**

```json
{
  "success": false,
  "error": "Invalid action 'qurey' for tool 'scene'. Available actions: query, list, open, save, create, snapshot, dirty, reload, classes, close, save_as, ready, bounds"
}
```

```json
{
  "success": false,
  "error": "Missing required parameter 'uuid' for action 'node.query'. Expected parameters: uuid (string), name? (string), listAll? (boolean), includeComponents? (boolean), verbose? (boolean)"
}
```

```json
{
  "success": false,
  "error": "Type mismatch for parameter 'maxDepth' in action 'scene.query': expected number, got string"
}
```

### 2.5 Type Checking Rules

| Schema Type | Validation |
|-------------|-----------|
| `string` | `typeof value === 'string'` |
| `number` | `typeof value === 'number'` |
| `boolean` | `typeof value === 'boolean'` |
| `object` | `typeof value === 'object' && !Array.isArray(value)` |
| `array` | `Array.isArray(value)` |

No deep/nested validation. Only top-level parameter types are checked.

### 2.6 Files Modified

- `source/mcp-server.ts` — Add `validateArgs()` method, call it in `executeToolCall()` before `executor.execute()`

### 2.7 Backward Compatibility

This is purely additive. Valid inputs pass through unchanged. Only invalid inputs that previously caused confusing errors will now get clear validation messages.

## 3. Auto-Refresh After Write Operations

### 3.1 Problem

When AI tools modify the editor state (create nodes, add components, change properties, etc.), the editor view does not always update automatically. This forces AI to make an extra `scene { action: "reload" }` or `project { action: "refresh" }` call after each write operation. In practice:

- AI frequently forgets to call refresh, leading to stale views and false-negative debugging
- Extra round-trips between AI and MCP server waste time and tokens
- Users see the old state and think the operation failed

### 3.2 Solution

Add automatic post-execution refresh in `mcp-server.ts`'s `executeToolCall` method. After a successful write operation, the server automatically triggers the appropriate refresh. This is transparent — the tool response is returned as normal, with an added `refreshed` field indicating what was refreshed.

### 3.3 Refresh Registry

A static map in `MCPServer` declares which `category.action` pairs need which type of refresh:

```typescript
private static REFRESH_MAP: Record<string, 'scene' | 'asset'> = {
    // Node operations
    'node.create': 'scene',
    'node.delete': 'scene',
    'node.set_property': 'scene',
    'node.duplicate': 'scene',
    'node.reset_transform': 'scene',
    'node.move': 'scene',

    // Component operations
    'component.add': 'scene',
    'component.remove': 'scene',
    'component.set_property': 'scene',
    'component.reset': 'scene',
    'component.execute_method': 'scene',

    // Animation operations
    'animation.play': 'scene',
    'animation.stop': 'scene',
    'animation.set_clip': 'scene',

    // Debug (script execution may modify scene)
    'debug.execute_script': 'scene',

    // Prefab operations (scene)
    'prefab.instantiate': 'scene',
    'prefab.restore': 'scene',

    // Asset operations
    'asset.create': 'asset',
    'asset.delete': 'asset',
    'asset.move': 'asset',
    'asset.import': 'asset',
    'asset.copy': 'asset',
    'asset.save': 'asset',
    'asset.reimport': 'asset',

    // Prefab operations (asset)
    'prefab.create': 'asset',
    'prefab.create_empty': 'asset',

    // Scene operations
    'scene.create': 'asset',
};
```

**Actions NOT in this map** (reads, UI-only operations, self-refreshing operations like `scene.reload` and `project.refresh`) are left unchanged.

### 3.4 Execution Flow

```
executeToolCall(toolName, args)
  1. Validate args                              [from Section 2]
  2. Execute executor.execute(action, args)      [existing]
  3. If result.success === true:                 [NEW]
     a. Look up `${toolName}.${action}` in REFRESH_MAP
     b. If 'scene': await Editor.Message.request('scene', 'soft-reload')
     c. If 'asset': await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets')
     d. Add `result.refreshed = 'scene' | 'asset'` to response
  4. Return result
```

### 3.5 Response Enhancement

Successful write operations will include an extra field:

```json
{
    "success": true,
    "data": { "uuid": "..." },
    "message": "Node created",
    "refreshed": "scene"
}
```

This tells AI that the editor has already been refreshed — no need for a follow-up refresh call.

### 3.6 Error Handling

- If the tool execution succeeds but the refresh fails, the tool result is still returned successfully with a warning: `"refreshWarning": "Auto-refresh failed: <error message>"`
- Refresh failures should never cause the tool call to fail — the operation itself succeeded.

### 3.7 Files Modified

- `source/mcp-server.ts` — Add `REFRESH_MAP`, post-execution refresh logic in `executeToolCall()`
- `source/types.ts` — Add `refreshed?: string` and `refreshWarning?: string` to `ToolResponse`

### 3.8 Backward Compatibility

Fully backward compatible. The `refreshed` field is additive. Existing tools and AI clients that don't check this field continue to work. AI clients that previously called refresh manually will simply see a redundant (but harmless) double-refresh.

## 4. Scene Validation Tools

### 3.1 Purpose

A new `validation` tool category providing scene self-check capabilities. These tools verify scene integrity before/after AI operations, catching issues like broken references, missing components, and structural problems.

### 3.2 Actions (7 total)

| Action | Parameters | Description |
|--------|-----------|-------------|
| `validate_scene` | `maxDepth?: number` | Full scene health check: node tree integrity, invalid references, empty names, orphaned nodes |
| `validate_node` | `uuid: string` | Deep validation of a single node: component requirements, property validity, hierarchy consistency |
| `validate_references` | none | Check all asset references in the scene are valid (SpriteFrame, Prefab, Material, etc.) |
| `validate_components` | `componentType?: string` | Find nodes missing required companion components (e.g., Sprite without UITransform) |
| `take_snapshot` | `label?: string` | Capture current scene state as a named snapshot (stored in memory). Returns a snapshot ID for use with `compare_snapshots` |
| `compare_snapshots` | `snapshotId1: string, snapshotId2: string` | Compare two previously taken snapshots by ID, listing added/removed/modified nodes and components. Use `take_snapshot` before and after operations. |
| `get_scene_stats` | none | Scene statistics: node count, component count, asset reference count, hierarchy depth, component type distribution |

### 3.3 Response Format

New interface in `types.ts`:

```typescript
interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    nodeUuid?: string;
    nodeName?: string;
    message: string;
    suggestion?: string;
}

interface ValidationResult {
    valid: boolean;
    issues: ValidationIssue[];
    stats?: {
        totalNodes: number;
        totalComponents: number;
        totalReferences: number;
        maxDepth: number;
    };
}
```

### 3.4 Component Dependency Rules

Built-in knowledge of Cocos Creator component dependencies:

| Component | Requires |
|-----------|----------|
| `cc.Sprite` | `cc.UITransform` |
| `cc.Label` | `cc.UITransform` |
| `cc.Button` | `cc.UITransform` |
| `cc.Layout` | `cc.UITransform` |
| `cc.ScrollView` | `cc.UITransform` |
| `cc.Widget` | `cc.UITransform` |
| `cc.RichText` | `cc.UITransform` |
| `cc.EditBox` | `cc.UITransform` |
| `cc.ProgressBar` | `cc.UITransform` |
| `cc.Toggle` | `cc.UITransform` |
| `cc.Slider` | `cc.UITransform` |
| `cc.PageView` | `cc.UITransform` |
| `cc.Graphics` | `cc.UITransform` |
| `cc.Mask` | `cc.UITransform` |
| `cc.BlockInputEvents` | `cc.UITransform` |

### 3.5 Scene Script Methods

New methods in `scene.ts`:

- `validateScene(maxDepth?: number)` — Walk the scene tree, collect issues
- `validateNode(uuid: string)` — Deep-check a single node
- `validateReferences()` — Scan all component properties for asset references, verify each exists
- `getSceneStats()` — Aggregate statistics
- `getSceneSnapshot()` — Capture current scene state as a JSON-serializable snapshot (node names, UUIDs, components, properties). Snapshots are stored in-memory in `validation-tools.ts` with a generated ID, enabling before/after comparisons via `compare_snapshots`.

### 3.6 Files Modified/Created

- **Create** `source/tools/validation-tools.ts` — New tool category implementation
- **Modify** `source/scene.ts` — Add 5 new scene methods
- **Modify** `source/main.ts` — Register `ValidationTools` in the MCPServer constructor
- **Modify** `source/types.ts` — Add `ValidationIssue`, `ValidationResult` interfaces
- **Modify** `source/settings.ts` — Add `validation: true` to `DEFAULT_ENABLED_CATEGORIES`
- **Modify** `i18n/en.js` — Add validation tool descriptions
- **Modify** `i18n/zh.js` — Add validation tool descriptions (Traditional Chinese)

### 3.7 Registration

In `main.ts` load():

```typescript
import { ValidationTools } from './tools/validation-tools';
// ...
server.registerToolCategory('validation', new ValidationTools());
```

Add to `mcp-server.ts` CATEGORY_DESCRIPTIONS:
```typescript
validation: 'Scene validation and health checking',
```

Add to `types.ts` DEFAULT_ENABLED_CATEGORIES:
```typescript
validation: true,
```

## 5. Test Case Checklist

### 5.1 Purpose

A structured, expandable test document that defines repeatable test cases for every MCP tool category. Each test case specifies the exact MCP call, expected response, optional Chrome visual verification, and cleanup steps.

### 5.2 File Location

`docs/test-cases.md`

### 5.3 Test Case Template

```markdown
### TC-{CATEGORY}{NUMBER}: {Title}
- **Precondition:** {what must be true before running}
- **MCP Call:** `{tool} { action: "{action}", ...params }`
- **Expected:** success={true|false}, {key assertions on response data}
- **Verify (MCP):** {optional follow-up MCP call to confirm state}
- **Verify (Chrome):** {optional Chrome visual check description}
- **Cleanup:** {MCP calls to undo the test's effects}
```

### 5.4 Test Execution Flow

```
Phase 1: Environment Check
  ├─ GET http://localhost:3000/health → status: "ok"
  ├─ scene { action: "ready" } → success: true
  └─ Chrome navigate to localhost:7456 → page loads

Phase 2: Execute Test Cases (by category)
  ├─ For each test case:
  │   ├─ Check precondition
  │   ├─ Execute MCP call
  │   ├─ Assert expected result
  │   ├─ Optional: MCP verification call
  │   ├─ Optional: Chrome screenshot verification
  │   ├─ Record PASS / FAIL
  │   └─ Execute cleanup
  └─ Continue to next test case

Phase 3: Summary
  └─ Report total PASS / FAIL / SKIP counts per category
```

### 5.5 Initial Test Case Coverage

**Core categories (3-5 tests each):**

| Category | Test Cases | Key Coverage |
|----------|-----------|--------------|
| Scene | 5 | query, list, open, save, ready |
| Node | 5 | create, query, set_property, duplicate, delete |
| Component | 4 | add, query, set_property, remove |
| Asset | 4 | query, info, query_uuid, query_dependencies |
| Prefab | 4 | list, instantiate, create, restore |
| Project | 3 | info, refresh, query_config |
| Debug | 3 | get_logs, clear_logs, execute_script |
| Validation | 7 | All 7 new actions |

**Advanced categories (2 tests each):**

| Category | Test Cases | Key Coverage |
|----------|-----------|--------------|
| Scene View | 2 | query gizmo state, change view mode |
| Editor | 2 | query editor info, get preferences |
| Reference Image | 2 | add/remove reference image |
| Animation | 2 | get clips, play animation |

**Total: ~43 test cases**

### 5.6 Chrome Verification Points

Chrome visual checks are only needed for:
- Node creation/deletion (visible in scene hierarchy)
- Node transform changes (visible in scene view)
- Scene switching (different scene loads)
- Reference image overlay changes
- Animation playback state

For all other operations, MCP response validation is sufficient.

## 6. Implementation Order

1. **Types and interfaces** (types.ts — add `refreshed`, `refreshWarning`, `ValidationIssue`, `ValidationResult`)
2. **Parameter validation middleware** (mcp-server.ts — `validateArgs()`)
3. **Auto-refresh after writes** (mcp-server.ts — `REFRESH_MAP` + post-execute logic)
4. **Settings update** (settings.ts — add `validation: true`)
5. **Scene validation methods** (scene.ts — 5 new methods)
6. **Validation tools category** (validation-tools.ts + main.ts registration)
7. **i18n updates** (en.js, zh.js)
8. **Test case document** (docs/test-cases.md)
9. **Run test cases** to verify everything works

## 7. Non-Goals

- No formal test framework (Jest, Mocha, etc.)
- No TypeScript interface refactoring for existing tools
- No changes to existing tool logic
- No Undo/Redo system (future iteration)
- No external dependencies
- No breaking changes to the MCP protocol or tool schemas

## 8. Success Criteria

1. Invalid MCP requests return clear, actionable error messages instead of crashes or confusing errors
2. Write operations automatically refresh the editor — no manual refresh calls needed
3. All 7 validation tools correctly identify scene issues
4. All ~43 test cases documented and executable
5. Existing 88 tools continue to work without any behavior changes
