import { EditorConnection } from './types';
export declare class Discovery {
    private cachedConnection;
    private cwd;
    constructor(cwd: string);
    private normalizePath;
    /**
     * Get the editor connection, using cache if still valid.
     * Returns null if no editor found (caller should return a helpful error).
     */
    getEditor(): Promise<EditorConnection | null>;
    /** Clear cached connection (forces re-discovery on next call) */
    clearCache(): void;
    private discoverFromRegistry;
    private discoverByPortScan;
    private matchesProject;
    private readRegistry;
    private healthCheck;
}
//# sourceMappingURL=discovery.d.ts.map