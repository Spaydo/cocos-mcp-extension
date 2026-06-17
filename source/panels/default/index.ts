/**
 * 狀態面板：bridge 狀態、開關、可複製的 MCP 設定指令。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { buildCommandForPlatform } from '../../bootstrap-command';

interface PanelStatus {
    running: boolean;
    port: number | null;
    projectPath: string;
    editorVersion: string;
    toolCount: number;
    sidecarEntry: string;
    depsInstalled: boolean;
}

interface InstallResult {
    ok: boolean;
    code: number | null;
    tail: string;
}

const PKG = 'cocos-mcp-extension';

let refreshTimer: ReturnType<typeof setInterval> | null = null;

function platformLabel(): string {
    switch (process.platform) {
        case 'darwin':
            return 'macOS（zsh / bash）';
        case 'win32':
            return 'Windows（請用 PowerShell）';
        default:
            return process.platform;
    }
}

async function copyText(value: string): Promise<void> {
    (Editor.Clipboard as any).write('text', value);
}

module.exports = Editor.Panel.define({
    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
    $: {
        status: '#status',
        detail: '#detail',
        btnStart: '#btn-start',
        btnStop: '#btn-stop',
        platform: '#platform',
        cmd: '#cmd',
        config: '#config',
        btnInstall: '#btn-install',
        installStatus: '#install-status',
        installLog: '#install-log',
        btnCopyCmd: '#btn-copy-cmd',
        btnCopyJson: '#btn-copy-json',
        copiedCmd: '#copied-cmd',
        copiedJson: '#copied-json',
    },
    methods: {
        async refresh() {
            try {
                const status = (await Editor.Message.request(PKG, 'get-server-status')) as PanelStatus;
                this.applyStatus(status);
            } catch (err) {
                console.warn('[cocos-mcp] panel refresh failed:', err);
            }
        },
        applyStatus(status: PanelStatus) {
            const statusEl = this.$.status as HTMLElement | null;
            const detailEl = this.$.detail as HTMLElement | null;
            const platformEl = this.$.platform as HTMLElement | null;
            const cmdEl = this.$.cmd as HTMLElement | null;
            const configEl = this.$.config as HTMLElement | null;
            if (statusEl) {
                statusEl.textContent = status.running
                    ? `● Running (127.0.0.1:${status.port})`
                    : '○ Stopped';
                statusEl.className = status.running ? 'status running' : 'status stopped';
            }
            if (detailEl) {
                detailEl.textContent =
                    `Editor ${status.editorVersion} · ${status.toolCount} tools · ${status.projectPath}`;
            }
            if (platformEl) {
                platformEl.textContent = platformLabel();
            }
            if (cmdEl) {
                cmdEl.textContent = buildCommandForPlatform(process.platform);
            }
            // Reflect dep-install state, unless an install is in flight (don't clobber 安裝中…).
            const installStatusEl = this.$.installStatus as HTMLElement | null;
            if (installStatusEl && !(this as any)._installing) {
                installStatusEl.textContent = status.depsInstalled ? '已安裝 ✓' : '尚未安裝';
                installStatusEl.className = status.depsInstalled ? 'copied' : 'copied warn';
            }
            if (configEl) {
                const config = {
                    mcpServers: {
                        cocos: {
                            command: 'node',
                            args: [status.sidecarEntry, '--project', status.projectPath],
                        },
                    },
                };
                configEl.textContent = JSON.stringify(config, null, 2);
            }
        },
        flashCopied(el: HTMLElement | null) {
            if (!el) return;
            el.textContent = '已複製 ✓';
            setTimeout(() => {
                el.textContent = '';
            }, 1500);
        },
    },
    ready() {
        const self = this as any;
        const btnStart = this.$.btnStart as HTMLElement | null;
        const btnStop = this.$.btnStop as HTMLElement | null;
        const btnInstall = this.$.btnInstall as HTMLElement | null;
        const btnCopyCmd = this.$.btnCopyCmd as HTMLElement | null;
        const btnCopyJson = this.$.btnCopyJson as HTMLElement | null;
        if (btnStart) {
            btnStart.addEventListener('confirm', async () => {
                await Editor.Message.request(PKG, 'start-server');
                await self.refresh();
            });
        }
        if (btnStop) {
            btnStop.addEventListener('confirm', async () => {
                await Editor.Message.request(PKG, 'stop-server');
                await self.refresh();
            });
        }
        if (btnInstall) {
            btnInstall.addEventListener('confirm', async () => {
                const statusSpan = this.$.installStatus as HTMLElement | null;
                const logEl = this.$.installLog as HTMLElement | null;
                self._installing = true;
                if (statusSpan) { statusSpan.textContent = '安裝中…（請稍候，會連網下載）'; statusSpan.className = 'copied warn'; }
                if (logEl) { logEl.style.display = 'none'; logEl.textContent = ''; }
                try {
                    const r = (await Editor.Message.request(PKG, 'install-deps')) as InstallResult;
                    if (r.ok) {
                        if (statusSpan) { statusSpan.textContent = '已安裝 ✓'; statusSpan.className = 'copied'; }
                    } else {
                        if (statusSpan) { statusSpan.textContent = `安裝失敗 (code ${r.code})`; statusSpan.className = 'copied err'; }
                        if (logEl && r.tail) { logEl.style.display = ''; logEl.textContent = r.tail; }
                    }
                } catch (err) {
                    if (statusSpan) { statusSpan.textContent = '安裝失敗'; statusSpan.className = 'copied err'; }
                    if (logEl) { logEl.style.display = ''; logEl.textContent = String(err); }
                } finally {
                    self._installing = false;
                    await self.refresh();
                }
            });
        }
        if (btnCopyCmd) {
            btnCopyCmd.addEventListener('confirm', async () => {
                const text = (this.$.cmd as HTMLElement | null)?.textContent ?? '';
                await copyText(text);
                self.flashCopied(this.$.copiedCmd as HTMLElement | null);
            });
        }
        if (btnCopyJson) {
            btnCopyJson.addEventListener('confirm', async () => {
                const text = (this.$.config as HTMLElement | null)?.textContent ?? '';
                await copyText(text);
                self.flashCopied(this.$.copiedJson as HTMLElement | null);
            });
        }
        self.refresh();
        refreshTimer = setInterval(() => self.refresh(), 3000);
    },
    close() {
        if (refreshTimer) {
            clearInterval(refreshTimer);
            refreshTimer = null;
        }
    },
});
