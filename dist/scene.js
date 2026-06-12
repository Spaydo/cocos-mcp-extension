"use strict";
/**
 * 場景腳本（scene script）：在場景進程內執行，可使用 cc 引擎 API。
 * 透過 Editor.Message.request('scene', 'execute-scene-script',
 *   { name: 'cocos-mcp-extension', method: '<方法名>', args: [...] }) 呼叫。
 *
 * 原則（docs/api-reference/05 §g）：
 * - 只做 scene message 做不到的事
 * - 用特性偵測（typeof 檢查）優先於版本字串比較
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
exports.load = load;
exports.unload = unload;
// 場景進程內以 require 取得引擎模組
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cc = require('cc');
function load() {
    // 場景腳本載入
}
function unload() {
    // 場景腳本卸載
}
exports.methods = {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7OztHQVFHOzs7QUFNSCxvQkFFQztBQUVELHdCQUVDO0FBVkQsd0JBQXdCO0FBQ3hCLDhEQUE4RDtBQUM5RCxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFFekIsU0FBZ0IsSUFBSTtJQUNoQixTQUFTO0FBQ2IsQ0FBQztBQUVELFNBQWdCLE1BQU07SUFDbEIsU0FBUztBQUNiLENBQUM7QUFFWSxRQUFBLE9BQU8sR0FBNEM7SUFDNUQsaURBQWlEO0lBQ2pELGVBQWU7UUFDWCxPQUFPO1lBQ0gsT0FBTyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDO1lBQzNCLFFBQVEsRUFBRTtnQkFDTixNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsTUFBTSxLQUFLLFdBQVc7Z0JBQ3hDLFNBQVMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxTQUFTLEtBQUssV0FBVzthQUNqRDtTQUNKLENBQUM7SUFDTixDQUFDO0NBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog5aC05pmv6IWz5pys77yIc2NlbmUgc2NyaXB077yJ77ya5Zyo5aC05pmv6YCy56iL5YWn5Z+36KGM77yM5Y+v5L2/55SoIGNjIOW8leaTjiBBUEnjgIJcbiAqIOmAj+mBjiBFZGl0b3IuTWVzc2FnZS5yZXF1ZXN0KCdzY2VuZScsICdleGVjdXRlLXNjZW5lLXNjcmlwdCcsXG4gKiAgIHsgbmFtZTogJ2NvY29zLW1jcC1leHRlbnNpb24nLCBtZXRob2Q6ICc85pa55rOV5ZCNPicsIGFyZ3M6IFsuLi5dIH0pIOWRvOWPq+OAglxuICpcbiAqIOWOn+WJh++8iGRvY3MvYXBpLXJlZmVyZW5jZS8wNSDCp2fvvInvvJpcbiAqIC0g5Y+q5YGaIHNjZW5lIG1lc3NhZ2Ug5YGa5LiN5Yiw55qE5LqLXG4gKiAtIOeUqOeJueaAp+WBtea4rO+8iHR5cGVvZiDmqqLmn6XvvInlhKrlhYjmlrzniYjmnKzlrZfkuLLmr5TovINcbiAqL1xuXG4vLyDloLTmma/pgLLnqIvlhafku6UgcmVxdWlyZSDlj5blvpflvJXmk47mqKHntYRcbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdmFyLXJlcXVpcmVzXG5jb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkKCk6IHZvaWQge1xuICAgIC8vIOWgtOaZr+iFs+acrOi8ieWFpVxufVxuXG5leHBvcnQgZnVuY3Rpb24gdW5sb2FkKCk6IHZvaWQge1xuICAgIC8vIOWgtOaZr+iFs+acrOWNuOi8iVxufVxuXG5leHBvcnQgY29uc3QgbWV0aG9kczogUmVjb3JkPHN0cmluZywgKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnk+ID0ge1xuICAgIC8qKiDlvJXmk47nkrDlooPos4foqIrvvIgzQSDnpLrnr4Tmlrnms5XvvIzpqZforYkgZXhlY3V0ZS1zY2VuZS1zY3JpcHQg6YCa6Lev77yJICovXG4gICAgcXVlcnlFbmdpbmVJbmZvKCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmVyc2lvbjogU3RyaW5nKGNjLlZFUlNJT04pLFxuICAgICAgICAgICAgZmVhdHVyZXM6IHtcbiAgICAgICAgICAgICAgICB1aVNrZXc6IHR5cGVvZiBjYy5VSVNrZXcgIT09ICd1bmRlZmluZWQnLFxuICAgICAgICAgICAgICAgIHNvcnRpbmcyRDogdHlwZW9mIGNjLlNvcnRpbmcyRCAhPT0gJ3VuZGVmaW5lZCcsXG4gICAgICAgICAgICB9LFxuICAgICAgICB9O1xuICAgIH0sXG59O1xuIl19