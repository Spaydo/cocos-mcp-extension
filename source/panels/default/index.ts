import { readFileSync } from 'fs';
import { join } from 'path';

let pollInterval: ReturnType<typeof setInterval> | null = null;

module.exports = Editor.Panel.define({
    listeners: {
        show() {},
        hide() {},
    },

    template: readFileSync(join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),

    $: {
        port: '#port-input',
        toggle: '#server-toggle',
        autoStart: '#auto-start',
        statusDot: '#status-dot',
        statusText: '#status-text',
        serverUrl: '#server-url',
        logs: '#logs',
    },

    methods: {
        updateStatus(status: { running: boolean; port: number; tools: number }) {
            if (!this.$.statusDot || !this.$.statusText || !this.$.serverUrl) return;

            if (status.running) {
                this.$.statusDot.className = 'status-dot running';
                this.$.statusText.textContent = `Running (${status.tools} tools)`;
                this.$.serverUrl.textContent = `http://localhost:${status.port}/mcp`;
                this.$.serverUrl.style.display = 'block';
            } else {
                this.$.statusDot.className = 'status-dot stopped';
                this.$.statusText.textContent = 'Stopped';
                this.$.serverUrl.style.display = 'none';
            }
        },

        appendLog(message: string) {
            if (!this.$.logs) return;
            const line = document.createElement('div');
            line.className = 'log-line';
            const time = new Date().toLocaleTimeString();
            line.textContent = `[${time}] ${message}`;
            this.$.logs.appendChild(line);
            this.$.logs.scrollTop = this.$.logs.scrollHeight;

            // Keep max 100 lines
            while (this.$.logs.children.length > 100) {
                this.$.logs.removeChild(this.$.logs.firstChild!);
            }
        },
    },

    ready() {
        // Server toggle
        if (this.$.toggle) {
            this.$.toggle.addEventListener('confirm', async () => {
                const checked = (this.$.toggle as any).value;
                if (checked) {
                    const result = await Editor.Message.request('cocos-mcp-extension', 'start-server');
                    if (!result.success) {
                        (this.$.toggle as any).value = false;
                        this.appendLog(`Start failed: ${result.error}`);
                    } else {
                        this.appendLog('Server started');
                    }
                } else {
                    await Editor.Message.request('cocos-mcp-extension', 'stop-server');
                    this.appendLog('Server stopped');
                }
            });
        }

        // Port input
        if (this.$.port) {
            this.$.port.addEventListener('confirm', async () => {
                const port = Number((this.$.port as any).value);
                if (port > 0 && port < 65536) {
                    const autoStart = (this.$.autoStart as any)?.value ?? false;
                    await Editor.Message.request('cocos-mcp-extension', 'update-settings', {
                        port,
                        autoStart,
                        enableDebugLog: false,
                    });
                    this.appendLog(`Port updated to ${port}`);
                }
            });
        }

        // Auto-start checkbox
        if (this.$.autoStart) {
            this.$.autoStart.addEventListener('confirm', async () => {
                const autoStart = (this.$.autoStart as any).value;
                const port = Number((this.$.port as any)?.value) || 3000;
                await Editor.Message.request('cocos-mcp-extension', 'update-settings', {
                    port,
                    autoStart,
                    enableDebugLog: false,
                });
                this.appendLog(`Auto-start ${autoStart ? 'enabled' : 'disabled'}`);
            });
        }

        // Poll server status every 3 seconds
        const pollStatus = async () => {
            try {
                const status = await Editor.Message.request('cocos-mcp-extension', 'get-server-status');
                this.updateStatus(status);
                if (this.$.toggle) {
                    (this.$.toggle as any).value = status.running;
                }
                if (this.$.port) {
                    (this.$.port as any).value = status.port;
                }
                if (this.$.autoStart) {
                    (this.$.autoStart as any).value = status.autoStart;
                }
            } catch {
                // Extension might not be ready yet
            }
        };

        pollStatus();
        pollInterval = setInterval(pollStatus, 3000);
    },

    beforeClose() {},

    close() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    },
});
