import { readFileSync } from 'fs';
import { join } from 'path';

let pollInterval: ReturnType<typeof setInterval> | null = null;

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
    scene: 'Scene management & hierarchy',
    node: 'Node CRUD & properties',
    component: 'Component management',
    asset: 'Asset query, create & import',
    prefab: 'Prefab instantiate & create',
    project: 'Project info, build & preview',
    debug: 'Logs & script execution',
    scene_view: 'Gizmo, camera & view control',
    editor: 'Editor preferences & info',
    reference_image: 'Reference image overlay',
    animation: 'Animation clip control',
};

const CORE_CATEGORIES = ['scene', 'node', 'component', 'asset', 'prefab', 'project', 'debug'];

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
        coreCategories: '#core-categories',
        advancedCategories: '#advanced-categories',
        selectAll: '#select-all',
        deselectAll: '#deselect-all',
        toolCount: '#tool-count',
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

        buildCategoryRows(categories: { category: string; toolCount: number; enabled: boolean }[], enabledCategories: Record<string, boolean>) {
            if (!this.$.coreCategories || !this.$.advancedCategories) return;

            // Clear existing
            this.$.coreCategories.innerHTML = '';
            this.$.advancedCategories.innerHTML = '';

            let totalEnabled = 0;
            let totalTools = 0;

            for (const cat of categories) {
                const isCore = CORE_CATEGORIES.includes(cat.category);
                const container = isCore ? this.$.coreCategories : this.$.advancedCategories;
                const enabled = enabledCategories[cat.category] !== false;

                const row = document.createElement('div');
                row.className = 'category-row';

                const checkbox = document.createElement('ui-checkbox') as any;
                checkbox.value = enabled;
                checkbox.setAttribute('data-category', cat.category);

                const name = document.createElement('span');
                name.className = 'category-name';
                name.textContent = cat.category;

                const count = document.createElement('span');
                count.className = 'category-tool-count';
                count.textContent = String(cat.toolCount);

                const desc = document.createElement('span');
                desc.className = 'category-desc';
                desc.textContent = CATEGORY_DESCRIPTIONS[cat.category] || '';

                row.appendChild(checkbox);
                row.appendChild(name);
                row.appendChild(count);
                row.appendChild(desc);
                container.appendChild(row);

                if (enabled) {
                    totalEnabled += cat.toolCount;
                }
                totalTools += cat.toolCount;

                // Listen for toggle
                checkbox.addEventListener('confirm', async () => {
                    const checked = checkbox.value;
                    await this.toggleCategory(cat.category, checked);
                });
            }

            if (this.$.toolCount) {
                this.$.toolCount.textContent = `${totalEnabled} / ${totalTools} tools enabled`;
            }
        },

        async toggleCategory(category: string, enabled: boolean) {
            try {
                const status = await Editor.Message.request('cocos-mcp-extension', 'get-server-status');
                const settings = {
                    port: status.port,
                    autoStart: status.autoStart,
                    enableDebugLog: false,
                    enabledCategories: { ...status.enabledCategories, [category]: enabled },
                };
                await Editor.Message.request('cocos-mcp-extension', 'update-settings', settings);
                this.appendLog(`${category} ${enabled ? 'enabled' : 'disabled'}`);
                // Refresh categories display
                await this.refreshCategories();
            } catch (err: any) {
                this.appendLog(`Failed to toggle ${category}: ${err.message}`);
            }
        },

        async setAllCategories(enabled: boolean) {
            try {
                const status = await Editor.Message.request('cocos-mcp-extension', 'get-server-status');
                const enabledCategories: Record<string, boolean> = {};
                for (const key of Object.keys(status.enabledCategories)) {
                    enabledCategories[key] = enabled;
                }
                const settings = {
                    port: status.port,
                    autoStart: status.autoStart,
                    enableDebugLog: false,
                    enabledCategories,
                };
                await Editor.Message.request('cocos-mcp-extension', 'update-settings', settings);
                this.appendLog(enabled ? 'All categories enabled' : 'All categories disabled');
                await this.refreshCategories();
            } catch (err: any) {
                this.appendLog(`Failed: ${err.message}`);
            }
        },

        async refreshCategories() {
            try {
                const categories = await Editor.Message.request('cocos-mcp-extension', 'get-categories');
                const status = await Editor.Message.request('cocos-mcp-extension', 'get-server-status');
                this.buildCategoryRows(categories, status.enabledCategories);
                this.updateStatus(status);
            } catch {
                // Extension might not be ready
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
                    const status = await Editor.Message.request('cocos-mcp-extension', 'get-server-status');
                    await Editor.Message.request('cocos-mcp-extension', 'update-settings', {
                        port,
                        autoStart: status.autoStart,
                        enableDebugLog: false,
                        enabledCategories: status.enabledCategories,
                    });
                    this.appendLog(`Port updated to ${port}`);
                }
            });
        }

        // Auto-start checkbox
        if (this.$.autoStart) {
            this.$.autoStart.addEventListener('confirm', async () => {
                const autoStart = (this.$.autoStart as any).value;
                const status = await Editor.Message.request('cocos-mcp-extension', 'get-server-status');
                await Editor.Message.request('cocos-mcp-extension', 'update-settings', {
                    port: status.port,
                    autoStart,
                    enableDebugLog: false,
                    enabledCategories: status.enabledCategories,
                });
                this.appendLog(`Auto-start ${autoStart ? 'enabled' : 'disabled'}`);
            });
        }

        // Select All / Deselect All buttons
        if (this.$.selectAll) {
            this.$.selectAll.addEventListener('click', () => {
                this.setAllCategories(true);
            });
        }
        if (this.$.deselectAll) {
            this.$.deselectAll.addEventListener('click', () => {
                this.setAllCategories(false);
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

        // Initial load: populate categories
        this.refreshCategories();

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
