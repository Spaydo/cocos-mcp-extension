# 3.8.4 vs 3.8.8 版本差異總表

> 彙整所有層級的 API 差異。各項細節（完整簽名、型別展開）見對應的編號文件。
> 結論先講：**差異可控**。message 名稱集合幾乎不變（無新增無移除），差異集中在 result 型別與少數 protected 訊息；引擎層的更名全部有 runtime 別名。3.8 全系列通用是可行目標。

---

## 1. Editor 框架層（→ 01）

| 檔案 | 差異 |
|---|---|
| `editor/editor.d.ts`（Editor namespace 主體） | **完全相同** |
| `editor/message.d.ts`、`utils.d.ts`、`extension.d.ts` | **完全相同** |
| `editor/protected.d.ts` | 僅 2 處：3.8.8 在 `Editor.UI.__protected__` 新增 `Message/message/toast: any`；`IWindowOptions.webPreferences` 新增 `nodeIntegrationInWorker?: boolean` |

**結論**：`Editor.*` API 在兩版間可視為 100% 相容。

## 2. scene package（→ 02）

Message 數：兩版皆 53 個，**無新增、無移除**。簽名變更 12 個（全部是 3.8.8 改動）：

| message | 3.8.4 → 3.8.8 | 相容處理 |
|---|---|---|
| `create-node` | result `string[]` → `string` | 正規化：`Array.isArray(r) ? r[0] : r` |
| `query-node-tree` | result `INode[]` → `INode` | 正規化（注意：3.8.4 runtime 實際也回樹物件，型別標註本身有誤，以實測為準） |
| `query-components` | result `string[]` → `{name; cid; path; assetUuid}[]` | 正規化為物件陣列 |
| `open-scene` | result `boolean` → `void` | 不依賴回傳值 |
| `save-scene` | result `boolean` → `string \| undefined`（場景 uuid） | 不依賴回傳值，需要 uuid 另查 |
| `save-as-scene` | params `[boolean]` → `[]`；result `boolean` → `string \| undefined` | 3.8.4 須傳 boolean；版本分支 |
| `create-component` | result `boolean` → `void` | 不依賴回傳值 |
| `reset-node` | result `void` → `boolean` | 不依賴回傳值 |
| `restore-prefab` | result `void` → `boolean` | 不依賴回傳值 |
| `move-array-element` | result `void` → `boolean` | 不依賴回傳值 |
| `remove-array-element` | result `void` → `boolean` | 不依賴回傳值 |
| `execute-scene-script` | params 改為必填 `ExecuteSceneScriptMethodOptions`（欄位相同） | 一律傳完整物件即可，兩版通用 |

型別層：

- `CreateNodeOptions` 3.8.8 新增 `autoAdaptToCreate?: boolean`（自動適配，僅 3.8.8 有效，傳給 3.8.4 會被忽略）。
- `IPropertyValueType` 3.8.8 新增 `Mat4 | Array<unknown>`；`Mat4` 改為 export。
- `IProperty` / `INode` / `IComponent` / `IScene`、`animation/public.d.ts`：**兩版相同**。
- scene-facade（場景進程內部能力，影響 scene script 可呼叫的設施）：3.8.8 新增 `queryIsViewMode()`、`queryGizmoViewMode()` 與多場景編輯介面 15 個（`multiOpenScene` / `multiCloseScene` / `multiSceneQuery` / `multiSaveAllScene` / `loadEmptyScene` 等，回傳 `ISceneDisplayInfo`）；`queryGizmoToolName()` 由 `Promise<string>` 改為同步 `string`。

## 3. asset-db package（→ 03）

Message 總集合：兩版皆 43 個，**無新增、無移除**，但有遷移與簽名變更：

| message | 差異 | 相容處理 |
|---|---|---|
| `query-asset-users` | 3.8.4 protected → 3.8.8 公開；result `string \| null` → `string[]`；第一參數放寬為 uuid 或 url | 正規化為陣列；3.8.4 標註 protected 風險 |
| `query-asset-dependencies` | 3.8.4 protected → 3.8.8 公開；result 同為 `string[]` | 兩版可用；3.8.4 標註 protected 風險 |
| `reimport-asset` | result `boolean` → `void` | 不依賴回傳值 |
| `refresh-asset` | result `boolean` → `void` | 不依賴回傳值 |

型別層：`QueryAssetsOption` 3.8.8 新增 `type?: string`（deprecated，用 `ccType`）；3.8.8 新增 `IAssetDBProfileJSON`；worker 端 `AssetManager.queryAssetUsers` 新增 `type` 參數（預設 `'asset'`）。其餘 39 個 message 兩版完全相同。

## 4. 其他 packages（→ 04）

**Message 變化（全部在 protected 層）**：

| package | 差異 |
|---|---|
| builder | 3.8.8 新增 protected `execute-hook-task`；`query-tasks-info` options 新增 `sortType?: ISortType` |
| engine | 3.8.8 新增 protected `query-engine-modules-profile`、`filter-engine-modules` |
| 其餘（extension/device/preferences/information/server/program/programming/project/preview） | message **無差異** |

**型別/檔案層**：

- 3.8.8 移除：`project/@types/protected.d.ts`（`builtinRenderPipelineKey` enum）、`shortcuts/@types/shortcut.d.ts`、`console` 整包型別、engine 的 `@types/editor-extends/`、`engine-compiler/` 子目錄。
- 3.8.8 新增型別：builder `ISortType`/`ExecuteHookTaskOption`；engine `IFlags`、`IModuleConfig.moduleCmakeConfig/ignoreModules/envLimitModule` 等；extension `ExtensionInfo.isFromCLI/cliTemplateName`；tester `IAutoTestOptions.action/targetBranch`；reference-image `IImageData.missing`。
- Package 目錄：3.8.4 獨有 `console`、`openharmony`、`taobao-creative-app`；3.8.8 新增 `google-play`、`harmonyos-next`、`honor-mini-game`、`migu-mini-game`（皆為平台建置包）。

## 5. 引擎 cc（→ 05，此處僅摘要）

- 頂層匯出 494 → 509：新增 19（最大宗為 `google` Billing namespace 約 3000 行；2D/UI 新增 `UISkew`、`Sorting2D`；內部 enum 提昇為頂層：`DirectorEvent`、`CCObjectFlags`、`MaskType` 等；WASM 手動載入函式）。
- 「移除」4 個全部是更名 + 別名保留（`Mask`→`MaskComponent` 等），**runtime 零破壞**。
- 簽名變更集中在 Node/Director/Tween/Material/SpriteFrame/Prefab/Camera/Animation/TransformBit（細節見 05 (d)）。
- 大量 `__private._cocos_*` 型別更名：**禁止直接引用 `__private` 型別名稱**，改用 class static（`Button.EventType`）。
- `cc/editor` 子模組：custom-pipeline 重組、`encodeCCONJson`/`parseCCONJson` 移除。
- dump 型別檔搬家：3.8.4 `scene/@types/cce/utils/dump/` → 3.8.8 `scene/@types/cce/export/dump/`，**內容一致**（影響：擴展若引用該路徑的型別，須做路徑分支或自帶型別）。

## 6. 對通用 3.8.x 設計的整體策略

1. **單一版本偵測點**：啟動時 `Editor.App.version` 解析為 `{major, minor, patch}` 存起來；場景腳本內用 `cc.VERSION`。
2. **Result 正規化層**：所有跨版 result 差異（§2、§3 表格）封裝在一個 `adapters/` 模組，工具層永遠拿到統一形狀。受影響呼叫：`create-node`、`query-node-tree`、`query-components`、`save-scene`、`save-as-scene`、`query-asset-users`。
3. **Params 分支只有一處**：`save-as-scene`（3.8.4 須傳 `[boolean]`）。
4. **特性偵測優於版本比較**：引擎側 `typeof cc.UISkew !== 'undefined'`；編輯器側對 protected message 用 try/catch + 能力快取。
5. **不依賴會消失的東西**：不用 `console` 包型別、不用 `__private` 型別名稱、不引用 cce 內部路徑（dump 型別自帶一份）。
6. **3.8.8 新能力做成可選**：多場景 facade、`autoAdaptToCreate`、`execute-hook-task` 等，偵測到才暴露對應工具能力。
