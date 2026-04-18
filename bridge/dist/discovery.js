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
exports.Discovery = void 0;
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const REGISTRY_PATH = path.join(os.homedir(), '.cocos-mcp-registry.json');
const BASE_PORT = 3000;
const MAX_PORT = 3010;
const HEALTH_TIMEOUT = 2000;
class Discovery {
    constructor(cwd) {
        this.cachedConnection = null;
        this.cwd = this.normalizePath(cwd);
    }
    normalizePath(p) {
        return p.replace(/\\/g, '/').toLowerCase();
    }
    /**
     * Get the editor connection, using cache if still valid.
     * Returns null if no editor found (caller should return a helpful error).
     */
    async getEditor() {
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
    clearCache() {
        this.cachedConnection = null;
    }
    async discoverFromRegistry() {
        const entries = this.readRegistry();
        const candidates = [];
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
        if (candidates.length === 0)
            return null;
        if (candidates.length === 1)
            return candidates[0];
        // Pick most specific (longest projectPath)
        return candidates.sort((a, b) => b.projectPath.length - a.projectPath.length)[0];
    }
    async discoverByPortScan() {
        const candidates = [];
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
        if (candidates.length === 0)
            return null;
        if (candidates.length === 1)
            return candidates[0];
        return candidates.sort((a, b) => b.projectPath.length - a.projectPath.length)[0];
    }
    matchesProject(editorProjectPath) {
        const normalized = this.normalizePath(editorProjectPath);
        return this.cwd.startsWith(normalized) || normalized.startsWith(this.cwd);
    }
    readRegistry() {
        try {
            if (fs.existsSync(REGISTRY_PATH)) {
                const data = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
                const entries = data.instances || [];
                // Filter out stale PIDs
                return entries.filter(e => {
                    try {
                        process.kill(e.pid, 0);
                        return true;
                    }
                    catch {
                        return false;
                    }
                });
            }
        }
        catch { }
        return [];
    }
    healthCheck(port) {
        return new Promise((resolve) => {
            const req = http.get(`http://127.0.0.1:${port}/health`, { timeout: HEALTH_TIMEOUT }, (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    }
                    catch {
                        resolve(null);
                    }
                });
            });
            req.on('error', () => resolve(null));
            req.on('timeout', () => { req.destroy(); resolve(null); });
        });
    }
}
exports.Discovery = Discovery;
function log(msg) {
    process.stderr.write(`[cocos-mcp-bridge] ${msg}\n`);
}
//# sourceMappingURL=discovery.js.map