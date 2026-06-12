/**
 * 3B 實機驗證：對「正在運行的編輯器」跑完整工作流。
 * 用法：node test/verify-3b.mjs [專案路徑]
 * 前置：編輯器開啟、擴展已重新載入（工具數應為 5）。
 * 安全性：節點建立在測試根節點下、資產建立在 db://assets/mcp-test 下，結束全部清理；不儲存場景。
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

/** 呼叫工具並解析回傳 JSON；isError 時丟出 */
async function call(tool, action, args = {}) {
    const res = await rpc('tools/call', { name: tool, arguments: { action, ...args } });
    const text = res.result?.content?.[0]?.text ?? '';
    if (res.result?.isError) {
        throw new Error(`${tool}.${action}: ${text}`);
    }
    try { return JSON.parse(text); } catch { return text; }
}

let passed = 0;
let failed = 0;
const failures = [];
async function step(name, fn) {
    try {
        const out = await fn();
        passed++;
        console.log(`  ✓ ${name}`);
        return out;
    } catch (err) {
        failed++;
        failures.push(`${name}: ${err.message}`);
        console.log(`  ✗ ${name} — ${err.message}`);
        return null;
    }
}
const approx = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

// ── 初始化 ──
await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'verify-3b', version: '0' },
});
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

console.log('\n[工具目錄]');
const tools = await step('tools/list 回 6 個工具', async () => {
    const res = await rpc('tools/list', {});
    const names = res.result.tools.map((t) => t.name).sort();
    if (names.join(',') !== 'asset,component,dev,node,project,scene') {
        throw new Error(`got: ${names.join(',')}（擴展可能尚未重新載入）`);
    }
    return names;
});
if (!tools) {
    console.log('\n工具目錄不對，中止。請重新載入編輯器擴展後再跑。');
    child.kill();
    process.exit(1);
}

console.log('\n[基礎]');
await step('project.info', async () => {
    const r = await call('project', 'info');
    if (!r.editor?.version) throw new Error('no editor version');
});
await step('scene.query_ready = true', async () => {
    const r = await call('scene', 'query_ready');
    if (!r.ready) throw new Error('scene not ready');
});
await step('scene.query_current', async () => call('scene', 'query_current'));

// ── 資產工作流（db://assets/mcp-test 下，全程清理） ──
console.log('\n[asset 工作流]');
const TEST_DIR = 'db://assets/mcp-test';
await call('asset', 'delete', { uuid: TEST_DIR }).catch(() => {}); // 殘留清理

await step('create_folder', async () => {
    const r = await call('asset', 'create_folder', { url: TEST_DIR });
    if (!r.uuid) throw new Error('no uuid');
});
const noteUrl = `${TEST_DIR}/notes.md`;
let noteUuid = null;
await step('create（文字資產）', async () => {
    const r = await call('asset', 'create', { url: noteUrl, content: '# mcp test v1' });
    noteUuid = r.uuid;
    if (!noteUuid) throw new Error('no uuid');
});
await step('query_info', async () => {
    const r = await call('asset', 'query_info', { uuid: noteUuid });
    if (r.name !== 'notes.md') throw new Error(`name=${r.name}`);
});
await step('save（覆寫內容）', async () => call('asset', 'save', { uuid: noteUuid, content: '# mcp test v2' }));
await step('convert uuid→path→url', async () => {
    const p = await call('asset', 'convert', { value: noteUuid, to: 'path' });
    if (!p.path?.includes('mcp-test')) throw new Error('path wrong');
    const u = await call('asset', 'convert', { value: p.path, to: 'url' });
    if (u.url !== noteUrl) throw new Error(`url=${u.url}`);
});
await step('query_meta', async () => {
    const r = await call('asset', 'query_meta', { uuid: noteUrl });
    if (!r.uuid) throw new Error('no meta uuid');
});
await step('available_url（衝突避讓）', async () => {
    const r = await call('asset', 'available_url', { url: noteUrl });
    if (r.url === noteUrl) throw new Error('should differ for existing url');
});
await step('copy + move', async () => {
    await call('asset', 'copy', { source: noteUrl, target: `${TEST_DIR}/copy.md` });
    await call('asset', 'move', { source: `${TEST_DIR}/copy.md`, target: `${TEST_DIR}/renamed.md` });
});
await step('query_assets（pattern 過濾）', async () => {
    const r = await call('asset', 'query_assets', { pattern: `${TEST_DIR}/**/*` });
    if (r.total < 2) throw new Error(`total=${r.total}`);
});

// ── 節點/組件工作流（不儲存場景；結束刪除測試根節點） ──
console.log('\n[node/component 工作流]');
let rootUuid = null;
await step('node.create 測試根節點', async () => {
    const r = await call('node', 'create', { name: 'MCP_Test_Root' });
    rootUuid = r.uuid;
    if (!rootUuid) throw new Error('no uuid');
});

let childA = null;
await step('node.create 子節點（含 cc.Sprite + position）', async () => {
    const r = await call('node', 'create', {
        name: 'Child_A',
        parent: rootUuid,
        components: ['cc.Sprite'],
        position: { x: 10, y: 20, z: 0 },
    });
    childA = r.uuid;
    if (!childA) throw new Error('no uuid');
    if (!r.components.includes('cc.Sprite')) throw new Error('component not added');
});
await step('node.query 驗證 name/position/components', async () => {
    const r = await call('node', 'query', { uuid: childA });
    if (r.name !== 'Child_A') throw new Error(`name=${r.name}`);
    if (!approx(r.position.x, 10) || !approx(r.position.y, 20)) throw new Error(`pos=${JSON.stringify(r.position)}`);
    if (!r.components.some((c) => c.type === 'cc.Sprite')) throw new Error('no cc.Sprite');
});
await step('node.set_transform（rotation 45° + scale）→ 驗證', async () => {
    await call('node', 'set_transform', { uuid: childA, rotation: { x: 0, y: 0, z: 45 }, scale: { x: 2, y: 2, z: 1 } });
    const r = await call('node', 'query', { uuid: childA });
    if (!approx(r.rotation.z, 45)) throw new Error(`rotation.z=${r.rotation.z}（舊版 euler 欄位錯誤的修復驗證）`);
    if (!approx(r.scale.x, 2)) throw new Error(`scale.x=${r.scale.x}`);
});
await step('node.rename', async () => {
    await call('node', 'rename', { uuid: childA, name: 'Child_A2' });
    const r = await call('node', 'query', { uuid: childA });
    if (r.name !== 'Child_A2') throw new Error(`name=${r.name}`);
});

await step('component.list / query / set_property（color）→ 驗證', async () => {
    const list = await call('component', 'list', { node_uuid: childA });
    if (!list.components.some((c) => c.type === 'cc.Sprite')) throw new Error('list missing cc.Sprite');
    await call('component', 'set_property', {
        node_uuid: childA,
        component: 'cc.Sprite',
        property: 'color',
        value: { r: 255, g: 0, b: 0, a: 255 },
        value_type: 'cc.Color',
    });
    const q = await call('component', 'query', { node_uuid: childA, component: 'cc.Sprite' });
    const color = q.properties?.color?.value;
    if (!color || color.r !== 255 || color.g !== 0) throw new Error(`color=${JSON.stringify(color)}`);
});
await step('component.list_classes（含 cc.Sprite）', async () => {
    const r = await call('component', 'list_classes', {});
    if (!r.classes.includes('cc.Sprite')) throw new Error('cc.Sprite missing');
});
await step('component.add / reset / remove（cc.Label on root）', async () => {
    const a = await call('component', 'add', { node_uuid: rootUuid, component: 'cc.Label' });
    if (a.added.type !== 'cc.Label') throw new Error('add failed');
    await call('component', 'set_property', {
        node_uuid: rootUuid, component: 'cc.Label', property: 'string', value: 'hello', value_type: 'String',
    });
    await call('component', 'reset', { node_uuid: rootUuid, component: 'cc.Label' });
    await call('component', 'remove', { node_uuid: rootUuid, component: 'cc.Label' });
    const list = await call('component', 'list', { node_uuid: rootUuid }).catch(() => ({ components: [] }));
    if (list.components.some((c) => c.type === 'cc.Label')) throw new Error('remove failed');
});

await step('node.duplicate', async () => {
    const r = await call('node', 'duplicate', { uuid: childA });
    if (!r.uuids.length) throw new Error('no uuids');
});
await step('node.paste（copy→paste 串接修復）', async () => {
    const r = await call('node', 'paste', { uuid: childA, target: rootUuid });
    if (!r.uuids.length) throw new Error('no uuids');
});

let childB = null;
await step('node.move_sibling（移到 index 0）', async () => {
    const r = await call('node', 'create', { name: 'Child_B', parent: rootUuid });
    childB = r.uuid;
    const moved = await call('node', 'move_sibling', { uuid: childB, index: 0 });
    if (!moved.moved) throw new Error('not moved');
    const tree = await call('node', 'query_tree', { uuid: rootUuid, depth: 1 });
    if (tree.children[0]?.uuid !== childB) throw new Error('order wrong');
});
await step('node.set_parent（A 移到 B 下）', async () => {
    await call('node', 'set_parent', { uuid: childA, parent: childB });
    const r = await call('node', 'query', { uuid: childA });
    if (r.parent !== childB) throw new Error(`parent=${r.parent}`);
});
await step('scene.query_dirty = true', async () => {
    const r = await call('scene', 'query_dirty');
    if (!r.dirty) throw new Error('expected dirty');
});

// ── 清理 ──
console.log('\n[清理]');
await step('node.delete 測試根節點', async () => {
    await call('node', 'delete', { uuid: rootUuid });
    const tree = await call('node', 'query_tree', { depth: 1 });
    if ((tree.children ?? []).some((c) => c.uuid === rootUuid)) throw new Error('still in tree');
});
await step('asset.delete 測試資料夾', async () => {
    await call('asset', 'delete', { uuid: TEST_DIR });
});

console.log(`\n結果：${passed} passed, ${failed} failed`);
if (failures.length) {
    console.log('失敗項：');
    for (const f of failures) console.log(`  - ${f}`);
}
child.kill();
process.exit(failed > 0 ? 1 : 0);
