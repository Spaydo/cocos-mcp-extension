# Cocos Creator 引擎型別差異：3.8.4 vs 3.8.8

> 比對來源：
> - `3.8.4type/creator-types/engine/cc.d.ts`（71,664 行）vs `3.8.8type/creator-types/engine/cc.d.ts`（75,874 行），diff 約 12,044 行
> - `engine/cc.editor.d.ts`（diff 約 226 行）
> - `engine/features.d.ts`（diff 約 61 行）
>
> 本文件只列「差異」，兩版相同的 API 不列。目的：供 MCP 擴展在 `execute-scene-script`（場景進程）中使用 `cc` API 時做版本相容判斷。

---

## (a) 總覽

| 項目 | 數量 |
|---|---|
| `cc` 模組頂層匯出宣告 | 494（3.8.4）→ 509（3.8.8） |
| 新增頂層宣告 | 19 |
| 移除頂層宣告 | 4（全部都有 runtime 別名保留，實際 **0 個 runtime 移除**） |

主要變化主題：

1. **Google Play Billing 整合**（最大單一新增）：新增 `google` 頂層 namespace（`google.billing`、`google.play`），約 3,000 行型別，對應 Google Play Billing Library v7 API。
2. **類別更名 + 別名保留**：`Mask` → `MaskComponent`、`RichText` → `RichTextComponent`、`Graphics` → `GraphicsComponent`，舊名稱透過 `export { MaskComponent as Mask, ... }` 保留，**runtime 完全相容**。
3. **內部 enum「提昇為頂層宣告」**：大量原本藏在 `__private` 或 class static 內的 enum 被提昇成頂層具名 enum：`DirectorEvent`、`CCObjectFlags`、`MaskType`、`SpriteFrameEvent`、`SystemPriority`、`SettingsCategory`、`PhysicsGroup2D`。字串/數值不變，只是型別宣告位置改變。
4. **新 2D/UI 功能**：`UISkew`（節點斜切）、`Sorting2D`（2D 排序）、`TransformBit.SKEW`，以及對應的引擎模組開關（`USE_UI_SKEW`、`USE_SORTING_2D`）。
5. **WASM 手動載入 API**：`loadWasmModuleBox2D` / `loadWasmModuleBullet` / `loadWasmModulePhysX`（頂層）、`sp.loadWasmModuleSpine`。
6. **大量 `__private` 內部型別更名**：如 `_cocos_ui_layout__Type` → `_cocos_ui_layout__LayoutType`、各 UI 元件的 `EventType` → `ButtonEventType` / `ScrollViewEventType` 等。只影響「直接引用 `__private` 型別名稱」的 TypeScript 程式碼，runtime 無影響。
7. **渲染管線 / gfx / spine 內部演進**（細節見 (d) 末段摘要）：WebGPU 相關參數、UBO enum 重構、spine 3.8 wasm 化等。

---

## (b) 新增的頂層宣告（3.8.8 才有）

### 核心（core / director / object）

| 宣告 | 種類 | 說明 |
|---|---|---|
| `DirectorEvent` | enum | director 事件名集中化（`INIT = "director_init"` 等 16 個），值與 3.8.4 的 `Director.EVENT_*` 字串完全相同 |
| `CCObjectFlags` | enum | 物件旗標（`Destroyed=1`、`DontSave=8`、`EditorOnly=16`、`LockedInEditor=512`、`HideInHierarchy=1024`…），原為內部常數 |
| `SystemPriority` | enum | `LOW=0 / MEDIUM=100 / HIGH=200 / SCHEDULER=2147483648`，`System.Priority` 改用此型別 |
| `SettingsCategory` | enum | `Settings.Category` 由 `__private._cocos_core_settings__Category` 改為此頂層 enum |
| `AffineTransform` | class | **由 `math` namespace 提昇至頂層**。注意：3.8.8 型別中 `cc.math.AffineTransform` 已不存在；但 `cc.AffineTransform` 兩版皆可用（3.8.4 是 `export import AffineTransform = math.AffineTransform` 別名） |

### 2D / UI

| 宣告 | 種類 | 說明 |
|---|---|---|
| `UISkew` | class (Component) | 新元件：節點斜切。`x` / `y` / `skew` 屬性、`setSkew(x, y)`、`getSkew(out?)`、`rotational` |
| `Sorting2D` | class (Component) | 新元件：2D 渲染排序。`sortingLayer` / `sortingOrder` 屬性 |
| `MaskComponent` | class | 即原 `Mask`（更名，成員相同） |
| `RichTextComponent` | class | 即原 `RichText`（更名，成員相同） |
| `GraphicsComponent` | class | 即原 `Graphics`（更名，成員相同） |
| `MaskType` | enum | `GRAPHICS_RECT=0 / GRAPHICS_ELLIPSE=1 / GRAPHICS_STENCIL=2 / SPRITE_STENCIL=3`，原為 `__private` 型別 |
| `SpriteFrameEvent` | enum | `UV_UPDATED = "uv_updated"`，`SpriteFrame.EVENT_UV_UPDATED` 改用此型別（字串值不變） |

### 物理

| 宣告 | 種類 | 說明 |
|---|---|---|
| `PhysicsGroup2D` | enum | 即原 2D 的頂層 `PhysicsGroup`（更名） |
| `PhysicsGroup` | const | 3.8.8 改為 `export const PhysicsGroup: typeof PhysicsGroup2D`（別名，runtime 相容；3D 的 `physics.PhysicsGroup` 兩版不變） |
| `loadWasmModuleBox2D()` | function | `Promise<void>`，手動載入 Box2D wasm |
| `loadWasmModuleBullet()` | function | `Promise<void>`，手動載入 Bullet wasm |
| `loadWasmModulePhysX()` | function | `Promise<void>`，手動載入 PhysX wasm |

### TiledMap

| 宣告 | 種類 | 說明 |
|---|---|---|
| `ITiledLayerCullingRect` | interface | `TiledLayer.cullingRect` 的型別由 inline 匿名物件抽出成具名 interface（結構相同：`leftDown/rightTop` 的 `row/col`） |

### 平台服務

| 宣告 | 種類 | 說明 |
|---|---|---|
| `google` | namespace | Google Play Billing v7 完整型別：`google.billing`（`BillingClient`、`Purchase`、`ProductDetails`、`BillingFlowParams`、`QueryProductDetailsParams` 等 17+ 子 namespace）與 `google.play`。僅 Android Google Play 平台有 runtime 實作 |

---

## (c) 移除的頂層宣告（3.8.4 有、3.8.8 沒有）

| 宣告 | 實際狀況 |
|---|---|
| `class Mask` | 更名為 `MaskComponent`；`cc.Mask` 透過 re-export 別名保留，**runtime 不破壞** |
| `class RichText` | 更名為 `RichTextComponent`；`cc.RichText` 別名保留 |
| `class Graphics` | 更名為 `GraphicsComponent`；`cc.Graphics` 別名保留 |
| `enum PhysicsGroup`（2D 版） | 更名為 `PhysicsGroup2D`；`cc.PhysicsGroup` 以 const 別名保留 |

另外（非頂層但值得注意的「型別層移除」）：

- `math.AffineTransform`：3.8.8 型別中從 `math` namespace 消失（提昇為頂層）。**請一律使用 `cc.AffineTransform`**（兩版皆有）。
- 一批 internal/protected 成員從型別檔移除（runtime 多半仍在，但不應依賴）：`SpriteFrame._calculateUV` / `_calculateSlicedUV` / `_setDynamicAtlasFrame` / `_resetDynamicAtlasFrame` / `_checkPackable`、`UIOpacity.setEntityLocalOpacityDirtyRecursively`、`VideoPlayer.onMetaLoaded`、`WebView.onLoading/onLoaded` 等。

---

## (d) 簽名變更的重要 API（3.8.4 → 3.8.8）

### Node（對 MCP 最重要）

新增成員（**3.8.8 才有，3.8.4 型別檔無此宣告**）：

```ts
// 3.8.8 新增：座標快捷存取器
get x(): number;  set x(val: number);
get y(): number;  set y(val: number);
get z(): number;  set z(val: number);
get worldPositionX(): number;  set worldPositionX(val: number);
get worldPositionY(): number;  set worldPositionY(val: number);
get worldPositionZ(): number;  set worldPositionZ(val: number);

// 3.8.8 新增：字串版泛型 overload（runtime 行為兩版相同，只是型別更好用）
getComponent<T extends Component>(className: string): T | null;
getComponents<T extends Component>(className: string): T[];
getComponentInChildren<T extends Component>(className: string): T | null;
getComponentsInChildren<T extends Component>(className: string): T[];
addComponent<T extends Component>(className: string): T;
```

其他：`protected _transformFlags: TransformBit` → `protected _transformFlags: number`（內部，勿依賴）。

### Director

```ts
// 3.8.4
static readonly EVENT_INIT = "director_init";          // 字面字串
// 3.8.8
static readonly EVENT_INIT = DirectorEvent.INIT;       // 指向新 enum，字串值不變
```

16 個 `EVENT_*` 常數全部如此。**字串值兩版完全相同**，`director.on(...)` 監聽不受影響。

### Tween

```ts
// 3.8.8 新增
bindNodeState(isBindNodeState: boolean): Tween<T>;
```

其餘 Tween / `ITweenOption` / `tween()` 簽名兩版相同。

### Material

```ts
// 3.8.4
constructor();
// 3.8.8
constructor(name?: string);
```

### SpriteFrame

```ts
// 3.8.4
constructor();
static EVENT_UV_UPDATED: string;
// 3.8.8
constructor(name?: string);
static EVENT_UV_UPDATED: SpriteFrameEvent;   // 值仍為 "uv_updated"
```

### Prefab

```ts
// 3.8.8 新增（protected，供 instantiate 內部使用）
protected _instantiate(): Node;
```

`Prefab` 公開 API（`data`、`persistent`、`optimizationPolicy`、`createNode` 等）兩版相同。

### Camera（Component）

```ts
// 3.8.4
static TARGET_TEXTURE_CHANGE: string;
// 3.8.8
static TARGET_TEXTURE_CHANGE: __private._cocos_misc_camera_component__CameraEvent;  // 字串值不變
```

### Animation / AnimationState

`Animation.EventType`、`AnimationState` 的 `on/once/off` 參數型別由 `__private._cocos_animation_animation_state__EventType` 改名為 `..._AnimationStateEventType`。**只是內部型別更名，事件字串與行為不變。**

`AnimationManager` 新增 `get animationStates(): ReadonlyArray<AnimationState>`。

### TransformBit

```ts
// 3.8.8 新增成員
SKEW = 8,
RSS = 14,
// 修正
TRS_MASK = -8        // 3.8.4 型別檔中是壞值 "Bad expression <-8>"
```

### 其他常用類別小幅變更

| API | 3.8.4 | 3.8.8 |
|---|---|---|
| `SortingLayers.getDefaultPriority()` | 無 | 新增 `static getDefaultPriority(): number` |
| `TiledLayer.cullingRect` | inline 匿名型別 | `ITiledLayerCullingRect`（結構相同） |
| `TiledMap.enableTexelOffset(enable: boolean)` | 無 | 新增 |
| `Profiler.setBackgroundColor(color)` / `setFontColor(color)` | 無 | 新增 |
| `Settings.overrideSettings/querySettings` 的 category 參數 | `__private...Category \| string` | `SettingsCategory \| string`（字串照常可用） |
| `System.Priority` 成員型別 | `number` | `SystemPriority`（值相同） |
| `Gradient.Mode` / `Gradient.mode` | inline `{ Blend, Fixed }` / `number` | `GradientMode` enum（值相同） |
| `physics.PhysicsSystem.constructAndRegisterManually()` | 無 | 新增 `static`，配合手動 wasm 載入 |
| `physics.PhysicsRayResult` | — | 新增 `closestHitFraction`；`_assign(...)` 多一個可選參數 |
| `AudioSource` / `VideoPlayer` / `WebView` / `TiledMap` | — | 補上明確 `constructor()` 宣告（無行為差異） |

### `__private` 型別大規模更名（runtime 無影響）

凡是 TypeScript 程式碼直接寫到 `__private._cocos_...__XXX` 名稱的，3.8.8 幾乎都會編譯失敗。代表性更名：

| 3.8.4 | 3.8.8 |
|---|---|
| `_cocos_ui_layout__Type / ResizeMode / AxisDirection / VerticalDirection / HorizontalDirection / Constraint` | `_cocos_ui_layout__LayoutType / LayoutResizeMode / LayoutAxisDirection / ...`（前綴 `Layout`） |
| `_cocos_ui_button__EventType` | `_cocos_ui_button__ButtonEventType` |
| `_cocos_ui_scroll_view__EventType`、`_cocos_ui_scroll_bar__Direction` | `ScrollViewEventType`、`ScrollBarDirection` |
| `_cocos_ui_page_view__Direction / EventType` | `PageViewDirection / PageViewEventType` |
| `_cocos_ui_editbox_edit_box__EventType` | `EditBoxEventType` |
| `_cocos_ui_toggle__EventType` | `ToggleEventType` |
| `_cocos_2d_components_sprite__EventType` | `SpriteEventType` |
| `_cocos_2d_components_mask__MaskType` | 改為頂層 `MaskType` |
| `_cocos_video_video_player_enums__EventType` | `VideoPlayerEventType` |
| `_cocos_web_view_web_view_enums__EventType` | `WebViewEventType` |
| `_cocos_animation_animation_state__EventType` | `AnimationStateEventType` |

對應的 class static（`Layout.Type`、`Button.EventType`、`Sprite.EventType` 等）**runtime 值完全不變**，請一律透過 class static 取用而非 `__private`。

### 內部 / 渲染管線變化摘要（不逐條列）

| 區域 | diff 規模 | 內容概述 |
|---|---|---|
| `google` namespace | 約 3,026 行新增 | Google Play Billing v7 型別（前述） |
| `__private` namespace | 約 +2,129 / -767 行 | 內部型別更名與新增：exotic animation（~65）、skeletal animation blending（~48）、animation core transform（~38）、ui view（~32）、layout（~30）等 |
| `pipeline` namespace | 約 295 行 | UBO 定義重構為 `UBOGlobalEnum / UBOCameraEnum / UBOLocalEnum / UBOForwardLightEnum / UBOShadowEnum / UBOCSMEnum / UBOSHEnum / UBOMorphEnum`；移除 `localDescriptorSetLayout_ResizeMaxJoints`；新增 `getPassPool()` |
| `gfx` namespace | 約 209 行 | 新增 `SampleType`、`ViewDimension` enum 與 `ResourceRange`、`MarkerInfo` class；多個 Info 類別建構子擴充（WebGPU / variable rate shading 參數，如 `DescriptorSetLayoutBinding`、`GeneralBarrierInfo`、`TextureViewInfo`、`SubpassInfo` 增加 `shadingRate`） |
| `sp`（spine）namespace | 約 194 行 | `loadWasmModuleSpine()`、`SPINE_VERSION = "3.8"`、`isBinaryCompatible()` / `isJsonCompatible()`；`AnimationCacheMode` 由 enum 改為 `SpineAnimationCacheMode` 的 const 別名（值不變）；Timeline 類別階層調整 |
| `rendering` namespace | 約 133 行 | `Descriptor` / `DescriptorBlock` / `DescriptorBlockFlattened` / `DescriptorBlockIndex` / `DescriptorTypeOrder` 與 save/load 函式**移出**至 `cc/editor/custom-pipeline` 模組；新增 `PipelinePassBuilder` interface |
| `math` namespace | 約 -113 / +10 行 | 即 `AffineTransform` 提昇至頂層 |
| `native` / `renderer` / `geometry` | 各約 30 行上下 | 小幅內部調整 |

---

## (e) cc.editor.d.ts 差異（diff 約 226 行）

### `cc/editor/custom-pipeline`（主要變化）

- Descriptor 家族由 `rendering` namespace 轉為**本模組自有宣告**：`Descriptor`、`DescriptorBlock`、`DescriptorBlockFlattened`、`DescriptorBlockIndex`、`DescriptorTypeOrder`（原本是 `export import ... = rendering.XXX` 別名，3.8.8 改為實體宣告並從 `rendering` 移除）。
- 新增：`LayoutType` enum（`VULKAN = 0`、`WEBGPU = 1`）、`Layout` class（`static type / isWebGPU`）、`DescriptorGroupBlockIndex` class、`saveDescriptorGroupBlockIndex` / `loadDescriptorGroupBlockIndex`、`sortDescriptorGroupBlocks`、工廠方法 `createLayout / createDescriptor / createDescriptorBlock / createDescriptorBlockFlattened / createDescriptorBlockIndex / createDescriptorGroupBlockIndex`、`DescriptorSetLayoutData.getSets() / getSet(frequency)`、`descriptorGroups` 屬性。
- `DescriptorBlockData` 建構子/`reset` 擴充 WebGPU 參數：`accessType: gfx.MemoryAccessBit`、`viewDimension: gfx.ViewDimension`、`sampleType: gfx.SampleType`、`format: gfx.Format`。
- 移除：`getOrCreateDescriptorBlockData()`；`getPerBatchDescriptorSetLayoutData` / `getPerInstanceDescriptorSetLayoutData` 的 `programID` 由 `any` 改為 `number`。

### `cc/editor/particle-system-2d-utils`

`PNGReader` / `TiffReader` 全面把 `any` 換成具體型別（如 `decodePixels(data: Uint8Array | number[] | null): Uint8Array`、`render(canvas: HTMLCanvasElement): void`）；`TiffReader` 新增 `reset()`。

### `cc/editor/populate-internal-constants`（平台/模組常數）

- 移除：`BAIDU`、`COCOSPLAY`、`QTT`、`LINKSURE`
- 新增平台：`MIGU`、`HONOR`、`COCOS_RUNTIME`
- 新增模組開關：`LOAD_SPINE_MANUALLY`、`LOAD_BOX2D_MANUALLY`、`LOAD_BULLET_MANUALLY`、`LOAD_PHYSX_MANUALLY`、`USE_3D`、`USE_UI_SKEW`、`USE_XR`、`USE_SORTING_2D`

### `cc/editor/serialization`

- 移除：`encodeCCONJson(ccon, chunkURLs)`、`parseCCONJson(json)`
- `CCON` class 補上明確 `constructor()`

---

## (f) features.d.ts 差異（diff 約 61 行）

引擎功能裁剪（feature cropping）設定的結構改版，支援「模組群組」：

```ts
// 3.8.4
export type Features = Record<string, IFeatureItem>;
interface IFeatureItem extends BaseItem { options: Record<string, BaseItem> }

// 3.8.8
export type IModuleItem = IFeatureItem | IFeatureGroup;
export interface Features { [feature: string]: IModuleItem; }
interface IFeatureGroup extends BaseItem { options: {[feature: string]: IFeatureItem}; required?: boolean; }
```

- `BaseItem`：新增 `required?: boolean`；`cmakeConfig` / `isNativeModule` 從 `BaseItem` 移到 `IFeatureItem`。
- `IFeatureItem` 新增：
  - `envCondition?: string` — 限定環境的宏組合條件（如 `"$NATIVE || $HTML5"`）
  - `fallback?: string` — 環境不符時自動回退的模組名
  - `flags: {...}` — 模組被選取時的附加 UI 設定（checkbox / select）
- `IFeatureGroup`：新增的群組型別，`options` 內是 `IFeatureItem`。

對 MCP 的影響：若擴展讀取/解析專案的模組設定（features.json），3.8.8 的項目可能是巢狀群組，解析邏輯需同時容忍兩種形狀。

---

## (g) 對 MCP 擴展（execute-scene-script）的相容性建議

### 兩版可安全共用（不需版本分支）

- **Node 場景操作主幹**：`position / worldPosition / rotation / eulerAngles / scale / setPosition / setRotation / setScale / parent / children / getChildByName / getChildByPath / walk / addChild / removeChild / setSiblingIndex / active / layer / name / uuid`，事件 `on/off/emit` —— 全部無差異。
- **元件存取**：`getComponent / getComponents / getComponentInChildren / addComponent / removeComponent`（含字串與建構子兩種呼叫）。3.8.8 只是加了字串版的泛型 overload，**runtime 行為相同**；在 JS（場景腳本）中完全無感。
- **資源/場景流程**：`director.loadScene / getScene / pause / resume`、`assetManager`（含 `resources` bundle、`loadAny / loadBundle / releaseAsset`）、`instantiate`、`find` —— 型別零差異。
- **常用元件屬性**：`UITransform`、`Sprite`（`spriteFrame / color / sizeMode / type`）、`Label`（`string / fontSize / color`）、`Canvas`、`Widget`、`Layout`、`Button`、`ScrollView`、`Toggle` 等的公開屬性/方法 —— 零差異（只有內部型別名稱變動）。
- **事件字串**：`Director.EVENT_*`、`SpriteFrame.EVENT_UV_UPDATED`、各 UI `EventType` static —— 字串值兩版相同，可放心用字面值或 class static。
- **更名類別**：以 `cc.Mask` / `cc.RichText` / `cc.Graphics` 存取在兩版都有效（3.8.8 為別名）；序列化 cid/類名也未變。但若要做 `js.getClassName()` 比對，注意 3.8.8 內部類名是 `MaskComponent` 系列，**建議用 `instanceof cc.Mask` 或 getComponent('cc.Mask') 字串**，避免比對 class 名稱字串。
- **`cc.PhysicsGroup`**（2D）：3.8.4 是 enum、3.8.8 是 const 別名，取值方式相同。
- **`cc.AffineTransform`**：兩版皆在頂層可用。**不要用 `cc.math.AffineTransform`**（3.8.8 沒有）。
- **Tween 基本鏈式 API**：`tween(target).to/.by/.delay/.call/.union/.repeat/.start` 等無差異。

### 需要版本分支或特性偵測（3.8.8 才有）

| API | 建議處理 |
|---|---|
| `node.x / y / z`、`node.worldPositionX/Y/Z` | **勿在共用程式碼使用**。一律改用 `node.position.x` / `node.setPosition(...)` / `node.worldPosition`，兩版皆可 |
| `UISkew`、`Sorting2D` 元件 | 先 `typeof cc.UISkew !== 'undefined'` 偵測；3.8.4 不存在，addComponent 會失敗 |
| 頂層 enum：`DirectorEvent / CCObjectFlags / MaskType / SpriteFrameEvent / SystemPriority / SettingsCategory / PhysicsGroup2D` | 3.8.4 無此頂層名稱。共用程式碼請改用等價來源：`Director.EVENT_*`、`Mask.Type`、`SpriteFrame.EVENT_UV_UPDATED`、`Settings.Category`、`cc.PhysicsGroup` —— 這些兩版都有且值相同 |
| `new Material('name')` / `new SpriteFrame('name')` | 3.8.4 建構子不收參數；共用程式碼請建構後再設 `.name` |
| `Tween.bindNodeState()` | 3.8.8 only，呼叫前判斷 `typeof t.bindNodeState === 'function'` |
| `loadWasmModuleBox2D/Bullet/PhysX`、`sp.loadWasmModuleSpine`、`physics.PhysicsSystem.constructAndRegisterManually` | 3.8.8 only（手動 wasm 載入機制） |
| `google.billing` / `google.play` | 3.8.8 only，且僅 Android Google Play runtime 有實作 |
| `SortingLayers.getDefaultPriority`、`TiledMap.enableTexelOffset`、`Profiler.setBackgroundColor/setFontColor`、`AnimationManager.animationStates` | 3.8.8 only，使用前做存在性檢查 |
| `TransformBit.SKEW / RSS` | 3.8.8 only |

### TypeScript 編譯層（擴展若用 creator-types 編譯場景腳本）

- **絕對不要直接引用 `__private._cocos_...` 型別名稱**——3.8.4 → 3.8.8 大量更名（Layout/Button/ScrollView/Sprite/Animation 等的 EventType、Direction、Type），會直接編譯失敗。改用 class static（`Layout.Type`、`Button.EventType`）或 `typeof` 推導。
- `rendering.Descriptor*` 系列在 3.8.8 已移到 `cc/editor/custom-pipeline`；自訂管線相關程式碼必須做版本分支。
- `encodeCCONJson` / `parseCCONJson`（`cc/editor/serialization`）在 3.8.8 移除，勿使用。

### 版本偵測建議

場景腳本內以 `cc.VERSION` 分支最可靠（`"3.8.4"` vs `"3.8.8"`）；針對單一 API 則優先用特性偵測（`typeof cc.UISkew !== 'undefined'`、`'bindNodeState' in tweenInstance`），避免維護版本字串比較表。

```js
// execute-scene-script 範例
const ver = cc.VERSION;                       // "3.8.4" / "3.8.8"
const hasUISkew = typeof cc.UISkew !== 'undefined';
const setX = (node, x) => { const p = node.position; node.setPosition(x, p.y, p.z); }; // 兩版共用寫法
```
