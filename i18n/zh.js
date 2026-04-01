'use strict';

module.exports = {
    'open_panel': 'MCP 服務器面板',
    'description': 'MCP 服務器擴展，用於 AI 控制 Cocos Creator 編輯器',
    'panel_title': 'Cocos MCP 服務器',

    // 面板區塊
    'panel': {
        'mcp_server': 'MCP 服務器',
        'tools': '工具',
        'logs': '日誌',

        // 標籤
        'status': '狀態',
        'enable': '啟用',
        'port': '端口',
        'auto_start': '自動啟動',

        // 狀態
        'running': '運行中（{0} 個工具 / {1} 個功能）',
        'stopped': '已停止',

        // 按鈕
        'select_all': '全選',
        'deselect_all': '取消全選',
        'tools_enabled': '已啟用 {0} / {1} 個工具',

        // 分類群組
        'core': '核心',
        'advanced': '進階',

        // 分類操作
        'all': '全部',
        'none': '無',

        // 日誌訊息
        'server_started': '服務器已啟動',
        'server_stopped': '服務器已停止',
        'start_failed': '啟動失敗：{0}',
        'port_updated': '端口已更新為 {0}',
        'auto_start_enabled': '自動啟動已啟用',
        'auto_start_disabled': '自動啟動已禁用',
        'all_tools_enabled': '所有工具已啟用',
        'all_tools_disabled': '所有工具已禁用',
        'category_all_enabled': '{0}：全部啟用',
        'category_all_disabled': '{0}：全部禁用',
        'toggle_failed': '切換 {0} 失敗：{1}',
        'failed': '失敗：{0}',
    },

    // 工具說明
    'tool_desc': {
        // scene
        'scene_query': '取得當前場景資訊與節點層級樹',
        'scene_list': '列出專案中所有場景檔案',
        'scene_open': '透過 db:// 路徑開啟場景',
        'scene_save': '儲存當前場景',
        'scene_create': '建立新的場景資源',
        'scene_snapshot': '建立當前場景的撤銷快照',
        'scene_dirty': '檢查當前場景是否有未儲存的變更',
        'scene_reload': '軟重載當前場景',
        'scene_classes': '列出所有已註冊的組件類別',
        'scene_close': '關閉當前場景',
        'scene_save_as': '將當前場景另存為新檔案',
        'scene_ready': '檢查場景編輯器是否已就緒',
        'scene_bounds': '取得當前場景視圖的邊界框',

        // node
        'node_query': '透過 UUID、名稱查詢節點，或列出所有節點。使用 includeComponents 可一次取得詳細組件資訊',
        'node_create': '建立新節點，可選設定變換、組件和預製體實例化',
        'node_delete': '從場景中刪除節點',
        'node_set_property': '設定一個或多個節點屬性。使用 "properties" 批次設定，或 "property"+"value" 單一設定',
        'node_duplicate': '複製節點（複製 + 貼上）',
        'node_reset_transform': '重置節點的位置/旋轉/縮放為預設值',
        'node_find_by_asset': '查找使用指定資源 UUID 的所有節點',
        'node_move': '移動節點到新的父節點',

        // component
        'component_add': '為節點添加組件',
        'component_remove': '從節點移除組件（使用組件類型/cid）',
        'component_query': '查詢節點上的組件。不指定 componentType 時僅返回類型列表',
        'component_set_property': '設定一個或多個組件屬性。使用 "properties" 陣列批次設定，或單一 "property"+"propertyType"+"value"',
        'component_reset': '將組件重置為預設值',
        'component_list_types': '列出所有可添加到節點的組件類型',
        'component_query_detail': '透過 UUID 查詢單一組件（從節點查詢結果取得）',
        'component_execute_method': '在運行時執行組件上的方法',
        'component_list_all': '列出所有已註冊組件的詳細資訊（名稱、cid、腳本路徑、資源 UUID）',

        // asset
        'asset_query': '透過匹配模式、UUID 或 URL 查詢資源',
        'asset_create': '建立新的資源檔案',
        'asset_delete': '刪除資源',
        'asset_move': '移動或重新命名資源',
        'asset_import': '將外部檔案匯入為專案資源',
        'asset_info': '取得資源的詳細中繼資料，包括相依性和函式庫資訊',
        'asset_query_uuid': '在資源 URL 和 UUID 之間轉換',
        'asset_copy': '複製資源到新位置',
        'asset_save': '儲存/覆寫現有資源的內容',
        'asset_query_meta': '取得資源的中繼資訊（匯入設定、子資源配置）',
        'asset_query_users': '查找哪些資源或腳本引用了此資源（反向相依）',
        'asset_query_dependencies': '查找此資源依賴的其他資源（正向相依）',
        'asset_open': '在編輯器中開啟資源（如在程式碼編輯器中開啟腳本、在場景編輯器中開啟場景）',
        'asset_reimport': '重新匯入資源（重新產生編譯/函式庫檔案）',

        // prefab
        'prefab_list': '列出專案中所有預製體資源',
        'prefab_instantiate': '將預製體實例化到場景中',
        'prefab_create': '從現有場景節點建立預製體',
        'prefab_restore': '將預製體實例節點還原為原始預製體狀態',
        'prefab_create_empty': '直接建立新的空預製體資源（不需要場景節點）',

        // project
        'project_info': '取得專案路徑、引擎版本及可選設定',
        'project_refresh': '重新整理資源資料庫',
        'project_build': '針對目標平台建構專案',
        'project_preview': '在瀏覽器中啟動或停止遊戲預覽',
        'project_query_config': '讀取專案級別的配置值',
        'project_set_config': '設定專案級別的配置值',

        // debug
        'debug_get_logs': '取得擴展的最近控制台日誌',
        'debug_clear_logs': '清除日誌緩衝區',
        'debug_execute_script': '在場景上下文中執行 JavaScript（可存取 cc.* API）',

        // scene_view
        'scene_view_gizmo_tool': '取得或設定 Gizmo 工具類型（位移/旋轉/縮放/矩形）',
        'scene_view_gizmo_pivot': '取得或設定 Gizmo 軸心（軸心點/中心點）',
        'scene_view_gizmo_coordinate': '取得或設定 Gizmo 座標系統（本地/全域）',
        'scene_view_view_mode': '取得或設定 2D/3D 視圖模式',
        'scene_view_grid': '顯示或隱藏場景網格',
        'scene_view_focus': '將場景相機聚焦在指定節點上',
        'scene_view_align_camera': '將場景相機對齊當前視圖',
        'scene_view_align_view': '將視圖對齊指定節點',
        'scene_view_icon_gizmo': '取得或設定圖示 Gizmo 設定（3D 模式和大小）',
        'scene_view_status': '一次取得所有場景視圖設定',

        // editor
        'editor_preferences_query': '透過鍵值讀取編輯器或專案偏好設定',
        'editor_preferences_set': '寫入編輯器或專案偏好設定',
        'editor_open_settings': '開啟編輯器偏好設定面板',
        'editor_network_info': '取得伺服器 IP 和預覽端口資訊',
        'editor_editor_info': '取得編輯器版本、平台和 Node.js 版本',
        'editor_engine_info': '取得引擎版本、路徑和原生引擎資訊',
        'editor_open_url': '開啟 URL 或外部程式',
        'editor_query_devices': '查詢已連接的裝置（用於原生平台除錯）',

        // reference_image
        'reference_image_add': '新增參考圖片到場景視圖',
        'reference_image_remove': '依索引移除參考圖片',
        'reference_image_switch': '依索引切換目前的參考圖片',
        'reference_image_set_property': '設定參考圖片屬性（位置、縮放、透明度）',
        'reference_image_query': '取得所有參考圖片配置',
        'reference_image_query_current': '取得當前使用中的參考圖片資訊',
        'reference_image_clear': '移除所有參考圖片',

        // animation
        'animation_list_clips': '列出節點上的動畫剪輯',
        'animation_play': '播放節點上的動畫剪輯',
        'animation_stop': '停止節點上的動畫',
        'animation_set_clip': '設定預設動畫剪輯或節點上的動畫屬性',

        // validation
        'validation_validate_scene': '完整場景健康檢查：節點完整性、缺失組件、空名稱',
        'validation_validate_node': '深度驗證單一節點及其組件',
        'validation_validate_components': '查找缺少必要組件的節點',
        'validation_take_snapshot': '擷取當前場景狀態作為命名快照以供比較',
        'validation_compare_snapshots': '比較兩個快照以查看變更內容',
        'validation_get_scene_stats': '取得場景統計：節點數、組件數、層級深度',
    },
};
