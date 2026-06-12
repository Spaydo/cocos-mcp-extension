"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAssetTool = createAssetTool;
/**
 * asset 工具：資源管理（asset-db）。
 * 對應 message 簽名見 docs/api-reference/03-messages-asset-db.md。
 * query_users / query_dependencies 在 3.8.4 為 protected message（同名可呼叫），
 * result 差異由 adapters.normalizeUuidList 吸收。
 */
const adapters_1 = require("../adapters");
const helpers_1 = require("./helpers");
function operationOption(args) {
    if (args.overwrite || args.rename) {
        return { overwrite: Boolean(args.overwrite), rename: Boolean(args.rename) };
    }
    return undefined;
}
/**
 * copy/move 成功時 3.8.4 runtime 可能回 null（與官方型別 AssetInfo|null 語意不符，實測）。
 * result 為空時改以「目標是否存在」驗證成敗。
 */
async function verifyByTarget(info, targetUrl, op, source) {
    if (info)
        return info;
    const target = await (0, helpers_1.request)('asset-db', 'query-asset-info', targetUrl);
    if (!target) {
        throw new Error(`${op} failed: ${source} → ${targetUrl}`);
    }
    return target;
}
const CONFLICT_PARAMS = {
    overwrite: { type: 'boolean', description: 'Overwrite if the target exists.' },
    rename: { type: 'boolean', description: 'Auto-rename if the target exists.' },
};
function createAssetTool() {
    return {
        name: 'asset',
        description: 'Asset database operations. Asset urls look like db://assets/path/file.ext; ' +
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
                    const options = {};
                    if (args.pattern)
                        options.pattern = String(args.pattern);
                    if (args.cc_type)
                        options.ccType = String(args.cc_type);
                    if (args.extname)
                        options.extname = String(args.extname);
                    if (args.importer)
                        options.importer = String(args.importer);
                    const list = await (0, helpers_1.request)('asset-db', 'query-assets', options);
                    const assets = Array.isArray(list) ? list : [];
                    const max = typeof args.max === 'number' ? args.max : 200;
                    return {
                        total: assets.length,
                        truncated: assets.length > max || undefined,
                        assets: assets.slice(0, max).map(helpers_1.assetBrief),
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
                    const info = await (0, helpers_1.request)('asset-db', 'query-asset-info', String(args.uuid), Array.isArray(args.data_keys) ? args.data_keys : undefined);
                    if (!info)
                        throw new Error(`Asset not found: ${args.uuid}`);
                    return (0, helpers_1.assetDetail)(info);
                },
            },
            query_meta: {
                description: 'Asset meta content (.meta file, includes userData).',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    const uuid = await (0, helpers_1.toUuid)(String(args.uuid));
                    const meta = await (0, helpers_1.request)('asset-db', 'query-asset-meta', uuid);
                    if (!meta)
                        throw new Error(`Asset meta not found: ${args.uuid}`);
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
                    const message = args.to === 'uuid' ? 'query-uuid' : args.to === 'url' ? 'query-url' : 'query-path';
                    const result = await (0, helpers_1.request)('asset-db', message, value);
                    if (!result)
                        throw new Error(`Cannot convert "${value}" to ${args.to}`);
                    return { [String(args.to)]: result };
                },
            },
            create: {
                description: 'Create a text-based asset (scene/material/script/json...) at the given db:// url.',
                params: Object.assign({ url: { type: 'string', description: 'Target url, e.g. db://assets/scripts/Foo.ts' }, content: { type: 'string', description: 'File content.' } }, CONFLICT_PARAMS),
                required: ['url', 'content'],
                handler: async (args) => {
                    const option = operationOption(args);
                    const info = option
                        ? await (0, helpers_1.request)('asset-db', 'create-asset', String(args.url), String(args.content), option)
                        : await (0, helpers_1.request)('asset-db', 'create-asset', String(args.url), String(args.content));
                    if (!info)
                        throw new Error(`create-asset failed for ${args.url}`);
                    return (0, helpers_1.assetBrief)(info);
                },
            },
            create_folder: {
                description: 'Create a folder at the given db:// url.',
                params: {
                    url: { type: 'string', description: 'Folder url, e.g. db://assets/textures' },
                },
                required: ['url'],
                handler: async (args) => {
                    const info = await (0, helpers_1.request)('asset-db', 'create-asset', String(args.url), null);
                    if (!info)
                        throw new Error(`create folder failed for ${args.url}`);
                    return (0, helpers_1.assetBrief)(info);
                },
            },
            import: {
                description: 'Import an external file from disk into the asset database.',
                params: Object.assign({ source_path: { type: 'string', description: 'Absolute path of the source file on disk.' }, target_url: { type: 'string', description: 'Target db:// url.' } }, CONFLICT_PARAMS),
                required: ['source_path', 'target_url'],
                handler: async (args) => {
                    const option = operationOption(args);
                    const info = option
                        ? await (0, helpers_1.request)('asset-db', 'import-asset', String(args.source_path), String(args.target_url), option)
                        : await (0, helpers_1.request)('asset-db', 'import-asset', String(args.source_path), String(args.target_url));
                    if (!info)
                        throw new Error(`import-asset failed for ${args.source_path}`);
                    return (0, helpers_1.assetBrief)(info);
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
                    const info = await (0, helpers_1.request)('asset-db', 'save-asset', String(args.uuid), String(args.content));
                    if (!info)
                        throw new Error(`save-asset failed for ${args.uuid}`);
                    return (0, helpers_1.assetBrief)(info);
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
                    const info = await (0, helpers_1.request)('asset-db', 'save-asset-meta', String(args.uuid), serialized);
                    if (!info)
                        throw new Error(`save-asset-meta failed for ${args.uuid}`);
                    return (0, helpers_1.assetBrief)(info);
                },
            },
            copy: {
                description: 'Copy an asset to a new url.',
                params: Object.assign({ source: { type: 'string', description: 'Source db:// url.' }, target: { type: 'string', description: 'Target db:// url.' } }, CONFLICT_PARAMS),
                required: ['source', 'target'],
                handler: async (args) => {
                    const option = operationOption(args);
                    const info = option
                        ? await (0, helpers_1.request)('asset-db', 'copy-asset', String(args.source), String(args.target), option)
                        : await (0, helpers_1.request)('asset-db', 'copy-asset', String(args.source), String(args.target));
                    return (0, helpers_1.assetBrief)(await verifyByTarget(info, String(args.target), 'copy-asset', String(args.source)));
                },
            },
            move: {
                description: 'Move or rename an asset.',
                params: Object.assign({ source: { type: 'string', description: 'Source db:// url.' }, target: { type: 'string', description: 'Target db:// url.' } }, CONFLICT_PARAMS),
                required: ['source', 'target'],
                handler: async (args) => {
                    const option = operationOption(args);
                    const info = option
                        ? await (0, helpers_1.request)('asset-db', 'move-asset', String(args.source), String(args.target), option)
                        : await (0, helpers_1.request)('asset-db', 'move-asset', String(args.source), String(args.target));
                    return (0, helpers_1.assetBrief)(await verifyByTarget(info, String(args.target), 'move-asset', String(args.source)));
                },
            },
            delete: {
                description: 'Delete an asset (and its meta).',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    var _a;
                    const info = await (0, helpers_1.request)('asset-db', 'delete-asset', String(args.uuid));
                    return { deleted: (_a = (0, helpers_1.assetBrief)(info)) !== null && _a !== void 0 ? _a : String(args.uuid) };
                },
            },
            reimport: {
                description: 'Force re-import an asset (rebuild its library files).',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    await (0, helpers_1.request)('asset-db', 'reimport-asset', String(args.uuid));
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
                    await (0, helpers_1.request)('asset-db', 'refresh-asset', String(args.url));
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
                    await (0, helpers_1.request)('asset-db', 'open-asset', String(args.uuid));
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
                    const url = await (0, helpers_1.request)('asset-db', 'generate-available-url', String(args.url));
                    return { url };
                },
            },
            query_users: {
                description: 'Reverse dependencies: which assets/scripts directly use this asset. ' +
                    '(Protected API on 3.8.4 — works but not officially guaranteed.)',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                    type: { type: 'string', enum: ['asset', 'script', 'all'], description: 'Default asset.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    var _a;
                    // 3.8.4 protected 版只接受 uuid → 統一先轉 uuid
                    const uuid = await (0, helpers_1.toUuid)(String(args.uuid));
                    const result = await (0, helpers_1.request)('asset-db', 'query-asset-users', uuid, (_a = args.type) !== null && _a !== void 0 ? _a : 'asset');
                    return { users: (0, adapters_1.normalizeUuidList)(result) };
                },
            },
            query_dependencies: {
                description: 'Forward dependencies: which assets/scripts this asset depends on. ' +
                    '(Protected API on 3.8.4 — works but not officially guaranteed.)',
                params: {
                    uuid: { type: 'string', description: 'Asset uuid or db:// url.' },
                    type: { type: 'string', enum: ['asset', 'script', 'all'], description: 'Default asset.' },
                },
                required: ['uuid'],
                handler: async (args) => {
                    var _a;
                    const uuid = await (0, helpers_1.toUuid)(String(args.uuid));
                    const result = await (0, helpers_1.request)('asset-db', 'query-asset-dependencies', uuid, (_a = args.type) !== null && _a !== void 0 ? _a : 'asset');
                    return { dependencies: (0, adapters_1.normalizeUuidList)(result) };
                },
            },
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNzZXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvYXNzZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFtQ0EsMENBb1JDO0FBdlREOzs7OztHQUtHO0FBQ0gsMENBQWdEO0FBRWhELHVDQUFxRTtBQUVyRSxTQUFTLGVBQWUsQ0FBQyxJQUF5QjtJQUM5QyxJQUFJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hDLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0lBQ2hGLENBQUM7SUFDRCxPQUFPLFNBQVMsQ0FBQztBQUNyQixDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsS0FBSyxVQUFVLGNBQWMsQ0FBQyxJQUFTLEVBQUUsU0FBaUIsRUFBRSxFQUFVLEVBQUUsTUFBYztJQUNsRixJQUFJLElBQUk7UUFBRSxPQUFPLElBQUksQ0FBQztJQUN0QixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsaUJBQU8sRUFBQyxVQUFVLEVBQUUsa0JBQWtCLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDeEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ1YsTUFBTSxJQUFJLEtBQUssQ0FBQyxHQUFHLEVBQUUsWUFBWSxNQUFNLE1BQU0sU0FBUyxFQUFFLENBQUMsQ0FBQztJQUM5RCxDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDbEIsQ0FBQztBQUVELE1BQU0sZUFBZSxHQUE0QjtJQUM3QyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxpQ0FBaUMsRUFBRTtJQUM5RSxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxtQ0FBbUMsRUFBRTtDQUNoRixDQUFDO0FBRUYsU0FB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QUFFLENBQUMsTUFBTSxDQUFDO2dCQUNsQixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxFQUFFOztvQkFDcEIsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLGdCQUFNLEVBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUM3QyxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsaUJBQU8sRUFBQyxVQUFVLEVBQUUsMEJBQTBCLEVBQUUsSUFBSSxFQUFFLE1BQUEsSUFBSSxDQUFDLElBQUksbUNBQUksT0FBTyxDQUFDLENBQUM7b0JBQ2pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsSUFBQSw0QkFBaUIsRUFBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUN2RCxDQUFDO2FBQ0o7U0FDSjtLQUNKLENBQUM7QUFDTixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBhc3NldCDlt6XlhbfvvJros4fmupDnrqHnkIbvvIhhc3NldC1kYu+8ieOAglxuICog5bCN5oeJIG1lc3NhZ2Ug57C95ZCN6KaLIGRvY3MvYXBpLXJlZmVyZW5jZS8wMy1tZXNzYWdlcy1hc3NldC1kYi5tZOOAglxuICogcXVlcnlfdXNlcnMgLyBxdWVyeV9kZXBlbmRlbmNpZXMg5ZyoIDMuOC40IOeCuiBwcm90ZWN0ZWQgbWVzc2FnZe+8iOWQjOWQjeWPr+WRvOWPq++8ie+8jFxuICogcmVzdWx0IOW3rueVsOeUsSBhZGFwdGVycy5ub3JtYWxpemVVdWlkTGlzdCDlkLjmlLbjgIJcbiAqL1xuaW1wb3J0IHsgbm9ybWFsaXplVXVpZExpc3QgfSBmcm9tICcuLi9hZGFwdGVycyc7XG5pbXBvcnQgeyBUb29sRGVmIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgYXNzZXRCcmllZiwgYXNzZXREZXRhaWwsIHJlcXVlc3QsIHRvVXVpZCB9IGZyb20gJy4vaGVscGVycyc7XG5cbmZ1bmN0aW9uIG9wZXJhdGlvbk9wdGlvbihhcmdzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KTogUmVjb3JkPHN0cmluZywgYW55PiB8IHVuZGVmaW5lZCB7XG4gICAgaWYgKGFyZ3Mub3ZlcndyaXRlIHx8IGFyZ3MucmVuYW1lKSB7XG4gICAgICAgIHJldHVybiB7IG92ZXJ3cml0ZTogQm9vbGVhbihhcmdzLm92ZXJ3cml0ZSksIHJlbmFtZTogQm9vbGVhbihhcmdzLnJlbmFtZSkgfTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbn1cblxuLyoqXG4gKiBjb3B5L21vdmUg5oiQ5Yqf5pmCIDMuOC40IHJ1bnRpbWUg5Y+v6IO95ZueIG51bGzvvIjoiIflrpjmlrnlnovliKUgQXNzZXRJbmZvfG51bGwg6Kqe5oSP5LiN56ym77yM5a+m5ris77yJ44CCXG4gKiByZXN1bHQg54K656m65pmC5pS55Lul44CM55uu5qiZ5piv5ZCm5a2Y5Zyo44CN6amX6K2J5oiQ5pWX44CCXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHZlcmlmeUJ5VGFyZ2V0KGluZm86IGFueSwgdGFyZ2V0VXJsOiBzdHJpbmcsIG9wOiBzdHJpbmcsIHNvdXJjZTogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICBpZiAoaW5mbykgcmV0dXJuIGluZm87XG4gICAgY29uc3QgdGFyZ2V0ID0gYXdhaXQgcmVxdWVzdCgnYXNzZXQtZGInLCAncXVlcnktYXNzZXQtaW5mbycsIHRhcmdldFVybCk7XG4gICAgaWYgKCF0YXJnZXQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGAke29wfSBmYWlsZWQ6ICR7c291cmNlfSDihpIgJHt0YXJnZXRVcmx9YCk7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG59XG5cbmNvbnN0IENPTkZMSUNUX1BBUkFNUzogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7XG4gICAgb3ZlcndyaXRlOiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdPdmVyd3JpdGUgaWYgdGhlIHRhcmdldCBleGlzdHMuJyB9LFxuICAgIHJlbmFtZTogeyB0eXBlOiAnYm9vbGVhbicsIGRlc2NyaXB0aW9uOiAnQXV0by1yZW5hbWUgaWYgdGhlIHRhcmdldCBleGlzdHMuJyB9LFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUFzc2V0VG9vbCgpOiBUb29sRGVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiAnYXNzZXQnLFxuICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICdBc3NldCBkYXRhYmFzZSBvcGVyYXRpb25zLiBBc3NldCB1cmxzIGxvb2sgbGlrZSBkYjovL2Fzc2V0cy9wYXRoL2ZpbGUuZXh0OyAnICtcbiAgICAgICAgICAgICdtb3N0IGFjdGlvbnMgYWNjZXB0IGEgdXVpZCBvciBhIGRiOi8vIHVybC4nLFxuICAgICAgICBhY3Rpb25zOiB7XG4gICAgICAgICAgICBxdWVyeV9hc3NldHM6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0xpc3QgYXNzZXRzIGZpbHRlcmVkIGJ5IHVybCBwYXR0ZXJuIC8gY2MgdHlwZSAvIGV4dGVuc2lvbi4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBwYXR0ZXJuOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1VybCBnbG9iIHBhdHRlcm4sIGUuZy4gZGI6Ly9hc3NldHMvKiovKi5wcmVmYWInIH0sXG4gICAgICAgICAgICAgICAgICAgIGNjX3R5cGU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnY2MgYXNzZXQgdHlwZSwgZS5nLiBjYy5TY2VuZUFzc2V0IC8gY2MuUHJlZmFiIC8gY2MuSW1hZ2VBc3NldCcgfSxcbiAgICAgICAgICAgICAgICAgICAgZXh0bmFtZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdGaWxlIGV4dGVuc2lvbiBmaWx0ZXIsIGUuZy4gLnNjZW5lJyB9LFxuICAgICAgICAgICAgICAgICAgICBpbXBvcnRlcjogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdJbXBvcnRlciBuYW1lIGZpbHRlci4nIH0sXG4gICAgICAgICAgICAgICAgICAgIG1heDogeyB0eXBlOiAnbnVtYmVyJywgZGVzY3JpcHRpb246ICdNYXggZW50cmllcyB0byByZXR1cm4gKGRlZmF1bHQgMjAwKS4nIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XG4gICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLnBhdHRlcm4pIG9wdGlvbnMucGF0dGVybiA9IFN0cmluZyhhcmdzLnBhdHRlcm4pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5jY190eXBlKSBvcHRpb25zLmNjVHlwZSA9IFN0cmluZyhhcmdzLmNjX3R5cGUpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoYXJncy5leHRuYW1lKSBvcHRpb25zLmV4dG5hbWUgPSBTdHJpbmcoYXJncy5leHRuYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MuaW1wb3J0ZXIpIG9wdGlvbnMuaW1wb3J0ZXIgPSBTdHJpbmcoYXJncy5pbXBvcnRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxpc3QgPSBhd2FpdCByZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldHMnLCBvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXNzZXRzOiBhbnlbXSA9IEFycmF5LmlzQXJyYXkobGlzdCkgPyBsaXN0IDogW107XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1heCA9IHR5cGVvZiBhcmdzLm1heCA9PT0gJ251bWJlcicgPyBhcmdzLm1heCA6IDIwMDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsOiBhc3NldHMubGVuZ3RoLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ1bmNhdGVkOiBhc3NldHMubGVuZ3RoID4gbWF4IHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFzc2V0czogYXNzZXRzLnNsaWNlKDAsIG1heCkubWFwKGFzc2V0QnJpZWYpLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcXVlcnlfaW5mbzoge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRnVsbCBpbmZvIG9mIG9uZSBhc3NldCBieSB1dWlkLCBkYjovLyB1cmwgb3IgYWJzb2x1dGUgcGF0aC4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IHV1aWQsIGRiOi8vIHVybCBvciBhYnNvbHV0ZSBwYXRoLicgfSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YV9rZXlzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnYXJyYXknLFxuICAgICAgICAgICAgICAgICAgICAgICAgaXRlbXM6IHsgdHlwZTogJ3N0cmluZycgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRXh0cmEgZmllbGRzIHRvIGluY2x1ZGUgKGUuZy4gZGVwZW5kcywgZGVwZW5kZWRzLCBtdGltZSkuJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgcmVxdWVzdChcbiAgICAgICAgICAgICAgICAgICAgICAgICdhc3NldC1kYicsXG4gICAgICAgICAgICAgICAgICAgICAgICAncXVlcnktYXNzZXQtaW5mbycsXG4gICAgICAgICAgICAgICAgICAgICAgICBTdHJpbmcoYXJncy51dWlkKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIEFycmF5LmlzQXJyYXkoYXJncy5kYXRhX2tleXMpID8gYXJncy5kYXRhX2tleXMgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaW5mbykgdGhyb3cgbmV3IEVycm9yKGBBc3NldCBub3QgZm91bmQ6ICR7YXJncy51dWlkfWApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXNzZXREZXRhaWwoaW5mbyk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBxdWVyeV9tZXRhOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdBc3NldCBtZXRhIGNvbnRlbnQgKC5tZXRhIGZpbGUsIGluY2x1ZGVzIHVzZXJEYXRhKS4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IHV1aWQgb3IgZGI6Ly8gdXJsLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB1dWlkID0gYXdhaXQgdG9VdWlkKFN0cmluZyhhcmdzLnV1aWQpKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YSA9IGF3YWl0IHJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LW1ldGEnLCB1dWlkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtZXRhKSB0aHJvdyBuZXcgRXJyb3IoYEFzc2V0IG1ldGEgbm90IGZvdW5kOiAke2FyZ3MudXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG1ldGE7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjb252ZXJ0OiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb252ZXJ0IGJldHdlZW4gYXNzZXQgaWRlbnRpZmllcnM6IHV1aWQgLyBkYjovLyB1cmwgLyBhYnNvbHV0ZSBwYXRoLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0lucHV0IHV1aWQsIHVybCBvciBwYXRoLicgfSxcbiAgICAgICAgICAgICAgICAgICAgdG86IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsndXVpZCcsICd1cmwnLCAncGF0aCddLCBkZXNjcmlwdGlvbjogJ1RhcmdldCBmb3JtLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3ZhbHVlJywgJ3RvJ10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBTdHJpbmcoYXJncy52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPVxuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy50byA9PT0gJ3V1aWQnID8gJ3F1ZXJ5LXV1aWQnIDogYXJncy50byA9PT0gJ3VybCcgPyAncXVlcnktdXJsJyA6ICdxdWVyeS1wYXRoJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcmVxdWVzdCgnYXNzZXQtZGInLCBtZXNzYWdlLCB2YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzdWx0KSB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBjb252ZXJ0IFwiJHt2YWx1ZX1cIiB0byAke2FyZ3MudG99YCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IFtTdHJpbmcoYXJncy50byldOiByZXN1bHQgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGNyZWF0ZToge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ3JlYXRlIGEgdGV4dC1iYXNlZCBhc3NldCAoc2NlbmUvbWF0ZXJpYWwvc2NyaXB0L2pzb24uLi4pIGF0IHRoZSBnaXZlbiBkYjovLyB1cmwuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RhcmdldCB1cmwsIGUuZy4gZGI6Ly9hc3NldHMvc2NyaXB0cy9Gb28udHMnIH0sXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRmlsZSBjb250ZW50LicgfSxcbiAgICAgICAgICAgICAgICAgICAgLi4uQ09ORkxJQ1RfUEFSQU1TLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXJsJywgJ2NvbnRlbnQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcHRpb24gPSBvcGVyYXRpb25PcHRpb24oYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBvcHRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgID8gYXdhaXQgcmVxdWVzdCgnYXNzZXQtZGInLCAnY3JlYXRlLWFzc2V0JywgU3RyaW5nKGFyZ3MudXJsKSwgU3RyaW5nKGFyZ3MuY29udGVudCksIG9wdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgIDogYXdhaXQgcmVxdWVzdCgnYXNzZXQtZGInLCAnY3JlYXRlLWFzc2V0JywgU3RyaW5nKGFyZ3MudXJsKSwgU3RyaW5nKGFyZ3MuY29udGVudCkpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWluZm8pIHRocm93IG5ldyBFcnJvcihgY3JlYXRlLWFzc2V0IGZhaWxlZCBmb3IgJHthcmdzLnVybH1gKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFzc2V0QnJpZWYoaW5mbyk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBjcmVhdGVfZm9sZGVyOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDcmVhdGUgYSBmb2xkZXIgYXQgdGhlIGdpdmVuIGRiOi8vIHVybC4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB1cmw6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRm9sZGVyIHVybCwgZS5nLiBkYjovL2Fzc2V0cy90ZXh0dXJlcycgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3VybCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCByZXF1ZXN0KCdhc3NldC1kYicsICdjcmVhdGUtYXNzZXQnLCBTdHJpbmcoYXJncy51cmwpLCBudWxsKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpbmZvKSB0aHJvdyBuZXcgRXJyb3IoYGNyZWF0ZSBmb2xkZXIgZmFpbGVkIGZvciAke2FyZ3MudXJsfWApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXNzZXRCcmllZihpbmZvKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGltcG9ydDoge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW1wb3J0IGFuIGV4dGVybmFsIGZpbGUgZnJvbSBkaXNrIGludG8gdGhlIGFzc2V0IGRhdGFiYXNlLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZV9wYXRoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fic29sdXRlIHBhdGggb2YgdGhlIHNvdXJjZSBmaWxlIG9uIGRpc2suJyB9LFxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRfdXJsOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RhcmdldCBkYjovLyB1cmwuJyB9LFxuICAgICAgICAgICAgICAgICAgICAuLi5DT05GTElDVF9QQVJBTVMsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydzb3VyY2VfcGF0aCcsICd0YXJnZXRfdXJsJ10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9uID0gb3BlcmF0aW9uT3B0aW9uKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gb3B0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGF3YWl0IHJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2ltcG9ydC1hc3NldCcsIFN0cmluZyhhcmdzLnNvdXJjZV9wYXRoKSwgU3RyaW5nKGFyZ3MudGFyZ2V0X3VybCksIG9wdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgIDogYXdhaXQgcmVxdWVzdCgnYXNzZXQtZGInLCAnaW1wb3J0LWFzc2V0JywgU3RyaW5nKGFyZ3Muc291cmNlX3BhdGgpLCBTdHJpbmcoYXJncy50YXJnZXRfdXJsKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaW5mbykgdGhyb3cgbmV3IEVycm9yKGBpbXBvcnQtYXNzZXQgZmFpbGVkIGZvciAke2FyZ3Muc291cmNlX3BhdGh9YCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhc3NldEJyaWVmKGluZm8pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2F2ZToge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3ZlcndyaXRlIGFuIGV4aXN0aW5nIGFzc2V0IGZpbGUgd2l0aCBuZXcgY29udGVudC4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IHV1aWQgb3IgZGI6Ly8gdXJsLicgfSxcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOZXcgZmlsZSBjb250ZW50LicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnLCAnY29udGVudCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBhd2FpdCByZXF1ZXN0KCdhc3NldC1kYicsICdzYXZlLWFzc2V0JywgU3RyaW5nKGFyZ3MudXVpZCksIFN0cmluZyhhcmdzLmNvbnRlbnQpKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFpbmZvKSB0aHJvdyBuZXcgRXJyb3IoYHNhdmUtYXNzZXQgZmFpbGVkIGZvciAke2FyZ3MudXVpZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFzc2V0QnJpZWYoaW5mbyk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzYXZlX21ldGE6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ092ZXJ3cml0ZSBhbiBhc3NldCBtZXRhIChwYXNzIHRoZSBmdWxsIG1ldGEgSlNPTjsgdXNlIHF1ZXJ5X21ldGEgZmlyc3QsIHRoZW4gbW9kaWZ5KS4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IHV1aWQgb3IgZGI6Ly8gdXJsLicgfSxcbiAgICAgICAgICAgICAgICAgICAgbWV0YTogeyBkZXNjcmlwdGlvbjogJ01ldGEgY29udGVudCBhcyBKU09OIG9iamVjdCBvciBzZXJpYWxpemVkIHN0cmluZy4nIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJywgJ21ldGEnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXJpYWxpemVkID0gdHlwZW9mIGFyZ3MubWV0YSA9PT0gJ3N0cmluZycgPyBhcmdzLm1ldGEgOiBKU09OLnN0cmluZ2lmeShhcmdzLm1ldGEpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgcmVxdWVzdCgnYXNzZXQtZGInLCAnc2F2ZS1hc3NldC1tZXRhJywgU3RyaW5nKGFyZ3MudXVpZCksIHNlcmlhbGl6ZWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWluZm8pIHRocm93IG5ldyBFcnJvcihgc2F2ZS1hc3NldC1tZXRhIGZhaWxlZCBmb3IgJHthcmdzLnV1aWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhc3NldEJyaWVmKGluZm8pO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgY29weToge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnQ29weSBhbiBhc3NldCB0byBhIG5ldyB1cmwuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NvdXJjZSBkYjovLyB1cmwuJyB9LFxuICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGFyZ2V0IGRiOi8vIHVybC4nIH0sXG4gICAgICAgICAgICAgICAgICAgIC4uLkNPTkZMSUNUX1BBUkFNUyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3NvdXJjZScsICd0YXJnZXQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcHRpb24gPSBvcGVyYXRpb25PcHRpb24oYXJncyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZm8gPSBvcHRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgID8gYXdhaXQgcmVxdWVzdCgnYXNzZXQtZGInLCAnY29weS1hc3NldCcsIFN0cmluZyhhcmdzLnNvdXJjZSksIFN0cmluZyhhcmdzLnRhcmdldCksIG9wdGlvbilcbiAgICAgICAgICAgICAgICAgICAgICAgIDogYXdhaXQgcmVxdWVzdCgnYXNzZXQtZGInLCAnY29weS1hc3NldCcsIFN0cmluZyhhcmdzLnNvdXJjZSksIFN0cmluZyhhcmdzLnRhcmdldCkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXNzZXRCcmllZihhd2FpdCB2ZXJpZnlCeVRhcmdldChpbmZvLCBTdHJpbmcoYXJncy50YXJnZXQpLCAnY29weS1hc3NldCcsIFN0cmluZyhhcmdzLnNvdXJjZSkpKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1vdmU6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ01vdmUgb3IgcmVuYW1lIGFuIGFzc2V0LicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdTb3VyY2UgZGI6Ly8gdXJsLicgfSxcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1RhcmdldCBkYjovLyB1cmwuJyB9LFxuICAgICAgICAgICAgICAgICAgICAuLi5DT05GTElDVF9QQVJBTVMsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydzb3VyY2UnLCAndGFyZ2V0J10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3B0aW9uID0gb3BlcmF0aW9uT3B0aW9uKGFyZ3MpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gb3B0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICA/IGF3YWl0IHJlcXVlc3QoJ2Fzc2V0LWRiJywgJ21vdmUtYXNzZXQnLCBTdHJpbmcoYXJncy5zb3VyY2UpLCBTdHJpbmcoYXJncy50YXJnZXQpLCBvcHRpb24pXG4gICAgICAgICAgICAgICAgICAgICAgICA6IGF3YWl0IHJlcXVlc3QoJ2Fzc2V0LWRiJywgJ21vdmUtYXNzZXQnLCBTdHJpbmcoYXJncy5zb3VyY2UpLCBTdHJpbmcoYXJncy50YXJnZXQpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFzc2V0QnJpZWYoYXdhaXQgdmVyaWZ5QnlUYXJnZXQoaW5mbywgU3RyaW5nKGFyZ3MudGFyZ2V0KSwgJ21vdmUtYXNzZXQnLCBTdHJpbmcoYXJncy5zb3VyY2UpKSk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBkZWxldGU6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0RlbGV0ZSBhbiBhc3NldCAoYW5kIGl0cyBtZXRhKS4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IHV1aWQgb3IgZGI6Ly8gdXJsLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpbmZvID0gYXdhaXQgcmVxdWVzdCgnYXNzZXQtZGInLCAnZGVsZXRlLWFzc2V0JywgU3RyaW5nKGFyZ3MudXVpZCkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBkZWxldGVkOiBhc3NldEJyaWVmKGluZm8pID8/IFN0cmluZyhhcmdzLnV1aWQpIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWltcG9ydDoge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRm9yY2UgcmUtaW1wb3J0IGFuIGFzc2V0IChyZWJ1aWxkIGl0cyBsaWJyYXJ5IGZpbGVzKS4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICB1dWlkOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Fzc2V0IHV1aWQgb3IgZGI6Ly8gdXJsLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3V1aWQnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCByZXF1ZXN0KCdhc3NldC1kYicsICdyZWltcG9ydC1hc3NldCcsIFN0cmluZyhhcmdzLnV1aWQpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlZnJlc2g6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1JlLXNjYW4gYSBkYjovLyB1cmwgYWZ0ZXIgZmlsZXMgd2VyZSBjaGFuZ2VkIG9uIGRpc2sgYnkgZXh0ZXJuYWwgdG9vbHMuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ2RiOi8vIHVybCB0byByZWZyZXNoLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3VybCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3JlZnJlc2gtYXNzZXQnLCBTdHJpbmcoYXJncy51cmwpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgb2s6IHRydWUgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9wZW46IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ09wZW4gYW4gYXNzZXQgaW4gdGhlIGVkaXRvciAobGlrZSBkb3VibGUtY2xpY2tpbmcgaW4gdGhlIEFzc2V0cyBwYW5lbCkuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCB1dWlkIG9yIGRiOi8vIHVybC4nIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWyd1dWlkJ10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgcmVxdWVzdCgnYXNzZXQtZGInLCAnb3Blbi1hc3NldCcsIFN0cmluZyhhcmdzLnV1aWQpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgb3BlbmVkOiBTdHJpbmcoYXJncy51dWlkKSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYXZhaWxhYmxlX3VybDoge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnR2VuZXJhdGUgYSBub24tY29uZmxpY3RpbmcgdXJsIGJhc2VkIG9uIHRoZSBnaXZlbiBvbmUgKGF2b2lkcyBvdmVyd3JpdGluZykuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXJsOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0Rlc2lyZWQgZGI6Ly8gdXJsLicgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3VybCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGF3YWl0IHJlcXVlc3QoJ2Fzc2V0LWRiJywgJ2dlbmVyYXRlLWF2YWlsYWJsZS11cmwnLCBTdHJpbmcoYXJncy51cmwpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdXJsIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBxdWVyeV91c2Vyczoge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICAnUmV2ZXJzZSBkZXBlbmRlbmNpZXM6IHdoaWNoIGFzc2V0cy9zY3JpcHRzIGRpcmVjdGx5IHVzZSB0aGlzIGFzc2V0LiAnICtcbiAgICAgICAgICAgICAgICAgICAgJyhQcm90ZWN0ZWQgQVBJIG9uIDMuOC40IOKAlCB3b3JrcyBidXQgbm90IG9mZmljaWFsbHkgZ3VhcmFudGVlZC4pJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCB1dWlkIG9yIGRiOi8vIHVybC4nIH0sXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnYXNzZXQnLCAnc2NyaXB0JywgJ2FsbCddLCBkZXNjcmlwdGlvbjogJ0RlZmF1bHQgYXNzZXQuJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIDMuOC40IHByb3RlY3RlZCDniYjlj6rmjqXlj5cgdXVpZCDihpIg57Wx5LiA5YWI6L2JIHV1aWRcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdXVpZCA9IGF3YWl0IHRvVXVpZChTdHJpbmcoYXJncy51dWlkKSk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJlcXVlc3QoJ2Fzc2V0LWRiJywgJ3F1ZXJ5LWFzc2V0LXVzZXJzJywgdXVpZCwgYXJncy50eXBlID8/ICdhc3NldCcpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB1c2Vyczogbm9ybWFsaXplVXVpZExpc3QocmVzdWx0KSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcXVlcnlfZGVwZW5kZW5jaWVzOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICdGb3J3YXJkIGRlcGVuZGVuY2llczogd2hpY2ggYXNzZXRzL3NjcmlwdHMgdGhpcyBhc3NldCBkZXBlbmRzIG9uLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJyhQcm90ZWN0ZWQgQVBJIG9uIDMuOC40IOKAlCB3b3JrcyBidXQgbm90IG9mZmljaWFsbHkgZ3VhcmFudGVlZC4pJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdBc3NldCB1dWlkIG9yIGRiOi8vIHVybC4nIH0sXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnYXNzZXQnLCAnc2NyaXB0JywgJ2FsbCddLCBkZXNjcmlwdGlvbjogJ0RlZmF1bHQgYXNzZXQuJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsndXVpZCddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHV1aWQgPSBhd2FpdCB0b1V1aWQoU3RyaW5nKGFyZ3MudXVpZCkpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCByZXF1ZXN0KCdhc3NldC1kYicsICdxdWVyeS1hc3NldC1kZXBlbmRlbmNpZXMnLCB1dWlkLCBhcmdzLnR5cGUgPz8gJ2Fzc2V0Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGRlcGVuZGVuY2llczogbm9ybWFsaXplVXVpZExpc3QocmVzdWx0KSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgIH07XG59XG4iXX0=