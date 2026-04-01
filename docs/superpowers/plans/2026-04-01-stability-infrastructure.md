# Stability Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add parameter validation, auto-refresh after writes, scene validation tools, and a test case checklist to the Cocos MCP Extension.

**Architecture:** All changes go through `mcp-server.ts` (validation + auto-refresh middleware), a new `validation-tools.ts` category, and corresponding `scene.ts` methods. No external dependencies. No changes to existing tool logic.

**Tech Stack:** TypeScript (ES2017, CommonJS), Cocos Creator Editor API, HTTP JSON-RPC 2.0

**Spec:** `docs/superpowers/specs/2026-04-01-stability-infrastructure-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `source/types.ts` | Modify | Add `refreshed`, `refreshWarning` to `ToolResponse`; add `ValidationIssue`, `ValidationResult` interfaces; add `validation` to `DEFAULT_ENABLED_CATEGORIES` |
| `source/mcp-server.ts` | Modify | Add `validateArgs()`, `REFRESH_MAP`, `autoRefresh()`, update `executeToolCall()`, add `validation` to `CATEGORY_DESCRIPTIONS` |
| `source/scene.ts` | Modify | Add 5 new scene methods for validation |
| `source/tools/validation-tools.ts` | Create | New `ValidationTools` class implementing `ToolExecutor` |
| `source/main.ts` | Modify | Import and register `ValidationTools` |
| `i18n/en.js` | Modify | Add validation tool descriptions |
| `i18n/zh.js` | Modify | Add validation tool descriptions |
| `docs/test-cases.md` | Create | Structured test case checklist |

---

### Task 1: Update Types and Interfaces

**Files:**
- Modify: `source/types.ts`

- [ ] **Step 1: Add `refreshed` and `refreshWarning` to `ToolResponse`**

In `source/types.ts`, change the `ToolResponse` interface:

```typescript
export interface ToolResponse {
    success: boolean;
    data?: any;
    message?: string;
    error?: string;
    refreshed?: 'scene' | 'asset';
    refreshWarning?: string;
}
```

- [ ] **Step 2: Add `ValidationIssue` and `ValidationResult` interfaces**

In `source/types.ts`, add after the `ToolExecutor` interface:

```typescript
// === Validation Types ===

export interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    nodeUuid?: string;
    nodeName?: string;
    message: string;
    suggestion?: string;
}

export interface ValidationResult {
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

- [ ] **Step 3: Add `validation` to `DEFAULT_ENABLED_CATEGORIES`**

In `source/types.ts`, add `validation: true` to the `DEFAULT_ENABLED_CATEGORIES` object, after `debug: true`:

```typescript
export const DEFAULT_ENABLED_CATEGORIES: Record<string, boolean> = {
    scene: true,
    node: true,
    component: true,
    asset: true,
    prefab: true,
    project: true,
    debug: true,
    validation: true,
    scene_view: false,
    editor: false,
    reference_image: false,
    animation: false,
};
```

- [ ] **Step 4: Build and verify no compilation errors**

Run: `cd /c/Users/1123j/_data/cocos_mcp_extension/dev-cocos-extension/extensions/cocos-mcp-extension && npm run build`
Expected: Compilation succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add source/types.ts
git commit -m "feat: add validation types and auto-refresh fields to ToolResponse"
```

---

### Task 2: Parameter Validation Middleware

**Files:**
- Modify: `source/mcp-server.ts`

- [ ] **Step 1: Add `validateArgs` method to MCPServer class**

Add this private method after the existing `executeToolCall` method (around line 392):

```typescript
    /**
     * Validate tool arguments against the tool's inputSchema.
     * Throws descriptive errors for invalid action, missing required params, or type mismatches.
     */
    private validateArgs(category: string, action: string, args: any): void {
        const executor = this.tools[category];
        const allTools = executor.getTools();
        const toolNames = allTools.map(t => t.name);

        // 1. Validate action is in the allowed list
        if (!toolNames.includes(action)) {
            throw new Error(
                `Invalid action '${action}' for tool '${category}'. Available actions: ${toolNames.join(', ')}`
            );
        }

        // 2. Find matching tool definition
        const toolDef = allTools.find(t => t.name === action)!;
        const schema = toolDef.inputSchema;
        const properties = schema.properties || {};
        const required = schema.required || [];

        // 3. Check required parameters
        const missing: string[] = [];
        for (const paramName of required) {
            if (args[paramName] === undefined || args[paramName] === null) {
                missing.push(paramName);
            }
        }
        if (missing.length > 0) {
            const paramList = Object.entries(properties)
                .map(([name, def]: [string, any]) => {
                    const isReq = required.includes(name);
                    return `${name}${isReq ? '' : '?'} (${def.type || 'any'})`;
                })
                .join(', ');
            throw new Error(
                `Missing required parameter${missing.length > 1 ? 's' : ''} '${missing.join("', '")}' for action '${category}.${action}'. Expected parameters: ${paramList}`
            );
        }

        // 4. Type-check provided parameters
        for (const [paramName, paramDef] of Object.entries(properties) as [string, any][]) {
            const value = args[paramName];
            if (value === undefined || value === null) continue;

            const expectedType = paramDef.type;
            if (!expectedType) continue;

            let valid = true;
            switch (expectedType) {
                case 'string':  valid = typeof value === 'string'; break;
                case 'number':  valid = typeof value === 'number'; break;
                case 'boolean': valid = typeof value === 'boolean'; break;
                case 'object':  valid = typeof value === 'object' && !Array.isArray(value); break;
                case 'array':   valid = Array.isArray(value); break;
            }

            if (!valid) {
                throw new Error(
                    `Type mismatch for parameter '${paramName}' in action '${category}.${action}': expected ${expectedType}, got ${Array.isArray(value) ? 'array' : typeof value}`
                );
            }
        }
    }
```

- [ ] **Step 2: Call `validateArgs` in `executeToolCall` before `executor.execute()`**

Replace the existing `executeToolCall` method (lines 374-391) with:

```typescript
    private async executeToolCall(toolName: string, args: any): Promise<ToolResponse> {
        // Consolidated approach: tool name = category, action in args
        const executor = this.tools[toolName];
        if (!executor) {
            throw new Error(`Unknown tool: ${toolName}`);
        }

        const action = args?.action;
        if (!action) {
            throw new Error(`Missing "action" parameter for tool "${toolName}". Check available actions in the tool description.`);
        }

        // Validate arguments against schema
        this.validateArgs(toolName, action, args);

        this.log(`[MCP] Executing: ${toolName}.${action}`);
        const result = await executor.execute(action, args);
        this.log(`[MCP] Result: ${result.success ? 'OK' : 'FAIL'}`);

        return result;
    }
```

- [ ] **Step 3: Build and verify**

Run: `cd /c/Users/1123j/_data/cocos_mcp_extension/dev-cocos-extension/extensions/cocos-mcp-extension && npm run build`
Expected: Compilation succeeds.

- [ ] **Step 4: Test with MCP — valid request**

Use the `scene` MCP tool:
```json
{ "action": "ready" }
```
Expected: `success: true` — valid requests pass through unchanged.

- [ ] **Step 5: Test with MCP — invalid action**

Use the `scene` MCP tool:
```json
{ "action": "qurey" }
```
Expected: Error message listing available actions.

- [ ] **Step 6: Commit**

```bash
git add source/mcp-server.ts
git commit -m "feat: add parameter validation middleware to executeToolCall"
```

---

### Task 3: Auto-Refresh After Write Operations

**Files:**
- Modify: `source/mcp-server.ts`

- [ ] **Step 1: Add `REFRESH_MAP` static property to MCPServer class**

Add this after the existing `CATEGORY_DESCRIPTIONS` static property (around line 83):

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

- [ ] **Step 2: Add `autoRefresh` private method**

Add this after the `validateArgs` method:

```typescript
    /**
     * Automatically refresh the editor after a successful write operation.
     * Uses REFRESH_MAP to determine refresh type. Never throws — refresh
     * failures are reported as warnings, not errors.
     */
    private async autoRefresh(toolName: string, action: string, result: ToolResponse): Promise<void> {
        const key = `${toolName}.${action}`;
        const refreshType = MCPServer.REFRESH_MAP[key];
        if (!refreshType || !result.success) return;

        try {
            if (refreshType === 'scene') {
                await Editor.Message.request('scene', 'soft-reload');
            } else if (refreshType === 'asset') {
                await Editor.Message.request('asset-db', 'refresh-asset', 'db://assets');
            }
            result.refreshed = refreshType;
            this.log(`[MCP] Auto-refreshed: ${refreshType}`);
        } catch (err: any) {
            result.refreshWarning = `Auto-refresh failed: ${err.message}`;
            this.log(`[MCP] Auto-refresh warning: ${err.message}`);
        }
    }
```

- [ ] **Step 3: Call `autoRefresh` in `executeToolCall` after `executor.execute()`**

Update `executeToolCall` to call `autoRefresh` after execution. The full method now looks like:

```typescript
    private async executeToolCall(toolName: string, args: any): Promise<ToolResponse> {
        const executor = this.tools[toolName];
        if (!executor) {
            throw new Error(`Unknown tool: ${toolName}`);
        }

        const action = args?.action;
        if (!action) {
            throw new Error(`Missing "action" parameter for tool "${toolName}". Check available actions in the tool description.`);
        }

        // Validate arguments against schema
        this.validateArgs(toolName, action, args);

        this.log(`[MCP] Executing: ${toolName}.${action}`);
        const result = await executor.execute(action, args);
        this.log(`[MCP] Result: ${result.success ? 'OK' : 'FAIL'}`);

        // Auto-refresh editor after write operations
        await this.autoRefresh(toolName, action, result);

        return result;
    }
```

- [ ] **Step 4: Build and verify**

Run: `cd /c/Users/1123j/_data/cocos_mcp_extension/dev-cocos-extension/extensions/cocos-mcp-extension && npm run build`
Expected: Compilation succeeds.

- [ ] **Step 5: Test with MCP — create a node and check auto-refresh**

Use the `node` MCP tool:
```json
{ "action": "create", "name": "AutoRefreshTest" }
```
Expected: Response includes `"refreshed": "scene"`. The node should be immediately visible in the editor without a manual refresh call.

- [ ] **Step 6: Test with MCP — read operation should NOT refresh**

Use the `scene` MCP tool:
```json
{ "action": "query" }
```
Expected: Response does NOT include `refreshed` field.

- [ ] **Step 7: Clean up test node**

Use the `node` MCP tool:
```json
{ "action": "delete", "uuid": "<uuid from step 5>" }
```

- [ ] **Step 8: Commit**

```bash
git add source/mcp-server.ts
git commit -m "feat: auto-refresh editor after write operations (27 actions)"
```

---

### Task 4: Scene Validation Methods in scene.ts

**Files:**
- Modify: `source/scene.ts`

- [ ] **Step 1: Add component dependency map constant**

Add this at the top of `scene.ts`, after the `module.paths.push` line (line 2):

```typescript
/** Components that require cc.UITransform as a companion */
const UI_TRANSFORM_DEPENDENTS = [
    'Sprite', 'Label', 'Button', 'Layout', 'ScrollView', 'Widget',
    'RichText', 'EditBox', 'ProgressBar', 'Toggle', 'Slider',
    'PageView', 'Graphics', 'Mask', 'BlockInputEvents',
];
```

- [ ] **Step 2: Add `validateScene` method**

Add to the `methods` export object in `scene.ts`:

```typescript
    validateScene(maxDepth: number = 10) {
        try {
            const scene = requireScene();
            const issues: any[] = [];
            let totalNodes = 0;
            let totalComponents = 0;
            let actualMaxDepth = 0;

            function walk(node: any, depth: number) {
                totalNodes++;
                if (depth > actualMaxDepth) actualMaxDepth = depth;
                if (depth > maxDepth) return;

                // Check empty name
                if (!node.name || node.name.trim() === '') {
                    issues.push({
                        severity: 'warning',
                        nodeUuid: node.uuid,
                        nodeName: node.name || '(empty)',
                        message: 'Node has empty name',
                        suggestion: 'Give the node a descriptive name',
                    });
                }

                // Check components
                if (node.components) {
                    totalComponents += node.components.length;

                    for (const comp of node.components) {
                        const typeName = comp.constructor?.name || 'unknown';

                        // Check for UITransform dependency
                        if (UI_TRANSFORM_DEPENDENTS.includes(typeName)) {
                            const cc = require('cc');
                            const hasUITransform = node.getComponent(cc.UITransform);
                            if (!hasUITransform) {
                                issues.push({
                                    severity: 'error',
                                    nodeUuid: node.uuid,
                                    nodeName: node.name,
                                    message: `${typeName} requires UITransform but none found`,
                                    suggestion: `Add cc.UITransform component to this node`,
                                });
                            }
                        }

                        // Check disabled component
                        if (comp.enabled === false) {
                            issues.push({
                                severity: 'info',
                                nodeUuid: node.uuid,
                                nodeName: node.name,
                                message: `Component ${typeName} is disabled`,
                            });
                        }
                    }
                }

                // Recurse children
                if (node.children) {
                    for (const child of node.children) {
                        walk(child, depth + 1);
                    }
                }
            }

            walk(scene, 0);

            return {
                success: true,
                data: {
                    valid: issues.filter(i => i.severity === 'error').length === 0,
                    issues,
                    stats: {
                        totalNodes,
                        totalComponents,
                        totalReferences: 0,
                        maxDepth: actualMaxDepth,
                    },
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
```

- [ ] **Step 3: Add `validateNode` method**

Add to the `methods` export object:

```typescript
    validateNode(nodeUuid: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);
            const issues: any[] = [];

            // Check name
            if (!node.name || node.name.trim() === '') {
                issues.push({
                    severity: 'warning',
                    nodeUuid: node.uuid,
                    nodeName: node.name || '(empty)',
                    message: 'Node has empty name',
                    suggestion: 'Give the node a descriptive name',
                });
            }

            // Check components
            if (node.components) {
                for (const comp of node.components) {
                    const typeName = comp.constructor?.name || 'unknown';

                    // UITransform dependency check
                    if (UI_TRANSFORM_DEPENDENTS.includes(typeName)) {
                        const hasUITransform = node.getComponent(cc.UITransform);
                        if (!hasUITransform) {
                            issues.push({
                                severity: 'error',
                                nodeUuid: node.uuid,
                                nodeName: node.name,
                                message: `${typeName} requires UITransform but none found`,
                                suggestion: `Add cc.UITransform component to this node`,
                            });
                        }
                    }
                }
            }

            // Check parent exists (not orphaned)
            if (!node.parent && node !== scene) {
                issues.push({
                    severity: 'error',
                    nodeUuid: node.uuid,
                    nodeName: node.name,
                    message: 'Node has no parent (orphaned)',
                    suggestion: 'Attach this node to a parent in the scene tree',
                });
            }

            return {
                success: true,
                data: {
                    valid: issues.filter(i => i.severity === 'error').length === 0,
                    issues,
                    nodeInfo: nodeToInfo(node),
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
```

- [ ] **Step 4: Add `validateComponents` method**

Add to the `methods` export object:

```typescript
    validateComponents(componentType?: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const issues: any[] = [];

            function walk(node: any) {
                if (node.components) {
                    for (const comp of node.components) {
                        const typeName = comp.constructor?.name || 'unknown';

                        // If filtering by type, skip non-matching
                        if (componentType && typeName !== componentType) continue;

                        // Check UITransform dependency
                        if (UI_TRANSFORM_DEPENDENTS.includes(typeName)) {
                            const hasUITransform = node.getComponent(cc.UITransform);
                            if (!hasUITransform) {
                                issues.push({
                                    severity: 'error',
                                    nodeUuid: node.uuid,
                                    nodeName: node.name,
                                    message: `${typeName} requires UITransform but none found`,
                                    suggestion: `Add cc.UITransform component to node '${node.name}'`,
                                });
                            }
                        }
                    }
                }
                if (node.children) {
                    for (const child of node.children) {
                        walk(child);
                    }
                }
            }

            walk(scene);

            return {
                success: true,
                data: {
                    valid: issues.filter(i => i.severity === 'error').length === 0,
                    issues,
                    checkedType: componentType || 'all',
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
```

- [ ] **Step 5: Add `getSceneStats` method**

Add to the `methods` export object:

```typescript
    getSceneStats() {
        try {
            const scene = requireScene();
            let totalNodes = 0;
            let totalComponents = 0;
            let maxDepth = 0;
            const componentCounts: Record<string, number> = {};

            function walk(node: any, depth: number) {
                totalNodes++;
                if (depth > maxDepth) maxDepth = depth;

                if (node.components) {
                    totalComponents += node.components.length;
                    for (const comp of node.components) {
                        const typeName = comp.constructor?.name || 'unknown';
                        componentCounts[typeName] = (componentCounts[typeName] || 0) + 1;
                    }
                }
                if (node.children) {
                    for (const child of node.children) {
                        walk(child, depth + 1);
                    }
                }
            }

            walk(scene, 0);

            return {
                success: true,
                data: {
                    totalNodes,
                    totalComponents,
                    maxDepth,
                    componentDistribution: componentCounts,
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
```

- [ ] **Step 6: Add `getSceneSnapshot` method**

Add to the `methods` export object:

```typescript
    getSceneSnapshot() {
        try {
            const scene = requireScene();
            const nodes: any[] = [];

            function walk(node: any) {
                const entry: any = {
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    parent: node.parent?.uuid || null,
                };
                if (node.components) {
                    entry.components = node.components.map((c: any) => ({
                        type: c.constructor?.name || 'unknown',
                        enabled: c.enabled,
                    }));
                }
                const pos = node.position || node.getPosition?.();
                if (pos) entry.position = { x: pos.x, y: pos.y, z: pos.z };
                nodes.push(entry);

                if (node.children) {
                    for (const child of node.children) {
                        walk(child);
                    }
                }
            }

            walk(scene);

            return {
                success: true,
                data: {
                    timestamp: Date.now(),
                    nodeCount: nodes.length,
                    nodes,
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
```

- [ ] **Step 7: Build and verify**

Run: `cd /c/Users/1123j/_data/cocos_mcp_extension/dev-cocos-extension/extensions/cocos-mcp-extension && npm run build`
Expected: Compilation succeeds.

- [ ] **Step 8: Commit**

```bash
git add source/scene.ts
git commit -m "feat: add 5 scene validation methods (validateScene, validateNode, etc.)"
```

---

### Task 5: Create ValidationTools Category

**Files:**
- Create: `source/tools/validation-tools.ts`
- Modify: `source/main.ts`
- Modify: `source/mcp-server.ts`

- [ ] **Step 1: Create `source/tools/validation-tools.ts`**

```typescript
import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';

// @ts-ignore
import packageJSON from '../../package.json';

interface SnapshotEntry {
    id: string;
    label: string;
    timestamp: number;
    data: any;
}

export class ValidationTools implements ToolExecutor {
    private snapshots: Map<string, SnapshotEntry> = new Map();
    private snapshotCounter: number = 0;

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'validate_scene',
                description: 'Full scene health check: node tree integrity, missing components, empty names',
                inputSchema: {
                    type: 'object',
                    properties: {
                        maxDepth: { type: 'number', description: 'Max tree depth to check (default 10)' },
                    },
                },
            },
            {
                name: 'validate_node',
                description: 'Deep validation of a single node: component requirements, property validity',
                inputSchema: {
                    type: 'object',
                    properties: {
                        uuid: { type: 'string', description: 'Node UUID to validate' },
                    },
                    required: ['uuid'],
                },
            },
            {
                name: 'validate_components',
                description: 'Find nodes missing required companion components (e.g. Sprite without UITransform)',
                inputSchema: {
                    type: 'object',
                    properties: {
                        componentType: { type: 'string', description: 'Filter by component type (optional)' },
                    },
                },
            },
            {
                name: 'take_snapshot',
                description: 'Capture current scene state as a named snapshot. Returns snapshot ID for compare_snapshots',
                inputSchema: {
                    type: 'object',
                    properties: {
                        label: { type: 'string', description: 'Optional label for this snapshot' },
                    },
                },
            },
            {
                name: 'compare_snapshots',
                description: 'Compare two previously taken snapshots, listing added/removed/modified nodes',
                inputSchema: {
                    type: 'object',
                    properties: {
                        snapshotId1: { type: 'string', description: 'First snapshot ID' },
                        snapshotId2: { type: 'string', description: 'Second snapshot ID' },
                    },
                    required: ['snapshotId1', 'snapshotId2'],
                },
            },
            {
                name: 'get_scene_stats',
                description: 'Scene statistics: node count, component count, hierarchy depth, component distribution',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
        ];
    }

    async execute(actionName: string, args: any): Promise<ToolResponse> {
        switch (actionName) {
            case 'validate_scene':     return this.validateScene(args?.maxDepth);
            case 'validate_node':      return this.validateNode(args?.uuid);
            case 'validate_components': return this.validateComponents(args?.componentType);
            case 'take_snapshot':      return this.takeSnapshot(args?.label);
            case 'compare_snapshots':  return this.compareSnapshots(args?.snapshotId1, args?.snapshotId2);
            case 'get_scene_stats':    return this.getSceneStats();
            default:
                return { success: false, error: `Unknown validation action: ${actionName}` };
        }
    }

    private async validateScene(maxDepth?: number): Promise<ToolResponse> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: packageJSON.name,
                method: 'validateScene',
                args: [maxDepth ?? 10],
            });
            return result as ToolResponse;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async validateNode(uuid: string): Promise<ToolResponse> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: packageJSON.name,
                method: 'validateNode',
                args: [uuid],
            });
            return result as ToolResponse;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async validateComponents(componentType?: string): Promise<ToolResponse> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: packageJSON.name,
                method: 'validateComponents',
                args: [componentType],
            });
            return result as ToolResponse;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async takeSnapshot(label?: string): Promise<ToolResponse> {
        try {
            const result: any = await Editor.Message.request('scene', 'execute-scene-script', {
                name: packageJSON.name,
                method: 'getSceneSnapshot',
                args: [],
            });

            if (!result?.success) {
                return result as ToolResponse;
            }

            this.snapshotCounter++;
            const id = `snapshot_${this.snapshotCounter}`;
            const entry: SnapshotEntry = {
                id,
                label: label || `Snapshot #${this.snapshotCounter}`,
                timestamp: Date.now(),
                data: result.data,
            };
            this.snapshots.set(id, entry);

            return {
                success: true,
                data: { snapshotId: id, label: entry.label, nodeCount: result.data.nodeCount },
                message: `Snapshot taken: ${entry.label} (${result.data.nodeCount} nodes)`,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }

    private async compareSnapshots(id1: string, id2: string): Promise<ToolResponse> {
        const snap1 = this.snapshots.get(id1);
        const snap2 = this.snapshots.get(id2);

        if (!snap1) return { success: false, error: `Snapshot not found: ${id1}` };
        if (!snap2) return { success: false, error: `Snapshot not found: ${id2}` };

        const nodes1 = new Map<string, any>();
        const nodes2 = new Map<string, any>();

        for (const n of snap1.data.nodes) nodes1.set(n.uuid, n);
        for (const n of snap2.data.nodes) nodes2.set(n.uuid, n);

        const added: any[] = [];
        const removed: any[] = [];
        const modified: any[] = [];

        // Find added and modified
        for (const [uuid, node2] of nodes2) {
            const node1 = nodes1.get(uuid);
            if (!node1) {
                added.push({ uuid, name: node2.name });
            } else {
                const changes: string[] = [];
                if (node1.name !== node2.name) changes.push(`name: '${node1.name}' → '${node2.name}'`);
                if (node1.active !== node2.active) changes.push(`active: ${node1.active} → ${node2.active}`);
                if (JSON.stringify(node1.position) !== JSON.stringify(node2.position)) changes.push('position changed');
                if (JSON.stringify(node1.components) !== JSON.stringify(node2.components)) changes.push('components changed');
                if (changes.length > 0) {
                    modified.push({ uuid, name: node2.name, changes });
                }
            }
        }

        // Find removed
        for (const [uuid, node1] of nodes1) {
            if (!nodes2.has(uuid)) {
                removed.push({ uuid, name: node1.name });
            }
        }

        return {
            success: true,
            data: {
                snapshot1: { id: id1, label: snap1.label, timestamp: snap1.timestamp },
                snapshot2: { id: id2, label: snap2.label, timestamp: snap2.timestamp },
                added,
                removed,
                modified,
                summary: `${added.length} added, ${removed.length} removed, ${modified.length} modified`,
            },
        };
    }

    private async getSceneStats(): Promise<ToolResponse> {
        try {
            const result = await Editor.Message.request('scene', 'execute-scene-script', {
                name: packageJSON.name,
                method: 'getSceneStats',
                args: [],
            });
            return result as ToolResponse;
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
```

- [ ] **Step 2: Register ValidationTools in main.ts**

Add the import at the top of `source/main.ts` (after the AnimationTools import on line 16):

```typescript
import { ValidationTools } from './tools/validation-tools';
```

Add registration in the `load()` function (after `animation` registration, around line 153):

```typescript
    mcpServer.registerToolCategory('validation', new ValidationTools());
```

- [ ] **Step 3: Add `validation` to CATEGORY_DESCRIPTIONS in mcp-server.ts**

Add to the `CATEGORY_DESCRIPTIONS` object (after the `animation` entry):

```typescript
        validation: 'Scene validation and health checking',
```

- [ ] **Step 4: Build and verify**

Run: `cd /c/Users/1123j/_data/cocos_mcp_extension/dev-cocos-extension/extensions/cocos-mcp-extension && npm run build`
Expected: Compilation succeeds.

- [ ] **Step 5: Test with MCP — get scene stats**

Use the `validation` MCP tool:
```json
{ "action": "get_scene_stats" }
```
Expected: `success: true`, response includes `totalNodes`, `totalComponents`, `maxDepth`, `componentDistribution`.

- [ ] **Step 6: Test with MCP — validate scene**

Use the `validation` MCP tool:
```json
{ "action": "validate_scene" }
```
Expected: `success: true`, response includes `valid`, `issues` array, `stats`.

- [ ] **Step 7: Test with MCP — take and compare snapshots**

Take first snapshot:
```json
{ "action": "take_snapshot", "label": "before" }
```

Create a test node via `node`:
```json
{ "action": "create", "name": "SnapshotTestNode" }
```

Take second snapshot:
```json
{ "action": "take_snapshot", "label": "after" }
```

Compare:
```json
{ "action": "compare_snapshots", "snapshotId1": "snapshot_1", "snapshotId2": "snapshot_2" }
```
Expected: `added` array contains `SnapshotTestNode`.

Clean up:
```json
node { "action": "delete", "uuid": "<uuid>" }
```

- [ ] **Step 8: Commit**

```bash
git add source/tools/validation-tools.ts source/main.ts source/mcp-server.ts
git commit -m "feat: add validation tool category with 6 scene health check actions"
```

---

### Task 6: i18n Updates

**Files:**
- Modify: `i18n/en.js`
- Modify: `i18n/zh.js`

- [ ] **Step 1: Add validation tool descriptions to en.js**

Add inside the `tool_desc` object, after the `animation_set_clip` entry:

```javascript
        // validation
        'validation_validate_scene': 'Full scene health check: node integrity, missing components, empty names',
        'validation_validate_node': 'Deep validation of a single node and its components',
        'validation_validate_components': 'Find nodes missing required companion components',
        'validation_take_snapshot': 'Capture current scene state as a named snapshot for comparison',
        'validation_compare_snapshots': 'Compare two snapshots to see what changed',
        'validation_get_scene_stats': 'Get scene statistics: node count, component count, depth',
```

- [ ] **Step 2: Add validation tool descriptions to zh.js**

Add inside the `tool_desc` object, after the `animation_set_clip` entry:

```javascript
        // validation
        'validation_validate_scene': '完整場景健康檢查：節點完整性、缺失組件、空名稱',
        'validation_validate_node': '深度驗證單一節點及其組件',
        'validation_validate_components': '查找缺少必要組件的節點',
        'validation_take_snapshot': '擷取當前場景狀態作為命名快照以供比較',
        'validation_compare_snapshots': '比較兩個快照以查看變更內容',
        'validation_get_scene_stats': '取得場景統計：節點數、組件數、層級深度',
```

- [ ] **Step 3: Build and verify**

Run: `cd /c/Users/1123j/_data/cocos_mcp_extension/dev-cocos-extension/extensions/cocos-mcp-extension && npm run build`
Expected: Compilation succeeds.

- [ ] **Step 4: Commit**

```bash
git add i18n/en.js i18n/zh.js
git commit -m "feat: add validation tool i18n descriptions (English + Traditional Chinese)"
```

---

### Task 7: Test Case Checklist Document

**Files:**
- Create: `docs/test-cases.md`

- [ ] **Step 1: Create the test case document**

Create `docs/test-cases.md` with the full test case checklist covering all categories. This is a long document — the complete content follows:

```markdown
# Cocos MCP Extension - Test Cases

## How to Use

1. Ensure Cocos Creator is open with the dev-cocos-extension project
2. Ensure MCP server is running (check http://localhost:3000/health)
3. Execute each test case by calling the MCP tool with the specified parameters
4. Check the response matches the expected result
5. For Chrome verification, navigate to http://localhost:7456 and check visually
6. Record PASS / FAIL for each test case

---

## Phase 0: Environment Check

### TC-ENV01: Health Check
- **MCP Call:** GET `http://localhost:3000/health`
- **Expected:** `status: "ok"`, `tools` > 0, `actions` > 0

### TC-ENV02: Scene Ready
- **MCP Call:** `scene { "action": "ready" }`
- **Expected:** `success: true`

---

## Phase 1: Parameter Validation

### TC-VAL01: Invalid Action Name
- **MCP Call:** `scene { "action": "qurey" }`
- **Expected:** `success: false`, error message lists available actions

### TC-VAL02: Missing Required Parameter
- **MCP Call:** `node { "action": "query" }`
- **Expected:** Either `success: true` (if no required params) or clear error listing params

### TC-VAL03: Type Mismatch
- **MCP Call:** `scene { "action": "query", "maxDepth": "abc" }`
- **Expected:** `success: false`, error shows "expected number, got string"

---

## Phase 2: Auto-Refresh

### TC-AR01: Node Create Auto-Refreshes
- **MCP Call:** `node { "action": "create", "name": "RefreshTest" }`
- **Expected:** `success: true`, `refreshed: "scene"`
- **Verify (Chrome):** Node visible in hierarchy without manual refresh
- **Cleanup:** `node { "action": "delete", "uuid": "<uuid>" }`

### TC-AR02: Read Operation Does NOT Refresh
- **MCP Call:** `scene { "action": "query" }`
- **Expected:** `success: true`, NO `refreshed` field in response

---

## Phase 3: Scene Tools

### TC-S01: Query Current Scene
- **MCP Call:** `scene { "action": "query" }`
- **Expected:** `success: true`, data contains scene name and hierarchy

### TC-S02: List Scenes
- **MCP Call:** `scene { "action": "list" }`
- **Expected:** `success: true`, returns at least 1 scene file

### TC-S03: Save Scene
- **MCP Call:** `scene { "action": "save" }`
- **Expected:** `success: true`

### TC-S04: Scene Ready Check
- **MCP Call:** `scene { "action": "ready" }`
- **Expected:** `success: true`

### TC-S05: Scene Dirty Check
- **MCP Call:** `scene { "action": "dirty" }`
- **Expected:** `success: true`, data contains `dirty` boolean

---

## Phase 4: Node Tools

### TC-N01: Create Node
- **MCP Call:** `node { "action": "create", "name": "TestNode" }`
- **Expected:** `success: true`, returns UUID
- **Verify (Chrome):** TestNode visible in hierarchy

### TC-N02: Query Node by Name
- **Precondition:** TC-N01 completed
- **MCP Call:** `node { "action": "query", "name": "TestNode" }`
- **Expected:** `success: true`, returns node info

### TC-N03: Set Node Property
- **Precondition:** TC-N01 completed
- **MCP Call:** `node { "action": "set_property", "uuid": "<uuid>", "property": "position", "value": {"x": 100, "y": 200, "z": 0} }`
- **Expected:** `success: true`

### TC-N04: Duplicate Node
- **Precondition:** TC-N01 completed
- **MCP Call:** `node { "action": "duplicate", "uuid": "<uuid>" }`
- **Expected:** `success: true`, returns new UUID

### TC-N05: Delete Node
- **MCP Call:** `node { "action": "delete", "uuid": "<uuid from TC-N01>" }`
- **Expected:** `success: true`
- **Cleanup:** Also delete the duplicate from TC-N04

---

## Phase 5: Component Tools

### TC-C01: Add Component
- **Precondition:** Create a test node first
- **MCP Call:** `component { "action": "add", "nodeUuid": "<uuid>", "componentType": "cc.Sprite" }`
- **Expected:** `success: true`

### TC-C02: Query Components
- **MCP Call:** `component { "action": "query", "nodeUuid": "<uuid>" }`
- **Expected:** `success: true`, lists Sprite (and UITransform if auto-added)

### TC-C03: Set Component Property
- **MCP Call:** `component { "action": "set_property", "nodeUuid": "<uuid>", "componentType": "cc.Sprite", "property": "type", "value": 1 }`
- **Expected:** `success: true`

### TC-C04: Remove Component
- **MCP Call:** `component { "action": "remove", "nodeUuid": "<uuid>", "componentType": "cc.Sprite" }`
- **Expected:** `success: true`
- **Cleanup:** Delete test node

---

## Phase 6: Asset Tools

### TC-A01: Query Assets
- **MCP Call:** `asset { "action": "query", "pattern": "db://assets/**/*.scene" }`
- **Expected:** `success: true`, returns scene assets

### TC-A02: Asset Info
- **Precondition:** Get a UUID from TC-A01
- **MCP Call:** `asset { "action": "info", "uuid": "<uuid>" }`
- **Expected:** `success: true`, returns metadata

### TC-A03: Query UUID
- **MCP Call:** `asset { "action": "query_uuid", "url": "db://assets" }`
- **Expected:** `success: true`, returns UUID

### TC-A04: Query Dependencies
- **Precondition:** Get a scene UUID
- **MCP Call:** `asset { "action": "query_dependencies", "uuid": "<uuid>" }`
- **Expected:** `success: true`

---

## Phase 7: Prefab Tools

### TC-P01: List Prefabs
- **MCP Call:** `prefab { "action": "list" }`
- **Expected:** `success: true`

### TC-P02: Query Prefab (if any exist)
- **Precondition:** At least one prefab exists
- **MCP Call:** `prefab { "action": "query", "uuid": "<prefab_uuid>" }`
- **Expected:** `success: true`, returns prefab hierarchy

---

## Phase 8: Project Tools

### TC-PR01: Project Info
- **MCP Call:** `project { "action": "info" }`
- **Expected:** `success: true`, returns project path, engine version

### TC-PR02: Refresh Assets
- **MCP Call:** `project { "action": "refresh" }`
- **Expected:** `success: true`

### TC-PR03: Query Config
- **MCP Call:** `project { "action": "query_config", "protocol": "general" }`
- **Expected:** `success: true`

---

## Phase 9: Debug Tools

### TC-D01: Get Logs
- **MCP Call:** `debug { "action": "get_logs" }`
- **Expected:** `success: true`, returns log entries

### TC-D02: Clear Logs
- **MCP Call:** `debug { "action": "clear_logs" }`
- **Expected:** `success: true`

### TC-D03: Execute Script
- **MCP Call:** `debug { "action": "execute_script", "code": "cc.director.getScene().name" }`
- **Expected:** `success: true`, returns scene name

---

## Phase 10: Validation Tools (NEW)

### TC-V01: Get Scene Stats
- **MCP Call:** `validation { "action": "get_scene_stats" }`
- **Expected:** `success: true`, data includes `totalNodes`, `totalComponents`, `maxDepth`, `componentDistribution`

### TC-V02: Validate Scene
- **MCP Call:** `validation { "action": "validate_scene" }`
- **Expected:** `success: true`, data includes `valid`, `issues`, `stats`

### TC-V03: Validate Node
- **Precondition:** Get a node UUID from scene query
- **MCP Call:** `validation { "action": "validate_node", "uuid": "<uuid>" }`
- **Expected:** `success: true`, data includes `valid`, `issues`, `nodeInfo`

### TC-V04: Validate Components
- **MCP Call:** `validation { "action": "validate_components" }`
- **Expected:** `success: true`, data includes `valid`, `issues`

### TC-V05: Take Snapshot
- **MCP Call:** `validation { "action": "take_snapshot", "label": "test" }`
- **Expected:** `success: true`, returns `snapshotId`

### TC-V06: Compare Snapshots
- **Precondition:** Take two snapshots with a node change between them
- **MCP Call:** `validation { "action": "compare_snapshots", "snapshotId1": "snapshot_1", "snapshotId2": "snapshot_2" }`
- **Expected:** `success: true`, shows added/removed/modified nodes

---

## Summary Template

| Phase | Total | PASS | FAIL | SKIP |
|-------|-------|------|------|------|
| Env Check | 2 | | | |
| Param Validation | 3 | | | |
| Auto-Refresh | 2 | | | |
| Scene | 5 | | | |
| Node | 5 | | | |
| Component | 4 | | | |
| Asset | 4 | | | |
| Prefab | 2 | | | |
| Project | 3 | | | |
| Debug | 3 | | | |
| Validation | 6 | | | |
| **TOTAL** | **39** | | | |
```

- [ ] **Step 2: Commit**

```bash
git add docs/test-cases.md
git commit -m "docs: add structured test case checklist (39 test cases)"
```

---

### Task 8: Full Build and Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Full clean build**

Run: `cd /c/Users/1123j/_data/cocos_mcp_extension/dev-cocos-extension/extensions/cocos-mcp-extension && npm run build`
Expected: Zero errors, zero warnings.

- [ ] **Step 2: Verify health endpoint**

Call GET `http://localhost:3000/health`
Expected: `tools` count increased (now 12 categories), `actions` count increased.

- [ ] **Step 3: Run Phase 0 + Phase 1 test cases**

Execute TC-ENV01, TC-ENV02, TC-VAL01, TC-VAL02, TC-VAL03.

- [ ] **Step 4: Run Phase 2 test cases**

Execute TC-AR01, TC-AR02. Verify auto-refresh with Chrome.

- [ ] **Step 5: Run Phase 10 test cases**

Execute TC-V01 through TC-V06. These are the new validation tools.

- [ ] **Step 6: Spot-check existing tools**

Run TC-S01, TC-N01, TC-C01 to verify existing tools still work unchanged.
