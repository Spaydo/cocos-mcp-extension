# 其他 Editor Packages — Message 與 Public 型別參考（3.8.4 ↔ 3.8.8）

> 本文件比對 Cocos Creator **3.8.4** 與 **3.8.8** 官方型別定義（`creator-types/editor/packages/`），涵蓋 `scene` 與 `asset-db` 以外所有具有 message / public 型別的 editor packages。
>
> 來源路徑：
> - 3.8.4：`/Users/tai/test_cocos_mcp/3.8.4type/creator-types/editor/packages/`
> - 3.8.8：`/Users/tai/test_cocos_mcp/3.8.8type/creator-types/editor/packages/`
>
> **版本徽章說明**：
> - 【3.8.4 = 3.8.8】：兩版簽名完全相同（純格式差異如引號 / 分號也視為相同）
> - 【僅 3.8.4】：只存在於 3.8.4，3.8.8 已移除
> - 【僅 3.8.8】：3.8.8 新增
> - 【3.8.8 簽名變更】：兩版皆存在但簽名有實質差異（並列兩版簽名）
>
> **公開 / Protected 區分**：「公開 message」定義於 `@types/message.d.ts`，外部擴展可直接以 `Editor.Message.request('<pkg>', '<message>', ...)` 呼叫；「protected message」定義於 `@types/protected/message.d.ts`（或 `protected.d.ts`），為編輯器內部通訊用，呼叫需自行承擔版本相容風險。

---

## 目錄

1. [builder](#1-builder)
2. [engine](#2-engine)
3. [extension](#3-extension)
4. [device](#4-device)
5. [preferences](#5-preferences)
6. [information](#6-information)
7. [server](#7-server)
8. [program](#8-program)
9. [programming](#9-programming)
10. [project](#10-project)
11. [preview](#11-preview)
12. [tester](#12-tester)
13. [package-asset](#13-package-asset)
14. [reference-image](#14-reference-image)
15. [assets（資源面板）](#15-assets資源面板)
16. [shortcuts](#16-shortcuts)
17. [console（僅 3.8.4）](#17-console僅-384)
18. [packages 目錄層級差異](#18-packages-目錄層級差異)
19. [版本差異總表](#19-版本差異總表)

---

## 1. builder

建置系統。公開 message 定義於 `builder/@types/message.d.ts`，protected message 定義於 `builder/@types/protected/message.d.ts`。

### 1.1 公開 message（message.d.ts）

#### `open`　【3.8.4 = 3.8.8】

```typescript
'open': {
    params: [
        panel: 'default' | 'build-bundle',
        options?: any,
    ],
    result: void,
}
```

用途：開啟構建面板。`panel` 指定開啟預設構建面板或 Bundle 構建面板。

#### `query-worker-ready`　【3.8.4 = 3.8.8】

```typescript
'query-worker-ready': {
    params: [],
    result: boolean,
}
```

用途：查詢構建 worker 進程是否已就緒。在發送構建任務前建議先確認此狀態。

### 1.2 Protected message（protected/message.d.ts）

#### `open-devtools`　【3.8.4 = 3.8.8】

```typescript
'open-devtools': {
    params: [],
    result: void,
}
```

用途：開啟構建進程的開發者工具（DevTools），用於除錯構建流程。

#### `generate-preview-setting`　【3.8.4 = 3.8.8】

```typescript
'generate-preview-setting': {
    params: [options: Optional<IBuildTaskOption>],
    result: IPreviewSettingsResult,
}
```

用途：依構建選項產生預覽用的 settings 資料（場景、腳本映射、bundle 設定）。

#### `query-tasks-info`　【3.8.8 簽名變更】

3.8.4：

```typescript
'query-tasks-info': {
    params: [options?: { type: 'build' | 'bundle' }],
    result: {
        list: IBuildTaskItemJSON[],
        queue: Record<string, IBuildTaskItemJSON>,
        free: boolean,
    },
}
```

3.8.8（params 新增 `sortType` 排序選項）：

```typescript
'query-tasks-info': {
    params: [options?: { type: 'build' | 'bundle', sortType?: ISortType }],
    result: {
        list: IBuildTaskItemJSON[],
        queue: Record<string, IBuildTaskItemJSON>,
        free: boolean,
    },
}
```

用途：查詢全部構建任務資訊（任務列表、排隊中的任務、worker 是否空閒）。3.8.8 可額外指定回傳列表的排序方式。

#### `query-task`　【3.8.4 = 3.8.8】

```typescript
'query-task': {
    params: [id: string],
    result: IBuildTaskItemJSON,
}
```

用途：依任務 id 查詢某個構建任務的資訊。

#### `preview-pac`　【3.8.4 = 3.8.8】

```typescript
'preview-pac': {
    params: [pacUuid: string, options?: Optional<IPackOptions>],
    result: PreviewPackResult | null,
}
```

用途：預覽自動圖集（.pac）的合圖結果。

#### `add-task`　【3.8.4 = 3.8.8】

```typescript
'add-task': {
    params: [options: Optional<IBuildTaskOption>, shouldWait?: boolean],
    result: TaskAddResult | BuildExitCode,
}
```

用途：新增一個構建任務。`shouldWait` 為 true 時等待構建結束並回傳 `BuildExitCode`，否則立即回傳 `TaskAddResult`。是以程式驅動構建的核心入口。

#### `preview-bundle-config`　【3.8.4 = 3.8.8】

```typescript
'preview-bundle-config': {
    params: [config: CustomBundleConfigItem],
    result: Record<string, { compressionType: BundleCompressionType, isRemote: boolean }>,
}
```

用途：預覽自訂 Bundle 設定在各平台的實際生效結果（壓縮類型、是否遠端包）。

#### `query-platform-config`　【3.8.4 = 3.8.8】

```typescript
'query-platform-config': {
    params: [],
    result: {
        order: Platform[];
        native: Platform[];
        config: Record<string, PlatformConfig>;
    },
}
```

用途：查詢目前已註冊的構建平台清單（顯示順序、原生平台清單、各平台設定）。

#### `execute-hook-task`　【僅 3.8.8】

```typescript
'execute-hook-task': {
    params: [
        pkgName: string,
        hook: string,
        options: IBuildTaskOption,
        ...args: any[],
    ],
    result: void,
}
```

用途：3.8.8 新增。在構建進程中執行指定外掛（`pkgName`）的構建 hook（如 `onAfterBuild` 等），可附帶額外參數。

### 1.3 builder 相關複合型別

```typescript
// public/options.d.ts —— 3.8.8 新增（query-tasks-info 的排序型別）
export type ISortType = 'taskName' | 'createTime' | 'platform' | 'buildTime';

// public/options.d.ts
export type ITaskState = 'waiting' | 'success' | 'failure' | 'cancel' | 'processing' | 'none';

export interface ITaskItemJSON {
    id: string;
    progress: number;
    state: ITaskState;
    // 當前任務的主資訊
    message: string;
    // 當前任務的詳細日誌資訊
    detailMessage?: string;
    time: string;
}

export interface IBuildTaskItemJSON extends ITaskItemJSON {
    stage: 'build' | string;
    options: IBuildTaskOption;
    dirty: boolean;
    rawOptions?: IBuildTaskOption;
    type: 'build',
}

export type BundleCompressionType = 'none' | 'merge_dep' | 'merge_all_json' | 'subpackage' | 'zip';

// protected/options.d.ts
export const enum TaskAddResult {
    BUSY,         // 0：worker 忙碌
    SUCCESS,      // 1：加入成功
    PARAM_ERROR,  // 2：參數錯誤
}

export const enum BuildExitCode {
    PARAM_ERROR = 32,
    BUILD_FAILED = 34,
    BUILD_SUCCESS = 36,
    BUILD_BUSY = 37,
    UNKNOWN_ERROR = 50,
}

// protected/options.d.ts —— 3.8.8 新增（execute-hook-task 對應的選項物件）
export interface ExecuteHookTaskOption {
    pkgName: string;
    hook: string;
    options: IBuildTaskOption;
    [x: string]: any;
}

// protected/build-result.d.ts
export interface IPreviewSettingsResult {
    settings: ISettings;                      // 完整的遊戲啟動 settings（見 builder/@types/public/build-result.d.ts）
    script2library: Record<string, string>;   // 腳本 uuid -> library 路徑映射
    bundleConfigs: IBundleConfig[];           // 各 bundle 的設定
}

// protected/bundle-config.d.ts
export interface CustomBundleConfigItem {
    preferredOptions?: {
        isRemote: boolean;
        compressionType: BundleCompressionType;
    },
    fallbackOptions?: {
        compressionType: BundleCompressionType;
        isRemote?: boolean;
    },
    // 平台覆蓋參數
    overwriteSettings?: Record<string, overwriteSettingItem>;
    // 設定模式，預設 auto 會自動依優先級計算結果，fallback 會使用 fallbackOptions
    configMode?: 'auto' | 'fallback' | 'overwrite';
}

// protected/texture-packer.d.ts
export interface IPackOptions {
    maxWidth: number;            // 合圖最大寬
    maxHeight: number;           // 合圖最大高
    padding: number;             // 圖片間距
    allowRotation: boolean;
    forceSquared: boolean;
    powerOfTwo: boolean;
    algorithm: string;
    format: string;
    quality: number;
    contourBleed: boolean;
    paddingBleed: boolean;
    filterUnused: boolean;
    removeTextureInBundle: boolean;
    removeImageInBundle: boolean;
    removeSpriteAtlasInBundle: boolean;
    compressSettings: Record<string, any>,
    bleed: number;
    mode: 'preview' | 'build';
}

export interface PreviewPackResult {
    atlasImagePaths: string[];
    unpackedImages: { imageUuid: string, libraryPath: string }[];
    dirty: boolean;
    storeInfo: PacStoreInfo;
    atlases: IAtlasInfo[];
}
```

> 注：`query-platform-config` result 中的 `PlatformConfig` 在兩版型別檔中皆未提供同名定義（疑為筆誤），最接近的定義為 `public/options.d.ts` 的 `IPlatformConfig`：
>
> ```typescript
> export interface IPlatformConfig {
>     texture: PlatformCompressConfig;
>     // TODO 後續廢棄，統一使用 platformType
>     type: IPlatformType;
>     platformType: StatsQuery.ConstantManager.PlatformType;
>     name: string;
>     createTemplateLabel: string;
> }
> ```

---

## 2. engine

引擎資訊與模組（功能裁剪）設定查詢。

### 2.1 公開 message（message.d.ts）

#### `query-info`　【3.8.4 = 3.8.8】

```typescript
'query-info': {
    params: [] | [
        string,
    ],
    result: {
        version: string;
        path: string;
        nativeVersion: string; // 原生引擎類型 'custom' | 'builtin'
        nativePath: string;
        editor: string;
    },
}
```

用途：查詢目前使用的引擎基本資訊（版本、路徑、原生引擎類型與路徑、編輯器版本）。可選的 string 參數用於指定查詢目標。

> 3.8.8 在檔案頂部額外 import 了 `ICroppingConfig`（供型別引用），但本 message 簽名不變。

#### `query-engine-info`　【3.8.4 = 3.8.8】

```typescript
'query-engine-info': {
    params: [] | [
        string,
    ],
    result: EngineInfo,
}
```

用途：查詢 TypeScript 引擎與原生引擎的完整資訊（內建 / 自訂路徑等）。

### 2.2 Protected message（protected/message.d.ts）

#### `query-modules-config`　【3.8.4 = 3.8.8】

```typescript
'query-modules-config': {
    params: [],
    result: IModuleConfig,
}
```

用途：查詢引擎功能模組（feature/module）的完整設定樹，包含模組分類、相依關係等。注意 `IModuleConfig` 本身在 3.8.8 有欄位擴充（見下方型別展開）。

#### `query-engine-modules-profile`　【僅 3.8.8】

```typescript
'query-engine-modules-profile': {
    params: [
        string?,
        StatsQuery.ConstantManager.ConstantOptions?,
    ],
    result: ICroppingConfig | null,
    // 官方 TODO 註解：希望「傳參時回傳 ICroppingConfig | null、
    // 不傳參時回傳 ICroppingConfig」，目前統一回傳 ICroppingConfig | null
}
```

用途：3.8.8 新增。查詢引擎模組裁剪設定檔（profile），包含模組勾選快取、flags、最終包含模組清單等。`StatsQuery` 型別來自 `@cocos/ccbuild`。

#### `filter-engine-modules`　【僅 3.8.8】

```typescript
'filter-engine-modules': {
    params: [
        string[],
        StatsQuery.ConstantManager.ConstantOptions,
    ],
    result: {
        includeModules: string[],
        moduleToFallBack: Record<string, string>
    },
}
```

用途：3.8.8 新增。依指定模組清單與常量選項過濾引擎模組，回傳實際包含的模組與需要 fallback 的模組映射（用於環境受限模組的降級）。

### 2.3 engine 相關複合型別

```typescript
// engine/@types/index.d.ts（兩版相同）
export interface EngineInfo {
    typescript: {
        type: 'builtin' | 'custom'; // 當前使用的引擎類型（內建或自訂）
        custom: string;             // 自訂引擎位址
        builtin: string,            // 內建引擎位址
        path: string;               // 當前使用的引擎路徑，為空也表示編譯失敗
    },
    native: {
        type: 'builtin' | 'custom';
        custom: string;
        builtin: string;
        path: string;
    },
}
```

#### `engine/@types/module.d.ts`（兩版差異較大，3.8.8 大幅擴充）

3.8.4：

```typescript
import { ModuleRenderConfig, IFeatureItem, BaseItem } from '@cocos/creator-types/engine/features';

export type IModuleItem = IFeatureItem | BaseItem;   // 3.8.4 在此自行定義

export type IModules = Record<string, IModuleItem>;

export interface IDisplayModuleItem extends IModuleItem {
    _value: boolean;
    _option?: string;
    options?: Record<string, IDisplayModuleItem>;
}

export interface IDisplayModuleCache {
    _value: boolean;
    _option?: string;
}

export interface CategoryDetail extends CategoryInfo {
    modules?: IModules;          // 3.8.4 為可選
}

export interface IModuleConfig {
    moduleTreeDump: {
        default: IModules;
        categories: Record<string, CategoryDetail>;
    },
    nativeCodeModules: string[];
    moduleDependMap: Record<string, string[]>;
    moduleDependedMap: Record<string, string[]>;
    features: IModules,
}
```

3.8.8（`IModuleItem` 改由 engine features 模組 re-export；新增 `IFlags`、`moduleCmakeConfig`、`ignoreModules`、`envLimitModule`、`IDefaultConfig`、`ICroppingConfig` 等）：

```typescript
import { ModuleRenderConfig, IFeatureItem, IFeatureGroup, BaseItem, IModuleItem, CategoryInfo } from '@cocos/creator-types/engine/features';
export { IFeatureItem, BaseItem, IFeatureGroup, IModuleItem } from '@cocos/creator-types/engine/features';

export type IModules = Record<string, IModuleItem>;

export interface IDisplayModuleItem extends IModuleItem {
    _value: boolean;
    _option?: string;
    options?: Record<string, IDisplayModuleItem>;
}

export type IFlags = Record<string, boolean | number>;   // 3.8.8 新增

export interface IDisplayModuleCache {
    _value: boolean;
    _option?: string;  // 保存下拉選項的值
    _flags?: IFlags;   // 3.8.8 新增：保存下拉選項的值的聯動開關
}

export interface CategoryDetail extends CategoryInfo {
    modules: IModules;           // 3.8.8 改為必填
}

export interface IModuleConfig {
    moduleTreeDump: {
        default: IModules;
        categories: Record<string, CategoryDetail>;
    },
    nativeCodeModules: string[];
    moduleCmakeConfig: Record<string, { native?: string; }>;   // 3.8.8 新增
    moduleDependMap: Record<string, string[]>;
    moduleDependedMap: Record<string, string[]>;
    features: IModules,
    ignoreModules: string[],                                   // 3.8.8 新增
    envLimitModule: Record<string, {                           // 3.8.8 新增
        envList: string[];
        fallback?: string;
    }>;
}

// 以下皆為 3.8.8 新增
export type IDefaultConfigKeys = 'defaultConfig' | 'default2d' | 'default3d' | 'defaultNative' | 'defaultSmallGames'

export type IDefaultConfig = {
    key: IDefaultConfigKeys;
    name: string;
    diyConfig: (cache: Record<string, IDisplayModuleCache>, flags: IFlags, includeModules: string[]) => void;
}

export type ICroppingConfigDeprecatedFeature = {
    value: boolean,
    version: string
};

export type ICroppingConfig = {
    name: string;
    cache: Record<string, IDisplayModuleCache>,
    flags: IFlags,
    includeModules: string[],
    noDeprecatedFeatures: ICroppingConfigDeprecatedFeature;
    moduleToFallBack?: Record<string, string>;
}
```

> 另注：3.8.4 的 `engine/@types/` 目錄下還有 `editor-extends/`、`engine-compiler/` 子目錄，3.8.8 已移除（非 message/public 型別，僅記錄目錄變動）。

---

## 3. extension

擴展（外掛）模板建立。

### 3.1 公開 message（message.d.ts）

#### `create-extension-template`　【3.8.4 = 3.8.8】（僅格式差異）

```typescript
'create-extension-template': {
    params: [ICreateTemplateParam, boolean];
    result: ICreateExtensionResponse;
};
```

用途：依模板建立一個擴展（外掛）專案。第二個 boolean 參數對應 `showInFolder` 類行為（建立後是否開啟目錄）。

### 3.2 公開型別（public.d.ts）

```typescript
/**
 * 外掛建構模組的描述
 */
export interface ExtensionCreator {
    load?(): void | Promise<void>;
    unload?(): void | Promise<void>;
    methods: {
        create(info: CreateInfo, packageJSON: any /*Editor.Interface.PackageJson*/): Promise<void> | void;
    };
}

export interface CreateInfo {
    /** 外掛名稱 */
    name: string;
    /** 外掛的目標目錄 */
    dist: string;
    /** 外掛作者 */
    author: string;
    /** 外掛相依的編輯器版本 */
    editorVersion: string;
    /** 當前選中的模板 */
    template: ExtensionInfo;
}

export type ExtensionInfo = {
    /** 模板的名稱 */
    name: string;
    /** 模板建立外掛的預設名稱 */
    defaultName?: string;
    /** 外掛處理後的完整路徑 */
    path: string;
    description?: string;
    /** 外掛的建立模組的相對路徑，需要在該模組中暴露 ExtensionCreator 型別的物件 */
    creator?: string;

    /* 是否從 npm cli 遷移過來的模板（3.8.8 新增） */
    isFromCLI?: boolean;        // 【僅 3.8.8】
    cliTemplateName?: string;   // 【僅 3.8.8】
};

export interface ICreateExtensionResponse {
    success: boolean;
    msg: string;
    stack: string;
}

export interface ICreateTemplateParam extends Partial<Omit<CreateInfo, 'template'>> {
    /** 模板類型，extension 或者 builder */
    type: string;
    /** 模板的 id */
    templateId: string;
    /** 是否在建立完成後開啟目標目錄 */
    showInFolder: boolean;
}
```

差異：3.8.8 在 `ExtensionInfo` 新增 `isFromCLI?: boolean` 與 `cliTemplateName?: string`（標記從 npm cli 遷移的模板）。其餘僅格式整理。

---

## 4. device

預覽用模擬裝置清單。

### 4.1 公開 message（message.d.ts）

#### `query`　【3.8.4 = 3.8.8】（僅格式差異：3.8.4 為 `'query'`，3.8.8 為 `query`）

```typescript
query: {
    params: [];
    result: IDeviceItem[];
};
```

用途：查詢所有可用的模擬裝置（解析度預設清單），預覽面板的裝置下拉選單即來自此資料。

### 4.2 公開型別（public.d.ts）　【3.8.4 = 3.8.8】

```typescript
export interface IDevices {
    deviceConfig: IDeviceItem[];           // 內建裝置
    custom: IDeviceItem[];                 // 使用者自訂裝置
    enableDevice: Record<string, boolean>; // 各裝置啟用狀態
}

export interface IDeviceItem {
    name: string;
    width: number;
    height: number;
    ratio: number;
}
```

---

## 5. preferences

編輯器偏好設定。

### 5.1 公開 message（message.d.ts）　全部【3.8.4 = 3.8.8】

#### `open-settings`

```typescript
'open-settings': {
    params: [
        string,
        ...any[],
    ],
    result: undefined,
}
```

用途：開啟偏好設定面板並跳轉到指定分頁（第一個參數為分頁 / 外掛名）。

#### `query-config`

```typescript
'query-config': {
    params: [
        string,             // 外掛名（pkgName）
        string?,            // 設定路徑（key path），可省略查整包
        PreferencesProtocol?, // 'default' | 'global' | 'local'
    ],
    result: any,
}
```

用途：查詢某外掛在偏好設定中的設定值，可指定讀取 default / global / local 哪一層協議。

#### `set-config`

```typescript
'set-config': {
    params: [
        string,             // 外掛名（pkgName）
        string,             // 設定路徑（key path）
        any,                // 要寫入的值
        PreferencesProtocol?,
    ],
    result: boolean,
}
```

用途：寫入某外掛的偏好設定值，回傳是否成功。

### 5.2 相關複合型別（index.d.ts，兩版相同）

```typescript
export type PreferencesProtocol = 'default' | 'global' | 'local';
```

---

## 6. information

編輯器內問卷 / 資訊彈窗系統（官方收集回饋用）。

### 6.1 公開 message（message.d.ts）　全部【3.8.4 = 3.8.8】

#### `query-information`

```typescript
'query-information': {
    params: [
        tag: string,
        options?: {
            force?: boolean,
        },
    ],
    result: IQueryInformation | null,
}
```

用途：查詢某功能（`tag`）的問卷資料；`force` 可強制重新拉取。

#### `open-information-dialog`

```typescript
'open-information-dialog': {
    params: [
        tag: string,
        dialogOptions?: { [key: string]: string }
    ],
    result: IDialogAction,
}
```

用途：開啟指定 `tag` 的問卷彈窗，回傳使用者的操作結果。

#### `has-dialog`

```typescript
'has-dialog': {
    params: [
        tag: string,
    ],
    result: boolean,
}
```

用途：查詢指定 `tag` 的彈窗是否存在（開啟中）。

#### `close-dialog`

```typescript
'close-dialog': {
    params: [
        tag: string,
    ],
    result: void,
}
```

用途：關閉指定 `tag` 的問卷彈窗。

### 6.2 公開型別（public.d.ts）　【3.8.4 = 3.8.8】

```typescript
export interface IContribution {
    tags?: string[];
}

// 某個功能的問卷資料
export interface IInformationItem {
    // 380 這個 id 是為了相容後端介面還沒給到 id，先用 tag 作為標識索引的
    id: string;
    label: string;
    enable: boolean;
    [id: string]: {
        complete: boolean;
        form: string;
    }
}

// 問卷彈窗操作結果
export interface IDialogAction {
    // reject 使用者拒絕填寫問卷、斷網且 10s 內關閉了彈窗
    // resolve 使用者正常填寫完資料、使用者不需要填寫
    // unusual 提交表單填寫異常
    action: 'reject' | 'resolve' | 'unusual',
}

// 查詢某個功能的問卷資料
export interface IQueryInformation {
    status: 'success' | 'cache' | 'network_failure' | 'network_exception';
    data?: IInformationItem;
}

// 所有功能問卷資料
export interface IInformationData {
    [tag: string]: IInformationItem
}
```

---

## 7. server

編輯器內建 HTTP 伺服器（預覽伺服器）資訊。

### 7.1 公開 message（message.d.ts）　全部【3.8.4 = 3.8.8】

#### `query-ip-list`

```typescript
'query-ip-list': {
    params: [],
    result: string[],
}
```

用途：查詢本機可用的 IP 位址清單（供區網預覽連線用）。

#### `query-port`

```typescript
'query-port': {
    params: [],
    result: number,
}
```

用途：查詢預覽伺服器目前使用的埠號。搭配 `query-ip-list` 可組出完整預覽 URL。

---

## 8. program

外部程式（如 IDE、瀏覽器等）的註冊與開啟。

### 8.1 公開 message（message.d.ts）　全部【3.8.4 = 3.8.8】

#### `query-program-info`

```typescript
'query-program-info': {
    params: [
        string,            // 程式名稱（註冊 key）
    ],
    result: IProgramInfo | null,
}
```

用途：查詢已註冊外部程式的資訊（路徑與命令列參數）。

#### `open-program`

```typescript
'open-program': {
    params: [
        string,                  // 程式名稱
        Record<string, any>?,    // 參數表（對應 IProgramConfig.arguments 的 key）
    ],
    result: Promise<boolean>,
}
```

用途：開啟已註冊的外部程式，回傳是否成功。

#### `open-url`

```typescript
'open-url': {
    params: [
        string,                  // URL
        Record<string, any>?,
    ],
    result: Promise<boolean>,
}
```

用途：以系統（或指定的）瀏覽器開啟 URL。

### 8.2 公開型別（public.d.ts）　【3.8.4 = 3.8.8】

```typescript
export interface IProgramInfo {
    // 應用程式所在路徑
    path: string;
    // 應用程式的命令列參數
    commandArgument?: string;
}

export interface IProgramConfig {
    // 應用程式名稱
    label: string;
    // 應用程式描述
    description?: string;
    // 應用程式的命令列參數選單的設定資料；參數的 key 是呼叫時傳遞參數的 key
    arguments?: Record<string, IProgramArgument>;
    // 應用程式所在路徑
    path: string;
    // 應用程式的命令列參數
    commandArgument?: string;
}

export interface IProgramArgument {
    // 參數的描述
    label?: string;
}
```

---

## 9. programming

腳本系統（編譯設定與外掛腳本）。

### 9.1 公開 message（message.d.ts）　全部【3.8.4 = 3.8.8】

#### `query-shared-settings`

```typescript
'query-shared-settings': {
    params: [],
    result: SharedSettings,
};
```

用途：查詢腳本編譯的共享設定（TS 編譯行為、import map 等），供構建 / 預覽等其他系統共用。

#### `query-sorted-plugins`

```typescript
'query-sorted-plugins': {
    params: [options?: FilterPluginOptions],
    result: IPluginScriptInfo[];
}
```

用途：查詢排序後的外掛腳本（plugin script）清單，可依載入環境（編輯器 / Web / 原生 / 小遊戲）過濾。

### 9.2 相關複合型別（protected.d.ts，兩版相同）

```typescript
import { PluginScriptInfo } from '@editor/lib-programming/dist/executor'

export interface SharedSettings {
    useDefineForClassFields: boolean;
    allowDeclareFields: boolean;
    loose: boolean;
    guessCommonJsExports: boolean;
    exportsConditions: string[];
    preserveSymlinks: boolean;
    importMap?: {
        json: {
            imports?: Record<string, string>;
            scopes?: Record<string, Record<string, string>>;
        };
        url: string;
    };
}

export interface IPluginScriptInfo extends PluginScriptInfo {
    url: string;
}

export interface FilterPluginOptions {
    loadPluginInEditor?: boolean;
    loadPluginInWeb?: boolean;
    loadPluginInNative?: boolean;
    loadPluginInMiniGame?: boolean;
}
```

---

## 10. project

專案設定。

### 10.1 公開 message（message.d.ts）　全部【3.8.4 = 3.8.8】

#### `open-settings`

```typescript
'open-settings': {
    params: [
        string,
        string,
        ...any[],
    ],
    result: undefined,
}
```

用途：開啟專案設定面板並跳轉到指定分頁 / 子分頁。

#### `query-config`

```typescript
'query-config': {
    params: [
        string,           // 外掛名（pkgName）
        string?,          // 設定路徑（key path）
        ProjectProtocol?, // 'default' | 'project'
    ],
    result: any,
}
```

用途：查詢專案設定中某外掛的設定值，可指定 default 或 project 層級。

> ⚠ **實測備註（2026-06-12，3.8.4）**：`query-config` / `set-config`（project 與 preferences 皆同）
> 只對「有註冊 profile contribution 的套件」有效；未註冊的 pkg 查詢回 `null`、寫入靜默無效
> （不報錯）。可用的官方 pkg 例：project、engine（專案設定）；device（偏好設定）。

#### `set-config`

```typescript
'set-config': {
    params: [
        string,   // 外掛名（pkgName）
        string,   // 設定路徑（key path）
        any,      // 要寫入的值
    ],
    result: boolean,
}
```

用途：寫入專案設定值（固定寫入 project 層級，與 preferences 的 `set-config` 不同，無 protocol 參數）。

### 10.2 相關複合型別（index.d.ts，兩版相同）

```typescript
export type ProjectProtocol = 'default' | 'project';
```

### 10.3 `project/@types/protected.d.ts`　【僅 3.8.4】（3.8.8 已移除整個檔案）

3.8.4 完整內容：

```typescript
// 渲染管線
export const enum builtinRenderPipelineKey {
    builtinForward = 'fd8ec536-a354-4a17-9c74-4f3883c378c8',
    builtinDeferred = '5d45ba66-829a-46d3-948e-2ed3fa7ee421',
}
```

說明：列出內建渲染管線（前向 / 延遲）資源的固定 uuid。3.8.8 已移除此檔案，若有程式相依此 enum，升級時需自行內聯這兩個 uuid 常量。

---

## 11. preview

遊戲預覽。僅有 protected message。

### 11.1 Protected message（protected/message.d.ts）　全部【3.8.4 = 3.8.8】

#### `query-preview-url`

```typescript
'query-preview-url': {
    params: [],
    result: string,
}
```

用途：查詢目前的預覽 URL（如 `http://<ip>:<port>`）。

#### `generate-settings`

```typescript
'generate-settings': {
    params: [],
    result: IPreviewSettingsResult,
}
```

用途：產生預覽所需的 settings 資料。`IPreviewSettingsResult` 來自 `builder/@types/protected`（完整展開見 [1.3](#13-builder-相關複合型別)）。

> 補充：`preview/@types/protected/index.d.ts`（兩版相同）還定義了 `IPreviewType = 'game-view' | 'simulator' | 'browser'`、`IRenderData`（預覽頁面渲染設定）、`IPreviewSceneOptions`（`scene?: string; immediately?: boolean; splashPreview?: boolean` 等）供預覽相關介面使用。

---

## 12. tester

編輯器自動化測試系統。無 message 定義，僅公開型別。

### 12.1 公開型別（public.d.ts）

```typescript
declare global {
    const Tester: Tester;
    const describe: (message: string, handle: Function) => void;
    const it: (message: string, handle: Function) => void;
    const before: (handle: Function) => void;
    const after: (handle: Function) => void;
}

export interface IPackageTestConfig {
    includes?: string[];
    excludes?: string[];
    wait?: Function;
}
```

#### `IAutoTestOptions`　【3.8.8 簽名變更】

3.8.4：

```typescript
export interface IAutoTestOptions {
    nativeConfig: {
        immediately: boolean;
    };
    useNative: boolean;
    outputReport: boolean;
    packages: string[];

    // -------- PR Test 附加傳遞內容 ----------
    // 變動的檔案路徑
    changes?: string[];
}
```

3.8.8（新增 `action` 與 `targetBranch` 兩個必填欄位）：

```typescript
export interface IAutoTestOptions {
    nativeConfig: {
        immediately: boolean;
    };
    useNative: boolean;
    outputReport: boolean;
    packages: string[];

    // -------- PR Test 附加傳遞內容 ----------
    action: 'pull_request' | 'issue_comment' | 'workflow_dispatch',  // 【僅 3.8.8】CI 觸發來源
    targetBranch: string                                             // 【僅 3.8.8】目標分支
    // 變動的檔案路徑
    changes?: string[];
}
```

用途：自動化測試（含 CI PR 測試）的啟動選項。

---

## 13. package-asset

擴展包資源（將外掛匯出 / 匯入為資源包）。無 message 定義，僅公開型別。

### 13.1 公開型別（public.d.ts）　【3.8.4 = 3.8.8】（僅 `meta?: any` 結尾分號格式差異）

```typescript
export interface MenuAssetInfo {
    // 資源名字
    name: string;
    // 資源用於顯示的名字
    displayName: string;
    // loader 載入的層級位址
    url: string;
    // 絕對路徑
    file: string;
    // 資源的唯一 ID
    uuid: string;
    // 使用的匯入器名字
    importer: string;
    // 類型
    type: string;
    // 是否是資料夾
    isDirectory: boolean;
    // 是否唯讀
    readonly: boolean;
    // 虛擬資源可以實例化成實體的話，會帶上這個副檔名
    instantiation?: string;
    // 跳轉指向資源
    redirect?: IRedirectInfo;
    // 繼承類型
    extends?: string[];
    // 是否匯入完成
    imported: boolean;
    // 是否匯入失敗
    invalid: boolean;
}

export interface IRedirectInfo {
    // 跳轉資源的類型
    type: string;
    // 跳轉資源的 uuid
    uuid: string;
}

export interface IAssetInfo {
    name: string;          // 資源名字
    displayName: string;   // 資源用於顯示的名字
    source: string;        // url 位址
    path: string;          // loader 載入的層級位址
    url: string;           // loader 載入位址會去掉副檔名，這個參數不去掉
    file: string;          // 絕對路徑
    uuid: string;          // 資源的唯一 ID
    importer: string;      // 使用的匯入器名字
    imported: boolean;     // 是否結束匯入過程
    invalid: boolean;      // 是否匯入成功
    type: string;          // 類型
    isDirectory: boolean;  // 是否是資料夾
    library: { [key: string]: string };       // 匯入資源的 map
    subAssets: { [key: string]: IAssetInfo }; // 子資源 map
    visible: boolean;      // 是否顯示
    readonly: boolean;     // 是否唯讀

    instantiation?: string;   // 虛擬資源可以實例化成實體的話，會帶上這個副檔名
    redirect?: IRedirectInfo; // 跳轉指向資源
    meta?: any;
    fatherInfo?: any;
}
```

---

## 14. reference-image

場景編輯器參考圖。無 message 定義，僅公開型別。

### 14.1 公開型別（public.d.ts）

#### `IImageData`　【3.8.8 簽名變更】

3.8.4：

```typescript
export interface IImageData {
    path: string;
    x: number;
    y: number;
    sx: number;
    sy: number;
    opacity: number;
}
```

3.8.8（新增 `missing` 欄位）：

```typescript
export interface IImageData {
    path: string;
    x: number;
    y: number;
    sx: number;
    sy: number;
    opacity: number;
    // 原圖是否丟失
    missing?: boolean;   // 【僅 3.8.8】
}
```

用途：單張參考圖的資料（路徑、位移、縮放、不透明度；3.8.8 額外標記原始圖檔是否遺失）。

#### `ISceneData`、`IReference`　【3.8.4 = 3.8.8】（僅格式差異）

```typescript
/**
 * 儲存場景使用圖片對應的資料
 */
export interface ISceneData {
    [sceneUUID: string]: {
        path: string;
    };
}

/**
 * 參考圖設定
 */
export interface IReference {
    images: IImageData[];
    sceneUUID: ISceneData;
    scene: string;
}
```

---

## 15. assets（資源面板）

資源管理面板（Assets Panel）的擴展型別。無 message 定義（資源操作 message 屬於 `asset-db`，由其他文件涵蓋）。

### 15.1 公開型別（public.d.ts）　【3.8.4 = 3.8.8】

```typescript
/**
 * 外部外掛註冊搜尋方式指定回傳的介面
 */
export interface SearchMenuItem {
    label: string;
    key: string;
    // handler 方法是外部擴展的搜尋方法，回傳 true 表示匹配搜尋成功
    // searchValue 表示 assets 面板輸入的搜尋內容，asset 表示匹配搜尋時的節點資訊
    handler: (searchVale: string, asset: any) => boolean | Promise<boolean>;
}

/**
 * 外部外掛註冊擴展的入口；可以是搜尋方式或限定搜尋類型
 */
export interface SearchExtension {
    searchMenu: Function; // 搜尋方式
}
```

### 15.2 Protected 型別（protected.d.ts）　【3.8.4 = 3.8.8】（僅格式差異）

```typescript
export interface DropCallbackInfo {
    uuid: string;        // 拖放到哪個資源 uuid 上
    type: string;        // 拖放位置上資源的類型
    isDirectory: boolean; // 拖放位置上資源是否是資料夾
    targetUrl: string;   // 拖放目標位置
}

export interface IDragAdditional {
    type: string;
    value: string;
    name?: string;       // 節點或資源名稱
    extends?: string[];
    subAssets?: { [key: string]: { type: string; value: string; name?: string } };
}
```

---

## 16. shortcuts

快捷鍵系統。無 message 定義。

### 16.1 `shortcuts/@types/shortcut.d.ts`　【僅 3.8.4】（3.8.8 已移除整個檔案）

3.8.4 完整內容：

```typescript
export interface ShortcutItem {
    when: string;
    message: string;
    shortcut: string;
    pkgName: string;
    params?: Array<string | number | boolean>;
    rawShortcut?: string;
    key: string;
    missing?: boolean;
}

export type IShortcutItemMap = Record<string, ShortcutItem>;

export interface IShortcutEditInfo {
    key: string;
    shortcut: string;
    searches: ShortcutItem[];
    conflict: boolean;
    when: string;
}
```

說明：3.8.4 同時存在 `shortcut.d.ts`（舊版 `ShortcutItem`）與 `protected.d.ts`（新版 `IShortcutItem`，欄位相同但附完整中英文註解）。3.8.8 移除了 `shortcut.d.ts`，僅保留 `protected.d.ts`；其中 `IShortcutEditInfo`（快捷鍵編輯面板用的型別）在 3.8.8 已無對應定義。遷移對應：`ShortcutItem` → `IShortcutItem`。

### 16.2 Protected 型別（protected.d.ts）　【3.8.4 = 3.8.8】

```typescript
/**
 * Shortcut information 快捷鍵資訊
 */
export interface IShortcutItem {
    /** 當滿足該條件時，快捷鍵允許被觸發 @example PanelName === 'xxx' */
    when: string;
    /** 快捷鍵觸發後發送的訊息 */
    message: string;
    /** 觸發快捷鍵的組合鍵或命令 */
    shortcut: string;
    /** 定義快捷方式的外掛 */
    pkgName: string;
    /** 傳遞給快捷鍵觸發訊息的可選參數 */
    params?: Array<string | number | boolean>;
    /** 最初定義觸發快捷鍵的組合鍵或命令 */
    rawShortcut?: string;
    /** 快捷鍵的唯一標識 */
    key: string;
    /** 快捷鍵是否丟失 */
    missing?: boolean;
}

/**
 * 儲存快捷鍵的字典
 */
export type IShortcutItemMap = Record<string, IShortcutItem>;
```

---

## 17. console（僅 3.8.4）

控制台（Console）面板。整個 package 目錄【僅 3.8.4】，3.8.8 已從 creator-types 中移除。其唯一型別檔為 `console/@types/pritate.d.ts`（官方檔名即拼錯的 "pritate"，應為 private），無 message 定義。

3.8.4 完整內容：

```typescript
export type logType = 'log' | 'warn' | 'error' | 'info';

export interface IMessageItem {
    rows: number;        // 內部有幾行，包括 details & stacks
    translateY: number;
    show: boolean;
    title: string;
    content: string[];   // details
    count: number;       // 重複的個數
    fold: boolean;       // 折疊
    type: logType;
    message: any;
    texture: string;     // 紋理 light or dark
    date?: number;       // 格式化的時間
    time?: number;       // 時間戳
    process?: string;
    stack: string[];
}

export interface INewItem {
    type: logType
    [propName: string]: any
}

export type ILogCounter = Record<logType, number>;

export type IConsoleExtension = {
    name: string,
    key: string,
    label: string,
    value?: boolean,
    show: boolean
}
```

說明：描述 Console 面板單條日誌的內部結構與日誌計數器。皆為面板內部（private）型別，3.8.8 不再對外提供。

---

## 18. packages 目錄層級差異

兩版 `editor/packages/` 目錄比對結果（與 message/public 型別無直接關聯的平台建置包，僅簡述）：

### 18.1 僅 3.8.4 存在（3.8.8 已移除）

| Package | 內容 | 說明 |
| --- | --- | --- |
| `console` | `@types/pritate.d.ts` | Console 面板內部型別（見[第 17 章](#17-console僅-384)） |
| `openharmony` | `@types/index.d.ts` | OpenHarmony（開源鴻蒙）平台構建選項（`ITaskOption extends INativeTaskOption`，含 `packageName`、`apiLevel`、`sdkPath`、`ndkPath`、`appABIs: ('armeabi-v7a' | 'arm64-v8a')[]` 等）。3.8.8 由 `harmonyos-next` 取代定位 |
| `taobao-creative-app` | `@types/index.d.ts` | 淘寶創意互動（Taobao Creative App）平台構建選項（`packages['taobao-creative-app'].globalVariable: string`）。3.8.8 移除此平台 |

### 18.2 僅 3.8.8 存在（新增）

| Package | 內容 | 說明 |
| --- | --- | --- |
| `google-play` | `@types/index.d.ts` | Google Play（Play Asset Delivery / PGS 向）原生 Android 構建平台。`ITaskOption extends INativeTaskOption`，`IOptions` 含 `packageName`、`resizeableActivity`、`maxAspectRatio`、orientation、`IAppABI = 'armeabi-v7a' | 'arm64-v8a' | 'x86' | 'x86_64'` 等 |
| `harmonyos-next` | `@types/index.d.ts` | HarmonyOS NEXT（純血鴻蒙）原生構建平台。`IOptions` 含 `packageName`、orientation、`IAppABI = 'armeabi-v7a' | 'arm64-v8a'`、`IJsEngine = 'JSVM' | 'V8' | 'ARK'` 等 |
| `honor-mini-game` | `@types/index.d.ts` | 榮耀（Honor）小遊戲構建平台。`IOptions` 含 `package`、`icon`、`versionName`、`versionCode`、`minPlatformVersion`、`deviceOrientation`、憑證（`privatePemPath` / `certificatePemPath`）、`separateEngine`、`subpackages`、`wasmSubpackage` 等 |
| `migu-mini-game` | `@types/index.d.ts` | 咪咕（Migu）小遊戲構建平台。`IOptions` 與 honor 類似，另含 `appid`、`appkey` |

---

## 19. 版本差異總表

### 19.1 Message 差異

| Package | 範圍 | Message / 項目 | 差異類型 | 摘要 |
| --- | --- | --- | --- | --- |
| builder | protected | `query-tasks-info` | 【3.8.8 簽名變更】 | params 的 options 新增 `sortType?: ISortType` |
| builder | protected | `execute-hook-task` | 【僅 3.8.8】 | 新增：在構建進程執行指定外掛的構建 hook |
| engine | protected | `query-engine-modules-profile` | 【僅 3.8.8】 | 新增：查詢模組裁剪 profile（`ICroppingConfig`） |
| engine | protected | `filter-engine-modules` | 【僅 3.8.8】 | 新增：過濾引擎模組並回傳 fallback 映射 |

其餘所有 message（builder 公開 2 條、builder protected 既有 7 條、engine 公開 2 條、engine protected `query-modules-config`、extension 1 條、device 1 條、preferences 3 條、information 4 條、server 2 條、program 3 條、programming 2 條、project 3 條、preview protected 2 條）兩版簽名完全一致【3.8.4 = 3.8.8】。

### 19.2 公開 / Protected 型別差異

| Package | 檔案 | 型別 / 項目 | 差異類型 | 摘要 |
| --- | --- | --- | --- | --- |
| builder | public/options.d.ts | `ISortType` | 【僅 3.8.8】 | `'taskName' \| 'createTime' \| 'platform' \| 'buildTime'` |
| builder | protected/options.d.ts | `ExecuteHookTaskOption` | 【僅 3.8.8】 | `execute-hook-task` 對應的選項物件 |
| engine | module.d.ts | `IModuleItem` | 【3.8.8 簽名變更】 | 3.8.4 在本檔定義 `IFeatureItem \| BaseItem`；3.8.8 改由 `@cocos/creator-types/engine/features` re-export |
| engine | module.d.ts | `IFlags` | 【僅 3.8.8】 | `Record<string, boolean \| number>` |
| engine | module.d.ts | `IDisplayModuleCache._flags` | 【僅 3.8.8】 | 下拉選項聯動開關快取 |
| engine | module.d.ts | `CategoryDetail.modules` | 【3.8.8 簽名變更】 | 由可選（`modules?`）改為必填 |
| engine | module.d.ts | `IModuleConfig` | 【3.8.8 簽名變更】 | 新增 `moduleCmakeConfig`、`ignoreModules`、`envLimitModule` 三欄位 |
| engine | module.d.ts | `IDefaultConfigKeys` / `IDefaultConfig` | 【僅 3.8.8】 | 模組預設配置（2d/3d/native/小遊戲） |
| engine | module.d.ts | `ICroppingConfig` / `ICroppingConfigDeprecatedFeature` | 【僅 3.8.8】 | 模組裁剪 profile 型別 |
| engine | @types 目錄 | `editor-extends/`、`engine-compiler/` | 【僅 3.8.4】 | 3.8.8 移除這兩個子目錄 |
| extension | public.d.ts | `ExtensionInfo.isFromCLI` / `cliTemplateName` | 【僅 3.8.8】 | 標記從 npm cli 遷移的模板 |
| tester | public.d.ts | `IAutoTestOptions.action` / `targetBranch` | 【僅 3.8.8】 | PR Test 新增 CI 觸發來源與目標分支欄位 |
| reference-image | public.d.ts | `IImageData.missing` | 【僅 3.8.8】 | 標記原圖是否丟失 |
| project | protected.d.ts | `builtinRenderPipelineKey` | 【僅 3.8.4】 | 整檔移除（內建渲染管線 uuid 常量） |
| shortcuts | shortcut.d.ts | `ShortcutItem` / `IShortcutItemMap` / `IShortcutEditInfo` | 【僅 3.8.4】 | 整檔移除；`IShortcutItem`（protected.d.ts）兩版保留 |
| console | @types/pritate.d.ts | `logType` / `IMessageItem` / `INewItem` / `ILogCounter` / `IConsoleExtension` | 【僅 3.8.4】 | 整個 console package 自 3.8.8 移除 |

### 19.3 Packages 目錄層級差異

| 差異 | Packages |
| --- | --- |
| 【僅 3.8.4】 | `console`、`openharmony`、`taobao-creative-app` |
| 【僅 3.8.8】 | `google-play`、`harmonyos-next`、`honor-mini-game`、`migu-mini-game`（皆為平台建置相關） |

### 19.4 純格式差異（不影響使用，僅供 diff 對照時排除干擾）

- `extension/@types/message.d.ts`：params/result 改寫為單行 + 分號風格（11 行 → 8 行）。
- `device/@types/message.d.ts`：message 名 `'query'` 引號移除、逗號改分號；`device/@types/public.d.ts` 檔尾換行。
- `package-asset/@types/public.d.ts`：`meta?: any,` → `meta?: any;`。
- `assets/@types/protected.d.ts`：`subAssets` 內聯型別逗號改分號。
- `reference-image/@types/public.d.ts`：`ISceneData` 分號格式整理。
