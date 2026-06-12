# AI 客戶端連接設定

## 方式一：一鍵設定指令（推薦，所有專案通用）

開啟編輯器面板（**擴展 → Cocos MCP**），複製「一鍵設定」區塊的指令並在終端機執行一次。指令形如：

```bash
claude mcp add --scope user cocos -- node -e '<引導腳本>'
```

特性：

- `--scope user`：這台機器上所有專案的 Claude Code 都能用，只需執行一次
- 指令**不含任何固定路徑**：執行時從客戶端的工作目錄「同層或向下（2 層）」尋找帶有本擴展的 Cocos 專案，並啟動該專案內的 sidecar——換電腦、換專案、交給其他人都是同一條指令
- macOS（zsh/bash）與 Windows（**PowerShell**）皆可直接執行；舊式 cmd.exe 不支援單引號，請用方式二

引導腳本的可讀版本見 [`source/bootstrap-command.ts`](../source/bootstrap-command.ts)。

## 方式二：手動 JSON 設定（固定某個專案）

面板的「手動加入 MCP 設定檔」區塊會生成當前專案的現成 JSON。形狀如下（`<EXTENSION_PATH>` 為本擴展的絕對路徑、`<PROJECT_PATH>` 為專案絕對路徑）：

```json
{
  "mcpServers": {
    "cocos": {
      "command": "node",
      "args": [
        "<EXTENSION_PATH>/dist-sidecar/index.js",
        "--project", "<PROJECT_PATH>"
      ]
    }
  }
}
```

各客戶端設定檔位置：

| 客戶端 | 設定檔 |
|---|---|
| Claude Code（專案層級，可進版控） | `<專案>/.mcp.json` |
| Claude Code（使用者層級） | `claude mcp add --scope user cocos -- node "<EXTENSION_PATH>/dist-sidecar/index.js" --project "<PROJECT_PATH>"` |
| Cursor | `<專案>/.cursor/mcp.json` |
| Windsurf | `<專案>/.windsurf/mcp.json` |

> `--project` 也可省略：sidecar 會從客戶端工作目錄自動偵測專案（同層或向下）。

## 連線確認

1. 編輯器面板顯示 `● Running`
2. Claude Code 內輸入 `/mcp`：`cocos` 顯示 connected、9 個工具
3. 請 AI 呼叫 `project` 工具的 `info` action，應回傳專案與編輯器資訊

## 疑難排解

- **工具呼叫回報編輯器不可達**：確認編輯器開啟、面板顯示 Running；編輯器啟動後客戶端會自動恢復，無需重啟
- **tools 列表是空的**：該專案從未啟動過 bridge（開一次編輯器即可），或客戶端工作目錄下找不到 Cocos 專案
- **多個專案同時開**：客戶端開在哪個專案目錄就連哪個；開在共同上層時連「最新啟動」的編輯器，可用 `project.info` 確認目前連到誰
