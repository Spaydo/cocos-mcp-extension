# Scene Package Messages API 參考（`Editor.Message.request('scene', ...)`）

> 來源：Cocos Creator 官方型別定義
> - 3.8.4：`3.8.4type/creator-types/editor/packages/scene/@types/message.d.ts`（320 行）
> - 3.8.8：`3.8.8type/creator-types/editor/packages/scene/@types/message.d.ts`（320 行）
> - 複合型別：`.../scene/@types/public.d.ts`、`.../scene/@types/animation/public.d.ts`
> - dump 格式參考：3.8.8 `.../scene/@types/cce/export/dump/`（3.8.4 對應路徑為 `.../scene/@types/cce/utils/dump/`）

兩版的 message 介面皆定義為 `export interface message extends EditorMessageMap`，**兩版各有 53 個 message，名稱完全相同（無新增、無移除）**，但有 **12 個 message 的簽名（params 或 result 型別）在 3.8.8 變更**。

呼叫方式：

```typescript
// params 即 tuple 中的各元素依序展開
const result = await Editor.Message.request('scene', 'query-node', nodeUuid);
```

徽章說明：
- 【3.8.4 = 3.8.8】：兩版簽名完全相同
- 【3.8.8 簽名變更】：兩版皆存在，但 params 或 result 型別不同（並列兩版簽名）
- 【僅 3.8.4】/【僅 3.8.8】：僅存在於該版（本 package 無此情形，message 名稱集合兩版一致）

---

## 目錄

1. [場景開關 / 儲存](#1-場景開關--儲存)
2. [節點操作](#2-節點操作)
3. [屬性操作（set-property 系列）](#3-屬性操作set-property-系列)
4. [組件操作](#4-組件操作)
5. [Prefab 操作](#5-prefab-操作)
6. [腳本執行（execute-scene-script / execute-component-method）](#6-腳本執行)
7. [Undo 快照與軟刷新](#7-undo-快照與軟刷新)
8. [Gizmo / 視圖 / 相機操作](#8-gizmo--視圖--相機操作)
9. [查詢類（query-\*）](#9-查詢類query-)
10. [其他（is-native）](#10-其他is-native)
11. [重要複合型別完整定義](#11-重要複合型別完整定義)
12. [dump 格式說明（INode / IComponent / IProperty / IScene）](#12-dump-格式說明)
13. [動畫相關公開型別（animation/public.d.ts）](#13-動畫相關公開型別)
14. [scene-facade-interface 版本差異](#14-scene-facade-interface-版本差異)
15. [版本差異總表](#15-版本差異總表)

---

## 1. 場景開關 / 儲存

### `open-scene`　【3.8.8 簽名變更】

開啟指定 uuid 的場景。

```typescript
// 3.8.4
'open-scene': {
    params: [string],      // 場景資源 uuid
    result: boolean,
}

// 3.8.8
'open-scene': {
    params: [string],      // 場景資源 uuid
    result: void,          // ← 變更：不再回傳 boolean
}
```

> 差異：3.8.8 的 result 由 `boolean` 改為 `void`。MCP 端不要依賴回傳值判斷開啟是否成功，建議改以 `query-is-ready` / `query-current-scene` 類查詢確認。

### `save-scene`　【3.8.8 簽名變更】

儲存當前場景。

```typescript
// 3.8.4
'save-scene': {
    params: [] | [boolean],    // 可選參數（asNew / force 旗標）
    result: boolean,
}

// 3.8.8
'save-scene': {
    params: [] | [boolean],
    result: string | undefined,  // ← 變更：回傳儲存後場景資源的 uuid（失敗/取消為 undefined）
}
```

> 差異：3.8.8 result 由 `boolean` 改為 `string | undefined`，可直接取得儲存後的場景 uuid。

### `save-as-scene`　【3.8.8 簽名變更】

另存當前場景。

```typescript
// 3.8.4
'save-as-scene': {
    params: [boolean],
    result: boolean,
}

// 3.8.8
'save-as-scene': {
    params: [],                  // ← 變更：不再接受 boolean 參數
    result: string | undefined,  // ← 變更：回傳新場景資源的 uuid
}
```

> 差異：3.8.8 移除了 boolean 參數（params 變成空 tuple），result 改為 `string | undefined`。跨版本相容寫法：3.8.4 需傳一個 boolean，3.8.8 不傳參數。

### `close-scene`　【3.8.4 = 3.8.8】

關閉當前場景。

```typescript
'close-scene': {
    params: [],
    result: boolean,
}
```

---

## 2. 節點操作

### `create-node`　【3.8.8 簽名變更】

建立新節點（可從資源建立，例如 prefab、圖片、模型等）。

```typescript
// 3.8.4
'create-node': {
    params: [CreateNodeOptions],
    result: string[],          // 新節點 uuid 陣列
}

// 3.8.8
'create-node': {
    params: [CreateNodeOptions],
    result: string,            // ← 變更：單一新節點 uuid
}
```

> 差異：3.8.8 result 由 `string[]` 改為 `string`。MCP 端做版本兼容時：`const uuid = Array.isArray(r) ? r[0] : r;`。
> 另外 3.8.8 的 `CreateNodeOptions` 新增 `autoAdaptToCreate?: boolean`（見[複合型別](#11-重要複合型別完整定義)）。

### `remove-node`　【3.8.4 = 3.8.8】

刪除節點（可一次刪除多個）。

```typescript
'remove-node': {
    params: [RemoveNodeOptions],
    result: void,
}
```

### `reset-node`　【3.8.8 簽名變更】

重置節點的 position / rotation / scale 屬性。

```typescript
// 3.8.4
'reset-node': {
    params: [ResetNodeOptions],
    result: void,
}

// 3.8.8
'reset-node': {
    params: [ResetNodeOptions],
    result: boolean,           // ← 變更：回傳是否成功
}
```

### `copy-node`　【3.8.4 = 3.8.8】

暫存節點的實例化物件（複製到內部剪貼簿），為後續 `paste-node` 準備資料。

```typescript
'copy-node': {
    params: [string | string[]],   // 節點 uuid（單個或多個）
    result: string[],              // 被複製的節點 uuid 陣列
}
```

### `duplicate-node`　【3.8.4 = 3.8.8】

複製節點自身（等同編輯器內 Ctrl+D），直接在原地產生副本。

```typescript
'duplicate-node': {
    params: [string | string[]],   // 節點 uuid
    result: string[],              // 新生成節點的 uuid 陣列
}
```

### `paste-node`　【3.8.4 = 3.8.8】

貼上節點到目標節點下。

```typescript
'paste-node': {
    params: [PasteNodeOptions],
    result: string[],              // 新節點 uuid 陣列
}
```

### `cut-node`　【3.8.4 = 3.8.8】

剪下節點（搭配貼上做移動）。

```typescript
'cut-node': {
    params: [string | string[]],   // 節點 uuid
    result: void,
}
```

### `set-parent`　【3.8.4 = 3.8.8】

變更節點的父節點（掛載節點）。注意參數型別名稱是 `CutNodeOptions`（欄位為 `parent` + `uuids`）。

```typescript
'set-parent': {
    params: [CutNodeOptions],
    result: string[],              // 被移動的節點 uuid 陣列
}
```

---

## 3. 屬性操作（set-property 系列）

### `set-property`　【3.8.4 = 3.8.8】

設定節點或組件上的某個屬性值。**這是 MCP 控制場景最核心的 message**，`dump` 欄位必須符合 `IProperty` 格式（至少含 `value` 與 `type`）。

```typescript
'set-property': {
    params: [SetPropertyOptions],
    result: boolean,
}
```

範例（移動節點）：

```typescript
await Editor.Message.request('scene', 'set-property', {
    uuid: nodeUuid,
    path: 'position',
    dump: { value: { x: 0, y: 100, z: 0 }, type: 'cc.Vec3' },
});
// 組件屬性 path 形如：'__comps__.0.speed'
```

### `reset-property`　【3.8.4 = 3.8.8】

把某個屬性重置為預設值（參數同 `set-property`，`dump` 通常可給空 value）。

```typescript
'reset-property': {
    params: [SetPropertyOptions],
    result: boolean,
}
```

### `move-array-element`　【3.8.8 簽名變更】

移動陣列型屬性內某個元素的位置。

```typescript
// 3.8.4
'move-array-element': {
    params: [MoveArrayOptions],
    result: void,
}

// 3.8.8
'move-array-element': {
    params: [MoveArrayOptions],
    result: boolean,           // ← 變更：回傳是否成功
}
```

### `remove-array-element`　【3.8.8 簽名變更】

刪除陣列型屬性內指定 index 的元素。

```typescript
// 3.8.4
'remove-array-element': {
    params: [RemoveArrayOptions],
    result: void,
}

// 3.8.8
'remove-array-element': {
    params: [RemoveArrayOptions],
    result: boolean,           // ← 變更：回傳是否成功
}
```

---

## 4. 組件操作

### `create-component`　【3.8.8 簽名變更】

在節點上新增組件。

```typescript
// 3.8.4
'create-component': {
    params: [CreateComponentOptions],
    result: boolean,
}

// 3.8.8
'create-component': {
    params: [CreateComponentOptions],
    result: void,              // ← 變更：不再回傳 boolean
}
```

> 差異：與 `open-scene` 同方向，3.8.8 不回傳成功與否。新增後可用 `query-node` 重新查詢節點的 `__comps__` 確認。

### `remove-component`　【3.8.4 = 3.8.8】

刪除組件。注意 `uuid` 是**組件本身的 uuid**（從 node dump 的 `__comps__[i].value.uuid` 取得），不是節點 uuid。

```typescript
'remove-component': {
    params: [RemoveComponentOptions],
    result: void,
}
```

### `reset-component`　【3.8.4 = 3.8.8】

重置組件（恢復為預設值）。`uuid` 為組件 uuid。

```typescript
'reset-component': {
    params: [ResetComponentOptions],
    result: void,
}
```

---

## 5. Prefab 操作

### `restore-prefab`　【3.8.8 簽名變更】

從資源資料還原一個 prefab 節點（撤銷對 prefab 實例的本地修改）。注意型別定義沿用 `ResetComponentOptions`（只有 `uuid` 欄位）；facade 層的對應方法是 `restorePrefab(uuid, assetUuid)`。

```typescript
// 3.8.4
'restore-prefab': {
    params: [ResetComponentOptions],
    result: void,
}

// 3.8.8
'restore-prefab': {
    params: [ResetComponentOptions],
    result: boolean,           // ← 變更：回傳是否成功
}
```

> 其餘 prefab 能力（createPrefab / linkPrefab / unlinkPrefab / applyPrefab）不在 message 表中，而在 facade 介面上（見[第 14 節](#14-scene-facade-interface-版本差異)），一般需透過 `execute-scene-script` 或編輯器內建選單觸發。

---

## 6. 腳本執行

### `execute-scene-script`　【3.8.8 簽名變更】

執行擴展（plugin）在 `contributions.scene.script` 中註冊的場景腳本方法。**MCP 擴展要在場景進程內執行自訂邏輯（取得 cc 引擎物件、批次操作）的主要途徑。**

```typescript
// 3.8.4 —— 參數為可選的 inline 型別
'execute-scene-script': {
    params: [] | [
        {
            name: string;      // 擴展（插件）名字
            method: string;    // 方法名字
            args: any[];       // 傳入參數
        }
    ],
    result: any,
}

// 3.8.8 —— 參數必填，使用具名型別
'execute-scene-script': {
    params: [
        ExecuteSceneScriptMethodOptions   // { name: string; method: string; args: any[] }
    ],
    result: any,
}
```

> 差異：物件欄位完全相同（`name`/`method`/`args`），但 3.8.8 將參數改為**必填**並抽出為具名型別 `ExecuteSceneScriptMethodOptions`（兩版的 `public.d.ts` 其實都已定義此型別）。實務上兩版都必須傳該物件，行為一致。

### `execute-component-method`　【3.8.4 = 3.8.8】

執行節點上指定組件的方法。`uuid` 為**組件 uuid**。

```typescript
'execute-component-method': {
    params: [ExecuteComponentMethodOptions],   // { uuid, name, args }
    result: any,
}
```

---

## 7. Undo 快照與軟刷新

### `snapshot`　【3.8.4 = 3.8.8】

記錄一次 undo 快照（把當前變動寫入 undo 堆疊）。

```typescript
'snapshot': {
    params: [],
    result: void,
}
```

### `snapshot-abort`　【3.8.4 = 3.8.8】

放棄當前步驟的所有變動記錄。

```typescript
'snapshot-abort': {
    params: [],
    result: void,
}
```

### `soft-reload`　【3.8.4 = 3.8.8】

軟刷新場景（不重開場景進程，重新載入場景資料；常用於腳本編譯後讓場景套用新程式碼）。

```typescript
'soft-reload': {
    params: [],
    result: void,
}
```

---

## 8. Gizmo / 視圖 / 相機操作

以下皆【3.8.4 = 3.8.8】。

### `change-gizmo-tool`

切換 gizmo 變換工具（如 `'position'` / `'rotation'` / `'scale'` / `'rect'`）。

```typescript
'change-gizmo-tool': { params: [string], result: void }
```

### `query-gizmo-tool-name`

查詢當前 gizmo 工具名稱。

```typescript
'query-gizmo-tool-name': { params: [], result: string }
```

### `change-gizmo-pivot`

切換 gizmo 基準中心（如 `'pivot'` / `'center'`）。

```typescript
'change-gizmo-pivot': { params: [string], result: void }
```

### `query-gizmo-pivot`

查詢 gizmo 中心點類型。

```typescript
'query-gizmo-pivot': { params: [], result: string }
```

### `change-gizmo-coordinate`

切換座標系（如 `'local'` / `'global'`）。

```typescript
'change-gizmo-coordinate': { params: [string], result: void }
```

### `query-gizmo-coordinate`

查詢當前座標系類型。

```typescript
'query-gizmo-coordinate': { params: [], result: string }
```

### `change-is2D`

切換場景編輯視圖 2D / 3D 模式。

```typescript
'change-is2D': { params: [boolean], result: void }
```

### `query-is2D`

查詢是否處於 2D 編輯模式。

```typescript
'query-is2D': { params: [], result: boolean }
```

### `set-grid-visible`

設定場景網格是否可見。

```typescript
'set-grid-visible': { params: [boolean], result: void }
```

### `query-is-grid-visible`

查詢網格是否可見。

```typescript
'query-is-grid-visible': { params: [], result: boolean }
```

### `set-icon-gizmo-3d`

設定 icon gizmo 是否以 3D 方式顯示。

```typescript
'set-icon-gizmo-3d': { params: [boolean], result: void }
```

### `query-is-icon-gizmo-3d`

查詢 icon gizmo 是否為 3D。

```typescript
'query-is-icon-gizmo-3d': { params: [], result: boolean }
```

### `set-icon-gizmo-size`

設定 icon gizmo 的大小。

```typescript
'set-icon-gizmo-size': { params: [number], result: void }
```

### `query-icon-gizmo-size`

查詢 icon gizmo 的大小。

```typescript
'query-icon-gizmo-size': { params: [], result: number }
```

### `focus-camera`

讓場景編輯相機聚焦到指定節點。

```typescript
'focus-camera': { params: [string[]], result: void }   // 節點 uuid 陣列
```

### `align-with-view`

將選中的節點與場景相機對齊。

```typescript
'align-with-view': { params: [], result: void }
```

### `align-view-with-node`

將場景相機與選中的節點對齊。

```typescript
'align-view-with-node': { params: [], result: void }
```

---

## 9. 查詢類（query-*）

### `query-is-ready`　【3.8.4 = 3.8.8】

查詢場景是否已準備好（場景進程是否就緒）。**MCP 在做任何場景操作前建議先確認此值。**

```typescript
'query-is-ready': { params: [], result: boolean }
```

### `query-node`　【3.8.4 = 3.8.8】

查詢節點完整 dump 資料（含所有組件 `__comps__`）。

```typescript
'query-node': {
    params: [string],     // 節點 uuid
    result: INode,        // dump 格式，見第 12 節
}
```

### `query-component`　【3.8.4 = 3.8.8】

查詢單一組件的 dump 資料。`uuid` 為組件 uuid。

```typescript
'query-component': {
    params: [string],     // 組件 uuid
    result: IComponent,   // dump 格式，見第 12 節
}
```

### `query-node-tree`　【3.8.8 簽名變更】

查詢場景節點樹（不傳 uuid 時回傳整個場景樹的根；傳 uuid 時回傳該節點的子樹）。

```typescript
// 3.8.4
'query-node-tree': {
    params: [] | [string],
    result: INode[],          // 節點陣列
}

// 3.8.8
'query-node-tree': {
    params: [] | [string],
    result: INode,            // ← 變更：單一樹根節點（children 內含子樹）
}
```

> 差異：3.8.4 型別宣告為 `INode[]`，3.8.8 為 `INode`。實際回傳是「樹節點物件，children 為遞迴子節點」的精簡結構（非完整 dump，欄位如 `name: string`、`uuid: string`、`children: []`、`type`、`prefab` 等是裸值；官方型別在此沿用 INode 並不精確）。建議解析時同時容忍物件與陣列兩種頂層形態。

### `query-nodes-by-asset-uuid`　【3.8.4 = 3.8.8】

查詢使用了指定資源（asset uuid）的所有節點。

```typescript
'query-nodes-by-asset-uuid': {
    params: [string],     // 資源 uuid
    result: string[],     // 節點 uuid 陣列
}
```

### `query-dirty`　【3.8.4 = 3.8.8】

查詢當前場景是否被修改過（未儲存）。

```typescript
'query-dirty': { params: [], result: boolean }
```

### `query-classes`　【3.8.4 = 3.8.8】

查詢引擎內註冊的類（可用 `extends` 過濾，例如查所有繼承 `cc.Component` 的類）。

```typescript
'query-classes': {
    params: [QueryClassesOptions],   // { extends?: string | string[]; excludeSelf?: boolean }
    result: { name: string }[],
}
```

### `query-components`　【3.8.8 簽名變更】

查詢引擎內所有可用的組件列表。

```typescript
// 3.8.4
'query-components': {
    params: [],
    result: string[],          // 組件名稱陣列
}

// 3.8.8
'query-components': {
    params: [],
    result: {
        name: string;          // 組件類名（ccclass 名）
        cid: string;           // 組件 cid
        path: string;          // 組件選單路徑 / 腳本路徑
        assetUuid: string;     // 若為使用者腳本，對應的資源 uuid
    }[],                       // ← 變更：由字串陣列改為結構化物件陣列
}
```

> 差異：3.8.8 回傳結構化資訊（含 cid 與腳本資源 uuid），對 MCP 列出可新增組件、區分內建/使用者腳本非常有用。

### `query-component-has-script`　【3.8.4 = 3.8.8】

查詢組件列表中是否含有指定類名的（使用者）腳本。

```typescript
'query-component-has-script': {
    params: [string],     // 腳本類名
    result: boolean,
}
```

### `query-scene-bounds`　【3.8.4 = 3.8.8】

查詢場景內容的包圍框（2D 视图常用）。

```typescript
'query-scene-bounds': {
    params: [],
    result: {
        height: number;
        width: number;
        x: number;
        y: number;
    },
}
```

---

## 10. 其他（is-native）

### `is-native`　【3.8.4 = 3.8.8】

查詢是否為原生編輯器環境（3.8.8 僅修正了型別檔的空格排版，語義無差異）。

```typescript
'is-native': {
    params: [queryIsNative] | [],
    result: boolean,
}

export interface queryIsNative {
    /**
     * @zh 是否检查原生编辑器是否可用，如果不检查则只返回配置上记录的是否为原生编辑器
     * @default true
     */
    checkAvailable?: boolean;
}
```

---

## 11. 重要複合型別完整定義

以下定義來自 `scene/@types/public.d.ts`。除特別標註外兩版相同。

### 基礎數學型別

```typescript
export interface Vec2 { x: number; y: number; }
export interface Vec3 { x: number; y: number; z: number; }
export interface Vec4 { x: number; y: number; z: number; w: number; }
interface Quat   { x: number; y: number; z: number; w: number; }
interface Color3 { r: number; g: number; b: number; }
interface Color4 { r: number; g: number; b: number; a: number; }

interface Mat3 {
    m00: number; m01: number; m02: number;
    m03: number; m04: number; m05: number;
    m06: number; m07: number; m08: number;
}

// 3.8.4: interface Mat4（未匯出）
// 3.8.8: export interface Mat4（匯出，且加入 IPropertyValueType）
interface Mat4 {
    m00: number; m01: number; m02: number; m03: number;
    m04: number; m05: number; m06: number; m07: number;
    m08: number; m09: number; m10: number; m11: number;
    m12: number; m13: number; m14: number; m15: number;
}

export interface IRectLike { x: number; y: number; width: number; height: number; }
```

### SetPropertyOptions（set-property / reset-property）

```typescript
export interface SetPropertyOptions {
    uuid: string;     // 修改属性的对象的 uuid（节点 uuid；改组件属性时也是节点 uuid + path 定位）
    path: string;     // 属性挂载对象的搜索路径，如 'position'、'__comps__.0.speed'
    dump: IProperty;  // 属性 dump 出来的数据（至少要有 value 与 type）
    record?: boolean; // 是否记录 undo
}
```

### ISceneUndoOptions（facade beginRecording 用）

```typescript
export interface ISceneUndoOptions {
    tag?: string;          // undo 的标签
    auto?: boolean;        // 是否自动记录
    customCommand?: any;   // 自定义的 command
    external?: object;     // 扩展数据
}
```

### MoveArrayOptions / RemoveArrayOptions

```typescript
export interface MoveArrayOptions {
    uuid: string;     // 节点 uuid
    path: string;     // 数组属性路径
    target: number;   // 目标元素 index
    offset: number;   // 移动偏移量
}

export interface RemoveArrayOptions {
    uuid: string;
    path: string;
    index: number;    // 要删除的元素 index
}
```

### PasteNodeOptions / CutNodeOptions（paste-node / set-parent）

```typescript
export interface PasteNodeOptions {
    target: string;                // 目标节点
    uuids: string | string[];      // 被复制的节点 uuids
    keepWorldTransform?: boolean;  // 是否保持新节点的世界坐标不变
    pasteAsChild?: boolean;        // 是否粘贴成为子节点
}

export interface CutNodeOptions {
    parent: string;                // 父节点
    uuids: string | string[];      // 被移入的节点 uuids
    keepWorldTransform?: boolean;  // 是否保持新节点的世界坐标不变
}
```

### CreateNodeOptions（create-node）　★ 3.8.8 有新增欄位

```typescript
export interface CreateNodeOptions {
    parent?: string;               // 父节点 uuid
    name?: string;                 // 节点名称
    keepWorldTransform?: boolean;  // 是否保持新节点的世界坐标不变
    assetUuid?: string;            // 有资源 id 则从资源内创建对应的节点（prefab/图片/模型等）
    nameIncrease?: boolean;        // 名称自增 xxx001 -> xxx002
    snapshot?: boolean;            // 是否记录 undo 快照
    type?: string;                 // 资源类型（createNodeFromAsset 用）
    unlinkPrefab?: boolean;        // 创建后取消 prefab 状态
    /**
     * 指定生成的位置
     * ⚠ 實測備註（2026-06-12，3.8.4 編輯器）：對一般空節點（無 assetUuid）不生效，
     * 節點仍生成在 (0,0,0)。需要初始位置時，建立後用 set-property 設定 position。
     */
    position?: Vec3;
    canvasRequired?: boolean;      // 是否需要有 Canvas（UI 节点）

    /**
     * 【僅 3.8.8】根据 2D 或者 3D 模式来创建节点，
     * 例如：开启以后，创建图片在 3D 模式下会创建 SpriteRenderer 反之用 Sprite
     */
    autoAdaptToCreate?: boolean;
}
```

### ResetNodeOptions / RemoveNodeOptions

```typescript
export interface ResetNodeOptions {
    uuid: string | string[];
}

export interface RemoveNodeOptions {
    uuid: string | string[];
    keepWorldTransform?: boolean;
}
```

### 組件相關 Options

```typescript
export interface CreateComponentOptions {
    uuid: string;        // 节点 uuid
    component: string;   // 组件注册到 ccclass 里的类名（如 'cc.Sprite' 或自订脚本类名）
}

export interface ResetComponentOptions {
    uuid: string;        // 组件 uuid（restore-prefab 时为节点 uuid）
}

export interface RemoveComponentOptions {
    uuid: string;        // 组件的 uuid
}

export interface ExecuteComponentMethodOptions {
    uuid: string;        // 组件 uuid
    name: string;        // 方法名
    args: any[];         // 参数
}
```

### ExecuteSceneScriptMethodOptions（execute-scene-script）

```typescript
export interface ExecuteSceneScriptMethodOptions {
    name: string;     // 扩展（插件）名字
    method: string;   // scene script 中导出的方法名字
    args: any[];      // 传入的参数
}
```

### QueryClassesOptions（query-classes）

```typescript
export interface QueryClassesOptions {
    extends?: string | string[];  // 过滤：仅列出继承自指定类的类
    excludeSelf?: boolean;        // 是否排除指定类自身
}
```

### IAnimOperation（facade applyAnimationOperation 用）

```typescript
export interface IAnimOperation {
    funcName: string;
    args: any[];
}
```

### 其他輔助型別

```typescript
export interface ITargetOverrideInfo {
    source: string;
    sourceInfo?: string[];
    propertyPath: string[];
    target: string;
    targetInfo?: string[];
}

export interface ScenePluginNodeInfo {
    uuid: string;
    components: ScenePluginComponentInfo[];
}

export interface ScenePluginInfo {
    nodes: ScenePluginNodeInfo[];           // 选中节点列表
    gizmo: { is2D: boolean };               // gizmo 的一些信息
    modes: string[];                        // 当前编辑模式数组
}

export interface ScenePluginComponentInfo {
    uuid: string;
    enabled: boolean;
    type: string;
}

export interface ContributionDropItem {
    type: string;
    message: string;
}

export interface UnitTestInfo { name: string; }

// 相机视角信息（facade focus() 的第二参数）
export interface EditorCameraInfo {
    position: Vec3;
    rotation: Vec4;
    viewCenter: Vec3;
    contentRect: { x: number; y: number; width: number; height: number };
    scale: number;
}
```

---

## 12. dump 格式說明

dump 是編輯器在「引擎物件 ↔ 可序列化 JSON」之間轉換的格式。`query-node` / `query-component` 回傳的就是 dump；`set-property` 的 `dump` 欄位也是同一格式的單屬性版本（`IProperty`）。

> 編解碼器位置（型別檔）：
> - 3.8.8：`.../scene/@types/cce/export/dump/`（`encode.d.ts`：`encodeNode(node): INode`、`encodeScene(scene): IScene`、`encodeComponent(comp): IComponent`、`encodeObject(...): IProperty`；`decode.d.ts`：`decodeNode(dump, node?)`、`decodePatch(path, dump, node)`、`resetProperty(node, path)` 等）
> - 3.8.4：相同內容位於 `.../scene/@types/cce/utils/dump/`（**僅目錄位置不同，內容一致**）
> - `dump-defines.d.ts` 僅定義 `DumpDefines: { [key: string]: DumpInterface }` 註冊表；`DumpInterface` 為 `{ encode(object, data: IProperty, opts?), decode(data, info, dump, opts?) }`，各型別（node-dump、component-dump、value-type-dump、asset-dump...）各自實作。

### IPropertyValueType　★ 3.8.8 變更

```typescript
// 3.8.4
export type IPropertyValueType =
    IProperty | IProperty[] | null | undefined | number | boolean | string | Vec4 | Vec3 | Vec2;

// 3.8.8 —— 新增 Mat4 与 Array<unknown>
export type IPropertyValueType =
    IProperty | IProperty[] | null | undefined | number | boolean | string
    | Vec4 | Vec3 | Vec2 | Mat4 | Array<unknown>;
```

### IProperty（單一屬性的 dump，兩版相同）

```typescript
export type IPropertyLock = {
    default: number;
    message: string;
};

export interface IPropertyGroupOptions {
    id: string;             // 默认 'default'
    name: string;
    displayOrder: number;   // 默认 Infinity, 排在最后面
    style: string;          // 默认为 'tab'
}

export interface IProperty {
    value: { [key: string]: IPropertyValueType } | IPropertyValueType;
    default?: any;                       // 默认值

    // 多选节点之后，这里存储多个数据，用于自行判断多选后的显示效果
    values?: ({ [key: string]: IPropertyValueType } | IPropertyValueType)[];

    lock?: { [key in keyof Vec4]?: IPropertyLock };

    cid?: string;
    type?: string;                       // 类型名，如 'cc.Vec3' / 'cc.Node' / 'Float' / 'cc.SpriteFrame'
    ui?: { name: string; data?: any };   // 指定的 UI 组件
    readonly?: boolean;
    visible?: boolean;
    name?: string;

    elementTypeData?: IProperty;         // 数组里的数据的默认值 dump

    path?: string;                       // 数据的搜索路径，由使用方填充

    isArray?: boolean;
    invalid?: boolean;
    extends?: string[];                  // 继承链，如 ['cc.Component', 'cc.Object']
    displayName?: string;                // 显示到界面上的名字
    displayOrder?: number;
    help?: string;                       // 帮助文档 url
    group?: IPropertyGroupOptions;       // tab 分组
    tooltip?: string;
    editor?: any;                        // 组件上定义的编辑器数据
    animatable?: boolean;                // 是否可以在动画中编辑
    radioGroup?: boolean;                // 是否渲染为 RadioGroup

    enumList?: any[];                    // enum 类型的选项数组
    bitmaskList?: any[];

    // Number
    min?: number;
    max?: number;
    step?: number;
    slide?: boolean;
    unit?: string;
    radian?: boolean;                    // 是否为弧度

    // Label
    multiline?: boolean;                 // 字符串是否允许换行

    optionalTypes?: string[];            // 可变类型 object 的支持（如 render-pipeline）

    userData?: { [key: string]: any };   // 用户透传的数据
}
```

**MCP 建構 `set-property` 請求的要點**：
- 引用型資源（SpriteFrame、Material、Prefab...）：`dump: { value: { uuid: assetUuid }, type: 'cc.SpriteFrame' }`
- 節點 / 組件引用：`dump: { value: { uuid: nodeOrCompUuid }, type: 'cc.Node' }`
- 數值/布林/字串：`value` 直接給裸值；`type` 給 `'Float'` / `'Boolean'` / `'String'` 或省略由編輯器推斷
- 顏色：`{ value: { r, g, b, a }, type: 'cc.Color' }`（0–255）
- enum：給數值；陣列屬性：對整個陣列 path 設定，或用 `move-array-element` / `remove-array-element` 調整

### INode（節點 dump，兩版相同）

```typescript
export interface IRemovedComponentInfo {
    name: string;
    fileID: string;
}

export interface INode {
    active: IProperty;
    locked: IProperty;
    name: IProperty;
    position: IProperty;

    /**
     * 此为 dump 数据，非 node.rotation
     * 实际指向 node.eulerAngles（欧拉角），rotation 是更友好的文案
     */
    rotation: IProperty;
    mobility: IProperty;

    scale: IProperty;
    layer: IProperty;
    uuid: IProperty;          // 注意：uuid 也包成 IProperty，取值用 node.uuid.value

    children: any[];
    parent: any;

    __comps__: IProperty[];   // 组件 dump 数组（实际为 IComponent[]）
    __type__: string;         // 'cc.Node'
    __prefab__?: any;         // prefab 实例信息（若为 prefab 实例）
    _prefabInstance?: any;
    removedComponents?: IRemovedComponentInfo[];
    mountedRoot?: string;
}
```

> 讀值要點：dump 中所有屬性都是 `IProperty` 包裝，例如節點名稱是 `dump.name.value`、位置是 `dump.position.value`（`{x,y,z}`）、第 0 個組件型別是 `dump.__comps__[0].type`、組件 uuid 是 `dump.__comps__[0].value.uuid.value`（`IComponent.value.uuid` 本身是 `IPropertyValueType`，實際回傳為 `{ value: string }` 包裝，請以實際回傳為準防禦性取值）。

### IComponent（組件 dump，兩版相同）

```typescript
export interface IComponent extends IProperty {
    value: {
        enabled: IPropertyValueType;
        uuid: IPropertyValueType;
        name: IPropertyValueType;
    } & Record<string, IPropertyValueType>;   // 其余字段为该组件的各属性 dump
    mountedRoot?: string;
}
```

### IScene（場景 dump，兩版相同）

```typescript
export interface IScene {
    name: IProperty;
    active: IProperty;
    locked: IProperty;
    _globals: any;               // 全局环境设置（ambient/skybox/fog/shadows 等）
    isScene: boolean;            // 恒为 true，用于区分 INode
    autoReleaseAssets: IProperty;

    uuid: IProperty;
    children: any[];
    parent: any;
    __type__: string;            // 'cc.Scene'
    targetOverrides?: any;
}
```

> `query-node` 傳入場景根 uuid 時回傳的即為 `IScene` 形狀（編輯器內部 `encodeScene`）。

---

## 13. 動畫相關公開型別

來源：`scene/@types/animation/public.d.ts`。**兩版完全相同（diff 為空），【3.8.4 = 3.8.8】。**

動畫操作沒有獨立的 scene message，須透過 facade（場景進程內）或 `execute-scene-script` 間接使用 `applyAnimationOperation(operationList: IAnimOperation[], options?: AnimationOperationOptions)` 等方法。主要型別：

```typescript
export type IAnimationType = 'cc.Animation' | 'cc.SkeletalAnimation' | 'cc.animation.AnimationController';

// 关键帧 dump
export interface IKeyDumpData {
    frame: number;
    dump: any;                 // value 的 dump 数据
    inTangent?: number;
    inTangentWeight?: number;
    outTangent?: number;
    outTangentWeight?: number;
    interpMode?: number;
    broken?: boolean;
    tangentWeightMode?: number;
    imgUrl?: string;
    easingMethod?: number;
}

export interface IDumpType {
    value: string;
    extends?: string[];
}

export interface IClipInfo {
    name: string;
    uuid: string | undefined;
}

// 动画相关操作的返回值结果
export interface IAniResultBase {
    state: 'success' | 'failure';
    result: any | null;
    reason?: string;
}

export interface IAniEditInfo extends IAniResultBase {
    result: null | {
        root: string;
        node?: any;
        aniComp?: IAnimationType;
        clipsMenu?: IClipInfo[];
        defaultClip?: string;
    }
}

export interface IAnimationEditData {
    root: string;
    curEditClip: AnimationClip | null;
}

// 单条属性轨道的 dump
export interface IPropCurveDumpData {
    nodePath: string;
    keyframes: IKeyDumpData[];   // 原始 keyframe 数据
    displayName: string;
    key: string;
    type?: IDumpType;
    preExtrap: number;
    postExtrap: number;
    isCurveSupport: boolean;     // 是否支持贝塞尔曲线编辑
}

interface IEventDump {
    frame: number;
    func: string;
    params: string[];
}

export interface IPlayableInfo {
    type: 'animation-clip' | 'particle-system';
    clip?: string;
    path?: string;
}

export interface IEmbeddedPlayers {
    begin: number;
    end: number;
    reconciledSpeed: boolean;
    playable?: IPlayableInfo;
    group: string;
    displayName?: string;
}

export interface AnimationClipPlayerInfo extends IPlayableInfo { clip: string; path: string; }
export interface ParticleSystemPlayerInfo extends IPlayableInfo { path: string; }

export interface AuxiliaryCurveListItem {
    name: string;
    curve: ICurveDumpData;
}

// 动画 clip 的完整编辑器 dump
export interface EditorAnimationClipDump {
    name: string;
    duration: number;
    sample: number;
    speed: number;
    wrapMode: number;

    curves: ICurveDumpData[];
    events: IEventDump[];
    embeddedPlayers: IEmbeddedPlayers[];
    time: number;
    isLock: boolean;
    embeddedPlayerGroups: EmbeddedPlayerGroup[];

    auxiliaryCurves: Record<string, IPropCurveDumpData>;

    isSkeleton: boolean;
    useBakedAnimation: boolean;  // 打开 baked animation 后动画编辑器无法播放（官方已知问题）
}

export interface EditorEmbeddedPlayer extends IEmbeddedPlayers { _embeddedPlayer: any; }

// 复制/粘贴动画数据用
export interface IAnimCopyKeySrcInfo  { curvesDump: IPropCurveDumpData[]; }
export interface IAnimCopyNodeSrcInfo { curvesDump: IPropCurveDumpData[]; }
export interface IAnimCopyAuxSrc  { name: string; frame: number; data: IPropCustomData; }
export interface IAnimCopyAuxDest { name: string; frame: number; data: IPropCustomData; }
export interface IAnimCopyNodeDstInfo { nodePath: string; }
export interface IAnimCopyEmbeddedPlayersSrcInfo { embeddedPlayersDump: IEmbeddedPlayers[]; }
export interface IAnimCopyEventSrcInfo { eventsDump: IEventDump[]; }
export interface IAnimCopyPropSrcInfo  { curvesDump: IPropCurveDumpData[]; }
export interface IAnimCopyPropDstInfo  { nodePath: string; propKeys?: string[]; }
export interface IAnimCopyKeyDstInfo   { nodePath: string; propKeys?: string[]; startFrame: number; }
export interface IAnimCopyEventDstInfo { startFrame: number; }

export interface AnimationOperationOptions {
    /** 该次 operation 是否需要记录到场景的 undo 系统中 */
    recordUndo?: boolean;
}
```

facade 上的動畫方法（兩版相同，見 `scene-facade-interface.d.ts`）：`queryCurrentAnimationState()`、`queryCurrentAnimationInfo()`、`queryAnimationRootNode(uuid)`、`queryAnimationRootInfo(uuid)`、`queryAnimationClipDump(nodeUuid, clipUuid)`、`queryAnimationProperties(uuid)`、`queryAnimationClipsInfo(nodeUuid)`、`queryAnimationClipCurrentTime(clipUuid)`、`queryAnimationPropValueAtFrame(clipUuid, nodePath, propKey, frame)`、`queryAuxCurveValueAtFrame(clipUuid, name, frame)`、`recordAnimation(uuid, active, clipUuid?)`、`changeAnimationRootNode(uuid, clipUuid)`、`setCurEditTime(time)`、`changeClipState(operate, clipUuid)`、`setEditClip(clipUuid)`、`saveClip()`、`applyAnimationOperation(operationList, options?)`、`queryAnimationNodeEditInfo(uuid)`、`queryAuxiliaryCurves(clipUuid)`。

---

## 14. scene-facade-interface 版本差異

來源：`scene/@types/scene-facade-interface.d.ts`（3.8.4 為 867 行，3.8.8 為 907 行）。此介面 `ISceneFacade` 是場景進程內部的操作門面，反映「場景操作能力」的版本差異；message 多數最終呼叫到這裡。MCP 可在 scene script 中藉由 `execute-scene-script` 觸達其中的能力。

### 3.8.8 新增的介面成員

```typescript
// gizmo 查看模式（新增）
queryIsViewMode(): boolean;          // 是否是查看模式
queryGizmoViewMode(): string;        // 查询当前 gizmo 模式

/*********************** 多场景相关接口（3.8.8 全部新增） ************************/
changeScene(): Promise<void>;        // 切换 场景、prefab 时候被调用
multiOpenScene(uuid: string): Promise<void>;
multiCloseScene(uuid: string): Promise<void>;
multiSceneDirty(uuid: string): Promise<boolean>;
multiSceneFocus(uuid: string): Promise<void>;
multiSceneQuery(): Promise<ISceneDisplayInfo[]>;
multiSceneFocusQuery(): Promise<string>;
multiSaveAllScene(): Promise<void>;
multiQueryIsMultiEditMode(): Promise<boolean>;
loadEmptyScene(): Promise<boolean>;  // 加载空场景
multiCloseTabsToTheRight(uuid: string): Promise<boolean>;
multiCloseOthers(uuid: string): Promise<boolean>;
multiMoveSceneTo(uuid: string, beforeUuid: string): Promise<void>;

// 预览模式切换钩子（新增，可选成员）
beforePreview?(): Promise<void>;
afterPreview?(): Promise<void>;
```

其中 `ISceneDisplayInfo`（3.8.8 新增，定義於 `cce/3d/manager/multi-scene/interfaces.d.ts`，「主要给 UI 那边展示用的字段」）：

```typescript
export interface ISceneDisplayInfo {
    name: string;
    uuid: string;
    dirty: boolean;
    type: string;
    url: string;
}
```

### 3.8.8 變更的介面成員

```typescript
// 3.8.4
queryGizmoToolName(): Promise<string>;
// 3.8.8 —— 改为同步返回
queryGizmoToolName(): string;
```

### 純語法/排版層面的差異（無語義變化）

- 3.8.4 介面內誤用了 `public async snapshot(...)`、`public abortSnapshot()`、`public beginRecording(...)`、`public cancelRecording(...)`、`public endRecording(...)` 修飾詞；3.8.8 移除 `public`/`async` 修飾（介面內本就不合法），簽名實質相同。
- `queryRecycleNode` / `queryRecycleComponent` / `focus` / `changeTitle` 僅空格排版差異。
- 3.8.8 新增 import：`import { ISceneDisplayInfo } from '../source/script/3d/manager/multi-scene/interfaces';`。

### 結論

3.8.8 的 facade 主要擴充了**多場景（multi-scene）分頁編輯能力**與 **gizmo 查看模式查詢**；既有單場景操作（節點/組件/屬性/prefab/動畫/粒子/地形/LOD/GI light-probe 等）介面在兩版間一致。

---

## 15. 版本差異總表

### 15.1 message 差異（message.d.ts）

兩版 message 數量皆為 **53 個**，名稱集合完全一致（無新增/移除）。簽名差異共 **12 個**：

| message | 3.8.4 | 3.8.8 | 差異說明 |
|---|---|---|---|
| `open-scene` | result: `boolean` | result: `void` | 不再回傳成功與否 |
| `save-scene` | result: `boolean` | result: `string \| undefined` | 改回傳場景 uuid |
| `save-as-scene` | params: `[boolean]`，result: `boolean` | params: `[]`，result: `string \| undefined` | 移除參數；改回傳新場景 uuid |
| `move-array-element` | result: `void` | result: `boolean` | 增加成功與否回傳 |
| `remove-array-element` | result: `void` | result: `boolean` | 增加成功與否回傳 |
| `create-node` | result: `string[]` | result: `string` | 由 uuid 陣列改為單一 uuid |
| `reset-node` | result: `void` | result: `boolean` | 增加成功與否回傳 |
| `restore-prefab` | result: `void` | result: `boolean` | 增加成功與否回傳 |
| `create-component` | result: `boolean` | result: `void` | 不再回傳成功與否 |
| `execute-scene-script` | params: `[] \| [{ name; method; args }]`（inline、可省略） | params: `[ExecuteSceneScriptMethodOptions]`（必填、具名型別） | 欄位相同；參數改必填 |
| `query-node-tree` | result: `INode[]` | result: `INode` | 改回傳單一樹根 |
| `query-components` | result: `string[]` | result: `{ name; cid; path; assetUuid }[]` | 改回傳結構化組件資訊 |

其餘 41 個 message 兩版完全相同（含 `is-native` 的純排版修正）。

### 15.2 public.d.ts 差異

| 項目 | 3.8.4 | 3.8.8 |
|---|---|---|
| `Mat4` | `interface Mat4`（未匯出） | `export interface Mat4`（匯出） |
| `CreateNodeOptions` | 無 | 新增 `autoAdaptToCreate?: boolean`（依 2D/3D 模式自動選擇 Sprite / SpriteRenderer 等） |
| `IPropertyValueType` | `IProperty \| IProperty[] \| null \| undefined \| number \| boolean \| string \| Vec4 \| Vec3 \| Vec2` | 末尾新增 `\| Mat4 \| Array<unknown>` |
| 其餘（`SetPropertyOptions`、`IProperty`、`INode`、`IComponent`、`IScene` 等） | — | 完全相同 |

### 15.3 animation/public.d.ts 差異

無差異（diff 為空，兩版逐字相同）。

### 15.4 scene-facade-interface.d.ts 差異

| 類別 | 內容 |
|---|---|
| 3.8.8 新增 | `queryIsViewMode()`、`queryGizmoViewMode()`；多場景介面 15 個：`changeScene`、`multiOpenScene`、`multiCloseScene`、`multiSceneDirty`、`multiSceneFocus`、`multiSceneQuery`、`multiSceneFocusQuery`、`multiSaveAllScene`、`multiQueryIsMultiEditMode`、`loadEmptyScene`、`multiCloseTabsToTheRight`、`multiCloseOthers`、`multiMoveSceneTo`、`beforePreview?`、`afterPreview?`；新型別 `ISceneDisplayInfo` |
| 3.8.8 變更 | `queryGizmoToolName(): Promise<string>` → `queryGizmoToolName(): string` |
| 純排版 | 移除介面內不合法的 `public`/`async` 修飾詞；空格調整 |

### 15.5 dump 型別檔路徑差異

| 版本 | 路徑 |
|---|---|
| 3.8.4 | `.../scene/@types/cce/utils/dump/`（dump-defines.d.ts、encode.d.ts、decode.d.ts、types/node-dump.d.ts、types/component-dump.d.ts ...） |
| 3.8.8 | `.../scene/@types/cce/export/dump/`（同名檔案，內容一致，僅移除 sourceMappingURL 註解） |

### 15.6 MCP 開發相容性建議

1. **回傳值防禦**：`create-node`（`string[]`→`string`）、`query-node-tree`（`INode[]`→`INode`）、`save-scene`/`save-as-scene`（`boolean`→`string|undefined`）需同時容忍兩版形態。
2. **不要依賴 `open-scene` / `create-component` 的回傳值**：3.8.8 為 `void`；用後續 query 驗證。
3. **`save-as-scene` 參數**：3.8.4 必須傳 `boolean`，3.8.8 必須不傳；依目標版本分支處理。
4. **`query-components`**：3.8.8 直接拿得到 `cid`/`assetUuid`，3.8.4 只有名稱字串，需要 cid 時得另行查 `query-classes` 或 scene script。
5. **`execute-scene-script`** 在兩版行為一致，是 MCP 觸達 facade 進階能力（prefab apply/link、動畫操作、多場景等）最穩定的入口。
