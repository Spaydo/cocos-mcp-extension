# Editor Framework API 參考（Editor namespace）

> **來源檔案**（Cocos Creator 官方型別定義 `creator-types/editor/`）：
>
> - `editor.d.ts`（核心 `Editor` namespace，約 1268 行）
> - `message.d.ts`（全域 `EditorMessageMaps` 定義）
> - `utils.d.ts` 與 `utils/index.d.ts`（`Editor.Utils` 實際定義）
> - `extension.d.ts`（`Editor.Interface` 套件/面板介面）
> - `protected.d.ts`（protected / 內部 API，重點摘錄）
>
> **版本說明**：以上檔案內容在 **3.8.4 與 3.8.8 完全相同**。唯一例外是 `protected.d.ts` 有兩處微小差異：
>
> 1. 3.8.8 在 `Editor.UI.__protected__` 中新增 `Message: any; message: any; toast: any;` 三個欄位（見 [Editor.UI](#editorui) 章節標註）。
> 2. 3.8.8 在 `Editor.Windows.IWindowOptions.webPreferences` 中新增 `nodeIntegrationInWorker?: boolean;` 選項（見 [Editor.Windows](#editorwindows) 章節標註）。
>
> 本文件目的：讓 MCP 擴展開發時**不必再回頭翻 d.ts** 即可直接使用所有公開 API。說明文字為繁體中文，API 名稱、型別、程式碼保持英文。

---

## 目錄

- [檔案結構總覽](#檔案結構總覽)
- [Editor.App](#editorapp)
- [Editor.Clipboard](#editorclipboard)
- [Editor.Dialog](#editordialog)
- [Editor.EditMode](#editoreditmode)
- [Editor.I18n](#editori18n)
- [Editor.Layout](#editorlayout)
- [Editor.Logger](#editorlogger)
- [Editor.Menu](#editormenu)
- [Editor.Message](#editormessage)（MCP 核心）
- [Editor.Network](#editornetwork)
- [Editor.Package](#editorpackage)
- [Editor.Panel](#editorpanel)
- [Editor.Profile](#editorprofile)
- [Editor.Project](#editorproject)
- [Editor.Selection](#editorselection)
- [Editor.Task](#editortask)
- [Editor.Theme](#editortheme)
- [Editor.UI](#editorui)
- [Editor.User](#editoruser)
- [Editor.Utils](#editorutils)
- [Editor.Module](#editormodule)
- [Editor.Windows](#editorwindows)
- [Protected 專屬 namespace：Editor.Startup / Editor.Metrics](#protected-專屬-namespaceeditorstartup--editormetrics)
- [Editor.Interface（extension.d.ts）](#editorinterfaceextensiondts)
- [對 MCP 擴展開發特別重要的 API](#對-mcp-擴展開發特別重要的-api)

---

## 檔案結構總覽

| 檔案 | 內容 |
| --- | --- |
| `editor.d.ts` | `declare global { namespace Editor { ... } }`，定義所有公開子模組。注意：檔案內的 `Editor.Utils` 子 namespace（File/Path/Math/Parse/Url/UUID/Process）**全部被註解掉**，實際定義在 `utils/index.d.ts`。 |
| `message.d.ts` | 全域 `EditorMessageContent`、`EditorMessageMap`、`EditorMessageMaps` 介面，並 import 13 個官方 package 的 message 型別。 |
| `utils.d.ts` | 橋接檔：`export const Utils = UtilsType`（從 `utils/index.d.ts` 匯入 `Utils` namespace 掛到 `Editor.Utils`）。 |
| `utils/index.d.ts` | `Utils` namespace 實際內容：File、Path、Math、Parse、Url、UUID、Process。 |
| `extension.d.ts` | `Editor.Interface`：`PackageInfo`、`PackageJson`、`PanelInfo`、`UIKit`。 |
| `protected.d.ts` | 各模組的 `__protected__` 內部 API、Dialog 的多載覆寫、以及 protected 專屬的 `Startup`、`Metrics`、`Windows.__protected__` 等。 |

通用型別（`editor.d.ts` 頂部）：

```typescript
type BaseType = string | number | boolean | undefined | null;
```

---

## Editor.App

編輯器應用程式本身的資訊與控制。

### 常數

| API | 型別 | 說明 |
| --- | --- | --- |
| `Editor.App.userAgent` | `string` | 編輯器的 user agent 字串。 |
| `Editor.App.dev` | `boolean` | 是否處於開發模式。 |
| `Editor.App.isPackaged` | `boolean` | 是否為打包後的編輯器。 |
| `Editor.App.args` | `{ [key: string]: string \| number }` | 編輯器啟動參數。 |
| `Editor.App.version` | `string` | 編輯器版本號（例如 `"3.8.4"`）。 |
| `Editor.App.name` | `string` | 編輯器套件名稱。 |
| `Editor.App.home` | `string` | 編輯器主目錄（使用者設定資料夾）。 |
| `Editor.App.path` | `string` | 編輯器程式檔案夾路徑。 |
| `Editor.App.temp` | `string` | 當前編輯器的暫存快取目錄。 |
| `Editor.App.icon` | `string` | 當前編輯器 icon 的路徑。 |
| `Editor.App.urls` | `{ manual: string; api: string; forum: string; }` | 編輯器使用的官方文件 / API / 論壇網址。 |

### 函式

```typescript
export function quit(): void;
```
結束編輯器程式。**（MCP 慎用，會直接關閉編輯器。）**

---

## Editor.Clipboard

系統剪貼簿存取。

```typescript
export type ICopyType = 'image' | 'text' | 'files' | string;
```

```typescript
export function read(type: ICopyType): string | number | { [key: string]: string | number | boolean | null };
```
讀取剪貼簿內容（依類型）。

```typescript
export function write(type: 'image', value: string): boolean;
export function write(type: 'text', value: string): boolean;
export function write(type: 'files', value: FileList): boolean;
export function write(type: string, value: any): boolean;
```
寫入剪貼簿內容（多載：image / text / files / 自訂類型）。

```typescript
export function has(type: ICopyType): boolean;
```
判斷剪貼簿目前是否包含指定類型的內容。

```typescript
export function clear(): void;
```
清空剪貼簿。

---

## Editor.Dialog

原生對話框（基於 Electron dialog）。回傳型別 `OpenDialogReturnValue`、`SaveDialogReturnValue`、`MessageBoxReturnValue`、`FileFilter` 皆來自 `electron`。

### 介面

```typescript
export interface SaveDialogOptions {
    title?: string;
    path?: string;
    button?: string;
    filters?: FileFilter[];
}
export interface SelectDialogOptions {
    title?: string;
    path?: string;
    type?: 'directory' | 'file';
    button?: string;
    multi?: boolean;
    filters?: FileFilter[];
    extensions?: string;
}
export interface MessageDialogOptions {
    title?: string;
    detail?: string;
    default?: number;      // 預設按鈕的 index
    cancel?: number;       // 取消按鈕的 index
    checkboxLabel?: string;
    checkboxChecked?: boolean;
    buttons?: string[];
}
```

### 函式

```typescript
export function select(options?: SelectDialogOptions): Promise<OpenDialogReturnValue>;
```
開啟「選擇檔案 / 資料夾」對話框。

```typescript
export function save(options?: SaveDialogOptions): Promise<SaveDialogReturnValue>;
```
開啟「儲存檔案」對話框。

```typescript
export function info(message: string, options?: MessageDialogOptions): Promise<MessageBoxReturnValue>;
```
顯示資訊對話框。

```typescript
export function warn(message: string, options?: MessageDialogOptions): Promise<MessageBoxReturnValue>;
```
顯示警告對話框。

```typescript
export function error(message: string, options?: MessageDialogOptions): Promise<MessageBoxReturnValue>;
```
顯示錯誤對話框。

### Protected（protected.d.ts）

protected 版本覆寫了上述五個函式，**每個都多了最後一個參數 `window?: BrowserWindow`**，可指定對話框附掛在哪個視窗上：

```typescript
export function select(options?: SelectDialogOptions, window?: BrowserWindow): Promise<OpenDialogReturnValue>;
export function save(options?: SaveDialogOptions, window?: BrowserWindow): Promise<SaveDialogReturnValue>;
export function info(message: string, options?: MessageDialogOptions, window?: BrowserWindow): Promise<MessageBoxReturnValue>;
export function warn(message: string, options?: MessageDialogOptions, window?: BrowserWindow): Promise<MessageBoxReturnValue>;
export function error(message: string, options?: MessageDialogOptions, window?: BrowserWindow): Promise<MessageBoxReturnValue>;
```

```typescript
export type DialogMode = 'normal' | 'command';
export const __protected__: {
    getMode(): DialogMode;          // 取得目前對話框模式
    setMode(mode: DialogMode): void; // 設定對話框模式（command 模式下對話框行為可被程式接管，對自動化測試有用）
}
```

---

## Editor.EditMode

編輯器編輯模式標記（例如動畫編輯模式 `animation`）。

```typescript
export function enter(mode: string);
```
標記編輯器進入某種編輯模式（注意：原始定義未標註回傳型別，隱含 `any`）。

```typescript
export function getMode(): string;
```
取得當前所處的編輯模式。

Protected：`__protected__` 為空物件（無內部 API）。

---

## Editor.I18n

多語言翻譯。

```typescript
export type I18nMap = {
    [key: string]: string | number;
};
```

```typescript
export function getLanguage(): string;
```
取得當前語言（`zh` | `en`）。

```typescript
export function t(key: string, obj?: I18nMap): string;
```
依 key 翻譯成當前語言。翻譯字串中允許 `{a}` 變數，由第二個參數 `obj` 提供替換值。

```typescript
export function select(language: string): void;
```
切換編輯器使用的語言。

### Protected（protected.d.ts）

```typescript
export type I18nRegisterMap = {
    [key: string]: I18nRegisterMap | string;
};
export const __protected__: {
    /** 動態註冊 i18n 資料 */
    register(language: string, key: string, map: I18nRegisterMap): void;
    /** 匯出某語言的全部翻譯資料 */
    exportLanguageData(language?: string): I18nRegisterMap;
    /** 查詢當前可用的語言列表 */
    getLanguageList(): string[];
}
```

---

## Editor.Layout

編輯器面板佈局。

### 介面

```typescript
interface ILayoutItem {
    'min-width': number;
    'min-height': number;
    direction: 'row' | 'column' | 'none';
    percent: number;
    minimize: boolean;
    children?: ILayoutItem[];
    active?: string;
    panels?: string[];
}

export interface ILayout {
    version: 1;
    layout: ILayoutItem;
}
```

### 函式

```typescript
export function apply(json: ILayout);
```
套用一份佈局設定（注意：原始定義未標註回傳型別）。

```typescript
export function query(name?: string): Promise<ILayout>;
```
查詢當前佈局資訊，回傳佈局 JSON 物件。

### Protected（protected.d.ts）

```typescript
export interface CacheLayoutInfo {
    builtin: Record<string, any>;
    custom: Record<string, any>;
    version: string;
}
export const __protected__: {
    init(layout: Editor.Layout.ILayout): void;                       // 初始化佈局系統
    add(name: string, layout?: Editor.Layout.ILayout): void;         // 新增一份具名佈局
    remove(name: string): void;                                      // 刪除具名佈局
    query(name?: string): Promise<Editor.Layout.ILayout>;            // 查詢佈局
    queryList(): Promise<CacheLayoutInfo>;                           // 查詢所有（內建+自訂）佈局清單
    on(action: string, handle: (...args: any[]) => void): EventEmitter;
    once(action: string, handle: (...args: any[]) => void): EventEmitter;
    emit(action: string): boolean;
    removeListener(action: string, handle: (...args: any[]) => void): EventEmitter;
};
```

---

## Editor.Logger

編輯器日誌（Console 面板背後的資料來源）。

### 介面

```typescript
interface ILogInfo {
    process?: 'browser' | 'renderer';
    type: 'log' | 'info' | 'warn' | 'error';
    message: string;
    stack: string;
    time: number;
}
```

### 函式

```typescript
export function clear(regexp?: RegExp): void;
```
清空所有日誌（可傳正規表達式過濾）。

```typescript
export function query(): ILogInfo[];
```
查詢所有日誌。**MCP 可用此 API 取得編輯器 Console 的完整輸出（含 stack 與時間戳）。**

### Protected（protected.d.ts）

```typescript
export const __protected__: {
    record(str: string): void;   // 寫入一條紀錄
    on(action: string, handle: (...args: any[]) => void): EventEmitter;     // 監聽 Logger 事件（謹慎使用，之後會被移除）
    once(action: string, handle: (...args: any[]) => void): EventEmitter;
    emit(action: string, ...args: any[]): boolean;
    removeListener(action: string, handle: (...args: any[]) => void): EventEmitter;
};
```

---

## Editor.Menu

選單系統。

### 介面

```typescript
export interface BaseMenuItem {
    type?: 'normal' | 'separator' | 'submenu' | 'checkbox' | 'radio'; // 選單類型
    label?: string;          // 選單項名稱
    sublabel?: string;       // 附加說明
    visible?: boolean;       // 是否顯示
    checked?: boolean;       // checkbox/radio 是否勾選
    enabled?: boolean;       // false 時置灰且不可點擊
    icon?: string;           // 圖示的絕對路徑
    accelerator?: string;    // 顯示用快捷鍵（僅顯示）
    order?: number;          // 排序，數字越小越靠前
    group?: string;          // 所屬分組
    message?: string | Message.MessageInfo; // 點擊後發送的訊息
    target?: string;         // 訊息發送到哪個插件
    params?: (string | number | boolean | { [key: string]: string | number | boolean })[]; // 訊息參數
    click?: Function | null; // 點擊事件，定義後 message 失效
    role?: MenuItemConstructorOptions['role']; // Electron 內建行為，定義 click 後此屬性被忽略
    submenu?: MenuTemplateItem[]; // 子選單
}
export interface MainMenuItem extends BaseMenuItem {
    path: string;            // 主選單路徑
}
export interface ContextMenuItem extends BaseMenuItem {
    accelerator?: string;
    message?: Message.MessageInfo; // 與 click 二選一，同時存在只響應 click
    submenu?: ContextMenuItem[];
}
export type MenuTemplateItem = BaseMenuItem;
export interface PopupOptions {
    x?: number;
    y?: number;
    menu: ContextMenuItem[];
}
```

### 函式

```typescript
export function popup(json: PopupOptions): void;
```
彈出右鍵選單。**只有面板（panel）進程可以使用。**

### Protected（protected.d.ts）— 對 UI 自動化非常有用

```typescript
export const __protected__: {
    add(path: string, options: BaseMenuItem): void;      // 新增選單（只有主進程可用）
    remove(path: string, options: BaseMenuItem): void;   // 刪除選單（只有主進程可用）
    apply(): void;                                       // 套用之前的選單修改（只有主進程可用）
    addGroup(path: string, name: string, order?: number): void;  // 新增分組
    removeGroup(path: string, name: string): void;               // 刪除分組
    queryPopup(): Promise<ContextMenuItem[]>;            // 查詢當前彈出的右鍵選單模板
    clickPopup(searcher: string): Promise<void>;         // 以選擇器點擊當前右鍵選單項（自動化操作）
    queryMain(): Promise<{ [key: string]: MainMenuItem }>; // 查詢主選單模板
    clickMain(searcher: string): Promise<void>;          // 以選擇器點擊主選單項（自動化操作）
    disconnectMainMenu(): void;
    connectMainMenu(): void;
}
```

---

## Editor.Message（MCP 核心）

編輯器的 IPC 訊息系統。**這是 MCP 擴展控制編輯器的最核心 API**：場景操作、資源操作、建置、預覽等，全部透過 `Editor.Message.request/send` 呼叫各官方 package 的訊息完成。

### 介面

```typescript
export interface MessageConfig {
    methods: string[];        // 訊息觸發時呼叫的方法名
    public?: boolean;         // 是否公開（顯示在 message 列表）
    description?: string;     // 說明
    doc?: string;             // 文件
    sync?: boolean;           // 是否同步
}

export interface MessageInfo {
    target: string;           // 目標插件
    name: string;             // 訊息名
    type?: 'send' | 'request';
    params?: (string | number | boolean | object)[];
}

export interface TableBase {
    [x: string]: any;
    params: (string | number | boolean | { [key: string]: string | number | boolean })[];
}
```

### 函式

```typescript
export function request<J extends string, K extends keyof EditorMessageMaps[J]>(
    name: J,
    message: K,
    ...args: EditorMessageMaps[J][K]['params']
): Promise<EditorMessageMaps[J][K]['result']>;
```
發送一個訊息給目標插件並**等待回傳**。`name` 為目標插件名（如 `'scene'`、`'asset-db'`），`message` 為訊息名，`args` 為訊息參數。參數與回傳型別由全域 `EditorMessageMaps` 推導，對 13 個官方 package 有完整型別提示。

```typescript
export function send<M extends string, N extends keyof EditorMessageMaps[M]>(
    name: M,
    message: N,
    ...args: EditorMessageMaps[M][N]['params']
): void;
```
發送一個訊息給目標插件，**不等待回傳**（fire-and-forget）。

```typescript
export function broadcast(
    message: string,
    ...args: (string | number | boolean | undefined | null | { [key: string]: any } | (string | number | boolean)[])[]
): void;
```
廣播一個訊息給所有監聽該訊息的插件。慣例上訊息名格式為 `'packageName:eventName'`（例如官方的 `'scene:ready'`、`'asset-db:asset-change'`）。

### EditorMessageMaps 結構（message.d.ts）

`message.d.ts` 在 `declare global` 中定義以下三個介面：

```typescript
interface EditorMessageContent {
    params: any[];   // 訊息參數元組
    result: any;     // 訊息回傳值
}

interface EditorMessageMap {
    [x: string]: EditorMessageContent;   // 訊息名 -> 內容
}

interface EditorMessageMaps {
    [x: string]: EditorMessageMap;       // 插件名 -> 訊息表（自訂插件 fallback 為 any）
    'asset-db': AssetDb.message;
    'builder': Builder.message;
    'engine': Engine.message;
    'information': Information.message;
    'preferences': Preferences.message;
    'preview': Preview.message;
    'program': Program.message;
    'programming': Programming.message;
    'project': Project.message;
    'scene': Scene.message;
    'server': Server.message;
    'device': Device.message;
    'extension': Extension.message;
}
```

因為有 index signature `[x: string]: EditorMessageMap`，**對任何未列出的插件（包含你自己的 MCP 擴展）呼叫 request/send 也是合法的**，只是參數與回傳值為 `any`。

### 官方有型別定義的 13 個 package

| Package 名 | 型別來源（相對 `creator-types/editor/`） | 備註 |
| --- | --- | --- |
| `asset-db` | `packages/asset-db/@types/protected/message` | 資源資料庫（protected 型別） |
| `builder` | `packages/builder/@types/protected/message` | 建置系統（protected 型別） |
| `engine` | `packages/engine/@types/protected/message` | 引擎管理（protected 型別） |
| `information` | `packages/information/@types/message` | 資訊面板 |
| `preferences` | `packages/preferences/@types/message` | 偏好設定 |
| `preview` | `packages/preview/@types/protected/message` | 預覽（protected 型別） |
| `program` | `packages/program/@types/message` | 外部程式 |
| `programming` | `packages/programming/@types/message` | 程式編譯 |
| `project` | `packages/project/@types/message` | 專案設定 |
| `scene` | `packages/scene/@types/message` | 場景編輯（節點/組件操作核心） |
| `server` | `packages/server/@types/message` | 內建伺服器 |
| `device` | `packages/device/@types/message` | 裝置模擬 |
| `extension` | `packages/extension/@types/message` | 擴展管理 |

（各 package 的具體訊息清單見後續分冊文件。）

### Protected（protected.d.ts）

```typescript
export interface MessageRegisterInfo {
    [message: string]: MessageConfig;
}
export const __protected__: {
    __register__(name: string, messageInfo: MessageRegisterInfo): void; // 動態註冊插件訊息
    __unregister__(name: string): void;                                 // 反註冊
    __eb__: EventEmitter;                                               // 內部 event bus
    /**
     * 新增一個廣播訊息監聽器（不用時需主動移除）
     * MCP 擴展可在主進程用它監聽如 'scene:ready'、'asset-db:asset-change' 等廣播
     */
    addBroadcastListener(message: string, func: Function): void;
    /** 移除廣播訊息監聽器 */
    removeBroadcastListener(message: string, func: Function): void;
}
```

> 注意：在擴展的 `package.json` `contributions.messages` 中宣告的訊息，也能以 `Editor.Message.__protected__.addBroadcastListener` 之外的標準方式（contributions 內 message 對應 methods）接收廣播；`addBroadcastListener` 適合動態、程式化的監聽需求。

---

## Editor.Network

網路工具。

```typescript
export type RequestData = string | number | {
    [index: string]: string | number | (string | number)[];
};
```

```typescript
export function queryIPList(): string[];
```
查詢本機的 IP 位址列表。

```typescript
export function portIsOccupied(port: number): Promise<boolean>;
```
檢查某個 port 是否被佔用。

```typescript
export function testHost(ip: string): Promise<boolean>;
```
測試是否能連通某台主機。

```typescript
export function get(url: string, data?: RequestData): Promise<Buffer>;
```
以 GET 請求伺服器資料。

```typescript
export function post(url: string, data?: RequestData): Promise<Buffer>;
```
以 POST 請求伺服器資料。

```typescript
export function getFreePort(port: number): Promise<number>;
```
從指定 port 開始尋找一個可用的 port。**（MCP server 啟動時找可用 port 很實用。）**

### Protected（protected.d.ts）

```typescript
export const __protected__: {
    testConnectServer(): Promise<boolean>; // 測試是否可連通 passport.cocos.com
}
```

---

## Editor.Package

擴展（插件）管理。

### 型別

```typescript
/** @deprecated 請改用 Editor.Interface.PackageInfo */
export interface IGetPackageOptions {
    name?: string;
    debug?: boolean;
    path?: string;
    enable?: boolean;
    invalid?: boolean;
}
/** @deprecated 請改用 Editor.Interface.PackageJson */
export interface PackageJson {
    name: string;
    version: string;
    author?: string;
    description?: string;
    main?: string;
    windows?: string;
    debug?: boolean;
    panels?: any;
    editor?: string;
}
export type PathType = 'home' | 'data' | 'temp';
```

### 函式

```typescript
export function getPackages(options?: IGetPackageOptions): Editor.Interface.PackageInfo[];
```
查詢插件列表（可依名稱、啟用狀態等過濾）。

```typescript
export function register(path: string): void;
```
註冊一個插件。

```typescript
export function unregister(path: string): void;
```
反註冊一個插件。

```typescript
export function enable(path: string): void;
```
啟用一個插件。

```typescript
export function disable(path: string, options?: { replacement?: boolean }): void;
```
停用一個插件。

```typescript
export function getPath(extensionName: string): string | undefined;
```
取得插件目錄路徑。（JSDoc 提及可傳 `type: 'home' | 'data' | 'temp'` 取得預製目錄，但實際簽名只接受 `extensionName`，不傳 type 時回傳目前開啟的插件路徑。）

### Protected（protected.d.ts）

```typescript
export type packageType = 'builtin' | 'cover' | 'local' | 'global' | 'other';
export interface IDisableInfo { name: string; time: number; }

export const __protected__: {
    startup(handle: (name: string, path: string) => Promise<void>): Promise<void>; // 啟動已掃描到的插件
    addDisableInfo(path: string): void;          // 記錄被關閉的插件
    removeDisableInfo(path: string): void;       // 移除關閉記錄
    queryDisableInfo(path: string): Promise<IDisableInfo | void>; // 查詢關閉記錄
    disableOther(path: string): Promise<void>;   // 關閉同名的更高優先級插件
    enableOther(path: string): Promise<void>;    // 依優先級開啟同名插件
    scan(dir: string): Promise<string[]>;        // 掃描目錄，回傳其中所有插件路徑
    checkType(dir: string): packageType;         // 回傳插件類別
    checkVersion(version: string): boolean;      // 檢查指定版本是否可在當前編輯器開啟
    checkReload(path: string): boolean;          // 檢查是否需要刷新插件資料
    normalizePath(path: string): string;         // 格式化路徑
    on(action: string, handle: (...args: any[]) => void): any;     // 監聽插件事件
    once(action: string, handle: (...args: any[]) => void): any;
    emit(action: string, ...args: any[]): any;
    removeListener(action: string, handle: (...args: any[]) => void): any;
    compareVersion(versionA: string, versionB: string): number;    // A>B => 1, A=B => 0, A<B => -1
};
```

---

## Editor.Panel

面板管理（開關面板、定義面板）。

### 型別

```typescript
export type Selector<$> = { $: Record<keyof $, HTMLElement | null> };

export type Options<S, M, U extends (...args: any[]) => void> = {
    listeners?: {
        show?: () => void;   // 面板顯示時觸發
        hide?: () => void;   // 面板隱藏時觸發
    };
    template: string;        // 面板 HTML 內容（必填）
    style?: string;          // 面板樣式
    $?: S;                   // 快捷選擇器（key -> CSS selector）
    methods?: M;             // 面板方法，可在 messages、listeners、生命週期內呼叫
    update?: (...args: Parameters<U>) => void; // 面板資料更新後觸發
    ready?: () => void;      // 面板啟動後觸發
    /**
     * 面板準備關閉時觸發；return false 會中斷關閉流程。
     * 謹慎使用，錯誤判斷會導致編輯器無法關閉。
     */
    beforeClose?: () => Promise<boolean | void> | boolean | void;
    close?: () => void;      // 面板關閉後觸發
} & ThisType<Selector<S> & M>;
```

### 函式

```typescript
export function open(name: string, ...args: (BaseType | { [key: string]: any })[]): Promise<boolean>;
```
開啟面板。`name` 格式為 `'packageName'`（預設面板）或 `'packageName.panelName'`。

```typescript
export function openBeside(besidePanel: string, name: string, ...args: (BaseType | { [key: string]: any })[]): Promise<boolean>;
```
在某個面板旁邊開啟另一個面板。

```typescript
export function close(name: string): Promise<boolean>;
```
關閉面板。

```typescript
export function focus(name: string): Promise<boolean>;
```
將焦點移到面板。

```typescript
export function has(name: string): Promise<boolean>;
```
檢查面板是否已開啟。

```typescript
export function querySelector(name: string, selector: string): Promise<HTMLElement[][] | void>;
```
查詢當前視窗某面板內符合 CSS selector 的元素列表。

```typescript
export function define<U extends (...args: any[]) => void, Selector = Record<string, string>, M = Record<string, Function>>(
    options: Options<Selector, M, U>,
): any;
```
定義一個面板物件（主要提供型別推導，無實際執行邏輯）。

### Protected（protected.d.ts）

Kit 面板（內建小型彈出面板，如 inspector 中的小工具）相關：

```typescript
export interface IPCOpenKitPanelOption {
    params: (string | boolean | number | Record<string, string | boolean | number | Record<string, any>>)[];
    listeners: string[];
    kitID: number;
    screen: { x: number; y: number; width: number; height: number };
    position: { x: number; y: number };
}
export interface KitOpenOption extends IPCOpenKitPanelOption {
    webContentID: number;
}
export interface OpenKitPanelOption {
    params?: (string | boolean | number | Record<string, string | boolean | number | Record<string, any>>)[];
    listeners?: { [key: string]: (...args: any[]) => void };
    elem: Element;   // 顯示在哪個元素上
}
export interface KitEventParams {
    value: string;                // uuid 值
    info: Record<string, any>;    // name、path、type、uuid、iconInfo 等
}
export const __protected__: {
    preloadKit(): void;
    openKit(name: string, options: OpenKitPanelOption): void;
    closeKit(name): void;
    holdKit(): void;
    _openDevTools(name: string): void;  // 開啟指定面板的開發者工具（除錯利器）
}
```

---

## Editor.Profile

插件設定的讀寫（偏好設定 / 專案設定 / 暫存設定三種範疇）。

### 型別

```typescript
export type PreferencesProtocol = 'default' | 'global' | 'local';
export type ProjectProtocol = 'default' | 'project';
export type TempProtocol = 'temp';
export type ProfileValueType = string | boolean | number | { [key: string]: any } | (string | boolean | number)[];
export interface ProfileGetOptions {
    type: 'deep' | 'current' | 'inherit';
}
export interface ProfileObj {
    get: (key?: string, options?: ProfileGetOptions) => void;
    set: (key?: string, value?: any) => void;
    remove: (key: string) => void;
    save: () => void;
    clear: () => void;
    reset: () => void;
}
```

### 函式（偏好設定 Preferences）

```typescript
export function getConfig(name: string, key?: string, type?: PreferencesProtocol): Promise<any>;
```
讀取插件設定。`name` 為插件名，`key` 為設定路徑（支援 `a.b.c`），`type` 可選 `global` / `local` / `default`。

```typescript
export function setConfig(name: string, key: string, value: Editor.Profile.ProfileValueType, type?: PreferencesProtocol): Promise<void>;
```
寫入插件設定。

```typescript
export function removeConfig(name: string, key: string, type?: PreferencesProtocol): Promise<void>;
```
刪除插件設定。

### 函式（專案設定 Project）

```typescript
export function getProject(name: string, key?: string, type?: ProjectProtocol): Promise<any>;
```
讀取插件的專案設定（`type` 可選 `project` / `default`）。

```typescript
export function setProject(name: string, key: string, value: Editor.Profile.ProfileValueType, type?: ProjectProtocol): Promise<void>;
```
寫入插件的專案設定。

```typescript
export function removeProject(name: string, key: string, type?: ProjectProtocol): Promise<void>;
```
刪除插件的專案設定。

### 函式（暫存設定 Temp）

```typescript
export function getTemp(name: string, key?: string): Promise<any>;
```
讀取插件暫存設定。

```typescript
export function setTemp(name: string, key: string, value: Editor.Profile.ProfileValueType): Promise<void>;
```
寫入插件暫存設定。

```typescript
export function removeTemp(name: string, key: string): Promise<void>;
```
刪除插件暫存設定。

### Protected（protected.d.ts）

```typescript
export const __protected__: {
    migrateLocal(pkgName: string, profileVersion: string, profileData: Record<string, any>, targetVersion?: string): Promise<boolean>;   // 遷移本地設定
    migrateGlobal(pkgName: string, profileVersion: string, profileData: Record<string, any>, targetVersion?: string): Promise<boolean>;  // 遷移全域設定
    migrateProject(pkgName: string, profileVersion: string, profileData: Record<string, any>, targetVersion?: string): Promise<boolean>; // 遷移專案設定
    ensureProfiles(name: string): any;   // 生成 profiles 物件
    on(action: string, handle: (...args: any[]) => void): EventEmitter;
    once(action: string, handle: (...args: any[]) => void): EventEmitter;
    emit(action: string, ...args: any[]): boolean;
    removeListener(action: string, handle: (...args: any[]) => void): EventEmitter;
    _registerMigration(pkgName: string, migrations: any[]): void;
}
```

---

## Editor.Project

當前專案資訊（公開部分只有常數）。

| API | 型別 | 說明 |
| --- | --- | --- |
| `Editor.Project.path` | `string` | 當前專案路徑。 |
| `Editor.Project.uuid` | `string` | 當前專案 UUID。 |
| `Editor.Project.name` | `string` | 當前專案名稱（取自 package.json）。 |
| `Editor.Project.tmpDir` | `string` | 當前專案的暫存資料夾（`<project>/temp`）。 |

### Protected（protected.d.ts）

```typescript
export const __protected__: {
    type: string;        // 專案類型
    path: string;        // 當前專案路徑
    uuid: string;        // 當前專案 uuid
    name: string;        // 當前專案名稱
    tmpDir: string;      // 當前專案暫存資料夾
    create(): void;                          // 建立一個專案
    open(path?: string): void;               // 開啟一個專案
    add(path: string): void;                 // 把專案加入專案列表
    getLastEditorVersion(): Promise<string>; // 取得最後開啟此專案的編輯器版本號
}
```

---

## Editor.Selection

編輯器選取狀態（Hierarchy / Assets 等面板的選中項）。`type` 通常為 `'node'` 或 `'asset'`，`uuid` 為元素 UUID。

```typescript
export function select(type: string, uuid: string | string[]): void;
```
選中一個或一組元素。

```typescript
export function unselect(type: string, uuid: string | string[]): void;
```
取消一個或一組元素的選中狀態。

```typescript
export function clear(type: string): void;
```
清空某類型的所有選中元素。

```typescript
export function update(type: string, uuids: string[]): void;
```
直接以整組 uuids 更新該類型的選中資料。

```typescript
export function hover(type: string, uuid?: string): void;
```
標記懸停了某個元素，會發出 `selection:hover` 廣播訊息。

```typescript
export function getLastSelectedType(): string;
```
取得最後選中元素的類型。

```typescript
export function getLastSelected(type: string): string;
```
取得某類型中最後選中的元素 uuid。

```typescript
export function getSelected(type: string): string[];
```
取得某類型所有選中元素的 uuid 陣列。

### Protected（protected.d.ts）

```typescript
export const __protected__: {
    on(action: string, handle: (...args: any[]) => void): EventEmitter;     // 監聽選取事件
    once(action: string, handle: (...args: any[]) => void): EventEmitter;
    emit(action: string, ...args: any[]): boolean;
    removeListener(action: string, handle: (...args: any[]) => void): EventEmitter;
}
```

---

## Editor.Task

通知（編輯器右下角 notice）與同步任務（遮罩）。

### 介面

```typescript
export interface NoticeButtonOptions {
    label: string;
    message: Message.MessageInfo;   // 按鈕點擊後觸發的插件訊息
}
export interface NoticeOptions {
    title: string;                                    // 通知標題
    message?: string;                                 // 通知內容
    type?: 'error' | 'warn' | 'log' | 'success';      // 通知類型
    source?: string;                                  // 來源（顯示發出通知的插件）
    buttons?: NoticeButtonOptions[];                  // 通知上的按鈕
    timeout?: number;                                 // 顯示時間，預設不自動消失
}
export interface NoticeInfo extends NoticeOptions {
    id: number;
    timer?: NodeJS.Timeout;
}
```

### 函式

```typescript
export function addNotice(options: NoticeOptions): number;
```
新增一則通知，回傳 notice ID（可用於移除）。

```typescript
export function removeNotice(id: number): void;
```
刪除一則通知。

```typescript
export function changeNoticeTimeout(id: number, time: number): void;
```
修改通知自動消失的時間。

```typescript
export function queryNotices(): NoticeInfo[];
```
查詢所有通知。

```typescript
export function queryNotice(id: number): NoticeInfo;
```
查詢指定通知。

### Protected（protected.d.ts）

```typescript
export const __protected__: {
    addSyncTask(title: string, describe?: string, message?: string): void;    // 新增同步任務（主視窗顯示遮罩層）
    updateSyncTask(title: string, describe?: string, message?: string): void; // 更新同步任務顯示的資料
    removeSyncTask(title: string): void;                                      // 刪除同步任務
    hasSyncTask(): Promise<boolean>;                                          // 是否正在顯示遮罩
    sync(): void;                                                             // 頁面進程立即同步一次主進程資料
    on(action: string, handle: (...args: any[]) => void): EventEmitter;
    once(action: string, handle: (...args: any[]) => void): EventEmitter;
    emit(action: string, ...args: any[]): boolean;
    removeListener(action: string, handle: (...args: any[]) => void): EventEmitter;
}
```

---

## Editor.Theme

編輯器主題（皮膚）。

```typescript
export function getList(): string[];
```
取得所有主題名稱。

```typescript
export function use(name?: string): void;
```
套用指定主題（不傳則用預設）。

---

## Editor.UI

UI 自訂元素註冊。

```typescript
export function register(tagName: string, element: CustomElementConstructor): void;
```
在當前頁面註冊一個自訂節點。**官方標註：謹慎使用，之後會被移除。**

### Protected（protected.d.ts）

```typescript
export type HTMLCustomElement<T extends {} = Record<string, any>> = HTMLElement & T;

export interface RegisterProtocolInfo {
    label: string;
    description?: string;
    path: string;          // 與轉換 handlers 二選一
    invalidInfo?: string;  // 不符合當前協議頭時的文字提示
}
export interface ProtocolInfo extends RegisterProtocolInfo {
    protocol: string;
}
export const __protected__: {
    registerTranslator(handle: (key: string) => string): void;
    // 以下為內建 UI 元件類別參考（型別皆為 any）：
    Base; Button; Input; NumInput; Loading; Checkbox; Section; Select; Bit;
    Slider; ColorPicker; Color; DragItem; DragArea; DragObject; Prop; Tooltip;
    TextArea; Progress; Label; Code; Tab; Gradient; GradientPicker; Icon;
    // File 提供 URL 協議轉換工具：
    File: {
        resolveToRaw(url: string): string;                  // 將協議 URL 轉成實際路徑
        resolveToUrl(raw: string, protocol: string): string; // 將實際路徑轉成協議 URL
        registerProtocol(protocol: string, protocolInfo: RegisterProtocolInfo): boolean;
        unregisterProtocol(protocol: string): boolean;
        getAllProtocolInfos(): ProtocolInfo[];
    };
    Link; Image; QRCode; Markdown; Curve; CurveEditor; NodeGraph; Setting;
    Radio; RadioGroup; ScaleSlider;
    // ⚠️ 3.8.8 差異：3.8.8 在此處（ScaleSlider 之後）新增了三個欄位：
    // Message: any; message: any; toast: any;
    // （3.8.4 沒有這三個欄位；推測對應 3.8.8 新增的 ui-message/toast 元件。）
}
```

---

## Editor.User

Cocos 開發者帳號。

### 介面

```typescript
export interface UserData {
    session_id: string;
    session_key: string;
    cocos_uid: string;
    email: string;
    nickname: string;
}
export interface UserTokenData {
    access_token: string;
    cocos_uid: number;
    expires_in: number;
}
```

### 函式

```typescript
export function getData(): Promise<UserData>;
```
取得使用者資料。

```typescript
export function isLoggedIn(): Promise<boolean>;
```
檢查使用者是否已登入。

```typescript
export function login(username: string, password: string): Promise<UserData>;
```
使用者登入（失敗會拋出例外）。

```typescript
export function logout(): void;
```
登出（失敗會拋出例外）。

```typescript
export function getUserToken(): Promise<UserTokenData>;
```
取得使用者 token（失敗會拋出例外）。

```typescript
export function getSessionCode(extensionId: number): Promise<string>;
```
依插件 id 取得 session code。

```typescript
export function showMask(): void;
export function hideMask(): void;
```
顯示 / 隱藏使用者登入遮罩層。（謹慎使用，之後會被移除。）

```typescript
export function on(action: string, handle: Function): void;
export function once(action: string, handle: Function): void;
export function removeListener(action: string, handle: Function): void;
```
監聽 / 監聽一次 / 取消監聽 User 事件。（謹慎使用，之後會被移除。）

### Protected（protected.d.ts）

```typescript
export function skip(): void;  // 跳過登入流程

export const __protected__: {
    init(): void;                                  // 初始化 User 模組
    queryLicenseByPluginName(pluginName: string);  // 以插件名查詢憑證資訊
    queryLicenseByName(name: string);              // 以憑證名查詢憑證資訊
}
```

---

## Editor.Utils

通用工具集。**注意**：`editor.d.ts` 內的 `Editor.Utils` 子 namespace 全被註解掉，實際定義在 `utils/index.d.ts`，由 `utils.d.ts` 透過 `export const Utils = UtilsType` 掛到 `Editor.Utils`。以下為 `utils/index.d.ts` 的完整內容。

### Editor.Utils.File

```typescript
export function resolveFileNameConflict(targetFolder: string, fileName: string): string;
```
檢查檔案在指定資料夾中是否存在，若存在則以追加數字後綴的方式產生唯一檔名。

```typescript
export function getName(file: string): string;
```
初始化一個可用的檔名，回傳可用名稱的檔案路徑。

```typescript
interface UnzipOptions { peel?: boolean; }
export function unzip(zip: string, target: string, options?: UnzipOptions): Promise<void>;
```
解壓縮檔案到目標資料夾（`peel` 為是否剝掉最外層資料夾）。

```typescript
export function copy(source: string, target: string): void;
```
複製檔案到另一個位置。

```typescript
export function trashItem(path: string): Promise<void>;
```
將檔案移到系統回收桶。

### Editor.Utils.Path

```typescript
export function basenameNoExt(path: string): string;   // 回傳不含副檔名的檔名
export function slash(path: string): string;           // 將 \ 統一換成 /
export function stripSep(path: string): string;        // 去除路徑結尾的斜線
export function stripExt(path: string): string;        // 刪除路徑的副檔名
export function contains(pathA: string, pathB: string): boolean; // 判斷 pathA 是否包含 pathB（路徑層級判斷）
export function normalize(path: string): string;       // 格式化路徑（Windows 會將磁碟代號轉小寫）
```

以下為 Node.js `path` 模組的直接 re-export：

```typescript
export const join: typeof NodeJSPath.join;
export const resolve: typeof NodeJSPath.resolve;
export const isAbsolute: typeof NodeJSPath.isAbsolute;
export const relative: typeof NodeJSPath.relative;
export const dirname: typeof NodeJSPath.dirname;
export const basename: typeof NodeJSPath.basename;
export const extname: typeof NodeJSPath.extname;
export const sep: '\\' | '/';
export const delimiter: ';' | ':';
export const parse: typeof NodeJSPath.parse;
export const format: typeof NodeJSPath.format;
```

### Editor.Utils.Math

```typescript
export function clamp(val: number, min: number, max: number): number;      // 夾在 [min, max] 範圍
export function clamp01(val: number): number;                              // 夾在 [0, 1]
export function add(arg1: number | string, arg2: number | string): number; // 精確加法（避免浮點誤差）
export function sub(arg1: number | string, arg2: number | string): number; // 精確減法
export function multi(arg1: number, arg2: number): number;                 // 精確乘法
export function divide(arg1: number, arg2: number): number;                // 精確除法
export function toFixed(val: number, num: number): number;                 // 保留小數位
```

### Editor.Utils.Parse

```typescript
interface WhenParam {
    PanelName?: string;
    EditMode?: string;
    ProjectType?: string;
}
export function when(when: string): WhenParam;
```
解析 `when` 條件字串（格式如 `PanelName === '' && EditMode === ''`）為物件。

```typescript
export function checkWhen(when: string): boolean;
```
判斷 `when` 條件是否符合當前編輯器狀態。

```typescript
export function compareVersion(versionMax: string, versionMin: string): boolean;
```
回傳 `versionMax > versionMin`。僅支援純數字版本，最高三位（如 `333.666.345`）；入參必須為字串，不合格式會拋出例外。例：`(3.6.2, 3.7.0) => false`、`(3.9.0, 3.8.0) => true`、`(3.8.0, 3.8.0) => false`。

### Editor.Utils.Url

```typescript
export function getDocUrl(relativeUrl: string, type?: 'manual' | 'api'): string;
```
快捷取得官方文件路徑。

### Editor.Utils.UUID

```typescript
export function compressUUID(uuid: string, min: boolean): string;            // 壓縮 UUID
export function compressHex(hexString: string, reservedHeadLength: number): string; // 壓縮 hex 字串
export function decompressUUID(str: string): string;                         // 解壓 UUID（短碼還原為完整 UUID）
export function isUUID(str: string): string;                                 // 檢查字串是否是 UUID（注意：回傳型別宣告為 string）
export function generate(compress?: boolean): string;                        // 產生新 uuid，compress 預設 true
export function getUuidFromLibPath(path: string): string;                    // 從 library 路徑提取 UUID
export function nameToSubId(name: string, extend?: number): string;          // 取得子資源的短 uuid
```

`getUuidFromLibPath` 範例：`".../5b/5b9cbc23-76b3-41ff-9953-4219fdbea72c/Fontin-SmallCaps.ttf"` → `"5b9cbc23-76b3-41ff-9953-4219fdbea72c"`。

> 在處理 asset-db / scene 回傳的壓縮 UUID（如 `f0Bs0...` 形式）時，`decompressUUID` / `compressUUID` 是必備工具。

### Editor.Utils.Process

```typescript
export enum LogLevel {
    LOG,
    WARN,
    ERROR,
    NULL,
}
export interface IQuickSpawnOption extends SpawnOptions {
    cwd?: string;
    env?: any;
    logLevel?: LogLevel;          // 輸出等級，預設 0（log 級以上都列印）
    downGradeWaring?: boolean;    // 警告轉為 log 列印，預設 false
    downGradeLog?: boolean;       // log 轉為 debug 列印，預設 true
    downGradeError?: boolean;     // 錯誤轉為警告列印，預設 false
    onlyPrintWhenError?: boolean; // 預設 true，日誌正常收集但僅在發生錯誤時列印
    prefix?: string;              // 日誌輸出前綴
}
export function quickSpawn(command: string, cmdParams: string[], options?: IQuickSpawnOption): Promise<boolean>;
```
快速開啟子進程，不需自行監聽輸出，回傳一個標記完成（是否成功）的 Promise。

---

## Editor.Module

模組載入。

```typescript
export function importProjectModule(url: string): Promise<unknown>;
```
匯入一個專案模組（如 `db://assets/scripts/foo.ts` 編譯後的模組）。**@experimental 實驗性質**。對 MCP 而言，這是在編輯器環境中存取專案自訂腳本的入口。

### Protected（protected.d.ts）

```typescript
export type RequireOptions = {
    root?: string;
};
export type ImportProjectModuleDelegate = (url: string) => Promise<unknown>;

export const __protected__: {
    requireFile(file: string, options?: RequireOptions): any;  // 動態載入一個腳本模組（CommonJS require）
    removeCache(file: string): any;                            // 刪除已載入模組的快取（熱重載用）
    setImportProjectModuleDelegate(delegate: ImportProjectModuleDelegate): void; // 設定 importProjectModule 的實作代理
}
```

---

## Editor.Windows

編輯器視窗管理。

### 公開函式

```typescript
export function open(layout: Editor.Layout.ILayout, rect: { x: number, y: number, width: number, height: number }): void;
```
使用一份 layout 設定開啟一個新視窗。

### Protected（protected.d.ts）

```typescript
interface IWindowOptions {
    frame?: boolean;
    center?: boolean;
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    titleBarStyle?: 'hiddenInset';
    titleBarOverlay?: number;
    autoHideMenuBar?: boolean;
    menuBarVisibility?: boolean;
    transparent?: boolean;
    resizable?: boolean;
    fullscreen?: boolean;
    minimizable?: boolean;
    show?: boolean;
    title?: string;
    webPreferences?: {
        nodeIntegration?: boolean;
        // ⚠️ 3.8.8 差異：3.8.8 在此處新增 nodeIntegrationInWorker?: boolean;
        webviewTag?: boolean;
        enableRemoteModule?: boolean;
        contextIsolation?: boolean;
        backgroundThrottling?: boolean;
        zoomFactor?: number;
    };
}

export const __protected__: {
    startup(): void;
    maximize(): void;   // 最大化（目前聚焦的）視窗
    minimize(): void;   // 最小化視窗
    close(): void;      // 關閉視窗
    open(HTML: string, options?: IWindowOptions, userData?: { [key: string]: any }): Promise<string>; // 開啟任意 HTML 視窗，回傳視窗 id
    setDefaultZoomLevel(level: number): void;             // 設定預設縮放級別（同步到所有視窗）
    getDefaultZoomLevel(): Promise<number> | number;      // 取得預設縮放級別
    setZoomLevel(level: number, winID?: string): void;    // 設定指定視窗縮放級別（預設當前聚焦視窗，否則主視窗）
    getZoomLevel(winID?: string): Promise<number>;        // 取得視窗縮放級別
    queryUserData(winID?: string): any;                   // 查詢視窗 userData
    changeUserData(data: { [key: string]: any }, winID?: string): void; // 修改視窗 userData
    changeMinSize(width: number, height: number, winID?: string): void; // 修改視窗最小尺寸
    generateBlank(): void;                                // 產生空白視窗
    openSubWindow(size: { width: number, height: number }, userData: { [key: string]: any });    // 開啟子視窗
    openSimpleWindow(size: { width: number, height: number }, userData: { [key: string]: any }); // 開啟簡單視窗
    changeMainTitle(title: string): void;                 // 修改主視窗標題
    queryMainTitle(): Promise<string>;                    // 查詢主視窗標題
    setBeforeOpenHook(func: (options: Editor.Windows.IWindowOptions, userData: { layout: Editor.Layout.ILayout }) => void): void; // 視窗開啟前 hook
    setAfterOpenHook(func: (windows: any) => void): void; // 視窗開啟後 hook
};
```

---

## Protected 專屬 namespace：Editor.Startup / Editor.Metrics

這兩個 namespace 只存在於 `protected.d.ts`，屬於編輯器內部模組，MCP 一般不需要，但列出供參考。

### Editor.Startup

編輯器啟動流程控制（主進程內部使用）。

```typescript
export interface builtinJSON {
    disableBuiltin?: string[];   // 關閉的內建插件
    extensions?: string[];       // 啟動的外部插件
    env?: {
        HOME?: string;           // 更改編輯器設定目錄
        PROJECT?: string;        // 更改啟動專案
        LAYOUT?: string;         // 啟動預設佈局（檔案路徑或 json）
        LANGUAGE?: string;       // 啟動預設語言
        MAIN_WINDOW_CUSTOM_HEADER?: string;   // 疊加新的頭部內容
        MAIN_WINDOW_ORIGIN_HEADER?: {
            ALL?: boolean;       // 控制整個頭部顯示（false 隱藏，undefined 等同 true）
            CENTER?: boolean;    // 中間預覽操作區域
            RIGHT?: boolean;     // 右邊區域（不含關閉視窗的三顆按鈕）
        };
        MAIN_WINDOW_FOOTER?: string;  // 主視窗 Footer
        WINDOW_HOOK?: string;         // 所有視窗鉤子（Editor 執行後立即執行）
        WINDOW_STYLE?: string;        // 所有視窗的樣式
    };
}
export const __protected__: {
    init(options: Editor.Startup.builtinJSON): void;
    ready: {
        readonly window: any;
        readonly package: any;
    };
    window(options: {
        beforeOpen(options: Editor.Windows.IWindowOptions, userData: { layout: Editor.Layout.ILayout }): void,
        afterOpen(windows: any): void,
    }): Promise<void>;
    manager(skipLogin: boolean, outputMetricLog?: boolean): Promise<void>;
    startPackage(options?: { preList?: string[]; list?: string[]; }): Promise<void>;
    build(options: any, debug: boolean): Promise<any>;   // 命令列建置入口
    test(options: any, debug: boolean): Promise<any>;    // 命令列測試入口
    on(action: string, handle: (...args: any[]) => void): void;
    once(action: string, handle: (...args: any[]) => void): void;
    removeListener(action: string, handle: (...args: any[]) => void): void;
}
```

### Editor.Metrics

資料統計 / 遙測（上報 Cocos 官方統計後台）。公開匯出：

```typescript
export function trackEvent(info: trackEventInfo): any;                 // 追蹤一個事件
export function _trackEventWithTimer(info: trackWithTimerEventInfo): any; // 自增統計（與快取資料結合遞增）
export function trackException(info: trackExceptionInfo): any;         // 追蹤一個例外
export function trackProcessMemory(process: string, memoryInfo: trackMemoryUsage): void; // 追蹤進程記憶體
export function trackTimeStart(message: string): void;                 // 開始計時
export function trackTimeEnd(message: string, options?: { output?: boolean, label?: string, value?: number }): Promise<number>; // 結束計時，回傳統計時間
export function close(): Promise<boolean>;                             // 結束統計並上傳資料
```

`__protected__` 內另有 `_trackCrashEvent`、`_sendEventGroup`、`register`、`reset`、`getMetricInitData`、`setMetricInitData`、`getTrackInfoList`、`getTrackTimeStartMap`、`getTrackAwaitHandler`、`getProcessMemoryMap`、`trackProcessMemoryStart`、`trackProcessMemoryEnd` 等內部統計 API（MCP 無需使用，略）。

---

## Editor.Interface（extension.d.ts）

擴展相關的共用介面（注意：此檔以 `declare namespace Editor` 宣告，非 `declare global`）。

```typescript
namespace Editor.Interface {
    interface PackageInfo {
        debug: boolean;
        enable: boolean;
        info: PackageJson;   // TODO（官方註解）：更名為 packageJSON 更合適
        invalid: boolean;
        name: string;
        path: string;
        version: string;
    }

    interface PackageJson {
        name: string;
        version: string;
        title?: string;
        author?: string;
        debug?: boolean;
        description?: string;
        main?: string;
        editor?: string;      // 支援的編輯器版本範圍
        panel?: any;
        migrations?: {
            version: string;
            profile?: string;
            custom?: string;
        }[];
        contributions?: {
            messages?: Record<string, Message.MessageConfig>;  // 訊息註冊表
            [key: string]: any;
            builder?: string;  // 建置插件註冊腳本
        };
    }

    interface PanelInfo {
        template?: string;
        style?: string;
        listeners?: { [key: string]: () => {} };
        methods?: { [key: string]: Function };
        $?: { [key: string]: string };
        ready?(): void;
        update?(...args: any[]): void;
        beforeClose?(): void;
        close?(): void;
    }

    namespace UIKit {
        interface UIPanelInfo extends PanelInfo {
            dispath(eventName: string, ...arg: any): void;  // 向上觸發事件（官方拼字即為 dispath）
        }
        interface EditorElementBase extends HTMLElement {
            value: any;
            dispath: (name: string, event: any) => void;
        }
    }
}
```

---

## 對 MCP 擴展開發特別重要的 API

依重要程度排列：

### 1. Editor.Message — 一切控制的樞紐

- `request()` 是控制編輯器的主通道：場景節點增刪改查（`'scene'`）、資源建立/查詢/刪除（`'asset-db'`）、建置（`'builder'`）、預覽（`'preview'`）、專案設定（`'project'`）全靠它。
- `EditorMessageMaps` 的 index signature 讓你也能呼叫自訂插件的訊息（型別為 `any`）。
- `__protected__.addBroadcastListener / removeBroadcastListener`：程式化監聽編輯器廣播（如 `'scene:ready'`、`'asset-db:asset-change'`、`'selection:hover'`），是 MCP 實作「事件推播 / 狀態同步」的關鍵。

### 2. Editor.Selection — 與使用者操作銜接

讀取/設定 Hierarchy 與 Assets 的選取狀態（`getSelected('node')`、`getSelected('asset')`、`select()`），讓 MCP 工具能「對使用者目前選中的東西」操作，或把操作結果反白給使用者看。

### 3. Editor.Logger — 取得編輯器 Console 輸出

`Logger.query(): ILogInfo[]` 可直接拿到完整日誌（含類型、stack、時間），是 MCP 回報編譯錯誤 / 執行期錯誤的最直接來源；`Logger.clear()` 可在操作前清空以便 diff。

### 4. Editor.Project / Editor.App — 環境資訊

`Project.path / uuid / name / tmpDir` 與 `App.version / path / temp` 是組路徑、判版本（搭配 `Utils.Parse.compareVersion`）的基礎。

### 5. Editor.Panel — 面板控制

`open / close / focus / has / querySelector` 可程式化開關任意面板；`__protected__._openDevTools(name)` 可開面板 DevTools，自動化除錯非常實用。

### 6. Editor.Profile — MCP 自身設定的持久化

`getConfig/setConfig`（偏好設定，跨專案）與 `getProject/setProject`（隨專案）是儲存 MCP server port、token 等設定的正規做法。

### 7. Editor.Utils.UUID — 處理資源/節點 UUID 必備

scene / asset-db 訊息常回傳壓縮 UUID，`decompressUUID / compressUUID / isUUID / generate` 是轉換時的必備工具。

### 8. Editor.Task — 對使用者的回饋

`addNotice` 讓 MCP 在長時間操作（建置、批量資源處理）後彈出通知，按鈕還能回送訊息到擴展；`__protected__.addSyncTask` 可顯示全螢幕遮罩防止使用者在批量操作期間誤觸。

### 9. Editor.Menu.__protected__ — UI 自動化的隱藏入口

`queryMain() / clickMain(searcher)` 與 `queryPopup() / clickPopup(searcher)` 可以**程式化點擊主選單與右鍵選單**，等於把所有「只有選單能觸發」的編輯器功能都暴露給自動化——這是 protected API 中對 MCP 最意外、最有價值的能力之一。

### 10. 其他值得記住的

- `Editor.Module.importProjectModule(url)`：在編輯器內載入專案腳本模組（experimental）。
- `Editor.Network.getFreePort(port)`：MCP server 啟動時找可用 port。
- `Editor.Package.getPackages() / getPath()`：偵測其他擴展、定位自身路徑。
- `Editor.Dialog.__protected__.setMode('command')`：把原生對話框切到 command 模式，避免自動化流程被 modal 卡住（內部 API，須自行驗證行為）。
- `Editor.Windows.__protected__.open(HTML, options, userData)`：開啟任意 HTML 視窗（內部 API）。
- `Editor.Clipboard`：與使用者剪貼簿互通。

### 注意事項

- `__protected__` 系列 API 無相容性保證，官方多處標註「謹慎使用，之後會被移除」，使用前應以 `typeof` 檢查存在性並準備 fallback。
- `Editor` 是 `declare global` 的全域物件，擴展主進程（main.js）與面板進程皆可直接使用，但部分 API 有進程限制（如 `Menu.popup` 僅面板進程、`Menu.__protected__.add` 僅主進程）。
- 少數 API 的型別宣告有瑕疵：`EditMode.enter` 與 `Layout.apply` 未標回傳型別、`Utils.UUID.isUUID` 回傳型別宣告為 `string`（語意上應為 boolean）、`Package.getPath` 的 JSDoc 與簽名不一致——使用時以實際行為為準。
