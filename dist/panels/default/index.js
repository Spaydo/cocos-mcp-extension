"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
let pollInterval = null;
const EXT = 'cocos-mcp-extension';
/** i18n helper with {0}, {1} placeholder support */
function t(key, ...args) {
    let text = Editor.I18n.t(`${EXT}.${key}`);
    // Fallback: if translation returns key itself, use the key
    if (!text || text === `${EXT}.${key}`)
        text = key.split('.').pop() || key;
    for (let i = 0; i < args.length; i++) {
        text = text.replace(`{${i}}`, String(args[i]));
    }
    return text;
}
module.exports = Editor.Panel.define({
    listeners: {
        show() { },
        hide() { },
    },
    template: (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/default/index.html'), 'utf-8'),
    style: (0, fs_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/default/index.css'), 'utf-8'),
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
            if (this.$.headerServer)
                this.$.headerServer.textContent = t('panel.mcp_server');
            if (this.$.headerTools)
                this.$.headerTools.textContent = t('panel.tools');
            if (this.$.headerLogs)
                this.$.headerLogs.textContent = t('panel.logs');
            // Labels
            if (this.$.labelStatus)
                this.$.labelStatus.textContent = t('panel.status');
            if (this.$.labelEnable)
                this.$.labelEnable.textContent = t('panel.enable');
            if (this.$.labelPort)
                this.$.labelPort.textContent = t('panel.port');
            if (this.$.labelAutoStart)
                this.$.labelAutoStart.textContent = t('panel.auto_start');
            // Buttons
            if (this.$.selectAll)
                this.$.selectAll.textContent = t('panel.select_all');
            if (this.$.deselectAll)
                this.$.deselectAll.textContent = t('panel.deselect_all');
            // Status default
            if (this.$.statusText)
                this.$.statusText.textContent = t('panel.stopped');
        },
        updateStatus(status) {
            if (!this.$.statusDot || !this.$.statusText || !this.$.serverUrl)
                return;
            if (status.running) {
                this.$.statusDot.className = 'status-dot running';
                this.$.statusText.textContent = t('panel.running', status.tools, status.actions);
                this.$.serverUrl.textContent = `http://localhost:${status.port}/mcp`;
                this.$.serverUrl.style.display = 'block';
            }
            else {
                this.$.statusDot.className = 'status-dot stopped';
                this.$.statusText.textContent = t('panel.stopped');
                this.$.serverUrl.style.display = 'none';
            }
        },
        buildToolRows(categories) {
            if (!this.$.toolsContainer)
                return;
            this.$.toolsContainer.innerHTML = '';
            let totalEnabled = 0;
            let totalTools = 0;
            // Sort: core first, then advanced
            const sorted = [...categories].sort((a, b) => {
                if (a.isCore && !b.isCore)
                    return -1;
                if (!a.isCore && b.isCore)
                    return 1;
                return 0;
            });
            let lastIsCore = null;
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
                    const checkbox = document.createElement('ui-checkbox');
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
        async toggleTool(toolName, enabled) {
            try {
                const status = await Editor.Message.request(EXT, 'get-server-status');
                const enabledTools = Object.assign(Object.assign({}, status.enabledTools), { [toolName]: enabled });
                const settings = {
                    port: status.port,
                    autoStart: status.autoStart,
                    enableDebugLog: false,
                    enabledCategories: status.enabledCategories,
                    enabledTools,
                };
                await Editor.Message.request(EXT, 'update-settings', settings);
                await this.refreshCategories();
            }
            catch (err) {
                this.appendLog(t('panel.toggle_failed', toolName, err.message));
            }
        },
        async setCategoryTools(category, enabled) {
            try {
                const status = await Editor.Message.request(EXT, 'get-server-status');
                const categories = await Editor.Message.request(EXT, 'get-categories');
                const enabledTools = Object.assign({}, status.enabledTools);
                const cat = categories.find((c) => c.category === category);
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
            }
            catch (err) {
                this.appendLog(t('panel.failed', err.message));
            }
        },
        async setAllTools(enabled) {
            try {
                const status = await Editor.Message.request(EXT, 'get-server-status');
                const categories = await Editor.Message.request(EXT, 'get-categories');
                const enabledTools = {};
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
            }
            catch (err) {
                this.appendLog(t('panel.failed', err.message));
            }
        },
        async refreshCategories() {
            try {
                const categories = await Editor.Message.request(EXT, 'get-categories');
                const status = await Editor.Message.request(EXT, 'get-server-status');
                this.buildToolRows(categories);
                this.updateStatus(status);
            }
            catch (_a) {
                // Extension might not be ready
            }
        },
        appendLog(message) {
            if (!this.$.logs)
                return;
            const line = document.createElement('div');
            line.className = 'log-line';
            const time = new Date().toLocaleTimeString();
            line.textContent = `[${time}] ${message}`;
            this.$.logs.appendChild(line);
            this.$.logs.scrollTop = this.$.logs.scrollHeight;
            while (this.$.logs.children.length > 100) {
                this.$.logs.removeChild(this.$.logs.firstChild);
            }
        },
    },
    ready() {
        // Apply i18n to static elements
        this.applyI18n();
        // Server toggle
        if (this.$.toggle) {
            this.$.toggle.addEventListener('confirm', async () => {
                const checked = this.$.toggle.value;
                if (checked) {
                    const result = await Editor.Message.request(EXT, 'start-server');
                    if (!result.success) {
                        this.$.toggle.value = false;
                        this.appendLog(t('panel.start_failed', result.error));
                    }
                    else {
                        this.appendLog(t('panel.server_started'));
                    }
                }
                else {
                    await Editor.Message.request(EXT, 'stop-server');
                    this.appendLog(t('panel.server_stopped'));
                }
            });
        }
        // Port input
        if (this.$.port) {
            this.$.port.addEventListener('confirm', async () => {
                const port = Number(this.$.port.value);
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
                const autoStart = this.$.autoStart.value;
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
                    this.$.toggle.value = status.running;
                }
                if (this.$.port) {
                    this.$.port.value = status.port;
                }
                if (this.$.autoStart) {
                    this.$.autoStart.value = status.autoStart;
                }
            }
            catch (_a) {
                // Extension might not be ready yet
            }
        };
        // Initial load
        this.refreshCategories();
        pollStatus();
        pollInterval = setInterval(pollStatus, 3000);
    },
    beforeClose() { },
    close() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwyQkFBa0M7QUFDbEMsK0JBQTRCO0FBRTVCLElBQUksWUFBWSxHQUEwQyxJQUFJLENBQUM7QUFFL0QsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUM7QUFFbEMsb0RBQW9EO0FBQ3BELFNBQVMsQ0FBQyxDQUFDLEdBQVcsRUFBRSxHQUFHLElBQVc7SUFDbEMsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMxQywyREFBMkQ7SUFDM0QsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLEtBQUssR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFO1FBQUUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksR0FBRyxDQUFDO0lBQzFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDakMsU0FBUyxFQUFFO1FBQ1AsSUFBSSxLQUFJLENBQUM7UUFDVCxJQUFJLEtBQUksQ0FBQztLQUNaO0lBRUQsUUFBUSxFQUFFLElBQUEsaUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFT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LENBQUM7Z0JBQ3RFLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzFCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDZixJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQWMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztnQkFDbEQsQ0FBQztnQkFDRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2IsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFZLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQzdDLENBQUM7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNsQixJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQWlCLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7Z0JBQ3ZELENBQUM7WUFDTCxDQUFDO1lBQUMsV0FBTSxDQUFDO2dCQUNMLG1DQUFtQztZQUN2QyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsZUFBZTtRQUNmLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxHQUFHLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELFdBQVcsS0FBSSxDQUFDO0lBRWhCLEtBQUs7UUFDRCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2YsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzVCLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDeEIsQ0FBQztJQUNMLENBQUM7Q0FDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuXHJcbmxldCBwb2xsSW50ZXJ2YWw6IFJldHVyblR5cGU8dHlwZW9mIHNldEludGVydmFsPiB8IG51bGwgPSBudWxsO1xyXG5cclxuY29uc3QgRVhUID0gJ2NvY29zLW1jcC1leHRlbnNpb24nO1xyXG5cclxuLyoqIGkxOG4gaGVscGVyIHdpdGggezB9LCB7MX0gcGxhY2Vob2xkZXIgc3VwcG9ydCAqL1xyXG5mdW5jdGlvbiB0KGtleTogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSk6IHN0cmluZyB7XHJcbiAgICBsZXQgdGV4dCA9IEVkaXRvci5JMThuLnQoYCR7RVhUfS4ke2tleX1gKTtcclxuICAgIC8vIEZhbGxiYWNrOiBpZiB0cmFuc2xhdGlvbiByZXR1cm5zIGtleSBpdHNlbGYsIHVzZSB0aGUga2V5XHJcbiAgICBpZiAoIXRleHQgfHwgdGV4dCA9PT0gYCR7RVhUfS4ke2tleX1gKSB0ZXh0ID0ga2V5LnNwbGl0KCcuJykucG9wKCkgfHwga2V5O1xyXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdGV4dCA9IHRleHQucmVwbGFjZShgeyR7aX19YCwgU3RyaW5nKGFyZ3NbaV0pKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0ZXh0O1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvci5QYW5lbC5kZWZpbmUoe1xyXG4gICAgbGlzdGVuZXJzOiB7XHJcbiAgICAgICAgc2hvdygpIHt9LFxyXG4gICAgICAgIGhpZGUoKSB7fSxcclxuICAgIH0sXHJcblxyXG4gICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS9kZWZhdWx0L2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL2RlZmF1bHQvaW5kZXguY3NzJyksICd1dGYtOCcpLFxyXG5cclxuICAgICQ6IHtcclxuICAgICAgICBwb3J0OiAnI3BvcnQtaW5wdXQnLFxyXG4gICAgICAgIHRvZ2dsZTogJyNzZXJ2ZXItdG9nZ2xlJyxcclxuICAgICAgICBhdXRvU3RhcnQ6ICcjYXV0by1zdGFydCcsXHJcbiAgICAgICAgc3RhdHVzRG90OiAnI3N0YXR1cy1kb3QnLFxyXG4gICAgICAgIHN0YXR1c1RleHQ6ICcjc3RhdHVzLXRleHQnLFxyXG4gICAgICAgIHNlcnZlclVybDogJyNzZXJ2ZXItdXJsJyxcclxuICAgICAgICBsb2dzOiAnI2xvZ3MnLFxyXG4gICAgICAgIHRvb2xzQ29udGFpbmVyOiAnI3Rvb2xzLWNvbnRhaW5lcicsXHJcbiAgICAgICAgc2VsZWN0QWxsOiAnI3NlbGVjdC1hbGwnLFxyXG4gICAgICAgIGRlc2VsZWN0QWxsOiAnI2Rlc2VsZWN0LWFsbCcsXHJcbiAgICAgICAgdG9vbENvdW50OiAnI3Rvb2wtY291bnQnLFxyXG4gICAgICAgIC8vIFNlY3Rpb24gaGVhZGVycyAmIGxhYmVscyBmb3IgaTE4blxyXG4gICAgICAgIGhlYWRlclNlcnZlcjogJyNoZWFkZXItc2VydmVyJyxcclxuICAgICAgICBoZWFkZXJUb29sczogJyNoZWFkZXItdG9vbHMnLFxyXG4gICAgICAgIGhlYWRlckxvZ3M6ICcjaGVhZGVyLWxvZ3MnLFxyXG4gICAgICAgIGxhYmVsU3RhdHVzOiAnI2xhYmVsLXN0YXR1cycsXHJcbiAgICAgICAgbGFiZWxFbmFibGU6ICcjbGFiZWwtZW5hYmxlJyxcclxuICAgICAgICBsYWJlbFBvcnQ6ICcjbGFiZWwtcG9ydCcsXHJcbiAgICAgICAgbGFiZWxBdXRvU3RhcnQ6ICcjbGFiZWwtYXV0by1zdGFydCcsXHJcbiAgICB9LFxyXG5cclxuICAgIG1ldGhvZHM6IHtcclxuICAgICAgICBhcHBseUkxOG4oKSB7XHJcbiAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyc1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kLmhlYWRlclNlcnZlcikgdGhpcy4kLmhlYWRlclNlcnZlci50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLm1jcF9zZXJ2ZXInKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJC5oZWFkZXJUb29scykgdGhpcy4kLmhlYWRlclRvb2xzLnRleHRDb250ZW50ID0gdCgncGFuZWwudG9vbHMnKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJC5oZWFkZXJMb2dzKSB0aGlzLiQuaGVhZGVyTG9ncy50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLmxvZ3MnKTtcclxuICAgICAgICAgICAgLy8gTGFiZWxzXHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQubGFiZWxTdGF0dXMpIHRoaXMuJC5sYWJlbFN0YXR1cy50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLnN0YXR1cycpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kLmxhYmVsRW5hYmxlKSB0aGlzLiQubGFiZWxFbmFibGUudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5lbmFibGUnKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJC5sYWJlbFBvcnQpIHRoaXMuJC5sYWJlbFBvcnQudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5wb3J0Jyk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQubGFiZWxBdXRvU3RhcnQpIHRoaXMuJC5sYWJlbEF1dG9TdGFydC50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLmF1dG9fc3RhcnQnKTtcclxuICAgICAgICAgICAgLy8gQnV0dG9uc1xyXG4gICAgICAgICAgICBpZiAodGhpcy4kLnNlbGVjdEFsbCkgdGhpcy4kLnNlbGVjdEFsbC50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLnNlbGVjdF9hbGwnKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuJC5kZXNlbGVjdEFsbCkgdGhpcy4kLmRlc2VsZWN0QWxsLnRleHRDb250ZW50ID0gdCgncGFuZWwuZGVzZWxlY3RfYWxsJyk7XHJcbiAgICAgICAgICAgIC8vIFN0YXR1cyBkZWZhdWx0XHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQuc3RhdHVzVGV4dCkgdGhpcy4kLnN0YXR1c1RleHQudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5zdG9wcGVkJyk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgdXBkYXRlU3RhdHVzKHN0YXR1czogeyBydW5uaW5nOiBib29sZWFuOyBwb3J0OiBudW1iZXI7IHRvb2xzOiBudW1iZXI7IGFjdGlvbnM6IG51bWJlciB9KSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy4kLnN0YXR1c0RvdCB8fCAhdGhpcy4kLnN0YXR1c1RleHQgfHwgIXRoaXMuJC5zZXJ2ZXJVcmwpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGlmIChzdGF0dXMucnVubmluZykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kLnN0YXR1c0RvdC5jbGFzc05hbWUgPSAnc3RhdHVzLWRvdCBydW5uaW5nJztcclxuICAgICAgICAgICAgICAgIHRoaXMuJC5zdGF0dXNUZXh0LnRleHRDb250ZW50ID0gdCgncGFuZWwucnVubmluZycsIHN0YXR1cy50b29scywgc3RhdHVzLmFjdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kLnNlcnZlclVybC50ZXh0Q29udGVudCA9IGBodHRwOi8vbG9jYWxob3N0OiR7c3RhdHVzLnBvcnR9L21jcGA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQuc2VydmVyVXJsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kLnN0YXR1c0RvdC5jbGFzc05hbWUgPSAnc3RhdHVzLWRvdCBzdG9wcGVkJztcclxuICAgICAgICAgICAgICAgIHRoaXMuJC5zdGF0dXNUZXh0LnRleHRDb250ZW50ID0gdCgncGFuZWwuc3RvcHBlZCcpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy4kLnNlcnZlclVybC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgYnVpbGRUb29sUm93cyhjYXRlZ29yaWVzOiB7IGNhdGVnb3J5OiBzdHJpbmc7IGlzQ29yZTogYm9vbGVhbjsgdG9vbHM6IHsgbmFtZTogc3RyaW5nOyBkZXNjcmlwdGlvbjogc3RyaW5nOyBlbmFibGVkOiBib29sZWFuIH1bXSB9W10pIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLiQudG9vbHNDb250YWluZXIpIHJldHVybjtcclxuICAgICAgICAgICAgdGhpcy4kLnRvb2xzQ29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xyXG5cclxuICAgICAgICAgICAgbGV0IHRvdGFsRW5hYmxlZCA9IDA7XHJcbiAgICAgICAgICAgIGxldCB0b3RhbFRvb2xzID0gMDtcclxuXHJcbiAgICAgICAgICAgIC8vIFNvcnQ6IGNvcmUgZmlyc3QsIHRoZW4gYWR2YW5jZWRcclxuICAgICAgICAgICAgY29uc3Qgc29ydGVkID0gWy4uLmNhdGVnb3JpZXNdLnNvcnQoKGEsIGIpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChhLmlzQ29yZSAmJiAhYi5pc0NvcmUpIHJldHVybiAtMTtcclxuICAgICAgICAgICAgICAgIGlmICghYS5pc0NvcmUgJiYgYi5pc0NvcmUpIHJldHVybiAxO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgbGV0IGxhc3RJc0NvcmU6IGJvb2xlYW4gfCBudWxsID0gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3QgY2F0IG9mIHNvcnRlZCkge1xyXG4gICAgICAgICAgICAgICAgLy8gR3JvdXAgZGl2aWRlclxyXG4gICAgICAgICAgICAgICAgaWYgKGxhc3RJc0NvcmUgIT09IGNhdC5pc0NvcmUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBncm91cExhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBMYWJlbC5jbGFzc05hbWUgPSAnY2F0ZWdvcnktZ3JvdXAtbGFiZWwnO1xyXG4gICAgICAgICAgICAgICAgICAgIGdyb3VwTGFiZWwudGV4dENvbnRlbnQgPSBjYXQuaXNDb3JlID8gdCgncGFuZWwuY29yZScpIDogdCgncGFuZWwuYWR2YW5jZWQnKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQudG9vbHNDb250YWluZXIuYXBwZW5kQ2hpbGQoZ3JvdXBMYWJlbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGFzdElzQ29yZSA9IGNhdC5pc0NvcmU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgZW5hYmxlZEluQ2F0ID0gY2F0LnRvb2xzLmZpbHRlcih0ID0+IHQuZW5hYmxlZCkubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgdG90YWxFbmFibGVkICs9IGVuYWJsZWRJbkNhdDtcclxuICAgICAgICAgICAgICAgIHRvdGFsVG9vbHMgKz0gY2F0LnRvb2xzLmxlbmd0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBDYXRlZ29yeSBoZWFkZXIgd2l0aCBBbGwvTm9uZSBhY3Rpb25zXHJcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgIGhlYWRlci5jbGFzc05hbWUgPSAndG9vbC1jYXRlZ29yeS1oZWFkZXInO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlckxlZnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgICAgIGhlYWRlckxlZnQuY2xhc3NOYW1lID0gJ3Rvb2wtY2F0ZWdvcnktaGVhZGVyLWxlZnQnO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdE5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcbiAgICAgICAgICAgICAgICBjYXROYW1lLmNsYXNzTmFtZSA9ICd0b29sLWNhdGVnb3J5LW5hbWUnO1xyXG4gICAgICAgICAgICAgICAgY2F0TmFtZS50ZXh0Q29udGVudCA9IGNhdC5jYXRlZ29yeTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRDb3VudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcclxuICAgICAgICAgICAgICAgIGNhdENvdW50LmNsYXNzTmFtZSA9ICd0b29sLWNhdGVnb3J5LWNvdW50JztcclxuICAgICAgICAgICAgICAgIGNhdENvdW50LnRleHRDb250ZW50ID0gYCR7ZW5hYmxlZEluQ2F0fS8ke2NhdC50b29scy5sZW5ndGh9YDtcclxuXHJcbiAgICAgICAgICAgICAgICBoZWFkZXJMZWZ0LmFwcGVuZENoaWxkKGNhdE5hbWUpO1xyXG4gICAgICAgICAgICAgICAgaGVhZGVyTGVmdC5hcHBlbmRDaGlsZChjYXRDb3VudCk7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyQWN0aW9ucyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICAgICAgaGVhZGVyQWN0aW9ucy5jbGFzc05hbWUgPSAndG9vbC1jYXRlZ29yeS1hY3Rpb25zJztcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRTZWxlY3RBbGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcbiAgICAgICAgICAgICAgICBjYXRTZWxlY3RBbGwuY2xhc3NOYW1lID0gJ3Rvb2wtY2F0ZWdvcnktYWN0aW9uJztcclxuICAgICAgICAgICAgICAgIGNhdFNlbGVjdEFsbC50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLmFsbCcpO1xyXG4gICAgICAgICAgICAgICAgY2F0U2VsZWN0QWxsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5zZXRDYXRlZ29yeVRvb2xzKGNhdC5jYXRlZ29yeSwgdHJ1ZSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdERlc2VsZWN0QWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xyXG4gICAgICAgICAgICAgICAgY2F0RGVzZWxlY3RBbGwuY2xhc3NOYW1lID0gJ3Rvb2wtY2F0ZWdvcnktYWN0aW9uJztcclxuICAgICAgICAgICAgICAgIGNhdERlc2VsZWN0QWxsLnRleHRDb250ZW50ID0gdCgncGFuZWwubm9uZScpO1xyXG4gICAgICAgICAgICAgICAgY2F0RGVzZWxlY3RBbGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLnNldENhdGVnb3J5VG9vbHMoY2F0LmNhdGVnb3J5LCBmYWxzZSkpO1xyXG5cclxuICAgICAgICAgICAgICAgIGhlYWRlckFjdGlvbnMuYXBwZW5kQ2hpbGQoY2F0U2VsZWN0QWxsKTtcclxuICAgICAgICAgICAgICAgIGhlYWRlckFjdGlvbnMuYXBwZW5kQ2hpbGQoY2F0RGVzZWxlY3RBbGwpO1xyXG5cclxuICAgICAgICAgICAgICAgIGhlYWRlci5hcHBlbmRDaGlsZChoZWFkZXJMZWZ0KTtcclxuICAgICAgICAgICAgICAgIGhlYWRlci5hcHBlbmRDaGlsZChoZWFkZXJBY3Rpb25zKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuJC50b29sc0NvbnRhaW5lci5hcHBlbmRDaGlsZChoZWFkZXIpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIEluZGl2aWR1YWwgdG9vbCByb3dzXHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgY2F0LnRvb2xzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcm93LmNsYXNzTmFtZSA9ICd0b29sLXJvdyc7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoZWNrYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWktY2hlY2tib3gnKSBhcyBhbnk7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tib3gudmFsdWUgPSB0b29sLmVuYWJsZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tib3guc2V0QXR0cmlidXRlKCdkYXRhLXRvb2wnLCB0b29sLm5hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lU3Bhbi5jbGFzc05hbWUgPSAndG9vbC1uYW1lJztcclxuICAgICAgICAgICAgICAgICAgICBuYW1lU3Bhbi50ZXh0Q29udGVudCA9IHRvb2wubmFtZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVzY1NwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY1NwYW4uY2xhc3NOYW1lID0gJ3Rvb2wtZGVzYyc7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIGkxOG4gdHJhbnNsYXRpb24gd2l0aCBmYWxsYmFjayB0byBvcmlnaW5hbCBFbmdsaXNoIGRlc2NyaXB0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJhbnNsYXRlZERlc2MgPSB0KGB0b29sX2Rlc2MuJHt0b29sLm5hbWV9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVzY1NwYW4udGV4dENvbnRlbnQgPSAodHJhbnNsYXRlZERlc2MgJiYgdHJhbnNsYXRlZERlc2MgIT09IHRvb2wubmFtZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyB0cmFuc2xhdGVkRGVzYyA6IHRvb2wuZGVzY3JpcHRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJvdy5hcHBlbmRDaGlsZChjaGVja2JveCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcm93LmFwcGVuZENoaWxkKG5hbWVTcGFuKTtcclxuICAgICAgICAgICAgICAgICAgICByb3cuYXBwZW5kQ2hpbGQoZGVzY1NwYW4pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJC50b29sc0NvbnRhaW5lci5hcHBlbmRDaGlsZChyb3cpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjaGVja2JveC5hZGRFdmVudExpc3RlbmVyKCdjb25maXJtJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnRvZ2dsZVRvb2wodG9vbC5uYW1lLCBjaGVja2JveC52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLiQudG9vbENvdW50KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLiQudG9vbENvdW50LnRleHRDb250ZW50ID0gdCgncGFuZWwudG9vbHNfZW5hYmxlZCcsIHRvdGFsRW5hYmxlZCwgdG90YWxUb29scyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBhc3luYyB0b2dnbGVUb29sKHRvb2xOYW1lOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LXNlcnZlci1zdGF0dXMnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHsgLi4uc3RhdHVzLmVuYWJsZWRUb29scywgW3Rvb2xOYW1lXTogZW5hYmxlZCB9O1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogc3RhdHVzLnBvcnQsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b1N0YXJ0OiBzdGF0dXMuYXV0b1N0YXJ0LFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZURlYnVnTG9nOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkQ2F0ZWdvcmllczogc3RhdHVzLmVuYWJsZWRDYXRlZ29yaWVzLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWRUb29scyxcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ3VwZGF0ZS1zZXR0aW5ncycsIHNldHRpbmdzKTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaENhdGVnb3JpZXMoKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kTG9nKHQoJ3BhbmVsLnRvZ2dsZV9mYWlsZWQnLCB0b29sTmFtZSwgZXJyLm1lc3NhZ2UpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGFzeW5jIHNldENhdGVnb3J5VG9vbHMoY2F0ZWdvcnk6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdnZXQtc2VydmVyLXN0YXR1cycpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LWNhdGVnb3JpZXMnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHsgLi4uc3RhdHVzLmVuYWJsZWRUb29scyB9O1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdCA9IGNhdGVnb3JpZXMuZmluZCgoYzogYW55KSA9PiBjLmNhdGVnb3J5ID09PSBjYXRlZ29yeSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoY2F0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCB0b29sIG9mIGNhdC50b29scykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkVG9vbHNbdG9vbC5uYW1lXSA9IGVuYWJsZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IHN0YXR1cy5wb3J0LFxyXG4gICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydDogc3RhdHVzLmF1dG9TdGFydCxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVEZWJ1Z0xvZzogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZENhdGVnb3JpZXM6IHN0YXR1cy5lbmFibGVkQ2F0ZWdvcmllcyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkVG9vbHMsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICd1cGRhdGUtc2V0dGluZ3MnLCBzZXR0aW5ncyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyhlbmFibGVkID8gdCgncGFuZWwuY2F0ZWdvcnlfYWxsX2VuYWJsZWQnLCBjYXRlZ29yeSkgOiB0KCdwYW5lbC5jYXRlZ29yeV9hbGxfZGlzYWJsZWQnLCBjYXRlZ29yeSkpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoQ2F0ZWdvcmllcygpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2codCgncGFuZWwuZmFpbGVkJywgZXJyLm1lc3NhZ2UpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIGFzeW5jIHNldEFsbFRvb2xzKGVuYWJsZWQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LXNlcnZlci1zdGF0dXMnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ2dldC1jYXRlZ29yaWVzJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbmFibGVkVG9vbHM6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+ID0ge307XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjYXQgb2YgY2F0ZWdvcmllcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiBjYXQudG9vbHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZFRvb2xzW3Rvb2wubmFtZV0gPSBlbmFibGVkO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcclxuICAgICAgICAgICAgICAgICAgICBwb3J0OiBzdGF0dXMucG9ydCxcclxuICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IHN0YXR1cy5hdXRvU3RhcnQsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGVidWdMb2c6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWRDYXRlZ29yaWVzOiBzdGF0dXMuZW5hYmxlZENhdGVnb3JpZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZFRvb2xzLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAndXBkYXRlLXNldHRpbmdzJywgc2V0dGluZ3MpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2coZW5hYmxlZCA/IHQoJ3BhbmVsLmFsbF90b29sc19lbmFibGVkJykgOiB0KCdwYW5lbC5hbGxfdG9vbHNfZGlzYWJsZWQnKSk7XHJcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hDYXRlZ29yaWVzKCk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyh0KCdwYW5lbC5mYWlsZWQnLCBlcnIubWVzc2FnZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgYXN5bmMgcmVmcmVzaENhdGVnb3JpZXMoKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdnZXQtY2F0ZWdvcmllcycpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdnZXQtc2VydmVyLXN0YXR1cycpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZFRvb2xSb3dzKGNhdGVnb3JpZXMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoc3RhdHVzKTtcclxuICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gbWlnaHQgbm90IGJlIHJlYWR5XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBhcHBlbmRMb2cobWVzc2FnZTogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy4kLmxvZ3MpIHJldHVybjtcclxuICAgICAgICAgICAgY29uc3QgbGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICBsaW5lLmNsYXNzTmFtZSA9ICdsb2ctbGluZSc7XHJcbiAgICAgICAgICAgIGNvbnN0IHRpbWUgPSBuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpO1xyXG4gICAgICAgICAgICBsaW5lLnRleHRDb250ZW50ID0gYFske3RpbWV9XSAke21lc3NhZ2V9YDtcclxuICAgICAgICAgICAgdGhpcy4kLmxvZ3MuYXBwZW5kQ2hpbGQobGluZSk7XHJcbiAgICAgICAgICAgIHRoaXMuJC5sb2dzLnNjcm9sbFRvcCA9IHRoaXMuJC5sb2dzLnNjcm9sbEhlaWdodDtcclxuXHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLiQubG9ncy5jaGlsZHJlbi5sZW5ndGggPiAxMDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuJC5sb2dzLnJlbW92ZUNoaWxkKHRoaXMuJC5sb2dzLmZpcnN0Q2hpbGQhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICB9LFxyXG5cclxuICAgIHJlYWR5KCkge1xyXG4gICAgICAgIC8vIEFwcGx5IGkxOG4gdG8gc3RhdGljIGVsZW1lbnRzXHJcbiAgICAgICAgdGhpcy5hcHBseUkxOG4oKTtcclxuXHJcbiAgICAgICAgLy8gU2VydmVyIHRvZ2dsZVxyXG4gICAgICAgIGlmICh0aGlzLiQudG9nZ2xlKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJC50b2dnbGUuYWRkRXZlbnRMaXN0ZW5lcignY29uZmlybScsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNoZWNrZWQgPSAodGhpcy4kLnRvZ2dsZSBhcyBhbnkpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNoZWNrZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ3N0YXJ0LXNlcnZlcicpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzdWx0LnN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuJC50b2dnbGUgYXMgYW55KS52YWx1ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyh0KCdwYW5lbC5zdGFydF9mYWlsZWQnLCByZXN1bHQuZXJyb3IpKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyh0KCdwYW5lbC5zZXJ2ZXJfc3RhcnRlZCcpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnc3RvcC1zZXJ2ZXInKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyh0KCdwYW5lbC5zZXJ2ZXJfc3RvcHBlZCcpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBQb3J0IGlucHV0XHJcbiAgICAgICAgaWYgKHRoaXMuJC5wb3J0KSB7XHJcbiAgICAgICAgICAgIHRoaXMuJC5wb3J0LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbmZpcm0nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwb3J0ID0gTnVtYmVyKCh0aGlzLiQucG9ydCBhcyBhbnkpLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmIChwb3J0ID4gMCAmJiBwb3J0IDwgNjU1MzYpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICd1cGRhdGUtc2V0dGluZ3MnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydDogc3RhdHVzLmF1dG9TdGFydCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGVidWdMb2c6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkQ2F0ZWdvcmllczogc3RhdHVzLmVuYWJsZWRDYXRlZ29yaWVzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkVG9vbHM6IHN0YXR1cy5lbmFibGVkVG9vbHMsXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2codCgncGFuZWwucG9ydF91cGRhdGVkJywgcG9ydCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEF1dG8tc3RhcnQgY2hlY2tib3hcclxuICAgICAgICBpZiAodGhpcy4kLmF1dG9TdGFydCkge1xyXG4gICAgICAgICAgICB0aGlzLiQuYXV0b1N0YXJ0LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbmZpcm0nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhdXRvU3RhcnQgPSAodGhpcy4kLmF1dG9TdGFydCBhcyBhbnkpLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdnZXQtc2VydmVyLXN0YXR1cycpO1xyXG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICd1cGRhdGUtc2V0dGluZ3MnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogc3RhdHVzLnBvcnQsXHJcbiAgICAgICAgICAgICAgICAgICAgYXV0b1N0YXJ0LFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZURlYnVnTG9nOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkQ2F0ZWdvcmllczogc3RhdHVzLmVuYWJsZWRDYXRlZ29yaWVzLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWRUb29sczogc3RhdHVzLmVuYWJsZWRUb29scyxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2coYXV0b1N0YXJ0ID8gdCgncGFuZWwuYXV0b19zdGFydF9lbmFibGVkJykgOiB0KCdwYW5lbC5hdXRvX3N0YXJ0X2Rpc2FibGVkJykpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFNlbGVjdCBBbGwgLyBEZXNlbGVjdCBBbGwgYnV0dG9uc1xyXG4gICAgICAgIGlmICh0aGlzLiQuc2VsZWN0QWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuJC5zZWxlY3RBbGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFsbFRvb2xzKHRydWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuJC5kZXNlbGVjdEFsbCkge1xyXG4gICAgICAgICAgICB0aGlzLiQuZGVzZWxlY3RBbGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFsbFRvb2xzKGZhbHNlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBQb2xsIHNlcnZlciBzdGF0dXMgZXZlcnkgMyBzZWNvbmRzXHJcbiAgICAgICAgY29uc3QgcG9sbFN0YXR1cyA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LXNlcnZlci1zdGF0dXMnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHN0YXR1cyk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kLnRvZ2dsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLiQudG9nZ2xlIGFzIGFueSkudmFsdWUgPSBzdGF0dXMucnVubmluZztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLiQucG9ydCkge1xyXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLiQucG9ydCBhcyBhbnkpLnZhbHVlID0gc3RhdHVzLnBvcnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kLmF1dG9TdGFydCkge1xyXG4gICAgICAgICAgICAgICAgICAgICh0aGlzLiQuYXV0b1N0YXJ0IGFzIGFueSkudmFsdWUgPSBzdGF0dXMuYXV0b1N0YXJ0O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBtaWdodCBub3QgYmUgcmVhZHkgeWV0XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAvLyBJbml0aWFsIGxvYWRcclxuICAgICAgICB0aGlzLnJlZnJlc2hDYXRlZ29yaWVzKCk7XHJcbiAgICAgICAgcG9sbFN0YXR1cygpO1xyXG4gICAgICAgIHBvbGxJbnRlcnZhbCA9IHNldEludGVydmFsKHBvbGxTdGF0dXMsIDMwMDApO1xyXG4gICAgfSxcclxuXHJcbiAgICBiZWZvcmVDbG9zZSgpIHt9LFxyXG5cclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIGlmIChwb2xsSW50ZXJ2YWwpIHtcclxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChwb2xsSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICBwb2xsSW50ZXJ2YWwgPSBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn0pO1xyXG4iXX0=