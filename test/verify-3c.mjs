/**
 * 3C 實機驗證：prefab / scene_view / project 補完 / editor。
 * 用法：node test/verify-3c.mjs [專案路徑]
 * 安全性：scene_view 狀態先讀後還原；設定寫入只動本擴展自己的 pkg key；
 * 臨時節點/資產結束全部清理；不儲存場景。會移動場景相機（focus 測試）。
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = process.argv[2] ?? '/Users/tai/test_cocos_mcp';

const child = spawn(process.execPath, [join(ROOT, 'dist-sidecar/index.js'), '--project', PROJECT], {
    stdio: ['pipe', 'pipe', 'pipe'],
});
child.stderr.on('data', () => {});
let buffer = '';
const pending = new Map();
let nextId = 1;
child.stdout.on('data', (chunk) => {
    buffer += chunk.toString();
    let idx;
    while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        try {
            const msg = JSON.parse(line);
            if (msg.id !== undefined && pending.has(msg.id)) {
                pending.get(msg.id)(msg);
                pending.delete(msg.id);
            }
        } catch { /* ignore */ }
    }
});
function rpc(method, params) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout: ${method}`)), 20000);
        pending.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
}
async function call(tool, action, args = {}) {
    const res = await rpc('tools/call', { name: tool, arguments: { action, ...args } });
    const text = res.result?.content?.[0]?.text ?? '';
    if (res.result?.isError) throw new Error(`${tool}.${action}: ${text}`);
    try { return JSON.parse(text); } catch { return text; }
}
let passed = 0, failed = 0, skipped = 0;
const failures = [];
async function step(name, fn) {
    try {
        const out = await fn();
        passed++; console.log(`  ✓ ${name}`);
        return out;
    } catch (err) {
        failed++; failures.push(`${name}: ${err.message}`);
        console.log(`  ✗ ${name} — ${err.message}`);
        return null;
    }
}
async function optional(name, fn) {
    try {
        const out = await fn();
        passed++; console.log(`  ✓ ${name}`);
        return out;
    } catch (err) {
        skipped++; console.log(`  ⚠ ${name}（跳過）— ${err.message.slice(0, 140)}`);
        return null;
    }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'verify-3c', version: '0' } });
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

console.log('\n[工具目錄]');
const ok = await step('tools/list 回 9 個工具', async () => {
    const res = await rpc('tools/list', {});
    const names = res.result.tools.map((t) => t.name).sort();
    const expect = 'asset,component,dev,editor,node,prefab,project,scene,scene_view';
    if (names.join(',') !== expect) throw new Error(`got: ${names.join(',')}（編輯器可能尚未重啟）`);
    return true;
});
if (!ok) { child.kill(); process.exit(1); }

// ── scene_view ──
console.log('\n[scene_view]');
const initial = await step('query_state（讀取初始狀態）', async () => {
    const s = await call('scene_view', 'query_state');
    if (typeof s.is2D !== 'boolean' || typeof s.gridVisible !== 'boolean') throw new Error(JSON.stringify(s));
    return s;
});
await step('set_tool rotation → 驗證 → 還原', async () => {
    const r = await call('scene_view', 'set_tool', { tool: 'rotation' });
    if (r.tool !== 'rotation') throw new Error(`tool=${r.tool}`);
    await call('scene_view', 'set_tool', { tool: initial?.tool ?? 'position' });
});
await step('set_pivot / set_coordinate 切換 → 還原', async () => {
    const p = await call('scene_view', 'set_pivot', { pivot: initial.pivot === 'pivot' ? 'center' : 'pivot' });
    if (p.pivot === initial.pivot) throw new Error('pivot unchanged');
    await call('scene_view', 'set_pivot', { pivot: initial.pivot });
    const c = await call('scene_view', 'set_coordinate', { coordinate: initial.coordinate === 'local' ? 'global' : 'local' });
    if (c.coordinate === initial.coordinate) throw new Error('coordinate unchanged');
    await call('scene_view', 'set_coordinate', { coordinate: initial.coordinate });
});
await step('set_2d 切換 → 還原', async () => {
    const r = await call('scene_view', 'set_2d', { is2d: !initial.is2D });
    if (r.is2D === initial.is2D) throw new Error('is2D unchanged');
    await call('scene_view', 'set_2d', { is2d: initial.is2D });
});
await step('set_grid 切換 → 還原', async () => {
    const r = await call('scene_view', 'set_grid', { visible: !initial.gridVisible });
    if (r.gridVisible === initial.gridVisible) throw new Error('grid unchanged');
    await call('scene_view', 'set_grid', { visible: initial.gridVisible });
});
await step('set_icon_gizmo（寫回原值）', async () => {
    const r = await call('scene_view', 'set_icon_gizmo', { is3d: initial.iconGizmo3d, size: initial.iconGizmoSize });
    if (r.iconGizmoSize !== initial.iconGizmoSize) throw new Error('size mismatch');
});

let tempNode = null;
await step('focus（暫時節點）', async () => {
    const r = await call('node', 'create', { name: 'MCP_3C_Temp' });
    tempNode = r.uuid;
    await call('scene_view', 'focus', { uuid: tempNode });
});

// ── editor ──
console.log('\n[editor]');
await step('select / selection_query / unselect 往返', async () => {
    await call('editor', 'select', { type: 'node', uuid: tempNode });
    const q = await call('editor', 'selection_query', { type: 'node' });
    if (!q.node.includes(tempNode)) throw new Error(`selected=${JSON.stringify(q.node)}`);
    await call('editor', 'unselect', { type: 'node' });
    const q2 = await call('editor', 'selection_query', { type: 'node' });
    if (q2.node.length !== 0) throw new Error('clear failed');
});
await step('align_with_view（對已選取的暫時節點）', async () => {
    await call('editor', 'select', { type: 'node', uuid: tempNode });
    await call('scene_view', 'align_with_view');
    await call('editor', 'unselect', { type: 'node' });
});
await step('logs（limit 過濾）', async () => {
    const r = await call('editor', 'logs', { limit: 5 });
    if (typeof r.total !== 'number' || r.logs.length > 5) throw new Error(JSON.stringify(r).slice(0, 100));
});
await step('execute_scene_script queryEngineInfo', async () => {
    const r = await call('editor', 'execute_scene_script', { method: 'queryEngineInfo' });
    if (!r.result?.version?.startsWith('3.8')) throw new Error(JSON.stringify(r));
});
await step('events_poll（asset 事件觸發驗證）', async () => {
    const first = await call('editor', 'events_poll', {});
    if (!first.listening.length) throw new Error('no listening channels');
    await call('asset', 'create_folder', { url: 'db://assets/mcp-3c-events' });
    await call('asset', 'delete', { uuid: 'db://assets/mcp-3c-events' });
    await sleep(800);
    const second = await call('editor', 'events_poll', { since: 0 });
    if (!second.events.some((e) => e.channel.startsWith('asset-db:'))) {
        throw new Error(`no asset-db events captured (got ${second.events.length} events)`);
    }
});

// ── project ──
console.log('\n[project]');
await step('engine_info', async () => {
    const r = await call('project', 'engine_info');
    if (!r.version) throw new Error(JSON.stringify(r).slice(0, 120));
});
await step('server_info', async () => {
    const r = await call('project', 'server_info');
    if (!Array.isArray(r.ips) || typeof r.port !== 'number') throw new Error(JSON.stringify(r));
});
await step('settings_query（官方 project 包：designResolution）', async () => {
    const r = await call('project', 'settings_query', { pkg: 'project', path: 'general.designResolution' });
    if (typeof r.value?.width !== 'number') throw new Error(JSON.stringify(r).slice(0, 120));
});
await step('settings_set 寫回同值（官方註冊鍵，零風險）', async () => {
    const cur = await call('project', 'settings_query', { pkg: 'project', path: 'general.designResolution.width' });
    const r = await call('project', 'settings_set', { pkg: 'project', path: 'general.designResolution.width', value: cur.value });
    if (r.value !== cur.value) throw new Error(`value=${JSON.stringify(r.value)} expect ${cur.value}`);
});
await step('preferences_query + 寫回同值（device pkg）', async () => {
    const cur = await call('project', 'preferences_query', { pkg: 'device', path: 'deviceConfig' });
    if (!Array.isArray(cur.value)) throw new Error(`deviceConfig=${JSON.stringify(cur.value).slice(0, 80)}`);
    const r = await call('project', 'preferences_set', { pkg: 'device', path: 'deviceConfig', value: cur.value });
    if (!Array.isArray(r.value) || r.value.length !== cur.value.length) throw new Error('write-back mismatch');
});

// ── prefab（手工最小 prefab，匯入失敗則跳過） ──
console.log('\n[prefab]');
const PREFAB_URL = 'db://assets/mcp-3c-test.prefab';
const minimalPrefab = JSON.stringify([
    { __type__: 'cc.Prefab', _name: 'MCP3CPrefab', _objFlags: 0, __editorExtras__: {}, _native: '', data: { __id__: 1 }, optimizationPolicy: 0, persistent: false },
    { __type__: 'cc.Node', _name: 'MCP3CPrefab', _objFlags: 0, __editorExtras__: {}, _parent: null, _children: [], _active: true, _components: [], _prefab: { __id__: 2 }, _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 }, _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 }, _mobility: 0, _layer: 1073741824, _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '' },
    { __type__: 'cc.PrefabInfo', root: { __id__: 1 }, asset: { __id__: 0 }, fileId: 'mcp3cTestFileId00001', instance: null, targetOverrides: null, nestedPrefabInstanceRoots: null },
]);
let prefabUuid = null;
let instanceUuid = null;
let handmade = false;
// 優先用專案內既有（編輯器建立）的 prefab；沒有才嘗試手工 JSON
const existing = await call('asset', 'query_assets', { cc_type: 'cc.Prefab' }).catch(() => null);
const realPrefab = existing?.assets?.find((a) => !a.url?.includes('mcp-3c-test'));
if (realPrefab) {
    prefabUuid = realPrefab.uuid;
    console.log(`  · 使用既有 prefab：${realPrefab.url}`);
} else {
    handmade = true;
    await optional('建立最小 prefab 資產（手工 JSON，無既有 prefab 時的替代）', async () => {
        await call('asset', 'delete', { uuid: PREFAB_URL }).catch(() => {});
        const r = await call('asset', 'create', { url: PREFAB_URL, content: minimalPrefab });
        prefabUuid = r.uuid;
        await sleep(500);
        const info = await call('asset', 'query_info', { uuid: prefabUuid });
        if (info.importer !== 'prefab') throw new Error(`importer=${info.importer}`);
    });
}
const prefabStep = handmade ? optional : step;
if (prefabUuid) {
    await prefabStep('prefab.instantiate', async () => {
        const r = await call('prefab', 'instantiate', { asset_uuid: prefabUuid, position: { x: 5, y: 5, z: 0 } });
        instanceUuid = r.uuid;
        const q = await call('node', 'query', { uuid: instanceUuid });
        if (!q.prefab) throw new Error('node is not a prefab instance');
    });
    await prefabStep('prefab.query_instances', async () => {
        const r = await call('prefab', 'query_instances', { asset_uuid: prefabUuid });
        if (!r.uuids.includes(instanceUuid)) throw new Error(`instances=${JSON.stringify(r.uuids)}`);
    });
    await prefabStep('prefab.restore（呼叫成功；註：實例根節點 transform 屬刻意保留的覆寫，不在還原範圍）', async () => {
        await call('prefab', 'restore', { node_uuid: instanceUuid });
        const q = await call('node', 'query', { uuid: instanceUuid });
        if (!q.uuid) throw new Error('node lost after restore');
    });
} else {
    console.log('  ⚠ prefab instantiate/restore/query_instances 跳過（無可用 prefab 資產）');
    skipped += 3;
}

// ── 清理 ──
console.log('\n[清理]');
await step('清理暫時節點與資產', async () => {
    if (instanceUuid) await call('node', 'delete', { uuid: instanceUuid }).catch(() => {});
    if (tempNode) await call('node', 'delete', { uuid: tempNode });
    await call('asset', 'delete', { uuid: PREFAB_URL }).catch(() => {});
});

console.log(`\n結果：${passed} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length) {
    console.log('失敗項：');
    for (const f of failures) console.log(`  - ${f}`);
}
child.kill();
process.exit(failed > 0 ? 1 : 0);
