import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { MCPServerSettings, DEFAULT_ENABLED_CATEGORIES } from './types';

const SETTINGS_FILE = 'mcp-extension.json';

const DEFAULT_SETTINGS: MCPServerSettings = {
    port: 3000,
    autoStart: false,
    enableDebugLog: false,
    enabledCategories: { ...DEFAULT_ENABLED_CATEGORIES },
    enabledTools: {},
};

function getSettingsDir(): string {
    const dir = join(Editor.Project.path, 'profiles');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function getSettingsPath(): string {
    return join(getSettingsDir(), SETTINGS_FILE);
}

export function readSettings(): MCPServerSettings {
    try {
        const filePath = getSettingsPath();
        if (existsSync(filePath)) {
            const content = readFileSync(filePath, 'utf-8');
            const saved = JSON.parse(content);
            return {
                ...DEFAULT_SETTINGS,
                ...saved,
                enabledCategories: { ...DEFAULT_ENABLED_CATEGORIES, ...saved.enabledCategories },
                enabledTools: saved.enabledTools || {},
            };
        }
    } catch (err) {
        console.warn('[MCP] Failed to read settings, using defaults:', err);
    }
    return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: MCPServerSettings): void {
    try {
        const filePath = getSettingsPath();
        writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (err) {
        console.error('[MCP] Failed to save settings:', err);
    }
}
