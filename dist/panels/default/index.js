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
                this.$.statusText.textContent = t('panel.running', status.tools);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwyQkFBa0M7QUFDbEMsK0JBQTRCO0FBRTVCLElBQUksWUFBWSxHQUEwQyxJQUFJLENBQUM7QUFFL0QsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUM7QUFFbEMsb0RBQW9EO0FBQ3BELFNBQVMsQ0FBQyxDQUFDLEdBQVcsRUFBRSxHQUFHLElBQVc7SUFDbEMsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMxQywyREFBMkQ7SUFDM0QsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLEtBQUssR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFO1FBQUUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksR0FBRyxDQUFDO0lBQzFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDakMsU0FBUyxFQUFFO1FBQ1AsSUFBSSxLQUFJLENBQUM7UUFDVCxJQUFJLEtBQUksQ0FBQztLQUNaO0lBRUQsUUFBUSxFQUFFLElBQUEsaUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFT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QUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMxQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2YsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFjLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUM7Z0JBQ2xELENBQUM7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNiLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBWSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUM3QyxDQUFDO2dCQUNELElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztvQkFDbEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFpQixDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDO2dCQUN2RCxDQUFDO1lBQ0wsQ0FBQztZQUFDLFdBQU0sQ0FBQztnQkFDTCxtQ0FBbUM7WUFDdkMsQ0FBQztRQUNMLENBQUMsQ0FBQztRQUVGLGVBQWU7UUFDZixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN6QixVQUFVLEVBQUUsQ0FBQztRQUNiLFlBQVksR0FBRyxXQUFXLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCxXQUFXLEtBQUksQ0FBQztJQUVoQixLQUFLO1FBQ0QsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNmLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUM1QixZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQ3hCLENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcmVhZEZpbGVTeW5jIH0gZnJvbSAnZnMnO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xuXG5sZXQgcG9sbEludGVydmFsOiBSZXR1cm5UeXBlPHR5cGVvZiBzZXRJbnRlcnZhbD4gfCBudWxsID0gbnVsbDtcblxuY29uc3QgRVhUID0gJ2NvY29zLW1jcC1leHRlbnNpb24nO1xuXG4vKiogaTE4biBoZWxwZXIgd2l0aCB7MH0sIHsxfSBwbGFjZWhvbGRlciBzdXBwb3J0ICovXG5mdW5jdGlvbiB0KGtleTogc3RyaW5nLCAuLi5hcmdzOiBhbnlbXSk6IHN0cmluZyB7XG4gICAgbGV0IHRleHQgPSBFZGl0b3IuSTE4bi50KGAke0VYVH0uJHtrZXl9YCk7XG4gICAgLy8gRmFsbGJhY2s6IGlmIHRyYW5zbGF0aW9uIHJldHVybnMga2V5IGl0c2VsZiwgdXNlIHRoZSBrZXlcbiAgICBpZiAoIXRleHQgfHwgdGV4dCA9PT0gYCR7RVhUfS4ke2tleX1gKSB0ZXh0ID0ga2V5LnNwbGl0KCcuJykucG9wKCkgfHwga2V5O1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKGB7JHtpfX1gLCBTdHJpbmcoYXJnc1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gdGV4dDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcbiAgICBsaXN0ZW5lcnM6IHtcbiAgICAgICAgc2hvdygpIHt9LFxuICAgICAgICBoaWRlKCkge30sXG4gICAgfSxcblxuICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvZGVmYXVsdC9pbmRleC5odG1sJyksICd1dGYtOCcpLFxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvZGVmYXVsdC9pbmRleC5jc3MnKSwgJ3V0Zi04JyksXG5cbiAgICAkOiB7XG4gICAgICAgIHBvcnQ6ICcjcG9ydC1pbnB1dCcsXG4gICAgICAgIHRvZ2dsZTogJyNzZXJ2ZXItdG9nZ2xlJyxcbiAgICAgICAgYXV0b1N0YXJ0OiAnI2F1dG8tc3RhcnQnLFxuICAgICAgICBzdGF0dXNEb3Q6ICcjc3RhdHVzLWRvdCcsXG4gICAgICAgIHN0YXR1c1RleHQ6ICcjc3RhdHVzLXRleHQnLFxuICAgICAgICBzZXJ2ZXJVcmw6ICcjc2VydmVyLXVybCcsXG4gICAgICAgIGxvZ3M6ICcjbG9ncycsXG4gICAgICAgIHRvb2xzQ29udGFpbmVyOiAnI3Rvb2xzLWNvbnRhaW5lcicsXG4gICAgICAgIHNlbGVjdEFsbDogJyNzZWxlY3QtYWxsJyxcbiAgICAgICAgZGVzZWxlY3RBbGw6ICcjZGVzZWxlY3QtYWxsJyxcbiAgICAgICAgdG9vbENvdW50OiAnI3Rvb2wtY291bnQnLFxuICAgICAgICAvLyBTZWN0aW9uIGhlYWRlcnMgJiBsYWJlbHMgZm9yIGkxOG5cbiAgICAgICAgaGVhZGVyU2VydmVyOiAnI2hlYWRlci1zZXJ2ZXInLFxuICAgICAgICBoZWFkZXJUb29sczogJyNoZWFkZXItdG9vbHMnLFxuICAgICAgICBoZWFkZXJMb2dzOiAnI2hlYWRlci1sb2dzJyxcbiAgICAgICAgbGFiZWxTdGF0dXM6ICcjbGFiZWwtc3RhdHVzJyxcbiAgICAgICAgbGFiZWxFbmFibGU6ICcjbGFiZWwtZW5hYmxlJyxcbiAgICAgICAgbGFiZWxQb3J0OiAnI2xhYmVsLXBvcnQnLFxuICAgICAgICBsYWJlbEF1dG9TdGFydDogJyNsYWJlbC1hdXRvLXN0YXJ0JyxcbiAgICB9LFxuXG4gICAgbWV0aG9kczoge1xuICAgICAgICBhcHBseUkxOG4oKSB7XG4gICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlcnNcbiAgICAgICAgICAgIGlmICh0aGlzLiQuaGVhZGVyU2VydmVyKSB0aGlzLiQuaGVhZGVyU2VydmVyLnRleHRDb250ZW50ID0gdCgncGFuZWwubWNwX3NlcnZlcicpO1xuICAgICAgICAgICAgaWYgKHRoaXMuJC5oZWFkZXJUb29scykgdGhpcy4kLmhlYWRlclRvb2xzLnRleHRDb250ZW50ID0gdCgncGFuZWwudG9vbHMnKTtcbiAgICAgICAgICAgIGlmICh0aGlzLiQuaGVhZGVyTG9ncykgdGhpcy4kLmhlYWRlckxvZ3MudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5sb2dzJyk7XG4gICAgICAgICAgICAvLyBMYWJlbHNcbiAgICAgICAgICAgIGlmICh0aGlzLiQubGFiZWxTdGF0dXMpIHRoaXMuJC5sYWJlbFN0YXR1cy50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLnN0YXR1cycpO1xuICAgICAgICAgICAgaWYgKHRoaXMuJC5sYWJlbEVuYWJsZSkgdGhpcy4kLmxhYmVsRW5hYmxlLnRleHRDb250ZW50ID0gdCgncGFuZWwuZW5hYmxlJyk7XG4gICAgICAgICAgICBpZiAodGhpcy4kLmxhYmVsUG9ydCkgdGhpcy4kLmxhYmVsUG9ydC50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLnBvcnQnKTtcbiAgICAgICAgICAgIGlmICh0aGlzLiQubGFiZWxBdXRvU3RhcnQpIHRoaXMuJC5sYWJlbEF1dG9TdGFydC50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLmF1dG9fc3RhcnQnKTtcbiAgICAgICAgICAgIC8vIEJ1dHRvbnNcbiAgICAgICAgICAgIGlmICh0aGlzLiQuc2VsZWN0QWxsKSB0aGlzLiQuc2VsZWN0QWxsLnRleHRDb250ZW50ID0gdCgncGFuZWwuc2VsZWN0X2FsbCcpO1xuICAgICAgICAgICAgaWYgKHRoaXMuJC5kZXNlbGVjdEFsbCkgdGhpcy4kLmRlc2VsZWN0QWxsLnRleHRDb250ZW50ID0gdCgncGFuZWwuZGVzZWxlY3RfYWxsJyk7XG4gICAgICAgICAgICAvLyBTdGF0dXMgZGVmYXVsdFxuICAgICAgICAgICAgaWYgKHRoaXMuJC5zdGF0dXNUZXh0KSB0aGlzLiQuc3RhdHVzVGV4dC50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLnN0b3BwZWQnKTtcbiAgICAgICAgfSxcblxuICAgICAgICB1cGRhdGVTdGF0dXMoc3RhdHVzOiB7IHJ1bm5pbmc6IGJvb2xlYW47IHBvcnQ6IG51bWJlcjsgdG9vbHM6IG51bWJlciB9KSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuJC5zdGF0dXNEb3QgfHwgIXRoaXMuJC5zdGF0dXNUZXh0IHx8ICF0aGlzLiQuc2VydmVyVXJsKSByZXR1cm47XG5cbiAgICAgICAgICAgIGlmIChzdGF0dXMucnVubmluZykge1xuICAgICAgICAgICAgICAgIHRoaXMuJC5zdGF0dXNEb3QuY2xhc3NOYW1lID0gJ3N0YXR1cy1kb3QgcnVubmluZyc7XG4gICAgICAgICAgICAgICAgdGhpcy4kLnN0YXR1c1RleHQudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5ydW5uaW5nJywgc3RhdHVzLnRvb2xzKTtcbiAgICAgICAgICAgICAgICB0aGlzLiQuc2VydmVyVXJsLnRleHRDb250ZW50ID0gYGh0dHA6Ly9sb2NhbGhvc3Q6JHtzdGF0dXMucG9ydH0vbWNwYDtcbiAgICAgICAgICAgICAgICB0aGlzLiQuc2VydmVyVXJsLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLiQuc3RhdHVzRG90LmNsYXNzTmFtZSA9ICdzdGF0dXMtZG90IHN0b3BwZWQnO1xuICAgICAgICAgICAgICAgIHRoaXMuJC5zdGF0dXNUZXh0LnRleHRDb250ZW50ID0gdCgncGFuZWwuc3RvcHBlZCcpO1xuICAgICAgICAgICAgICAgIHRoaXMuJC5zZXJ2ZXJVcmwuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBidWlsZFRvb2xSb3dzKGNhdGVnb3JpZXM6IHsgY2F0ZWdvcnk6IHN0cmluZzsgaXNDb3JlOiBib29sZWFuOyB0b29sczogeyBuYW1lOiBzdHJpbmc7IGRlc2NyaXB0aW9uOiBzdHJpbmc7IGVuYWJsZWQ6IGJvb2xlYW4gfVtdIH1bXSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLiQudG9vbHNDb250YWluZXIpIHJldHVybjtcbiAgICAgICAgICAgIHRoaXMuJC50b29sc0NvbnRhaW5lci5pbm5lckhUTUwgPSAnJztcblxuICAgICAgICAgICAgbGV0IHRvdGFsRW5hYmxlZCA9IDA7XG4gICAgICAgICAgICBsZXQgdG90YWxUb29scyA9IDA7XG5cbiAgICAgICAgICAgIC8vIFNvcnQ6IGNvcmUgZmlyc3QsIHRoZW4gYWR2YW5jZWRcbiAgICAgICAgICAgIGNvbnN0IHNvcnRlZCA9IFsuLi5jYXRlZ29yaWVzXS5zb3J0KChhLCBiKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGEuaXNDb3JlICYmICFiLmlzQ29yZSkgcmV0dXJuIC0xO1xuICAgICAgICAgICAgICAgIGlmICghYS5pc0NvcmUgJiYgYi5pc0NvcmUpIHJldHVybiAxO1xuICAgICAgICAgICAgICAgIHJldHVybiAwO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGxldCBsYXN0SXNDb3JlOiBib29sZWFuIHwgbnVsbCA9IG51bGw7XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgY2F0IG9mIHNvcnRlZCkge1xuICAgICAgICAgICAgICAgIC8vIEdyb3VwIGRpdmlkZXJcbiAgICAgICAgICAgICAgICBpZiAobGFzdElzQ29yZSAhPT0gY2F0LmlzQ29yZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBncm91cExhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgIGdyb3VwTGFiZWwuY2xhc3NOYW1lID0gJ2NhdGVnb3J5LWdyb3VwLWxhYmVsJztcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBMYWJlbC50ZXh0Q29udGVudCA9IGNhdC5pc0NvcmUgPyB0KCdwYW5lbC5jb3JlJykgOiB0KCdwYW5lbC5hZHZhbmNlZCcpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLiQudG9vbHNDb250YWluZXIuYXBwZW5kQ2hpbGQoZ3JvdXBMYWJlbCk7XG4gICAgICAgICAgICAgICAgICAgIGxhc3RJc0NvcmUgPSBjYXQuaXNDb3JlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRJbkNhdCA9IGNhdC50b29scy5maWx0ZXIodCA9PiB0LmVuYWJsZWQpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICB0b3RhbEVuYWJsZWQgKz0gZW5hYmxlZEluQ2F0O1xuICAgICAgICAgICAgICAgIHRvdGFsVG9vbHMgKz0gY2F0LnRvb2xzLmxlbmd0aDtcblxuICAgICAgICAgICAgICAgIC8vIENhdGVnb3J5IGhlYWRlciB3aXRoIEFsbC9Ob25lIGFjdGlvbnNcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBoZWFkZXIuY2xhc3NOYW1lID0gJ3Rvb2wtY2F0ZWdvcnktaGVhZGVyJztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlckxlZnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBoZWFkZXJMZWZ0LmNsYXNzTmFtZSA9ICd0b29sLWNhdGVnb3J5LWhlYWRlci1sZWZ0JztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdE5hbWUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgY2F0TmFtZS5jbGFzc05hbWUgPSAndG9vbC1jYXRlZ29yeS1uYW1lJztcbiAgICAgICAgICAgICAgICBjYXROYW1lLnRleHRDb250ZW50ID0gY2F0LmNhdGVnb3J5O1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0Q291bnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgY2F0Q291bnQuY2xhc3NOYW1lID0gJ3Rvb2wtY2F0ZWdvcnktY291bnQnO1xuICAgICAgICAgICAgICAgIGNhdENvdW50LnRleHRDb250ZW50ID0gYCR7ZW5hYmxlZEluQ2F0fS8ke2NhdC50b29scy5sZW5ndGh9YDtcblxuICAgICAgICAgICAgICAgIGhlYWRlckxlZnQuYXBwZW5kQ2hpbGQoY2F0TmFtZSk7XG4gICAgICAgICAgICAgICAgaGVhZGVyTGVmdC5hcHBlbmRDaGlsZChjYXRDb3VudCk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXJBY3Rpb25zID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgaGVhZGVyQWN0aW9ucy5jbGFzc05hbWUgPSAndG9vbC1jYXRlZ29yeS1hY3Rpb25zJztcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdFNlbGVjdEFsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICBjYXRTZWxlY3RBbGwuY2xhc3NOYW1lID0gJ3Rvb2wtY2F0ZWdvcnktYWN0aW9uJztcbiAgICAgICAgICAgICAgICBjYXRTZWxlY3RBbGwudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5hbGwnKTtcbiAgICAgICAgICAgICAgICBjYXRTZWxlY3RBbGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLnNldENhdGVnb3J5VG9vbHMoY2F0LmNhdGVnb3J5LCB0cnVlKSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjYXREZXNlbGVjdEFsbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICBjYXREZXNlbGVjdEFsbC5jbGFzc05hbWUgPSAndG9vbC1jYXRlZ29yeS1hY3Rpb24nO1xuICAgICAgICAgICAgICAgIGNhdERlc2VsZWN0QWxsLnRleHRDb250ZW50ID0gdCgncGFuZWwubm9uZScpO1xuICAgICAgICAgICAgICAgIGNhdERlc2VsZWN0QWxsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4gdGhpcy5zZXRDYXRlZ29yeVRvb2xzKGNhdC5jYXRlZ29yeSwgZmFsc2UpKTtcblxuICAgICAgICAgICAgICAgIGhlYWRlckFjdGlvbnMuYXBwZW5kQ2hpbGQoY2F0U2VsZWN0QWxsKTtcbiAgICAgICAgICAgICAgICBoZWFkZXJBY3Rpb25zLmFwcGVuZENoaWxkKGNhdERlc2VsZWN0QWxsKTtcblxuICAgICAgICAgICAgICAgIGhlYWRlci5hcHBlbmRDaGlsZChoZWFkZXJMZWZ0KTtcbiAgICAgICAgICAgICAgICBoZWFkZXIuYXBwZW5kQ2hpbGQoaGVhZGVyQWN0aW9ucyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kLnRvb2xzQ29udGFpbmVyLmFwcGVuZENoaWxkKGhlYWRlcik7XG5cbiAgICAgICAgICAgICAgICAvLyBJbmRpdmlkdWFsIHRvb2wgcm93c1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiBjYXQudG9vbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICAgICAgICAgIHJvdy5jbGFzc05hbWUgPSAndG9vbC1yb3cnO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoZWNrYm94ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndWktY2hlY2tib3gnKSBhcyBhbnk7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrYm94LnZhbHVlID0gdG9vbC5lbmFibGVkO1xuICAgICAgICAgICAgICAgICAgICBjaGVja2JveC5zZXRBdHRyaWJ1dGUoJ2RhdGEtdG9vbCcsIHRvb2wubmFtZSk7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmFtZVNwYW4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgICAgICAgICAgICAgICAgIG5hbWVTcGFuLmNsYXNzTmFtZSA9ICd0b29sLW5hbWUnO1xuICAgICAgICAgICAgICAgICAgICBuYW1lU3Bhbi50ZXh0Q29udGVudCA9IHRvb2wubmFtZTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXNjU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICAgICAgZGVzY1NwYW4uY2xhc3NOYW1lID0gJ3Rvb2wtZGVzYyc7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBpMThuIHRyYW5zbGF0aW9uIHdpdGggZmFsbGJhY2sgdG8gb3JpZ2luYWwgRW5nbGlzaCBkZXNjcmlwdGlvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFuc2xhdGVkRGVzYyA9IHQoYHRvb2xfZGVzYy4ke3Rvb2wubmFtZX1gKTtcbiAgICAgICAgICAgICAgICAgICAgZGVzY1NwYW4udGV4dENvbnRlbnQgPSAodHJhbnNsYXRlZERlc2MgJiYgdHJhbnNsYXRlZERlc2MgIT09IHRvb2wubmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgID8gdHJhbnNsYXRlZERlc2MgOiB0b29sLmRlc2NyaXB0aW9uO1xuXG4gICAgICAgICAgICAgICAgICAgIHJvdy5hcHBlbmRDaGlsZChjaGVja2JveCk7XG4gICAgICAgICAgICAgICAgICAgIHJvdy5hcHBlbmRDaGlsZChuYW1lU3Bhbik7XG4gICAgICAgICAgICAgICAgICAgIHJvdy5hcHBlbmRDaGlsZChkZXNjU3Bhbik7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJC50b29sc0NvbnRhaW5lci5hcHBlbmRDaGlsZChyb3cpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNoZWNrYm94LmFkZEV2ZW50TGlzdGVuZXIoJ2NvbmZpcm0nLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnRvZ2dsZVRvb2wodG9vbC5uYW1lLCBjaGVja2JveC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHRoaXMuJC50b29sQ291bnQpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiQudG9vbENvdW50LnRleHRDb250ZW50ID0gdCgncGFuZWwudG9vbHNfZW5hYmxlZCcsIHRvdGFsRW5hYmxlZCwgdG90YWxUb29scyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXN5bmMgdG9nZ2xlVG9vbCh0b29sTmFtZTogc3RyaW5nLCBlbmFibGVkOiBib29sZWFuKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LXNlcnZlci1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB7IC4uLnN0YXR1cy5lbmFibGVkVG9vbHMsIFt0b29sTmFtZV06IGVuYWJsZWQgfTtcbiAgICAgICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogc3RhdHVzLnBvcnQsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydDogc3RhdHVzLmF1dG9TdGFydCxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGVidWdMb2c6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkQ2F0ZWdvcmllczogc3RhdHVzLmVuYWJsZWRDYXRlZ29yaWVzLFxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkVG9vbHMsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ3VwZGF0ZS1zZXR0aW5ncycsIHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hDYXRlZ29yaWVzKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kTG9nKHQoJ3BhbmVsLnRvZ2dsZV9mYWlsZWQnLCB0b29sTmFtZSwgZXJyLm1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBhc3luYyBzZXRDYXRlZ29yeVRvb2xzKGNhdGVnb3J5OiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdnZXQtc2VydmVyLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3JpZXMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ2dldC1jYXRlZ29yaWVzJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5hYmxlZFRvb2xzID0geyAuLi5zdGF0dXMuZW5hYmxlZFRvb2xzIH07XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjYXQgPSBjYXRlZ29yaWVzLmZpbmQoKGM6IGFueSkgPT4gYy5jYXRlZ29yeSA9PT0gY2F0ZWdvcnkpO1xuICAgICAgICAgICAgICAgIGlmIChjYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCB0b29sIG9mIGNhdC50b29scykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZFRvb2xzW3Rvb2wubmFtZV0gPSBlbmFibGVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IHN0YXR1cy5wb3J0LFxuICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IHN0YXR1cy5hdXRvU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZURlYnVnTG9nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZENhdGVnb3JpZXM6IHN0YXR1cy5lbmFibGVkQ2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZFRvb2xzLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICd1cGRhdGUtc2V0dGluZ3MnLCBzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2coZW5hYmxlZCA/IHQoJ3BhbmVsLmNhdGVnb3J5X2FsbF9lbmFibGVkJywgY2F0ZWdvcnkpIDogdCgncGFuZWwuY2F0ZWdvcnlfYWxsX2Rpc2FibGVkJywgY2F0ZWdvcnkpKTtcbiAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnJlZnJlc2hDYXRlZ29yaWVzKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnI6IGFueSkge1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kTG9nKHQoJ3BhbmVsLmZhaWxlZCcsIGVyci5tZXNzYWdlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXN5bmMgc2V0QWxsVG9vbHMoZW5hYmxlZDogYm9vbGVhbikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LWNhdGVnb3JpZXMnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbmFibGVkVG9vbHM6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+ID0ge307XG5cbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNhdCBvZiBjYXRlZ29yaWVzKSB7XG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdG9vbCBvZiBjYXQudG9vbHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWRUb29sc1t0b29sLm5hbWVdID0gZW5hYmxlZDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0ge1xuICAgICAgICAgICAgICAgICAgICBwb3J0OiBzdGF0dXMucG9ydCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b1N0YXJ0OiBzdGF0dXMuYXV0b1N0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBlbmFibGVEZWJ1Z0xvZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWRDYXRlZ29yaWVzOiBzdGF0dXMuZW5hYmxlZENhdGVnb3JpZXMsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWRUb29scyxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAndXBkYXRlLXNldHRpbmdzJywgc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kTG9nKGVuYWJsZWQgPyB0KCdwYW5lbC5hbGxfdG9vbHNfZW5hYmxlZCcpIDogdCgncGFuZWwuYWxsX3Rvb2xzX2Rpc2FibGVkJykpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaENhdGVnb3JpZXMoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2codCgncGFuZWwuZmFpbGVkJywgZXJyLm1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBhc3luYyByZWZyZXNoQ2F0ZWdvcmllcygpIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LWNhdGVnb3JpZXMnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgdGhpcy5idWlsZFRvb2xSb3dzKGNhdGVnb3JpZXMpO1xuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlU3RhdHVzKHN0YXR1cyk7XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gbWlnaHQgbm90IGJlIHJlYWR5XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG5cbiAgICAgICAgYXBwZW5kTG9nKG1lc3NhZ2U6IHN0cmluZykge1xuICAgICAgICAgICAgaWYgKCF0aGlzLiQubG9ncykgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgbGluZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgbGluZS5jbGFzc05hbWUgPSAnbG9nLWxpbmUnO1xuICAgICAgICAgICAgY29uc3QgdGltZSA9IG5ldyBEYXRlKCkudG9Mb2NhbGVUaW1lU3RyaW5nKCk7XG4gICAgICAgICAgICBsaW5lLnRleHRDb250ZW50ID0gYFske3RpbWV9XSAke21lc3NhZ2V9YDtcbiAgICAgICAgICAgIHRoaXMuJC5sb2dzLmFwcGVuZENoaWxkKGxpbmUpO1xuICAgICAgICAgICAgdGhpcy4kLmxvZ3Muc2Nyb2xsVG9wID0gdGhpcy4kLmxvZ3Muc2Nyb2xsSGVpZ2h0O1xuXG4gICAgICAgICAgICB3aGlsZSAodGhpcy4kLmxvZ3MuY2hpbGRyZW4ubGVuZ3RoID4gMTAwKSB7XG4gICAgICAgICAgICAgICAgdGhpcy4kLmxvZ3MucmVtb3ZlQ2hpbGQodGhpcy4kLmxvZ3MuZmlyc3RDaGlsZCEpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICByZWFkeSgpIHtcbiAgICAgICAgLy8gQXBwbHkgaTE4biB0byBzdGF0aWMgZWxlbWVudHNcbiAgICAgICAgdGhpcy5hcHBseUkxOG4oKTtcblxuICAgICAgICAvLyBTZXJ2ZXIgdG9nZ2xlXG4gICAgICAgIGlmICh0aGlzLiQudG9nZ2xlKSB7XG4gICAgICAgICAgICB0aGlzLiQudG9nZ2xlLmFkZEV2ZW50TGlzdGVuZXIoJ2NvbmZpcm0nLCBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2hlY2tlZCA9ICh0aGlzLiQudG9nZ2xlIGFzIGFueSkudmFsdWU7XG4gICAgICAgICAgICAgICAgaWYgKGNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdzdGFydC1zZXJ2ZXInKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXN1bHQuc3VjY2Vzcykge1xuICAgICAgICAgICAgICAgICAgICAgICAgKHRoaXMuJC50b2dnbGUgYXMgYW55KS52YWx1ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2codCgncGFuZWwuc3RhcnRfZmFpbGVkJywgcmVzdWx0LmVycm9yKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyh0KCdwYW5lbC5zZXJ2ZXJfc3RhcnRlZCcpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnc3RvcC1zZXJ2ZXInKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2codCgncGFuZWwuc2VydmVyX3N0b3BwZWQnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQb3J0IGlucHV0XG4gICAgICAgIGlmICh0aGlzLiQucG9ydCkge1xuICAgICAgICAgICAgdGhpcy4kLnBvcnQuYWRkRXZlbnRMaXN0ZW5lcignY29uZmlybScsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBwb3J0ID0gTnVtYmVyKCh0aGlzLiQucG9ydCBhcyBhbnkpLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBpZiAocG9ydCA+IDAgJiYgcG9ydCA8IDY1NTM2KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LXNlcnZlci1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICd1cGRhdGUtc2V0dGluZ3MnLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0LFxuICAgICAgICAgICAgICAgICAgICAgICAgYXV0b1N0YXJ0OiBzdGF0dXMuYXV0b1N0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGVidWdMb2c6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZENhdGVnb3JpZXM6IHN0YXR1cy5lbmFibGVkQ2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWRUb29sczogc3RhdHVzLmVuYWJsZWRUb29scyxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kTG9nKHQoJ3BhbmVsLnBvcnRfdXBkYXRlZCcsIHBvcnQpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEF1dG8tc3RhcnQgY2hlY2tib3hcbiAgICAgICAgaWYgKHRoaXMuJC5hdXRvU3RhcnQpIHtcbiAgICAgICAgICAgIHRoaXMuJC5hdXRvU3RhcnQuYWRkRXZlbnRMaXN0ZW5lcignY29uZmlybScsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBhdXRvU3RhcnQgPSAodGhpcy4kLmF1dG9TdGFydCBhcyBhbnkpLnZhbHVlO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LXNlcnZlci1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ3VwZGF0ZS1zZXR0aW5ncycsIHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogc3RhdHVzLnBvcnQsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydCxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGVidWdMb2c6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkQ2F0ZWdvcmllczogc3RhdHVzLmVuYWJsZWRDYXRlZ29yaWVzLFxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkVG9vbHM6IHN0YXR1cy5lbmFibGVkVG9vbHMsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2coYXV0b1N0YXJ0ID8gdCgncGFuZWwuYXV0b19zdGFydF9lbmFibGVkJykgOiB0KCdwYW5lbC5hdXRvX3N0YXJ0X2Rpc2FibGVkJykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZWxlY3QgQWxsIC8gRGVzZWxlY3QgQWxsIGJ1dHRvbnNcbiAgICAgICAgaWYgKHRoaXMuJC5zZWxlY3RBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuJC5zZWxlY3RBbGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZXRBbGxUb29scyh0cnVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0aGlzLiQuZGVzZWxlY3RBbGwpIHtcbiAgICAgICAgICAgIHRoaXMuJC5kZXNlbGVjdEFsbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFsbFRvb2xzKGZhbHNlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUG9sbCBzZXJ2ZXIgc3RhdHVzIGV2ZXJ5IDMgc2Vjb25kc1xuICAgICAgICBjb25zdCBwb2xsU3RhdHVzID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoc3RhdHVzKTtcbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kLnRvZ2dsZSkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcy4kLnRvZ2dsZSBhcyBhbnkpLnZhbHVlID0gc3RhdHVzLnJ1bm5pbmc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLiQucG9ydCkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcy4kLnBvcnQgYXMgYW55KS52YWx1ZSA9IHN0YXR1cy5wb3J0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAodGhpcy4kLmF1dG9TdGFydCkge1xuICAgICAgICAgICAgICAgICAgICAodGhpcy4kLmF1dG9TdGFydCBhcyBhbnkpLnZhbHVlID0gc3RhdHVzLmF1dG9TdGFydDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBFeHRlbnNpb24gbWlnaHQgbm90IGJlIHJlYWR5IHlldFxuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEluaXRpYWwgbG9hZFxuICAgICAgICB0aGlzLnJlZnJlc2hDYXRlZ29yaWVzKCk7XG4gICAgICAgIHBvbGxTdGF0dXMoKTtcbiAgICAgICAgcG9sbEludGVydmFsID0gc2V0SW50ZXJ2YWwocG9sbFN0YXR1cywgMzAwMCk7XG4gICAgfSxcblxuICAgIGJlZm9yZUNsb3NlKCkge30sXG5cbiAgICBjbG9zZSgpIHtcbiAgICAgICAgaWYgKHBvbGxJbnRlcnZhbCkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChwb2xsSW50ZXJ2YWwpO1xuICAgICAgICAgICAgcG9sbEludGVydmFsID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG59KTtcbiJdfQ==