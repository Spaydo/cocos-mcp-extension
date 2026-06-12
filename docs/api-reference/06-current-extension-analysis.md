# 現有擴展分析報告（Current Extension Analysis）

> 分析對象：`extensions/cocos-mcp-extension/`（source/ 全部 TypeScript 原始碼）
> 對照基準：`/Users/tai/test_cocos_mcp/3.8.4type/creator-types/`（Cocos Creator 3.8.4 官方型別定義）
> 分析日期：2026-06-11
> 目的：盤點現況架構、全部 MCP 工具、Editor API 使用情形與錯誤，作為依官方 3.8.4 / 3.8.8 型別重新設計的依據。

---

## 1. 架構總覽

### 1.1 進程結構

擴展橫跨 Cocos Creator 編輯器的三個執行環境，加上一個自架的 HTTP server：

```
┌─────────────────────────────────────────────────────────────┐
│ Editor 主進程 (main process)                                  │
│  source/main.ts        — load()/unload() 生命週期、訊息註冊     │
│  source/mcp-server.ts  — 內嵌 Node http.Server (JSON-RPC 2.0) │
│  source/tools/*.ts     — 14 個工具類別，全部在主進程執行          │
│  source/settings.ts    — 設定檔讀寫                            │
│         │                                                    │
│         │ Editor.Message.request('scene','execute-scene-script', …)
│         ▼                                                    │
│ Scene 進程 (scene script)                                     │
│  source/scene.ts       — 唯一能 require('cc') 的地方            │
│                          via contributions.scene.script       │
│                                                              │
│ Panel 進程 (renderer)                                         │
│  source/panels/default/index.ts — 控制面板 UI                  │
│         │ Editor.Message.request('cocos-mcp-extension', …)     │
│         └──► 回到主進程的 methods（start/stop/settings）         │
└─────────────────────────────────────────────────────────────┘
         ▲
         │ HTTP POST /mcp (JSON-RPC 2.0) + GET /health
   AI 客戶端 (Claude Code / Cursor / Windsurf …)
```

- **main.ts**：`load()` 時 hook `console.log/warn/error` 收集日誌、用 `Editor.Message.addBroadcastListener`（**非官方型別 API**）監聽 9 個 log 頻道、建立 `MCPServer`、註冊 14 個工具類別、依設定 auto-start。`methods` 暴露 6 個 extension message（`open-panel`、`start-server`、`stop-server`、`get-server-status`、`update-settings`、`get-categories`），與 package.json `contributions.messages` 對應。
- **scene.ts**：透過 `contributions.scene.script` 注入 scene 進程，`module.paths.push(join(Editor.App.path, 'node_modules'))` 後 `require('cc')`。匯出 22 個方法供 `execute-scene-script` 呼叫（場景查詢、節點/組件直接操作、動畫、驗證、快照、任意腳本執行）。
- **panel**：`Editor.Panel.define` 定義，讀取 static/template 與 static/style，每 3 秒輪詢 server 狀態，提供 port、auto-start、逐工具開關 UI（i18n via `Editor.I18n.t`）。

### 1.2 傳輸方式：自製 HTTP JSON-RPC（非 stdio、非標準 Streamable HTTP）

- `mcp-server.ts` 用 Node 內建 `http.createServer` 綁定 `127.0.0.1:<port>`（預設 3000），路由只有兩條：`GET /health` 與 `POST /mcp`。
- 自行手寫 JSON-RPC 2.0 dispatch：支援 `initialize`（回報 `protocolVersion: '2024-11-05'`）、`notifications/initialized`、`tools/list`、`tools/call`。**沒有使用官方 MCP SDK**，沒有 SSE / session / Streamable HTTP，也沒有 stdio 模式（mcp-configs/ 中的客戶端設定都是直接以 url 連 HTTP）。
- `notifications/initialized` 會回一個 `{ jsonrpc, id, result: {} }` —— 對 notification（無 id）回應不符合 JSON-RPC 規範，多數 client 容忍但屬協議瑕疵。
- `fixCommonJsonIssues()`（mcp-server.ts:570-581）在 JSON parse 失敗時做「修復」：**全域把單引號替換成雙引號、移除尾逗號** —— 會破壞字串內容中含單引號/撇號的合法請求，重 parse 後資料可能被默默竄改，屬危險設計。
- 無任何認證機制；搭配 `debug.execute_script`（任意代碼執行）與 `file_editor`（任意專案內檔案寫入），任何能連到該 port 的本機程序都能完全控制專案。

### 1.3 設定機制

- `settings.ts` 直接以 `fs` 讀寫 `<project>/profiles/mcp-extension.json`（**未使用官方 `Editor.Profile` API**，與編輯器其他 profile 機制脫鉤）。
- 結構 `MCPServerSettings`：`port`、`autoStart`、`enableDebugLog`、`enabledCategories`（類別開關，預設 8 個核心類別開、6 個進階類別關）、`enabledTools`（逐 action 開關，鍵名 `category_action`）。
- Panel 寫設定時固定送 `enableDebugLog: false`（panels/default/index.ts:194,221,249,318,336）—— 會把使用者手動在 JSON 改的 debug log 設定覆蓋掉。

### 1.4 工具註冊機制（Consolidated Tool 模式）

- 每個 `tools/*.ts` 是一個 `ToolExecutor`（`getTools(): ToolDefinition[]` + `execute(action, args)`）。
- `MCPServer.setupTools()` 把**每個類別合併為一個 MCP tool**，action 以 `action` 參數枚舉（節省 token：AI 看到 14 個 tools 而非 131 個）。各 action 的參數被**攤平合併**進同一個 inputSchema。
  - 已知缺陷：`buildSchema()`（mcp-server.ts:179-203）同名參數只保留第一個定義。例如 `scene` 類別中 `open` 的 `path`（db:// 路徑字串）與 `move_array_element` 的 `path`（序列化陣列屬性路徑）同名異義，AI 看到的描述會誤導。
- `validateArgs()`（mcp-server.ts:466-533）執行前驗證：action 是否在啟用清單、必填參數、頂層型別。
- `autoRefresh()`（mcp-server.ts:540-557）依寫死的 `REFRESH_MAP`（35 個 key）在寫入操作成功後自動 `scene soft-reload` 或 `asset-db refresh-asset`。新增工具容易漏登記；且 `soft-reload` 對 scene script 直接改出來的未保存狀態是否保留需驗證（見 §3.4）。

---

## 2. 完整工具清單

共 **14 個類別（consolidated MCP tools）、131 個 actions**。README 宣稱「88 個工具、11 類別」已過時。

> 「底層呼叫」欄中 `EM(target, msg)` = `Editor.Message.request(target, msg, …)`；`SS(method)` = `EM('scene','execute-scene-script')` 呼叫 scene.ts 的方法。

### 2.1 scene（scene-tools.ts，19 actions）

| Action | 輸入參數 | 功能 | 底層呼叫 |
|---|---|---|---|
| query | maxDepth?, includeComponents? | 取得場景階層樹 | `EM(scene, query-node-tree)`；fallback `SS(getSceneHierarchy)` |
| list | filter? | 列出 .scene 資產 | `EM(asset-db, query-assets, {pattern})` |
| open | path | 開啟場景 | `EM(asset-db, query-uuid)` → `EM(scene, open-scene, uuid)` |
| save | — | 保存場景 | `EM(scene, save-scene)` |
| create | name, path | 寫入硬編碼 3.8.4 場景 JSON 模板 | `EM(asset-db, create-asset, path, json)` |
| snapshot | — | undo 快照 | `EM(scene, snapshot)` |
| dirty | — | 查詢未保存變更 | `EM(scene, query-dirty)` |
| reload | — | 軟重載 | `EM(scene, soft-reload)` |
| classes | filter? | 列出註冊組件類 | `EM(scene, query-classes)` ⚠ 未帶 options |
| close | — | 關閉場景 | `EM(scene, close-scene)` |
| save_as | — | 另存場景 | `EM(scene, save-as-scene)` ⚠ 缺必填參數 |
| ready | — | 場景編輯器是否就緒 | `EM(scene, query-is-ready)` |
| bounds | — | 場景視圖邊界 | `EM(scene, query-scene-bounds)` |
| begin_recording | nodeUuid | 開始 undo 錄製 | `EM(scene, begin-recording)` ⚠ 非官方型別 |
| end_recording | undoId | 提交 undo 錄製 | `EM(scene, end-recording)` ⚠ 非官方型別 |
| cancel_recording | undoId | 取消 undo 錄製 | `EM(scene, cancel-recording)` ⚠ 非官方型別 |
| move_array_element | uuid, path, target, offset? | 移動陣列元素 | `EM(scene, move-array-element)` |
| remove_array_element | uuid, path, index | 移除陣列元素 | `EM(scene, remove-array-element)` |
| query_components | — | 列出場景中組件 | `EM(scene, query-components)` |

### 2.2 node（node-tools.ts，12 actions）

| Action | 輸入參數 | 功能 | 底層呼叫 |
|---|---|---|---|
| query | uuid? / name? / listAll?, includeComponents?, verbose? | 查節點資訊 | `EM(scene, query-node)`、`EM(scene, query-node-tree)`；fallback `SS(getNodeInfo/findNodeByName/getAllNodes)` |
| create | name, parentUuid?, type?, assetUuid?, position?, rotation?, scale?, components? | 建節點（可一次帶 transform/組件/prefab） | `EM(scene, query-node-tree)` 取根 → `EM(scene, create-node)`；assetUuid 走 `SS(instantiatePrefab)`；2DNode 自動 `EM(scene, create-component, cc.UITransform)`；fallback `EM(scene, query-current-scene)` ⚠ 不存在 |
| delete | uuid | 刪節點 | `EM(scene, remove-node, {uuid})` |
| set_property | uuid, property+value 或 properties{} | 設節點屬性（批次/單筆） | `EM(scene, set-property)`（rotation 映射 path `'euler'` ⚠）→ 驗證 `EM(scene, query-node)` → fallback `SS(setNodeProperty)` |
| duplicate | uuid | 複製節點 | `EM(scene, duplicate-node, [uuid])` |
| reset_transform | uuid | 重置 transform | `EM(scene, reset-node, {uuid})` |
| find_by_asset | assetUuid | 找出使用某資產的節點 | `EM(scene, query-nodes-by-asset-uuid)` |
| move | uuid, parentUuid, siblingIndex? | 移動到新 parent | `EM(scene, set-parent, {parent, uuids, keepWorldTransform})`；siblingIndex 走 `EM(scene, set-property, path:'siblingIndex')` ⚠ |
| copy | uuids | 複製到剪貼簿 | `EM(scene, copy-node, uuids)` ⚠ 回傳值被丟棄 |
| paste | target?, keepWorldTransform? | 從剪貼簿貼上 | `EM(scene, paste-node, {target, keepWorldTransform})` ⚠ 缺必填 `uuids` |
| cut | uuids | 剪下節點 | `EM(scene, cut-node, uuids)` |
| create_primitive | type, parentUuid?, name? | 建 3D 基本體 | `EM(asset-db, query-uuid, db://internal/default_prefab/3d/<type>.prefab)` → `EM(scene, create-node, {assetUuid})` |

### 2.3 component（component-tools.ts，10 actions）

| Action | 輸入參數 | 功能 | 底層呼叫 |
|---|---|---|---|
| add | nodeUuid, componentType | 加組件（前後計數驗證） | `EM(scene, query-node)` ×2 + `EM(scene, create-component)` |
| remove | nodeUuid, componentType | 移除組件 | `EM(scene, query-node)` 找組件 uuid → `EM(scene, remove-component, {uuid})` → fallback `SS(removeComponentFromNode)` |
| query | nodeUuid, componentType?, verbose? | 查組件/屬性 | `EM(scene, query-node)`；fallback `SS(getComponentInfo)` |
| set_property | nodeUuid, componentType, property+propertyType+value 或 properties[] | 設組件屬性 | `EM(scene, query-node)` 找 index → `EM(scene, set-property, path:'__comps__.<i>.<prop>')`；fallback `SS(setComponentProperty)` |
| reset | nodeUuid, componentType | 重置組件 | `EM(scene, reset-component, {uuid})`；fallback `SS(resetComponent)`（remove+re-add ⚠） |
| list_types | filter? | 列出組件類型 | `EM(scene, query-classes)` ⚠ 未帶 options |
| query_detail | componentUuid | 以組件 uuid 查詳情 | `EM(scene, query-component, uuid)` |
| execute_method | uuid, componentType, method, args? | 執行組件方法 | `EM(scene, execute-component-method, {uuid, index, name, args})` ⚠ 參數錯 |
| list_all | filter? | 列出註冊組件 | `EM(scene, query-components)` ⚠ result 型別誤用 |
| query_has_script | className | 組件是否有 user script | `EM(scene, query-component-has-script, className)` |

### 2.4 asset（asset-tools.ts，23 actions）

| Action | 輸入參數 | 功能 | 底層呼叫 |
|---|---|---|---|
| query | pattern?/uuid?/url?, limit? | 查資產 | `EM(asset-db, query-asset-info)` / `EM(asset-db, query-assets, {pattern})` |
| create | url, content | 建資產 | `EM(asset-db, create-asset)` |
| delete | url | 刪資產 | `EM(asset-db, delete-asset)` |
| move | source, target | 移動/改名 | `EM(asset-db, move-asset)` |
| import | source, target | 匯入外部檔 | `EM(asset-db, import-asset)` |
| info | uuid?/url? | 資產詳情含依賴 | `EM(asset-db, query-asset-info)` |
| query_uuid | url?/uuid? | URL↔UUID 互轉 | `EM(asset-db, query-uuid)` / `query-asset-info` |
| copy | source, target | 複製資產 | `EM(asset-db, copy-asset)` |
| save | url, content | 覆寫資產內容 | `EM(asset-db, save-asset)` |
| query_meta | uuid | 查 meta | `EM(asset-db, query-asset-meta)` |
| query_users | uuid, type? | 反向依賴 | `EM(asset-db, query-asset-users)` ⚠ protected API |
| query_dependencies | uuid, type? | 正向依賴 | `EM(asset-db, query-asset-dependencies)` ⚠ protected API |
| open | uuid | 在編輯器開啟資產 | `EM(asset-db, open-asset)` |
| reimport | uuid | 重新匯入 | `EM(asset-db, reimport-asset)` |
| save_meta | uuid, content | 保存 meta | `EM(asset-db, save-asset-meta)` |
| generate_url | url | 取不衝突 URL | `EM(asset-db, generate-available-url)` |
| query_db_ready | — | 資料庫就緒 | `EM(asset-db, query-ready)` |
| batch_import | files[]（max100） | 批次匯入 | 迴圈 `fs.existsSync` + `EM(asset-db, import-asset)` |
| batch_delete | urls[]（max100） | 批次刪除 | 迴圈 `EM(asset-db, delete-asset)` |
| get_tree | root?, maxDepth? | 資產樹 | `EM(asset-db, query-assets)` 後本地組樹 |
| export_manifest | pattern?, includeMetadata? | 匯出清單 | `EM(asset-db, query-assets)` + 逐筆 `query-asset-info`（N+1 ⚠） |
| get_unused | — | 永遠回 `success:false`（佔位） | 無 |
| compress_textures | — | 永遠回 `success:false`（佔位） | 無 |

### 2.5 prefab（prefab-tools.ts，6 actions）

| Action | 輸入參數 | 功能 | 底層呼叫 |
|---|---|---|---|
| query | path?/uuid?, maxDepth? | 解析 .prefab 檔內部階層 | `EM(asset-db, query-asset-info)` + `fs.readFileSync` 直接 parse JSON |
| list | filter? | 列出 prefabs | `EM(asset-db, query-assets, {pattern:**/*.prefab})` |
| instantiate | assetUuid, parentUuid?, name? | 實例化到場景 | `SS(instantiatePrefab)`（cc.instantiate + addChild ⚠） |
| create | nodeUuid, path | 從節點建 prefab | `EM(scene, create-prefab, nodeUuid, path)` ⚠ 非官方型別 → 驗證 `EM(asset-db, query-asset-info)` |
| restore | nodeUuid | 還原 prefab 實例 | `EM(scene, restore-prefab, nodeUuid)` ⚠ 參數型別錯 |
| create_empty | name, path | 直接寫空 prefab JSON | `EM(asset-db, create-asset)`（硬編碼模板 + 自製 fileId） |

### 2.6 project（project-tools.ts，6 actions）

| Action | 輸入參數 | 功能 | 底層呼叫 |
|---|---|---|---|
| info | settingsKey? | 專案路徑/版本 | `Editor.Project.path`、`getEditorVersion()`、`Editor.Profile.getProject('project', key)` |
| refresh | path? | 刷新資產庫 | `EM(asset-db, refresh-asset)` |
| build | platform, buildPath? | 建構專案 | `EM(builder, build-start, options)` ⚠ 不存在 |
| preview | action(start/stop) | 遊戲預覽 | `EM(preview, start)` / `EM(preview, stop)` ⚠ 不存在 |
| query_config | protocol, key? | 讀專案設定 | `EM(project, query-config)` |
| set_config | protocol, key, value | 寫專案設定 | `EM(project, set-config)` |

### 2.7 debug（debug-tools.ts，3 actions）

| Action | 輸入參數 | 功能 | 底層呼叫 |
|---|---|---|---|
| get_logs | count?, level?, errors_only?, since? | 讀記憶體 log buffer（200 筆上限） | 無（buffer 由 main.ts console hook + broadcast listener 餵入） |
| clear_logs | — | 清空 buffer | 無 |
| execute_script | code | 在 scene 進程執行任意 JS | `SS(executeScript)` → `new Function('cc','director', code)` ⚠ |

### 2.8 scene_view（scene-view-tools.ts，10 actions）⚠ 幾乎全部 message 名稱錯誤

| Action | 輸入參數 | 功能 | 底層呼叫（→ 官方正確名） |
|---|---|---|---|
| gizmo_tool | tool? | get/set gizmo 工具 | `set-transform-tool` → 應為 `change-gizmo-tool`；`query-transform-tool` → `query-gizmo-tool-name` |
| gizmo_pivot | pivot? | get/set 樞軸 | `set-pivot` → `change-gizmo-pivot`；`query-pivot` → `query-gizmo-pivot` |
| gizmo_coordinate | coordinate? | get/set 座標系 | `set-coordinate` → `change-gizmo-coordinate`；`query-coordinate` → `query-gizmo-coordinate` |
| view_mode | mode? | get/set 2D/3D | `set-is3d` → `change-is2D`（布林語意相反）；`query-is3d` → `query-is2D` |
| grid | visible? | 網格顯示 | `set-grid-visible` ✓；`query-grid-visible` → `query-is-grid-visible` |
| focus | uuids | 聚焦節點 | `focus-node` → `focus-camera` |
| align_camera | — | 相機對齊視圖 | `align-node-to-scene-view` → `align-with-view` |
| align_view | uuid | 視圖對齊節點 | `align-scene-view-to-node` → `align-view-with-node`（官方無參數） |
| icon_gizmo | is3D?, size? | icon gizmo 設定 | `set-icon-gizmo-3d` ✓、`set-icon-gizmo-size` ✓；`query-icon-gizmo-3d` → `query-is-icon-gizmo-3d`；`query-icon-gizmo-size` ✓ |
| status | — | 一次查全部 | 上述 5 個 query（4 個名稱錯誤，結果均為 null） |

### 2.9 editor（editor-tools.ts，15 actions）

| Action | 輸入參數 | 功能 | 底層呼叫 |
|---|---|---|---|
| preferences_query | protocol, key, scope? | 讀偏好 | `Editor.Profile.getConfig` / `getProject` |
| preferences_set | protocol, key, value, scope? | 寫偏好 | `Editor.Profile.setConfig` / `setProject` |
| open_settings | — | 開偏好面板 | `Editor.Panel.open('preferences')` |
| network_info | — | IP/port | `EM(server, query-ip-list)`、`EM(server, query-port)` |
| editor_info | — | 版本/平台/node | `Editor.App.version`、`process.*`、`Editor.Project.path` |
| engine_info | — | 引擎資訊 | `EM(engine, query-info)` ✓ |
| open_url | url | 開 URL | `EM(program, open-url)` ✓ |
| query_devices | — | 裝置清單 | `EM(device, query)` ✓ |
| get_all_preferences | scope? | 列舉 6 個 protocol 偏好 | `Editor.Profile.getConfig(protocol, '')` ⚠ key 傳空字串 |
| reset_preferences | protocol, scope? | 「重置」偏好（實為讀後重寫） | 同上 ⚠ 邏輯無效：讀到的是當前值不是預設值 |
| export_preferences | scope? | 匯出偏好快照 | 同 get_all_preferences |
| import_preferences | data? | 佔位，永遠失敗 | 無 |
| query_server_ip_list | — | IP 清單 | `EM(server, query-ip-list)` |
| check_connectivity | timeout? | 延遲測試 | `EM(server, query-port)` + Promise.race |
| get_network_interfaces | — | 本機網卡 | `os.networkInterfaces()` |

### 2.10 reference_image（reference-image-tools.ts，7 actions）⚠ 全部無官方型別

| Action | 輸入參數 | 底層呼叫 |
|---|---|---|
| add | path | `EM(reference-image, add)` |
| remove | index | `EM(reference-image, remove)` |
| switch | index | `EM(reference-image, switch)` |
| set_property | x?, y?, scale?, opacity? | `EM(reference-image, set-config)` |
| query | — | `EM(reference-image, query-config)` |
| query_current | — | `EM(reference-image, query-current)` |
| clear | — | `EM(reference-image, clear)` |

官方 3.8.4 `packages/reference-image/@types/` 只有 `public.d.ts`（資料形狀 `IImageData`/`IReference`），**沒有任何 message 定義**；以上 7 個 message 名稱皆無法以官方型別驗證，屬猜測/私有 API。

### 2.11 animation（animation-tools.ts，4 actions）

| Action | 輸入參數 | 底層呼叫 |
|---|---|---|
| list_clips | nodeUuid | `SS(getAnimationClips)` |
| play | nodeUuid, clipName? | `SS(playAnimation)` |
| stop | nodeUuid | `SS(stopAnimation)` |
| set_clip | nodeUuid, defaultClip?, playOnLoad? | `SS(setAnimationProperty)` |

全部透過 scene script 直接操作 `cc.Animation` 組件（編輯模式下 `animComp.play()` 的行為存疑，且未使用官方 scene 的 animation 編輯 message 群，如 `scene` 的動畫編輯模式 API）。

### 2.12 validation（validation-tools.ts，7 actions）

| Action | 輸入參數 | 底層呼叫 |
|---|---|---|
| validate_scene | maxDepth? | `SS(validateScene)` |
| validate_node | uuid | `SS(validateNode)` |
| validate_components | componentType? | `SS(validateComponents)` |
| take_snapshot | label? | `SS(getSceneSnapshot)`，存入記憶體 Map（上限 20） |
| compare_snapshots | snapshotId1, snapshotId2 | 純本地 diff |
| get_scene_stats | — | `SS(getSceneStats)` |
| validate_references | pattern? | `EM(asset-db, query-assets)` + 逐資產 `query-asset-dependencies` ⚠ protected + 逐依賴 `query-asset-info`（O(N×M) ⚠） |

### 2.13 broadcast（broadcast-tools.ts，5 actions）

| Action | 輸入參數 | 底層呼叫 |
|---|---|---|
| listen | channel | `Editor.Message.addBroadcastListener` ⚠ 非官方型別 API |
| stop_listening | channel | `Editor.Message.removeBroadcastListener` ⚠ |
| get_log | channel?, limit?, since? | 本地 buffer（1000 上限） |
| clear_log | — | 本地 |
| get_active_listeners | — | 本地 |

### 2.14 file_editor（file-editor-tools.ts，4 actions）

| Action | 輸入參數 | 底層呼叫 |
|---|---|---|
| insert_text | filePath, line, text | `fs` 直接讀寫（路徑限制在專案內） |
| delete_lines | filePath, startLine, endLine | `fs` |
| replace_text | filePath, search, replace, useRegex?, replaceAll? | `fs` |
| query_text | filePath, startLine?, endLine? | `fs` |

不經 asset-db；改 assets 下的檔案不會觸發 reimport（需另呼叫 refresh）。

---

## 3. API 使用問題清單

依官方 `3.8.4type/creator-types` 逐一核對所有 `Editor.Message.request` 呼叫（共約 95 處、64 種 (target, message) 組合）。

### 3.1 (a) 呼叫了不存在的 message（官方 3.8.4 型別中完全找不到，極可能 runtime 直接失敗）

| # | 檔案:行號 | 呼叫 | 問題 / 正確做法 |
|---|---|---|---|
| 1 | tools/scene-view-tools.ts:126 | `('scene','set-transform-tool', tool)` | 不存在。官方：`change-gizmo-tool` |
| 2 | tools/scene-view-tools.ts:129 | `('scene','query-transform-tool')` | 不存在。官方：`query-gizmo-tool-name` |
| 3 | tools/scene-view-tools.ts:139 | `('scene','set-pivot', pivot)` | 不存在。官方：`change-gizmo-pivot` |
| 4 | tools/scene-view-tools.ts:142 | `('scene','query-pivot')` | 不存在。官方：`query-gizmo-pivot` |
| 5 | tools/scene-view-tools.ts:152 | `('scene','set-coordinate', coordinate)` | 不存在。官方：`change-gizmo-coordinate` |
| 6 | tools/scene-view-tools.ts:155 | `('scene','query-coordinate')` | 不存在。官方：`query-gizmo-coordinate` |
| 7 | tools/scene-view-tools.ts:166 | `('scene','set-is3d', is3D)` | 不存在。官方：`change-is2D`，**布林語意相反**（is2D = !is3D） |
| 8 | tools/scene-view-tools.ts:169 | `('scene','query-is3d')` | 不存在。官方：`query-is2D`（語意相反） |
| 9 | tools/scene-view-tools.ts:182 | `('scene','query-grid-visible')` | 不存在。官方：`query-is-grid-visible` |
| 10 | tools/scene-view-tools.ts:191 | `('scene','focus-node', uuids)` | 不存在。官方：`focus-camera`（params: [string[]]） |
| 11 | tools/scene-view-tools.ts:200 | `('scene','align-node-to-scene-view')` | 不存在。官方：`align-with-view` |
| 12 | tools/scene-view-tools.ts:209 | `('scene','align-scene-view-to-node', uuid)` | 不存在。官方：`align-view-with-node`，且**官方簽名無參數**（對齊目前選取節點），無法直接指定 uuid |
| 13 | tools/scene-view-tools.ts:228 | `('scene','query-icon-gizmo-3d')` | 不存在。官方：`query-is-icon-gizmo-3d` |
| 14 | tools/scene-view-tools.ts:241-248 | `status` 一次呼叫 5 個 query | 其中 4 個名稱錯誤（#2、#4、#6、#8、#9），錯誤被 catch 吃掉，回傳全 null，**看似成功實則無效** |
| 15 | tools/node-tools.ts:351、668 | `('scene','query-current-scene')` | 不存在於官方型別。作為取得 scene root 的 fallback，永遠失敗 |
| 16 | tools/prefab-tools.ts:301 | `('scene','create-prefab', nodeUuid, path)` | 官方 3.8.4 scene message 無 `create-prefab`。即使 runtime 有未公開實作，雙位置參數簽名純屬猜測 |
| 17 | tools/project-tools.ts:119 | `('builder','build-start', options)` | 不存在。builder 公開 message 只有 `open`、`query-worker-ready`（protected 亦無 build-start）。建構功能實際不可用 |
| 18 | tools/project-tools.ts:129 | `('preview','start')` | 不存在。preview（protected）只有 `query-preview-url`、`generate-settings` |
| 19 | tools/project-tools.ts:132 | `('preview','stop')` | 不存在，同上 |
| 20 | tools/scene-tools.ts:369 | `('scene','begin-recording', nodeUuid)` | 不在官方 3.8.4 型別（runtime 可能有未公開實作，簽名未驗證） |
| 21 | tools/scene-tools.ts:378 | `('scene','end-recording', undoId)` | 同上 |
| 22 | tools/scene-tools.ts:387 | `('scene','cancel-recording', undoId)` | 同上 |
| 23 | tools/reference-image-tools.ts:86/95/104/118/127/136/145 | `('reference-image', add/remove/switch/set-config/query-config/query-current/clear)` | reference-image 套件官方型別**無任何 message 定義**，7 個全部無法驗證 |

### 3.2 (b) message 存在但參數/回傳型別不符

| # | 檔案:行號 | 呼叫 | 問題 |
|---|---|---|---|
| 1 | tools/scene-tools.ts:342 | `('scene','save-as-scene')` | 官方 params: `[boolean]`（必填），未傳任何參數 |
| 2 | tools/prefab-tools.ts:291 | `('scene','restore-prefab', nodeUuid)` | 官方 params: `[ResetComponentOptions]` 即 `{ uuid: string }` 物件，傳了裸字串 |
| 3 | tools/component-tools.ts:487 | `('scene','execute-component-method', {uuid, index, name, args})` | 官方 `ExecuteComponentMethodOptions = { uuid, name, args }`，其中 `uuid` 是**組件 uuid**；此處傳節點 uuid + 多餘的 `index` 欄位 |
| 4 | tools/node-tools.ts:381 | `create-node` 結果當單一 string 用 | 官方 result: `string[]`。`nodeUuid` 可能是陣列，後續 `create-component`/`set-property` 以該值當 uuid 會失敗。node-tools.ts:677（create_primitive）同病 |
| 5 | tools/node-tools.ts:630 | `('scene','paste-node', {target, keepWorldTransform})` | 官方 `PasteNodeOptions` 的 `uuids` 為必填（要貼的節點），完全沒傳 → 功能不可能成立。搭配 copy（node-tools.ts:621）把 `copy-node` 回傳的 uuids 丟棄，整個 copy/paste 工作流斷裂 |
| 6 | tools/node-tools.ts:486-503 | `set-property` rotation 映射 path `'euler'` | 官方 INode dump 欄位名為 `rotation`（註解明載「實際指向 node.eulerAngles」），`euler` 不是 dump 欄位 |
| 7 | tools/node-tools.ts:709-712 | `parseNodeData` 讀 `data.euler?.value` | 同上，應讀 `data.rotation`，否則 node query 的 rotation **永遠缺失** |
| 8 | tools/node-tools.ts:575-579 | `set-property` path `'siblingIndex'` | INode dump 無 `siblingIndex` 屬性；官方做法是對 parent 的 children 用 `move-array-element` |
| 9 | tools/scene-tools.ts:317、tools/component-tools.ts:446 | `('scene','query-classes')` 無參數 | 官方 params: `[QueryClassesOptions]`；應傳 `{ extends: 'cc.Component' }` 之類（runtime 可能容忍空缺，但屬未定義行為） |
| 10 | tools/scene-tools.ts:414、tools/component-tools.ts:510-515 | `query-components` 結果當 `{name, cid}[]` 用 | 官方 result: `string[]`。`c.name || c.cid` 對字串會回傳整串字（勉強動），`cid` 欄位永遠 undefined；README 宣稱的「含名稱、cid、腳本路徑」不成立 |
| 11 | tools/validation-tools.ts:268 | `query-asset-dependencies` 未傳 type 且當 `string[]` | 官方（protected）result 確為 `string[]` ✓，但見 3.3 protected 風險；逐資產×逐依賴呼叫 `query-asset-info` 是 O(N×M) 重負載 |
| 12 | tools/asset-tools.ts:502 | `query-asset-users` 結果當陣列 | 官方（protected）result: `string \| null`，回傳 `referencedBy: users || []` 將字串包進欄位，形狀與宣稱不符 |
| 13 | tools/editor-tools.ts:266、285 | `Editor.Profile.getConfig(protocol, '')` | 官方簽名 `getConfig(name, key?, type?)`；要取整包應傳 `undefined` 而非 `''`（空字串 key 行為未定義） |
| 14 | tools/editor-tools.ts:278-302 | `reset_preferences` 邏輯 | 讀到的是**當前值**再原樣寫回，並非重置為預設值；功能名實不符 |
| 15 | tools/scene-tools.ts:204、tools/node-tools.ts:292/318/348/665 | `query-node-tree` 回傳當單一樹根用 | 官方型別宣告 result: `INode[]`（runtime 實際回傳樹物件，官方型別與 runtime 不一致）；重寫時須以 `as any` 或實測為準，並留意 3.8.x 各版差異 |
| 16 | tools/component-tools.ts:560 | `buildDump('node', value)` 產生 `{value:{uuid}, type:'cc.Node'}` | 可行，但無法表達 null（清空引用）；`spriteFrame`/`asset` 同 |
| 17 | mcp-server.ts:547 | `('scene','soft-reload')` ✓ 存在 | 但作為「auto-refresh」每次寫入後重載整個場景，行為過重且可能重置場景內暫態（見 3.4-#8） |

### 3.3 (c) 使用未公開（protected / undocumented）API —— 標註風險

| # | 檔案:行號 | API | 風險 |
|---|---|---|---|
| 1 | main.ts:124-136、181-188；tools/broadcast-tools.ts:18-23、110、130 | `Editor.Message.addBroadcastListener` / `removeBroadcastListener` | 官方 editor.d.ts 的 `Editor.Message` namespace 僅有 `request`/`send`/`broadcast`。此 API 為 runtime 私有，版本升級可能消失或改簽名 |
| 2 | main.ts:126-136 | 監聽頻道 `'log:log'`、`'log:warn'`、`'log:error'`、`'scene:log'`、`'console:log'` 等 9 個 | 這些頻道名稱在官方型別/文件中皆無定義，console 套件未宣告對應 broadcast。editor 級 log 擷取很可能**完全收不到資料**（debug.get_logs 只剩主進程 console hook 的內容） |
| 3 | tools/asset-tools.ts:502、511；tools/validation-tools.ts:268 | `asset-db` 的 `query-asset-users`、`query-asset-dependencies` | 僅存在於 `asset-db/@types/protected/message.d.ts`，屬 protected 訊息，官方不保證對外穩定 |
| 4 | tools/scene-tools.ts:369-387 | `begin-recording`/`end-recording`/`cancel-recording` | 未出現在任何官方 d.ts；屬 Inspector 內部 undo 機制，簽名與行為未驗證 |
| 5 | tools/reference-image-tools.ts 全部 | `reference-image` 全部 message | 無官方 message 型別 |
| 6 | tools/prefab-tools.ts:301 | `scene` `create-prefab` | 無官方型別 |

### 3.4 (d) scene.ts 場景腳本 cc/cce API 疑慮

| # | 檔案:行號 | 用法 | 疑慮 |
|---|---|---|---|
| 1 | scene.ts:2 | `module.paths.push(join(Editor.App.path, 'node_modules'))` | 官方文件建議模式 ✓，無問題 |
| 2 | scene.ts:228-248、250-271 | `node.addComponent(ComponentClass)` / `node.removeComponent(comp)` 直接操作 | 繞過 cce（編輯器場景設施）：無 undo 記錄、不標記 dirty、Hierarchy/Inspector 不會即時刷新、序列化簿記（`__editorExtras__`、prefab 簿記）可能不一致。應優先用 `create-component`/`remove-component` message |
| 3 | scene.ts:273-297 | `resetComponent` 以 remove + re-add 模擬 | 組件 uuid 改變、在 `__comps__` 中的順序改變、其他組件/節點對它的引用全部斷裂。官方有 `reset-component` message，fallback 的語意並不等價 |
| 4 | scene.ts:354-365 | `cc.assetManager.loadAny(value, cb)` fire-and-forget 設定 `spriteFrame`/`material` | 先回 `success:true` 再非同步載入；失敗無回報；競態（後續 query 看不到值）。另外 `loadAny` 第一參數傳字串會被當 uuid 處理（恰好可行），但對 spriteFrame 子資產 uuid（`xxx@f9941`）格式未處理 |
| 5 | scene.ts:376-415 | `instantiatePrefab`：`cc.assetManager.loadAny` + `cc.instantiate(prefab)` + `parent.addChild(node)` | 註解宣稱 "proper prefab linking"，但這是 runtime 實例化：不經 cce 的節點建立流程，編輯器層的 PrefabInstance 簿記/undo/Hierarchy 同步都沒有。官方做法是 `create-node` 帶 `assetUuid`（CreateNodeOptions 原生支援） |
| 6 | scene.ts:544-558 | `executeScript`：`new Function('cc','director', code)` | 任意代碼執行（無沙箱、無逾時）；不支援 async/await（回傳 Promise 不會被 await，拿到的是 pending Promise 序列化結果） |
| 7 | scene.ts:469-508 | `animComp.play()` / `stop()` 在編輯模式 | 編輯器場景的 Animation 播放需要編輯器動畫模式（官方走 scene 的動畫編輯 message）。直接 `play()` 在編輯進程可能無效或污染場景狀態 |
| 8 | scene.ts 直接修改 + mcp-server.ts:547 auto-refresh `soft-reload` 組合 | scene script 改完 → `soft-reload` | `soft-reload` 重建場景；透過 runtime API 加的未序列化變更（如 #5 的實例）在 reload 後是否保留依 cce 內部 dump 行為而定，未驗證，存在「改了又被吃掉」的風險 |
| 9 | scene.ts:46-47、766-771 | `node.getRotation?.()` fallback 把 Quaternion 的 x,y,z 當 euler 角輸出 | 當 `eulerAngles` 不可用時回傳的 rotation 是四元數分量，數值錯誤 |
| 10 | scene.ts:417-433 | `createPrefabFromNode` | **假實作**：只回傳 "Prefab creation initiated"，實際沒有建立任何 prefab（prefab.create 走的是另一條路，此方法是殘留死碼） |
| 11 | scene.ts:18-25 | `findNodeByUuidDeep` 線性遍歷整棵樹 | 功能正確但大場景每次呼叫 O(N)；scene 進程其實可用 `cc.director.getScene().getChildByPath` 或維護索引 |

### 3.5 統計

- `Editor.Message.request` 呼叫總數：約 95 處；不同 (target, message) 組合 64 種。
- **確定不存在於官方 3.8.4 型別的 message：23 種呼叫點**（3.1 表，其中 scene_view 13 處、project 3 處、reference-image 7 處為最大宗）。
- **參數/回傳型別不符：約 15 項**（3.2 表）。
- **私有/protected API：6 類**（3.3 表）。
- 受影響類別：`scene_view` 10 個 action 幾乎全滅；`project.build`/`project.preview` 不可用；`node.paste`/`node.move(siblingIndex)`/`component.execute_method` 必然失敗；`reference_image` 全類別不可驗證；rotation 讀寫雙向皆錯。

---

## 4. 結構性問題與技術債

### 4.1 錯誤處理
1. **吞錯式 fallback**：幾乎所有工具都是 `try { EditorAPI } catch { try { scene script } catch (err) { … } }`，第一層錯誤完全不留痕跡。許多「不存在的 message」因此偽裝成 fallback 成功或 null 資料（scene_view.status 是典型）。
2. **catch-and-null**：scene-view status、editor network_info 等把單項失敗化為 `null`，呼叫端無法區分「值是 null」與「API 失敗」。
3. `component-tools.addComponent` 用「前後組件數量比較 + 300ms delay」推斷成功 —— `create-component` 官方 result 是 `boolean`，根本不需要這種啟發式。
4. `node-tools.setProperty` 寫後 `delay(100)` 再 query 驗證，僅對 `active`/`name` 驗證；其他屬性失敗無感知。
5. 錯誤訊息不含底層 message 名稱與參數，難以除錯。

### 4.2 回應格式
1. `ToolResponse { success, data?, message?, error?, refreshed?, refreshWarning? }` 是自訂格式，再整包 `JSON.stringify` 塞進 MCP `content[0].text`；錯誤時也大多回 `success:false`（HTTP/JSON-RPC 層永遠 200 / result），只有 throw 才標 `isError:true` —— AI 端需要二次解析才能判斷成敗。
2. 各工具 data 形狀不一致（同是節點資訊，scene.query / node.query / scene script 回傳的欄位命名不同：`parentUuid` vs `parent`）。
3. 佔位工具（`asset.get_unused`、`asset.compress_textures`、`editor.import_preferences`）以永遠失敗的 action 形式存在，浪費 schema token 並誤導 AI。

### 4.3 重複代碼
1. `extractCompact`/`extractProperties` + `valueEquals` 在 node-tools.ts(223-266) 與 component-tools.ts(593-628) 整段重複。
2. `findComponentIndex` / `findComponentInfo`（component-tools）邏輯重疊。
3. 「取 scene root uuid」邏輯在 node-tools createNode 與 createPrimitive 重複（含同樣錯誤的 `query-current-scene` fallback）。
4. `delay()` 在兩個檔案各自實作；`EXTENSION_NAME` 常數在 5 個檔案重複宣告（validation-tools 又改用 packageJSON.name）。
5. scene.ts 的 validateScene/validateNode/validateComponents 三段 UI_TRANSFORM 檢查重複。
6. UUID/型別比對 `t === componentType || t.includes(componentType)` 散落多處，`includes` 子字串比對會誤中（`cc.Sprite` 會匹配 `cc.SpriteRenderer` 類名）。

### 4.4 缺乏版本分支處理
1. `main.ts` 偵測了 `Editor.App.version` 並提供 `getEditorVersion()`，但**全專案沒有任何依版本分支的行為**；3.8.4 與 3.8.8 的 message 差異（正是本次重寫的核心動機）完全未處理。
2. `scene-tools.getSceneTemplate()`（450-680 行）硬編碼 3.8.4 場景序列化格式（`cc.SceneAsset` 結構、`_visibility` 等魔數），引擎小版本改格式即壞；prefab-tools.createEmpty 同樣硬編碼 prefab JSON 與自製 22 字元 fileId。
3. `package.json` `"editor": ">=3.8.4"` 但程式假設恆為 3.8.4 行為。

### 4.5 其他技術債
1. **JSON「修復」會竄改資料**（mcp-server.ts:570-581）：單引號全域替換、`\n` 全域逸出 —— 對含程式碼的參數（file_editor.replace_text、debug.execute_script）是資料破壞源。
2. **安全**：無認證的本機 HTTP + 任意代碼執行（execute_script）+ 任意檔案寫（file_editor）+ CORS `*`。
3. **panel 覆寫設定**：面板所有 update-settings 寫死 `enableDebugLog: false`。
4. **輪詢**：panel 每 3 秒 poll；server 狀態無 push。
5. **autoRefresh REFRESH_MAP** 以字串 key 維護 35 項，與工具定義分離，極易漏登記（如 `component.execute_method` 在 map 中但 `scene.create` 標成 asset refresh 等不一致）。
6. **README 與實況脫節**：宣稱 88 tools / 11 類，實際 131 actions / 14 類；`component_list_all` 宣稱回傳腳本路徑/資源 UUID 但實作拿不到。
7. **validation.validate_references / asset.export_manifest** 對整個資產庫做 N+1 查詢，大專案會卡死主進程訊息佇列。
8. `notifications/initialized` 回應違反 JSON-RPC notification 語意。
9. log buffer（debug-tools）與 broadcast buffer（broadcast-tools）均為主進程記憶體，extension reload 即丟失；console hook 替換全域 console 有與其他擴展互相干擾的風險。
10. MCP `tools/list` 不支援 pagination、無 `listChanged` 通知；toolsList 在 server start 時才 build，panel 改設定後 `updateSettings` 會重建（OK），但 server 未啟動時 `getToolCount` 回 0。

---

## 5. 重寫建議摘要

### 5.1 值得保留的概念
- **Consolidated tool 模式**（一類別一 tool + action enum）：token 效益實證有效，保留；但需解決同名參數合併衝突（per-action 用 `oneOf`/前綴，或在 description 中明確分段）。
- **三層架構**（main 進程 HTTP server / scene script / panel）與 **execute-scene-script fallback** 的整體形狀正確，保留。
- **逐工具開關 + 類別開關 + 面板 UI**、設定持久化概念保留（但改用 `Editor.Profile` API）。
- **參數驗證中介層**（validateArgs）與 **auto-refresh** 的意圖良好，保留但改為宣告式（在 ToolDefinition 上標 `refresh: 'scene'|'asset'`，而非外部字串 map）。
- **debug.get_logs（since/errors_only）**、**validation 快照 diff**、**file_editor**（加上寫後自動 refresh-asset）都是 AI 工作流中實用的工具概念。
- prefab.query 直接 parse .prefab 檔的唯讀做法務實，可保留。

### 5.2 必須改掉的底層呼叫（優先順序高→低）
1. **scene_view 全面改名**：`change-gizmo-tool`/`query-gizmo-tool-name`/`change-gizmo-pivot`/`query-gizmo-pivot`/`change-gizmo-coordinate`/`query-gizmo-coordinate`/`change-is2D`/`query-is2D`（語意反轉）/`query-is-grid-visible`/`query-is-icon-gizmo-3d`/`focus-camera`/`align-with-view`/`align-view-with-node`。
2. **node.paste / copy 工作流**：保存 `copy-node` 回傳 uuids，`paste-node` 傳入 `{target, uuids, keepWorldTransform}`；duplicate 已可用，cut+paste 同理。
3. **create-node 回傳值**：按官方 `string[]` 處理（`Array.isArray(r) ? r[0] : r`）。
4. **rotation**：dump 欄位統一用 `rotation`（讀與寫），刪除 `euler` path。
5. **siblingIndex**：改用 `move-array-element`（path: parent 的 `children`）。
6. **execute-component-method**：傳組件 uuid（從 query-node 的 `__comps__[i].value.uuid.value` 取）。
7. **restore-prefab**：參數改 `{ uuid }`。
8. **save-as-scene**：補必填 boolean 參數。
9. **project.build / project.preview**：3.8.x 無公開 message，應移除或改走 builder 面板開啟（`builder.open`）+ 文件說明限制；preview URL 可用 protected `query-preview-url`（標註風險）。
10. **prefab.create**：驗證 runtime 是否真有 `scene` `create-prefab`；若無，重新設計（如官方 Hierarchy 的拖拽流程無法以 message 重現，需評估 cce 私有 API 或放棄此功能並明示）。
11. **prefab.instantiate**：改用 `create-node` + `assetUuid`（官方支援，含 prefab 連結與 undo），淘汰 scene script 的 `cc.instantiate` 路徑。
12. **undo（begin/end/cancel-recording）**：確認 3.8.4/3.8.8 runtime 簽名後標註私有風險，或改以官方 `snapshot`/`snapshot-abort` 為主。
13. **query-asset-users / query-asset-dependencies**：保留但標 protected，result 形狀按官方（users: `string|null`）。
14. **broadcast listener**：`addBroadcastListener` 為私有 API —— 改為 package.json `contributions.messages` 訂閱官方 broadcast（如 `asset-db:ready`、`scene:ready`），log 擷取頻道需重新調查實際存在的頻道名。
15. **Editor.Profile.getConfig(protocol, '')** → 傳 `undefined`；`reset_preferences` 改為真正讀 default protocol（`getConfig(name, key, 'default')`）。
16. **scene.ts 直接 cc 操作**降級為「最後手段」：add/remove component、屬性設定一律以官方 message 為主；fire-and-forget 資產載入改為 await + 錯誤回報。

### 5.3 明顯缺失的功能（重寫時可補）
- **多場景/Prefab 編輯模式**：開啟 prefab 進入編輯（3.8 的 prefab 編輯 message）、`query-mode` 等。
- **官方 undo 整合**：每個寫入操作用 snapshot 包裹，提供 MCP 層級的 undo/redo 工具。
- **選取（Selection）操作**：`Editor.Selection` API 完全沒用到（align-view-with-node 又依賴目前選取，兩者剛好互補）。
- **query-node-tree 帶參數**（官方支援傳入根 uuid 取子樹）可大幅減少大場景 token。
- **資產縮圖 / query-asset-thumbnail（protected）**、**query-db-info**、**create-asset 的 AssetOperationOption（overwrite/rename）** 均未利用。
- **版本分支層**：以 `Editor.App.version` 建立 message 名稱對照表（3.8.4 vs 3.8.8），集中一處維護。
- **MCP 標準化**：改用官方 MCP SDK（Streamable HTTP + stdio 雙模式）、正確的 notification 語意、`isError` 對應 `success:false`、結構化 content。
- **安全**：token 認證、預設關閉 execute_script/file_editor、移除 JSON「修復」邏輯。

### 5.4 建議直接刪除
- `asset.get_unused`、`asset.compress_textures`、`editor.import_preferences`（永久佔位失敗）。
- `scene.ts createPrefabFromNode`（死碼假實作）。
- `editor.check_connectivity`/`get_network_interfaces`/`query_server_ip_list` 與 `network_info` 高度重疊，可合併為一個。
- `fixCommonJsonIssues()` 全部。
- console.log 全域 hook（改為訂閱官方 log 機制或明確標示僅擷取本擴展輸出）。

---

## 附錄：官方型別比對快速索引

| 擴展呼叫 target | 官方 message.d.ts 位置 |
|---|---|
| scene | `editor/packages/scene/@types/message.d.ts`（options 形狀在同目錄 `public.d.ts`） |
| asset-db（公開） | `editor/packages/asset-db/@types/message.d.ts` |
| asset-db（protected） | `editor/packages/asset-db/@types/protected/message.d.ts` |
| server | `editor/packages/server/@types/message.d.ts` |
| engine | `editor/packages/engine/@types/message.d.ts` |
| program | `editor/packages/program/@types/message.d.ts` |
| device | `editor/packages/device/@types/message.d.ts` |
| project | `editor/packages/project/@types/message.d.ts` |
| builder | `editor/packages/builder/@types/message.d.ts`（+ protected） |
| preview | `editor/packages/preview/@types/protected/message.d.ts` |
| reference-image | **無 message 型別**（僅 `public.d.ts` 資料形狀） |
| Editor.* 全域 | `editor/editor.d.ts`、`editor/message.d.ts`（EditorMessageMaps 聚合） |
