import { readFileSync } from 'fs';
import { join } from 'path';

let pollInterval: ReturnType<typeof setInterval> | null = null;

const EXT = 'cocos-mcp-extension';

/** i18n helper with {0}, {1} placeholder support */
function t(key: string, ...args: any[]): string {
    let text = Editor.I18n.t(`${EXT}.${key}`);
    // Fallback: if translation returns key itself, use the key
    if (!text || text === `${EXT}.${key}`) text = key.split('.').pop() || key;
    for (let i = 0; i < args.length; i++) {
        text = text.replace(`{${i}}`, String(args[i]));
    }
    return text;
}

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
        toolsContainer: '#tools-container',
        selectAll: '#select-all',
        deselectAll: '#deselect-all',
        toolCount: '#tool-count',
        // Section headers & labels for i18n
        headerServer: '#header-server',
        headerTools: '#header-tools',
        headerLogs: '#header-logs',
        labelStatus: '#label-status',
        labelEnable: '#label-enable',
        labelPort: '#label-port',
        labelAutoStart: '#label-auto-start',
    },

    methods: {
        applyI18n() {
            // Section headers
            if (this.$.headerServer) this.$.headerServer.textContent = t('panel.mcp_server');
            if (this.$.headerTools) this.$.headerTools.textContent = t('panel.tools');
            if (this.$.headerLogs) this.$.headerLogs.textContent = t('panel.logs');
            // Labels
            if (this.$.labelStatus) this.$.labelStatus.textContent = t('panel.status');
            if (this.$.labelEnable) this.$.labelEnable.textContent = t('panel.enable');
            if (this.$.labelPort) this.$.labelPort.textContent = t('panel.port');
            if (this.$.labelAutoStart) this.$.labelAutoStart.textContent = t('panel.auto_start');
            // Buttons
            if (this.$.selectAll) this.$.selectAll.textContent = t('panel.select_all');
            if (this.$.deselectAll) this.$.deselectAll.textContent = t('panel.deselect_all');
            // Status default
            if (this.$.statusText) this.$.statusText.textContent = t('panel.stopped');
        },

        updateStatus(status: { running: boolean; port: number; tools: number; actions: number }) {
            if (!this.$.statusDot || !this.$.statusText || !this.$.serverUrl) return;

            if (status.running) {
                this.$.statusDot.className = 'status-dot running';
                this.$.statusText.textContent = t('panel.running', status.tools, status.actions);
                this.$.serverUrl.textContent = `http://localhost:${status.port}/mcp`;
                this.$.serverUrl.style.display = 'block';
            } else {
                this.$.statusDot.className = 'status-dot stopped';
                this.$.statusText.textContent = t('panel.stopped');
                this.$.serverUrl.style.display = 'none';
            }
        },

        buildToolRows(categories: { category: string; isCore: boolean; tools: { name: string; description: string; enabled: boolean }[] }[]) {
            if (!this.$.toolsContainer) return;
            this.$.toolsContainer.innerHTML = '';

            let totalEnabled = 0;
            let totalTools = 0;

            // Sort: core first, then advanced
            const sorted = [...categories].sort((a, b) => {
                if (a.isCore && !b.isCore) return -1;
                if (!a.isCore && b.isCore) return 1;
                return 0;
            });

            let lastIsCore: boolean | null = null;

            for (const cat of sorted) {
                // Group divider
                if (lastIsCore !== cat.isCore) {
                    const groupLabel = document.createElement('div');
                    groupLabel.className = 'category-group-label';
                    groupLabel.textContent = cat.isCore ? t('panel.core') : t('panel.advanced');
                    this.$.toolsContainer.appendChild(groupLabel);
                    lastIsCore = cat.isCore;
                }

                const enabledInCat = cat.tools.filter(t => t.enabled).length;
                totalEnabled += enabledInCat;
                totalTools += cat.tools.length;

                // Category header with All/None actions
                const header = document.createElement('div');
                header.className = 'tool-category-header';

                const headerLeft = document.createElement('div');
                headerLeft.className = 'tool-category-header-left';

                const catName = document.createElement('span');
                catName.className = 'tool-category-name';
                catName.textContent = cat.category;

                const catCount = document.createElement('span');
                catCount.className = 'tool-category-count';
                catCount.textContent = `${enabledInCat}/${cat.tools.length}`;

                headerLeft.appendChild(catName);
                headerLeft.appendChild(catCount);

                const headerActions = document.createElement('div');
                headerActions.className = 'tool-category-actions';

                const catSelectAll = document.createElement('span');
                catSelectAll.className = 'tool-category-action';
                catSelectAll.textContent = t('panel.all');
                catSelectAll.addEventListener('click', () => this.setCategoryTools(cat.category, true));

                const catDeselectAll = document.createElement('span');
                catDeselectAll.className = 'tool-category-action';
                catDeselectAll.textContent = t('panel.none');
                catDeselectAll.addEventListener('click', () => this.setCategoryTools(cat.category, false));

                headerActions.appendChild(catSelectAll);
                headerActions.appendChild(catDeselectAll);

                header.appendChild(headerLeft);
                header.appendChild(headerActions);
                this.$.toolsContainer.appendChild(header);

                // Individual tool rows
                for (const tool of cat.tools) {
                    const row = document.createElement('div');
                    row.className = 'tool-row';

                    const checkbox = document.createElement('ui-checkbox') as any;
                    checkbox.value = tool.enabled;
                    checkbox.setAttribute('data-tool', tool.name);

                    const nameSpan = document.createElement('span');
                    nameSpan.className = 'tool-name';
                    nameSpan.textContent = tool.name;

                    const descSpan = document.createElement('span');
                    descSpan.className = 'tool-desc';
                    // Use i18n translation with fallback to original English description
                    const translatedDesc = t(`tool_desc.${tool.name}`);
                    descSpan.textContent = (translatedDesc && translatedDesc !== tool.name)
                        ? translatedDesc : tool.description;

                    row.appendChild(checkbox);
                    row.appendChild(nameSpan);
                    row.appendChild(descSpan);
                    this.$.toolsContainer.appendChild(row);

                    checkbox.addEventListener('confirm', async () => {
                        await this.toggleTool(tool.name, checkbox.value);
                    });
                }
            }

            if (this.$.toolCount) {
                this.$.toolCount.textContent = t('panel.tools_enabled', totalEnabled, totalTools);
            }
        },

        async toggleTool(toolName: string, enabled: boolean) {
            try {
                const status = await Editor.Message.request(EXT, 'get-server-status');
                const enabledTools = { ...status.enabledTools, [toolName]: enabled };
                const settings = {
                    port: status.port,
                    autoStart: status.autoStart,
                    enableDebugLog: false,
                    enabledCategories: status.enabledCategories,
                    enabledTools,
                };
                await Editor.Message.request(EXT, 'update-settings', settings);
                await this.refreshCategories();
            } catch (err: any) {
                this.appendLog(t('panel.toggle_failed', toolName, err.message));
            }
        },

        async setCategoryTools(category: string, enabled: boolean) {
            try {
                const status = await Editor.Message.request(EXT, 'get-server-status');
                const categories = await Editor.Message.request(EXT, 'get-categories');
                const enabledTools = { ...status.enabledTools };

                const cat = categories.find((c: any) => c.category === category);
                if (cat) {
                    for (const tool of cat.tools) {
                        enabledTools[tool.name] = enabled;
                    }
                }

                const settings = {
                    port: status.port,
                    autoStart: status.autoStart,
                    enableDebugLog: false,
                    enabledCategories: status.enabledCategories,
                    enabledTools,
                };
                await Editor.Message.request(EXT, 'update-settings', settings);
                this.appendLog(enabled ? t('panel.category_all_enabled', category) : t('panel.category_all_disabled', category));
                await this.refreshCategories();
            } catch (err: any) {
                this.appendLog(t('panel.failed', err.message));
            }
        },

        async setAllTools(enabled: boolean) {
            try {
                const status = await Editor.Message.request(EXT, 'get-server-status');
                const categories = await Editor.Message.request(EXT, 'get-categories');
                const enabledTools: Record<string, boolean> = {};

                for (const cat of categories) {
                    for (const tool of cat.tools) {
                        enabledTools[tool.name] = enabled;
                    }
                }

                const settings = {
                    port: status.port,
                    autoStart: status.autoStart,
                    enableDebugLog: false,
                    enabledCategories: status.enabledCategories,
                    enabledTools,
                };
                await Editor.Message.request(EXT, 'update-settings', settings);
                this.appendLog(enabled ? t('panel.all_tools_enabled') : t('panel.all_tools_disabled'));
                await this.refreshCategories();
            } catch (err: any) {
                this.appendLog(t('panel.failed', err.message));
            }
        },

        async refreshCategories() {
            try {
                const categories = await Editor.Message.request(EXT, 'get-categories');
                const status = await Editor.Message.request(EXT, 'get-server-status');
                this.buildToolRows(categories);
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

            while (this.$.logs.children.length > 100) {
                this.$.logs.removeChild(this.$.logs.firstChild!);
            }
        },
    },

    ready() {
        // Apply i18n to static elements
        this.applyI18n();

        // Server toggle
        if (this.$.toggle) {
            this.$.toggle.addEventListener('confirm', async () => {
                const checked = (this.$.toggle as any).value;
                if (checked) {
                    const result = await Editor.Message.request(EXT, 'start-server');
                    if (!result.success) {
                        (this.$.toggle as any).value = false;
                        this.appendLog(t('panel.start_failed', result.error));
                    } else {
                        this.appendLog(t('panel.server_started'));
                    }
                } else {
                    await Editor.Message.request(EXT, 'stop-server');
                    this.appendLog(t('panel.server_stopped'));
                }
            });
        }

        // Port input
        if (this.$.port) {
            this.$.port.addEventListener('confirm', async () => {
                const port = Number((this.$.port as any).value);
                if (port > 0 && port < 65536) {
                    const status = await Editor.Message.request(EXT, 'get-server-status');
                    await Editor.Message.request(EXT, 'update-settings', {
                        port,
                        autoStart: status.autoStart,
                        enableDebugLog: false,
                        enabledCategories: status.enabledCategories,
                        enabledTools: status.enabledTools,
                    });
                    this.appendLog(t('panel.port_updated', port));
                }
            });
        }

        // Auto-start checkbox
        if (this.$.autoStart) {
            this.$.autoStart.addEventListener('confirm', async () => {
                const autoStart = (this.$.autoStart as any).value;
                const status = await Editor.Message.request(EXT, 'get-server-status');
                await Editor.Message.request(EXT, 'update-settings', {
                    port: status.port,
                    autoStart,
                    enableDebugLog: false,
                    enabledCategories: status.enabledCategories,
                    enabledTools: status.enabledTools,
                });
                this.appendLog(autoStart ? t('panel.auto_start_enabled') : t('panel.auto_start_disabled'));
            });
        }

        // Select All / Deselect All buttons
        if (this.$.selectAll) {
            this.$.selectAll.addEventListener('click', () => {
                this.setAllTools(true);
            });
        }
        if (this.$.deselectAll) {
            this.$.deselectAll.addEventListener('click', () => {
                this.setAllTools(false);
            });
        }

        // Poll server status every 3 seconds
        const pollStatus = async () => {
            try {
                const status = await Editor.Message.request(EXT, 'get-server-status');
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

        // Initial load
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
