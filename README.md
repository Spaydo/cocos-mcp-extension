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
4. 在 **Tool Categories** 區塊中勾選要啟用的工具分類
5. 開啟 MCP Server 開關
6. 狀態顯示 Running 後即可連接

## AI 客戶端 MCP 配置

MCP Server 啟動後，需要在你使用的 AI 工具中配置連接資訊。各工具的配置範例與說明請參考 [`mcp-configs/README.md`](mcp-configs/README.md)。

支援的 AI 工具：VS Code + Claude Code、Claude Desktop / CLI、Cursor、Windsurf。

驗證連接：

```bash
curl http://localhost:3000/health
# 預期回應: {"status":"ok","tools":87,...}
```

## 支持的工具

共 87 個工具，分為 11 個類別（7 個核心 + 4 個進階）。MCP 工具名稱格式為 `類別_動作`。

可在面板的 **Tool Categories** 區塊中按類別啟用或禁用工具，減少 AI token 消耗。

### Scene（場景）— 13 個

| 工具名稱 | 說明 |
|----------|------|
| `scene_query` | 取得當前場景資訊與階層樹 |
| `scene_list` | 列出項目中所有場景檔案 |
| `scene_open` | 通過 `db://` 路徑打開場景 |
| `scene_save` | 保存當前場景 |
| `scene_create` | 創建新場景資源 |
| `scene_snapshot` | 創建當前場景的 Undo 快照 |
| `scene_dirty` | 檢查場景是否有未保存的更改 |
| `scene_reload` | 軟重載當前場景 |
| `scene_classes` | 列出所有已註冊的組件類別 |
| `scene_close` | 關閉當前場景 |
| `scene_save_as` | 將當前場景另存為新檔案 |
| `scene_ready` | 檢查場景編輯器是否就緒 |
| `scene_bounds` | 取得場景視圖的邊界框 |

### Node（節點）— 8 個

| 工具名稱 | 說明 |
|----------|------|
| `node_query` | 通過 UUID、名稱查詢節點，或列出所有節點（支援 includeComponents） |
| `node_create` | 創建新節點（支援一次設定 position、rotation、scale、components） |
| `node_delete` | 刪除場景中的節點 |
| `node_set_property` | 設定節點屬性（支援批次模式） |
| `node_move` | 移動節點到新的父節點 |
| `node_duplicate` | 複製節點 |
| `node_reset_transform` | 重置節點的 position/rotation/scale |
| `node_find_by_asset` | 查找使用特定資源的所有節點 |

### Component（組件）— 9 個

| 工具名稱 | 說明 |
|----------|------|
| `component_add` | 為節點添加組件 |
| `component_remove` | 移除節點上的組件 |
| `component_query` | 查詢節點上的組件，可取得詳細屬性 |
| `component_set_property` | 設定組件屬性值（支援批次模式與 node、color、vec3 等類型） |
| `component_reset` | 重置組件為預設值 |
| `component_list_types` | 列出所有可用的組件類型 |
| `component_query_detail` | 通過 UUID 查詢單一組件的完整資訊 |
| `component_execute_method` | 在運行時執行組件上的方法 |
| `component_list_all` | 列出所有已註冊的組件（含名稱、cid、腳本路徑、資源 UUID） |

### Asset（資源）— 14 個

| 工具名稱 | 說明 |
|----------|------|
| `asset_query` | 通過 pattern、UUID 或 URL 查詢資源 |
| `asset_create` | 創建新資源檔案 |
| `asset_delete` | 刪除資源 |
| `asset_move` | 移動或重命名資源 |
| `asset_import` | 匯入外部檔案為資源 |
| `asset_info` | 取得資源的詳細元資料與依賴關係 |
| `asset_query_uuid` | 資源 URL 與 UUID 互相轉換 |
| `asset_copy` | 複製資源到新位置 |
| `asset_save` | 保存/覆寫現有資源的內容 |
| `asset_query_meta` | 取得資源的 meta 資訊（匯入設定等） |
| `asset_query_users` | 反向依賴查詢：查找誰引用了此資源 |
| `asset_query_dependencies` | 正向依賴查詢：查找此資源依賴的其他資源 |
| `asset_open` | 在編輯器中打開資源 |
| `asset_reimport` | 重新匯入資源（重新生成編譯/庫檔案） |

### Prefab（預製件）— 5 個

| 工具名稱 | 說明 |
|----------|------|
| `prefab_list` | 列出項目中所有預製件 |
| `prefab_instantiate` | 將預製件實例化到場景中（正確建立 prefab 連結） |
| `prefab_create` | 從場景節點創建預製件 |
| `prefab_restore` | 還原預製件實例為原始狀態 |
| `prefab_create_empty` | 直接創建空白預製件資源（無需場景節點） |

### Project（項目）— 6 個

| 工具名稱 | 說明 |
|----------|------|
| `project_info` | 取得項目路徑、引擎版本等資訊 |
| `project_refresh` | 刷新資源資料庫 |
| `project_build` | 建構項目到目標平台 |
| `project_preview` | 啟動或停止遊戲預覽 |
| `project_query_config` | 讀取項目級配置值 |
| `project_set_config` | 設定項目級配置值 |

### Debug（除錯）— 3 個

| 工具名稱 | 說明 |
|----------|------|
| `debug_get_logs` | 取得擴展的最近日誌 |
| `debug_clear_logs` | 清除日誌緩衝區 |
| `debug_execute_script` | 在場景上下文中執行 JavaScript（可存取 cc.* API） |

### Scene View（場景視圖）— 10 個 *(進階)*

| 工具名稱 | 說明 |
|----------|------|
| `scene_view_gizmo_tool` | 取得或設定 Gizmo 工具（position/rotation/scale/rect） |
| `scene_view_gizmo_pivot` | 取得或設定 Gizmo 樞軸點（pivot/center） |
| `scene_view_gizmo_coordinate` | 取得或設定座標系統（local/global） |
| `scene_view_view_mode` | 取得或設定 2D/3D 視圖模式 |
| `scene_view_grid` | 顯示或隱藏場景網格 |
| `scene_view_focus` | 將場景攝影機聚焦到指定節點 |
| `scene_view_align_camera` | 對齊攝影機與當前視圖 |
| `scene_view_align_view` | 對齊視圖與指定節點 |
| `scene_view_icon_gizmo` | 取得或設定圖標 Gizmo 的 3D 模式與大小 |
| `scene_view_status` | 一次取得所有場景視圖設定 |

### Editor（編輯器）— 8 個 *(進階)*

| 工具名稱 | 說明 |
|----------|------|
| `editor_preferences_query` | 讀取編輯器或項目偏好設定 |
| `editor_preferences_set` | 寫入編輯器或項目偏好設定 |
| `editor_open_settings` | 打開偏好設定面板 |
| `editor_network_info` | 取得伺服器 IP 與端口資訊 |
| `editor_editor_info` | 取得編輯器版本、平台、Node.js 版本 |
| `editor_engine_info` | 取得引擎版本、路徑與原生引擎資訊 |
| `editor_open_url` | 打開 URL 或外部程式 |
| `editor_query_devices` | 查詢已連接的裝置（用於原生平台除錯） |

### Reference Image（參考圖片）— 7 個 *(進階)*

| 工具名稱 | 說明 |
|----------|------|
| `reference_image_add` | 添加參考圖片到場景視圖 |
| `reference_image_remove` | 移除指定參考圖片 |
| `reference_image_switch` | 切換當前活動的參考圖片 |
| `reference_image_set_property` | 設定參考圖片的位置、縮放、透明度 |
| `reference_image_query` | 取得所有參考圖片配置 |
| `reference_image_query_current` | 取得當前活動的參考圖片資訊 |
| `reference_image_clear` | 清除所有參考圖片 |

### Animation（動畫）— 4 個 *(進階)*

| 工具名稱 | 說明 |
|----------|------|
| `animation_list_clips` | 列出節點上的動畫片段 |
| `animation_play` | 播放動畫片段 |
| `animation_stop` | 停止動畫播放 |
| `animation_set_clip` | 設定預設動畫片段或動畫屬性 |

## 版本兼容

- Cocos Creator >= 3.8.4
