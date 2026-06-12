# cocos-mcp-extension 重寫設計：架構與工具集

> 日期：2026-06-12
> 前置文件：`docs/api-reference/`（API 依據）
> 已確認的決策：採用官方 MCP SDK（`@modelcontextprotocol/sdk`，Model Context Protocol 官方 TypeScript SDK）；工具維持合併式（action 參數）；無官方 API 依據的功能砍掉；只支援 3.8.4 與 3.8.8。

---

## 1. 架構：Sidecar 分離式

### 1.1 為什麼必須分離

實測兩個編輯器的內建環境：

| 編輯器 | Electron | Node | 能跑 MCP SDK（需 Node ≥18）？ |
|---|---|---|---|
| 3.8.4 | 13.1.4 | **14.16.0** | ✗ |
| 3.8.8 | 31.3.1 | 20.15.1 | ✓ |

要同時支援兩版，MCP server 不能跑在編輯器進程內 → 跑在獨立的系統 Node 進程（sidecar），由 MCP 客戶端以 stdio 啟動。

```
MCP 客戶端（Claude Code / Cursor / Windsurf）
   │  stdio（標準 MCP，客戶端 config 指向 sidecar）
   ▼
Sidecar：MCP server（系統 Node ≥18，@modelcontextprotocol/sdk）
   │  HTTP JSON（127.0.0.1 + token，內部協議）
   ▼
編輯器擴展 Bridge（編輯器主進程，Node 14 相容，內建 http 模組）
   │  Editor.Message.request / execute-scene-script
   ▼
編輯器各 package（scene / asset-db / preferences / ...）
```

### 1.2 各組件職責

**編輯器擴展（`source/`，編譯目標 ES2019/CommonJS，Node 14 相容）**

| 模組 | 職責 |
|---|---|
| `main.ts` | 擴展生命週期；啟動/停止 bridge；寫入 discovery 檔 |
| `bridge/server.ts` | 極簡 HTTP server：`POST /rpc`（`{tool, action, args}`）、`GET /tools`（工具目錄）、`GET /health`。綁 127.0.0.1，token 驗證 |
| `version/index.ts` | 啟動時解析 `Editor.App.version` → `{major,minor,patch}` + capabilities 快取（**唯一**版本偵測點） |
| `adapters/` | 跨版 result 正規化（見 §3），工具層永遠拿統一形狀 |
| `tools/` | 8 個 domain handler（見 §2），每個 action 對應官方 message 呼叫 |
| `scene/scene-script.ts` | 場景腳本（僅做 message 做不到的事；`cc.VERSION` + 特性偵測） |
| `panels/default/` | 狀態面板：bridge 開關、port 設定、連線狀態（簡化保留） |

**Sidecar（`sidecar/`，編譯目標 ES2022，Node ≥18）**

| 模組 | 職責 |
|---|---|
| `index.ts` | MCP server（stdio transport）；啟動時從 bridge `GET /tools` 拉工具目錄動態註冊 → **工具定義單一事實來源在擴展端**，sidecar 是薄代理 |
| `bridge-client.ts` | 讀 discovery 檔找 port/token；編輯器未開時回傳明確錯誤並自動重試連線 |

**Discovery 機制**：bridge 啟動時將 `{port, token, pid, editorVersion, projectPath}` 寫到 `<專案>/temp/cocos-mcp/bridge.json`（temp/ 不進 git）。sidecar 以 `--project <路徑>` 參數（或 `COCOS_MCP_PROJECT` 環境變數）定位。客戶端設定範例：

```json
{
  "mcpServers": {
    "cocos": {
      "command": "node",
      "args": ["<擴展路徑>/dist-sidecar/index.js", "--project", "/Users/tai/test_cocos_mcp"]
    }
  }
}
```

### 1.3 砍掉的舊功能（與依據）

| 舊功能 | 砍掉原因 |
|---|---|
| `reference_image`（7 actions） | 官方無任何 message 型別依據 |
| `project.build` / `preview start/stop` | builder 公開 message 只有 `open`/`query-worker-ready`，`build-start` 不存在 |
| undo `begin/end/cancel-recording` | 官方型別不存在，Inspector 內部機制 |
| `file_editor`（4 actions） | MCP 客戶端本身就有檔案工具；任意檔案讀寫屬重複且有安全面 |
| `animation`（4 actions） | 3.8.4 公開 message 層無動畫編輯介面（未來可經 scene facade 實驗性補回） |
| `validation`（7 actions） | 多為組合查詢，由客戶端用基礎工具組合即可；依賴查詢併入 `asset` |
| scene script 任意 `eval` | 無沙箱、不支援 async；保留「白名單註冊方法」的 execute-scene-script |
| 自製 HTTP JSON-RPC 對外協議 | 由標準 MCP（sidecar)取代；HTTP 僅作內部 bridge |

---

## 2. 工具集設計（8 個合併式工具，約 80 個 action）

> 命名慣例：tool 小寫、action 小寫底線。所有 action 的底層 message 在 `docs/api-reference/02~04` 都有完整簽名。標 ⚗ 的 action 使用 protected API，集中封裝、文件標註風險。

### 2.1 `scene` — 場景生命週期（9 actions）

| action | 底層 | 備註 |
|---|---|---|
| `query_current` | `query-node-tree` 根 + `query-dirty` | 回 name/uuid/dirty/根節點摘要 |
| `open` | `open-scene` (uuid) | |
| `save` | `save-scene` | 3.8.8 回 uuid，正規化 |
| `save_as` | `save-as-scene` | **唯一 params 版本分支**（3.8.4 須傳 boolean） |
| `close` | `close-scene` | |
| `query_ready` | `query-is-ready` | |
| `query_dirty` | `query-dirty` | |
| `query_bounds` | `query-scene-bounds` | |
| `soft_reload` | `soft-reload` | 明確獨立 action，不再隱式 auto-refresh |

### 2.2 `node` — 節點操作（14 actions）

| action | 底層 | 備註 |
|---|---|---|
| `query_tree` | `query-node-tree` | result 正規化；支援 depth/精簡欄位選項（控 token） |
| `query` | `query-node` | dump 轉精簡 JSON（值從 `IProperty.value` 拆出） |
| `create` | `create-node` | 支援 name/parent/components/dump 初值；result 正規化 string |
| `delete` | `remove-node` | |
| `rename` | `set-property` path=`name` | |
| `set_parent` | `set-parent` | keepWorldTransform 選項 |
| `duplicate` | `duplicate-node` | |
| `copy` + `paste` | `copy-node` → `paste-node` | 修復舊版斷裂：copy 回傳的 uuids 必須傳給 paste 的 `uuids` |
| `move_sibling` | 對 parent `move-array-element`(path=`children`) | 取代舊版錯誤的 siblingIndex 寫法 |
| `set_transform` | `set-property` | position/**rotation**（修復：dump 欄位名是 `rotation` 非 `euler`）/scale/active/layer 一次設定 |
| `set_property` | `set-property` | 通用 dump path；引用型別自動包 `{value:{uuid}, type}` |
| `reset_property` | `reset-property` | |
| `reset` | `reset-node` | |
| `query_by_asset` | `query-nodes-by-asset-uuid` | 哪些節點用了某資源 |

### 2.3 `component` — 組件操作（8 actions）

| action | 底層 | 備註 |
|---|---|---|
| `list` | `query-components` | result 兩版形狀不同，正規化為 `{name,cid,...}[]` |
| `list_classes` | `query-classes` | 必傳 `{extends:'cc.Component'}`（修復舊版漏參數） |
| `add` | `create-component` | |
| `remove` | `remove-component` | |
| `query` | `query-component` | dump 精簡輸出 |
| `set_property` | `set-property` | sugar：nodeUuid + 組件類名/索引 → `__comps__.N.prop` path |
| `reset` | `reset-component` | 修復：不再用 remove+re-add 模擬 |
| `execute_method` | `execute-component-method` | 修復：uuid 須為**組件** uuid，先 query 解析 |

### 2.4 `asset` — 資源管理（16 actions）

| action | 底層 | 備註 |
|---|---|---|
| `query_assets` | `query-assets` | pattern/ccType/extname 過濾 |
| `query_info` | `query-asset-info` | 輸入 uuid/url/path 自動轉換 |
| `query_meta` | `query-asset-meta` | |
| `convert` | `query-path`/`query-url`/`query-uuid` | 三向轉換合一 |
| `create` | `create-asset` | 文字內容資產（場景/材質/腳本…） |
| `create_folder` | `create-asset`(content=null) | |
| `import` | `import-asset` | 外部檔案匯入 |
| `save` | `save-asset` | |
| `save_meta` | `save-asset-meta` | |
| `copy` / `move` / `delete` | `copy-asset`/`move-asset`/`delete-asset` | |
| `reimport` / `refresh` | `reimport-asset`/`refresh-asset` | result 兩版不同，不依賴回傳 |
| `open` | `open-asset` | 用編輯器開啟資產 |
| `available_url` | `generate-available-url` | 避免覆名 |
| `query_users` ⚗(3.8.4) | `query-asset-users` | 3.8.4 protected / 3.8.8 公開；result 正規化為陣列 |
| `query_dependencies` ⚗(3.8.4) | `query-asset-dependencies` | 同上 |

### 2.5 `prefab` — 預製體（3 actions）

| action | 底層 | 備註 |
|---|---|---|
| `instantiate` | `create-node` + `assetUuid` | **官方正規做法**，取代舊版 runtime instantiate（修復簿記缺失） |
| `restore` | `restore-prefab` | 修復：參數須為 `{uuid}` 物件 |
| `query_instances` | `query-nodes-by-asset-uuid` | |

> `create_prefab`（節點→prefab 資產）官方 3.8.4 無公開 message，第一版不做；未來可研究 cce prefab manager 實驗性實作。

### 2.6 `scene_view` — 場景視圖（修正版，10 actions）

全部修復為正確 message 名：`change-gizmo-tool`/`query-gizmo-tool-name`/`change-gizmo-pivot`/`query-gizmo-pivot`/`change-gizmo-coordinate`/`query-gizmo-coordinate`/`change-is2D`/`query-is2D`（**語意修正**：is2D = !is3D）/`set-grid-visible`/`query-is-grid-visible`/`set-icon-gizmo-3d`+size/`focus-camera`/`align-with-view`/`align-view-with-node`（官方無參數，語意=對齊目前選取節點）。
actions：`set_tool`、`query_tool`、`set_pivot`、`set_coordinate`、`query_state`（合併查詢）、`set_2d`、`grid`、`icon_gizmo`、`focus`、`align`。

### 2.7 `project` — 專案與編輯器資訊（7 actions）

| action | 底層 | 備註 |
|---|---|---|
| `info` | `Editor.Project.*` + `Editor.App.version` + capabilities | 含偵測到的版本能力表 |
| `engine_info` | engine `query-info` | |
| `settings_query` / `settings_set` | project `query-config`/`set-config` | |
| `preferences_query` / `preferences_set` | preferences `query-config`/`set-config` | |
| `server_info` | server `query-ip-list`/`query-port` | |

### 2.8 `editor` — 編輯器 UI 與除錯（8 actions）

| action | 底層 | 備註 |
|---|---|---|
| `selection_query` / `select` / `unselect` | `Editor.Selection.*` | |
| `panel_open` | `Editor.Panel.open` | |
| `logs` | `Editor.Logger.query()` ⚗ | 分級/關鍵字過濾、分頁（控 token） |
| `logs_clear` | `Editor.Logger.clear()` | |
| `execute_scene_script` | `execute-scene-script` | 只暴露自家 scene-script 的白名單方法 |
| `events_poll` ⚗ | `addBroadcastListener` 緩衝 | 實驗性：監聽 `scene:ready`、`asset-db:asset-change` 等廣播入環形緩衝，poll 取出 |

---

## 3. 版本相容層（adapters）

唯一偵測點 `version/index.ts`，輸出：

```ts
interface EditorEnv {
  version: { major: number; minor: number; patch: number }; // Editor.App.version
  is388plus: boolean;
  capabilities: { multiScene: boolean; autoAdapt: boolean; assetUsersPublic: boolean; /* ... */ };
}
```

需要 adapter 的呼叫（全部集中在 `adapters/`，依據 `07-version-diff-summary.md`）：

| 呼叫 | 3.8.4 | 3.8.8 | 統一輸出 |
|---|---|---|---|
| `create-node` result | `string[]` | `string` | `string`（取首個） |
| `query-node-tree` result | 型別標 `INode[]`、runtime 為樹 | `INode` | 樹物件（以實測為準） |
| `query-components` result | `string[]` | `{name,cid,path,assetUuid}[]` | 物件陣列 |
| `save-scene` result | `boolean` | `string\|undefined` | `{saved: true, uuid?}` |
| `save-as-scene` params | `[boolean]` | `[]` | 內部分支 |
| `query-asset-users` | protected，`string\|null` | 公開，`string[]` | `string[]` |
| `query-asset-dependencies` | protected | 公開 | `string[]` |

引擎側（scene script）：`cc.VERSION` + 特性偵測（`typeof cc.UISkew !== 'undefined'`）；禁止引用 `__private` 型別名；dump 型別自帶（不引用 cce 內部路徑）。

## 4. 回應格式與錯誤處理（統一規範）

- bridge 統一回 `{ok: true, data}` / `{ok: false, error: {code, message, hint?}}`；hint 給 LLM 修正方向（例如「uuid 不存在，請先 node.query_tree」）。
- 所有 `Editor.Message.request` 包 timeout（預設 15s，可設定）；scene not ready 給明確錯誤碼。
- dump 輸出一律精簡化（拆掉 IProperty 包裝、可選欄位過濾），降低 token 消耗。
- 工具描述（MCP tool description / JSON Schema）用英文撰寫（面向 LLM），i18n 僅用於面板 UI。

## 5. 建置設定

- 雙 tsconfig：`tsconfig.editor.json`（ES2019/CJS/Node14、types 指向 3.8.4 creator-types 作為最低基準）+ `tsconfig.sidecar.json`（ES2022/Node18+）。
- sidecar 依賴：`@modelcontextprotocol/sdk`、`zod`（schema）。編輯器端零新增 runtime 依賴（bridge 用內建 http）。
- 輸出：`dist/`（編輯器端）、`dist-sidecar/`（sidecar）。

## 6. 實作階段規劃（每階段完成後驗收再續）

| 階段 | 內容 | 驗收標準 |
|---|---|---|
| **3A 基礎設施** | bridge + discovery + sidecar + 版本偵測 + adapters 骨架 + `project.info`/`scene.query_ready` 兩個示範 action | Claude Code 經標準 MCP config 連上 3.8.4 與 3.8.8 編輯器，工具列表可見、示範 action 成功 |
| **3B 核心工具** | `node`、`component`、`scene`、`asset` 全 actions | 在 3.8.4 實機完成建節點→掛組件→設屬性→存場景→資源 CRUD 全流程；3.8.8 抽測 |
| **3C 周邊工具** | `prefab`、`scene_view`、`project` 其餘、`editor`（含 logs/events） | 實機測試通過 |
| **3D 收尾** | 面板更新、README/mcp-configs 重寫、test-cases.md 重寫、舊代碼清除 | 文件與實際行為一致 |
