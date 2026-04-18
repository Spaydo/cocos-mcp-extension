# Cocos MCP Extension

讓 AI 透過 MCP (Model Context Protocol) 控制 Cocos Creator 編輯器。

支援多項目同時開發 — 多個編輯器可以同時運行，每個 Claude Code 會話自動連到對應項目的編輯器。

## 架構

```
┌──────────────────────────────────────────────────────────────────┐
│ Claude Code (項目 A)            Claude Code (項目 B)               │
└────────┬──────────────────────────────────┬──────────────────────┘
         │ stdio                            │ stdio
         ▼                                  ▼
┌──────────────────────┐         ┌──────────────────────┐
│ bridge (進程 A)        │         │ bridge (進程 B)        │   ← bridge/
│ 自動探索路徑匹配的編輯器  │         │ 自動探索路徑匹配的編輯器  │
└──────┬───────────────┘         └──────┬───────────────┘
       │ HTTP                           │ HTTP
       ▼                                ▼
┌──────────────────────┐         ┌──────────────────────┐
│ Cocos Editor A         │         │ Cocos Editor B         │
│ extension (port 3000)  │         │ extension (port 3001)  │   ← extension/
└──────────────────────┘         └──────────────────────┘
```

## 兩個部分

### `extension/` — Cocos Creator 擴展

裝在 Cocos Creator 內的擴展，提供 HTTP API 控制編輯器。

- 125 個 actions / 14 個類別（場景、節點、組件、資產、Prefab、驗證...）
- 自動 port 配置（3000~3010 自動找可用 port）
- 啟動時寫入 `~/.cocos-mcp-registry.json` 供 bridge 探索
- `/health` endpoint 回傳 `projectPath` 供路徑匹配

**安裝：** 把 `extension/` 資料夾複製或 symlink 到 Cocos 項目的 `extensions/cocos-mcp-extension/`，或放到全域擴展目錄 `~/.CocosCreator/extensions/cocos-mcp-extension/`。

### `bridge/` — 獨立 stdio MCP Server

獨立執行的 Node.js 程式，作為 Claude Code 與編輯器之間的代理。

- stdio transport（透過 `.mcp.json` 配置自動啟動）
- 懶探索：第一次工具呼叫時才連線，編輯器先開後開都可以
- 路徑匹配：根據 cwd 自動找到對應項目的編輯器
- 連線斷開自動重連

**安裝：** 在每個項目的 `.mcp.json` 配置：

```json
{
  "mcpServers": {
    "cocos-creator": {
      "command": "node",
      "args": ["path/to/cocos-mcp-extension/bridge/dist/index.js"]
    }
  }
}
```

## 開發

### Build

```bash
# Build extension
cd extension && npm install && npm run build

# Build bridge
cd ../bridge && npm install && npm run build
```

### 文件

- `docs/superpowers/specs/` — 設計規格書
- `docs/superpowers/plans/` — 實施計劃
- `docs/test-cases.md` — 39 個測試案例清單
- `extension/README.md` — 擴展詳細說明
- `extension/mcp-configs/` — 各 MCP 客戶端的範例配置（Claude Desktop、Cursor、Windsurf 等）

## License

非商業授權，商業用途需聯絡作者。
