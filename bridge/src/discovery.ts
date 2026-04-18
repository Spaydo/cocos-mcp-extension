import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RegistryEntry, Registry, HealthResponse, EditorConnection } from './types';

const REGISTRY_PATH = path.join(os.homedir(), '.cocos-mcp-registry.json');
const BASE_PORT = 3000;
const MAX_PORT = 3010;
const HEALTH_TIMEOUT = 2000;

export class Discovery {
    private cachedConnection: EditorConnection | null = null;
    private cwd: string;

    constructor(cwd: string) {
        this.cwd = this.normalizePath(cwd);
    }

    private normalizePath(p: string): string {
        return p.replace(/\\/g, '/').toLowerCase();
    }

    /**
     * Get the editor connection, using cache if still valid.
     * Returns null if no editor found (caller should return a helpful error).
     */
    async getEditor(): Promise<EditorConnection | null> {
        // Validate cached connection
        if (this.cachedConnection) {
            const health = await this.healthCheck(this.cachedConnection.port);
            if (health && this.matchesProject(health.projectPath)) {
                return this.cachedConnection;
            }
            this.cachedConnection = null;
            log('Cached connection invalid, re-discovering...');
        }

        // Discover from registry
        const editor = await this.discoverFromRegistry();
        if (editor) {
            this.cachedConnection = editor;
            log(`Discovered editor at port ${editor.port} for ${editor.projectPath}`);
            return editor;
        }

        // Fallback: port scan
        const scanned = await this.discoverByPortScan();
        if (scanned) {
            this.cachedConnection = scanned;
            log(`Found editor via port scan at port ${scanned.port}`);
            return scanned;
        }

        return null;
    }

    /** Clear cached connection (forces re-discovery on next call) */
    clearCache(): void {
        this.cachedConnection = null;
    }

    private async discoverFromRegistry(): Promise<EditorConnection | null> {
        const entries = this.readRegistry();
        const candidates: EditorConnection[] = [];

        for (const entry of entries) {
            const health = await this.healthCheck(entry.port);
            if (health && this.matchesProject(health.projectPath)) {
                const conn = { port: entry.port, projectPath: health.projectPath };
                // Exact match — return immediately
                if (this.normalizePath(health.projectPath) === this.cwd) {
                    return conn;
                }
                candidates.push(conn);
            }
        }

        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];
        // Pick most specific (longest projectPath)
        return candidates.sort((a, b) => b.projectPath.length - a.projectPath.length)[0];
    }

    private async discoverByPortScan(): Promise<EditorConnection | null> {
        const candidates: EditorConnection[] = [];

        for (let port = BASE_PORT; port <= MAX_PORT; port++) {
            const health = await this.healthCheck(port);
            if (health && health.projectPath && this.matchesProject(health.projectPath)) {
                const conn = { port, projectPath: health.projectPath };
                if (this.normalizePath(health.projectPath) === this.cwd) {
                    return conn;
                }
                candidates.push(conn);
            }
        }

        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];
        return candidates.sort((a, b) => b.projectPath.length - a.projectPath.length)[0];
    }

    private matchesProject(editorProjectPath: string): boolean {
        const normalized = this.normalizePath(editorProjectPath);
        return this.cwd.startsWith(normalized) || normalized.startsWith(this.cwd);
    }

    private readRegistry(): RegistryEntry[] {
        try {
            if (fs.existsSync(REGISTRY_PATH)) {
                const data: Registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
                const entries = data.instances || [];
                // Filter out stale PIDs
                return entries.filter(e => {
                    try { process.kill(e.pid, 0); return true; } catch { return false; }
                });
            }
        } catch {}
        return [];
    }

    private healthCheck(port: number): Promise<HealthResponse | null> {
        return new Promise((resolve) => {
            const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: HEALTH_TIMEOUT }, (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body) as HealthResponse);
                    } catch {
                        resolve(null);
                    }
                });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
        });
    }
}

function log(msg: string): void {
    process.stderr.write(`[cocos-mcp-bridge] ${msg}\n`);
}
