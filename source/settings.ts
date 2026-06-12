/**
 * 設定讀寫：<專案>/profiles/cocos-mcp.json
 * （沿用舊版的檔案式設定模式，但 schema 重新定義）
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BridgeSettings, DEFAULT_SETTINGS } from './types';

const SETTINGS_FILE = 'cocos-mcp.json';

function settingsPath(projectPath: string): string {
    const dir = join(projectPath, 'profiles');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return join(dir, SETTINGS_FILE);
}

export function readSettings(projectPath: string): BridgeSettings {
    try {
        const file = settingsPath(projectPath);
        if (existsSync(file)) {
            const saved = JSON.parse(readFileSync(file, 'utf-8'));
            return {
                port: Number(saved.port) > 0 ? Number(saved.port) : DEFAULT_SETTINGS.port,
                autoStart: typeof saved.autoStart === 'boolean' ? saved.autoStart : DEFAULT_SETTINGS.autoStart,
                requestTimeoutMs:
                    Number(saved.requestTimeoutMs) > 0
                        ? Number(saved.requestTimeoutMs)
                        : DEFAULT_SETTINGS.requestTimeoutMs,
            };
        }
    } catch (err) {
        console.warn('[cocos-mcp] 讀取設定失敗，使用預設值：', err);
    }
    return { ...DEFAULT_SETTINGS };
}

export function saveSettings(projectPath: string, settings: BridgeSettings): void {
    try {
        writeFileSync(settingsPath(projectPath), JSON.stringify(settings, null, 2), 'utf-8');
    } catch (err) {
        console.error('[cocos-mcp] 寫入設定失敗：', err);
    }
}
