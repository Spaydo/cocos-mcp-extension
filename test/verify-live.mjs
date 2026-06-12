/**
 * 實機驗證：以使用者註冊的 bootstrap 指令原樣啟動 sidecar（cwd = 專案），
 * 走 MCP stdio 協議對「正在運行的編輯器」呼叫 project.info 與 scene.query_ready。
 * 用法：node test/verify-live.mjs [專案路徑]
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = process.argv[2] ?? join(ROOT, '..', '..');
const { BOOTSTRAP_SCRIPT } = require(join(ROOT, 'dist/bootstrap-command.js'));

const child = spawn(process.execPath, ['-e', BOOTSTRAP_SCRIPT], {
    cwd: PROJECT,
    stdio: ['pipe', 'pipe', 'pipe'],
});
child.stderr.on('data', (c) => console.error('[sidecar stderr]', c.toString().trim()));

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

function request(method, params) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout: ${method}`)), 15000);
        pending.set(id, (msg) => {
            clearTimeout(timer);
            resolve(msg);
        });
        child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
}

const init = await request('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'verify-live', version: '0' },
});
console.log('initialize →', init.result?.serverInfo);
child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

const list = await request('tools/list', {});
console.log('tools/list →', list.result.tools.map((t) => t.name).join(', '));

const info = await request('tools/call', { name: 'project', arguments: { action: 'info' } });
console.log('project.info →', info.result.isError ? 'ERROR' : 'OK');
console.log(info.result.content[0].text);

const ready = await request('tools/call', { name: 'scene', arguments: { action: 'query_ready' } });
console.log('scene.query_ready →', ready.result.isError ? 'ERROR' : 'OK', ready.result.content[0].text);

child.kill();
process.exit(0);
