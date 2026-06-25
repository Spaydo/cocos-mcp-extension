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
exports.buildClientCommandForPlatform = buildClientCommandForPlatform;
exports.buildCommandForPlatform = buildCommandForPlatform;
exports.buildCodexCommandForPlatform = buildCodexCommandForPlatform;
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
function clientAddCommand(client) {
    return client === 'claude'
        ? 'claude mcp add --scope user cocos'
        : 'codex mcp add cocos';
}
/** zsh / bash 版：雙引號腳本、外層單引號包。 */
function buildPosixCommand(client = 'claude') {
    return `${clientAddCommand(client)} -- node -e '${exports.BOOTSTRAP_SCRIPT}'`;
}
/** PowerShell 版：單引號腳本、外層雙引號包（PS 5.1 會吃掉內嵌雙引號，故不能用 POSIX 版）。 */
function buildWindowsCommand(client = 'claude') {
    return `${clientAddCommand(client)} -- node -e "${BOOTSTRAP_SCRIPT_SQ}"`;
}
/** 依平台選對應 shell 與 MCP 客戶端的一鍵設定指令。 */
function buildClientCommandForPlatform(client, platform = process.platform) {
    return platform === 'win32' ? buildWindowsCommand(client) : buildPosixCommand(client);
}
/** 依平台選對應 shell 的 Claude 一鍵設定指令。 */
function buildCommandForPlatform(platform = process.platform) {
    return buildClientCommandForPlatform('claude', platform);
}
/** 依平台選對應 shell 的 Codex 一鍵設定指令。 */
function buildCodexCommandForPlatform(platform = process.platform) {
    return buildClientCommandForPlatform('codex', platform);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWNvbW1hbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2UvYm9vdHN0cmFwLWNvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJHOzs7QUFvQ0gsOENBRUM7QUFHRCxrREFFQztBQUdELHNFQUtDO0FBR0QsMERBRUM7QUFHRCxvRUFFQztBQXpEWSxRQUFBLGdCQUFnQixHQUN6Qix3Q0FBd0M7SUFDeEMsbUZBQW1GO0lBQ25GLHNEQUFzRDtJQUN0RCx1SUFBdUk7SUFDdkksdUNBQXVDO0lBQ3ZDLHFDQUFxQztJQUNyQyxxSEFBcUg7SUFDckgsZ0RBQWdEO0lBQ2hELDBDQUEwQztJQUMxQyx3RUFBd0U7SUFDeEUseUNBQXlDO0lBQ3pDLDBGQUEwRjtJQUMxRixjQUFjO0lBQ2QsdUNBQXVDO0lBQ3ZDLHdIQUF3SDtJQUN4SCxpQkFBaUI7SUFDakIsOEdBQThHO0lBQzlHLGtEQUFrRDtJQUNsRCxxRkFBcUY7SUFDckYsaUJBQWlCLENBQUM7QUFFdEIsc0VBQXNFO0FBQ3RFLE1BQU0sbUJBQW1CLEdBQUcsd0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztBQUVoRSxTQUFTLGdCQUFnQixDQUFDLE1BQWlCO0lBQ3ZDLE9BQU8sTUFBTSxLQUFLLFFBQVE7UUFDdEIsQ0FBQyxDQUFDLG1DQUFtQztRQUNyQyxDQUFDLENBQUMscUJBQXFCLENBQUM7QUFDaEMsQ0FBQztBQUVELGlDQUFpQztBQUNqQyxTQUFnQixpQkFBaUIsQ0FBQyxTQUFvQixRQUFRO0lBQzFELE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLHdCQUFnQixHQUFHLENBQUM7QUFDMUUsQ0FBQztBQUVELCtEQUErRDtBQUMvRCxTQUFnQixtQkFBbUIsQ0FBQyxTQUFvQixRQUFRO0lBQzVELE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLG1CQUFtQixHQUFHLENBQUM7QUFDN0UsQ0FBQztBQUVELHFDQUFxQztBQUNyQyxTQUFnQiw2QkFBNkIsQ0FDekMsTUFBaUIsRUFDakIsV0FBNEIsT0FBTyxDQUFDLFFBQVE7SUFFNUMsT0FBTyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUYsQ0FBQztBQUVELG9DQUFvQztBQUNwQyxTQUFnQix1QkFBdUIsQ0FBQyxXQUE0QixPQUFPLENBQUMsUUFBUTtJQUNoRixPQUFPLDZCQUE2QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUM3RCxDQUFDO0FBRUQsbUNBQW1DO0FBQ25DLFNBQWdCLDRCQUE0QixDQUFDLFdBQTRCLE9BQU8sQ0FBQyxRQUFRO0lBQ3JGLE9BQU8sNkJBQTZCLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQzVELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICog44CM5LiA6Y216Kit5a6a44CN5byV5bCO5oyH5Luk77ya6Ki75YaK5YiwIE1DUCDlrqLmiLbnq6/nmoTmjIfku6TmnKzouqvkuI3lkKvku7vkvZXmqZ/lmajot6/lvpHvvIxcclxuICog5Z+36KGM5pmC5omN5b6e5a6i5oi256uv55qE5bel5L2c55uu6YyE5YuV5oWL5a6a5L2N5bCI5qGI5YWn55qE5pO05bGV5Lim5ZWf5YuV5YW2IHNpZGVjYXLjgIJcclxuICog4oaSIOWQjOS4gOaineaMh+S7pOWcqOS7u+S9lembu+iFpuOAgeS7u+S9leS9v+eUqOiAheOAgeS7u+S9leWwiOahiOmDvemAmueUqOOAglxyXG4gKlxyXG4gKiBCT09UU1RSQVBfU0NSSVBUIOaYr+S4i+WIl+mCj+i8r+eahOWWruihjOeJiO+8iOe2kyBub2RlIC1lIOWft+ihjO+8ie+8mlxyXG4gKlxyXG4gKiAgIDEuIOiLpSBjd2Qg5pys6Lqr77yI5oiW5ZCR5LiL5o6D5o+P5pyA5aSaIDIg5bGk77yM55Wl6YGOIG5vZGVfbW9kdWxlcy9saWJyYXJ5IOetie+8iVxyXG4gKiAgICAgIOaJvuWIsOOAjOaciSB0ZW1wL2NvY29zLW1jcC9zaWRlY2FyLmpzb24g5oiWIGV4dGVuc2lvbnMoKikvZGlzdC1zaWRlY2FyL2luZGV4Lmpz44CN55qE55uu6YyE77yMXHJcbiAqICAgICAg6KaW54K655uu5qiZ5bCI5qGI77yI5ZCM5bGk5oiW5ZCR5LiL77yM5LiN5ZCR5LiK54is77yJXHJcbiAqICAgMi4g6K6AIHRlbXAvY29jb3MtbWNwL3NpZGVjYXIuanNvbiDnmoQgZW50cnnvvIjnt6jovK/lmajmk7TlsZXllZ/li5XmmYLlr6vlhaXvvInvvJtcclxuICogICAgICDmqpTmoYjkuI3lrZjlnKjmiJbot6/lvpHlpLHmlYjvvIjkvovlpoLlsIjmoYjmkKzliLDmlrDmqZ/lmajvvInihpIg5pS55o6DIGV4dGVuc2lvbnMvKOS7u+aEj+WQjeeosSkvZGlzdC1zaWRlY2FyL2luZGV4LmpzXHJcbiAqICAgMy4gcmVxdWlyZShlbnRyeSkg5ZWf5YuVIHNpZGVjYXLvvJtzaWRlY2FyIOiHquW3seacg+WGjeWBmuOAjOa0u+iRl+eahCBicmlkZ2Ug5YSq5YWI44CN55qE57K+56K65a6a5L2NXHJcbiAqXHJcbiAqIOW8leiZn+etlueVpe+8iOS+nSBzaGVsbCDkuI3lkIzliIblhanniYjvvIzopovkuIvmlrkgYnVpbGQqQ29tbWFuZO+8ie+8mlxuICogICAtIHpzaC9iYXNo77ya6IWz5pys5YWn55So6ZuZ5byV6Jmf77yM5aSW5bGk55So5Zau5byV6Jmf5YyFIOKGkiBidWlsZFBvc2l4Q29tbWFuZFxuICogICAtIFBvd2VyU2hlbGzvvJpQUyA1LjEg5pyD5ZCD5o6J5YKz57Wm5Y6f55Sf5oyH5Luk55qE5YWn5bWM6ZuZ5byV6Jmf77yM5omA5Lul6IWz5pys5pS555So5Zau5byV6Jmf44CBXG4gKiAgICAg5aSW5bGk55So6ZuZ5byV6Jmf5YyFIOKGkiBidWlsZFdpbmRvd3NDb21tYW5k77yIQk9PVFNUUkFQX1NDUklQVCDlhafnhKHllq7lvJXomZ/vvIzlj6/lronlhajovYnmj5vvvIlcbiAqIOmdouadv+acg+S+nSBwcm9jZXNzLnBsYXRmb3JtIOiHquWLlemBuOWwjeaHieeJiOacrOmhr+ekuuOAgmNtZC5leGUg5LiN5pSv5o+077yM6KuL55SoIFBvd2VyU2hlbGzjgIJcbiAqL1xuXG5leHBvcnQgdHlwZSBNY3BDbGllbnQgPSAnY2xhdWRlJyB8ICdjb2RleCc7XG5cclxuZXhwb3J0IGNvbnN0IEJPT1RTVFJBUF9TQ1JJUFQgPVxyXG4gICAgJ3ZhciBmPXJlcXVpcmUoXCJmc1wiKSxwPXJlcXVpcmUoXCJwYXRoXCIpOycgK1xyXG4gICAgJ2Z1bmN0aW9uIGhhcyhkKXtyZXR1cm4gZi5leGlzdHNTeW5jKHAuam9pbihkLFwidGVtcFwiLFwiY29jb3MtbWNwXCIsXCJzaWRlY2FyLmpzb25cIikpfScgK1xyXG4gICAgJ2Z1bmN0aW9uIGV4dChkKXt2YXIgeD1wLmpvaW4oZCxcImV4dGVuc2lvbnNcIikscj1udWxsOycgK1xyXG4gICAgJ3RyeXtmLnJlYWRkaXJTeW5jKHgpLmZvckVhY2goZnVuY3Rpb24obil7dmFyIGM9cC5qb2luKHgsbixcImRpc3Qtc2lkZWNhclwiLFwiaW5kZXguanNcIik7aWYoIXImJmYuZXhpc3RzU3luYyhjKSlyPWN9KX1jYXRjaChlKXt9cmV0dXJuIHJ9JyArXHJcbiAgICAnZnVuY3Rpb24gb2soZCl7cmV0dXJuIGhhcyhkKXx8ZXh0KGQpfScgK1xyXG4gICAgJ2Z1bmN0aW9uIHBpY2soYil7aWYob2soYikpcmV0dXJuIGI7JyArXHJcbiAgICAndmFyIFM9e25vZGVfbW9kdWxlczoxLGxpYnJhcnk6MSx0ZW1wOjEsbG9jYWw6MSxidWlsZDoxLGRpc3Q6MSxhc3NldHM6MSxwcm9maWxlczoxLHNldHRpbmdzOjEscGFja2FnZXM6MX0scT1bW2IsMF1dOycgK1xyXG4gICAgJ3doaWxlKHEubGVuZ3RoKXt2YXIgdD1xLnNoaWZ0KCksZD10WzBdLGs9dFsxXTsnICtcclxuICAgICdpZihrPjAmJm9rKGQpKXJldHVybiBkO2lmKGs+PTIpY29udGludWU7JyArXHJcbiAgICAndmFyIGU7dHJ5e2U9Zi5yZWFkZGlyU3luYyhkLHt3aXRoRmlsZVR5cGVzOnRydWV9KX1jYXRjaChlcnIpe2NvbnRpbnVlfScgK1xyXG4gICAgJ2Zvcih2YXIgaT0wO2k8ZS5sZW5ndGg7aSsrKXt2YXIgbj1lW2ldOycgK1xyXG4gICAgJ2lmKG4uaXNEaXJlY3RvcnkoKSYmbi5uYW1lLmluZGV4T2YoXCIuXCIpIT09MCYmIVNbbi5uYW1lXSlxLnB1c2goW3Auam9pbihkLG4ubmFtZSksaysxXSl9fScgK1xyXG4gICAgJ3JldHVybiBudWxsfScgK1xyXG4gICAgJ3ZhciBjd2Q9cHJvY2Vzcy5jd2QoKSxwcm9qPXBpY2soY3dkKTsnICtcclxuICAgICdpZighcHJvail7Y29uc29sZS5lcnJvcihcIltjb2Nvcy1tY3BdIG5vIENvY29zIHByb2plY3Qgd2l0aCB0aGUgTUNQIGV4dGVuc2lvbiBmb3VuZCBhdCBvciBiZWxvdyBcIitjd2QpO3Byb2Nlc3MuZXhpdCgxKX0nICtcclxuICAgICd2YXIgZW50cnk9bnVsbDsnICtcclxuICAgICd0cnl7ZW50cnk9SlNPTi5wYXJzZShmLnJlYWRGaWxlU3luYyhwLmpvaW4ocHJvaixcInRlbXBcIixcImNvY29zLW1jcFwiLFwic2lkZWNhci5qc29uXCIpLFwidXRmOFwiKSkuZW50cnl9Y2F0Y2goZSl7fScgK1xyXG4gICAgJ2lmKCFlbnRyeXx8IWYuZXhpc3RzU3luYyhlbnRyeSkpZW50cnk9ZXh0KHByb2opOycgK1xyXG4gICAgJ2lmKCFlbnRyeSl7Y29uc29sZS5lcnJvcihcIltjb2Nvcy1tY3BdIHNpZGVjYXIgbm90IGZvdW5kIGluIFwiK3Byb2opO3Byb2Nlc3MuZXhpdCgxKX0nICtcclxuICAgICdyZXF1aXJlKGVudHJ5KTsnO1xyXG5cclxuLyoqIOiFs+acrOeahOWWruW8leiZn+eJiO+8iOe1piBQb3dlclNoZWxs77yJ44CCQk9PVFNUUkFQX1NDUklQVCDkvp3ntITlrprlj6rnlKjpm5nlvJXomZ/jgIHkuI3lkKvllq7lvJXomZ/vvIzmlYXlj6/lronlhajmlbTmibnovYnmj5vjgIIgKi9cbmNvbnN0IEJPT1RTVFJBUF9TQ1JJUFRfU1EgPSBCT09UU1RSQVBfU0NSSVBULnJlcGxhY2UoL1wiL2csIFwiJ1wiKTtcblxuZnVuY3Rpb24gY2xpZW50QWRkQ29tbWFuZChjbGllbnQ6IE1jcENsaWVudCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGNsaWVudCA9PT0gJ2NsYXVkZSdcbiAgICAgICAgPyAnY2xhdWRlIG1jcCBhZGQgLS1zY29wZSB1c2VyIGNvY29zJ1xuICAgICAgICA6ICdjb2RleCBtY3AgYWRkIGNvY29zJztcbn1cblxuLyoqIHpzaCAvIGJhc2gg54mI77ya6ZuZ5byV6Jmf6IWz5pys44CB5aSW5bGk5Zau5byV6Jmf5YyF44CCICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQb3NpeENvbW1hbmQoY2xpZW50OiBNY3BDbGllbnQgPSAnY2xhdWRlJyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke2NsaWVudEFkZENvbW1hbmQoY2xpZW50KX0gLS0gbm9kZSAtZSAnJHtCT09UU1RSQVBfU0NSSVBUfSdgO1xufVxuXG4vKiogUG93ZXJTaGVsbCDniYjvvJrllq7lvJXomZ/ohbPmnKzjgIHlpJblsaTpm5nlvJXomZ/ljIXvvIhQUyA1LjEg5pyD5ZCD5o6J5YWn5bWM6ZuZ5byV6Jmf77yM5pWF5LiN6IO955SoIFBPU0lYIOeJiO+8ieOAgiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkV2luZG93c0NvbW1hbmQoY2xpZW50OiBNY3BDbGllbnQgPSAnY2xhdWRlJyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGAke2NsaWVudEFkZENvbW1hbmQoY2xpZW50KX0gLS0gbm9kZSAtZSBcIiR7Qk9PVFNUUkFQX1NDUklQVF9TUX1cImA7XG59XG5cbi8qKiDkvp3lubPlj7DpgbjlsI3mh4kgc2hlbGwg6IiHIE1DUCDlrqLmiLbnq6/nmoTkuIDpjbXoqK3lrprmjIfku6TjgIIgKi9cbmV4cG9ydCBmdW5jdGlvbiBidWlsZENsaWVudENvbW1hbmRGb3JQbGF0Zm9ybShcbiAgICBjbGllbnQ6IE1jcENsaWVudCxcbiAgICBwbGF0Zm9ybTogTm9kZUpTLlBsYXRmb3JtID0gcHJvY2Vzcy5wbGF0Zm9ybSxcbik6IHN0cmluZyB7XG4gICAgcmV0dXJuIHBsYXRmb3JtID09PSAnd2luMzInID8gYnVpbGRXaW5kb3dzQ29tbWFuZChjbGllbnQpIDogYnVpbGRQb3NpeENvbW1hbmQoY2xpZW50KTtcbn1cblxuLyoqIOS+neW5s+WPsOmBuOWwjeaHiSBzaGVsbCDnmoQgQ2xhdWRlIOS4gOmNteioreWumuaMh+S7pOOAgiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkQ29tbWFuZEZvclBsYXRmb3JtKHBsYXRmb3JtOiBOb2RlSlMuUGxhdGZvcm0gPSBwcm9jZXNzLnBsYXRmb3JtKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYnVpbGRDbGllbnRDb21tYW5kRm9yUGxhdGZvcm0oJ2NsYXVkZScsIHBsYXRmb3JtKTtcbn1cblxuLyoqIOS+neW5s+WPsOmBuOWwjeaHiSBzaGVsbCDnmoQgQ29kZXgg5LiA6Y216Kit5a6a5oyH5Luk44CCICovXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRDb2RleENvbW1hbmRGb3JQbGF0Zm9ybShwbGF0Zm9ybTogTm9kZUpTLlBsYXRmb3JtID0gcHJvY2Vzcy5wbGF0Zm9ybSk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGJ1aWxkQ2xpZW50Q29tbWFuZEZvclBsYXRmb3JtKCdjb2RleCcsIHBsYXRmb3JtKTtcbn1cbiJdfQ==