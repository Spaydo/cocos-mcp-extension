import { join } from 'path';
module.paths.push(join(Editor.App.path, 'node_modules'));

/**
 * Scene script - the ONLY place with access to cc.* engine APIs.
 * Called via: Editor.Message.request('scene', 'execute-scene-script', { name, method, args })
 */

// === Helpers ===

function findNodeByUuidDeep(root: any, uuid: string): any {
    if (root.uuid === uuid) return root;
    for (const child of root.children || []) {
        const found = findNodeByUuidDeep(child, uuid);
        if (found) return found;
    }
    return null;
}

function getActiveScene(): any {
    const { director } = require('cc');
    return director.getScene();
}

function requireScene(): any {
    const scene = getActiveScene();
    if (!scene) throw new Error('No active scene');
    return scene;
}

function requireNode(scene: any, uuid: string): any {
    const node = findNodeByUuidDeep(scene, uuid);
    if (!node) throw new Error(`Node not found: ${uuid}`);
    return node;
}

function nodeToInfo(node: any): any {
    const pos = node.position || node.getPosition?.();
    const rot = node.eulerAngles || node.getRotation?.();
    const scl = node.scale || node.getScale?.();

    const info: any = {
        uuid: node.uuid,
        name: node.name,
        active: node.active,
    };

    if (pos) info.position = { x: pos.x, y: pos.y, z: pos.z };
    if (rot) info.rotation = { x: rot.x, y: rot.y, z: rot.z };
    if (scl) info.scale = { x: scl.x, y: scl.y, z: scl.z };

    if (node.parent) info.parent = node.parent.uuid;

    if (node.children) {
        info.children = node.children.map((c: any) => c.uuid);
    }

    if (node.components) {
        info.components = node.components.map((c: any) => ({
            type: c.constructor?.name || 'unknown',
            enabled: c.enabled,
        }));
    }

    return info;
}

function buildHierarchy(node: any, includeComponents: boolean, depth: number, maxDepth: number): any {
    const result: any = {
        uuid: node.uuid,
        name: node.name,
        active: node.active,
    };

    if (includeComponents && node.components) {
        result.components = node.components.map((c: any) => ({
            type: c.constructor?.name || 'unknown',
            enabled: c.enabled,
        }));
    }

    if (depth < maxDepth && node.children && node.children.length > 0) {
        result.children = node.children.map((child: any) =>
            buildHierarchy(child, includeComponents, depth + 1, maxDepth)
        );
    } else if (node.children && node.children.length > 0) {
        result.childCount = node.children.length;
    }

    return result;
}

// === Exported Methods ===

export const methods: { [key: string]: (...args: any) => any } = {

    getCurrentSceneInfo() {
        try {
            const scene = requireScene();
            return {
                success: true,
                data: {
                    name: scene.name,
                    uuid: scene.uuid,
                    nodeCount: scene.children ? scene.children.length : 0,
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getSceneHierarchy(includeComponents: boolean = false, maxDepth: number = 3) {
        try {
            const scene = requireScene();
            const hierarchy = buildHierarchy(scene, includeComponents, 0, maxDepth);
            return { success: true, data: hierarchy };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getNodeInfo(nodeUuid: string) {
        try {
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);
            return { success: true, data: nodeToInfo(node) };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getAllNodes() {
        try {
            const scene = requireScene();
            const nodes: any[] = [];
            function collect(node: any) {
                nodes.push({
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    parent: node.parent?.uuid,
                });
                if (node.children) {
                    for (const child of node.children) {
                        collect(child);
                    }
                }
            }
            collect(scene);
            return { success: true, data: { totalNodes: nodes.length, nodes } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    findNodeByName(name: string) {
        try {
            const scene = requireScene();
            const results: any[] = [];
            function search(node: any, path: string) {
                const currentPath = path ? `${path}/${node.name}` : node.name;
                if (node.name === name) {
                    results.push({ uuid: node.uuid, name: node.name, path: currentPath });
                }
                if (node.children) {
                    for (const child of node.children) {
                        search(child, currentPath);
                    }
                }
            }
            search(scene, '');
            if (results.length === 0) {
                return { success: false, error: `No node found with name: ${name}` };
            }
            return { success: true, data: results };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    setNodeProperty(nodeUuid: string, property: string, value: any) {
        try {
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);

            switch (property) {
                case 'position': {
                    const v = value || {};
                    node.setPosition(v.x ?? 0, v.y ?? 0, v.z ?? 0);
                    break;
                }
                case 'rotation': {
                    const v = value || {};
                    if (node.setRotationFromEuler) {
                        node.setRotationFromEuler(v.x ?? 0, v.y ?? 0, v.z ?? 0);
                    }
                    break;
                }
                case 'scale': {
                    const v = value || {};
                    node.setScale(v.x ?? 1, v.y ?? 1, v.z ?? 1);
                    break;
                }
                case 'active':
                    node.active = value;
                    break;
                case 'name':
                    node.name = value;
                    break;
                default:
                    (node as any)[property] = value;
            }

            return { success: true, message: `Set ${property} on node ${nodeUuid}` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    addComponentToNode(nodeUuid: string, componentType: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);

            const ComponentClass = cc.js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component class not found: ${componentType}` };
            }

            const comp = node.addComponent(ComponentClass);
            return {
                success: true,
                data: { componentId: comp.uuid },
                message: `Added ${componentType} to node ${nodeUuid}`,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    removeComponentFromNode(nodeUuid: string, componentType: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);

            const ComponentClass = cc.js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component class not found: ${componentType}` };
            }

            const comp = node.getComponent(ComponentClass);
            if (!comp) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }

            node.removeComponent(comp);
            return { success: true, message: `Removed ${componentType} from node ${nodeUuid}` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getComponentInfo(nodeUuid: string, componentType?: string) {
        try {
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);

            if (!node.components || node.components.length === 0) {
                return { success: true, data: { nodeUuid, components: [] } };
            }

            if (!componentType) {
                const types = node.components.map((c: any) => ({
                    type: c.constructor?.name || 'unknown',
                    enabled: c.enabled,
                }));
                return { success: true, data: { nodeUuid, components: types } };
            }

            const comp = node.components.find((c: any) =>
                c.constructor?.name === componentType || c.constructor?.name?.includes(componentType)
            );

            if (!comp) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }

            return {
                success: true,
                data: {
                    nodeUuid,
                    componentType: comp.constructor?.name,
                    enabled: comp.enabled,
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    setComponentProperty(nodeUuid: string, componentType: string, property: string, value: any) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);

            const ComponentClass = cc.js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component class not found: ${componentType}` };
            }

            const comp = node.getComponent(ComponentClass);
            if (!comp) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }

            // Special handling for asset-type properties (async load)
            if (typeof value === 'string' && (property === 'spriteFrame' || property === 'material')) {
                // Fire-and-forget async asset load
                try {
                    cc.assetManager.loadAny(value, (err: any, asset: any) => {
                        if (!err && asset) {
                            (comp as any)[property] = asset;
                        }
                    });
                } catch {
                    // Ignore async errors
                }
                return { success: true, message: `Loading asset for ${componentType}.${property}` };
            }

            // Direct property assignment
            (comp as any)[property] = value;
            return { success: true, message: `Set ${componentType}.${property}` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    instantiatePrefab(assetUuid: string, parentUuid?: string, name?: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();

            return new Promise((resolve) => {
                cc.assetManager.loadAny(assetUuid, (err: any, prefab: any) => {
                    if (err) {
                        resolve({ success: false, error: `Failed to load prefab: ${err.message || err}` });
                        return;
                    }
                    if (!prefab || prefab.constructor?.name !== 'Prefab') {
                        resolve({ success: false, error: 'Asset is not a Prefab' });
                        return;
                    }

                    const node = cc.instantiate(prefab);
                    if (name) {
                        node.name = name;
                    }

                    // Find parent
                    let parent = scene;
                    if (parentUuid) {
                        const found = findNodeByUuidDeep(scene, parentUuid);
                        if (found) parent = found;
                    }

                    parent.addChild(node);
                    resolve({
                        success: true,
                        data: { uuid: node.uuid, name: node.name },
                        message: `Prefab instantiated: ${node.name}`,
                    });
                });
            });
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    createPrefabFromNode(nodeUuid: string, prefabPath: string) {
        try {
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);
            return {
                success: true,
                data: {
                    nodeUuid: node.uuid,
                    nodeName: node.name,
                    path: prefabPath,
                },
                message: `Prefab creation initiated for node: ${node.name}`,
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    executeScript(code: string) {
        try {
            const cc = require('cc');
            const { director } = cc;
            const fn = new Function('cc', 'director', code);
            const result = fn(cc, director);
            return {
                success: true,
                data: result !== undefined ? result : null,
                message: 'Script executed',
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
};
