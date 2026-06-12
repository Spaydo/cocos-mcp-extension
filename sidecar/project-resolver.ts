/**
 * 專案路徑解析：讓 --project 變成可選。
 * 優先序：--project 參數 > COCOS_MCP_PROJECT 環境變數 > cwd 本身是專案 > （呼叫端向下掃描）。
 * 刻意「只看同層與向下」、不向上爬：多開編輯器 + 多開 MCP 客戶端時，
 * 每個客戶端只會控制自己開啟的專案（或其下層的專案），行為可預期。
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

/** 判斷目錄是否為 Cocos Creator 專案根目錄 */
export function isCocosProject(dir: string): boolean {
    // 痕跡 1：本擴展的 discovery 目錄（編輯器開過 bridge 就會存在）
    if (existsSync(join(dir, 'temp', 'cocos-mcp'))) {
        return true;
    }
    // 痕跡 2：Cocos 專案的 package.json 帶 creator 欄位
    try {
        const pkgPath = join(dir, 'package.json');
        if (existsSync(pkgPath)) {
            const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            if (pkg && typeof pkg === 'object' && pkg.creator) {
                return true;
            }
        }
    } catch {
        // 非 JSON 或讀取失敗 → 不是專案根
    }
    return false;
}

/** 向下掃描時略過的目錄（Cocos 專案內部結構與常見大型目錄） */
const SKIP_DIRS = new Set([
    'node_modules',
    'library',
    'temp',
    'local',
    'build',
    'dist',
    'extensions',
    'assets',
    'profiles',
    'settings',
    'packages',
]);

/**
 * 從 baseDir 向下尋找 Cocos 專案（情境 B：Claude Code 開在多專案根目錄）。
 * BFS、預設最多 2 層；找到專案就不再深入該專案內部。
 */
export function findProjectsDownwards(baseDir: string, maxDepth = 2): string[] {
    const results: string[] = [];
    const queue: Array<{ dir: string; depth: number }> = [{ dir: resolve(baseDir), depth: 0 }];
    while (queue.length > 0) {
        const { dir, depth } = queue.shift()!;
        if (depth > 0 && isCocosProject(dir)) {
            results.push(dir);
            continue;
        }
        if (depth >= maxDepth) {
            continue;
        }
        let entries;
        try {
            entries = readdirSync(dir, { withFileTypes: true });
        } catch {
            continue;
        }
        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
            queue.push({ dir: join(dir, entry.name), depth: depth + 1 });
        }
    }
    return results;
}

export interface DiscoveredBridge {
    port: number;
    token: string;
    startedAt?: string;
}

/** 讀取某專案的 bridge discovery 檔（不存在或格式錯誤回 null） */
export function readBridgeInfo(projectPath: string): DiscoveredBridge | null {
    try {
        const file = join(projectPath, 'temp', 'cocos-mcp', 'bridge.json');
        if (!existsSync(file)) return null;
        const info = JSON.parse(readFileSync(file, 'utf-8'));
        if (!info || typeof info.port !== 'number' || typeof info.token !== 'string') {
            return null;
        }
        return info;
    } catch {
        return null;
    }
}

export interface ResolvedProject {
    projectPath: string;
    source: 'arg' | 'env' | 'cwd-project' | 'cwd-fallback';
}

export function resolveProjectPath(
    argv: string[],
    env: Record<string, string | undefined>,
    cwd: string,
): ResolvedProject {
    const idx = argv.indexOf('--project');
    if (idx >= 0 && argv[idx + 1]) {
        return { projectPath: resolve(cwd, argv[idx + 1]), source: 'arg' };
    }
    if (env.COCOS_MCP_PROJECT) {
        return { projectPath: resolve(cwd, env.COCOS_MCP_PROJECT), source: 'env' };
    }
    if (isCocosProject(resolve(cwd))) {
        return { projectPath: resolve(cwd), source: 'cwd-project' };
    }
    return { projectPath: resolve(cwd), source: 'cwd-fallback' };
}
