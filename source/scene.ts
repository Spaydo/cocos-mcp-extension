import { join } from 'path';
module.paths.push(join(Editor.App.path, 'node_modules'));

/** Components that require cc.UITransform as a companion */
const UI_TRANSFORM_DEPENDENTS = [
    'Sprite', 'Label', 'Button', 'Layout', 'ScrollView', 'Widget',
    'RichText', 'EditBox', 'ProgressBar', 'Toggle', 'Slider',
    'PageView', 'Graphics', 'Mask', 'BlockInputEvents',
];

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

    resetComponent(nodeUuid: string, componentType: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);

            const ComponentClass = cc.js.getClassByName(componentType);
            if (!ComponentClass) {
                return { success: false, error: `Component class not found: ${componentType}` };
            }

            const oldComp = node.getComponent(ComponentClass);
            if (!oldComp) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }

            // Remove and re-add to reset to defaults
            node.removeComponent(oldComp);
            node.addComponent(ComponentClass);

            return { success: true, message: `Reset ${componentType} on node ${nodeUuid}` };
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

    // === Animation Methods ===

    getAnimationClips(nodeUuid: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);

            const animComp = node.getComponent(cc.Animation);
            if (!animComp) {
                return { success: false, error: 'No Animation component found on node' };
            }

            const clips = (animComp.clips || []).map((clip: any) => ({
                name: clip?.name || 'unknown',
                duration: clip?.duration || 0,
                speed: clip?.speed || 1,
                wrapMode: clip?.wrapMode,
            }));

            return {
                success: true,
                data: {
                    nodeUuid,
                    defaultClip: animComp.defaultClip?.name || null,
                    playOnLoad: animComp.playOnLoad || false,
                    clips,
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    playAnimation(nodeUuid: string, clipName?: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);

            const animComp = node.getComponent(cc.Animation);
            if (!animComp) {
                return { success: false, error: 'No Animation component found on node' };
            }

            if (clipName) {
                animComp.play(clipName);
            } else {
                animComp.play();
            }

            return { success: true, message: `Animation playing${clipName ? `: ${clipName}` : ''}` };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    stopAnimation(nodeUuid: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);

            const animComp = node.getComponent(cc.Animation);
            if (!animComp) {
                return { success: false, error: 'No Animation component found on node' };
            }

            animComp.stop();
            return { success: true, message: 'Animation stopped' };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    setAnimationProperty(nodeUuid: string, defaultClip?: string, playOnLoad?: boolean) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);

            const animComp = node.getComponent(cc.Animation);
            if (!animComp) {
                return { success: false, error: 'No Animation component found on node' };
            }

            const changed: string[] = [];

            if (defaultClip !== undefined) {
                const clip = animComp.clips.find((c: any) => c?.name === defaultClip);
                if (clip) {
                    animComp.defaultClip = clip;
                    changed.push(`defaultClip=${defaultClip}`);
                } else {
                    return { success: false, error: `Clip not found: ${defaultClip}` };
                }
            }

            if (playOnLoad !== undefined) {
                animComp.playOnLoad = playOnLoad;
                changed.push(`playOnLoad=${playOnLoad}`);
            }

            return { success: true, message: `Animation properties set: ${changed.join(', ')}` };
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

    validateScene(maxDepth: number = 10) {
        try {
            const scene = requireScene();
            const issues: any[] = [];
            let totalNodes = 0;
            let totalComponents = 0;
            let actualMaxDepth = 0;

            function walk(node: any, depth: number) {
                totalNodes++;
                if (depth > actualMaxDepth) actualMaxDepth = depth;
                if (depth > maxDepth) return;

                if (!node.name || node.name.trim() === '') {
                    issues.push({
                        severity: 'warning',
                        nodeUuid: node.uuid,
                        nodeName: node.name || '(empty)',
                        message: 'Node has empty name',
                        suggestion: 'Give the node a descriptive name',
                    });
                }

                if (node.components) {
                    totalComponents += node.components.length;
                    for (const comp of node.components) {
                        const typeName = comp.constructor?.name || 'unknown';
                        if (UI_TRANSFORM_DEPENDENTS.includes(typeName)) {
                            const cc = require('cc');
                            const hasUITransform = node.getComponent(cc.UITransform);
                            if (!hasUITransform) {
                                issues.push({
                                    severity: 'error',
                                    nodeUuid: node.uuid,
                                    nodeName: node.name,
                                    message: `${typeName} requires UITransform but none found`,
                                    suggestion: `Add cc.UITransform component to this node`,
                                });
                            }
                        }
                        if (comp.enabled === false) {
                            issues.push({
                                severity: 'info',
                                nodeUuid: node.uuid,
                                nodeName: node.name,
                                message: `Component ${typeName} is disabled`,
                            });
                        }
                    }
                }
                if (node.children) {
                    for (const child of node.children) {
                        walk(child, depth + 1);
                    }
                }
            }

            walk(scene, 0);

            return {
                success: true,
                data: {
                    valid: issues.filter(i => i.severity === 'error').length === 0,
                    issues,
                    stats: { totalNodes, totalComponents, totalReferences: 0, maxDepth: actualMaxDepth },
                },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    validateNode(nodeUuid: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);
            const issues: any[] = [];

            if (!node.name || node.name.trim() === '') {
                issues.push({
                    severity: 'warning', nodeUuid: node.uuid, nodeName: node.name || '(empty)',
                    message: 'Node has empty name', suggestion: 'Give the node a descriptive name',
                });
            }

            if (node.components) {
                for (const comp of node.components) {
                    const typeName = comp.constructor?.name || 'unknown';
                    if (UI_TRANSFORM_DEPENDENTS.includes(typeName)) {
                        const hasUITransform = node.getComponent(cc.UITransform);
                        if (!hasUITransform) {
                            issues.push({
                                severity: 'error', nodeUuid: node.uuid, nodeName: node.name,
                                message: `${typeName} requires UITransform but none found`,
                                suggestion: `Add cc.UITransform component to this node`,
                            });
                        }
                    }
                }
            }

            if (!node.parent && node !== scene) {
                issues.push({
                    severity: 'error', nodeUuid: node.uuid, nodeName: node.name,
                    message: 'Node has no parent (orphaned)',
                    suggestion: 'Attach this node to a parent in the scene tree',
                });
            }

            return {
                success: true,
                data: { valid: issues.filter(i => i.severity === 'error').length === 0, issues, nodeInfo: nodeToInfo(node) },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    validateComponents(componentType?: string) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const issues: any[] = [];

            function walk(node: any) {
                if (node.components) {
                    for (const comp of node.components) {
                        const typeName = comp.constructor?.name || 'unknown';
                        if (componentType && typeName !== componentType) continue;
                        if (UI_TRANSFORM_DEPENDENTS.includes(typeName)) {
                            const hasUITransform = node.getComponent(cc.UITransform);
                            if (!hasUITransform) {
                                issues.push({
                                    severity: 'error', nodeUuid: node.uuid, nodeName: node.name,
                                    message: `${typeName} requires UITransform but none found`,
                                    suggestion: `Add cc.UITransform component to node '${node.name}'`,
                                });
                            }
                        }
                    }
                }
                if (node.children) { for (const child of node.children) { walk(child); } }
            }

            walk(scene);
            return {
                success: true,
                data: { valid: issues.filter(i => i.severity === 'error').length === 0, issues, checkedType: componentType || 'all' },
            };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getSceneStats() {
        try {
            const scene = requireScene();
            let totalNodes = 0;
            let totalComponents = 0;
            let maxDepth = 0;
            const componentCounts: Record<string, number> = {};

            function walk(node: any, depth: number) {
                totalNodes++;
                if (depth > maxDepth) maxDepth = depth;
                if (node.components) {
                    totalComponents += node.components.length;
                    for (const comp of node.components) {
                        const typeName = comp.constructor?.name || 'unknown';
                        componentCounts[typeName] = (componentCounts[typeName] || 0) + 1;
                    }
                }
                if (node.children) { for (const child of node.children) { walk(child, depth + 1); } }
            }

            walk(scene, 0);
            return { success: true, data: { totalNodes, totalComponents, maxDepth, componentDistribution: componentCounts } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },

    getSceneSnapshot() {
        try {
            const scene = requireScene();
            const nodes: any[] = [];

            function walk(node: any) {
                const entry: any = {
                    uuid: node.uuid, name: node.name, active: node.active,
                    parent: node.parent?.uuid || null,
                };
                if (node.components) {
                    entry.components = node.components.map((c: any) => ({
                        type: c.constructor?.name || 'unknown', enabled: c.enabled,
                    }));
                }
                const pos = node.position || node.getPosition?.();
                if (pos) entry.position = { x: pos.x, y: pos.y, z: pos.z };
                nodes.push(entry);
                if (node.children) { for (const child of node.children) { walk(child); } }
            }

            walk(scene);
            return { success: true, data: { timestamp: Date.now(), nodeCount: nodes.length, nodes } };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    },
};
