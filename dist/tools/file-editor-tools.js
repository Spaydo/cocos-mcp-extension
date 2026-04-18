"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileEditorTools = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class FileEditorTools {
    getTools() {
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
    async execute(actionName, args) {
        switch (actionName) {
            case 'insert_text': return this.insertText(args.filePath, args.line, args.text);
            case 'delete_lines': return this.deleteLines(args.filePath, args.startLine, args.endLine);
            case 'replace_text': return this.replaceText(args.filePath, args.search, args.replace, args.useRegex, args.replaceAll);
            case 'query_text': return this.queryText(args.filePath, args.startLine, args.endLine);
            default: return { success: false, error: `Unknown file-editor tool: ${actionName}` };
        }
    }
    resolvePath(filePath) {
        const projectPath = Editor.Project.path;
        const resolved = path.resolve(projectPath, filePath);
        if (!resolved.startsWith(projectPath)) {
            throw new Error('Path must be within the project directory');
        }
        return resolved;
    }
    insertText(filePath, line, text) {
        try {
            const resolved = this.resolvePath(filePath);
            const content = fs.readFileSync(resolved, 'utf-8');
            const lines = content.split('\n');
            const insertIndex = line - 1;
            if (insertIndex >= lines.length) {
                lines.push(text);
            }
            else {
                lines.splice(insertIndex, 0, text);
            }
            const actualLine = insertIndex >= lines.length - 1 ? lines.length : line;
            fs.writeFileSync(resolved, lines.join('\n'), 'utf-8');
            return {
                success: true,
                data: { totalLines: lines.length },
                message: `Inserted text at line ${actualLine}`,
            };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    deleteLines(filePath, startLine, endLine) {
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
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    replaceText(filePath, search, replace, useRegex, replaceAll) {
        try {
            const resolved = this.resolvePath(filePath);
            let content = fs.readFileSync(resolved, 'utf-8');
            let replacements = 0;
            let newContent;
            if (useRegex) {
                const flags = replaceAll ? 'g' : '';
                const regex = new RegExp(search, flags);
                newContent = content.replace(regex, (match) => {
                    replacements++;
                    return replace;
                });
            }
            else {
                if (replaceAll) {
                    const parts = content.split(search);
                    replacements = parts.length - 1;
                    newContent = parts.join(replace);
                }
                else {
                    const idx = content.indexOf(search);
                    if (idx !== -1) {
                        replacements = 1;
                        newContent = content.slice(0, idx) + replace + content.slice(idx + search.length);
                    }
                    else {
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
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
    queryText(filePath, startLine, endLine) {
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
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    }
}
exports.FileEditorTools = FileEditorTools;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1lZGl0b3ItdG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zb3VyY2UvdG9vbHMvZmlsZS1lZGl0b3ItdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUU3QixNQUFhLGVBQWU7SUFFeEIsUUFBUTtRQUNKLE9BQU87WUFDSDtnQkFDSSxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsV0FBVyxFQUFFLGtIQUFrSDtnQkFDL0gsV0FBVyxFQUFFO29CQUNULElBQUksRUFBRSxRQUFRO29CQUNkLFVBQVUsRUFBRTt3QkFDUixRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxxREFBcUQsRUFBRTt3QkFDaEcsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsaUZBQWlGLEVBQUU7d0JBQ3hILElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLDhCQUE4QixFQUFFO3FCQUN4RTtvQkFDRCxRQUFRLEVBQUUsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQztpQkFDekM7YUFDSjtZQUNEO2dCQUNJLElBQUksRUFBRSxjQUFjO2dCQUNwQixXQUFXLEVBQUUsMkRBQTJEO2dCQUN4RSxXQUFXLEVBQUU7b0JBQ1QsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsVUFBVSxFQUFFO3dCQUNSLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLHFEQUFxRCxFQUFFO3dCQUNoRyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSwyQ0FBMkMsRUFBRTt3QkFDdkYsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsMENBQTBDLEVBQUU7cUJBQ3ZG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QztZQUM1QyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNuRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xDLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7WUFFaEMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyRCxNQUFNLEVBQUUsR0FBRyxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztZQUVsRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNyQyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDM0MsVUFBVSxFQUFFLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQztnQkFDeEIsT0FBTyxFQUFFLFdBQVc7YUFDdkIsQ0FBQyxDQUFDLENBQUM7WUFFSixPQUFPO2dCQUNILE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFO2FBQ3RDLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2xELENBQUM7SUFDTCxDQUFDO0NBQ0o7QUEzTUQsMENBMk1DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgVG9vbERlZmluaXRpb24sIFRvb2xSZXNwb25zZSwgVG9vbEV4ZWN1dG9yIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGNsYXNzIEZpbGVFZGl0b3JUb29scyBpbXBsZW1lbnRzIFRvb2xFeGVjdXRvciB7XG5cbiAgICBnZXRUb29scygpOiBUb29sRGVmaW5pdGlvbltdIHtcbiAgICAgICAgcmV0dXJuIFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICBuYW1lOiAnaW5zZXJ0X3RleHQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnSW5zZXJ0IHRleHQgYXQgYSBzcGVjaWZpYyBsaW5lIG51bWJlciBpbiBhIGZpbGUgKDEtYmFzZWQpLiBJZiBsaW5lIGV4Y2VlZHMgdG90YWwgbGluZXMsIHRleHQgaXMgYXBwZW5kZWQgYXQgZW5kLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1BhdGggdG8gdGhlIGZpbGUsIHJlbGF0aXZlIHRvIHRoZSBwcm9qZWN0IGRpcmVjdG9yeScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGxpbmU6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnTGluZSBudW1iZXIgdG8gaW5zZXJ0IGF0ICgxLWJhc2VkKS4gRXhpc3RpbmcgbGluZXMgYXQgdGhpcyBwb3NpdGlvbiBzaGlmdCBkb3duLicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRleHQ6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnVGV4dCB0byBpbnNlcnQgYXMgYSBuZXcgbGluZScgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnZmlsZVBhdGgnLCAnbGluZScsICd0ZXh0J10sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ2RlbGV0ZV9saW5lcycsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdEZWxldGUgYSByYW5nZSBvZiBsaW5lcyBmcm9tIGEgZmlsZSAoMS1iYXNlZCwgaW5jbHVzaXZlKS4nLFxuICAgICAgICAgICAgICAgIGlucHV0U2NoZW1hOiB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdvYmplY3QnLFxuICAgICAgICAgICAgICAgICAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQYXRoIHRvIHRoZSBmaWxlLCByZWxhdGl2ZSB0byB0aGUgcHJvamVjdCBkaXJlY3RvcnknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBzdGFydExpbmU6IHsgdHlwZTogJ251bWJlcicsIGRlc2NyaXB0aW9uOiAnRmlyc3QgbGluZSB0byBkZWxldGUgKDEtYmFzZWQsIGluY2x1c2l2ZSknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmRMaW5lOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0xhc3QgbGluZSB0byBkZWxldGUgKDEtYmFzZWQsIGluY2x1c2l2ZSknIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2ZpbGVQYXRoJywgJ3N0YXJ0TGluZScsICdlbmRMaW5lJ10sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3JlcGxhY2VfdGV4dCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdGaW5kIGFuZCByZXBsYWNlIHRleHQgd2l0aGluIGEgZmlsZS4gU3VwcG9ydHMgcGxhaW4gc3RyaW5nIG9yIHJlZ2V4LCBzaW5nbGUgb3IgYWxsIG9jY3VycmVuY2VzLicsXG4gICAgICAgICAgICAgICAgaW5wdXRTY2hlbWE6IHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ29iamVjdCcsXG4gICAgICAgICAgICAgICAgICAgIHByb3BlcnRpZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1BhdGggdG8gdGhlIGZpbGUsIHJlbGF0aXZlIHRvIHRoZSBwcm9qZWN0IGRpcmVjdG9yeScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdUZXh0IG9yIHJlZ2V4IHBhdHRlcm4gdG8gc2VhcmNoIGZvcicgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2U6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUmVwbGFjZW1lbnQgdGV4dCcgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzZVJlZ2V4OiB7IHR5cGU6ICdib29sZWFuJywgZGVzY3JpcHRpb246ICdUcmVhdCBzZWFyY2ggYXMgYSByZWd1bGFyIGV4cHJlc3Npb24gKGRlZmF1bHQ6IGZhbHNlKScgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VBbGw6IHsgdHlwZTogJ2Jvb2xlYW4nLCBkZXNjcmlwdGlvbjogJ1JlcGxhY2UgYWxsIG9jY3VycmVuY2VzIChkZWZhdWx0OiBmYWxzZSwgcmVwbGFjZXMgb25seSBmaXJzdCknIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2ZpbGVQYXRoJywgJ3NlYXJjaCcsICdyZXBsYWNlJ10sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgbmFtZTogJ3F1ZXJ5X3RleHQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnUmVhZCBhIHJhbmdlIG9mIGxpbmVzIGZyb20gYSBmaWxlIChyZWFkLW9ubHkpLiBSZXR1cm5zIGxpbmVzIHdpdGggdGhlaXIgMS1iYXNlZCBsaW5lIG51bWJlcnMuJyxcbiAgICAgICAgICAgICAgICBpbnB1dFNjaGVtYToge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnb2JqZWN0JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvcGVydGllczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGg6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUGF0aCB0byB0aGUgZmlsZSwgcmVsYXRpdmUgdG8gdGhlIHByb2plY3QgZGlyZWN0b3J5JyB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhcnRMaW5lOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0ZpcnN0IGxpbmUgdG8gcmVhZCAoMS1iYXNlZCwgZGVmYXVsdDogMSknIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmRMaW5lOiB7IHR5cGU6ICdudW1iZXInLCBkZXNjcmlwdGlvbjogJ0xhc3QgbGluZSB0byByZWFkICgxLWJhc2VkLCBkZWZhdWx0OiBlbmQgb2YgZmlsZSknIH0sXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ2ZpbGVQYXRoJ10sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgIF07XG4gICAgfVxuXG4gICAgYXN5bmMgZXhlY3V0ZShhY3Rpb25OYW1lOiBzdHJpbmcsIGFyZ3M6IGFueSk6IFByb21pc2U8VG9vbFJlc3BvbnNlPiB7XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uTmFtZSkge1xuICAgICAgICAgICAgY2FzZSAnaW5zZXJ0X3RleHQnOiByZXR1cm4gdGhpcy5pbnNlcnRUZXh0KGFyZ3MuZmlsZVBhdGgsIGFyZ3MubGluZSwgYXJncy50ZXh0KTtcbiAgICAgICAgICAgIGNhc2UgJ2RlbGV0ZV9saW5lcyc6IHJldHVybiB0aGlzLmRlbGV0ZUxpbmVzKGFyZ3MuZmlsZVBhdGgsIGFyZ3Muc3RhcnRMaW5lLCBhcmdzLmVuZExpbmUpO1xuICAgICAgICAgICAgY2FzZSAncmVwbGFjZV90ZXh0JzogcmV0dXJuIHRoaXMucmVwbGFjZVRleHQoYXJncy5maWxlUGF0aCwgYXJncy5zZWFyY2gsIGFyZ3MucmVwbGFjZSwgYXJncy51c2VSZWdleCwgYXJncy5yZXBsYWNlQWxsKTtcbiAgICAgICAgICAgIGNhc2UgJ3F1ZXJ5X3RleHQnOiByZXR1cm4gdGhpcy5xdWVyeVRleHQoYXJncy5maWxlUGF0aCwgYXJncy5zdGFydExpbmUsIGFyZ3MuZW5kTGluZSk7XG4gICAgICAgICAgICBkZWZhdWx0OiByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBVbmtub3duIGZpbGUtZWRpdG9yIHRvb2w6ICR7YWN0aW9uTmFtZX1gIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHJlc29sdmVQYXRoKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgICAgICBjb25zdCBwcm9qZWN0UGF0aCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XG4gICAgICAgIGNvbnN0IHJlc29sdmVkID0gcGF0aC5yZXNvbHZlKHByb2plY3RQYXRoLCBmaWxlUGF0aCk7XG4gICAgICAgIGlmICghcmVzb2x2ZWQuc3RhcnRzV2l0aChwcm9qZWN0UGF0aCkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUGF0aCBtdXN0IGJlIHdpdGhpbiB0aGUgcHJvamVjdCBkaXJlY3RvcnknKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzb2x2ZWQ7XG4gICAgfVxuXG4gICAgcHJpdmF0ZSBpbnNlcnRUZXh0KGZpbGVQYXRoOiBzdHJpbmcsIGxpbmU6IG51bWJlciwgdGV4dDogc3RyaW5nKTogVG9vbFJlc3BvbnNlIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlUGF0aChmaWxlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHJlc29sdmVkLCAndXRmLTgnKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdCgnXFxuJyk7XG4gICAgICAgICAgICBjb25zdCBpbnNlcnRJbmRleCA9IGxpbmUgLSAxO1xuXG4gICAgICAgICAgICBpZiAoaW5zZXJ0SW5kZXggPj0gbGluZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgbGluZXMucHVzaCh0ZXh0KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgbGluZXMuc3BsaWNlKGluc2VydEluZGV4LCAwLCB0ZXh0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgYWN0dWFsTGluZSA9IGluc2VydEluZGV4ID49IGxpbmVzLmxlbmd0aCAtIDEgPyBsaW5lcy5sZW5ndGggOiBsaW5lO1xuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhyZXNvbHZlZCwgbGluZXMuam9pbignXFxuJyksICd1dGYtOCcpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogeyB0b3RhbExpbmVzOiBsaW5lcy5sZW5ndGggfSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgSW5zZXJ0ZWQgdGV4dCBhdCBsaW5lICR7YWN0dWFsTGluZX1gLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgZGVsZXRlTGluZXMoZmlsZVBhdGg6IHN0cmluZywgc3RhcnRMaW5lOiBudW1iZXIsIGVuZExpbmU6IG51bWJlcik6IFRvb2xSZXNwb25zZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBpZiAoc3RhcnRMaW5lIDwgMSB8fCBlbmRMaW5lIDwgMSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3N0YXJ0TGluZSBhbmQgZW5kTGluZSBtdXN0IGJlID49IDEnIH07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoc3RhcnRMaW5lID4gZW5kTGluZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ3N0YXJ0TGluZSBtdXN0IGJlIDw9IGVuZExpbmUnIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gdGhpcy5yZXNvbHZlUGF0aChmaWxlUGF0aCk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHJlc29sdmVkLCAndXRmLTgnKTtcbiAgICAgICAgICAgIGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdCgnXFxuJyk7XG5cbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZVN0YXJ0ID0gc3RhcnRMaW5lIC0gMTtcbiAgICAgICAgICAgIGNvbnN0IGRlbGV0ZUNvdW50ID0gZW5kTGluZSAtIHN0YXJ0TGluZSArIDE7XG4gICAgICAgICAgICBjb25zdCBkZWxldGVkQ291bnQgPSBNYXRoLm1pbihkZWxldGVDb3VudCwgbGluZXMubGVuZ3RoIC0gZGVsZXRlU3RhcnQpO1xuXG4gICAgICAgICAgICBsaW5lcy5zcGxpY2UoZGVsZXRlU3RhcnQsIGRlbGV0ZWRDb3VudCk7XG4gICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHJlc29sdmVkLCBsaW5lcy5qb2luKCdcXG4nKSwgJ3V0Zi04Jyk7XG5cbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgICAgICAgICBkYXRhOiB7IGRlbGV0ZWRDb3VudCwgdG90YWxMaW5lczogbGluZXMubGVuZ3RoIH0sXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYERlbGV0ZWQgJHtkZWxldGVkQ291bnR9IGxpbmUocykgZnJvbSBsaW5lICR7c3RhcnRMaW5lfSB0byAke2VuZExpbmV9YCxcbiAgICAgICAgICAgIH07XG4gICAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVyci5tZXNzYWdlIH07XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBwcml2YXRlIHJlcGxhY2VUZXh0KGZpbGVQYXRoOiBzdHJpbmcsIHNlYXJjaDogc3RyaW5nLCByZXBsYWNlOiBzdHJpbmcsIHVzZVJlZ2V4PzogYm9vbGVhbiwgcmVwbGFjZUFsbD86IGJvb2xlYW4pOiBUb29sUmVzcG9uc2Uge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWQgPSB0aGlzLnJlc29sdmVQYXRoKGZpbGVQYXRoKTtcbiAgICAgICAgICAgIGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHJlc29sdmVkLCAndXRmLTgnKTtcbiAgICAgICAgICAgIGxldCByZXBsYWNlbWVudHMgPSAwO1xuICAgICAgICAgICAgbGV0IG5ld0NvbnRlbnQ6IHN0cmluZztcblxuICAgICAgICAgICAgaWYgKHVzZVJlZ2V4KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZmxhZ3MgPSByZXBsYWNlQWxsID8gJ2cnIDogJyc7XG4gICAgICAgICAgICAgICAgY29uc3QgcmVnZXggPSBuZXcgUmVnRXhwKHNlYXJjaCwgZmxhZ3MpO1xuICAgICAgICAgICAgICAgIG5ld0NvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UocmVnZXgsIChtYXRjaCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudHMrKztcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlcGxhY2U7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGlmIChyZXBsYWNlQWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gY29udGVudC5zcGxpdChzZWFyY2gpO1xuICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudHMgPSBwYXJ0cy5sZW5ndGggLSAxO1xuICAgICAgICAgICAgICAgICAgICBuZXdDb250ZW50ID0gcGFydHMuam9pbihyZXBsYWNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpZHggPSBjb250ZW50LmluZGV4T2Yoc2VhcmNoKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlkeCAhPT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcGxhY2VtZW50cyA9IDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdDb250ZW50ID0gY29udGVudC5zbGljZSgwLCBpZHgpICsgcmVwbGFjZSArIGNvbnRlbnQuc2xpY2UoaWR4ICsgc2VhcmNoLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXBsYWNlbWVudHMgPSAwO1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3Q29udGVudCA9IGNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMocmVzb2x2ZWQsIG5ld0NvbnRlbnQsICd1dGYtOCcpO1xuXG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgICAgICAgICAgZGF0YTogeyByZXBsYWNlbWVudHMgfSxcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUmVwbGFjZWQgJHtyZXBsYWNlbWVudHN9IG9jY3VycmVuY2Uocykgb2Ygc2VhcmNoIHBhdHRlcm5gLFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHByaXZhdGUgcXVlcnlUZXh0KGZpbGVQYXRoOiBzdHJpbmcsIHN0YXJ0TGluZT86IG51bWJlciwgZW5kTGluZT86IG51bWJlcik6IFRvb2xSZXNwb25zZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IHRoaXMucmVzb2x2ZVBhdGgoZmlsZVBhdGgpO1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhyZXNvbHZlZCwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICAgICAgICAgICAgY29uc3QgdG90YWxMaW5lcyA9IGxpbmVzLmxlbmd0aDtcblxuICAgICAgICAgICAgY29uc3QgZnJvbSA9IChzdGFydExpbmUgIT0gbnVsbCA/IHN0YXJ0TGluZSA6IDEpIC0gMTtcbiAgICAgICAgICAgIGNvbnN0IHRvID0gZW5kTGluZSAhPSBudWxsID8gZW5kTGluZSA6IHRvdGFsTGluZXM7XG5cbiAgICAgICAgICAgIGNvbnN0IHNsaWNlZCA9IGxpbmVzLnNsaWNlKGZyb20sIHRvKTtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHNsaWNlZC5tYXAoKGxpbmVDb250ZW50LCBpKSA9PiAoe1xuICAgICAgICAgICAgICAgIGxpbmVOdW1iZXI6IGZyb20gKyBpICsgMSxcbiAgICAgICAgICAgICAgICBjb250ZW50OiBsaW5lQ29udGVudCxcbiAgICAgICAgICAgIH0pKTtcblxuICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICAgICAgICAgIGRhdGE6IHsgdG90YWxMaW5lcywgbGluZXM6IHJlc3VsdCB9LFxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyLm1lc3NhZ2UgfTtcbiAgICAgICAgfVxuICAgIH1cbn1cbiJdfQ==