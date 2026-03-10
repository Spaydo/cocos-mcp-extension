# Cocos MCP Extension

Cocos Creator 編輯器擴展，提供 MCP (Model Context Protocol) HTTP Server，讓 AI 助手（Claude Code、Cursor 等）通過 JSON-RPC 2.0 協議遠程控制 Cocos Creator 編輯器。

## 安裝

將 `cocos-mcp-extension` 目錄複製到你的 Cocos Creator 項目的 `extensions/` 目錄下，然後在編輯器中啟用擴展。

```bash
cd extensions/cocos-mcp-extension
npm install
npm run build
```

## 使用方式

1. 在 Cocos Creator 中，打開 **Extension → Cocos MCP → MCP Server Panel**
2. 設定端口（默認 3000）
3. 開啟 MCP Server 開關
4. 狀態顯示 Running 後即可連接

## AI 客戶端 MCP 配置

MCP Server 啟動後，需要在你使用的 AI 工具中配置連接資訊。每個工具的配置方式不同，範例檔案統一放在 [`mcp-configs/`](mcp-configs/) 目錄下。

> **端口提示：** 以下範例均使用默認端口 `3000`，如果你修改了端口，請自行替換 URL 中的端口號。

### VS Code + Claude Code Extension

將 `.mcp.json` 複製到你的**項目根目錄**（不是擴展目錄）：

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "http",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

**檔案位置：** `<your-project-root>/.mcp.json`

配置後重啟 Claude Code 會話即可生效。

### Claude Desktop / Claude Code CLI

使用 CLI 命令快速新增：

```bash
claude mcp add --transport http cocos-creator http://127.0.0.1:3000/mcp
```

或手動編輯配置檔。Claude Desktop 配置位於：
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cocos-creator": {
      "type": "url",
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

### Cursor

在項目根目錄建立 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "cocos-creator": {
      "url": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

**檔案位置：** `<your-project-root>/.cursor/mcp.json`

### Windsurf

在項目根目錄建立 `.windsurf/mcp.json`：

```json
{
  "mcpServers": {
    "cocos-creator": {
      "serverUrl": "http://127.0.0.1:3000/mcp"
    }
  }
}
```

**檔案位置：** `<your-project-root>/.windsurf/mcp.json`

### 驗證連接

配置完成後，可通過 curl 確認 Server 是否正常運行：

```bash
curl http://localhost:3000/health
# 預期回應: {"status":"ok","tools":28,...}
```

## 支持的工具

| 分類 | 工具數 | 功能 |
|------|--------|------|
| scene | 6 | 場景查詢、打開、保存、創建 |
| node | 5 | 節點查詢、創建、刪除、屬性設定、移動 |
| component | 4 | 組件添加、移除、查詢、屬性設定 |
| asset | 5 | 資源查詢、創建、刪除、移動、UUID 轉換 |
| prefab | 3 | 預製件列表、實例化、創建 |
| project | 2 | 項目資訊、刷新資源 |
| debug | 3 | 控制台日誌、執行腳本 |

共 28 個工具。

## 版本兼容

- Cocos Creator >= 3.8.4
