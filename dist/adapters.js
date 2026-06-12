"use strict";
/**
 * 跨版本 result 正規化層。
 * 依據 docs/api-reference/07-version-diff-summary.md §2/§3 的差異表。
 * 全部為純函式（不碰全域 Editor），可在編輯器外單元測試。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCreateNodeResult = normalizeCreateNodeResult;
exports.normalizeNodeTree = normalizeNodeTree;
exports.normalizeComponentList = normalizeComponentList;
exports.normalizeSaveSceneResult = normalizeSaveSceneResult;
exports.buildSaveAsSceneArgs = buildSaveAsSceneArgs;
exports.normalizeUuidList = normalizeUuidList;
/** create-node：3.8.4 回 string[]、3.8.8 回 string → 統一 string */
function normalizeCreateNodeResult(result) {
    var _a;
    if (Array.isArray(result)) {
        return String((_a = result[0]) !== null && _a !== void 0 ? _a : '');
    }
    return String(result !== null && result !== void 0 ? result : '');
}
/**
 * query-node-tree：3.8.4 型別標 INode[]（runtime 實為樹物件）、3.8.8 標 INode。
 * 統一輸出樹物件；若 runtime 真回陣列則取首個。
 */
function normalizeNodeTree(result) {
    if (Array.isArray(result)) {
        return result.length === 1 ? result[0] : result;
    }
    return result !== null && result !== void 0 ? result : null;
}
/** query-components：3.8.4 回 string[]、3.8.8 回 {name,cid,path,assetUuid}[] → 統一物件陣列 */
function normalizeComponentList(result) {
    if (!Array.isArray(result))
        return [];
    return result.map((item) => {
        var _a;
        if (typeof item === 'string') {
            return { name: item };
        }
        const obj = item;
        return {
            name: String((_a = obj.name) !== null && _a !== void 0 ? _a : ''),
            cid: obj.cid === undefined ? undefined : String(obj.cid),
            path: obj.path === undefined ? undefined : String(obj.path),
            assetUuid: obj.assetUuid === undefined ? undefined : String(obj.assetUuid),
        };
    });
}
/** save-scene：3.8.4 回 boolean、3.8.8 回 string|undefined（場景 uuid） */
function normalizeSaveSceneResult(result) {
    if (typeof result === 'string') {
        return { saved: true, uuid: result };
    }
    if (typeof result === 'boolean') {
        return { saved: result };
    }
    // 3.8.8 存檔成功但無 uuid（undefined）視為成功
    return { saved: true };
}
/**
 * save-as-scene 的 params：3.8.4 須傳 [boolean]、3.8.8 為 []。
 * boolean 語意（3.8.4）：是否略過詢問直接另存，實作於 3B 確認後補充說明。
 */
function buildSaveAsSceneArgs(saveAsSceneNeedsFlag) {
    return saveAsSceneNeedsFlag ? [true] : [];
}
/**
 * query-asset-users / query-asset-dependencies：
 * 3.8.4（protected）users 回 string|null；3.8.8（公開）回 string[] → 統一 string[]
 */
function normalizeUuidList(result) {
    if (result === null || result === undefined)
        return [];
    if (Array.isArray(result))
        return result.map(String);
    return [String(result)];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWRhcHRlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvYWRhcHRlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7O0FBR0gsOERBS0M7QUFNRCw4Q0FLQztBQVVELHdEQWNDO0FBR0QsNERBU0M7QUFNRCxvREFFQztBQU1ELDhDQUlDO0FBdkVELDhEQUE4RDtBQUM5RCxTQUFnQix5QkFBeUIsQ0FBQyxNQUFlOztJQUNyRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUN4QixPQUFPLE1BQU0sQ0FBQyxNQUFBLE1BQU0sQ0FBQyxDQUFDLENBQUMsbUNBQUksRUFBRSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDLE1BQU0sYUFBTixNQUFNLGNBQU4sTUFBTSxHQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ2hDLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxNQUFlO0lBQzdDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQ3hCLE9BQU8sTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0lBQ3BELENBQUM7SUFDRCxPQUFPLE1BQU0sYUFBTixNQUFNLGNBQU4sTUFBTSxHQUFJLElBQUksQ0FBQztBQUMxQixDQUFDO0FBU0QscUZBQXFGO0FBQ3JGLFNBQWdCLHNCQUFzQixDQUFDLE1BQWU7SUFDbEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO1FBQUUsT0FBTyxFQUFFLENBQUM7SUFDdEMsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7O1FBQ3ZCLElBQUksT0FBTyxJQUFJLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDM0IsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUMxQixDQUFDO1FBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBK0IsQ0FBQztRQUM1QyxPQUFPO1lBQ0gsSUFBSSxFQUFFLE1BQU0sQ0FBQyxNQUFBLEdBQUcsQ0FBQyxJQUFJLG1DQUFJLEVBQUUsQ0FBQztZQUM1QixHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsS0FBSyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7WUFDeEQsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQzNELFNBQVMsRUFBRSxHQUFHLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQztTQUM3RSxDQUFDO0lBQ04sQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBRUQsbUVBQW1FO0FBQ25FLFNBQWdCLHdCQUF3QixDQUFDLE1BQWU7SUFDcEQsSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUM3QixPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDekMsQ0FBQztJQUNELElBQUksT0FBTyxNQUFNLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDOUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQztJQUM3QixDQUFDO0lBQ0QsbUNBQW1DO0lBQ25DLE9BQU8sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDM0IsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLG9CQUFvQixDQUFDLG9CQUE2QjtJQUM5RCxPQUFPLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDOUMsQ0FBQztBQUVEOzs7R0FHRztBQUNILFNBQWdCLGlCQUFpQixDQUFDLE1BQWU7SUFDN0MsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxTQUFTO1FBQUUsT0FBTyxFQUFFLENBQUM7SUFDdkQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUFFLE9BQU8sTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNyRCxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICog6Leo54mI5pysIHJlc3VsdCDmraPopo/ljJblsaTjgIJcbiAqIOS+neaTmiBkb2NzL2FwaS1yZWZlcmVuY2UvMDctdmVyc2lvbi1kaWZmLXN1bW1hcnkubWQgwqcyL8KnMyDnmoTlt67nlbDooajjgIJcbiAqIOWFqOmDqOeCuue0lOWHveW8j++8iOS4jeeisOWFqOWfnyBFZGl0b3LvvInvvIzlj6/lnKjnt6jovK/lmajlpJbllq7lhYPmuKzoqabjgIJcbiAqL1xuXG4vKiogY3JlYXRlLW5vZGXvvJozLjguNCDlm54gc3RyaW5nW13jgIEzLjguOCDlm54gc3RyaW5nIOKGkiDntbHkuIAgc3RyaW5nICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplQ3JlYXRlTm9kZVJlc3VsdChyZXN1bHQ6IHVua25vd24pOiBzdHJpbmcge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3VsdCkpIHtcbiAgICAgICAgcmV0dXJuIFN0cmluZyhyZXN1bHRbMF0gPz8gJycpO1xuICAgIH1cbiAgICByZXR1cm4gU3RyaW5nKHJlc3VsdCA/PyAnJyk7XG59XG5cbi8qKlxuICogcXVlcnktbm9kZS10cmVl77yaMy44LjQg5Z6L5Yil5qiZIElOb2RlW13vvIhydW50aW1lIOWvpueCuuaoueeJqeS7tu+8ieOAgTMuOC44IOaomSBJTm9kZeOAglxuICog57Wx5LiA6Ly45Ye65qi554mp5Lu277yb6IulIHJ1bnRpbWUg55yf5Zue6Zmj5YiX5YmH5Y+W6aaW5YCL44CCXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVOb2RlVHJlZShyZXN1bHQ6IHVua25vd24pOiB1bmtub3duIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQpKSB7XG4gICAgICAgIHJldHVybiByZXN1bHQubGVuZ3RoID09PSAxID8gcmVzdWx0WzBdIDogcmVzdWx0O1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0ID8/IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9uZW50TGlzdEl0ZW0ge1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBjaWQ/OiBzdHJpbmc7XG4gICAgcGF0aD86IHN0cmluZztcbiAgICBhc3NldFV1aWQ/OiBzdHJpbmc7XG59XG5cbi8qKiBxdWVyeS1jb21wb25lbnRz77yaMy44LjQg5ZueIHN0cmluZ1td44CBMy44Ljgg5ZueIHtuYW1lLGNpZCxwYXRoLGFzc2V0VXVpZH1bXSDihpIg57Wx5LiA54mp5Lu26Zmj5YiXICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplQ29tcG9uZW50TGlzdChyZXN1bHQ6IHVua25vd24pOiBDb21wb25lbnRMaXN0SXRlbVtdIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVzdWx0KSkgcmV0dXJuIFtdO1xuICAgIHJldHVybiByZXN1bHQubWFwKChpdGVtKSA9PiB7XG4gICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB7IG5hbWU6IGl0ZW0gfTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBvYmogPSBpdGVtIGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogU3RyaW5nKG9iai5uYW1lID8/ICcnKSxcbiAgICAgICAgICAgIGNpZDogb2JqLmNpZCA9PT0gdW5kZWZpbmVkID8gdW5kZWZpbmVkIDogU3RyaW5nKG9iai5jaWQpLFxuICAgICAgICAgICAgcGF0aDogb2JqLnBhdGggPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IFN0cmluZyhvYmoucGF0aCksXG4gICAgICAgICAgICBhc3NldFV1aWQ6IG9iai5hc3NldFV1aWQgPT09IHVuZGVmaW5lZCA/IHVuZGVmaW5lZCA6IFN0cmluZyhvYmouYXNzZXRVdWlkKSxcbiAgICAgICAgfTtcbiAgICB9KTtcbn1cblxuLyoqIHNhdmUtc2NlbmXvvJozLjguNCDlm54gYm9vbGVhbuOAgTMuOC44IOWbniBzdHJpbmd8dW5kZWZpbmVk77yI5aC05pmvIHV1aWTvvIkgKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVTYXZlU2NlbmVSZXN1bHQocmVzdWx0OiB1bmtub3duKTogeyBzYXZlZDogYm9vbGVhbjsgdXVpZD86IHN0cmluZyB9IHtcbiAgICBpZiAodHlwZW9mIHJlc3VsdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIHsgc2F2ZWQ6IHRydWUsIHV1aWQ6IHJlc3VsdCB9O1xuICAgIH1cbiAgICBpZiAodHlwZW9mIHJlc3VsdCA9PT0gJ2Jvb2xlYW4nKSB7XG4gICAgICAgIHJldHVybiB7IHNhdmVkOiByZXN1bHQgfTtcbiAgICB9XG4gICAgLy8gMy44Ljgg5a2Y5qqU5oiQ5Yqf5L2G54ShIHV1aWTvvIh1bmRlZmluZWTvvInoppbngrrmiJDlip9cbiAgICByZXR1cm4geyBzYXZlZDogdHJ1ZSB9O1xufVxuXG4vKipcbiAqIHNhdmUtYXMtc2NlbmUg55qEIHBhcmFtc++8mjMuOC40IOmgiOWCsyBbYm9vbGVhbl3jgIEzLjguOCDngrogW13jgIJcbiAqIGJvb2xlYW4g6Kqe5oSP77yIMy44LjTvvInvvJrmmK/lkKbnlaXpgY7oqaLllY/nm7TmjqXlj6blrZjvvIzlr6bkvZzmlrwgM0Ig56K66KqN5b6M6KOc5YWF6Kqq5piO44CCXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZFNhdmVBc1NjZW5lQXJncyhzYXZlQXNTY2VuZU5lZWRzRmxhZzogYm9vbGVhbik6IHVua25vd25bXSB7XG4gICAgcmV0dXJuIHNhdmVBc1NjZW5lTmVlZHNGbGFnID8gW3RydWVdIDogW107XG59XG5cbi8qKlxuICogcXVlcnktYXNzZXQtdXNlcnMgLyBxdWVyeS1hc3NldC1kZXBlbmRlbmNpZXPvvJpcbiAqIDMuOC4077yIcHJvdGVjdGVk77yJdXNlcnMg5ZueIHN0cmluZ3xudWxs77ybMy44LjjvvIjlhazplovvvInlm54gc3RyaW5nW10g4oaSIOe1seS4gCBzdHJpbmdbXVxuICovXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplVXVpZExpc3QocmVzdWx0OiB1bmtub3duKTogc3RyaW5nW10ge1xuICAgIGlmIChyZXN1bHQgPT09IG51bGwgfHwgcmVzdWx0ID09PSB1bmRlZmluZWQpIHJldHVybiBbXTtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShyZXN1bHQpKSByZXR1cm4gcmVzdWx0Lm1hcChTdHJpbmcpO1xuICAgIHJldHVybiBbU3RyaW5nKHJlc3VsdCldO1xufVxuIl19