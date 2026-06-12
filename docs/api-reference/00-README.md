# Cocos Creator 編輯器 API 參考文件（3.8.4 / 3.8.8）

> 來源：官方 `@cocos/creator-types` 型別定義
> - 3.8.4：`/Users/tai/test_cocos_mcp/3.8.4type/creator-types`（version `3.8.4-10101`）
> - 3.8.8：`/Users/tai/test_cocos_mcp/3.8.8type/creator-types`（version `3.8.8-121517`）
>
> 用途：cocos-mcp-extension 重新設計與開發時的 API 依據。開發時**以這套文件為準**，不必回頭翻 d.ts；文件中有標註版本徽章的地方表示兩版有差異。

## 文件索引

| 文件 | 內容 | 何時查閱 |
|---|---|---|
| [01-editor-framework.md](./01-editor-framework.md) | `Editor` 全域 namespace 完整目錄（App/Dialog/Message/Panel/Profile/Selection/Utils/protected API 等） | 使用任何 `Editor.*` API 時 |
| [02-messages-scene.md](./02-messages-scene.md) | `scene` package 全部 53 個 message + dump 格式（INode/IComponent/IProperty）+ scene facade 差異 | 節點/組件/場景/prefab/動畫操作 |
| [03-messages-asset-db.md](./03-messages-asset-db.md) | `asset-db` package 全部 43 個 message（公開 + protected）+ AssetInfo/Meta 型別 | 資源查詢/建立/匯入/移動/刪除 |
| [04-messages-other-packages.md](./04-messages-other-packages.md) | 其餘 17 個 package 的 message 與型別（builder/engine/extension/device/preferences/information/server/program/programming/project/preview/tester/package-asset/reference-image/assets/shortcuts/console） | 建置、偏好設定、伺服器資訊等 |
| [05-engine-cc-diff.md](./05-engine-cc-diff.md) | 引擎 `cc` API 的 3.8.4 vs 3.8.8 **差異**（非完整目錄）+ execute-scene-script 相容性建議 | 寫場景腳本（scene script）時 |
| [06-current-extension-analysis.md](./06-current-extension-analysis.md) | 舊版擴展現況分析：架構、131 個 action 盤點、API 錯誤清單（23 處不存在的 message、15 項型別不符、6 類私有 API） | 重寫時對照舊功能 |
| [07-version-diff-summary.md](./07-version-diff-summary.md) | **3.8.4 vs 3.8.8 全部差異彙整**（跨所有層） | 設計版本相容策略時 |

## 核心概念速記

### Editor.Message 是控制編輯器的主通道

```ts
await Editor.Message.request(target, message, ...args); // 有回傳
Editor.Message.send(target, message, ...args);          // 不等回傳
Editor.Message.broadcast(`${pkg}:${event}`, ...args);   // 廣播
```

官方有型別定義的 13 個 target：`asset-db`、`builder`、`engine`、`information`、`preferences`、`preview`、`program`、`programming`、`project`、`scene`、`server`、`device`、`extension`。
（`EditorMessageMaps` 有 index signature，呼叫未列名的 package 也合法，但無型別保障。）

### 場景操作的兩條路

1. **scene message**（首選）：`create-node`、`set-property`、`create-component`… 走編輯器正規流程，有 undo、dirty 標記、面板同步。
2. **execute-scene-script**（補充）：在場景進程中執行擴展自帶的腳本模組，可直接用 `cc` 引擎 API。繞過編輯器簿記，**只用於 message 做不到的事**（詳見 02 與 05 的相容性章節）。

### dump 格式（set-property / query-node 的資料形狀）

- 一切屬性都是 `IProperty` 包裝：讀值用 `dump.xxx.value`，寫入用 `{ value, type }`。
- 組件列表在 `INode.__comps__`；組件屬性 path 形如 `__comps__.0.speed`。
- 引用類型寫法：`{ value: { uuid }, type: 'cc.SpriteFrame' }`。
- 注意：節點旋轉欄位名是 `rotation`（實際對應 eulerAngles），不是 `euler`。

### 版本相容策略（給未來的 3.8.x+ 通用設計）

1. 以 `Editor.App.version` 取得編輯器版本，啟動時解析一次。
2. message 層差異集中在「result 型別」（如 `create-node` 3.8.4 回 `string[]`、3.8.8 回 `string`）——用**正規化 helper** 統一吸收，不要散落各工具。
3. 引擎層用特性偵測（`typeof cc.UISkew !== 'undefined'`）優先於版本字串比較。
4. 不使用官方型別中不存在的 message；必要的 protected API（如 `addBroadcastListener`）集中封裝並標註風險。
