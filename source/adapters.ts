/**
 * 跨版本 result 正規化層。
 * 依據 docs/api-reference/07-version-diff-summary.md §2/§3 的差異表。
 * 全部為純函式（不碰全域 Editor），可在編輯器外單元測試。
 */

/** create-node：3.8.4 回 string[]、3.8.8 回 string → 統一 string */
export function normalizeCreateNodeResult(result: unknown): string {
    if (Array.isArray(result)) {
        return String(result[0] ?? '');
    }
    return String(result ?? '');
}

/**
 * query-node-tree：3.8.4 型別標 INode[]（runtime 實為樹物件）、3.8.8 標 INode。
 * 統一輸出樹物件；若 runtime 真回陣列則取首個。
 */
export function normalizeNodeTree(result: unknown): unknown {
    if (Array.isArray(result)) {
        return result.length === 1 ? result[0] : result;
    }
    return result ?? null;
}

export interface ComponentListItem {
    name: string;
    cid?: string;
    path?: string;
    assetUuid?: string;
}

/** query-components：3.8.4 回 string[]、3.8.8 回 {name,cid,path,assetUuid}[] → 統一物件陣列 */
export function normalizeComponentList(result: unknown): ComponentListItem[] {
    if (!Array.isArray(result)) return [];
    return result.map((item) => {
        if (typeof item === 'string') {
            return { name: item };
        }
        const obj = item as Record<string, unknown>;
        return {
            name: String(obj.name ?? ''),
            cid: obj.cid === undefined ? undefined : String(obj.cid),
            path: obj.path === undefined ? undefined : String(obj.path),
            assetUuid: obj.assetUuid === undefined ? undefined : String(obj.assetUuid),
        };
    });
}

/** save-scene：3.8.4 回 boolean、3.8.8 回 string|undefined（場景 uuid） */
export function normalizeSaveSceneResult(result: unknown): { saved: boolean; uuid?: string } {
    if (typeof result === 'string') {
        return { saved: true, uuid: result };
    }
    if (typeof result === 'boolean') {
        return { saved: result };
    }
    // 3.8.8 存檔成功但無 uuid（undefined）視為成功
    return { saved: true };
}

/**
 * save-as-scene 的 params：3.8.4 須傳 [boolean]、3.8.8 為 []。
 * boolean 語意（3.8.4）：是否略過詢問直接另存，實作於 3B 確認後補充說明。
 */
export function buildSaveAsSceneArgs(saveAsSceneNeedsFlag: boolean): unknown[] {
    return saveAsSceneNeedsFlag ? [true] : [];
}

/**
 * query-asset-users / query-asset-dependencies：
 * 3.8.4（protected）users 回 string|null；3.8.8（公開）回 string[] → 統一 string[]
 */
export function normalizeUuidList(result: unknown): string[] {
    if (result === null || result === undefined) return [];
    if (Array.isArray(result)) return result.map(String);
    return [String(result)];
}
