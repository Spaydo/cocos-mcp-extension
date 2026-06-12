/**
 * asset 工具：資源管理（asset-db）。
 * 對應 message 簽名見 docs/api-reference/03-messages-asset-db.md。
 * query_users / query_dependencies 在 3.8.4 為 protected message（同名可呼叫），
 * result 差異由 adapters.normalizeUuidList 吸收。
 */
import { normalizeUuidList } from '../adapters';
import { ToolDef } from '../types';
import { assetBrief, assetDetail, request, toUuid } from './helpers';

function operationOption(args: Record<string, any>): Record<string, any> | undefined {
    if (args.overwrite || args.rename) {
        return { overwrite: Boolean(args.overwrite), rename: Boolean(args.rename) };
    }
    return undefined;
}

/**
 * copy/move 成功時 3.8.4 runtime 可能回 null（與官方型別 AssetInfo|null 語意不符，實測）。
 * result 為空時改以「目標是否存在」驗證成敗。
 */
async function verifyByTarget(info: any, targetUrl: string, op: string, source: string): Promise<any> {
    if (info) return info;
    const target = await request('asset-db', 'query-asset-info', targetUrl);
    if (!target) {
        throw new Error(`${op} failed: ${source} → ${targetUrl}`);
    }
    return target;
}

const CONFLICT_PARAMS: Record<string, unknown> = {
    overwrite: { type: 'boolean', description: 'Overwrite if the target exists.' },
    rename: { type: 'boolean', description: 'Auto-rename if the target exists.' },
};

export function createAssetTool(): ToolDef {
    return {
        name: 'asset',
        description:
            'Asset database operations. Asset urls look like db://assets/path/file.ext; ' +
            'most actions accept a uuid or a db:// url.',
        actions: {
            query_assets: {
                description: 'List assets filtered by url pattern / cc type / extension.',
                params: {
                    pattern: { type: 'string', description: 'Url glob pattern, e.g. db://assets/**/*.prefab' },
                    cc_type: { type: 'string', description: 'cc asset type, e.g. cc.SceneAsset / cc.Prefab / cc.ImageAsset' },
                    extname: { type: 'string', description: 'File extension filter, e.g. .scene' },
                    importer: { type: 'string', description: 'Importer name filter.' },
                    max: { type: 'number', description: 'Max entries to return (default 200).' },
                },
                handler: async (args) => {
                    const options: Record<string, any> = {};
                    if (args.pattern) options.pattern = String(args.pattern);
                    if (args.cc_type) options.ccType = String(args.cc_type);
                    if (args.extname) options.extname = String(args.extname);
                    if (args.importer) options.importer = String(args.importer);
                    const list = await request('asset-db', 'query-assets', options);
                    const assets: any[] = Array.isArray(list) ? list : [];
                    const max = typeof args.max === 'number' ? args.max : 200;
                    return {
                        total: assets.length,
                        truncated: assets.length > max || undefined,
                        assets: assets.slice(0, max).map(assetBrief),
                    };
                },
            },
            query_info: {
                description: 'Full info of one asset by uuid, db:// url or absolute path.',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid, db:// url or absolute path.' },
                    data_keys: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Extra fields to include (e.g. depends, dependeds, mtime).',
                    },
                },
                required: ['uuid'],
                handler: async (args) => {
                    const info = await request(
                        'asset-db',
                        'query-asset-info',
                        String(args.uuid),
                        Array.isArray(args.data_keys) ? args.data_keys : undefined,
                    );
                    if (!info) throw new Error(`Asset not found: ${args.uuid}`);
                    return assetDetail(info);
                },
            },
            query_meta: {
                description: 'Asset meta content (.meta file, includes userData).',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    const uuid = await toUuid(String(args.uuid));
                    const meta = await request('asset-db', 'query-asset-meta', uuid);
                    if (!meta) throw new Error(`Asset meta not found: ${args.uuid}`);
                    return meta;
                },
            },
            convert: {
                description: 'Convert between asset identifiers: uuid / db:// url / absolute path.',
                params: {
                    value: { type: 'string', description: 'Input uuid, url or path.' },
                    to: { type: 'string', enum: ['uuid', 'url', 'path'], description: 'Target form.' },
                },
                required: ['value', 'to'],
                handler: async (args) => {
                    const value = String(args.value);
                    const message =
                        args.to === 'uuid' ? 'query-uuid' : args.to === 'url' ? 'query-url' : 'query-path';
                    const result = await request('asset-db', message, value);
                    if (!result) throw new Error(`Cannot convert "${value}" to ${args.to}`);
                    return { [String(args.to)]: result };
                },
            },
            create: {
                description: 'Create a text-based asset (scene/material/script/json...) at the given db:// url.',
                params: {
                    url: { type: 'string', description: 'Target url, e.g. db://assets/scripts/Foo.ts' },
                    content: { type: 'string', description: 'File content.' },
                    ...CONFLICT_PARAMS,
                },
                required: ['url', 'content'],
                handler: async (args) => {
                    const option = operationOption(args);
                    const info = option
                        ? await request('asset-db', 'create-asset', String(args.url), String(args.content), option)
                        : await request('asset-db', 'create-asset', String(args.url), String(args.content));
                    if (!info) throw new Error(`create-asset failed for ${args.url}`);
                    return assetBrief(info);
                },
            },
            create_folder: {
                description: 'Create a folder at the given db:// url.',
                params: {
                    url: { type: 'string', description: 'Folder url, e.g. db://assets/textures' },
                },
                required: ['url'],
                handler: async (args) => {
                    const info = await request('asset-db', 'create-asset', String(args.url), null);
                    if (!info) throw new Error(`create folder failed for ${args.url}`);
                    return assetBrief(info);
                },
            },
            import: {
                description: 'Import an external file from disk into the asset database.',
                params: {
                    source_path: { type: 'string', description: 'Absolute path of the source file on disk.' },
                    target_url: { type: 'string', description: 'Target db:// url.' },
                    ...CONFLICT_PARAMS,
                },
                required: ['source_path', 'target_url'],
                handler: async (args) => {
                    const option = operationOption(args);
                    const info = option
                        ? await request('asset-db', 'import-asset', String(args.source_path), String(args.target_url), option)
                        : await request('asset-db', 'import-asset', String(args.source_path), String(args.target_url));
                    if (!info) throw new Error(`import-asset failed for ${args.source_path}`);
                    return assetBrief(info);
                },
            },
            save: {
                description: 'Overwrite an existing asset file with new content.',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                    content: { type: 'string', description: 'New file content.' },
                },
                required: ['uuid', 'content'],
                handler: async (args) => {
                    const info = await request('asset-db', 'save-asset', String(args.uuid), String(args.content));
                    if (!info) throw new Error(`save-asset failed for ${args.uuid}`);
                    return assetBrief(info);
                },
            },
            save_meta: {
                description: 'Overwrite an asset meta (pass the full meta JSON; use query_meta first, then modify).',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                    meta: { description: 'Meta content as JSON object or serialized string.' },
                },
                required: ['uuid', 'meta'],
                handler: async (args) => {
                    const serialized = typeof args.meta === 'string' ? args.meta : JSON.stringify(args.meta);
                    const info = await request('asset-db', 'save-asset-meta', String(args.uuid), serialized);
                    if (!info) throw new Error(`save-asset-meta failed for ${args.uuid}`);
                    return assetBrief(info);
                },
            },
            copy: {
                description: 'Copy an asset to a new url.',
                params: {
                    source: { type: 'string', description: 'Source db:// url.' },
                    target: { type: 'string', description: 'Target db:// url.' },
                    ...CONFLICT_PARAMS,
                },
                required: ['source', 'target'],
                handler: async (args) => {
                    const option = operationOption(args);
                    const info = option
                        ? await request('asset-db', 'copy-asset', String(args.source), String(args.target), option)
                        : await request('asset-db', 'copy-asset', String(args.source), String(args.target));
                    return assetBrief(await verifyByTarget(info, String(args.target), 'copy-asset', String(args.source)));
                },
            },
            move: {
                description: 'Move or rename an asset.',
                params: {
                    source: { type: 'string', description: 'Source db:// url.' },
                    target: { type: 'string', description: 'Target db:// url.' },
                    ...CONFLICT_PARAMS,
                },
                required: ['source', 'target'],
                handler: async (args) => {
                    const option = operationOption(args);
                    const info = option
                        ? await request('asset-db', 'move-asset', String(args.source), String(args.target), option)
                        : await request('asset-db', 'move-asset', String(args.source), String(args.target));
                    return assetBrief(await verifyByTarget(info, String(args.target), 'move-asset', String(args.source)));
                },
            },
            delete: {
                description: 'Delete an asset (and its meta).',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    const info = await request('asset-db', 'delete-asset', String(args.uuid));
                    return { deleted: assetBrief(info) ?? String(args.uuid) };
                },
            },
            reimport: {
                description: 'Force re-import an asset (rebuild its library files).',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    await request('asset-db', 'reimport-asset', String(args.uuid));
                    return { ok: true };
                },
            },
            refresh: {
                description: 'Re-scan a db:// url after files were changed on disk by external tools.',
                params: {
                    url: { type: 'string', description: 'db:// url to refresh.' },
                },
                required: ['url'],
                handler: async (args) => {
                    await request('asset-db', 'refresh-asset', String(args.url));
                    return { ok: true };
                },
            },
            open: {
                description: 'Open an asset in the editor (like double-clicking in the Assets panel).',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    await request('asset-db', 'open-asset', String(args.uuid));
                    return { opened: String(args.uuid) };
                },
            },
            available_url: {
                description: 'Generate a non-conflicting url based on the given one (avoids overwriting).',
                params: {
                    url: { type: 'string', description: 'Desired db:// url.' },
                },
                required: ['url'],
                handler: async (args) => {
                    const url = await request('asset-db', 'generate-available-url', String(args.url));
                    return { url };
                },
            },
            query_users: {
                description:
                    'Reverse dependencies: which assets/scripts directly use this asset. ' +
                    '(Protected API on 3.8.4 — works but not officially guaranteed.)',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                    type: { type: 'string', enum: ['asset', 'script', 'all'], description: 'Default asset.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    // 3.8.4 protected 版只接受 uuid → 統一先轉 uuid
                    const uuid = await toUuid(String(args.uuid));
                    const result = await request('asset-db', 'query-asset-users', uuid, args.type ?? 'asset');
                    return { users: normalizeUuidList(result) };
                },
            },
            query_dependencies: {
                description:
                    'Forward dependencies: which assets/scripts this asset depends on. ' +
                    '(Protected API on 3.8.4 — works but not officially guaranteed.)',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                    type: { type: 'string', enum: ['asset', 'script', 'all'], description: 'Default asset.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    const uuid = await toUuid(String(args.uuid));
                    const result = await request('asset-db', 'query-asset-dependencies', uuid, args.type ?? 'asset');
                    return { dependencies: normalizeUuidList(result) };
                },
            },
        },
    };
}
