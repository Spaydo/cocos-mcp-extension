/**
 * 工具層共用 helpers：
 * - request()：Editor.Message.request 的鬆型別包裝（簽名以 docs/api-reference 為準，
 *   跨版本 result 差異由 adapters 處理，不依賴 creator-types 單版的型別宣告）
 * - dump 解包與精簡化（INode/IComponent dump 全是 IProperty 包裝，直接回傳太肥）
 */

export const request: (target: string, message: string, ...args: any[]) => Promise<any> =
    (target, message, ...args) => (Editor.Message.request as any)(target, message, ...args);

/** 解 IProperty 包裝：{value, type, ...} → value；非包裝物件原樣回傳 */
export function v(prop: any): any {
    if (prop && typeof prop === 'object' && 'value' in prop) {
        return prop.value;
    }
    return prop;
}

/** 防禦性取 uuid：容忍 {value:{uuid}} / {uuid} / {value:'xx'} / 'xx' 各種形態 */
export function extractUuid(x: any): string | null {
    if (!x) return null;
    if (typeof x === 'string') return x;
    if (typeof x.uuid === 'string') return x.uuid;
    const inner = v(x);
    if (!inner) return null;
    if (typeof inner === 'string') return inner;
    if (typeof inner.uuid === 'string') return inner.uuid;
    if (inner.uuid) return extractUuid(inner.uuid);
    return null;
}

export interface ComponentBrief {
    index: number;
    type: string;
    uuid: string | null;
    enabled: boolean;
}

/** 從節點完整 dump 萃取組件簡表 */
export function componentsBrief(dump: any): ComponentBrief[] {
    const comps: any[] = Array.isArray(dump?.__comps__) ? dump.__comps__ : [];
    return comps.map((c, index) => {
        const val = v(c) ?? {};
        return {
            index,
            type: String(c?.type ?? val.__type__ ?? 'unknown'),
            uuid: extractUuid(val.uuid),
            enabled: Boolean(v(val.enabled)),
        };
    });
}

/** query-node 完整 dump → 精簡節點資訊 */
export function simplifyNode(dump: any): any {
    if (!dump) return null;
    return {
        uuid: v(dump.uuid),
        name: v(dump.name),
        active: v(dump.active),
        position: v(dump.position),
        // dump 欄位名是 rotation，實際為 eulerAngles（docs/api-reference/02 §12）
        rotation: v(dump.rotation),
        scale: v(dump.scale),
        layer: v(dump.layer),
        locked: v(dump.locked),
        mobility: v(dump.mobility),
        parent: extractUuid(dump.parent),
        isScene: dump.isScene === true || undefined,
        prefab: dump.__prefab__ ? true : undefined,
        components: componentsBrief(dump),
    };
}

/** query-node-tree 的精簡樹（裸值節點）→ 控制深度輸出 */
export function simplifyTree(node: any, depth: number): any {
    if (!node) return null;
    const children: any[] = Array.isArray(node.children) ? node.children : [];
    const out: any = {
        name: v(node.name) ?? node.name,
        uuid: v(node.uuid) ?? node.uuid,
        type: node.type ?? node.__type__,
        active: v(node.active),
        prefab: node.prefab ? true : undefined,
        childCount: children.length,
    };
    if (depth > 0 && children.length > 0) {
        out.children = children.map((c) => simplifyTree(c, depth - 1));
    }
    return out;
}

/** 組件 dump（IComponent）→ 精簡屬性表 */
export function simplifyComponent(dump: any): any {
    if (!dump) return null;
    const val = v(dump) ?? {};
    const skip = new Set(['uuid', 'name', 'enabled', '__scriptAsset', '_objFlags', 'node']);
    const properties: Record<string, any> = {};
    for (const key of Object.keys(val)) {
        if (skip.has(key)) continue;
        const p = val[key];
        if (p && typeof p === 'object' && p.visible === false) continue;
        const entry: Record<string, any> = { value: v(p) };
        if (p && typeof p === 'object') {
            if (p.type) entry.type = p.type;
            if (Array.isArray(p.enumList) && p.enumList.length > 0) entry.enumList = p.enumList;
            if (p.readonly) entry.readonly = true;
        }
        properties[key] = entry;
    }
    return {
        type: dump.type,
        uuid: extractUuid(val.uuid),
        enabled: Boolean(v(val.enabled)),
        properties,
    };
}

/** AssetInfo → 精簡（列表用） */
export function assetBrief(info: any): any {
    if (!info) return null;
    return {
        name: info.name,
        uuid: info.uuid,
        url: info.source ?? info.url,
        type: info.type,
        importer: info.importer,
        isDirectory: info.isDirectory || undefined,
    };
}

/** AssetInfo → 完整但裁掉肥大欄位（library 路徑表、子資產展開） */
export function assetDetail(info: any): any {
    if (!info) return null;
    const out: any = { ...info };
    delete out.library;
    if (out.subAssets && typeof out.subAssets === 'object') {
        const brief: Record<string, any> = {};
        for (const key of Object.keys(out.subAssets)) {
            const sub = out.subAssets[key];
            brief[key] = { uuid: sub?.uuid, type: sub?.type };
        }
        out.subAssets = brief;
    }
    return out;
}

/** 將 db:// url 或路徑統一轉成 uuid（已是 uuid 則原樣回傳） */
export async function toUuid(uuidOrUrl: string): Promise<string> {
    if (uuidOrUrl.startsWith('db://') || uuidOrUrl.startsWith('/')) {
        const uuid = await request('asset-db', 'query-uuid', uuidOrUrl);
        if (!uuid) {
            throw new Error(`Asset not found: ${uuidOrUrl}`);
        }
        return uuid;
    }
    return uuidOrUrl;
}
