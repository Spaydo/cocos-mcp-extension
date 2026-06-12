/**
 * project 工具：專案 / 編輯器 / 引擎資訊與設定讀寫。
 * settings_*（project package：'default' | 'project' 協議）
 * preferences_*（preferences package：'default' | 'global' | 'local' 協議）
 * 簽名見 docs/api-reference/04 §5（preferences）/ §10（project）/ §2（engine）/ §7（server）。
 */
import { ToolDef } from '../types';
import { request } from './helpers';

export function createProjectTool(): ToolDef {
    return {
        name: 'project',
        description: 'Project / editor / engine information, project settings and editor preferences.',
        actions: {
            info: {
                description:
                    'Get current project info (path/name/uuid), editor version and version capability flags.',
                handler: async (_args, ctx) => {
                    return {
                        project: {
                            path: Editor.Project.path,
                            name: Editor.Project.name,
                            uuid: Editor.Project.uuid,
                        },
                        editor: {
                            version: ctx.env.version.raw,
                            path: Editor.App.path,
                            node: process.versions.node,
                            electron: (process.versions as Record<string, string>).electron,
                        },
                        capabilities: ctx.env.capabilities,
                    };
                },
            },
            engine_info: {
                description: 'Engine info: version, paths, builtin/custom native engine.',
                handler: async () => {
                    const basic = await request('engine', 'query-info');
                    const detail = await request('engine', 'query-engine-info').catch(() => null);
                    return { ...basic, detail };
                },
            },
            settings_query: {
                description:
                    'Read project settings of a package (Project Settings panel data). Only packages that ' +
                    'registered a profile work (others return null). ' +
                    'Examples: pkg="project" path="general.designResolution", pkg="engine" path="modules".',
                params: {
                    pkg: { type: 'string', description: 'Package name, e.g. project / engine / physics.' },
                    path: { type: 'string', description: 'Key path within the config. Omit for the whole object.' },
                    protocol: { type: 'string', enum: ['default', 'project'], description: 'Config layer (default: project).' },
                },
                required: ['pkg'],
                handler: async (args) => {
                    const value = await request(
                        'project',
                        'query-config',
                        String(args.pkg),
                        args.path ? String(args.path) : undefined,
                        args.protocol ? String(args.protocol) : undefined,
                    );
                    return { value: value === undefined ? null : value };
                },
            },
            settings_set: {
                description:
                    'Write a project setting value (always the project layer; the package must have a registered profile).',
                params: {
                    pkg: { type: 'string', description: 'Package name.' },
                    path: { type: 'string', description: 'Key path within the config.' },
                    value: { description: 'New value (JSON-serializable).' },
                },
                required: ['pkg', 'path', 'value'],
                handler: async (args) => {
                    await request('project', 'set-config', String(args.pkg), String(args.path), args.value);
                    const value = await request('project', 'query-config', String(args.pkg), String(args.path));
                    return { value: value === undefined ? null : value };
                },
            },
            preferences_query: {
                description:
                    'Read editor preferences of a package (Preferences panel data). Only packages that ' +
                    'registered a preferences profile work (others return null). Example: pkg="device".',
                params: {
                    pkg: { type: 'string', description: 'Package name, e.g. general / device.' },
                    path: { type: 'string', description: 'Key path. Omit for the whole object.' },
                    protocol: {
                        type: 'string',
                        enum: ['default', 'global', 'local'],
                        description: 'Config layer (default: global).',
                    },
                },
                required: ['pkg'],
                handler: async (args) => {
                    const value = await request(
                        'preferences',
                        'query-config',
                        String(args.pkg),
                        args.path ? String(args.path) : undefined,
                        args.protocol ? String(args.protocol) : undefined,
                    );
                    return { value: value === undefined ? null : value };
                },
            },
            preferences_set: {
                description: 'Write an editor preference value (key path required).',
                params: {
                    pkg: { type: 'string', description: 'Package name.' },
                    path: { type: 'string', description: 'Key path.' },
                    value: { description: 'New value (JSON-serializable).' },
                    protocol: { type: 'string', enum: ['default', 'global', 'local'], description: 'Config layer.' },
                },
                required: ['pkg', 'path', 'value'],
                handler: async (args) => {
                    await request(
                        'preferences',
                        'set-config',
                        String(args.pkg),
                        String(args.path),
                        args.value,
                        ...(args.protocol ? [String(args.protocol)] : []),
                    );
                    const value = await request('preferences', 'query-config', String(args.pkg), String(args.path));
                    return { value: value === undefined ? null : value };
                },
            },
            server_info: {
                description: 'Preview server info: LAN IP list and port (combine into preview URLs).',
                handler: async () => {
                    const [ips, port] = await Promise.all([
                        request('server', 'query-ip-list'),
                        request('server', 'query-port'),
                    ]);
                    return { ips, port };
                },
            },
        },
    };
}
