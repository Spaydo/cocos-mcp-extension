/**
 * 場景腳本（scene script）：在場景進程內執行，可使用 cc 引擎 API。
 * 透過 Editor.Message.request('scene', 'execute-scene-script',
 *   { name: 'cocos-mcp-extension', method: '<方法名>', args: [...] }) 呼叫。
 *
 * 原則（docs/api-reference/05 §g）：
 * - 只做 scene message 做不到的事
 * - 用特性偵測（typeof 檢查）優先於版本字串比較
 */

// 場景進程內以 require 取得引擎模組
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cc = require('cc');

export function load(): void {
    // 場景腳本載入
}

export function unload(): void {
    // 場景腳本卸載
}

export const methods: Record<string, (...args: any[]) => any> = {
    /** 引擎環境資訊（3A 示範方法，驗證 execute-scene-script 通路） */
    queryEngineInfo() {
        return {
            version: String(cc.VERSION),
            features: {
                uiSkew: typeof cc.UISkew !== 'undefined',
                sorting2D: typeof cc.Sorting2D !== 'undefined',
            },
        };
    },
};
