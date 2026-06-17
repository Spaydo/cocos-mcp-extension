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

export const BOOTSTRAP_SCRIPT =
    'var f=require("fs"),p=require("path");' +
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
const BOOTSTRAP_SCRIPT_SQ = BOOTSTRAP_SCRIPT.replace(/"/g, "'");

/** zsh / bash 版：雙引號腳本、外層單引號包。 */
export function buildPosixCommand(): string {
    return `claude mcp add --scope user cocos -- node -e '${BOOTSTRAP_SCRIPT}'`;
}

/** PowerShell 版：單引號腳本、外層雙引號包（PS 5.1 會吃掉內嵌雙引號，故不能用 POSIX 版）。 */
export function buildWindowsCommand(): string {
    return `claude mcp add --scope user cocos -- node -e "${BOOTSTRAP_SCRIPT_SQ}"`;
}

/** 依平台選對應 shell 的一鍵設定指令。 */
export function buildCommandForPlatform(platform: NodeJS.Platform = process.platform): string {
    return platform === 'win32' ? buildWindowsCommand() : buildPosixCommand();
}
