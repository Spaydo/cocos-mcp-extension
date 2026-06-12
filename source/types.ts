/**
 * 共用型別定義（編輯器端）。
 * 注意：此檔案會被編譯為 Node 14 可執行的 CJS（3.8.4 編輯器內建 Node 14.16）。
 */

/** Bridge 設定（存於 <專案>/profiles/cocos-mcp.json） */
export interface BridgeSettings {
    /** Bridge HTTP 埠（實際使用埠可能因衝突向後偏移，見 discovery 檔） */
    port: number;
    /** 編輯器啟動時自動開啟 bridge */
    autoStart: boolean;
    /** 單一 action 的執行逾時（毫秒） */
    requestTimeoutMs: number;
}

export const DEFAULT_SETTINGS: BridgeSettings = {
    port: 8585,
    autoStart: true,
    requestTimeoutMs: 15000,
};

export interface EditorVersion {
    major: number;
    minor: number;
    patch: number;
    raw: string;
}

/**
 * 版本能力表。依據 docs/api-reference/07-version-diff-summary.md。
 * 只支援 3.8.4 與 3.8.8 兩版，不對其他版本做推測。
 */
export interface Capabilities {
    /** 3.8.8：create-node result 為 string；3.8.4 為 string[] */
    createNodeReturnsString: boolean;
    /** 3.8.8：query-asset-users / query-asset-dependencies 為公開 message（3.8.4 為 protected） */
    assetUsersPublic: boolean;
    /** 3.8.8：多場景 facade（multiOpenScene 等） */
    multiScene: boolean;
    /** 3.8.8：CreateNodeOptions.autoAdaptToCreate */
    autoAdaptToCreate: boolean;
    /** 3.8.4：save-as-scene params 須傳 [boolean]；3.8.8 為 [] */
    saveAsSceneNeedsFlag: boolean;
}

export interface EditorEnv {
    version: EditorVersion;
    capabilities: Capabilities;
}

/** 傳給每個 action handler 的執行環境 */
export interface ToolContext {
    env: EditorEnv;
    settings: BridgeSettings;
}

/** 單一 action 定義 */
export interface ActionDef {
    /** 英文描述（面向 LLM 的工具說明） */
    description: string;
    /** args 的 JSON Schema properties（不含 action 欄位本身） */
    params?: Record<string, unknown>;
    /** 此 action 必填的參數名 */
    required?: string[];
    handler(args: Record<string, any>, ctx: ToolContext): Promise<unknown>;
}

/** 合併式工具定義（一個 tool 多個 action） */
export interface ToolDef {
    name: string;
    description: string;
    actions: Record<string, ActionDef>;
}

/** Sidecar → Bridge 的 RPC 請求 */
export interface RpcRequest {
    tool: string;
    action: string;
    args?: Record<string, unknown>;
}

export type RpcErrorCode =
    | 'UNKNOWN_TOOL'
    | 'UNKNOWN_ACTION'
    | 'BAD_ARGS'
    | 'TIMEOUT'
    | 'EDITOR_ERROR';

export type RpcResponse =
    | { ok: true; data: unknown }
    | { ok: false; error: { code: RpcErrorCode; message: string; hint?: string } };

/** 提供給 MCP 客戶端的工具描述（對應 MCP Tool 物件） */
export interface McpToolSpec {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

/** discovery 檔內容（<專案>/temp/cocos-mcp/bridge.json） */
export interface BridgeInfo {
    port: number;
    token: string;
    pid: number;
    editorVersion: string;
    projectPath: string;
    startedAt: string;
}
