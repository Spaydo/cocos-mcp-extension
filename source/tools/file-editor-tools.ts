import { ToolDefinition, ToolResponse, ToolExecutor } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class FileEditorTools implements ToolExecutor {

    getTools(): ToolDefinition[] {
        return [
            {
                name: 'insert_text',
                description: 'Insert text at a specific line number in a file (1-based). If line exceeds total lines, text is appended at end.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Path to the file, relative to the project directory' },
                        line: { type: 'number', description: 'Line number to insert at (1-based). Existing lines at this position shift down.' },
                        text: { type: 'string', description: 'Text to insert as a new line' },
                    },
                    required: ['filePath', 'line', 'text'],
                },
            },
            {
                name: 'delete_lines',
                description: 'Delete a range of lines from a file (1-based, inclusive).',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Path to the file, relative to the project directory' },
                        startLine: { type: 'number', description: 'First line to delete (1-based, inclusive)' },
                        endLine: { type: 'number', description: 'Last line to delete (1-based, inclusive)' },
                    },
                    required: ['filePath', 'startLine', 'endLine'],
                },
            },
            {
                name: 'replace_text',
                description: 'Find and replace text within a file. Supports plain string or regex, single or all occurrences.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Path to the file, relative to the project directory' },
                        search: { type: 'string', description: 'Text or regex pattern to search for' },
                        replace: { type: 'string', description: 'Replacement text' },
                        useRegex: { type: 'boolean', description: 'Treat search as a regular expression (default: false)' },
                        replaceAll: { type: 'boolean', description: 'Replace all occurrences (default: false, replaces only first)' },
                    },
                    required: ['filePath', 'search', 'replace'],
                },
            },
            {
                name: 'query_text',
                description: 'Read a range of lines from a file (read-only). Returns lines with their 1-based line numbers.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        filePath: { type: 'string', description: 'Path to the file, relative to the project directory' },
                        startLine: { type: 'number', description: 'First line to read (1-based, default: 1)' },
                        endLine: { type: 'number', description: 'Last line to read (1-based, default: end of file)' },
                    },
                    required: ['filePath'],
                },
            },
        ];
    }

    async execute(actionName: string, args: any): Promise<ToolResponse> {
        switch (actionName) {
            case 'insert_text': return this.insertText(args.filePath, args.line, args.text);
            case 'delete_lines': return this.deleteLines(args.filePath, args.startLine, args.endLine);
            case 'replace_text': return this.replaceText(args.filePath, args.search, args.replace, args.useRegex, args.replaceAll);
            case 'query_text': return this.queryText(args.filePath, args.startLine, args.endLine);
            default: return { success: false, error: `Unknown file-editor tool: ${actionName}` };
        }
    }

    private resolvePath(filePath: string): string {
        const projectPath = Editor.Project.path;
        const resolved = path.resolve(projectPath, filePath);
        if (!resolved.startsWith(projectPath)) {
            throw new Error('Path must be within the project directory');
        }
        return resolved;
    }

    private insertText(filePath: string, line: number, text: string): ToolResponse {
        try {
            const resolved = this.resolvePath(filePath);
            const content = fs.readFileSync(resolved, 'utf-8');
            const lines = content.split('\n');
            const insertIndex = line - 1;

            if (insertIndex >= lines.length) {
                lines.push(text);
            } else {
                lines.splice(insertIndex, 0, text);
            }

            const actualLine = insertIndex >= lines.length - 1 ? lines.length : line;
            fs.writeFileSync(resolved, lines.join('\n'), 'utf-8');

            return {
                success: true,
                data: { totalLines: lines.length },
                message: `Inserted text at line ${actualLine}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private deleteLines(filePath: string, startLine: number, endLine: number): ToolResponse {
        try {
            if (startLine < 1 || endLine < 1) {
                return { success: false, error: 'startLine and endLine must be >= 1' };
            }
            if (startLine > endLine) {
                return { success: false, error: 'startLine must be <= endLine' };
            }

            const resolved = this.resolvePath(filePath);
            const content = fs.readFileSync(resolved, 'utf-8');
            const lines = content.split('\n');

            const deleteStart = startLine - 1;
            const deleteCount = endLine - startLine + 1;
            const deletedCount = Math.min(deleteCount, lines.length - deleteStart);

            lines.splice(deleteStart, deletedCount);
            fs.writeFileSync(resolved, lines.join('\n'), 'utf-8');

            return {
                success: true,
                data: { deletedCount, totalLines: lines.length },
                message: `Deleted ${deletedCount} line(s) from line ${startLine} to ${endLine}`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private replaceText(filePath: string, search: string, replace: string, useRegex?: boolean, replaceAll?: boolean): ToolResponse {
        try {
            const resolved = this.resolvePath(filePath);
            let content = fs.readFileSync(resolved, 'utf-8');
            let replacements = 0;
            let newContent: string;

            if (useRegex) {
                const flags = replaceAll ? 'g' : '';
                const regex = new RegExp(search, flags);
                newContent = content.replace(regex, (match) => {
                    replacements++;
                    return replace;
                });
            } else {
                if (replaceAll) {
                    const parts = content.split(search);
                    replacements = parts.length - 1;
                    newContent = parts.join(replace);
                } else {
                    const idx = content.indexOf(search);
                    if (idx !== -1) {
                        replacements = 1;
                        newContent = content.slice(0, idx) + replace + content.slice(idx + search.length);
                    } else {
                        replacements = 0;
                        newContent = content;
                    }
                }
            }

            fs.writeFileSync(resolved, newContent, 'utf-8');

            return {
                success: true,
                data: { replacements },
                message: `Replaced ${replacements} occurrence(s) of search pattern`,
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    private queryText(filePath: string, startLine?: number, endLine?: number): ToolResponse {
        try {
            const resolved = this.resolvePath(filePath);
            const content = fs.readFileSync(resolved, 'utf-8');
            const lines = content.split('\n');
            const totalLines = lines.length;

            const from = (startLine != null ? startLine : 1) - 1;
            const to = endLine != null ? endLine : totalLines;

            const sliced = lines.slice(from, to);
            const result = sliced.map((lineContent, i) => ({
                lineNumber: from + i + 1,
                content: lineContent,
            }));

            return {
                success: true,
                data: { totalLines, lines: result },
            };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
