**[English](README.en.md)** | **中文**

# Cocos MCP Extension

讓 AI 助手（Claude Code、Cursor、Windsurf 等）透過標準 **MCP（Model Context Protocol）** 協議控制 Cocos Creator 編輯器。

- 基於官方 [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) 與官方編輯器 API（`@cocos/creator-types`）實作
- 支援 Cocos Creator **3.8.4 與 3.8.8**，版本差異由內建 adapter 層自動吸收，工具行為一致
- **9 個工具、76 個 actions**：場景、節點、組件、資源、prefab、場景視圖、編輯器操作

## 架構

```
MCP 客戶端（Claude Code / Cursor / Windsurf）
   │  stdio（標準 MCP）
   ▼
Sidecar — MCP server（系統 Node ≥ 18，官方 SDK）
   │  HTTP（127.0.0.1 + token，內部通道）
   ▼
編輯器擴展 Bridge（編輯器主進程）
   │  Editor.Message.request(...)
   ▼
Cocos Creator 編輯器
```

採用 sidecar 分離式的原因：3.8.4 編輯器內建 Node 14.16，無法執行 MCP SDK（需 Node ≥ 18）；sidecar 跑在系統 Node 上，使兩個編輯器版本的連接方式完全一致，協議層問題也不會影響編輯器進程。

## 安裝

1. 將本目錄複製到 Cocos 專案的 `extensions/` 下：

```bash
cd <你的專案>/extensions/cocos-mcp-extension
npm install
npm run build
```

2. 在編輯器中啟用：**擴展 → 擴展管理器 → 已安裝**，啟用 `cocos-mcp-extension`
3. 系統需求：**Node.js ≥ 18**（sidecar 執行用；編輯器內部分無額外需求）

> 已預編譯（`dist/`、`dist-sidecar/`）可直接使用；只有修改原始碼後才需要重新 build。

## 連接 AI 客戶端

1. 開啟編輯器，選單 **擴展 → Cocos MCP** 開啟面板，確認狀態為 `● Running`（預設自動啟動）
2. 複製面板上的 **「一鍵設定」指令**，在終端機執行一次：

   - 使用 `--scope user`，**所有專案通用、只需設定一次**
   - 指令**不含任何固定路徑**：執行時從客戶端的工作目錄「同層或向下」尋找帶有本擴展的 Cocos 專案，換電腦、換專案、交給其他人都是同一條指令
   - macOS（zsh/bash）與 Windows（PowerShell）指令相同；Windows 的舊式 cmd.exe 請改用手動 JSON 設定（亦顯示於面板）

3. 在**專案資料夾**（或多專案的**上層資料夾**）開啟 Claude Code，`/mcp` 應顯示 `cocos` 已連線

多開支援：同時開多個編輯器與多個 AI 客戶端時，每個客戶端會連到自己工作目錄對應的專案；開在多專案上層時自動挑「編輯器正在運行」的專案（多個運行中取最新啟動者）。編輯器尚未開啟時工具會回報明確錯誤，開啟後自動恢復、無需重啟客戶端。

## 工具一覽

| 工具 | actions | 內容 |
|---|---|---|
| `project` | 7 | 專案/編輯器/引擎資訊、專案設定與偏好設定讀寫、預覽伺服器資訊 |
| `scene` | 9 | 場景開/存/關、dirty/ready/bounds 查詢、軟刷新 |
| `node` | 14 | 節點樹查詢（深度控制）、建立（支援資源實例化+掛組件）、刪除、改名、變換（position/rotation/scale/active/layer）、換父層、複製、貼上、排序、任意屬性讀寫 |
| `component` | 8 | 組件列表/可用類別查詢、增刪、屬性讀寫（支援資源引用/顏色/enum）、重置、方法執行 |
| `asset` | 17 | 資源查詢/建立/匯入/覆寫/複製/移動/刪除、meta 讀寫、uuid/url/路徑轉換、依賴查詢 |
| `prefab` | 3 | 實例化（官方 create-node + assetUuid 流程）、還原、實例查詢 |
| `scene_view` | 10 | gizmo 工具/基準/座標系、2D/3D 切換、網格、icon gizmo、相機對焦/對齊 |
| `editor` | 8 | 選取控制、面板開啟、Console 日誌查詢/清空、場景腳本執行、編輯器事件輪詢（實驗性） |
| `dev` | 1 | 工具熱重載（開發用） |

所有工具都採用合併式設計：一個工具一個 `action` 參數，呼叫形如 `{ "action": "create", "name": "Enemy", ... }`。

## 使用範例（對 AI 助手說）

- 「在場景裡建一個叫 Player 的節點，掛上 Sprite，位置 (100, 50)」
- 「列出場景樹，然後把所有名字含 Enemy 的節點搬到 EnemyRoot 底下」
- 「查一下這個材質被哪些資源引用」
- 「把 Label 的文字改成 Hello，顏色改紅色」
- 「讀取編輯器 console 裡最近的錯誤訊息」

## 開發

```bash
npm run build            # 編譯（編輯器端 + sidecar）
npm test                 # 自動化測試（不需開編輯器，49 項）
node test/verify-3b.mjs  # 實機驗證：核心工具（需編輯器開啟）
node test/verify-3c.mjs  # 實機驗證：周邊工具（需編輯器開啟）
```

- 修改工具層代碼（`source/tools/`、`source/adapters.ts`）後：build 完呼叫 `dev` 工具的 `reload_tools` 即可熱載入，**不需重啟編輯器**；修改 `main.ts`/`bridge/`/`scene.ts` 才需要重啟
- API 開發依據：[docs/api-reference/](docs/api-reference/00-README.md)（官方 3.8.4/3.8.8 完整 API 目錄、版本差異、實測陷阱）
- 架構設計：[docs/design/01-architecture-and-tools.md](docs/design/01-architecture-and-tools.md)
- 測試指南：[docs/testing.md](docs/testing.md)

## 已知限制

- `scene.save_as` / `scene.close`（未存檔時）會觸發編輯器原生對話框，自動化流程建議改用 `scene.save` + `asset.copy`
- `editor.events_poll` 為實驗性功能（依賴編輯器內部 broadcast API）
- 「節點 → prefab 資產」（create prefab）官方 3.8.4 無公開 API，暫未提供
- `asset.query_users` / `asset.query_dependencies` 在 3.8.4 屬 protected API（可用，但官方不保證穩定）
- 專案設定/偏好設定讀寫只對「有註冊 profile 的套件」有效（如 project、engine、device）

## 版本相容

| | 3.8.4 | 3.8.8 |
|---|---|---|
| 編輯器內建 Node | 14.16（Electron 13） | 20.15（Electron 31） |
| 支援狀態 | ✅ 完整實機驗證 | ✅ 完整實機驗證 |

跨版差異（如 `create-node` 回傳型別、`query-components` 結構、protected message 遷移）全部集中在 `source/adapters.ts` 與版本能力表（`project.info` 可查看當前能力旗標）。
