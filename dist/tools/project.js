"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectTool = createProjectTool;
const helpers_1 = require("./helpers");
function createProjectTool() {
    return {
        name: 'project',
        description: 'Project / editor / engine information, project settings and editor preferences.',
        actions: {
            info: {
                description: 'Get current project info (path/name/uuid), editor version and version capability flags.',
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
                            electron: process.versions.electron,
                        },
                        capabilities: ctx.env.capabilities,
                    };
                },
            },
            engine_info: {
                description: 'Engine info: version, paths, builtin/custom native engine.',
                handler: async () => {
                    const basic = await (0, helpers_1.request)('engine', 'query-info');
                    const detail = await (0, helpers_1.request)('engine', 'query-engine-info').catch(() => null);
                    return Object.assign(Object.assign({}, basic), { detail });
                },
            },
            settings_query: {
                description: 'Read project settings of a package (Project Settings panel data). Only packages that ' +
                    'registered a profile work (others return null). ' +
                    'Examples: pkg="project" path="general.designResolution", pkg="engine" path="modules".',
                params: {
                    pkg: { type: 'string', description: 'Package name, e.g. project / engine / physics.' },
                    path: { type: 'string', description: 'Key path within the config. Omit for the whole object.' },
                    protocol: { type: 'string', enum: ['default', 'project'], description: 'Config layer (default: project).' },
                },
                required: ['pkg'],
                handler: async (args) => {
                    const value = await (0, helpers_1.request)('project', 'query-config', String(args.pkg), args.path ? String(args.path) : undefined, args.protocol ? String(args.protocol) : undefined);
                    return { value: value === undefined ? null : value };
                },
            },
            settings_set: {
                description: 'Write a project setting value (always the project layer; the package must have a registered profile).',
                params: {
                    pkg: { type: 'string', description: 'Package name.' },
                    path: { type: 'string', description: 'Key path within the config.' },
                    value: { description: 'New value (JSON-serializable).' },
                },
                required: ['pkg', 'path', 'value'],
                handler: async (args) => {
                    await (0, helpers_1.request)('project', 'set-config', String(args.pkg), String(args.path), args.value);
                    const value = await (0, helpers_1.request)('project', 'query-config', String(args.pkg), String(args.path));
                    return { value: value === undefined ? null : value };
                },
            },
            preferences_query: {
                description: 'Read editor preferences of a package (Preferences panel data). Only packages that ' +
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
                    const value = await (0, helpers_1.request)('preferences', 'query-config', String(args.pkg), args.path ? String(args.path) : undefined, args.protocol ? String(args.protocol) : undefined);
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
                    await (0, helpers_1.request)('preferences', 'set-config', String(args.pkg), String(args.path), args.value, ...(args.protocol ? [String(args.protocol)] : []));
                    const value = await (0, helpers_1.request)('preferences', 'query-config', String(args.pkg), String(args.path));
                    return { value: value === undefined ? null : value };
                },
            },
            server_info: {
                description: 'Preview server info: LAN IP list and port (combine into preview URLs).',
                handler: async () => {
                    const [ips, port] = await Promise.all([
                        (0, helpers_1.request)('server', 'query-ip-list'),
                        (0, helpers_1.request)('server', 'query-port'),
                    ]);
                    return { ips, port };
                },
            },
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvamVjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NvdXJjZS90b29scy9wcm9qZWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBU0EsOENBaUlDO0FBbklELHVDQUFvQztBQUVwQyxTQUFnQixpQkFBaUI7SUFDN0IsT0FBTztRQUNILElBQUksRUFBRSxTQUFTO1FBQ2YsV0FBVyxFQUFFLGlGQUFpRjtRQUM5RixPQUFPLEVBQUU7WUFDTCxJQUFJLEVBQUU7Z0JBQ0YsV0FBVyxFQUNQLHlGQUF5RjtnQkFDN0YsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7b0JBQzFCLE9BQU87d0JBQ0gsT0FBTyxFQUFFOzRCQUNMLElBQUksRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUk7NEJBQ3pCLElBQUksRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUk7NEJBQ3pCLElBQUksRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUk7eUJBQzVCO3dCQUNELE1BQU0sRUFBRTs0QkFDSixPQUFPLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRzs0QkFDNUIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSTs0QkFDckIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSTs0QkFDM0IsUUFBUSxFQUFHLE9BQU8sQ0FBQyxRQUFtQyxDQUFDLFFBQVE7eUJBQ2xFO3dCQUNELFlBQVksRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLFlBQVk7cUJBQ3JDLENBQUM7Z0JBQ04sQ0FBQzthQUNKO1lBQ0QsV0FBVyxFQUFFO2dCQUNULFdBQVcsRUFBRSw0REFBNEQ7Z0JBQ3pFLE9BQU8sRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDaEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxJQUFBLGlCQUFPLEVBQUMsUUFBUSxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUNwRCxNQUFN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b0JBQ0gsT0FBTyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQztnQkFDekIsQ0FBQzthQUNKO1NBQ0o7S0FDSixDQUFDO0FBQ04sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogcHJvamVjdCDlt6XlhbfvvJrlsIjmoYggLyDnt6jovK/lmaggLyDlvJXmk47os4foqIroiIfoqK3lrproroDlr6vjgIJcbiAqIHNldHRpbmdzXyrvvIhwcm9qZWN0IHBhY2thZ2XvvJonZGVmYXVsdCcgfCAncHJvamVjdCcg5Y2U6K2w77yJXG4gKiBwcmVmZXJlbmNlc18q77yIcHJlZmVyZW5jZXMgcGFja2FnZe+8midkZWZhdWx0JyB8ICdnbG9iYWwnIHwgJ2xvY2FsJyDljZTorbDvvIlcbiAqIOewveWQjeimiyBkb2NzL2FwaS1yZWZlcmVuY2UvMDQgwqc177yIcHJlZmVyZW5jZXPvvIkvIMKnMTDvvIhwcm9qZWN077yJLyDCpzLvvIhlbmdpbmXvvIkvIMKnN++8iHNlcnZlcu+8ieOAglxuICovXG5pbXBvcnQgeyBUb29sRGVmIH0gZnJvbSAnLi4vdHlwZXMnO1xuaW1wb3J0IHsgcmVxdWVzdCB9IGZyb20gJy4vaGVscGVycyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm9qZWN0VG9vbCgpOiBUb29sRGVmIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiAncHJvamVjdCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUHJvamVjdCAvIGVkaXRvciAvIGVuZ2luZSBpbmZvcm1hdGlvbiwgcHJvamVjdCBzZXR0aW5ncyBhbmQgZWRpdG9yIHByZWZlcmVuY2VzLicsXG4gICAgICAgIGFjdGlvbnM6IHtcbiAgICAgICAgICAgIGluZm86IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcbiAgICAgICAgICAgICAgICAgICAgJ0dldCBjdXJyZW50IHByb2plY3QgaW5mbyAocGF0aC9uYW1lL3V1aWQpLCBlZGl0b3IgdmVyc2lvbiBhbmQgdmVyc2lvbiBjYXBhYmlsaXR5IGZsYWdzLicsXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKF9hcmdzLCBjdHgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2plY3Q6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBFZGl0b3IuUHJvamVjdC5wYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IEVkaXRvci5Qcm9qZWN0Lm5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXVpZDogRWRpdG9yLlByb2plY3QudXVpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICBlZGl0b3I6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBjdHguZW52LnZlcnNpb24ucmF3LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IEVkaXRvci5BcHAucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub2RlOiBwcm9jZXNzLnZlcnNpb25zLm5vZGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlY3Ryb246IChwcm9jZXNzLnZlcnNpb25zIGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4pLmVsZWN0cm9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhcGFiaWxpdGllczogY3R4LmVudi5jYXBhYmlsaXRpZXMsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbmdpbmVfaW5mbzoge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnRW5naW5lIGluZm86IHZlcnNpb24sIHBhdGhzLCBidWlsdGluL2N1c3RvbSBuYXRpdmUgZW5naW5lLicsXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNpYyA9IGF3YWl0IHJlcXVlc3QoJ2VuZ2luZScsICdxdWVyeS1pbmZvJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRldGFpbCA9IGF3YWl0IHJlcXVlc3QoJ2VuZ2luZScsICdxdWVyeS1lbmdpbmUtaW5mbycpLmNhdGNoKCgpID0+IG51bGwpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyAuLi5iYXNpYywgZGV0YWlsIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzZXR0aW5nc19xdWVyeToge1xuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOlxuICAgICAgICAgICAgICAgICAgICAnUmVhZCBwcm9qZWN0IHNldHRpbmdzIG9mIGEgcGFja2FnZSAoUHJvamVjdCBTZXR0aW5ncyBwYW5lbCBkYXRhKS4gT25seSBwYWNrYWdlcyB0aGF0ICcgK1xuICAgICAgICAgICAgICAgICAgICAncmVnaXN0ZXJlZCBhIHByb2ZpbGUgd29yayAob3RoZXJzIHJldHVybiBudWxsKS4gJyArXG4gICAgICAgICAgICAgICAgICAgICdFeGFtcGxlczogcGtnPVwicHJvamVjdFwiIHBhdGg9XCJnZW5lcmFsLmRlc2lnblJlc29sdXRpb25cIiwgcGtnPVwiZW5naW5lXCIgcGF0aD1cIm1vZHVsZXNcIi4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBwa2c6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUGFja2FnZSBuYW1lLCBlLmcuIHByb2plY3QgLyBlbmdpbmUgLyBwaHlzaWNzLicgfSxcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdLZXkgcGF0aCB3aXRoaW4gdGhlIGNvbmZpZy4gT21pdCBmb3IgdGhlIHdob2xlIG9iamVjdC4nIH0sXG4gICAgICAgICAgICAgICAgICAgIHByb3RvY29sOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ2RlZmF1bHQnLCAncHJvamVjdCddLCBkZXNjcmlwdGlvbjogJ0NvbmZpZyBsYXllciAoZGVmYXVsdDogcHJvamVjdCkuJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncGtnJ10sXG4gICAgICAgICAgICAgICAgaGFuZGxlcjogYXN5bmMgKGFyZ3MpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCByZXF1ZXN0KFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3Byb2plY3QnLFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3F1ZXJ5LWNvbmZpZycsXG4gICAgICAgICAgICAgICAgICAgICAgICBTdHJpbmcoYXJncy5wa2cpLFxuICAgICAgICAgICAgICAgICAgICAgICAgYXJncy5wYXRoID8gU3RyaW5nKGFyZ3MucGF0aCkgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnByb3RvY29sID8gU3RyaW5nKGFyZ3MucHJvdG9jb2wpIDogdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogdmFsdWUgPT09IHVuZGVmaW5lZCA/IG51bGwgOiB2YWx1ZSB9O1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgc2V0dGluZ3Nfc2V0OiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICdXcml0ZSBhIHByb2plY3Qgc2V0dGluZyB2YWx1ZSAoYWx3YXlzIHRoZSBwcm9qZWN0IGxheWVyOyB0aGUgcGFja2FnZSBtdXN0IGhhdmUgYSByZWdpc3RlcmVkIHByb2ZpbGUpLicsXG4gICAgICAgICAgICAgICAgcGFyYW1zOiB7XG4gICAgICAgICAgICAgICAgICAgIHBrZzogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdQYWNrYWdlIG5hbWUuJyB9LFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0tleSBwYXRoIHdpdGhpbiB0aGUgY29uZmlnLicgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHsgZGVzY3JpcHRpb246ICdOZXcgdmFsdWUgKEpTT04tc2VyaWFsaXphYmxlKS4nIH0sXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICByZXF1aXJlZDogWydwa2cnLCAncGF0aCcsICd2YWx1ZSddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHJlcXVlc3QoJ3Byb2plY3QnLCAnc2V0LWNvbmZpZycsIFN0cmluZyhhcmdzLnBrZyksIFN0cmluZyhhcmdzLnBhdGgpLCBhcmdzLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdmFsdWUgPSBhd2FpdCByZXF1ZXN0KCdwcm9qZWN0JywgJ3F1ZXJ5LWNvbmZpZycsIFN0cmluZyhhcmdzLnBrZyksIFN0cmluZyhhcmdzLnBhdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHZhbHVlID09PSB1bmRlZmluZWQgPyBudWxsIDogdmFsdWUgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHByZWZlcmVuY2VzX3F1ZXJ5OiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246XG4gICAgICAgICAgICAgICAgICAgICdSZWFkIGVkaXRvciBwcmVmZXJlbmNlcyBvZiBhIHBhY2thZ2UgKFByZWZlcmVuY2VzIHBhbmVsIGRhdGEpLiBPbmx5IHBhY2thZ2VzIHRoYXQgJyArXG4gICAgICAgICAgICAgICAgICAgICdyZWdpc3RlcmVkIGEgcHJlZmVyZW5jZXMgcHJvZmlsZSB3b3JrIChvdGhlcnMgcmV0dXJuIG51bGwpLiBFeGFtcGxlOiBwa2c9XCJkZXZpY2VcIi4nLFxuICAgICAgICAgICAgICAgIHBhcmFtczoge1xuICAgICAgICAgICAgICAgICAgICBwa2c6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnUGFja2FnZSBuYW1lLCBlLmcuIGdlbmVyYWwgLyBkZXZpY2UuJyB9LFxuICAgICAgICAgICAgICAgICAgICBwYXRoOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0tleSBwYXRoLiBPbWl0IGZvciB0aGUgd2hvbGUgb2JqZWN0LicgfSxcbiAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgICAgICAgICAgICAgZW51bTogWydkZWZhdWx0JywgJ2dsb2JhbCcsICdsb2NhbCddLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdDb25maWcgbGF5ZXIgKGRlZmF1bHQ6IGdsb2JhbCkuJyxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBbJ3BrZyddLFxuICAgICAgICAgICAgICAgIGhhbmRsZXI6IGFzeW5jIChhcmdzKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgcmVxdWVzdChcbiAgICAgICAgICAgICAgICAgICAgICAgICdwcmVmZXJlbmNlcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAncXVlcnktY29uZmlnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFN0cmluZyhhcmdzLnBrZyksXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzLnBhdGggPyBTdHJpbmcoYXJncy5wYXRoKSA6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MucHJvdG9jb2wgPyBTdHJpbmcoYXJncy5wcm90b2NvbCkgOiB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiB2YWx1ZSA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IHZhbHVlIH07XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBwcmVmZXJlbmNlc19zZXQ6IHtcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1dyaXRlIGFuIGVkaXRvciBwcmVmZXJlbmNlIHZhbHVlIChrZXkgcGF0aCByZXF1aXJlZCkuJyxcbiAgICAgICAgICAgICAgICBwYXJhbXM6IHtcbiAgICAgICAgICAgICAgICAgICAgcGtnOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1BhY2thZ2UgbmFtZS4nIH0sXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnS2V5IHBhdGguJyB9LFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogeyBkZXNjcmlwdGlvbjogJ05ldyB2YWx1ZSAoSlNPTi1zZXJpYWxpemFibGUpLicgfSxcbiAgICAgICAgICAgICAgICAgICAgcHJvdG9jb2w6IHsgdHlwZTogJ3N0cmluZycsIGVudW06IFsnZGVmYXVsdCcsICdnbG9iYWwnLCAnbG9jYWwnXSwgZGVzY3JpcHRpb246ICdDb25maWcgbGF5ZXIuJyB9LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsncGtnJywgJ3BhdGgnLCAndmFsdWUnXSxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoYXJncykgPT4ge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCByZXF1ZXN0KFxuICAgICAgICAgICAgICAgICAgICAgICAgJ3ByZWZlcmVuY2VzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICdzZXQtY29uZmlnJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIFN0cmluZyhhcmdzLnBrZyksXG4gICAgICAgICAgICAgICAgICAgICAgICBTdHJpbmcoYXJncy5wYXRoKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3MudmFsdWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAuLi4oYXJncy5wcm90b2NvbCA/IFtTdHJpbmcoYXJncy5wcm90b2NvbCldIDogW10pLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB2YWx1ZSA9IGF3YWl0IHJlcXVlc3QoJ3ByZWZlcmVuY2VzJywgJ3F1ZXJ5LWNvbmZpZycsIFN0cmluZyhhcmdzLnBrZyksIFN0cmluZyhhcmdzLnBhdGgpKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgdmFsdWU6IHZhbHVlID09PSB1bmRlZmluZWQgPyBudWxsIDogdmFsdWUgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHNlcnZlcl9pbmZvOiB7XG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246ICdQcmV2aWV3IHNlcnZlciBpbmZvOiBMQU4gSVAgbGlzdCBhbmQgcG9ydCAoY29tYmluZSBpbnRvIHByZXZpZXcgVVJMcykuJyxcbiAgICAgICAgICAgICAgICBoYW5kbGVyOiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IFtpcHMsIHBvcnRdID0gYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVxdWVzdCgnc2VydmVyJywgJ3F1ZXJ5LWlwLWxpc3QnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcXVlc3QoJ3NlcnZlcicsICdxdWVyeS1wb3J0JyksXG4gICAgICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBpcHMsIHBvcnQgfTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICB9O1xufVxuIl19