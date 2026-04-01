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
