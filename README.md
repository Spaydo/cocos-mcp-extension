**[English](README.en.md)** | **中文**

# Cocos MCP Extension

Cocos Creator 編輯器擴展，提供 MCP (Model Context Protocol) HTTP Server，讓 AI 助手（Claude Code、Cursor 等）通過 JSON-RPC 2.0 協議遠程控制 Cocos Creator 編輯器。

## 安裝

將 `cocos-mcp-extension` 目錄複製到你的 Cocos Creator 項目的 `extensions/` 目錄下，然後在編輯器中啟用擴展。

```bash
cd extensions/cocos-mcp-extension
npm install
npm run build
```

> **注意：** 已預編譯的擴展可直接使用，無需執行上述命令。僅在修改原始碼後才需要重新編譯。

## 使用方式

1. 在 Cocos Creator 中，打開 **Extension → Extension Manager → Installed**，啟用本擴展
2. 打開 **Extension → Cocos MCP → MCP Server Panel**
3. 設定端口（默認 3000）
4. 開啟 MCP Server 開關
5. 狀態顯示 Running 後即可連接

## AI 客戶端 MCP 配置

MCP Server 啟動後，需要在你使用的 AI 工具中配置連接資訊。各工具的配置範例與說明請參考 [`mcp-configs/README.md`](mcp-configs/README.md)。

支援的 AI 工具：VS Code + Claude Code、Claude Desktop / CLI、Cursor、Windsurf。

驗證連接：

```bash
curl http://localhost:3000/health
# 預期回應: {"status":"ok","tools":29,...}
```

## 支持的工具

共 29 個工具，分為 7 個類別。MCP 工具名稱格式為 `類別_動作`。

### Scene（場景）— 6 個

| 工具名稱 | 說明 |
|----------|------|
| `scene_query` | 取得當前場景資訊與階層樹 |
| `scene_list` | 列出項目中所有場景檔案 |
| `scene_open` | 通過 `db://` 路徑打開場景 |
| `scene_save` | 保存當前場景 |
| `scene_create` | 創建新場景資源 |
| `scene_snapshot` | 創建當前場景的 Undo 快照 |

### Node（節點）— 5 個

| 工具名稱 | 說明 |
|----------|------|
| `node_query` | 通過 UUID、名稱查詢節點，或列出所有節點 |
| `node_create` | 在場景中創建新節點 |
| `node_delete` | 刪除場景中的節點 |
| `node_set_property` | 設定節點屬性（name、active、position、rotation、scale、layer） |
| `node_move` | 移動節點到新的父節點 |

### Component（組件）— 4 個

| 工具名稱 | 說明 |
|----------|------|
| `component_add` | 為節點添加組件 |
| `component_remove` | 移除節點上的組件 |
| `component_query` | 查詢節點上的組件，可取得詳細屬性 |
| `component_set_property` | 設定組件屬性值（支援 node、color、vec3 等類型） |

### Asset（資源）— 5 個

| 工具名稱 | 說明 |
|----------|------|
| `asset_query` | 通過 pattern、UUID 或 URL 查詢資源 |
| `asset_create` | 創建新資源檔案 |
| `asset_delete` | 刪除資源 |
| `asset_move` | 移動或重命名資源 |
| `asset_query_uuid` | 資源 URL 與 UUID 互相轉換 |

### Prefab（預製件）— 4 個

| 工具名稱 | 說明 |
|----------|------|
| `prefab_list` | 列出項目中所有預製件 |
| `prefab_instantiate` | 將預製件實例化到場景中（正確建立 prefab 連結） |
| `prefab_create` | 從場景節點創建預製件 |
| `prefab_create_empty` | 直接創建空白預製件資源（無需場景節點） |

### Project（項目）— 2 個

| 工具名稱 | 說明 |
|----------|------|
| `project_info` | 取得項目路徑、引擎版本等資訊 |
| `project_refresh` | 刷新資源資料庫 |

### Debug（除錯）— 3 個

| 工具名稱 | 說明 |
|----------|------|
| `debug_get_logs` | 取得擴展的最近日誌 |
| `debug_clear_logs` | 清除日誌緩衝區 |
| `debug_execute_script` | 在場景上下文中執行 JavaScript（可存取 cc.* API） |

## 版本兼容

- Cocos Creator >= 3.8.4
