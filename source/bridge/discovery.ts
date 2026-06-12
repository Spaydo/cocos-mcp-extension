/**
 * Discovery 機制：把 bridge 連線資訊與工具目錄快取寫到
 * <專案>/temp/cocos-mcp/{bridge.json, tools.json}，供 sidecar 讀取。
 * 不依賴全域 Editor（projectPath 由呼叫端注入），可在編輯器外測試。
 */
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BridgeInfo, McpToolSpec } from '../types';

export function discoveryDir(projectPath: string): string {
    return join(projectPath, 'temp', 'cocos-mcp');
}

export function bridgeInfoPath(projectPath: string): string {
    return join(discoveryDir(projectPath), 'bridge.json');
}

export function toolsCachePath(projectPath: string): string {
    return join(discoveryDir(projectPath), 'tools.json');
}

function ensureDir(projectPath: string): void {
    const dir = discoveryDir(projectPath);
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}

export function writeBridgeInfo(projectPath: string, info: BridgeInfo): void {
    ensureDir(projectPath);
    writeFileSync(bridgeInfoPath(projectPath), JSON.stringify(info, null, 2), 'utf-8');
}

/** 工具目錄快取：編輯器關閉時 sidecar 仍可回應 tools/list（呼叫時才報編輯器離線） */
export function writeToolsCache(projectPath: string, tools: McpToolSpec[]): void {
    ensureDir(projectPath);
    writeFileSync(toolsCachePath(projectPath), JSON.stringify({ tools }, null, 2), 'utf-8');
}

export function sidecarInfoPath(projectPath: string): string {
    return join(discoveryDir(projectPath), 'sidecar.json');
}

/**
 * Sidecar 入口資訊：給「一鍵設定」引導指令（bootstrap）定位 sidecar 用。
 * 每次 bridge 啟動時重寫（專案搬移/換機器後開一次編輯器即自動修正），
 * 停止時不清除（編輯器離線時 bootstrap 仍可啟動 sidecar 以回報快取工具）。
 */
export function writeSidecarInfo(projectPath: string, entry: string, extensionVersion: string): void {
    ensureDir(projectPath);
    writeFileSync(
        sidecarInfoPath(projectPath),
        JSON.stringify({ entry, extensionVersion, updatedAt: new Date().toISOString() }, null, 2),
        'utf-8',
    );
}

/** bridge 停止時清除連線資訊（保留 tools.json 作離線快取） */
export function clearBridgeInfo(projectPath: string): void {
    try {
        if (existsSync(bridgeInfoPath(projectPath))) {
            unlinkSync(bridgeInfoPath(projectPath));
        }
    } catch (err) {
        console.warn('[cocos-mcp] 清除 discovery 檔失敗：', err);
    }
}
