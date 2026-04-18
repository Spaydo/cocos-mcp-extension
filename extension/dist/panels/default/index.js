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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL2RlZmF1bHQvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwyQkFBa0M7QUFDbEMsK0JBQTRCO0FBRTVCLElBQUksWUFBWSxHQUEwQyxJQUFJLENBQUM7QUFFL0QsTUFBTSxHQUFHLEdBQUcscUJBQXFCLENBQUM7QUFFbEMsb0RBQW9EO0FBQ3BELFNBQVMsQ0FBQyxDQUFDLEdBQVcsRUFBRSxHQUFHLElBQVc7SUFDbEMsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMxQywyREFBMkQ7SUFDM0QsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLEtBQUssR0FBRyxHQUFHLElBQUksR0FBRyxFQUFFO1FBQUUsSUFBSSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksR0FBRyxDQUFDO0lBQzFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDbkMsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDaEIsQ0FBQztBQUVELE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7SUFDakMsU0FBUyxFQUFFO1FBQ1AsSUFBSSxLQUFJLENBQUM7UUFDVCxJQUFJLEtBQUksQ0FBQztLQUNaO0lBRUQsUUFBUSxFQUFFLElBQUEsaUJBQVksRUFBQyxJQUFBLFdBQUksRUFBQyxTQUFT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LENBQUM7Z0JBQ3RFLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzFCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDZixJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQWMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQztnQkFDbEQsQ0FBQztnQkFDRCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ2IsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFZLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQzdDLENBQUM7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO29CQUNsQixJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQWlCLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7Z0JBQ3ZELENBQUM7WUFDTCxDQUFDO1lBQUMsV0FBTSxDQUFDO2dCQUNMLG1DQUFtQztZQUN2QyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsZUFBZTtRQUNmLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxHQUFHLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELFdBQVcsS0FBSSxDQUFDO0lBRWhCLEtBQUs7UUFDRCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2YsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQzVCLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDeEIsQ0FBQztJQUNMLENBQUM7Q0FDSixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyByZWFkRmlsZVN5bmMgfSBmcm9tICdmcyc7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5cbmxldCBwb2xsSW50ZXJ2YWw6IFJldHVyblR5cGU8dHlwZW9mIHNldEludGVydmFsPiB8IG51bGwgPSBudWxsO1xuXG5jb25zdCBFWFQgPSAnY29jb3MtbWNwLWV4dGVuc2lvbic7XG5cbi8qKiBpMThuIGhlbHBlciB3aXRoIHswfSwgezF9IHBsYWNlaG9sZGVyIHN1cHBvcnQgKi9cbmZ1bmN0aW9uIHQoa2V5OiBzdHJpbmcsIC4uLmFyZ3M6IGFueVtdKTogc3RyaW5nIHtcbiAgICBsZXQgdGV4dCA9IEVkaXRvci5JMThuLnQoYCR7RVhUfS4ke2tleX1gKTtcbiAgICAvLyBGYWxsYmFjazogaWYgdHJhbnNsYXRpb24gcmV0dXJucyBrZXkgaXRzZWxmLCB1c2UgdGhlIGtleVxuICAgIGlmICghdGV4dCB8fCB0ZXh0ID09PSBgJHtFWFR9LiR7a2V5fWApIHRleHQgPSBrZXkuc3BsaXQoJy4nKS5wb3AoKSB8fCBrZXk7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoYHske2l9fWAsIFN0cmluZyhhcmdzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiB0ZXh0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvci5QYW5lbC5kZWZpbmUoe1xuICAgIGxpc3RlbmVyczoge1xuICAgICAgICBzaG93KCkge30sXG4gICAgICAgIGhpZGUoKSB7fSxcbiAgICB9LFxuXG4gICAgdGVtcGxhdGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy90ZW1wbGF0ZS9kZWZhdWx0L2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXG4gICAgc3R5bGU6IHJlYWRGaWxlU3luYyhqb2luKF9fZGlybmFtZSwgJy4uLy4uLy4uL3N0YXRpYy9zdHlsZS9kZWZhdWx0L2luZGV4LmNzcycpLCAndXRmLTgnKSxcblxuICAgICQ6IHtcbiAgICAgICAgcG9ydDogJyNwb3J0LWlucHV0JyxcbiAgICAgICAgdG9nZ2xlOiAnI3NlcnZlci10b2dnbGUnLFxuICAgICAgICBhdXRvU3RhcnQ6ICcjYXV0by1zdGFydCcsXG4gICAgICAgIHN0YXR1c0RvdDogJyNzdGF0dXMtZG90JyxcbiAgICAgICAgc3RhdHVzVGV4dDogJyNzdGF0dXMtdGV4dCcsXG4gICAgICAgIHNlcnZlclVybDogJyNzZXJ2ZXItdXJsJyxcbiAgICAgICAgbG9nczogJyNsb2dzJyxcbiAgICAgICAgdG9vbHNDb250YWluZXI6ICcjdG9vbHMtY29udGFpbmVyJyxcbiAgICAgICAgc2VsZWN0QWxsOiAnI3NlbGVjdC1hbGwnLFxuICAgICAgICBkZXNlbGVjdEFsbDogJyNkZXNlbGVjdC1hbGwnLFxuICAgICAgICB0b29sQ291bnQ6ICcjdG9vbC1jb3VudCcsXG4gICAgICAgIC8vIFNlY3Rpb24gaGVhZGVycyAmIGxhYmVscyBmb3IgaTE4blxuICAgICAgICBoZWFkZXJTZXJ2ZXI6ICcjaGVhZGVyLXNlcnZlcicsXG4gICAgICAgIGhlYWRlclRvb2xzOiAnI2hlYWRlci10b29scycsXG4gICAgICAgIGhlYWRlckxvZ3M6ICcjaGVhZGVyLWxvZ3MnLFxuICAgICAgICBsYWJlbFN0YXR1czogJyNsYWJlbC1zdGF0dXMnLFxuICAgICAgICBsYWJlbEVuYWJsZTogJyNsYWJlbC1lbmFibGUnLFxuICAgICAgICBsYWJlbFBvcnQ6ICcjbGFiZWwtcG9ydCcsXG4gICAgICAgIGxhYmVsQXV0b1N0YXJ0OiAnI2xhYmVsLWF1dG8tc3RhcnQnLFxuICAgIH0sXG5cbiAgICBtZXRob2RzOiB7XG4gICAgICAgIGFwcGx5STE4bigpIHtcbiAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyc1xuICAgICAgICAgICAgaWYgKHRoaXMuJC5oZWFkZXJTZXJ2ZXIpIHRoaXMuJC5oZWFkZXJTZXJ2ZXIudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5tY3Bfc2VydmVyJyk7XG4gICAgICAgICAgICBpZiAodGhpcy4kLmhlYWRlclRvb2xzKSB0aGlzLiQuaGVhZGVyVG9vbHMudGV4dENvbnRlbnQgPSB0KCdwYW5lbC50b29scycpO1xuICAgICAgICAgICAgaWYgKHRoaXMuJC5oZWFkZXJMb2dzKSB0aGlzLiQuaGVhZGVyTG9ncy50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLmxvZ3MnKTtcbiAgICAgICAgICAgIC8vIExhYmVsc1xuICAgICAgICAgICAgaWYgKHRoaXMuJC5sYWJlbFN0YXR1cykgdGhpcy4kLmxhYmVsU3RhdHVzLnRleHRDb250ZW50ID0gdCgncGFuZWwuc3RhdHVzJyk7XG4gICAgICAgICAgICBpZiAodGhpcy4kLmxhYmVsRW5hYmxlKSB0aGlzLiQubGFiZWxFbmFibGUudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5lbmFibGUnKTtcbiAgICAgICAgICAgIGlmICh0aGlzLiQubGFiZWxQb3J0KSB0aGlzLiQubGFiZWxQb3J0LnRleHRDb250ZW50ID0gdCgncGFuZWwucG9ydCcpO1xuICAgICAgICAgICAgaWYgKHRoaXMuJC5sYWJlbEF1dG9TdGFydCkgdGhpcy4kLmxhYmVsQXV0b1N0YXJ0LnRleHRDb250ZW50ID0gdCgncGFuZWwuYXV0b19zdGFydCcpO1xuICAgICAgICAgICAgLy8gQnV0dG9uc1xuICAgICAgICAgICAgaWYgKHRoaXMuJC5zZWxlY3RBbGwpIHRoaXMuJC5zZWxlY3RBbGwudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5zZWxlY3RfYWxsJyk7XG4gICAgICAgICAgICBpZiAodGhpcy4kLmRlc2VsZWN0QWxsKSB0aGlzLiQuZGVzZWxlY3RBbGwudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5kZXNlbGVjdF9hbGwnKTtcbiAgICAgICAgICAgIC8vIFN0YXR1cyBkZWZhdWx0XG4gICAgICAgICAgICBpZiAodGhpcy4kLnN0YXR1c1RleHQpIHRoaXMuJC5zdGF0dXNUZXh0LnRleHRDb250ZW50ID0gdCgncGFuZWwuc3RvcHBlZCcpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHVwZGF0ZVN0YXR1cyhzdGF0dXM6IHsgcnVubmluZzogYm9vbGVhbjsgcG9ydDogbnVtYmVyOyB0b29sczogbnVtYmVyOyBhY3Rpb25zOiBudW1iZXIgfSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLiQuc3RhdHVzRG90IHx8ICF0aGlzLiQuc3RhdHVzVGV4dCB8fCAhdGhpcy4kLnNlcnZlclVybCkgcmV0dXJuO1xuXG4gICAgICAgICAgICBpZiAoc3RhdHVzLnJ1bm5pbmcpIHtcbiAgICAgICAgICAgICAgICB0aGlzLiQuc3RhdHVzRG90LmNsYXNzTmFtZSA9ICdzdGF0dXMtZG90IHJ1bm5pbmcnO1xuICAgICAgICAgICAgICAgIHRoaXMuJC5zdGF0dXNUZXh0LnRleHRDb250ZW50ID0gdCgncGFuZWwucnVubmluZycsIHN0YXR1cy50b29scywgc3RhdHVzLmFjdGlvbnMpO1xuICAgICAgICAgICAgICAgIHRoaXMuJC5zZXJ2ZXJVcmwudGV4dENvbnRlbnQgPSBgaHR0cDovL2xvY2FsaG9zdDoke3N0YXR1cy5wb3J0fS9tY3BgO1xuICAgICAgICAgICAgICAgIHRoaXMuJC5zZXJ2ZXJVcmwuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHRoaXMuJC5zdGF0dXNEb3QuY2xhc3NOYW1lID0gJ3N0YXR1cy1kb3Qgc3RvcHBlZCc7XG4gICAgICAgICAgICAgICAgdGhpcy4kLnN0YXR1c1RleHQudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5zdG9wcGVkJyk7XG4gICAgICAgICAgICAgICAgdGhpcy4kLnNlcnZlclVybC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGJ1aWxkVG9vbFJvd3MoY2F0ZWdvcmllczogeyBjYXRlZ29yeTogc3RyaW5nOyBpc0NvcmU6IGJvb2xlYW47IHRvb2xzOiB7IG5hbWU6IHN0cmluZzsgZGVzY3JpcHRpb246IHN0cmluZzsgZW5hYmxlZDogYm9vbGVhbiB9W10gfVtdKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuJC50b29sc0NvbnRhaW5lcikgcmV0dXJuO1xuICAgICAgICAgICAgdGhpcy4kLnRvb2xzQ29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuXG4gICAgICAgICAgICBsZXQgdG90YWxFbmFibGVkID0gMDtcbiAgICAgICAgICAgIGxldCB0b3RhbFRvb2xzID0gMDtcblxuICAgICAgICAgICAgLy8gU29ydDogY29yZSBmaXJzdCwgdGhlbiBhZHZhbmNlZFxuICAgICAgICAgICAgY29uc3Qgc29ydGVkID0gWy4uLmNhdGVnb3JpZXNdLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoYS5pc0NvcmUgJiYgIWIuaXNDb3JlKSByZXR1cm4gLTE7XG4gICAgICAgICAgICAgICAgaWYgKCFhLmlzQ29yZSAmJiBiLmlzQ29yZSkgcmV0dXJuIDE7XG4gICAgICAgICAgICAgICAgcmV0dXJuIDA7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbGV0IGxhc3RJc0NvcmU6IGJvb2xlYW4gfCBudWxsID0gbnVsbDtcblxuICAgICAgICAgICAgZm9yIChjb25zdCBjYXQgb2Ygc29ydGVkKSB7XG4gICAgICAgICAgICAgICAgLy8gR3JvdXAgZGl2aWRlclxuICAgICAgICAgICAgICAgIGlmIChsYXN0SXNDb3JlICE9PSBjYXQuaXNDb3JlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGdyb3VwTGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgZ3JvdXBMYWJlbC5jbGFzc05hbWUgPSAnY2F0ZWdvcnktZ3JvdXAtbGFiZWwnO1xuICAgICAgICAgICAgICAgICAgICBncm91cExhYmVsLnRleHRDb250ZW50ID0gY2F0LmlzQ29yZSA/IHQoJ3BhbmVsLmNvcmUnKSA6IHQoJ3BhbmVsLmFkdmFuY2VkJyk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuJC50b29sc0NvbnRhaW5lci5hcHBlbmRDaGlsZChncm91cExhYmVsKTtcbiAgICAgICAgICAgICAgICAgICAgbGFzdElzQ29yZSA9IGNhdC5pc0NvcmU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3QgZW5hYmxlZEluQ2F0ID0gY2F0LnRvb2xzLmZpbHRlcih0ID0+IHQuZW5hYmxlZCkubGVuZ3RoO1xuICAgICAgICAgICAgICAgIHRvdGFsRW5hYmxlZCArPSBlbmFibGVkSW5DYXQ7XG4gICAgICAgICAgICAgICAgdG90YWxUb29scyArPSBjYXQudG9vbHMubGVuZ3RoO1xuXG4gICAgICAgICAgICAgICAgLy8gQ2F0ZWdvcnkgaGVhZGVyIHdpdGggQWxsL05vbmUgYWN0aW9uc1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgIGhlYWRlci5jbGFzc05hbWUgPSAndG9vbC1jYXRlZ29yeS1oZWFkZXInO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyTGVmdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICAgIGhlYWRlckxlZnQuY2xhc3NOYW1lID0gJ3Rvb2wtY2F0ZWdvcnktaGVhZGVyLWxlZnQnO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0TmFtZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICBjYXROYW1lLmNsYXNzTmFtZSA9ICd0b29sLWNhdGVnb3J5LW5hbWUnO1xuICAgICAgICAgICAgICAgIGNhdE5hbWUudGV4dENvbnRlbnQgPSBjYXQuY2F0ZWdvcnk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBjYXRDb3VudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICBjYXRDb3VudC5jbGFzc05hbWUgPSAndG9vbC1jYXRlZ29yeS1jb3VudCc7XG4gICAgICAgICAgICAgICAgY2F0Q291bnQudGV4dENvbnRlbnQgPSBgJHtlbmFibGVkSW5DYXR9LyR7Y2F0LnRvb2xzLmxlbmd0aH1gO1xuXG4gICAgICAgICAgICAgICAgaGVhZGVyTGVmdC5hcHBlbmRDaGlsZChjYXROYW1lKTtcbiAgICAgICAgICAgICAgICBoZWFkZXJMZWZ0LmFwcGVuZENoaWxkKGNhdENvdW50KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlckFjdGlvbnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICBoZWFkZXJBY3Rpb25zLmNsYXNzTmFtZSA9ICd0b29sLWNhdGVnb3J5LWFjdGlvbnMnO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0U2VsZWN0QWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgICAgIGNhdFNlbGVjdEFsbC5jbGFzc05hbWUgPSAndG9vbC1jYXRlZ29yeS1hY3Rpb24nO1xuICAgICAgICAgICAgICAgIGNhdFNlbGVjdEFsbC50ZXh0Q29udGVudCA9IHQoJ3BhbmVsLmFsbCcpO1xuICAgICAgICAgICAgICAgIGNhdFNlbGVjdEFsbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHRoaXMuc2V0Q2F0ZWdvcnlUb29scyhjYXQuY2F0ZWdvcnksIHRydWUpKTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdERlc2VsZWN0QWxsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgICAgIGNhdERlc2VsZWN0QWxsLmNsYXNzTmFtZSA9ICd0b29sLWNhdGVnb3J5LWFjdGlvbic7XG4gICAgICAgICAgICAgICAgY2F0RGVzZWxlY3RBbGwudGV4dENvbnRlbnQgPSB0KCdwYW5lbC5ub25lJyk7XG4gICAgICAgICAgICAgICAgY2F0RGVzZWxlY3RBbGwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB0aGlzLnNldENhdGVnb3J5VG9vbHMoY2F0LmNhdGVnb3J5LCBmYWxzZSkpO1xuXG4gICAgICAgICAgICAgICAgaGVhZGVyQWN0aW9ucy5hcHBlbmRDaGlsZChjYXRTZWxlY3RBbGwpO1xuICAgICAgICAgICAgICAgIGhlYWRlckFjdGlvbnMuYXBwZW5kQ2hpbGQoY2F0RGVzZWxlY3RBbGwpO1xuXG4gICAgICAgICAgICAgICAgaGVhZGVyLmFwcGVuZENoaWxkKGhlYWRlckxlZnQpO1xuICAgICAgICAgICAgICAgIGhlYWRlci5hcHBlbmRDaGlsZChoZWFkZXJBY3Rpb25zKTtcbiAgICAgICAgICAgICAgICB0aGlzLiQudG9vbHNDb250YWluZXIuYXBwZW5kQ2hpbGQoaGVhZGVyKTtcblxuICAgICAgICAgICAgICAgIC8vIEluZGl2aWR1YWwgdG9vbCByb3dzXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCB0b29sIG9mIGNhdC50b29scykge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3cgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgICAgICAgcm93LmNsYXNzTmFtZSA9ICd0b29sLXJvdyc7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tib3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd1aS1jaGVja2JveCcpIGFzIGFueTtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tib3gudmFsdWUgPSB0b29sLmVuYWJsZWQ7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrYm94LnNldEF0dHJpYnV0ZSgnZGF0YS10b29sJywgdG9vbC5uYW1lKTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBuYW1lU3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICAgICAgbmFtZVNwYW4uY2xhc3NOYW1lID0gJ3Rvb2wtbmFtZSc7XG4gICAgICAgICAgICAgICAgICAgIG5hbWVTcGFuLnRleHRDb250ZW50ID0gdG9vbC5uYW1lO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc2NTcGFuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgICAgICAgICBkZXNjU3Bhbi5jbGFzc05hbWUgPSAndG9vbC1kZXNjJztcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIGkxOG4gdHJhbnNsYXRpb24gd2l0aCBmYWxsYmFjayB0byBvcmlnaW5hbCBFbmdsaXNoIGRlc2NyaXB0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYW5zbGF0ZWREZXNjID0gdChgdG9vbF9kZXNjLiR7dG9vbC5uYW1lfWApO1xuICAgICAgICAgICAgICAgICAgICBkZXNjU3Bhbi50ZXh0Q29udGVudCA9ICh0cmFuc2xhdGVkRGVzYyAmJiB0cmFuc2xhdGVkRGVzYyAhPT0gdG9vbC5uYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgPyB0cmFuc2xhdGVkRGVzYyA6IHRvb2wuZGVzY3JpcHRpb247XG5cbiAgICAgICAgICAgICAgICAgICAgcm93LmFwcGVuZENoaWxkKGNoZWNrYm94KTtcbiAgICAgICAgICAgICAgICAgICAgcm93LmFwcGVuZENoaWxkKG5hbWVTcGFuKTtcbiAgICAgICAgICAgICAgICAgICAgcm93LmFwcGVuZENoaWxkKGRlc2NTcGFuKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy4kLnRvb2xzQ29udGFpbmVyLmFwcGVuZENoaWxkKHJvdyk7XG5cbiAgICAgICAgICAgICAgICAgICAgY2hlY2tib3guYWRkRXZlbnRMaXN0ZW5lcignY29uZmlybScsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMudG9nZ2xlVG9vbCh0b29sLm5hbWUsIGNoZWNrYm94LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAodGhpcy4kLnRvb2xDb3VudCkge1xuICAgICAgICAgICAgICAgIHRoaXMuJC50b29sQ291bnQudGV4dENvbnRlbnQgPSB0KCdwYW5lbC50b29sc19lbmFibGVkJywgdG90YWxFbmFibGVkLCB0b3RhbFRvb2xzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBhc3luYyB0b2dnbGVUb29sKHRvb2xOYW1lOiBzdHJpbmcsIGVuYWJsZWQ6IGJvb2xlYW4pIHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdnZXQtc2VydmVyLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29scyA9IHsgLi4uc3RhdHVzLmVuYWJsZWRUb29scywgW3Rvb2xOYW1lXTogZW5hYmxlZCB9O1xuICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdzID0ge1xuICAgICAgICAgICAgICAgICAgICBwb3J0OiBzdGF0dXMucG9ydCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b1N0YXJ0OiBzdGF0dXMuYXV0b1N0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBlbmFibGVEZWJ1Z0xvZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWRDYXRlZ29yaWVzOiBzdGF0dXMuZW5hYmxlZENhdGVnb3JpZXMsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWRUb29scyxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAndXBkYXRlLXNldHRpbmdzJywgc2V0dGluZ3MpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaENhdGVnb3JpZXMoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2codCgncGFuZWwudG9nZ2xlX2ZhaWxlZCcsIHRvb2xOYW1lLCBlcnIubWVzc2FnZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGFzeW5jIHNldENhdGVnb3J5VG9vbHMoY2F0ZWdvcnk6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbikge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ2dldC1zZXJ2ZXItc3RhdHVzJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcmllcyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LWNhdGVnb3JpZXMnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBlbmFibGVkVG9vbHMgPSB7IC4uLnN0YXR1cy5lbmFibGVkVG9vbHMgfTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdCA9IGNhdGVnb3JpZXMuZmluZCgoYzogYW55KSA9PiBjLmNhdGVnb3J5ID09PSBjYXRlZ29yeSk7XG4gICAgICAgICAgICAgICAgaWYgKGNhdCkge1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRvb2wgb2YgY2F0LnRvb2xzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkVG9vbHNbdG9vbC5uYW1lXSA9IGVuYWJsZWQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IHtcbiAgICAgICAgICAgICAgICAgICAgcG9ydDogc3RhdHVzLnBvcnQsXG4gICAgICAgICAgICAgICAgICAgIGF1dG9TdGFydDogc3RhdHVzLmF1dG9TdGFydCxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlRGVidWdMb2c6IGZhbHNlLFxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkQ2F0ZWdvcmllczogc3RhdHVzLmVuYWJsZWRDYXRlZ29yaWVzLFxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkVG9vbHMsXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ3VwZGF0ZS1zZXR0aW5ncycsIHNldHRpbmdzKTtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyhlbmFibGVkID8gdCgncGFuZWwuY2F0ZWdvcnlfYWxsX2VuYWJsZWQnLCBjYXRlZ29yeSkgOiB0KCdwYW5lbC5jYXRlZ29yeV9hbGxfZGlzYWJsZWQnLCBjYXRlZ29yeSkpO1xuICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucmVmcmVzaENhdGVnb3JpZXMoKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2codCgncGFuZWwuZmFpbGVkJywgZXJyLm1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBhc3luYyBzZXRBbGxUb29scyhlbmFibGVkOiBib29sZWFuKSB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LXNlcnZlci1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdnZXQtY2F0ZWdvcmllcycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuYWJsZWRUb29sczogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7fTtcblxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2F0IG9mIGNhdGVnb3JpZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCB0b29sIG9mIGNhdC50b29scykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZFRvb2xzW3Rvb2wubmFtZV0gPSBlbmFibGVkO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3Qgc2V0dGluZ3MgPSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcnQ6IHN0YXR1cy5wb3J0LFxuICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IHN0YXR1cy5hdXRvU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZURlYnVnTG9nOiBmYWxzZSxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZENhdGVnb3JpZXM6IHN0YXR1cy5lbmFibGVkQ2F0ZWdvcmllcyxcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZFRvb2xzLFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICd1cGRhdGUtc2V0dGluZ3MnLCBzZXR0aW5ncyk7XG4gICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2coZW5hYmxlZCA/IHQoJ3BhbmVsLmFsbF90b29sc19lbmFibGVkJykgOiB0KCdwYW5lbC5hbGxfdG9vbHNfZGlzYWJsZWQnKSk7XG4gICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5yZWZyZXNoQ2F0ZWdvcmllcygpO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyh0KCdwYW5lbC5mYWlsZWQnLCBlcnIubWVzc2FnZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LFxuXG4gICAgICAgIGFzeW5jIHJlZnJlc2hDYXRlZ29yaWVzKCkge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yaWVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdnZXQtY2F0ZWdvcmllcycpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LXNlcnZlci1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICB0aGlzLmJ1aWxkVG9vbFJvd3MoY2F0ZWdvcmllcyk7XG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVTdGF0dXMoc3RhdHVzKTtcbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBtaWdodCBub3QgYmUgcmVhZHlcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcblxuICAgICAgICBhcHBlbmRMb2cobWVzc2FnZTogc3RyaW5nKSB7XG4gICAgICAgICAgICBpZiAoIXRoaXMuJC5sb2dzKSByZXR1cm47XG4gICAgICAgICAgICBjb25zdCBsaW5lID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgICAgICBsaW5lLmNsYXNzTmFtZSA9ICdsb2ctbGluZSc7XG4gICAgICAgICAgICBjb25zdCB0aW1lID0gbmV3IERhdGUoKS50b0xvY2FsZVRpbWVTdHJpbmcoKTtcbiAgICAgICAgICAgIGxpbmUudGV4dENvbnRlbnQgPSBgWyR7dGltZX1dICR7bWVzc2FnZX1gO1xuICAgICAgICAgICAgdGhpcy4kLmxvZ3MuYXBwZW5kQ2hpbGQobGluZSk7XG4gICAgICAgICAgICB0aGlzLiQubG9ncy5zY3JvbGxUb3AgPSB0aGlzLiQubG9ncy5zY3JvbGxIZWlnaHQ7XG5cbiAgICAgICAgICAgIHdoaWxlICh0aGlzLiQubG9ncy5jaGlsZHJlbi5sZW5ndGggPiAxMDApIHtcbiAgICAgICAgICAgICAgICB0aGlzLiQubG9ncy5yZW1vdmVDaGlsZCh0aGlzLiQubG9ncy5maXJzdENoaWxkISk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIHJlYWR5KCkge1xuICAgICAgICAvLyBBcHBseSBpMThuIHRvIHN0YXRpYyBlbGVtZW50c1xuICAgICAgICB0aGlzLmFwcGx5STE4bigpO1xuXG4gICAgICAgIC8vIFNlcnZlciB0b2dnbGVcbiAgICAgICAgaWYgKHRoaXMuJC50b2dnbGUpIHtcbiAgICAgICAgICAgIHRoaXMuJC50b2dnbGUuYWRkRXZlbnRMaXN0ZW5lcignY29uZmlybScsIGFzeW5jICgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBjaGVja2VkID0gKHRoaXMuJC50b2dnbGUgYXMgYW55KS52YWx1ZTtcbiAgICAgICAgICAgICAgICBpZiAoY2hlY2tlZCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ3N0YXJ0LXNlcnZlcicpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAodGhpcy4kLnRvZ2dsZSBhcyBhbnkpLnZhbHVlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyh0KCdwYW5lbC5zdGFydF9mYWlsZWQnLCByZXN1bHQuZXJyb3IpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwZW5kTG9nKHQoJ3BhbmVsLnNlcnZlcl9zdGFydGVkJykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdzdG9wLXNlcnZlcicpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyh0KCdwYW5lbC5zZXJ2ZXJfc3RvcHBlZCcpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFBvcnQgaW5wdXRcbiAgICAgICAgaWYgKHRoaXMuJC5wb3J0KSB7XG4gICAgICAgICAgICB0aGlzLiQucG9ydC5hZGRFdmVudExpc3RlbmVyKCdjb25maXJtJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IHBvcnQgPSBOdW1iZXIoKHRoaXMuJC5wb3J0IGFzIGFueSkudmFsdWUpO1xuICAgICAgICAgICAgICAgIGlmIChwb3J0ID4gMCAmJiBwb3J0IDwgNjU1MzYpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdnZXQtc2VydmVyLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KEVYVCwgJ3VwZGF0ZS1zZXR0aW5ncycsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBhdXRvU3RhcnQ6IHN0YXR1cy5hdXRvU3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVEZWJ1Z0xvZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkQ2F0ZWdvcmllczogc3RhdHVzLmVuYWJsZWRDYXRlZ29yaWVzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZFRvb2xzOiBzdGF0dXMuZW5hYmxlZFRvb2xzLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBlbmRMb2codCgncGFuZWwucG9ydF91cGRhdGVkJywgcG9ydCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXV0by1zdGFydCBjaGVja2JveFxuICAgICAgICBpZiAodGhpcy4kLmF1dG9TdGFydCkge1xuICAgICAgICAgICAgdGhpcy4kLmF1dG9TdGFydC5hZGRFdmVudExpc3RlbmVyKCdjb25maXJtJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGF1dG9TdGFydCA9ICh0aGlzLiQuYXV0b1N0YXJ0IGFzIGFueSkudmFsdWU7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgRWRpdG9yLk1lc3NhZ2UucmVxdWVzdChFWFQsICdnZXQtc2VydmVyLXN0YXR1cycpO1xuICAgICAgICAgICAgICAgIGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAndXBkYXRlLXNldHRpbmdzJywge1xuICAgICAgICAgICAgICAgICAgICBwb3J0OiBzdGF0dXMucG9ydCxcbiAgICAgICAgICAgICAgICAgICAgYXV0b1N0YXJ0LFxuICAgICAgICAgICAgICAgICAgICBlbmFibGVEZWJ1Z0xvZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWRDYXRlZ29yaWVzOiBzdGF0dXMuZW5hYmxlZENhdGVnb3JpZXMsXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWRUb29sczogc3RhdHVzLmVuYWJsZWRUb29scyxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB0aGlzLmFwcGVuZExvZyhhdXRvU3RhcnQgPyB0KCdwYW5lbC5hdXRvX3N0YXJ0X2VuYWJsZWQnKSA6IHQoJ3BhbmVsLmF1dG9fc3RhcnRfZGlzYWJsZWQnKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNlbGVjdCBBbGwgLyBEZXNlbGVjdCBBbGwgYnV0dG9uc1xuICAgICAgICBpZiAodGhpcy4kLnNlbGVjdEFsbCkge1xuICAgICAgICAgICAgdGhpcy4kLnNlbGVjdEFsbC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNldEFsbFRvb2xzKHRydWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuJC5kZXNlbGVjdEFsbCkge1xuICAgICAgICAgICAgdGhpcy4kLmRlc2VsZWN0QWxsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHRoaXMuc2V0QWxsVG9vbHMoZmFsc2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBQb2xsIHNlcnZlciBzdGF0dXMgZXZlcnkgMyBzZWNvbmRzXG4gICAgICAgIGNvbnN0IHBvbGxTdGF0dXMgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoRVhULCAnZ2V0LXNlcnZlci1zdGF0dXMnKTtcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVN0YXR1cyhzdGF0dXMpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLiQudG9nZ2xlKSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLiQudG9nZ2xlIGFzIGFueSkudmFsdWUgPSBzdGF0dXMucnVubmluZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuJC5wb3J0KSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLiQucG9ydCBhcyBhbnkpLnZhbHVlID0gc3RhdHVzLnBvcnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICh0aGlzLiQuYXV0b1N0YXJ0KSB7XG4gICAgICAgICAgICAgICAgICAgICh0aGlzLiQuYXV0b1N0YXJ0IGFzIGFueSkudmFsdWUgPSBzdGF0dXMuYXV0b1N0YXJ0O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gY2F0Y2gge1xuICAgICAgICAgICAgICAgIC8vIEV4dGVuc2lvbiBtaWdodCBub3QgYmUgcmVhZHkgeWV0XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW5pdGlhbCBsb2FkXG4gICAgICAgIHRoaXMucmVmcmVzaENhdGVnb3JpZXMoKTtcbiAgICAgICAgcG9sbFN0YXR1cygpO1xuICAgICAgICBwb2xsSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChwb2xsU3RhdHVzLCAzMDAwKTtcbiAgICB9LFxuXG4gICAgYmVmb3JlQ2xvc2UoKSB7fSxcblxuICAgIGNsb3NlKCkge1xuICAgICAgICBpZiAocG9sbEludGVydmFsKSB7XG4gICAgICAgICAgICBjbGVhckludGVydmFsKHBvbGxJbnRlcnZhbCk7XG4gICAgICAgICAgICBwb2xsSW50ZXJ2YWwgPSBudWxsO1xuICAgICAgICB9XG4gICAgfSxcbn0pO1xuIl19