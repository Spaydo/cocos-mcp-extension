"use strict";
/**
 * 「一鍵設定」引導指令：註冊到 MCP 客戶端的指令本身不含任何機器路徑，
 * 執行時才從客戶端的工作目錄動態定位專案內的擴展並啟動其 sidecar。
 * → 同一條指令在任何電腦、任何使用者、任何專案都通用。
 *
 * BOOTSTRAP_SCRIPT 是下列邏輯的單行版（經 node -e 執行）：
 *
 *   1. 若 cwd 本身（或向下掃描最多 2 層，略過 node_modules/library 等）
 *      找到「有 temp/cocos-mcp/sidecar.json 或 extensions(*)/dist-sidecar/index.js」的目錄，
 *      視為目標專案（同層或向下，不向上爬）
 *   2. 讀 temp/cocos-mcp/sidecar.json 的 entry（編輯器擴展啟動時寫入）；
 *      檔案不存在或路徑失效（例如專案搬到新機器）→ 改掃 extensions/(任意名稱)/dist-sidecar/index.js
 *   3. require(entry) 啟動 sidecar；sidecar 自己會再做「活著的 bridge 優先」的精確定位
 *
 * 注意：腳本內只能用雙引號（外層以單引號包給 shell——zsh/bash 與 PowerShell 皆可；
 * cmd.exe 不支援單引號，Windows 請在 PowerShell 執行或改用手動 JSON 設定）。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOOTSTRAP_SCRIPT = void 0;
exports.buildUniversalCommand = buildUniversalCommand;
exports.BOOTSTRAP_SCRIPT = 'var f=require("fs"),p=require("path");' +
    'function has(d){return f.existsSync(p.join(d,"temp","cocos-mcp","sidecar.json"))}' +
    'function ext(d){var x=p.join(d,"extensions"),r=null;' +
    'try{f.readdirSync(x).forEach(function(n){var c=p.join(x,n,"dist-sidecar","index.js");if(!r&&f.existsSync(c))r=c})}catch(e){}return r}' +
    'function ok(d){return has(d)||ext(d)}' +
    'function pick(b){if(ok(b))return b;' +
    'var S={node_modules:1,library:1,temp:1,local:1,build:1,dist:1,assets:1,profiles:1,settings:1,packages:1},q=[[b,0]];' +
    'while(q.length){var t=q.shift(),d=t[0],k=t[1];' +
    'if(k>0&&ok(d))return d;if(k>=2)continue;' +
    'var e;try{e=f.readdirSync(d,{withFileTypes:true})}catch(err){continue}' +
    'for(var i=0;i<e.length;i++){var n=e[i];' +
    'if(n.isDirectory()&&n.name.indexOf(".")!==0&&!S[n.name])q.push([p.join(d,n.name),k+1])}}' +
    'return null}' +
    'var cwd=process.cwd(),proj=pick(cwd);' +
    'if(!proj){console.error("[cocos-mcp] no Cocos project with the MCP extension found at or below "+cwd);process.exit(1)}' +
    'var entry=null;' +
    'try{entry=JSON.parse(f.readFileSync(p.join(proj,"temp","cocos-mcp","sidecar.json"),"utf8")).entry}catch(e){}' +
    'if(!entry||!f.existsSync(entry))entry=ext(proj);' +
    'if(!entry){console.error("[cocos-mcp] sidecar not found in "+proj);process.exit(1)}' +
    'require(entry);';
/** 組出可直接貼到終端機的一鍵設定指令（zsh / bash / PowerShell 通用） */
function buildUniversalCommand() {
    return `claude mcp add --scope user cocos -- node -e '${exports.BOOTSTRAP_SCRIPT}'`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvYm9vdHN0cmFwLWNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHOzs7QUF5Qkgsc0RBRUM7QUF6QlksUUFBQSxnQkFBZ0IsR0FDekIsd0NBQXdDO0lBQ3hDLG1GQUFtRjtJQUNuRixzREFBc0Q7SUFDdEQsdUlBQXVJO0lBQ3ZJLHVDQUF1QztJQUN2QyxxQ0FBcUM7SUFDckMscUhBQXFIO0lBQ3JILGdEQUFnRDtJQUNoRCwwQ0FBMEM7SUFDMUMsd0VBQXdFO0lBQ3hFLHlDQUF5QztJQUN6QywwRkFBMEY7SUFDMUYsY0FBYztJQUNkLHVDQUF1QztJQUN2Qyx3SEFBd0g7SUFDeEgsaUJBQWlCO0lBQ2pCLDhHQUE4RztJQUM5RyxrREFBa0Q7SUFDbEQscUZBQXFGO0lBQ3JGLGlCQUFpQixDQUFDO0FBRXRCLG9EQUFvRDtBQUNwRCxTQUFnQixxQkFBcUI7SUFDakMsT0FBTyxpREFBaUQsd0JBQWdCLEdBQUcsQ0FBQztBQUNoRixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiDjgIzkuIDpjbXoqK3lrprjgI3lvJXlsI7mjIfku6TvvJroqLvlhorliLAgTUNQIOWuouaItuerr+eahOaMh+S7pOacrOi6q+S4jeWQq+S7u+S9leapn+WZqOi3r+W+ke+8jFxuICog5Z+36KGM5pmC5omN5b6e5a6i5oi256uv55qE5bel5L2c55uu6YyE5YuV5oWL5a6a5L2N5bCI5qGI5YWn55qE5pO05bGV5Lim5ZWf5YuV5YW2IHNpZGVjYXLjgIJcbiAqIOKGkiDlkIzkuIDmop3mjIfku6TlnKjku7vkvZXpm7vohabjgIHku7vkvZXkvb/nlKjogIXjgIHku7vkvZXlsIjmoYjpg73pgJrnlKjjgIJcbiAqXG4gKiBCT09UU1RSQVBfU0NSSVBUIOaYr+S4i+WIl+mCj+i8r+eahOWWruihjOeJiO+8iOe2kyBub2RlIC1lIOWft+ihjO+8ie+8mlxuICpcbiAqICAgMS4g6IulIGN3ZCDmnKzouqvvvIjmiJblkJHkuIvmjoPmj4/mnIDlpJogMiDlsaTvvIznlaXpgY4gbm9kZV9tb2R1bGVzL2xpYnJhcnkg562J77yJXG4gKiAgICAgIOaJvuWIsOOAjOaciSB0ZW1wL2NvY29zLW1jcC9zaWRlY2FyLmpzb24g5oiWIGV4dGVuc2lvbnMoKikvZGlzdC1zaWRlY2FyL2luZGV4Lmpz44CN55qE55uu6YyE77yMXG4gKiAgICAgIOimlueCuuebruaomeWwiOahiO+8iOWQjOWxpOaIluWQkeS4i++8jOS4jeWQkeS4iueIrO+8iVxuICogICAyLiDoroAgdGVtcC9jb2Nvcy1tY3Avc2lkZWNhci5qc29uIOeahCBlbnRyee+8iOe3qOi8r+WZqOaTtOWxleWVn+WLleaZguWvq+WFpe+8ie+8m1xuICogICAgICDmqpTmoYjkuI3lrZjlnKjmiJbot6/lvpHlpLHmlYjvvIjkvovlpoLlsIjmoYjmkKzliLDmlrDmqZ/lmajvvInihpIg5pS55o6DIGV4dGVuc2lvbnMvKOS7u+aEj+WQjeeosSkvZGlzdC1zaWRlY2FyL2luZGV4LmpzXG4gKiAgIDMuIHJlcXVpcmUoZW50cnkpIOWVn+WLlSBzaWRlY2Fy77ybc2lkZWNhciDoh6rlt7HmnIPlho3lgZrjgIzmtLvokZfnmoQgYnJpZGdlIOWEquWFiOOAjeeahOeyvueiuuWumuS9jVxuICpcbiAqIOazqOaEj++8muiFs+acrOWFp+WPquiDveeUqOmbmeW8leiZn++8iOWkluWxpOS7peWWruW8leiZn+WMhee1piBzaGVsbOKAlOKAlHpzaC9iYXNoIOiIhyBQb3dlclNoZWxsIOeahuWPr++8m1xuICogY21kLmV4ZSDkuI3mlK/mj7Tllq7lvJXomZ/vvIxXaW5kb3dzIOiri+WcqCBQb3dlclNoZWxsIOWft+ihjOaIluaUueeUqOaJi+WLlSBKU09OIOioreWumu+8ieOAglxuICovXG5cbmV4cG9ydCBjb25zdCBCT09UU1RSQVBfU0NSSVBUID1cbiAgICAndmFyIGY9cmVxdWlyZShcImZzXCIpLHA9cmVxdWlyZShcInBhdGhcIik7JyArXG4gICAgJ2Z1bmN0aW9uIGhhcyhkKXtyZXR1cm4gZi5leGlzdHNTeW5jKHAuam9pbihkLFwidGVtcFwiLFwiY29jb3MtbWNwXCIsXCJzaWRlY2FyLmpzb25cIikpfScgK1xuICAgICdmdW5jdGlvbiBleHQoZCl7dmFyIHg9cC5qb2luKGQsXCJleHRlbnNpb25zXCIpLHI9bnVsbDsnICtcbiAgICAndHJ5e2YucmVhZGRpclN5bmMoeCkuZm9yRWFjaChmdW5jdGlvbihuKXt2YXIgYz1wLmpvaW4oeCxuLFwiZGlzdC1zaWRlY2FyXCIsXCJpbmRleC5qc1wiKTtpZighciYmZi5leGlzdHNTeW5jKGMpKXI9Y30pfWNhdGNoKGUpe31yZXR1cm4gcn0nICtcbiAgICAnZnVuY3Rpb24gb2soZCl7cmV0dXJuIGhhcyhkKXx8ZXh0KGQpfScgK1xuICAgICdmdW5jdGlvbiBwaWNrKGIpe2lmKG9rKGIpKXJldHVybiBiOycgK1xuICAgICd2YXIgUz17bm9kZV9tb2R1bGVzOjEsbGlicmFyeToxLHRlbXA6MSxsb2NhbDoxLGJ1aWxkOjEsZGlzdDoxLGFzc2V0czoxLHByb2ZpbGVzOjEsc2V0dGluZ3M6MSxwYWNrYWdlczoxfSxxPVtbYiwwXV07JyArXG4gICAgJ3doaWxlKHEubGVuZ3RoKXt2YXIgdD1xLnNoaWZ0KCksZD10WzBdLGs9dFsxXTsnICtcbiAgICAnaWYoaz4wJiZvayhkKSlyZXR1cm4gZDtpZihrPj0yKWNvbnRpbnVlOycgK1xuICAgICd2YXIgZTt0cnl7ZT1mLnJlYWRkaXJTeW5jKGQse3dpdGhGaWxlVHlwZXM6dHJ1ZX0pfWNhdGNoKGVycil7Y29udGludWV9JyArXG4gICAgJ2Zvcih2YXIgaT0wO2k8ZS5sZW5ndGg7aSsrKXt2YXIgbj1lW2ldOycgK1xuICAgICdpZihuLmlzRGlyZWN0b3J5KCkmJm4ubmFtZS5pbmRleE9mKFwiLlwiKSE9PTAmJiFTW24ubmFtZV0pcS5wdXNoKFtwLmpvaW4oZCxuLm5hbWUpLGsrMV0pfX0nICtcbiAgICAncmV0dXJuIG51bGx9JyArXG4gICAgJ3ZhciBjd2Q9cHJvY2Vzcy5jd2QoKSxwcm9qPXBpY2soY3dkKTsnICtcbiAgICAnaWYoIXByb2ope2NvbnNvbGUuZXJyb3IoXCJbY29jb3MtbWNwXSBubyBDb2NvcyBwcm9qZWN0IHdpdGggdGhlIE1DUCBleHRlbnNpb24gZm91bmQgYXQgb3IgYmVsb3cgXCIrY3dkKTtwcm9jZXNzLmV4aXQoMSl9JyArXG4gICAgJ3ZhciBlbnRyeT1udWxsOycgK1xuICAgICd0cnl7ZW50cnk9SlNPTi5wYXJzZShmLnJlYWRGaWxlU3luYyhwLmpvaW4ocHJvaixcInRlbXBcIixcImNvY29zLW1jcFwiLFwic2lkZWNhci5qc29uXCIpLFwidXRmOFwiKSkuZW50cnl9Y2F0Y2goZSl7fScgK1xuICAgICdpZighZW50cnl8fCFmLmV4aXN0c1N5bmMoZW50cnkpKWVudHJ5PWV4dChwcm9qKTsnICtcbiAgICAnaWYoIWVudHJ5KXtjb25zb2xlLmVycm9yKFwiW2NvY29zLW1jcF0gc2lkZWNhciBub3QgZm91bmQgaW4gXCIrcHJvaik7cHJvY2Vzcy5leGl0KDEpfScgK1xuICAgICdyZXF1aXJlKGVudHJ5KTsnO1xuXG4vKiog57WE5Ye65Y+v55u05o6l6LK85Yiw57WC56uv5qmf55qE5LiA6Y216Kit5a6a5oyH5Luk77yIenNoIC8gYmFzaCAvIFBvd2VyU2hlbGwg6YCa55So77yJICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRVbml2ZXJzYWxDb21tYW5kKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBjbGF1ZGUgbWNwIGFkZCAtLXNjb3BlIHVzZXIgY29jb3MgLS0gbm9kZSAtZSAnJHtCT09UU1RSQVBfU0NSSVBUfSdgO1xufVxuIl19