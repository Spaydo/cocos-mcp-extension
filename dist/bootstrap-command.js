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
 * 引號策略（依 shell 不同分兩版，見下方 build*Command）：
 *   - zsh/bash：腳本內用雙引號，外層用單引號包 → buildPosixCommand
 *   - PowerShell：PS 5.1 會吃掉傳給原生指令的內嵌雙引號，所以腳本改用單引號、
 *     外層用雙引號包 → buildWindowsCommand（BOOTSTRAP_SCRIPT 內無單引號，可安全轉換）
 * 面板會依 process.platform 自動選對應版本顯示。cmd.exe 不支援，請用 PowerShell。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOOTSTRAP_SCRIPT = void 0;
exports.buildPosixCommand = buildPosixCommand;
exports.buildWindowsCommand = buildWindowsCommand;
exports.buildCommandForPlatform = buildCommandForPlatform;
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
/** 腳本的單引號版（給 PowerShell）。BOOTSTRAP_SCRIPT 依約定只用雙引號、不含單引號，故可安全整批轉換。 */
const BOOTSTRAP_SCRIPT_SQ = exports.BOOTSTRAP_SCRIPT.replace(/"/g, "'");
/** zsh / bash 版：雙引號腳本、外層單引號包。 */
function buildPosixCommand() {
    return `claude mcp add --scope user cocos -- node -e '${exports.BOOTSTRAP_SCRIPT}'`;
}
/** PowerShell 版：單引號腳本、外層雙引號包（PS 5.1 會吃掉內嵌雙引號，故不能用 POSIX 版）。 */
function buildWindowsCommand() {
    return `claude mcp add --scope user cocos -- node -e "${BOOTSTRAP_SCRIPT_SQ}"`;
}
/** 依平台選對應 shell 的一鍵設定指令。 */
function buildCommandForPlatform(platform = process.platform) {
    return platform === 'win32' ? buildWindowsCommand() : buildPosixCommand();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvYm9vdHN0cmFwLWNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJHOzs7QUE0QkgsOENBRUM7QUFHRCxrREFFQztBQUdELDBEQUVDO0FBdENZLFFBQUEsZ0JBQWdCLEdBQ3pCLHdDQUF3QztJQUN4QyxtRkFBbUY7SUFDbkYsc0RBQXNEO0lBQ3RELHVJQUF1STtJQUN2SSx1Q0FBdUM7SUFDdkMscUNBQXFDO0lBQ3JDLHFIQUFxSDtJQUNySCxnREFBZ0Q7SUFDaEQsMENBQTBDO0lBQzFDLHdFQUF3RTtJQUN4RSx5Q0FBeUM7SUFDekMsMEZBQTBGO0lBQzFGLGNBQWM7SUFDZCx1Q0FBdUM7SUFDdkMsd0hBQXdIO0lBQ3hILGlCQUFpQjtJQUNqQiw4R0FBOEc7SUFDOUcsa0RBQWtEO0lBQ2xELHFGQUFxRjtJQUNyRixpQkFBaUIsQ0FBQztBQUV0QixzRUFBc0U7QUFDdEUsTUFBTSxtQkFBbUIsR0FBRyx3QkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBRWhFLGlDQUFpQztBQUNqQyxTQUFnQixpQkFBaUI7SUFDN0IsT0FBTyxpREFBaUQsd0JBQWdCLEdBQUcsQ0FBQztBQUNoRixDQUFDO0FBRUQsK0RBQStEO0FBQy9ELFNBQWdCLG1CQUFtQjtJQUMvQixPQUFPLGlEQUFpRCxtQkFBbUIsR0FBRyxDQUFDO0FBQ25GLENBQUM7QUFFRCw0QkFBNEI7QUFDNUIsU0FBZ0IsdUJBQXVCLENBQUMsV0FBNEIsT0FBTyxDQUFDLFFBQVE7SUFDaEYsT0FBTyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0FBQzlFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICog44CM5LiA6Y216Kit5a6a44CN5byV5bCO5oyH5Luk77ya6Ki75YaK5YiwIE1DUCDlrqLmiLbnq6/nmoTmjIfku6TmnKzouqvkuI3lkKvku7vkvZXmqZ/lmajot6/lvpHvvIxcclxuICog5Z+36KGM5pmC5omN5b6e5a6i5oi256uv55qE5bel5L2c55uu6YyE5YuV5oWL5a6a5L2N5bCI5qGI5YWn55qE5pO05bGV5Lim5ZWf5YuV5YW2IHNpZGVjYXLjgIJcclxuICog4oaSIOWQjOS4gOaineaMh+S7pOWcqOS7u+S9lembu+iFpuOAgeS7u+S9leS9v+eUqOiAheOAgeS7u+S9leWwiOahiOmDvemAmueUqOOAglxyXG4gKlxyXG4gKiBCT09UU1RSQVBfU0NSSVBUIOaYr+S4i+WIl+mCj+i8r+eahOWWruihjOeJiO+8iOe2kyBub2RlIC1lIOWft+ihjO+8ie+8mlxyXG4gKlxyXG4gKiAgIDEuIOiLpSBjd2Qg5pys6Lqr77yI5oiW5ZCR5LiL5o6D5o+P5pyA5aSaIDIg5bGk77yM55Wl6YGOIG5vZGVfbW9kdWxlcy9saWJyYXJ5IOetie+8iVxyXG4gKiAgICAgIOaJvuWIsOOAjOaciSB0ZW1wL2NvY29zLW1jcC9zaWRlY2FyLmpzb24g5oiWIGV4dGVuc2lvbnMoKikvZGlzdC1zaWRlY2FyL2luZGV4Lmpz44CN55qE55uu6YyE77yMXHJcbiAqICAgICAg6KaW54K655uu5qiZ5bCI5qGI77yI5ZCM5bGk5oiW5ZCR5LiL77yM5LiN5ZCR5LiK54is77yJXHJcbiAqICAgMi4g6K6AIHRlbXAvY29jb3MtbWNwL3NpZGVjYXIuanNvbiDnmoQgZW50cnnvvIjnt6jovK/lmajmk7TlsZXllZ/li5XmmYLlr6vlhaXvvInvvJtcclxuICogICAgICDmqpTmoYjkuI3lrZjlnKjmiJbot6/lvpHlpLHmlYjvvIjkvovlpoLlsIjmoYjmkKzliLDmlrDmqZ/lmajvvInihpIg5pS55o6DIGV4dGVuc2lvbnMvKOS7u+aEj+WQjeeosSkvZGlzdC1zaWRlY2FyL2luZGV4LmpzXHJcbiAqICAgMy4gcmVxdWlyZShlbnRyeSkg5ZWf5YuVIHNpZGVjYXLvvJtzaWRlY2FyIOiHquW3seacg+WGjeWBmuOAjOa0u+iRl+eahCBicmlkZ2Ug5YSq5YWI44CN55qE57K+56K65a6a5L2NXHJcbiAqXHJcbiAqIOW8leiZn+etlueVpe+8iOS+nSBzaGVsbCDkuI3lkIzliIblhanniYjvvIzopovkuIvmlrkgYnVpbGQqQ29tbWFuZO+8ie+8mlxyXG4gKiAgIC0genNoL2Jhc2jvvJrohbPmnKzlhafnlKjpm5nlvJXomZ/vvIzlpJblsaTnlKjllq7lvJXomZ/ljIUg4oaSIGJ1aWxkUG9zaXhDb21tYW5kXHJcbiAqICAgLSBQb3dlclNoZWxs77yaUFMgNS4xIOacg+WQg+aOieWCs+e1puWOn+eUn+aMh+S7pOeahOWFp+W1jOmbmeW8leiZn++8jOaJgOS7peiFs+acrOaUueeUqOWWruW8leiZn+OAgVxyXG4gKiAgICAg5aSW5bGk55So6ZuZ5byV6Jmf5YyFIOKGkiBidWlsZFdpbmRvd3NDb21tYW5k77yIQk9PVFNUUkFQX1NDUklQVCDlhafnhKHllq7lvJXomZ/vvIzlj6/lronlhajovYnmj5vvvIlcclxuICog6Z2i5p2/5pyD5L6dIHByb2Nlc3MucGxhdGZvcm0g6Ieq5YuV6YG45bCN5oeJ54mI5pys6aGv56S644CCY21kLmV4ZSDkuI3mlK/mj7TvvIzoq4vnlKggUG93ZXJTaGVsbOOAglxyXG4gKi9cclxuXHJcbmV4cG9ydCBjb25zdCBCT09UU1RSQVBfU0NSSVBUID1cclxuICAgICd2YXIgZj1yZXF1aXJlKFwiZnNcIikscD1yZXF1aXJlKFwicGF0aFwiKTsnICtcclxuICAgICdmdW5jdGlvbiBoYXMoZCl7cmV0dXJuIGYuZXhpc3RzU3luYyhwLmpvaW4oZCxcInRlbXBcIixcImNvY29zLW1jcFwiLFwic2lkZWNhci5qc29uXCIpKX0nICtcclxuICAgICdmdW5jdGlvbiBleHQoZCl7dmFyIHg9cC5qb2luKGQsXCJleHRlbnNpb25zXCIpLHI9bnVsbDsnICtcclxuICAgICd0cnl7Zi5yZWFkZGlyU3luYyh4KS5mb3JFYWNoKGZ1bmN0aW9uKG4pe3ZhciBjPXAuam9pbih4LG4sXCJkaXN0LXNpZGVjYXJcIixcImluZGV4LmpzXCIpO2lmKCFyJiZmLmV4aXN0c1N5bmMoYykpcj1jfSl9Y2F0Y2goZSl7fXJldHVybiByfScgK1xyXG4gICAgJ2Z1bmN0aW9uIG9rKGQpe3JldHVybiBoYXMoZCl8fGV4dChkKX0nICtcclxuICAgICdmdW5jdGlvbiBwaWNrKGIpe2lmKG9rKGIpKXJldHVybiBiOycgK1xyXG4gICAgJ3ZhciBTPXtub2RlX21vZHVsZXM6MSxsaWJyYXJ5OjEsdGVtcDoxLGxvY2FsOjEsYnVpbGQ6MSxkaXN0OjEsYXNzZXRzOjEscHJvZmlsZXM6MSxzZXR0aW5nczoxLHBhY2thZ2VzOjF9LHE9W1tiLDBdXTsnICtcclxuICAgICd3aGlsZShxLmxlbmd0aCl7dmFyIHQ9cS5zaGlmdCgpLGQ9dFswXSxrPXRbMV07JyArXHJcbiAgICAnaWYoaz4wJiZvayhkKSlyZXR1cm4gZDtpZihrPj0yKWNvbnRpbnVlOycgK1xyXG4gICAgJ3ZhciBlO3RyeXtlPWYucmVhZGRpclN5bmMoZCx7d2l0aEZpbGVUeXBlczp0cnVlfSl9Y2F0Y2goZXJyKXtjb250aW51ZX0nICtcclxuICAgICdmb3IodmFyIGk9MDtpPGUubGVuZ3RoO2krKyl7dmFyIG49ZVtpXTsnICtcclxuICAgICdpZihuLmlzRGlyZWN0b3J5KCkmJm4ubmFtZS5pbmRleE9mKFwiLlwiKSE9PTAmJiFTW24ubmFtZV0pcS5wdXNoKFtwLmpvaW4oZCxuLm5hbWUpLGsrMV0pfX0nICtcclxuICAgICdyZXR1cm4gbnVsbH0nICtcclxuICAgICd2YXIgY3dkPXByb2Nlc3MuY3dkKCkscHJvaj1waWNrKGN3ZCk7JyArXHJcbiAgICAnaWYoIXByb2ope2NvbnNvbGUuZXJyb3IoXCJbY29jb3MtbWNwXSBubyBDb2NvcyBwcm9qZWN0IHdpdGggdGhlIE1DUCBleHRlbnNpb24gZm91bmQgYXQgb3IgYmVsb3cgXCIrY3dkKTtwcm9jZXNzLmV4aXQoMSl9JyArXHJcbiAgICAndmFyIGVudHJ5PW51bGw7JyArXHJcbiAgICAndHJ5e2VudHJ5PUpTT04ucGFyc2UoZi5yZWFkRmlsZVN5bmMocC5qb2luKHByb2osXCJ0ZW1wXCIsXCJjb2Nvcy1tY3BcIixcInNpZGVjYXIuanNvblwiKSxcInV0ZjhcIikpLmVudHJ5fWNhdGNoKGUpe30nICtcclxuICAgICdpZighZW50cnl8fCFmLmV4aXN0c1N5bmMoZW50cnkpKWVudHJ5PWV4dChwcm9qKTsnICtcclxuICAgICdpZighZW50cnkpe2NvbnNvbGUuZXJyb3IoXCJbY29jb3MtbWNwXSBzaWRlY2FyIG5vdCBmb3VuZCBpbiBcIitwcm9qKTtwcm9jZXNzLmV4aXQoMSl9JyArXHJcbiAgICAncmVxdWlyZShlbnRyeSk7JztcclxuXHJcbi8qKiDohbPmnKznmoTllq7lvJXomZ/niYjvvIjntaYgUG93ZXJTaGVsbO+8ieOAgkJPT1RTVFJBUF9TQ1JJUFQg5L6d57SE5a6a5Y+q55So6ZuZ5byV6Jmf44CB5LiN5ZCr5Zau5byV6Jmf77yM5pWF5Y+v5a6J5YWo5pW05om56L2J5o+b44CCICovXHJcbmNvbnN0IEJPT1RTVFJBUF9TQ1JJUFRfU1EgPSBCT09UU1RSQVBfU0NSSVBULnJlcGxhY2UoL1wiL2csIFwiJ1wiKTtcclxuXHJcbi8qKiB6c2ggLyBiYXNoIOeJiO+8mumbmeW8leiZn+iFs+acrOOAgeWkluWxpOWWruW8leiZn+WMheOAgiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQb3NpeENvbW1hbmQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgY2xhdWRlIG1jcCBhZGQgLS1zY29wZSB1c2VyIGNvY29zIC0tIG5vZGUgLWUgJyR7Qk9PVFNUUkFQX1NDUklQVH0nYDtcclxufVxyXG5cclxuLyoqIFBvd2VyU2hlbGwg54mI77ya5Zau5byV6Jmf6IWz5pys44CB5aSW5bGk6ZuZ5byV6Jmf5YyF77yIUFMgNS4xIOacg+WQg+aOieWFp+W1jOmbmeW8leiZn++8jOaVheS4jeiDveeUqCBQT1NJWCDniYjvvInjgIIgKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkV2luZG93c0NvbW1hbmQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgY2xhdWRlIG1jcCBhZGQgLS1zY29wZSB1c2VyIGNvY29zIC0tIG5vZGUgLWUgXCIke0JPT1RTVFJBUF9TQ1JJUFRfU1F9XCJgO1xyXG59XHJcblxyXG4vKiog5L6d5bmz5Y+w6YG45bCN5oeJIHNoZWxsIOeahOS4gOmNteioreWumuaMh+S7pOOAgiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDb21tYW5kRm9yUGxhdGZvcm0ocGxhdGZvcm06IE5vZGVKUy5QbGF0Zm9ybSA9IHByb2Nlc3MucGxhdGZvcm0pOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIHBsYXRmb3JtID09PSAnd2luMzInID8gYnVpbGRXaW5kb3dzQ29tbWFuZCgpIDogYnVpbGRQb3NpeENvbW1hbmQoKTtcclxufVxyXG4iXX0=