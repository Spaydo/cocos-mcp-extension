# asset-db Package Messages 完整參考（3.8.4 vs 3.8.8）

本文件依據 Cocos Creator 官方 TypeScript 型別定義整理，來源檔案：

| 檔案 | 3.8.4 | 3.8.8 |
| --- | --- | --- |
| 公開 messages | `3.8.4type/.../asset-db/@types/message.d.ts`（141 行） | `3.8.8type/.../asset-db/@types/message.d.ts`（165 行） |
| 公開型別 | `.../@types/public.d.ts`（152 行） | `.../@types/public.d.ts`（157 行） |
| Protected messages | `.../@types/protected/message.d.ts`（198 行） | `.../@types/protected/message.d.ts`（173 行） |
| Protected 匯出 | `.../@types/protected.d.ts`（13 行） | `.../@types/protected.d.ts`（21 行） |
| Worker 全域 | `.../@types/protected/global.d.ts` | `.../@types/protected/global.d.ts` |

呼叫方式：

```typescript
// 公開 message（擴展皆可使用）
const info = await Editor.Message.request('asset-db', 'query-asset-info', 'db://assets/foo.png');

// protected message（內部訊息，介面上 extends 公開 message；
// 一般擴展仍可透過相同管道呼叫，但官方不保證跨版本穩定）
const dbList = await Editor.Message.request('asset-db', 'query-db-list');
```

版本徽章說明：

- 【3.8.4 = 3.8.8】：兩版簽名完全相同。
- 【僅 3.8.4】：只存在於 3.8.4。
- 【僅 3.8.8】：只存在於 3.8.8。
- 【3.8.8 簽名變更】：兩版皆有，但 params 或 result 型別不同（並列兩版簽名）。

> 訊息總數：3.8.4 公開 19 + protected 專屬 24 = 43 個；3.8.8 公開 21 + protected 專屬 22 = 43 個。
> （`query-asset-users`、`query-asset-dependencies` 於 3.8.8 從 protected 移到公開。）

---

## 第一章：公開 Messages（`@types/message.d.ts`）

公開 message 定義於 `export interface message extends EditorMessageMap`，這是擴展開發（含 MCP 工具）首選的 API 面。

### 1.1 狀態查詢

#### `query-ready` 【3.8.4 = 3.8.8】

asset-db 是否已完成啟動並可接受請求。建議在任何資源操作前先確認。

```typescript
'query-ready': {
    params: [],
    result: boolean,
}
```

### 1.2 資源查詢（query-*）

#### `query-asset-info` 【3.8.4 = 3.8.8】

以 uuid、url（`db://...`）或絕對路徑查詢單一資源的完整資訊。第二參數 `dataKeys` 可要求附加欄位（如 `'meta'`、`'depends'`、`'dependeds'`、`'mtime'` 等 `IAssetInfo` 的可選欄位）。

```typescript
'query-asset-info': {
    params: [
        urlOrUUIDOrPath: string, // uuid | url | path
        dataKeys?: string[],
    ],
    result: AssetInfo | null,
}
```

#### `query-missing-asset-info` 【3.8.4 = 3.8.8】

查詢「已被刪除/遺失」資源的殘留資訊（例如場景中引用了已刪除的資源）。

```typescript
'query-missing-asset-info': {
    params: [
        urlOrPath: string, // uuid | path
    ],
    result: MissingAssetInfo | null,
}
```

> `MissingAssetInfo` 由 `@editor/asset-db/libs/info` 匯入，其結構未隨 creator-types 包發佈（兩版皆然），實際欄位需於執行期觀察。

#### `query-asset-meta` 【3.8.4 = 3.8.8】

以 uuid 查詢資源的 meta 內容（即 `.meta` 檔解析結果）。

```typescript
'query-asset-meta': {
    params: [
        string, // uuid
    ],
    result: IAssetMeta | null,
}
```

#### `query-asset-users` 【僅 3.8.8】（3.8.4 中為 protected message，見第二章 2.1）

查詢資源被哪些資源或腳本「直接」使用到（反向依賴）。第一參數為 uuid 或 url；第二參數指定查詢的資源類型，預設 `'asset'`，可選 `'asset' | 'script' | 'all'`。

```typescript
'query-asset-users': {
    params: [
        string,          // uuidOrURL
        QueryAssetType?  // 'asset' | 'script' | 'all'，預設 'asset'
    ],
    result: string[],    // 使用者 uuid 陣列
}
```

> 與 3.8.4 protected 版相比有兩處不同：result 由 `string | null` 修正為 `string[]`；參數說明由「uuid」放寬為「uuid 或 url」。
> 注意：3.8.8 的公開 `message.d.ts` 直接引用 `QueryAssetType` 但檔頭未 import（型別檔瑕疵）；實際定義在 `protected/asset.d.ts`：`type QueryAssetType = 'asset' | 'script' | 'all'`。

#### `query-asset-dependencies` 【僅 3.8.8】（3.8.4 中為 protected message，見第二章 2.1）

查詢資源所依賴的資源或腳本 uuid 陣列（正向依賴）。參數同上。

```typescript
'query-asset-dependencies': {
    params: [
        string,          // uuidOrURL
        QueryAssetType?  // 'asset' | 'script' | 'all'，預設 'asset'
    ],
    result: string[],
}
```

#### `query-path` 【3.8.4 = 3.8.8】

將 uuid 或 url 轉成磁碟絕對路徑。

```typescript
'query-path': {
    params: [
        string, // uuid | url
    ],
    result: string | null,
}
```

#### `query-url` 【3.8.4 = 3.8.8】

將 uuid 或絕對路徑轉成 `db://` url。

```typescript
'query-url': {
    params: [
        string, // uuid | path
    ],
    result: string | null,
}
```

#### `query-uuid` 【3.8.4 = 3.8.8】

將 url 或絕對路徑轉成 uuid。

```typescript
'query-uuid': {
    params: [
        string, // url | path
    ],
    result: string | null,
}
```

#### `query-assets` 【3.8.4 = 3.8.8】（但 `QueryAssetsOption` 在 3.8.8 有欄位差異，見 §3.4）

依條件批次查詢資源清單。不帶參數時回傳所有資源。`dataKeys` 用法同 `query-asset-info`。

```typescript
'query-assets': {
    params: [
        options?: QueryAssetsOption,
        dataKeys?: (keyof IAssetInfo)[]
    ],
    result: AssetInfo[],
}
```

### 1.3 建立 / 匯入 / 儲存

#### `create-asset` 【3.8.4 = 3.8.8】

建立新資源。第一參數為目標 url（`db://assets/...`），第二參數為內容（字串、Buffer；傳 `null` 建立資料夾），第三參數為可選的衝突處理選項。

```typescript
'create-asset': {
    params: [
        string,                  // url
        string | Buffer | null,  // content（null = 建立資料夾）
    ] | [
        string,
        string | Buffer | null,
        AssetOperationOption,    // { overwrite?, rename? }
    ],
    result: AssetInfo | null,
}
```

#### `import-asset` 【3.8.4 = 3.8.8】

將磁碟上的外部檔案匯入到資料庫。第一參數為來源絕對路徑，第二參數為目標 url。

```typescript
'import-asset': {
    params: [
        string, // source 絕對路徑
        string, // target url
    ] | [
        string,
        string,
        AssetOperationOption,
    ],
    result: AssetInfo | null,
}
```

#### `save-asset` 【3.8.4 = 3.8.8】

以新的內容覆寫既有資源檔。第一參數為 uuid 或 url，第二參數為內容。

```typescript
'save-asset': {
    params: [
        string,           // uuid | url
        string | Buffer,  // content
    ],
    result: AssetInfo | null,
}
```

### 1.4 移動 / 複製 / 刪除

#### `copy-asset` 【3.8.4 = 3.8.8】

複製資源。參數為來源 url 與目標 url。

```typescript
'copy-asset': {
    params: [
        string, // source url
        string, // target url
    ] | [
        string,
        string,
        AssetOperationOption,
    ],
    result: AssetInfo | null,
}
```

#### `move-asset` 【3.8.4 = 3.8.8】

移動（或重新命名）資源。參數為來源 url 與目標 url。

> ⚠ **實測備註（2026-06-12，3.8.4 編輯器）**：`move-asset` / `copy-asset` 成功時 runtime 可能回傳
> `null`/`undefined`（與型別宣告的 `AssetInfo | null` 中「null = 失敗」語意不符）。
> **不要以回傳值判斷成敗**，改以 `query-asset-info` 查詢目標 url 是否存在來確認。

```typescript
'move-asset': {
    params: [
        string, // source url
        string, // target url
    ] | [
        string,
        string,
        AssetOperationOption,
    ],
    result: AssetInfo | null,
}
```

#### `delete-asset` 【3.8.4 = 3.8.8】

刪除資源（含其 meta）。參數為 uuid 或 url。

```typescript
'delete-asset': {
    params: [
        string, // uuid | url
    ],
    result: AssetInfo | null, // 被刪除資源的資訊
}
```

### 1.5 Meta 操作

#### `save-asset-meta` 【3.8.4 = 3.8.8】

以序列化字串覆寫資源的 meta（通常是 `JSON.stringify` 後的 meta 內容，用於修改 `userData` 等）。

```typescript
'save-asset-meta': {
    params: [
        string, // uuid | url
        string, // 序列化後的 meta 內容
    ],
    result: AssetInfo | null,
}
```

（讀取 meta 請用 `query-asset-meta`，見 §1.2。）

### 1.6 重新整理 / 重新匯入

#### `reimport-asset` 【3.8.8 簽名變更】

強制重新走一次匯入流程（重建 library 產物）。

```typescript
// 3.8.4
'reimport-asset': {
    params: [ string ],   // uuid | url
    result: boolean,
}

// 3.8.8
'reimport-asset': {
    params: [ string ],
    result: void,
}
```

差異：result 由 `boolean` 改為 `void`。3.8.8 後不要依賴回傳值判斷成功與否，改以是否拋出例外（Promise reject）為準。

#### `refresh-asset` 【3.8.8 簽名變更】

重新掃描指定資源（url）對應的磁碟內容並同步資料庫，常用於外部工具直接寫檔後。

```typescript
// 3.8.4
'refresh-asset': {
    params: [ string ],   // url
    result: boolean,
}

// 3.8.8
'refresh-asset': {
    params: [ string ],
    result: void,
}
```

差異：同上，result 由 `boolean` 改為 `void`。

### 1.7 其他工具

#### `open-asset` 【3.8.4 = 3.8.8】

用編輯器（或關聯程式）開啟資源，等同於 Assets 面板雙擊。

```typescript
'open-asset': {
    params: [
        string, // uuid | url
    ],
    result: void,
}
```

#### `generate-available-url` 【3.8.4 = 3.8.8】

依傳入 url 產生一個不與現有資源衝突的可用 url（自動附加序號），建立資源前避免覆蓋的利器。

```typescript
'generate-available-url': {
    params: [
        string, // 期望的 url
    ],
    result: string, // 實際可用的 url
}
```

---

## 第二章：Protected Messages（`@types/protected/message.d.ts`）

Protected message 介面宣告為 `export interface message extends publicMessage`，即包含第一章全部公開 message，再加上下列內部訊息。此處僅列 protected 專屬（或 redeclare）的項目。內部訊息可能跨版本變動（本次 3.8.4 → 3.8.8 即移除了兩個），MCP 擴展使用時應做版本防衛。

### 2.1 資源查詢（query-*）

#### `query-missing-asset-info`（redeclare）【3.8.4 = 3.8.8】

與公開版簽名完全相同（protected 檔內重複宣告了一次，附上中文註解「查询已被删除的资源信息」）。

```typescript
'query-missing-asset-info': {
    params: [
        urlOrPath: string, // uuid | path
    ],
    result: MissingAssetInfo | null,
}
```

#### `query-asset-dependencies` 【僅 3.8.4】（3.8.8 移至公開章 §1.2）

查詢資源依賴的資源或腳本 uuid 陣列。

```typescript
// 3.8.4（protected）
'query-asset-dependencies': {
    params: [
        string,                      // uuid
        QueryAssetType | undefined   // 'asset' | 'script' | 'all'，預設 'asset'
    ],
    result: string[],
}
```

3.8.8 公開版差異：參數註解由「uuid」放寬為「uuid 或 url」；第二參數寫法由 `QueryAssetType | undefined` 改為可選 `QueryAssetType?`（呼叫端等效）；result 不變。

#### `query-asset-users` 【僅 3.8.4】（3.8.8 移至公開章 §1.2，且 result 型別修正）

查詢資源被哪些資源或腳本直接使用到。

```typescript
// 3.8.4（protected）
'query-asset-users': {
    params: [
        string,                      // uuid
        QueryAssetType | undefined
    ],
    result: string | null,           // 注意：3.8.8 公開版修正為 string[]
}
```

#### `query-asset-mtime` 【3.8.4 = 3.8.8】

查詢資源檔案的修改時間（mtime）。

```typescript
'query-asset-mtime': {
    params: [
        string, // uuid
    ],
    result: string | null,
}
```

#### `query-asset-data` 【3.8.4 = 3.8.8】

查詢資源匯入後的 data 資訊。

```typescript
'query-asset-data': {
    params: [
        string, // uuid
    ],
    result: IData | null,
}
```

> `IData` 由 `@editor/asset-db/libs/data` 匯入，結構未隨 creator-types 包發佈（兩版皆然）。

#### `query-asset-thumbnail` 【3.8.4 = 3.8.8】

查詢資源縮圖資訊（icon 名稱或圖片路徑）。

```typescript
'query-asset-thumbnail': {
    params: [uuid: string, size?: number | ThumbnailSize], // ThumbnailSize = 'large' | 'small' | 'middle' | 'origin'
    result: ThumbnailInfo,
}
```

### 2.2 資料庫（DB）資訊查詢

#### `query-db-info` 【3.8.4 = 3.8.8】

查詢指定名稱資料庫（如 `'assets'`、`'internal'`）的設定。

```typescript
'query-db-info': {
    params: [
        string, // db 名稱
    ],
    result: AssetDBOptions,
}
```

#### `query-db-infos` 【3.8.4 = 3.8.8】

查詢目前掛載的所有資料庫設定。

```typescript
'query-db-infos': {
    params: [],
    result: AssetDBOptions[],
}
```

#### `query-db-list` 【3.8.4 = 3.8.8】

查詢所有資料庫名稱列表。

```typescript
'query-db-list': {
    params: [],
    result: string[],
}
```

### 2.3 Importer / 類型 / 設定查詢

#### `query-all-importer` 【3.8.4 = 3.8.8】

查詢所有已註冊的 importer 名稱。

```typescript
'query-all-importer': {
    params: [],
    result: string[],
}
```

#### `query-all-asset-types` 【3.8.4 = 3.8.8】

查詢所有資源類型（assetTypes，如 `cc.ImageAsset`）。

```typescript
'query-all-asset-types': {
    params: [],
    result: string[],
}
```

#### `query-create-menu-list` 【3.8.4 = 3.8.8】

查詢 Assets 面板「新建」選單的完整定義。

```typescript
'query-create-menu-list': {
    params: [],
    result: ICreateMenuInfo[],
}
```

#### `query-icon-config-map` 【3.8.4 = 3.8.8】

查詢各資源處理器的 icon 設定表。

```typescript
'query-icon-config-map': {
    params: [],
    result: Record<string, ICONConfig>,
}
```

#### `query-asset-config-map` 【3.8.4 = 3.8.8】

查詢各資源處理器的描述設定（displayName、userDataConfig 等）。

```typescript
'query-asset-config-map': {
    params: [],
    result: Record<string, IAssetConfig>,
}
```

### 2.4 建立資源（進階）

#### `create-asset-dialog` 【3.8.4 = 3.8.8】

指定類型彈出「建立資源」對話框，由使用者互動完成建立。

```typescript
'create-asset-dialog': {
    params: [
        option: CreateAssetDialogOptions,
    ],
    result: AssetInfo | null,
}
```

#### `new-asset` 【3.8.4 = 3.8.8】

透過資源處理器（handler）流程建立資源，比公開的 `create-asset` 多了 template、uuid 指定、userData 預設值等能力。

```typescript
'new-asset': {
    params: [options: CreateAssetOptions],
    result: AssetInfo | null,
}
```

#### `init-asset` 【3.8.4 = 3.8.8】

將一個虛擬資源實例化成實體資源檔。

```typescript
'init-asset': {
    params: [
        string, // source：需要實例化的虛擬資源
        string, // target：生成到的路徑
    ],
    result: AssetInfo | null,
}
```

### 2.5 Refresh / 工作狀態控制

#### `refresh` 【3.8.4 = 3.8.8】

檢查並刷新所有資料庫（全量掃描）。

```typescript
'refresh': {
    params: [],
    result: void,
}
```

#### `is-busy` 【3.8.4 = 3.8.8】

是否有資源處理任務正在進行。

```typescript
'is-busy': {
    params: [],
    result: boolean,
}
```

#### `pause` 【3.8.4 = 3.8.8】

暫停資源處理。參數為來源標記（source），恢復時對應。

```typescript
'pause': {
    params: [
        string, // source
    ],
    result: boolean,
}
```

#### `resume` 【3.8.4 = 3.8.8】

恢復資源處理。

```typescript
'resume': {
    params: [],
    result: boolean,
}
```

### 2.6 腳本 / 自訂操作 / 批次

#### `execute-script` 【3.8.4 = 3.8.8】

執行指定的 db 腳本方法。

```typescript
'execute-script': {
    params: [ExecuteAssetDBScriptMethodOptions], // { name, method, args? }
    result: any,
}
```

#### `execute-custom-operation` 【3.8.4 = 3.8.8】

執行資源處理器（asset handler）內定義的自訂操作（`customOperationMap`）。

```typescript
'execute-custom-operation': {
    params: [handlerName: string, operate: string, ...args: any[]],
    result: any,
}
```

#### `batch-message-handler` 【3.8.4 = 3.8.8】

批次執行多個 message，可指定是否並行。

```typescript
'batch-message-handler': {
    params: [
        messageList: IMessage[],  // { name: string; args: any[] }
        parallelism?: boolean,
    ],
    result: any[],
}
```

### 2.7 偵錯

#### `open-devtools` 【3.8.4 = 3.8.8】

開啟 asset-db worker 的 DevTools 視窗。

```typescript
'open-devtools': {
    params: [],
    result: void,
}
```

---

## 第三章：重要複合型別

以下定義取自 `@types/public.d.ts` 與 `@types/protected/*.d.ts`。除特別標註外，兩版完全相同。

### 3.1 `IAssetInfo`（使用 dataKeys 過濾時的回傳介面）【3.8.4 = 3.8.8】

```typescript
export interface IAssetInfo {
    name: string;                          // 资源名字
    source: string;                        // url 地址
    path: string;                          // loader 加载的层级地址
    url: string;                           // loader 加载地址会去掉扩展名，这个参数不去掉
    file: string;                          // 绝对路径
    uuid: string;                          // 资源的唯一 ID
    importer: string;                      // 使用的导入器名字
    imported: boolean;                     // 是否结束导入过程
    invalid: boolean;                      // 是否导入成功
    type: string;                          // 类型
    isDirectory: boolean;                  // 是否是文件夹
    library: { [key: string]: string };    // 导入资源的 map

    // dataKeys 作用範圍（需在 query 的 dataKeys 中要求才會附帶）
    isBundle?: boolean;                    // 是否是 bundle
    displayName?: string;                  // 资源用于显示的名字
    readonly?: boolean;                    // 是否只读
    visible?: boolean;                     // 是否显示
    subAssets?: { [key: string]: IAssetInfo }; // 子资源 map
    instantiation?: string;                // 虚拟资源可实例化时的扩展名
    redirect?: IRedirectInfo;              // 跳转指向资源
    meta?: IAssetMeta;
    fatherInfo?: any;
    extends?: string[];                    // 资源的继承链信息
    mtime?: number;                        // 资源文件的 mtime
    depends?: string[];                    // 依赖的资源 uuid
    dependeds?: string[];                  // 被依赖的资源 uuid
}
```

### 3.2 `AssetInfo`【3.8.4 = 3.8.8】

```typescript
export interface AssetInfo extends IAssetInfo {
    name: string;                              // 资源名字
    displayName: string;                       // 资源用于显示的名字
    source: string;                            // URL
    path: string;                              // loader 加载的层级地址
    url: string;                               // loader 加载地址（不去扩展名）
    file: string;                              // 绝对路径
    uuid: string;                              // 资源的唯一 ID
    importer: string;                          // 使用的导入器名字
    type: string;                              // 类型
    isDirectory: boolean;                      // 是否是文件夹
    library: { [key: string]: string };        // 导入资源的 map
    subAssets: { [key: string]: AssetInfo };   // 子资源 map
    visible: boolean;                          // 是否显示
    readonly: boolean;                         // 是否只读

    instantiation?: string;                    // 虚拟资源可实例化时的扩展名
    redirect?: IRedirectInfo;                  // 跳转指向资源
    extends?: string[];                        // 继承类型
    imported: boolean;                         // 是否导入完成
    invalid: boolean;                          // 是否导入失败
}

export interface IRedirectInfo {
    type: string; // 跳转资源的类型
    uuid: string; // 跳转资源的 uuid
}
```

### 3.3 `IAssetMeta`【3.8.4 = 3.8.8】

```typescript
export interface IAssetMeta {
    ver: string;          // meta 版本
    importer: string;     // 导入器名字
    imported: boolean;
    uuid: string;
    files: string[];
    subMetas: {
        [index: string]: IAssetMeta;
    };
    userData: {
        [index: string]: any;
    };
    displayName: string;
    id: string;
    name: string;
}
```

### 3.4 `QueryAssetsOption`【3.8.8 簽名變更：新增 deprecated `type`】

```typescript
// 3.8.4
export interface QueryAssetsOption {
    ccType?: string | string[];   // 'cc.ImageAsset' 这类，多个用数组
    isBundle?: boolean;           // 筛选 asset bundle 信息，搜索子包只能与 pattern 选项共存
    importer?: string | string[]; // 导入名称，多个用数组
    pattern?: string;             // 路径匹配，globs 格式
    extname?: string | string[];  // 扩展名匹配，多个用数组
    userData?: Record<string, boolean | string | number>; // 筛选符合 userData 配置的资源
}

// 3.8.8：新增一個已棄用欄位
export interface QueryAssetsOption {
    // ...（同上全部欄位）
    /**
     * @deprecated use ccType instead
     */
    type?: string;
}
```

差異：3.8.8 新增 `type?: string` 並標記 `@deprecated`，等於官方在型別層面承認舊欄位 `type` 仍可用（向後相容），但新程式碼一律應使用 `ccType`。

### 3.5 `AssetOperationOption`【3.8.4 = 3.8.8】

（`public.d.ts` 中重複宣告了兩次，內容一致——TypeScript interface 合併，無實質影響。）

```typescript
export interface AssetOperationOption {
    overwrite?: boolean; // 是否强制覆盖已经存在的文件，默认 false
    rename?: boolean;    // 是否自动重命名冲突文件，默认 false
}
```

### 3.6 `AssetDBOptions`【3.8.4 = 3.8.8】

```typescript
export interface AssetDBOptions {
    name: string;
    target: string;
    library: string;
    temp: string;
    interval: number;
    /**
     * 0: 忽略错误
     * 1: 仅仅打印错误
     * 2: 打印错误、警告
     * 3: 打印错误、警告、日志
     * 4: 打印错误、警告、日志、调试信息
     */
    level: number;
    ignoreFiles: string[];
    preImportExtList?: string[];
    readonly: boolean;
    visible: boolean;
    ignoreGlob?: string;
}
```

### 3.7 `ExecuteAssetDBScriptMethodOptions`【3.8.4 = 3.8.8】

```typescript
export interface ExecuteAssetDBScriptMethodOptions {
    name: string;    // db 脚本（擴展）名稱
    method: string;  // 方法名
    args?: any[];
}
```

### 3.8 `QueryAssetType`（`protected/asset.d.ts`）【3.8.4 = 3.8.8】

```typescript
export type QueryAssetType = 'asset' | 'script' | 'all';
```

### 3.9 `CreateAssetOptions`（`protected/asset-handler.d.ts`）【3.8.4 = 3.8.8】

```typescript
export interface CreateAssetOptions {
    // 资源创建的输出地址，支持绝对路径和 url
    target: string;

    // 资源文件内容，支持字符串、Buffer、JSON
    content?: string | Buffer | JSON;
    // 资源文件模板地址，例如 db://xxx/ani ，支持 url 与绝对路径
    template?: string;
    // (content 与 template 都未传递时，将创建文件夹)
    // (content 与 template 都传递时，优先使用 content)

    // 资源处理器名称，未指定时由 target 后缀查找
    handler?: string;
    // 指定 uuid，冲突时会自动重新分配
    uuid?: string;
    // 默认 false，不覆盖同名文件时将会重命名指定的 path
    overwrite?: boolean;
    // 是否自动重命名冲突文件，默认 false
    rename?: boolean;
    // 新建资源时指定的一些 userData 默认配置值
    userData?: Record<string, any>;
    // 传递一些自定义配置信息，可在自定义资源处理器内使用
    customOptions?: Record<string, any>;
}
```

### 3.10 `CreateAssetDialogOptions`（`protected/asset-handler.d.ts`）【3.8.4 = 3.8.8】

```typescript
export interface CreateAssetDialogOptions {
    handler?: string;   // 与资源处理器一对一的处理行为
    ccType?: string;    // 同一 type 对应多种实体资源时，默认取第一个匹配的创建行为
    url?: string;       // 默认创建地址
    template?: string;  // 默认的资源模板地址
}
```

### 3.11 `ThumbnailSize` / `ThumbnailInfo` / `ICONConfig`（`protected/asset-handler.d.ts`）【3.8.4 = 3.8.8】

```typescript
export type ThumbnailSize = 'large' | 'small' | 'middle' | 'origin';

export interface ThumbnailInfo {
    type: 'icon' | 'image';
    value: string; // icon 名字或 image 路径，支持绝对路径、db://、project://、packages://
}

export interface ICONConfig extends ThumbnailInfo {
    thumbnail?: boolean; // 是否支持缩略图
}
```

### 3.12 `ICreateMenuInfo`（`protected/asset-handler.d.ts`）【3.8.4 = 3.8.8】

```typescript
export interface ICreateMenuInfo extends Editor.Menu.ContextMenuItem {
    label: string;                  // 新建菜单名称，支持 i18n:xxx
    fullFileName?: string;          // 创建的默认文件名称（带后缀）
    content?: string | Buffer | JSON; // 资源文件内容
    template?: string;              // 资源文件模板地址（db:// 或绝对路径）
    handler?: string;               // 创建类型的 handler 名称
    submenu?: ICreateMenuInfo[];    // 子菜单
    group?: string;                 // 分组名称
    fileNameCheckConfigs?: FileNameCheckConfig[]; // 名称校验规则
}

export interface FileNameCheckConfig {
    regStr: string;                          // 匹配规则
    failedType: 'error' | 'warn' | 'info';   // 失败提示类型
    failedInfo: string;                      // 失败提示信息，支持 i18n:xxx
}
```

### 3.13 `IAssetConfig`（`protected/asset-handler.d.ts`）【3.8.4 = 3.8.8】

```typescript
export interface IAssetConfig {
    displayName?: string;
    description?: string;
    docURL?: string;
    userDataConfig?: Record<string, IUerDataConfigItem>;
    iconInfo?: ThumbnailInfo;
    from?: {              // 记录此资源的来源信息
        pkgName: string;
        internal: boolean;
    };
}
```

### 3.14 `IMessage` / `MessageResult`（`protected.d.ts`）【3.8.4 = 3.8.8】

```typescript
export interface IMessage {
    name: string;
    args: any[];
}

export interface MessageResult {
    error: Error | null;
    result: any;
}
```

### 3.15 `IAssetDBProfileJSON`（`protected.d.ts`）【僅 3.8.8】

```typescript
export interface IAssetDBProfileJSON {
    ignoreGlobList: string[];
    /**
     * @deprecated use ignoreGlobList instead
     */
    ignoreGlob: string;
}
```

3.8.8 新增：asset-db profile 設定由單一 `ignoreGlob` 字串遷移為 `ignoreGlobList` 陣列。

### 3.16 外部引用而未發佈的型別（兩版皆然）

| 型別 | 來源 | 使用處 |
| --- | --- | --- |
| `MissingAssetInfo` | `@editor/asset-db/libs/info` | `query-missing-asset-info` result |
| `IData` | `@editor/asset-db/libs/data` | `query-asset-data` result |
| `Meta` | `@editor/asset-db/libs/meta` | `AssetManager.queryAssetMeta`（worker 端） |

這些型別僅以 import 形式出現，creator-types 包內無實際定義；MCP 端應以 `any`/執行期觀察處理。

---

## 第四章：Worker 端全域 API（`protected/global.d.ts`，補充參考）

非 message，但與 message 同源（asset-db worker 內的 `Manager.assetManager`），版本差異與公開 message 的變動互相印證。

```typescript
// 3.8.4
export declare class AssetManager extends EventEmitter {
    queryAssetUsers(uuid: string): string[] | PromiseLike<string[]>;
    queryAssetDependencies: (uuid: string, type?: 'asset' | 'script') => Promise<string[]>;
    // ...其餘成員兩版相同
}

// 3.8.8
export declare class AssetManager extends EventEmitter {
    queryAssetUsers(uuid: string, type: QueryAssetType = 'asset'): string[] | PromiseLike<string[]>;
    queryAssetDependencies: (uuid: string, type: QueryAssetType = 'asset') => Promise<string[]>;
    // ...其餘成員兩版相同
}
```

差異：

- `queryAssetUsers` 在 3.8.8 新增 `type` 參數（預設 `'asset'`）。
- `queryAssetDependencies` 的 `type` 由 `'asset' | 'script'` 擴為 `QueryAssetType`（多了 `'all'`），並改為帶預設值。

（`protected/asset.d.ts` 與 `protected/asset-handler.d.ts` 兩版逐字節相同。）

---

## 第五章：版本差異總表（3.8.4 → 3.8.8）

### 5.1 Message 層差異

| # | Message | 章節 | 3.8.4 | 3.8.8 | 差異說明 |
| --- | --- | --- | --- | --- | --- |
| 1 | `reimport-asset` | 公開 | `result: boolean` | `result: void` | 回傳型別變更，不可再依賴布林結果 |
| 2 | `refresh-asset` | 公開 | `result: boolean` | `result: void` | 同上 |
| 3 | `query-asset-users` | protected → 公開 | protected；params `[string, QueryAssetType \| undefined]`；result `string \| null` | 公開；params `[string, QueryAssetType?]`；result `string[]` | 升級為公開 API；result 由 `string \| null` 修正為 `string[]`；第一參數由 uuid 放寬為 uuid 或 url |
| 4 | `query-asset-dependencies` | protected → 公開 | protected；params `[string, QueryAssetType \| undefined]`；result `string[]` | 公開；params `[string, QueryAssetType?]`；result `string[]` | 升級為公開 API；第一參數由 uuid 放寬為 uuid 或 url；result 不變 |
| 5 | 其餘 39 個 message | — | — | — | 簽名完全相同 |

訊息數量統計：

| | 公開 | protected 專屬 | 合計（去重） |
| --- | --- | --- | --- |
| 3.8.4 | 19 | 24（含 1 個 redeclare 的 `query-missing-asset-info` 則為 25 條宣告） | 43 |
| 3.8.8 | 21 | 22（含 redeclare 為 23 條宣告） | 43 |

- 新增的 message 名稱：無（總集合不變）。
- 移除的 message 名稱：無（`query-asset-users`、`query-asset-dependencies` 僅從 protected 遷移到公開）。
- 簽名變更：`reimport-asset`、`refresh-asset`、`query-asset-users`（result 同時變更）、`query-asset-dependencies`（參數可選性寫法）。

### 5.2 型別層差異

| 檔案 | 項目 | 差異 |
| --- | --- | --- |
| `public.d.ts` | `QueryAssetsOption` | 3.8.8 新增 `type?: string`（`@deprecated use ccType instead`） |
| `protected.d.ts` | `IAssetDBProfileJSON` | 3.8.8 新增介面：`ignoreGlobList: string[]` + deprecated `ignoreGlob: string` |
| `protected/message.d.ts` | imports | 3.8.8 移除 `import { QueryAssetType } from './asset'`（隨兩個 message 遷出） |
| `protected/global.d.ts` | `AssetManager.queryAssetUsers` | 3.8.8 新增 `type: QueryAssetType = 'asset'` 參數 |
| `protected/global.d.ts` | `AssetManager.queryAssetDependencies` | `type` 由 `'asset' \| 'script'` 擴為 `QueryAssetType`（含 `'all'`），加上預設值 |
| `protected/asset.d.ts` | — | 兩版相同 |
| `protected/asset-handler.d.ts` | — | 兩版相同 |
| `message.d.ts`（公開） | `create-asset` | 僅尾端空白差異，無語意差異 |

### 5.3 對 MCP 擴展的實務建議

1. `reimport-asset` / `refresh-asset`：統一以 try/catch（Promise reject）判斷成敗，勿讀取回傳值，即可同時相容兩版。
2. 依賴查詢：兩版都可用 `Editor.Message.request('asset-db', 'query-asset-dependencies', uuidOrUrl, type)` 與 `'query-asset-users'`（3.8.4 走 protected 定義、3.8.8 走公開定義，訊息名稱與通道相同）；但 `query-asset-users` 在 3.8.4 的宣告 result 為 `string | null`、3.8.8 為 `string[]`，解析回傳值時需同時容忍兩種形態。
3. 查詢過濾請一律使用 `ccType`，不要使用 3.8.8 才補宣告的 deprecated `type` 欄位。
4. `MissingAssetInfo`、`IData` 無公開型別定義，請以 `any` 處理並做執行期欄位防衛。
