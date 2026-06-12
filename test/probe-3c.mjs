/** 3C 失敗點探查：熱重載後測 prefab type 參數 + 官方 pkg 設定讀取內容 */
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const child = spawn(process.execPath, [join(ROOT, 'dist-sidecar/index.js'), '--project', '/Users/tai/test_cocos_mcp'], { stdio: ['pipe', 'pipe', 'ignore'] });
let buf = ''; const pending = new Map(); let id = 0;
child.stdout.on('data', (c) => { buf += c; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; try { const m = JSON.parse(line); if (pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } } catch {} } });
const rpc = (method, params) => new Promise((res, rej) => { const n = ++id; setTimeout(() => rej(new Error('timeout ' + method)), 20000); pending.set(n, res); child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n'); });
async function call(tool, action, args = {}) {
    const r = await rpc('tools/call', { name: tool, arguments: { action, ...args } });
    const text = r.result?.content?.[0]?.text ?? '';
    return { err: Boolean(r.result?.isError), text, json: (() => { try { return JSON.parse(text); } catch { return null; } })() };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await rpc('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'probe', version: '0' } });
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

console.log('reload:', (await call('dev', 'reload_tools')).text.replace(/\s+/g, ' ').slice(0, 80));

// ── prefab with type ──
console.log('\n=== prefab（含 type 參數） ===');
const PREFAB_URL = 'db://assets/mcp-probe.prefab';
const minimalPrefab = JSON.stringify([
    { __type__: 'cc.Prefab', _name: 'MCPProbe', _objFlags: 0, __editorExtras__: {}, _native: '', data: { __id__: 1 }, optimizationPolicy: 0, persistent: false },
    { __type__: 'cc.Node', _name: 'MCPProbe', _objFlags: 0, __editorExtras__: {}, _parent: null, _children: [], _active: true, _components: [], _prefab: { __id__: 2 }, _lpos: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _lrot: { __type__: 'cc.Quat', x: 0, y: 0, z: 0, w: 1 }, _lscale: { __type__: 'cc.Vec3', x: 1, y: 1, z: 1 }, _mobility: 0, _layer: 1073741824, _euler: { __type__: 'cc.Vec3', x: 0, y: 0, z: 0 }, _id: '' },
    { __type__: 'cc.PrefabInfo', root: { __id__: 1 }, asset: { __id__: 0 }, fileId: 'mcpProbeFileId000001', instance: null, targetOverrides: null, nestedPrefabInstanceRoots: null },
]);
await call('asset', 'delete', { uuid: PREFAB_URL });
const created = await call('asset', 'create', { url: PREFAB_URL, content: minimalPrefab });
const prefabUuid = created.json?.uuid;
await sleep(500);
const inst = await call('prefab', 'instantiate', { asset_uuid: prefabUuid });
console.log('instantiate:', inst.err ? 'ERR ' + inst.text.slice(0, 150) : inst.text);
if (!inst.err) {
    const nodeUuid = inst.json.uuid;
    const raw = await call('node', 'query', { uuid: nodeUuid, raw: true });
    const dump = raw.json;
    console.log('__prefab__ 形狀:', JSON.stringify(dump?.__prefab__ ?? null).slice(0, 300));
    const insts = await call('prefab', 'query_instances', { asset_uuid: prefabUuid });
    console.log('query_instances:', insts.text);
    await call('node', 'delete', { uuid: nodeUuid });
}
await call('asset', 'delete', { uuid: PREFAB_URL });

// ── 官方 pkg 設定內容 ──
console.log('\n=== 設定讀取（官方 pkg） ===');
const proj = await call('project', 'settings_query', { pkg: 'project' });
console.log('project/project:', proj.text.replace(/\s+/g, ' ').slice(0, 200));
const eng = await call('project', 'settings_query', { pkg: 'engine', path: 'modules.includeModules' });
console.log('engine modules.includeModules:', eng.text.replace(/\s+/g, ' ').slice(0, 200));
const gen = await call('project', 'preferences_query', { pkg: 'general' });
console.log('preferences/general:', gen.text.replace(/\s+/g, ' ').slice(0, 300));

child.kill();
process.exit(0);
