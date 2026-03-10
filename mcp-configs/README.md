# MCP 配置範例

此目錄包含各 AI 工具的 MCP 客戶端配置範例。

每個子目錄中的配置檔保留了該工具所要求的原始檔名與路徑結構，複製到指定位置即可啟用 Cocos Creator MCP 整合。

| 目錄 | AI 工具 | 配置檔案 | 目標位置 |
|------|---------|----------|----------|
| `vscode-claude/` | VS Code + Claude Code | `.mcp.json` | 專案根目錄 |
| `claude-cli/` | Claude Desktop / Claude Code CLI | `claude_desktop_config.json` | `~/.claude/` 或專案根目錄 |
| `cursor/` | Cursor | `.cursor/mcp.json` | 專案根目錄 |
| `windsurf/` | Windsurf | `.windsurf/mcp.json` | 專案根目錄 |

> **提示：** MCP Server 預設使用端口 `3000`，如果你在擴展設定中修改了端口，請同步更新 URL。
