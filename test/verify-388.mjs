/**
 * 3.8.8 專用驗證：版本能力旗標 + 3.8.8 特有 API 路徑。
 * 用法：node test/verify-388.mjs <3.8.8 專案路徑>
 * 前置：3.8.8 編輯器開啟該專案、擴展 bridge Running。
 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = process.argv[2];
if (!PROJECT) {
    console.error('用法：node test/verify-388.mjs <3.8.8 專案路徑>');
    process.exit(1);
}

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'verify-388', version: '0' } });
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

console.log('\n[3.8.8 環境與能力旗標]');
const info = await step('project.info：editor 為 3.8.8、內建 Node 20', async () => {
    const r = await call('project', 'info');
    console.log(`    editor=${r.editor.version} node=${r.editor.node} electron=${r.editor.electron}`);
    if (!String(r.editor.version).startsWith('3.8.8')) throw new Error(`version=${r.editor.version}（不是 3.8.8 編輯器）`);
    if (!String(r.editor.node).startsWith('20')) throw new Error(`node=${r.editor.node}`);
    return r;
});
await step('capabilities 旗標全部為 3.8.8 模式', async () => {
    const c = info?.capabilities;
    if (!c) throw new Error('no capabilities');
    console.log(`    ${JSON.stringify(c)}`);
    const expect = {
        createNodeReturnsString: true,
        assetUsersPublic: true,
        multiScene: true,
        autoAdaptToCreate: true,
        saveAsSceneNeedsFlag: false,
    };
    for (const [k, v] of Object.entries(expect)) {
        if (c[k] !== v) throw new Error(`${k}=${c[k]}，預期 ${v}`);
    }
});

console.log('\n[3.8.8 差異路徑]');
let nodeUuid = null;
await step('node.create（3.8.8 原生回 string 的正規化路徑）', async () => {
    const r = await call('node', 'create', { name: 'MCP_388_Test', position: { x: 1, y: 2, z: 3 } });
    nodeUuid = r.uuid;
    if (typeof nodeUuid !== 'string' || !nodeUuid) throw new Error(`uuid=${JSON.stringify(nodeUuid)}`);
    // 3.8.8 偶發：create 回傳後極短時間內 query-node 可能還查不到 → 重試一次
    let q;
    try {
        q = await call('node', 'query', { uuid: nodeUuid });
    } catch {
        await sleep(400);
        q = await call('node', 'query', { uuid: nodeUuid });
    }
    if (Math.abs(q.position.x - 1) > 0.01) throw new Error(`pos=${JSON.stringify(q.position)}`);
});
await step('node.query_tree（3.8.8 result INode 正規化）', async () => {
    const tree = await call('node', 'query_tree', { depth: 1 });
    if (!tree?.uuid) throw new Error(JSON.stringify(tree).slice(0, 100));
});

const TEST_DIR = 'db://assets/mcp-388-test';
let noteUuid = null;
await step('asset 建立（供依賴查詢用）', async () => {
    await call('asset', 'delete', { uuid: TEST_DIR }).catch(() => {});
    await call('asset', 'create_folder', { url: TEST_DIR });
    const r = await call('asset', 'create', { url: `${TEST_DIR}/note.md`, content: '# 388' });
    noteUuid = r.uuid;
    if (!noteUuid) throw new Error('no uuid');
});
await step('asset.query_users（3.8.8 公開 API 路徑，回陣列）', async () => {
    const r = await call('asset', 'query_users', { uuid: noteUuid });
    if (!Array.isArray(r.users)) throw new Error(JSON.stringify(r));
});
await step('asset.query_dependencies（3.8.8 公開 API 路徑，回陣列）', async () => {
    const r = await call('asset', 'query_dependencies', { uuid: noteUuid });
    if (!Array.isArray(r.dependencies)) throw new Error(JSON.stringify(r));
});
await step('asset.move（3.8.8 回傳行為確認）', async () => {
    await call('asset', 'copy', { source: `${TEST_DIR}/note.md`, target: `${TEST_DIR}/copy.md` });
    const r = await call('asset', 'move', { source: `${TEST_DIR}/copy.md`, target: `${TEST_DIR}/moved.md` });
    if (!r || (!r.uuid && !r.url)) throw new Error(`move result=${JSON.stringify(r)}`);
});

console.log('\n[清理]');
await step('清理測試節點與資產', async () => {
    if (nodeUuid) await call('node', 'delete', { uuid: nodeUuid });
    await call('asset', 'delete', { uuid: TEST_DIR });
});

// scene.save 放最後（open 會切換場景，避免影響前面步驟的清理）
console.log('\n[scene.save（3.8.8 回場景 uuid）]');
{
    // 只能存 db://assets/ 下的場景；db://internal/ 為唯讀。逐一轉 url 過濾。
    const scenes = await call('asset', 'query_assets', { cc_type: 'cc.SceneAsset' }).catch(() => null);
    const candidates = [];
    for (const a of (scenes?.assets ?? []).slice(0, 5)) {
        try {
            const u = (await call('asset', 'convert', { value: a.uuid, to: 'url' })).url;
            candidates.push({ uuid: a.uuid, url: u });
        } catch { /* ignore */ }
    }
    let pick = candidates.find((s) => s.url.startsWith('db://assets/'));
    let createdSceneUrl = null;
    if (!pick && candidates.length > 0) {
        // 專案內無可寫場景 → 從內建場景複製一份到 assets（結束刪除）
        createdSceneUrl = 'db://assets/mcp-388-scene.scene';
        await call('asset', 'delete', { uuid: createdSceneUrl }).catch(() => {});
        const copied = await call('asset', 'copy', { source: candidates[0].url, target: createdSceneUrl });
        pick = { uuid: copied.uuid, url: createdSceneUrl };
        await sleep(500);
    }
    if (pick) {
        await step(`開啟並儲存場景（${pick.url}，save 應回 uuid）`, async () => {
            await call('scene', 'open', { uuid: pick.uuid });
            await sleep(1500);
            const r = await call('scene', 'save');
            console.log(`    save → ${JSON.stringify(r)}`);
            if (!r.saved) throw new Error(JSON.stringify(r));
            // 3.8.8 應回傳場景 uuid（adapter 統一為 {saved, uuid}）
            if (!r.uuid) throw new Error('3.8.8 預期回傳場景 uuid，但 uuid 為空');
        });
        if (createdSceneUrl) {
            await step('關閉場景後刪除測試場景資產', async () => {
                // 先 close 再刪：刪除「開啟中場景」的資產會讓編輯器自動生成恢復檔（scene.scene）
                await call('scene', 'close');
                await sleep(500);
                await call('asset', 'delete', { uuid: createdSceneUrl });
            });
        }
    } else {
        console.log('  ⚠ 找不到任何場景資產，跳過 save 測試');
        skipped++;
    }
}

console.log(`\n結果：${passed} passed, ${failed} failed, ${skipped} skipped`);
if (failures.length) {
    console.log('失敗項：');
    for (const f of failures) console.log(`  - ${f}`);
}
child.kill();
process.exit(failed > 0 ? 1 : 0);
