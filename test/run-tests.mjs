/**
 * 3A 自動化測試（不需要 Cocos 編輯器）：
 * 1. adapters 純函式單元測試
 * 2. BridgeServer + ToolRegistry（dist 編譯產物，注入假工具）
 * 3. Sidecar 全鏈路：真 sidecar 進程 ←MCP stdio→ ←HTTP→ 真 bridge server
 * 4. 編輯器離線情境：快取工具列表 + 明確離線錯誤
 *
 * 用法：node test/run-tests.mjs（先 npm run build）
 */
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;
function check(name, cond, extra = '') {
    if (cond) {
        passed++;
        console.log(`  ✓ ${name}`);
    } else {
        failed++;
        console.log(`  ✗ ${name}${extra ? ` — ${extra}` : ''}`);
    }
}

// ---------- 1. adapters 單元測試 ----------
console.log('\n[1] adapters');
{
    const a = require(join(ROOT, 'dist/adapters.js'));
    check('create-node: 3.8.4 string[] → string', a.normalizeCreateNodeResult(['uuid-1']) === 'uuid-1');
    check('create-node: 3.8.8 string → string', a.normalizeCreateNodeResult('uuid-2') === 'uuid-2');
    check('node-tree: 單元素陣列 → 物件', a.normalizeNodeTree([{ name: 'root' }]).name === 'root');
    check('node-tree: 物件原樣', a.normalizeNodeTree({ name: 'r' }).name === 'r');
    const list = a.normalizeComponentList(['cc.Sprite']);
    check('components: string[] → {name}[]', list.length === 1 && list[0].name === 'cc.Sprite');
    const list2 = a.normalizeComponentList([{ name: 'cc.Label', cid: 'cc.Label', path: '', assetUuid: '' }]);
    check('components: 物件陣列保留欄位', list2[0].cid === 'cc.Label');
    check('save-scene: boolean', a.normalizeSaveSceneResult(true).saved === true);
    check('save-scene: uuid string', a.normalizeSaveSceneResult('abc').uuid === 'abc');
    check('save-as-scene args: 3.8.4', JSON.stringify(a.buildSaveAsSceneArgs(true)) === '[true]');
    check('save-as-scene args: 3.8.8', JSON.stringify(a.buildSaveAsSceneArgs(false)) === '[]');
    check('uuid-list: null → []', a.normalizeUuidList(null).length === 0);
    check('uuid-list: string → [s]', a.normalizeUuidList('u1')[0] === 'u1');
    check('uuid-list: 陣列原樣', a.normalizeUuidList(['a', 'b']).length === 2);
}

// ---------- 2. BridgeServer + ToolRegistry ----------
console.log('\n[2] bridge server + registry');
const { BridgeServer } = require(join(ROOT, 'dist/bridge/server.js'));
const { ToolRegistry } = require(join(ROOT, 'dist/tools/registry.js'));
const discovery = require(join(ROOT, 'dist/bridge/discovery.js'));

const ctx = {
    env: {
        version: { major: 3, minor: 8, patch: 4, raw: '3.8.4-test' },
        capabilities: {
            createNodeReturnsString: false,
            assetUsersPublic: false,
            multiScene: false,
            autoAdaptToCreate: false,
            saveAsSceneNeedsFlag: true,
        },
    },
    settings: { port: 0, autoStart: false, requestTimeoutMs: 800 },
};

const registry = new ToolRegistry();
registry.register({
    name: 'project',
    description: 'Fake project tool for tests.',
    actions: {
        info: {
            description: 'Returns fixed info.',
            handler: async () => ({ hello: 'world', version: ctx.env.version.raw }),
        },
        echo: {
            description: 'Echo a message.',
            params: { msg: { type: 'string', description: 'Message to echo.' } },
            required: ['msg'],
            handler: async (args) => ({ echo: args.msg }),
        },
        slow: {
            description: 'Sleeps 3s to trigger timeout.',
            handler: () => new Promise((resolve) => setTimeout(() => resolve('late'), 3000)),
        },
    },
});

const bridge = new BridgeServer({
    preferredPort: 18650,
    projectPath: '/tmp/fake-project',
    editorVersion: '3.8.4-test',
    catalog: () => registry.catalog(),
    invoke: (req) => registry.invoke(req, ctx),
});

const { port, token } = await bridge.start();
check('bridge 啟動於 127.0.0.1', port >= 18650);

const base = `http://127.0.0.1:${port}`;
const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

{
    const health = await (await fetch(`${base}/health`)).json();
    check('GET /health 免驗證', health.ok === true && health.name === 'cocos-mcp-bridge');

    const unauth = await fetch(`${base}/tools`);
    check('GET /tools 無 token → 401', unauth.status === 401);

    const tools = (await (await fetch(`${base}/tools`, { headers: auth })).json()).tools;
    check('GET /tools 回 1 個工具', tools.length === 1 && tools[0].name === 'project');
    check('inputSchema 有 action enum', JSON.stringify(tools[0].inputSchema).includes('"enum"'));
    check('description 列出 actions', tools[0].description.includes('- echo:'));

    const call = async (body) =>
        (await fetch(`${base}/rpc`, { method: 'POST', headers: auth, body: JSON.stringify(body) })).json();

    const r1 = await call({ tool: 'project', action: 'info' });
    check('rpc info 成功', r1.ok === true && r1.data.hello === 'world');

    const r2 = await call({ tool: 'nope', action: 'x' });
    check('未知 tool → UNKNOWN_TOOL', r2.ok === false && r2.error.code === 'UNKNOWN_TOOL');

    const r3 = await call({ tool: 'project', action: 'nope' });
    check('未知 action → UNKNOWN_ACTION + hint', r3.ok === false && r3.error.hint.includes('info'));

    const r4 = await call({ tool: 'project', action: 'echo' });
    check('缺必填參數 → BAD_ARGS', r4.ok === false && r4.error.code === 'BAD_ARGS');

    const r5 = await call({ tool: 'project', action: 'echo', args: { msg: 'hi' } });
    check('echo 成功', r5.ok === true && r5.data.echo === 'hi');

    const r6 = await call({ tool: 'project', action: 'slow' });
    check('逾時 → TIMEOUT', r6.ok === false && r6.error.code === 'TIMEOUT');
}

// ---------- 3. sidecar 全鏈路（MCP stdio） ----------
console.log('\n[3] sidecar end-to-end (MCP stdio)');

const TMP = join(ROOT, 'test', '.tmp-project');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(TMP, 'temp'), { recursive: true });

discovery.writeBridgeInfo(TMP, {
    port,
    token,
    pid: process.pid,
    editorVersion: '3.8.4-test',
    projectPath: TMP,
    startedAt: new Date().toISOString(),
});
discovery.writeToolsCache(TMP, registry.catalog());
check('discovery 檔已寫入', existsSync(join(TMP, 'temp', 'cocos-mcp', 'bridge.json')));

class McpStdioClient {
    constructor({ args = [], cwd = undefined, rawArgs = null } = {}) {
        this.child = spawn(process.execPath, rawArgs ?? [join(ROOT, 'dist-sidecar/index.js'), ...args], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd,
        });
        this.buffer = '';
        this.pending = new Map();
        this.child.stdout.on('data', (chunk) => {
            this.buffer += chunk.toString();
            let idx;
            while ((idx = this.buffer.indexOf('\n')) >= 0) {
                const line = this.buffer.slice(0, idx).trim();
                this.buffer = this.buffer.slice(idx + 1);
                if (!line) continue;
                try {
                    const msg = JSON.parse(line);
                    if (msg.id !== undefined && this.pending.has(msg.id)) {
                        this.pending.get(msg.id)(msg);
                        this.pending.delete(msg.id);
                    }
                } catch {
                    /* 忽略非 JSON 行 */
                }
            }
        });
        this.stderr = '';
        this.child.stderr.on('data', (c) => (this.stderr += c.toString()));
        this.nextId = 1;
    }
    send(obj) {
        this.child.stdin.write(JSON.stringify(obj) + '\n');
    }
    request(method, params) {
        const id = this.nextId++;
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`MCP request timeout: ${method}`));
            }, 8000);
            this.pending.set(id, (msg) => {
                clearTimeout(timer);
                resolve(msg);
            });
            this.send({ jsonrpc: '2.0', id, method, params });
        });
    }
    async init() {
        const res = await this.request('initialize', {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '0.0.0' },
        });
        this.send({ jsonrpc: '2.0', method: 'notifications/initialized' });
        return res;
    }
    kill() {
        this.child.kill();
    }
}

{
    const client = new McpStdioClient({ args: ['--project', TMP] });
    const init = await client.init();
    check('initialize 成功', init.result && init.result.serverInfo.name === 'cocos-mcp');

    const list = await client.request('tools/list', {});
    check('tools/list 回 1 個工具', list.result.tools.length === 1 && list.result.tools[0].name === 'project');

    const call1 = await client.request('tools/call', {
        name: 'project',
        arguments: { action: 'info' },
    });
    const text1 = call1.result.content[0].text;
    check('tools/call info 成功', !call1.result.isError && text1.includes('"hello": "world"'));

    const call2 = await client.request('tools/call', {
        name: 'project',
        arguments: {},
    });
    check('缺 action → isError', call2.result.isError === true);

    const call3 = await client.request('tools/call', {
        name: 'project',
        arguments: { action: 'echo', msg: 'roundtrip' },
    });
    check('參數透傳（action 之外的欄位作為 args）', call3.result.content[0].text.includes('roundtrip'));

    client.kill();
}

// ---------- 3b. 情境 B：Claude Code 開在多專案上層根目錄 ----------
console.log('\n[3b] case B: detect project downwards from a multi-project root');
{
    const { realpathSync, writeFileSync: wf } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const CASEB = join(realpathSync(tmpdir()), 'cocos-mcp-caseb-root');
    rmSync(CASEB, { recursive: true, force: true });

    // 活專案：bridge 指向測試中真正在跑的 bridge
    const live = join(CASEB, 'my-game');
    mkdirSync(live, { recursive: true });
    wf(join(live, 'package.json'), JSON.stringify({ name: 'g', creator: { version: '3.8.4' } }));
    discovery.writeBridgeInfo(live, {
        port,
        token,
        pid: process.pid,
        editorVersion: '3.8.4-test',
        projectPath: live,
        startedAt: new Date(Date.now() - 60000).toISOString(),
    });
    discovery.writeToolsCache(live, registry.catalog());

    // 死專案：startedAt 較新但 bridge 連不上（驗證 health check 過濾）
    const dead = join(CASEB, 'old-game');
    mkdirSync(dead, { recursive: true });
    wf(join(dead, 'package.json'), JSON.stringify({ name: 'd', creator: { version: '3.8.4' } }));
    discovery.writeBridgeInfo(dead, {
        port: 1,
        token: 'dead',
        pid: 0,
        editorVersion: '3.8.4-test',
        projectPath: dead,
        startedAt: new Date().toISOString(),
    });

    const client = new McpStdioClient({ cwd: CASEB });
    await client.init();

    const list = await client.request('tools/list', {});
    check('根目錄向下偵測：tools/list 成功', list.result.tools.length === 1);

    const call = await client.request('tools/call', {
        name: 'project',
        arguments: { action: 'info' },
    });
    check('挑中活著的 bridge（略過較新但已死的）',
        !call.result.isError && call.result.content[0].text.includes('"hello": "world"'));
    check('sidecar log 顯示 detected-down-live', client.stderr.includes('detected-down-live'));

    client.kill();
    rmSync(CASEB, { recursive: true, force: true });
}

// ---------- 3c. 一鍵設定引導器（bootstrap：無固定路徑啟動 sidecar） ----------
console.log('\n[3c] bootstrap launcher (path-free universal command)');
{
    const { realpathSync, writeFileSync: wf } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { BOOTSTRAP_SCRIPT, buildUniversalCommand } = require(join(ROOT, 'dist/bootstrap-command.js'));

    check('指令不含機器路徑', !buildUniversalCommand().includes(ROOT));
    check('腳本不含單引號（shell 單引號包裹安全）', !BOOTSTRAP_SCRIPT.includes("'"));

    const BOOT = join(realpathSync(tmpdir()), 'cocos-mcp-boot-root');
    rmSync(BOOT, { recursive: true, force: true });
    const game = join(BOOT, 'my-game');
    mkdirSync(game, { recursive: true });
    wf(join(game, 'package.json'), JSON.stringify({ name: 'g', creator: { version: '3.8.4' } }));
    discovery.writeBridgeInfo(game, {
        port,
        token,
        pid: process.pid,
        editorVersion: '3.8.4-test',
        projectPath: game,
        startedAt: new Date().toISOString(),
    });
    discovery.writeToolsCache(game, registry.catalog());
    discovery.writeSidecarInfo(game, join(ROOT, 'dist-sidecar', 'index.js'), 'test');

    // 模擬使用者在多專案根目錄開 Claude Code：node -e <bootstrap>（cwd = 根目錄）
    const client = new McpStdioClient({ rawArgs: ['-e', BOOTSTRAP_SCRIPT], cwd: BOOT });
    const init = await client.init();
    check('bootstrap 啟動 sidecar 並完成握手', init.result && init.result.serverInfo.name === 'cocos-mcp');

    const list = await client.request('tools/list', {});
    check('bootstrap 模式 tools/list 成功', list.result.tools.length === 1);

    const call = await client.request('tools/call', {
        name: 'project',
        arguments: { action: 'info' },
    });
    check('bootstrap 模式 tools/call 成功',
        !call.result.isError && call.result.content[0].text.includes('"hello": "world"'));

    client.kill();
    rmSync(BOOT, { recursive: true, force: true });
}

// ---------- 3d. 過期 discovery（埠被其他編輯器接手 → token 不匹配） ----------
console.log('\n[3d] stale discovery (port owned by another editor)');
{
    const { realpathSync, writeFileSync: wf } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const STALE = join(realpathSync(tmpdir()), 'cocos-mcp-stale-root');
    rmSync(STALE, { recursive: true, force: true });
    mkdirSync(STALE, { recursive: true });
    wf(join(STALE, 'package.json'), JSON.stringify({ name: 's', creator: { version: '3.8.4' } }));
    // discovery 指向「活著的測試 bridge」但 token 是錯的（模擬埠被別的編輯器接手）
    discovery.writeBridgeInfo(STALE, {
        port,
        token: 'stale-token-from-previous-session',
        pid: 0,
        editorVersion: '3.8.4-test',
        projectPath: STALE,
        startedAt: new Date().toISOString(),
    });
    const client = new McpStdioClient({ args: ['--project', STALE] });
    await client.init();
    const call = await client.request('tools/call', {
        name: 'project',
        arguments: { action: 'info' },
    });
    check('token 不匹配 → 視為編輯器離線（非 Unauthorized 透傳）',
        call.result.isError === true &&
        call.result.content[0].text.includes('not reachable') &&
        !call.result.content[0].text.includes('Unauthorized'));
    client.kill();
    rmSync(STALE, { recursive: true, force: true });
}

// ---------- 4. 編輯器離線情境 ----------
console.log('\n[4] offline behavior');
{
    await bridge.stop();
    discovery.clearBridgeInfo(TMP);
    check('bridge.json 已清除、tools.json 保留',
        !existsSync(join(TMP, 'temp', 'cocos-mcp', 'bridge.json')) &&
        existsSync(join(TMP, 'temp', 'cocos-mcp', 'tools.json')));

    const client = new McpStdioClient({ args: ['--project', TMP] });
    await client.init();

    const list = await client.request('tools/list', {});
    check('離線時 tools/list 用快取', list.result.tools.length === 1);

    const call = await client.request('tools/call', {
        name: 'project',
        arguments: { action: 'info' },
    });
    check('離線時 tools/call 回明確錯誤',
        call.result.isError === true &&
        call.result.content[0].text.includes('not reachable'));

    client.kill();
}

rmSync(TMP, { recursive: true, force: true });

// ---------- 5. 專案路徑自動偵測 ----------
console.log('\n[5] project resolver');
{
    const { resolveProjectPath } = require(join(ROOT, 'dist-sidecar/project-resolver.js'));
    const { writeFileSync, realpathSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');

    // 必須放在 repo 外（repo 本身在真實 Cocos 專案內，會被向上偵測命中）
    const RES = join(realpathSync(tmpdir()), 'cocos-mcp-resolver-test');
    rmSync(RES, { recursive: true, force: true });
    const proj = join(RES, 'my-game');
    const nested = join(proj, 'assets', 'scripts');
    mkdirSync(nested, { recursive: true });
    writeFileSync(join(proj, 'package.json'), JSON.stringify({ name: 'g', creator: { version: '3.8.4' } }));
    const plain = join(RES, 'not-a-project');
    mkdirSync(plain, { recursive: true });

    const r1 = resolveProjectPath(['--project', proj], {}, plain);
    check('--project 參數優先', r1.projectPath === proj && r1.source === 'arg');

    const r2 = resolveProjectPath([], { COCOS_MCP_PROJECT: proj }, plain);
    check('環境變數次之', r2.projectPath === proj && r2.source === 'env');

    const r3 = resolveProjectPath([], {}, nested);
    check('專案子目錄不向上爬（fallback）', r3.projectPath === nested && r3.source === 'cwd-fallback');

    const r4 = resolveProjectPath([], {}, proj);
    check('cwd 本身是專案 → cwd-project', r4.projectPath === proj && r4.source === 'cwd-project');

    const r5 = resolveProjectPath([], {}, plain);
    check('非專案目錄 fallback 至 cwd', r5.projectPath === plain && r5.source === 'cwd-fallback');

    const { findProjectsDownwards } = require(join(ROOT, 'dist-sidecar/project-resolver.js'));
    const projB = join(RES, 'second-game');
    mkdirSync(join(projB, 'node_modules', 'fake-pkg'), { recursive: true });
    writeFileSync(join(projB, 'package.json'), JSON.stringify({ name: 'b', creator: { version: '3.8.8' } }));
    writeFileSync(
        join(projB, 'node_modules', 'fake-pkg', 'package.json'),
        JSON.stringify({ name: 'fake', creator: {} }),
    );
    const found = findProjectsDownwards(RES, 2);
    check('向下掃描找到全部專案', found.includes(proj) && found.includes(projB));
    check('向下掃描略過 node_modules', !found.some((p) => p.includes('node_modules')));

    rmSync(RES, { recursive: true, force: true });
}

console.log(`\n結果：${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
