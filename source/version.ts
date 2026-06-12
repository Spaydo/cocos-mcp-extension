/**
 * 版本偵測：整個擴展唯一允許讀取 Editor.App.version 的地方。
 * 其他模組一律透過 EditorEnv.capabilities 做行為分支。
 */
import { Capabilities, EditorEnv, EditorVersion } from './types';

export function parseVersion(raw: string): EditorVersion {
    const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(raw).trim());
    if (!m) {
        return { major: 0, minor: 0, patch: 0, raw: String(raw) };
    }
    return {
        major: Number(m[1]),
        minor: Number(m[2]),
        patch: Number(m[3]),
        raw: String(raw),
    };
}

export function atLeast(v: EditorVersion, major: number, minor: number, patch: number): boolean {
    if (v.major !== major) return v.major > major;
    if (v.minor !== minor) return v.minor > minor;
    return v.patch >= patch;
}

export function buildCapabilities(version: EditorVersion): Capabilities {
    const is388plus = atLeast(version, 3, 8, 8);
    return {
        createNodeReturnsString: is388plus,
        assetUsersPublic: is388plus,
        multiScene: is388plus,
        autoAdaptToCreate: is388plus,
        saveAsSceneNeedsFlag: !is388plus,
    };
}

/** 在編輯器主進程內呼叫（依賴全域 Editor） */
export function detectEditorEnv(): EditorEnv {
    const version = parseVersion(Editor.App.version);
    return { version, capabilities: buildCapabilities(version) };
}
