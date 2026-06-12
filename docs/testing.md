# 測試指南

## 測試層級

| 層級 | 指令 | 需要編輯器？ | 內容 |
|---|---|---|---|
| 自動化 | `npm test` | ✗ | 49 項：adapters 正規化、bridge HTTP（驗證/錯誤碼/逾時）、sidecar 完整 MCP stdio 協議、離線快取行為、專案定位（同層/向下/略過 node_modules） |
| 快速連通 | `node test/verify-live.mjs [專案路徑]` | ✓ | bootstrap → 握手 → `project.info` + `scene.query_ready` |
| 核心工具 | `node test/verify-3b.mjs [專案路徑]` | ✓ | 28 步：asset CRUD 全流程、node/component 完整工作流（含旋轉/顏色回讀驗證）、結束全清理 |
| 周邊工具 | `node test/verify-3c.mjs [專案路徑]` | ✓ | 22 步：scene_view 全狀態切換（先讀後還原）、editor（選取/日誌/場景腳本/事件輪詢）、project 設定讀寫（寫回同值零風險）、prefab 實例化 |

實機腳本的安全設計：

- 節點建立在臨時測試根節點下、資產建立在 `db://assets/mcp-test` 等臨時資料夾，**結束全部刪除**
- **不儲存場景**（測試後場景會是 dirty 狀態，關閉時選不儲存即可）
- scene_view 的視圖狀態全部「先讀取 → 切換驗證 → 還原」
- 設定寫入只對官方鍵「寫回原值」，或使用 `verify-3c` 中標明的零風險路徑
- 會移動場景相機（focus 測試），屬可接受的暫態

## 在 3.8.8 上驗證

1. **複製整個專案資料夾**（例如 `test_cocos_mcp_388`），避免 3.8.8 升級流程動到 3.8.4 的專案
2. 用 3.8.8 開啟副本，啟用擴展、確認 bridge Running
3. 對副本執行全部驗證：

```bash
npm test
node test/verify-live.mjs /path/to/test_cocos_mcp_388
node test/verify-3b.mjs   /path/to/test_cocos_mcp_388
node test/verify-3c.mjs   /path/to/test_cocos_mcp_388
```

4. 重點觀察 adapter 差異路徑（`project.info` 的 capabilities 應顯示 3.8.8 旗標全為 true / `saveAsSceneNeedsFlag: false`）：
   - `node.create` 回傳（3.8.8 原生回 string）
   - `component.list_classes` / `query-components` 結構
   - `asset.query_users` / `query_dependencies`（3.8.8 為公開 API）
   - `scene.save` 回傳（3.8.8 回場景 uuid）

## 開發迭代流程

1. 修改 `source/tools/` 或 `source/adapters.ts`
2. `npm run build:editor`
3. 呼叫 `dev` 工具的 `reload_tools` action（或讓 AI 客戶端呼叫）——**不需重啟編輯器**
4. 重跑對應驗證腳本

需要重啟編輯器的情況：修改 `main.ts`、`bridge/`、`scene.ts`（場景腳本）、`package.json`。
修改 `sidecar/` 後重啟 MCP 客戶端 session 即可（sidecar 由客戶端啟動）。

## 實測發現的 runtime 陷阱

完整清單見 `docs/api-reference/` 各檔的「⚠ 實測備註」。摘要：

| 行為 | 應對（已內建於工具層） |
|---|---|
| 3.8.4 `move-asset`/`copy-asset` 成功時回 null | 以查詢目標 url 是否存在判定成敗 |
| `CreateNodeOptions.position` 對空節點不生效 | 建立後用 `set-property` 補設 |
| 從資源建節點必須傳 `CreateNodeOptions.type` | `node.create`/`prefab.instantiate` 自動帶入 |
| config 類 message 對未註冊 profile 的 pkg 靜默無效 | 工具描述註明；查詢回 null 即未註冊 |
| prefab 實例根節點 transform 不在 restore 範圍 | 標準 prefab 行為，非錯誤 |
| 節點 dump 的旋轉欄位名為 `rotation`（= eulerAngles） | 工具層統一使用 `rotation` |
