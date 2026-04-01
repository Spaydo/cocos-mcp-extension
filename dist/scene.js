"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
const path_1 = require("path");
module.paths.push((0, path_1.join)(Editor.App.path, 'node_modules'));
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
function findNodeByUuidDeep(root, uuid) {
    if (root.uuid === uuid)
        return root;
    for (const child of root.children || []) {
        const found = findNodeByUuidDeep(child, uuid);
        if (found)
            return found;
    }
    return null;
}
function getActiveScene() {
    const { director } = require('cc');
    return director.getScene();
}
function requireScene() {
    const scene = getActiveScene();
    if (!scene)
        throw new Error('No active scene');
    return scene;
}
function requireNode(scene, uuid) {
    const node = findNodeByUuidDeep(scene, uuid);
    if (!node)
        throw new Error(`Node not found: ${uuid}`);
    return node;
}
function nodeToInfo(node) {
    var _a, _b, _c;
    const pos = node.position || ((_a = node.getPosition) === null || _a === void 0 ? void 0 : _a.call(node));
    const rot = node.eulerAngles || ((_b = node.getRotation) === null || _b === void 0 ? void 0 : _b.call(node));
    const scl = node.scale || ((_c = node.getScale) === null || _c === void 0 ? void 0 : _c.call(node));
    const info = {
        uuid: node.uuid,
        name: node.name,
        active: node.active,
    };
    if (pos)
        info.position = { x: pos.x, y: pos.y, z: pos.z };
    if (rot)
        info.rotation = { x: rot.x, y: rot.y, z: rot.z };
    if (scl)
        info.scale = { x: scl.x, y: scl.y, z: scl.z };
    if (node.parent)
        info.parent = node.parent.uuid;
    if (node.children) {
        info.children = node.children.map((c) => c.uuid);
    }
    if (node.components) {
        info.components = node.components.map((c) => {
            var _a;
            return ({
                type: ((_a = c.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown',
                enabled: c.enabled,
            });
        });
    }
    return info;
}
function buildHierarchy(node, includeComponents, depth, maxDepth) {
    const result = {
        uuid: node.uuid,
        name: node.name,
        active: node.active,
    };
    if (includeComponents && node.components) {
        result.components = node.components.map((c) => {
            var _a;
            return ({
                type: ((_a = c.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown',
                enabled: c.enabled,
            });
        });
    }
    if (depth < maxDepth && node.children && node.children.length > 0) {
        result.children = node.children.map((child) => buildHierarchy(child, includeComponents, depth + 1, maxDepth));
    }
    else if (node.children && node.children.length > 0) {
        result.childCount = node.children.length;
    }
    return result;
}
// === Exported Methods ===
exports.methods = {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    getSceneHierarchy(includeComponents = false, maxDepth = 3) {
        try {
            const scene = requireScene();
            const hierarchy = buildHierarchy(scene, includeComponents, 0, maxDepth);
            return { success: true, data: hierarchy };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    getNodeInfo(nodeUuid) {
        try {
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);
            return { success: true, data: nodeToInfo(node) };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    getAllNodes() {
        try {
            const scene = requireScene();
            const nodes = [];
            function collect(node) {
                var _a;
                nodes.push({
                    uuid: node.uuid,
                    name: node.name,
                    active: node.active,
                    parent: (_a = node.parent) === null || _a === void 0 ? void 0 : _a.uuid,
                });
                if (node.children) {
                    for (const child of node.children) {
                        collect(child);
                    }
                }
            }
            collect(scene);
            return { success: true, data: { totalNodes: nodes.length, nodes } };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    findNodeByName(name) {
        try {
            const scene = requireScene();
            const results = [];
            function search(node, path) {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    setNodeProperty(nodeUuid, property, value) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        try {
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);
            switch (property) {
                case 'position': {
                    const v = value || {};
                    node.setPosition((_a = v.x) !== null && _a !== void 0 ? _a : 0, (_b = v.y) !== null && _b !== void 0 ? _b : 0, (_c = v.z) !== null && _c !== void 0 ? _c : 0);
                    break;
                }
                case 'rotation': {
                    const v = value || {};
                    if (node.setRotationFromEuler) {
                        node.setRotationFromEuler((_d = v.x) !== null && _d !== void 0 ? _d : 0, (_e = v.y) !== null && _e !== void 0 ? _e : 0, (_f = v.z) !== null && _f !== void 0 ? _f : 0);
                    }
                    break;
                }
                case 'scale': {
                    const v = value || {};
                    node.setScale((_g = v.x) !== null && _g !== void 0 ? _g : 1, (_h = v.y) !== null && _h !== void 0 ? _h : 1, (_j = v.z) !== null && _j !== void 0 ? _j : 1);
                    break;
                }
                case 'active':
                    node.active = value;
                    break;
                case 'name':
                    node.name = value;
                    break;
                default:
                    node[property] = value;
            }
            return { success: true, message: `Set ${property} on node ${nodeUuid}` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    addComponentToNode(nodeUuid, componentType) {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    removeComponentFromNode(nodeUuid, componentType) {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    resetComponent(nodeUuid, componentType) {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    getComponentInfo(nodeUuid, componentType) {
        var _a;
        try {
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);
            if (!node.components || node.components.length === 0) {
                return { success: true, data: { nodeUuid, components: [] } };
            }
            if (!componentType) {
                const types = node.components.map((c) => {
                    var _a;
                    return ({
                        type: ((_a = c.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown',
                        enabled: c.enabled,
                    });
                });
                return { success: true, data: { nodeUuid, components: types } };
            }
            const comp = node.components.find((c) => { var _a, _b, _c; return ((_a = c.constructor) === null || _a === void 0 ? void 0 : _a.name) === componentType || ((_c = (_b = c.constructor) === null || _b === void 0 ? void 0 : _b.name) === null || _c === void 0 ? void 0 : _c.includes(componentType)); });
            if (!comp) {
                return { success: false, error: `Component ${componentType} not found on node` };
            }
            return {
                success: true,
                data: {
                    nodeUuid,
                    componentType: (_a = comp.constructor) === null || _a === void 0 ? void 0 : _a.name,
                    enabled: comp.enabled,
                },
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    setComponentProperty(nodeUuid, componentType, property, value) {
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
                    cc.assetManager.loadAny(value, (err, asset) => {
                        if (!err && asset) {
                            comp[property] = asset;
                        }
                    });
                }
                catch (_a) {
                    // Ignore async errors
                }
                return { success: true, message: `Loading asset for ${componentType}.${property}` };
            }
            // Direct property assignment
            comp[property] = value;
            return { success: true, message: `Set ${componentType}.${property}` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    instantiatePrefab(assetUuid, parentUuid, name) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            return new Promise((resolve) => {
                cc.assetManager.loadAny(assetUuid, (err, prefab) => {
                    var _a;
                    if (err) {
                        resolve({ success: false, error: `Failed to load prefab: ${err.message || err}` });
                        return;
                    }
                    if (!prefab || ((_a = prefab.constructor) === null || _a === void 0 ? void 0 : _a.name) !== 'Prefab') {
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
                        if (found)
                            parent = found;
                    }
                    parent.addChild(node);
                    resolve({
                        success: true,
                        data: { uuid: node.uuid, name: node.name },
                        message: `Prefab instantiated: ${node.name}`,
                    });
                });
            });
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    createPrefabFromNode(nodeUuid, prefabPath) {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    // === Animation Methods ===
    getAnimationClips(nodeUuid) {
        var _a;
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);
            const animComp = node.getComponent(cc.Animation);
            if (!animComp) {
                return { success: false, error: 'No Animation component found on node' };
            }
            const clips = (animComp.clips || []).map((clip) => ({
                name: (clip === null || clip === void 0 ? void 0 : clip.name) || 'unknown',
                duration: (clip === null || clip === void 0 ? void 0 : clip.duration) || 0,
                speed: (clip === null || clip === void 0 ? void 0 : clip.speed) || 1,
                wrapMode: clip === null || clip === void 0 ? void 0 : clip.wrapMode,
            }));
            return {
                success: true,
                data: {
                    nodeUuid,
                    defaultClip: ((_a = animComp.defaultClip) === null || _a === void 0 ? void 0 : _a.name) || null,
                    playOnLoad: animComp.playOnLoad || false,
                    clips,
                },
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    playAnimation(nodeUuid, clipName) {
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
            }
            else {
                animComp.play();
            }
            return { success: true, message: `Animation playing${clipName ? `: ${clipName}` : ''}` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    stopAnimation(nodeUuid) {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    setAnimationProperty(nodeUuid, defaultClip, playOnLoad) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);
            const animComp = node.getComponent(cc.Animation);
            if (!animComp) {
                return { success: false, error: 'No Animation component found on node' };
            }
            const changed = [];
            if (defaultClip !== undefined) {
                const clip = animComp.clips.find((c) => (c === null || c === void 0 ? void 0 : c.name) === defaultClip);
                if (clip) {
                    animComp.defaultClip = clip;
                    changed.push(`defaultClip=${defaultClip}`);
                }
                else {
                    return { success: false, error: `Clip not found: ${defaultClip}` };
                }
            }
            if (playOnLoad !== undefined) {
                animComp.playOnLoad = playOnLoad;
                changed.push(`playOnLoad=${playOnLoad}`);
            }
            return { success: true, message: `Animation properties set: ${changed.join(', ')}` };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    executeScript(code) {
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    validateScene(maxDepth = 10) {
        try {
            const scene = requireScene();
            const issues = [];
            let totalNodes = 0;
            let totalComponents = 0;
            let actualMaxDepth = 0;
            function walk(node, depth) {
                var _a;
                totalNodes++;
                if (depth > actualMaxDepth)
                    actualMaxDepth = depth;
                if (depth > maxDepth)
                    return;
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
                        const typeName = ((_a = comp.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown';
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    validateNode(nodeUuid) {
        var _a;
        try {
            const cc = require('cc');
            const scene = requireScene();
            const node = requireNode(scene, nodeUuid);
            const issues = [];
            if (!node.name || node.name.trim() === '') {
                issues.push({
                    severity: 'warning', nodeUuid: node.uuid, nodeName: node.name || '(empty)',
                    message: 'Node has empty name', suggestion: 'Give the node a descriptive name',
                });
            }
            if (node.components) {
                for (const comp of node.components) {
                    const typeName = ((_a = comp.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown';
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
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    validateComponents(componentType) {
        try {
            const cc = require('cc');
            const scene = requireScene();
            const issues = [];
            function walk(node) {
                var _a;
                if (node.components) {
                    for (const comp of node.components) {
                        const typeName = ((_a = comp.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown';
                        if (componentType && typeName !== componentType)
                            continue;
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
                if (node.children) {
                    for (const child of node.children) {
                        walk(child);
                    }
                }
            }
            walk(scene);
            return {
                success: true,
                data: { valid: issues.filter(i => i.severity === 'error').length === 0, issues, checkedType: componentType || 'all' },
            };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    getSceneStats() {
        try {
            const scene = requireScene();
            let totalNodes = 0;
            let totalComponents = 0;
            let maxDepth = 0;
            const componentCounts = {};
            function walk(node, depth) {
                var _a;
                totalNodes++;
                if (depth > maxDepth)
                    maxDepth = depth;
                if (node.components) {
                    totalComponents += node.components.length;
                    for (const comp of node.components) {
                        const typeName = ((_a = comp.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown';
                        componentCounts[typeName] = (componentCounts[typeName] || 0) + 1;
                    }
                }
                if (node.children) {
                    for (const child of node.children) {
                        walk(child, depth + 1);
                    }
                }
            }
            walk(scene, 0);
            return { success: true, data: { totalNodes, totalComponents, maxDepth, componentDistribution: componentCounts } };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
    getSceneSnapshot() {
        try {
            const scene = requireScene();
            const nodes = [];
            function walk(node) {
                var _a, _b;
                const entry = {
                    uuid: node.uuid, name: node.name, active: node.active,
                    parent: ((_a = node.parent) === null || _a === void 0 ? void 0 : _a.uuid) || null,
                };
                if (node.components) {
                    entry.components = node.components.map((c) => {
                        var _a;
                        return ({
                            type: ((_a = c.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown', enabled: c.enabled,
                        });
                    });
                }
                const pos = node.position || ((_b = node.getPosition) === null || _b === void 0 ? void 0 : _b.call(node));
                if (pos)
                    entry.position = { x: pos.x, y: pos.y, z: pos.z };
                nodes.push(entry);
                if (node.children) {
                    for (const child of node.children) {
                        walk(child);
                    }
                }
            }
            walk(scene);
            return { success: true, data: { timestamp: Date.now(), nodeCount: nodes.length, nodes } };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQTRCO0FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFekQsNERBQTREO0FBQzVELE1BQU0sdUJBQXVCLEdBQUc7SUFDNUIsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxRQUFRO0lBQzdELFVBQVUsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxRQUFRO0lBQ3hELFVBQVUsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLGtCQUFrQjtDQUNyRCxDQUFDO0FBRUY7OztHQUdHO0FBRUgsa0JBQWtCO0FBRWxCLFNBQVMsa0JBQWtCLENBQUMsSUFBUyxFQUFFLElBQVk7SUFDL0MsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUk7UUFBRSxPQUFPLElBQUksQ0FBQztJQUNwQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7UUFDdEMsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksS0FBSztZQUFFLE9BQU8sS0FBSyxDQUFDO0lBQzVCLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxjQUFjO0lBQ25CLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkMsT0FBTyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDL0IsQ0FBQztBQUVELFNBQVMsWUFBWTtJQUNqQixNQUFNLEtBQUssR0FBRyxjQUFjLEVBQUUsQ0FBQztJQUMvQixJQUFJLENBQUMsS0FBSztRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMvQyxPQUFPLEtBQUssQ0FBQztBQUNqQixDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsS0FBVSxFQUFFLElBQVk7SUFDekMsTUFBTSxJQUFJLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdDLElBQUksQ0FBQyxJQUFJO1FBQUUsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN0RCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsSUFBUzs7SUFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsS0FBSSxNQUFBLElBQUksQ0FBQyxXQUFXLG9EQUFJLENBQUEsQ0FBQztJQUNsRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxLQUFJLE1BQUEsSUFBSSxDQUFDLFdBQVcsb0RBQUksQ0FBQSxDQUFDO0lBQ3JELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUksTUFBQSxJQUFJLENBQUMsUUFBUSxvREFBSSxDQUFBLENBQUM7SUFFNUMsTUFBTSxJQUFJLEdBQVE7UUFDZCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7UUFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7UUFDZixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07S0FDdEIsQ0FBQztJQUVGLElBQUksR0FBRztRQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzFELElBQUksR0FBRztRQUFFLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzFELElBQUksR0FBRztRQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0lBRXZELElBQUksSUFBSSxDQUFDLE1BQU07UUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBRWhELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7UUFDbEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFOztZQUFDLE9BQUEsQ0FBQztnQkFDL0MsSUFBSSxFQUFFLENBQUEsTUFBQSxDQUFDLENBQUMsV0FBVywwQ0FBRSxJQUFJLEtBQUksU0FBUztnQkFDdEMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPO2FBQ3JCLENBQUMsQ0FBQTtTQUFBLENBQUMsQ0FBQztJQUNSLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxjQUFjLENBQUMsSUFBUyxFQUFFLGlCQUEwQixFQUFFLEtBQWEsRUFBRSxRQUFnQjtJQUMxRixNQUFNLE1BQU0sR0FBUTtRQUNoQixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7UUFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7UUFDZixNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07S0FDdEIsQ0FBQztJQUVGLElBQUksaUJBQWlCLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRTs7WUFBQyxPQUFBLENBQUM7Z0JBQ2pELElBQUksRUFBRSxDQUFBLE1BQUEsQ0FBQyxDQUFDLFdBQVcsMENBQUUsSUFBSSxLQUFJLFNBQVM7Z0JBQ3RDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTzthQUNyQixDQUFDLENBQUE7U0FBQSxDQUFDLENBQUM7SUFDUixDQUFDO0lBRUQsSUFBSSxLQUFLLEdBQUcsUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDaEUsTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQVUsRUFBRSxFQUFFLENBQy9DLGNBQWMsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FDaEUsQ0FBQztJQUNOLENBQUM7U0FBTSxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDbkQsTUFBTSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUM3QyxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUM7QUFDbEIsQ0FBQztBQUVELDJCQUEyQjtBQUVkLFFBQUEsT0FBTyxHQUE2QztJQUU3RCxtQkFBbUI7UUFDZixJQUFJLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUM3QixPQUFPO2dCQUNILE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRTtvQkFDRixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7b0JBQ2hCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtvQkFDaEIsU0FBUyxFQUFFLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUN4RDthQUNKLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsb0JBQTZCLEtBQUssRUFBRSxXQUFtQixDQUFDO1FBQ3RFLElBQUksQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLFlBQVksRUFBRSxDQUFDO1lBQzdCLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQztRQUM5QyxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWdCO1FBQ3hCLElBQUksQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLFlBQVksRUFBRSxDQUFDO1lBQzdCLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDMUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3JELENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEQsQ0FBQztJQUNMLENBQUM7SUFFRCxXQUFXO1FBQ1AsSUFBSSxDQUFDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUM7WUFDN0IsTUFBTSxLQUFLLEdBQVUsRUFBRSxDQUFDO1lBQ3hCLFNBQVMsT0FBTyxDQUFDLElBQVM7O2dCQUN0QixLQUFLLENBQUMsSUFBSSxDQUFDO29CQUNQLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtvQkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7b0JBQ2YsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO29CQUNuQixNQUFNLEVBQUUsTUFBQSxJQUFJLENBQUMsTUFBTSwwQ0FBRSxJQUFJO2lCQUM1QixDQUFDLENBQUM7Z0JBQ0gsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2hCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUNoQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ25CLENBQUM7Z0JBQ0wsQ0FBQztZQUNMLENBQUM7WUFDRCxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDZixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1FBQ3hFLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEQsQ0FBQztJQUNMLENBQUM7SUFFRCxjQUFjLENBQUMsSUFBWTtRQUN2QixJQUFJLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUM3QixNQUFNLE9BQU8sR0FBVSxFQUFFLENBQUM7WUFDMUIsU0FBUyxNQUFNLENBQUMsSUFBUyxFQUFFLElBQVk7Z0JBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUM5RCxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztnQkFDMUUsQ0FBQztnQkFDRCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDaEIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQ2hDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7b0JBQy9CLENBQUM7Z0JBQ0wsQ0FBQztZQUNMLENBQUM7WUFDRCxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2xCLElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLDRCQUE0QixJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQ3pFLENBQUM7WUFDRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUM7UUFDNUMsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztJQUVELGVBQWUsQ0FBQyxRQUFnQixFQUFFLFFBQWdCLEVBQUUsS0FBVTs7UUFDMUQsSUFBSSxDQUFDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUM7WUFDN0IsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUUxQyxRQUFRLFFBQVEsRUFBRSxDQUFDO2dCQUNmLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDZCxNQUFNLENBQUMsR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQUEsQ0FBQyxDQUFDLENBQUMsbUNBQUksQ0FBQyxFQUFFLE1BQUEsQ0FBQyxDQUFDLENBQUMsbUNBQUksQ0FBQyxFQUFFLE1BQUEsQ0FBQyxDQUFDLENBQUMsbUNBQUksQ0FBQyxDQUFDLENBQUM7b0JBQy9DLE1BQU07Z0JBQ1YsQ0FBQztnQkFDRCxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUM7b0JBQ2QsTUFBTSxDQUFDLEdBQUcsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDdEIsSUFBSSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQzt3QkFDNUIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQUEsQ0FBQyxDQUFDLENBQUMsbUNBQUksQ0FBQyxFQUFFLE1BQUEsQ0FBQyxDQUFDLENBQUMsbUNBQUksQ0FBQyxFQUFFLE1BQUEsQ0FBQyxDQUFDLENBQUMsbUNBQUksQ0FBQyxDQUFDLENBQUM7b0JBQzVELENBQUM7b0JBQ0QsTUFBTTtnQkFDVixDQUFDO2dCQUNELEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDWCxNQUFNLENBQUMsR0FBRyxLQUFLLElBQUksRUFBRSxDQUFDO29CQUN0QixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQUEsQ0FBQyxDQUFDLENBQUMsbUNBQUksQ0FBQyxFQUFFLE1BQUEsQ0FBQyxDQUFDLENBQUMsbUNBQUksQ0FBQyxFQUFFLE1BQUEsQ0FBQyxDQUFDLENBQUMsbUNBQUksQ0FBQyxDQUFDLENBQUM7b0JBQzVDLE1BQU07Z0JBQ1YsQ0FBQztnQkFDRCxLQUFLLFFBQVE7b0JBQ1QsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7b0JBQ3BCLE1BQU07Z0JBQ1YsS0FBSyxNQUFNO29CQUNQLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO29CQUNsQixNQUFNO2dCQUNWO29CQUNLLElBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDeEMsQ0FBQztZQUVELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLFFBQVEsWUFBWSxRQUFRLEVBQUUsRUFBRSxDQUFDO1FBQzdFLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEQsQ0FBQztJQUNMLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLGFBQXFCO1FBQ3RELElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUM3QixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRTFDLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLDhCQUE4QixhQUFhLEVBQUUsRUFBRSxDQUFDO1lBQ3BGLENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQy9DLE9BQU87Z0JBQ0gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUU7Z0JBQ2hDLE9BQU8sRUFBRSxTQUFTLGFBQWEsWUFBWSxRQUFRLEVBQUU7YUFDeEQsQ0FBQztRQUNOLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEQsQ0FBQztJQUNMLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxRQUFnQixFQUFFLGFBQXFCO1FBQzNELElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUM3QixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRTFDLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLDhCQUE4QixhQUFhLEVBQUUsRUFBRSxDQUFDO1lBQ3BGLENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDUixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsYUFBYSxhQUFhLG9CQUFvQixFQUFFLENBQUM7WUFDckYsQ0FBQztZQUVELElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsYUFBYSxjQUFjLFFBQVEsRUFBRSxFQUFFLENBQUM7UUFDeEYsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztJQUVELGNBQWMsQ0FBQyxRQUFnQixFQUFFLGFBQXFCO1FBQ2xELElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUM3QixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRTFDLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLDhCQUE4QixhQUFhLEVBQUUsRUFBRSxDQUFDO1lBQ3BGLENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQ2xELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDWCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsYUFBYSxhQUFhLG9CQUFvQixFQUFFLENBQUM7WUFDckYsQ0FBQztZQUVELHlDQUF5QztZQUN6QyxJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzlCLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUM7WUFFbEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFNBQVMsYUFBYSxZQUFZLFFBQVEsRUFBRSxFQUFFLENBQUM7UUFDcEYsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztJQUVELGdCQUFnQixDQUFDLFFBQWdCLEVBQUUsYUFBc0I7O1FBQ3JELElBQUksQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLFlBQVksRUFBRSxDQUFDO1lBQzdCLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFFMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25ELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQztZQUNqRSxDQUFDO1lBRUQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNqQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFOztvQkFBQyxPQUFBLENBQUM7d0JBQzNDLElBQUksRUFBRSxDQUFBLE1BQUEsQ0FBQyxDQUFDLFdBQVcsMENBQUUsSUFBSSxLQUFJLFNBQVM7d0JBQ3RDLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTztxQkFDckIsQ0FBQyxDQUFBO2lCQUFBLENBQUMsQ0FBQztnQkFDSixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDcEUsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsbUJBQ3pDLE9BQUEsQ0FBQSxNQUFBLENBQUMsQ0FBQyxXQUFXLDBDQUFFLElBQUksTUFBSyxhQUFhLEtBQUksTUFBQSxNQUFBLENBQUMsQ0FBQyxXQUFXLDBDQUFFLElBQUksMENBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxDQUFBLENBQUEsRUFBQSxDQUN4RixDQUFDO1lBRUYsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNSLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxhQUFhLGFBQWEsb0JBQW9CLEVBQUUsQ0FBQztZQUNyRixDQUFDO1lBRUQsT0FBTztnQkFDSCxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUU7b0JBQ0YsUUFBUTtvQkFDUixhQUFhLEVBQUUsTUFBQSxJQUFJLENBQUMsV0FBVywwQ0FBRSxJQUFJO29CQUNyQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87aUJBQ3hCO2FBQ0osQ0FBQztRQUNOLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEQsQ0FBQztJQUNMLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxRQUFnQixFQUFFLGFBQXFCLEVBQUUsUUFBZ0IsRUFBRSxLQUFVO1FBQ3RGLElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUM3QixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRTFDLE1BQU0sY0FBYyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzNELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLDhCQUE4QixhQUFhLEVBQUUsRUFBRSxDQUFDO1lBQ3BGLENBQUM7WUFFRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQy9DLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDUixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsYUFBYSxhQUFhLG9CQUFvQixFQUFFLENBQUM7WUFDckYsQ0FBQztZQUVELDBEQUEwRDtZQUMxRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxDQUFDLFFBQVEsS0FBSyxhQUFhLElBQUksUUFBUSxLQUFLLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZGLG1DQUFtQztnQkFDbkMsSUFBSSxDQUFDO29CQUNELEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQVEsRUFBRSxLQUFVLEVBQUUsRUFBRTt3QkFDcEQsSUFBSSxDQUFDLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQzs0QkFDZixJQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDO3dCQUNwQyxDQUFDO29CQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUNQLENBQUM7Z0JBQUMsV0FBTSxDQUFDO29CQUNMLHNCQUFzQjtnQkFDMUIsQ0FBQztnQkFDRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUscUJBQXFCLGFBQWEsSUFBSSxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3hGLENBQUM7WUFFRCw2QkFBNkI7WUFDNUIsSUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEtBQUssQ0FBQztZQUNoQyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxhQUFhLElBQUksUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUMxRSxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsU0FBaUIsRUFBRSxVQUFtQixFQUFFLElBQWE7UUFDbkUsSUFBSSxDQUFDO1lBQ0QsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sS0FBSyxHQUFHLFlBQVksRUFBRSxDQUFDO1lBRTdCLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDM0IsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBUSxFQUFFLE1BQVcsRUFBRSxFQUFFOztvQkFDekQsSUFBSSxHQUFHLEVBQUUsQ0FBQzt3QkFDTixPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSwwQkFBMEIsR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ25GLE9BQU87b0JBQ1gsQ0FBQztvQkFDRCxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUEsTUFBQSxNQUFNLENBQUMsV0FBVywwQ0FBRSxJQUFJLE1BQUssUUFBUSxFQUFFLENBQUM7d0JBQ25ELE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLENBQUMsQ0FBQzt3QkFDNUQsT0FBTztvQkFDWCxDQUFDO29CQUVELE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3BDLElBQUksSUFBSSxFQUFFLENBQUM7d0JBQ1AsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7b0JBQ3JCLENBQUM7b0JBRUQsY0FBYztvQkFDZCxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUM7b0JBQ25CLElBQUksVUFBVSxFQUFFLENBQUM7d0JBQ2IsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFDO3dCQUNwRCxJQUFJLEtBQUs7NEJBQUUsTUFBTSxHQUFHLEtBQUssQ0FBQztvQkFDOUIsQ0FBQztvQkFFRCxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN0QixPQUFPLENBQUM7d0JBQ0osT0FBTyxFQUFFLElBQUk7d0JBQ2IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUU7d0JBQzFDLE9BQU8sRUFBRSx3QkFBd0IsSUFBSSxDQUFDLElBQUksRUFBRTtxQkFDL0MsQ0FBQyxDQUFDO2dCQUNQLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQsb0JBQW9CLENBQUMsUUFBZ0IsRUFBRSxVQUFrQjtRQUNyRCxJQUFJLENBQUM7WUFDRCxNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUM3QixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQzFDLE9BQU87Z0JBQ0gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFO29CQUNGLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTtvQkFDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJO29CQUNuQixJQUFJLEVBQUUsVUFBVTtpQkFDbkI7Z0JBQ0QsT0FBTyxFQUFFLHVDQUF1QyxJQUFJLENBQUMsSUFBSSxFQUFFO2FBQzlELENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQsNEJBQTRCO0lBRTVCLGlCQUFpQixDQUFDLFFBQWdCOztRQUM5QixJQUFJLENBQUM7WUFDRCxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsTUFBTSxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUM7WUFDN0IsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUUxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ1osT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHNDQUFzQyxFQUFFLENBQUM7WUFDN0UsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3JELElBQUksRUFBRSxDQUFBLElBQUksYUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxJQUFJLEtBQUksU0FBUztnQkFDN0IsUUFBUSxFQUFFLENBQUEsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLFFBQVEsS0FBSSxDQUFDO2dCQUM3QixLQUFLLEVBQUUsQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsS0FBSyxLQUFJLENBQUM7Z0JBQ3ZCLFFBQVEsRUFBRSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsUUFBUTthQUMzQixDQUFDLENBQUMsQ0FBQztZQUVKLE9BQU87Z0JBQ0gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFO29CQUNGLFFBQVE7b0JBQ1IsV0FBVyxFQUFFLENBQUEsTUFBQSxRQUFRLENBQUMsV0FBVywwQ0FBRSxJQUFJLEtBQUksSUFBSTtvQkFDL0MsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVLElBQUksS0FBSztvQkFDeEMsS0FBSztpQkFDUjthQUNKLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQsYUFBYSxDQUFDLFFBQWdCLEVBQUUsUUFBaUI7UUFDN0MsSUFBSSxDQUFDO1lBQ0QsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sS0FBSyxHQUFHLFlBQVksRUFBRSxDQUFDO1lBQzdCLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFFMUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDakQsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNaLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxzQ0FBc0MsRUFBRSxDQUFDO1lBQzdFLENBQUM7WUFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNYLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNKLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwQixDQUFDO1lBRUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLG9CQUFvQixRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFDN0YsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztJQUVELGFBQWEsQ0FBQyxRQUFnQjtRQUMxQixJQUFJLENBQUM7WUFDRCxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsTUFBTSxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUM7WUFDN0IsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztZQUUxQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ1osT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLHNDQUFzQyxFQUFFLENBQUM7WUFDN0UsQ0FBQztZQUVELFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQztRQUMzRCxDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQsb0JBQW9CLENBQUMsUUFBZ0IsRUFBRSxXQUFvQixFQUFFLFVBQW9CO1FBQzdFLElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUM3QixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRTFDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDWixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsc0NBQXNDLEVBQUUsQ0FBQztZQUM3RSxDQUFDO1lBRUQsTUFBTSxPQUFPLEdBQWEsRUFBRSxDQUFDO1lBRTdCLElBQUksV0FBVyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUM1QixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsSUFBSSxNQUFLLFdBQVcsQ0FBQyxDQUFDO2dCQUN0RSxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNQLFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO29CQUM1QixPQUFPLENBQUMsSUFBSSxDQUFDLGVBQWUsV0FBVyxFQUFFLENBQUMsQ0FBQztnQkFDL0MsQ0FBQztxQkFBTSxDQUFDO29CQUNKLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxtQkFBbUIsV0FBVyxFQUFFLEVBQUUsQ0FBQztnQkFDdkUsQ0FBQztZQUNMLENBQUM7WUFFRCxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDM0IsUUFBUSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7Z0JBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBQzdDLENBQUM7WUFFRCxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsNkJBQTZCLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQ3pGLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEQsQ0FBQztJQUNMLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBWTtRQUN0QixJQUFJLENBQUM7WUFDRCxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekIsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQztZQUN4QixNQUFNLEVBQUUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ2hELE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDaEMsT0FBTztnQkFDSCxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUUsTUFBTSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUMxQyxPQUFPLEVBQUUsaUJBQWlCO2FBQzdCLENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQsYUFBYSxDQUFDLFdBQW1CLEVBQUU7UUFDL0IsSUFBSSxDQUFDO1lBQ0QsTUFBTSxLQUFLLEdBQUcsWUFBWSxFQUFFLENBQUM7WUFDN0IsTUFBTSxNQUFNLEdBQVUsRUFBRSxDQUFDO1lBQ3pCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztZQUNuQixJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUM7WUFDeEIsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO1lBRXZCLFNBQVMsSUFBSSxDQUFDLElBQVMsRUFBRSxLQUFhOztnQkFDbEMsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxLQUFLLEdBQUcsY0FBYztvQkFBRSxjQUFjLEdBQUcsS0FBSyxDQUFDO2dCQUNuRCxJQUFJLEtBQUssR0FBRyxRQUFRO29CQUFFLE9BQU87Z0JBRTdCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7b0JBQ3hDLE1BQU0sQ0FBQyxJQUFJLENBQUM7d0JBQ1IsUUFBUSxFQUFFLFNBQVM7d0JBQ25CLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTt3QkFDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksU0FBUzt3QkFDaEMsT0FBTyxFQUFFLHFCQUFxQjt3QkFDOUIsVUFBVSxFQUFFLGtDQUFrQztxQkFDakQsQ0FBQyxDQUFDO2dCQUNQLENBQUM7Z0JBRUQsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQ2xCLGVBQWUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDMUMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7d0JBQ2pDLE1BQU0sUUFBUSxHQUFHLENBQUEsTUFBQSxJQUFJLENBQUMsV0FBVywwQ0FBRSxJQUFJLEtBQUksU0FBUyxDQUFDO3dCQUNyRCxJQUFJLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDOzRCQUM3QyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ3pCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDOzRCQUN6RCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0NBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0NBQ1IsUUFBUSxFQUFFLE9BQU87b0NBQ2pCLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTtvQ0FDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJO29DQUNuQixPQUFPLEVBQUUsR0FBRyxRQUFRLHNDQUFzQztvQ0FDMUQsVUFBVSxFQUFFLDJDQUEyQztpQ0FDMUQsQ0FBQyxDQUFDOzRCQUNQLENBQUM7d0JBQ0wsQ0FBQzt3QkFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxFQUFFLENBQUM7NEJBQ3pCLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0NBQ1IsUUFBUSxFQUFFLE1BQU07Z0NBQ2hCLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSTtnQ0FDbkIsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJO2dDQUNuQixPQUFPLEVBQUUsYUFBYSxRQUFRLGNBQWM7NkJBQy9DLENBQUMsQ0FBQzt3QkFDUCxDQUFDO29CQUNMLENBQUM7Z0JBQ0wsQ0FBQztnQkFDRCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDaEIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQ2hDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUMzQixDQUFDO2dCQUNMLENBQUM7WUFDTCxDQUFDO1lBRUQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztZQUVmLE9BQU87Z0JBQ0gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFO29CQUNGLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsS0FBSyxPQUFPLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQztvQkFDOUQsTUFBTTtvQkFDTixLQUFLLEVBQUUsRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLGNBQWMsRUFBRTtpQkFDdkY7YUFDSixDQUFDO1FBQ04sQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztJQUVELFlBQVksQ0FBQyxRQUFnQjs7UUFDekIsSUFBSSxDQUFDO1lBQ0QsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sS0FBSyxHQUFHLFlBQVksRUFBRSxDQUFDO1lBQzdCLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDMUMsTUFBTSxNQUFNLEdBQVUsRUFBRSxDQUFDO1lBRXpCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1IsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxTQUFTO29CQUMxRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsVUFBVSxFQUFFLGtDQUFrQztpQkFDakYsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNsQixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDakMsTUFBTSxRQUFRLEdBQUcsQ0FBQSxNQUFBLElBQUksQ0FBQyxXQUFXLDBDQUFFLElBQUksS0FBSSxTQUFTLENBQUM7b0JBQ3JELElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7d0JBQzdDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDO3dCQUN6RCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7NEJBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0NBQ1IsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUk7Z0NBQzNELE9BQU8sRUFBRSxHQUFHLFFBQVEsc0NBQXNDO2dDQUMxRCxVQUFVLEVBQUUsMkNBQTJDOzZCQUMxRCxDQUFDLENBQUM7d0JBQ1AsQ0FBQztvQkFDTCxDQUFDO2dCQUNMLENBQUM7WUFDTCxDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNSLFFBQVEsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJO29CQUMzRCxPQUFPLEVBQUUsK0JBQStCO29CQUN4QyxVQUFVLEVBQUUsZ0RBQWdEO2lCQUMvRCxDQUFDLENBQUM7WUFDUCxDQUFDO1lBRUQsT0FBTztnQkFDSCxPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTthQUMvRyxDQUFDO1FBQ04sQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztJQUVELGtCQUFrQixDQUFDLGFBQXNCO1FBQ3JDLElBQUksQ0FBQztZQUNELE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QixNQUFNLEtBQUssR0FBRyxZQUFZLEVBQUUsQ0FBQztZQUM3QixNQUFNLE1BQU0sR0FBVSxFQUFFLENBQUM7WUFFekIsU0FBUyxJQUFJLENBQUMsSUFBUzs7Z0JBQ25CLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNsQixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQzt3QkFDakMsTUFBTSxRQUFRLEdBQUcsQ0FBQSxNQUFBLElBQUksQ0FBQyxXQUFXLDBDQUFFLElBQUksS0FBSSxTQUFTLENBQUM7d0JBQ3JELElBQUksYUFBYSxJQUFJLFFBQVEsS0FBSyxhQUFhOzRCQUFFLFNBQVM7d0JBQzFELElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7NEJBQzdDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDOzRCQUN6RCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7Z0NBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0NBQ1IsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUk7b0NBQzNELE9BQU8sRUFBRSxHQUFHLFFBQVEsc0NBQXNDO29DQUMxRCxVQUFVLEVBQUUseUNBQXlDLElBQUksQ0FBQyxJQUFJLEdBQUc7aUNBQ3BFLENBQUMsQ0FBQzs0QkFDUCxDQUFDO3dCQUNMLENBQUM7b0JBQ0wsQ0FBQztnQkFDTCxDQUFDO2dCQUNELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUFDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFBQyxDQUFDO2dCQUFDLENBQUM7WUFDOUUsQ0FBQztZQUVELElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNaLE9BQU87Z0JBQ0gsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxhQUFhLElBQUksS0FBSyxFQUFFO2FBQ3hILENBQUM7UUFDTixDQUFDO1FBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0lBRUQsYUFBYTtRQUNULElBQUksQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLFlBQVksRUFBRSxDQUFDO1lBQzdCLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztZQUNuQixJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUM7WUFDeEIsSUFBSSxRQUFRLEdBQUcsQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sZUFBZSxHQUEyQixFQUFFLENBQUM7WUFFbkQsU0FBUyxJQUFJLENBQUMsSUFBUyxFQUFFLEtBQWE7O2dCQUNsQyxVQUFVLEVBQUUsQ0FBQztnQkFDYixJQUFJLEtBQUssR0FBRyxRQUFRO29CQUFFLFFBQVEsR0FBRyxLQUFLLENBQUM7Z0JBQ3ZDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNsQixlQUFlLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQzFDLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO3dCQUNqQyxNQUFNLFFBQVEsR0FBRyxDQUFBLE1BQUEsSUFBSSxDQUFDLFdBQVcsMENBQUUsSUFBSSxLQUFJLFNBQVMsQ0FBQzt3QkFDckQsZUFBZSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDckUsQ0FBQztnQkFDTCxDQUFDO2dCQUNELElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUFDLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUFDLENBQUM7Z0JBQUMsQ0FBQztZQUN6RixDQUFDO1lBRUQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNmLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLGVBQWUsRUFBRSxFQUFFLENBQUM7UUFDdEgsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztJQUVELGdCQUFnQjtRQUNaLElBQUksQ0FBQztZQUNELE1BQU0sS0FBSyxHQUFHLFlBQVksRUFBRSxDQUFDO1lBQzdCLE1BQU0sS0FBSyxHQUFVLEVBQUUsQ0FBQztZQUV4QixTQUFTLElBQUksQ0FBQyxJQUFTOztnQkFDbkIsTUFBTSxLQUFLLEdBQVE7b0JBQ2YsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO29CQUNyRCxNQUFNLEVBQUUsQ0FBQSxNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLElBQUksS0FBSSxJQUFJO2lCQUNwQyxDQUFDO2dCQUNGLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO29CQUNsQixLQUFLLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUU7O3dCQUFDLE9BQUEsQ0FBQzs0QkFDaEQsSUFBSSxFQUFFLENBQUEsTUFBQSxDQUFDLENBQUMsV0FBVywwQ0FBRSxJQUFJLEtBQUksU0FBUyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTzt5QkFDN0QsQ0FBQyxDQUFBO3FCQUFBLENBQUMsQ0FBQztnQkFDUixDQUFDO2dCQUNELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLEtBQUksTUFBQSxJQUFJLENBQUMsV0FBVyxvREFBSSxDQUFBLENBQUM7Z0JBQ2xELElBQUksR0FBRztvQkFBRSxLQUFLLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDM0QsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbEIsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQUMsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUFDLENBQUM7Z0JBQUMsQ0FBQztZQUM5RSxDQUFDO1lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ1osT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1FBQzlGLENBQUM7UUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1lBQ2xCLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDcEQsQ0FBQztJQUNMLENBQUM7Q0FDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xyXG5tb2R1bGUucGF0aHMucHVzaChqb2luKEVkaXRvci5BcHAucGF0aCwgJ25vZGVfbW9kdWxlcycpKTtcclxuXHJcbi8qKiBDb21wb25lbnRzIHRoYXQgcmVxdWlyZSBjYy5VSVRyYW5zZm9ybSBhcyBhIGNvbXBhbmlvbiAqL1xyXG5jb25zdCBVSV9UUkFOU0ZPUk1fREVQRU5ERU5UUyA9IFtcclxuICAgICdTcHJpdGUnLCAnTGFiZWwnLCAnQnV0dG9uJywgJ0xheW91dCcsICdTY3JvbGxWaWV3JywgJ1dpZGdldCcsXHJcbiAgICAnUmljaFRleHQnLCAnRWRpdEJveCcsICdQcm9ncmVzc0JhcicsICdUb2dnbGUnLCAnU2xpZGVyJyxcclxuICAgICdQYWdlVmlldycsICdHcmFwaGljcycsICdNYXNrJywgJ0Jsb2NrSW5wdXRFdmVudHMnLFxyXG5dO1xyXG5cclxuLyoqXHJcbiAqIFNjZW5lIHNjcmlwdCAtIHRoZSBPTkxZIHBsYWNlIHdpdGggYWNjZXNzIHRvIGNjLiogZW5naW5lIEFQSXMuXHJcbiAqIENhbGxlZCB2aWE6IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0JywgeyBuYW1lLCBtZXRob2QsIGFyZ3MgfSlcclxuICovXHJcblxyXG4vLyA9PT0gSGVscGVycyA9PT1cclxuXHJcbmZ1bmN0aW9uIGZpbmROb2RlQnlVdWlkRGVlcChyb290OiBhbnksIHV1aWQ6IHN0cmluZyk6IGFueSB7XHJcbiAgICBpZiAocm9vdC51dWlkID09PSB1dWlkKSByZXR1cm4gcm9vdDtcclxuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygcm9vdC5jaGlsZHJlbiB8fCBbXSkge1xyXG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZE5vZGVCeVV1aWREZWVwKGNoaWxkLCB1dWlkKTtcclxuICAgICAgICBpZiAoZm91bmQpIHJldHVybiBmb3VuZDtcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRBY3RpdmVTY2VuZSgpOiBhbnkge1xyXG4gICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcclxuICAgIHJldHVybiBkaXJlY3Rvci5nZXRTY2VuZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXF1aXJlU2NlbmUoKTogYW55IHtcclxuICAgIGNvbnN0IHNjZW5lID0gZ2V0QWN0aXZlU2NlbmUoKTtcclxuICAgIGlmICghc2NlbmUpIHRocm93IG5ldyBFcnJvcignTm8gYWN0aXZlIHNjZW5lJyk7XHJcbiAgICByZXR1cm4gc2NlbmU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlcXVpcmVOb2RlKHNjZW5lOiBhbnksIHV1aWQ6IHN0cmluZyk6IGFueSB7XHJcbiAgICBjb25zdCBub2RlID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCB1dWlkKTtcclxuICAgIGlmICghbm9kZSkgdGhyb3cgbmV3IEVycm9yKGBOb2RlIG5vdCBmb3VuZDogJHt1dWlkfWApO1xyXG4gICAgcmV0dXJuIG5vZGU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vZGVUb0luZm8obm9kZTogYW55KTogYW55IHtcclxuICAgIGNvbnN0IHBvcyA9IG5vZGUucG9zaXRpb24gfHwgbm9kZS5nZXRQb3NpdGlvbj8uKCk7XHJcbiAgICBjb25zdCByb3QgPSBub2RlLmV1bGVyQW5nbGVzIHx8IG5vZGUuZ2V0Um90YXRpb24/LigpO1xyXG4gICAgY29uc3Qgc2NsID0gbm9kZS5zY2FsZSB8fCBub2RlLmdldFNjYWxlPy4oKTtcclxuXHJcbiAgICBjb25zdCBpbmZvOiBhbnkgPSB7XHJcbiAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAocG9zKSBpbmZvLnBvc2l0aW9uID0geyB4OiBwb3MueCwgeTogcG9zLnksIHo6IHBvcy56IH07XHJcbiAgICBpZiAocm90KSBpbmZvLnJvdGF0aW9uID0geyB4OiByb3QueCwgeTogcm90LnksIHo6IHJvdC56IH07XHJcbiAgICBpZiAoc2NsKSBpbmZvLnNjYWxlID0geyB4OiBzY2wueCwgeTogc2NsLnksIHo6IHNjbC56IH07XHJcblxyXG4gICAgaWYgKG5vZGUucGFyZW50KSBpbmZvLnBhcmVudCA9IG5vZGUucGFyZW50LnV1aWQ7XHJcblxyXG4gICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICBpbmZvLmNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbi5tYXAoKGM6IGFueSkgPT4gYy51dWlkKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobm9kZS5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgaW5mby5jb21wb25lbnRzID0gbm9kZS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICB0eXBlOiBjLmNvbnN0cnVjdG9yPy5uYW1lIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgZW5hYmxlZDogYy5lbmFibGVkLFxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaW5mbztcclxufVxyXG5cclxuZnVuY3Rpb24gYnVpbGRIaWVyYXJjaHkobm9kZTogYW55LCBpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbiwgZGVwdGg6IG51bWJlciwgbWF4RGVwdGg6IG51bWJlcik6IGFueSB7XHJcbiAgICBjb25zdCByZXN1bHQ6IGFueSA9IHtcclxuICAgICAgICB1dWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChpbmNsdWRlQ29tcG9uZW50cyAmJiBub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICByZXN1bHQuY29tcG9uZW50cyA9IG5vZGUuY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgdHlwZTogYy5jb25zdHJ1Y3Rvcj8ubmFtZSB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgIGVuYWJsZWQ6IGMuZW5hYmxlZCxcclxuICAgICAgICB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGRlcHRoIDwgbWF4RGVwdGggJiYgbm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXN1bHQuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT5cclxuICAgICAgICAgICAgYnVpbGRIaWVyYXJjaHkoY2hpbGQsIGluY2x1ZGVDb21wb25lbnRzLCBkZXB0aCArIDEsIG1heERlcHRoKVxyXG4gICAgICAgICk7XHJcbiAgICB9IGVsc2UgaWYgKG5vZGUuY2hpbGRyZW4gJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcmVzdWx0LmNoaWxkQ291bnQgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG4vLyA9PT0gRXhwb3J0ZWQgTWV0aG9kcyA9PT1cclxuXHJcbmV4cG9ydCBjb25zdCBtZXRob2RzOiB7IFtrZXk6IHN0cmluZ106ICguLi5hcmdzOiBhbnkpID0+IGFueSB9ID0ge1xyXG5cclxuICAgIGdldEN1cnJlbnRTY2VuZUluZm8oKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogc2NlbmUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBzY2VuZS51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVDb3VudDogc2NlbmUuY2hpbGRyZW4gPyBzY2VuZS5jaGlsZHJlbi5sZW5ndGggOiAwLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZ2V0U2NlbmVIaWVyYXJjaHkoaW5jbHVkZUNvbXBvbmVudHM6IGJvb2xlYW4gPSBmYWxzZSwgbWF4RGVwdGg6IG51bWJlciA9IDMpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSBidWlsZEhpZXJhcmNoeShzY2VuZSwgaW5jbHVkZUNvbXBvbmVudHMsIDAsIG1heERlcHRoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaGllcmFyY2h5IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGdldE5vZGVJbmZvKG5vZGVVdWlkOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbm9kZVRvSW5mbyhub2RlKSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBnZXRBbGxOb2RlcygpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlczogYW55W10gPSBbXTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gY29sbGVjdChub2RlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIG5vZGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGUucGFyZW50Py51dWlkLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xsZWN0KGNoaWxkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29sbGVjdChzY2VuZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgdG90YWxOb2Rlczogbm9kZXMubGVuZ3RoLCBub2RlcyB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGZpbmROb2RlQnlOYW1lKG5hbWU6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHNlYXJjaChub2RlOiBhbnksIHBhdGg6IHN0cmluZykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFBhdGggPSBwYXRoID8gYCR7cGF0aH0vJHtub2RlLm5hbWV9YCA6IG5vZGUubmFtZTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLm5hbWUgPT09IG5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyB1dWlkOiBub2RlLnV1aWQsIG5hbWU6IG5vZGUubmFtZSwgcGF0aDogY3VycmVudFBhdGggfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2goY2hpbGQsIGN1cnJlbnRQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2VhcmNoKHNjZW5lLCAnJyk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm8gbm9kZSBmb3VuZCB3aXRoIG5hbWU6ICR7bmFtZX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0cyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBzZXROb2RlUHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAncG9zaXRpb24nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdiA9IHZhbHVlIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0UG9zaXRpb24odi54ID8/IDAsIHYueSA/PyAwLCB2LnogPz8gMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlICdyb3RhdGlvbic6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gdmFsdWUgfHwge307XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuc2V0Um90YXRpb25Gcm9tRXVsZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRSb3RhdGlvbkZyb21FdWxlcih2LnggPz8gMCwgdi55ID8/IDAsIHYueiA/PyAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlICdzY2FsZSc6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gdmFsdWUgfHwge307XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRTY2FsZSh2LnggPz8gMSwgdi55ID8/IDEsIHYueiA/PyAxKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgJ2FjdGl2ZSc6XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5hY3RpdmUgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ25hbWUnOlxyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUubmFtZSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAobm9kZSBhcyBhbnkpW3Byb3BlcnR5XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgU2V0ICR7cHJvcGVydHl9IG9uIG5vZGUgJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGFkZENvbXBvbmVudFRvTm9kZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBjYy5qcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgaWYgKCFDb21wb25lbnRDbGFzcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IGNsYXNzIG5vdCBmb3VuZDogJHtjb21wb25lbnRUeXBlfWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcCA9IG5vZGUuYWRkQ29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IGNvbXBvbmVudElkOiBjb21wLnV1aWQgfSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBZGRlZCAke2NvbXBvbmVudFR5cGV9IHRvIG5vZGUgJHtub2RlVXVpZH1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICByZW1vdmVDb21wb25lbnRGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBjYy5qcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgaWYgKCFDb21wb25lbnRDbGFzcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IGNsYXNzIG5vdCBmb3VuZDogJHtjb21wb25lbnRUeXBlfWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcCA9IG5vZGUuZ2V0Q29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcclxuICAgICAgICAgICAgaWYgKCFjb21wKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbm9kZS5yZW1vdmVDb21wb25lbnQoY29tcCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBSZW1vdmVkICR7Y29tcG9uZW50VHlwZX0gZnJvbSBub2RlICR7bm9kZVV1aWR9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICByZXNldENvbXBvbmVudChub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBjYy5qcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgaWYgKCFDb21wb25lbnRDbGFzcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IGNsYXNzIG5vdCBmb3VuZDogJHtjb21wb25lbnRUeXBlfWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgb2xkQ29tcCA9IG5vZGUuZ2V0Q29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcclxuICAgICAgICAgICAgaWYgKCFvbGRDb21wKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gUmVtb3ZlIGFuZCByZS1hZGQgdG8gcmVzZXQgdG8gZGVmYXVsdHNcclxuICAgICAgICAgICAgbm9kZS5yZW1vdmVDb21wb25lbnQob2xkQ29tcCk7XHJcbiAgICAgICAgICAgIG5vZGUuYWRkQ29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBSZXNldCAke2NvbXBvbmVudFR5cGV9IG9uIG5vZGUgJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGdldENvbXBvbmVudEluZm8obm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZT86IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFub2RlLmNvbXBvbmVudHMgfHwgbm9kZS5jb21wb25lbnRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBub2RlVXVpZCwgY29tcG9uZW50czogW10gfSB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudFR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVzID0gbm9kZS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGMuY29uc3RydWN0b3I/Lm5hbWUgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGMuZW5hYmxlZCxcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbm9kZVV1aWQsIGNvbXBvbmVudHM6IHR5cGVzIH0gfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcCA9IG5vZGUuY29tcG9uZW50cy5maW5kKChjOiBhbnkpID0+XHJcbiAgICAgICAgICAgICAgICBjLmNvbnN0cnVjdG9yPy5uYW1lID09PSBjb21wb25lbnRUeXBlIHx8IGMuY29uc3RydWN0b3I/Lm5hbWU/LmluY2x1ZGVzKGNvbXBvbmVudFR5cGUpXHJcbiAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wLmNvbnN0cnVjdG9yPy5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZCxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHNldENvbXBvbmVudFByb3BlcnR5KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGNjLmpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2xhc3Mgbm90IGZvdW5kOiAke2NvbXBvbmVudFR5cGV9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wID0gbm9kZS5nZXRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xyXG4gICAgICAgICAgICBpZiAoIWNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBhc3NldC10eXBlIHByb3BlcnRpZXMgKGFzeW5jIGxvYWQpXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIChwcm9wZXJ0eSA9PT0gJ3Nwcml0ZUZyYW1lJyB8fCBwcm9wZXJ0eSA9PT0gJ21hdGVyaWFsJykpIHtcclxuICAgICAgICAgICAgICAgIC8vIEZpcmUtYW5kLWZvcmdldCBhc3luYyBhc3NldCBsb2FkXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNjLmFzc2V0TWFuYWdlci5sb2FkQW55KHZhbHVlLCAoZXJyOiBhbnksIGFzc2V0OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIgJiYgYXNzZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjb21wIGFzIGFueSlbcHJvcGVydHldID0gYXNzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIElnbm9yZSBhc3luYyBlcnJvcnNcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBMb2FkaW5nIGFzc2V0IGZvciAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBEaXJlY3QgcHJvcGVydHkgYXNzaWdubWVudFxyXG4gICAgICAgICAgICAoY29tcCBhcyBhbnkpW3Byb3BlcnR5XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgU2V0ICR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGluc3RhbnRpYXRlUHJlZmFiKGFzc2V0VXVpZDogc3RyaW5nLCBwYXJlbnRVdWlkPzogc3RyaW5nLCBuYW1lPzogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjYy5hc3NldE1hbmFnZXIubG9hZEFueShhc3NldFV1aWQsIChlcnI6IGFueSwgcHJlZmFiOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBGYWlsZWQgdG8gbG9hZCBwcmVmYWI6ICR7ZXJyLm1lc3NhZ2UgfHwgZXJyfWAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmVmYWIgfHwgcHJlZmFiLmNvbnN0cnVjdG9yPy5uYW1lICE9PSAnUHJlZmFiJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnQXNzZXQgaXMgbm90IGEgUHJlZmFiJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGNjLmluc3RhbnRpYXRlKHByZWZhYik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5uYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbmQgcGFyZW50XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhcmVudCA9IHNjZW5lO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnRVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCBwYXJlbnRVdWlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZvdW5kKSBwYXJlbnQgPSBmb3VuZDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5hZGRDaGlsZChub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiBub2RlLnV1aWQsIG5hbWU6IG5vZGUubmFtZSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUHJlZmFiIGluc3RhbnRpYXRlZDogJHtub2RlLm5hbWV9YCxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgY3JlYXRlUHJlZmFiRnJvbU5vZGUobm9kZVV1aWQ6IHN0cmluZywgcHJlZmFiUGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcmVmYWJQYXRoLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQcmVmYWIgY3JlYXRpb24gaW5pdGlhdGVkIGZvciBub2RlOiAke25vZGUubmFtZX1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyA9PT0gQW5pbWF0aW9uIE1ldGhvZHMgPT09XHJcblxyXG4gICAgZ2V0QW5pbWF0aW9uQ2xpcHMobm9kZVV1aWQ6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhbmltQ29tcCA9IG5vZGUuZ2V0Q29tcG9uZW50KGNjLkFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIGlmICghYW5pbUNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIEFuaW1hdGlvbiBjb21wb25lbnQgZm91bmQgb24gbm9kZScgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY2xpcHMgPSAoYW5pbUNvbXAuY2xpcHMgfHwgW10pLm1hcCgoY2xpcDogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogY2xpcD8ubmFtZSB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogY2xpcD8uZHVyYXRpb24gfHwgMCxcclxuICAgICAgICAgICAgICAgIHNwZWVkOiBjbGlwPy5zcGVlZCB8fCAxLFxyXG4gICAgICAgICAgICAgICAgd3JhcE1vZGU6IGNsaXA/LndyYXBNb2RlLFxyXG4gICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2xpcDogYW5pbUNvbXAuZGVmYXVsdENsaXA/Lm5hbWUgfHwgbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBwbGF5T25Mb2FkOiBhbmltQ29tcC5wbGF5T25Mb2FkIHx8IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsaXBzLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgcGxheUFuaW1hdGlvbihub2RlVXVpZDogc3RyaW5nLCBjbGlwTmFtZT86IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhbmltQ29tcCA9IG5vZGUuZ2V0Q29tcG9uZW50KGNjLkFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIGlmICghYW5pbUNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIEFuaW1hdGlvbiBjb21wb25lbnQgZm91bmQgb24gbm9kZScgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGNsaXBOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBhbmltQ29tcC5wbGF5KGNsaXBOYW1lKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGFuaW1Db21wLnBsYXkoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYEFuaW1hdGlvbiBwbGF5aW5nJHtjbGlwTmFtZSA/IGA6ICR7Y2xpcE5hbWV9YCA6ICcnfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgc3RvcEFuaW1hdGlvbihub2RlVXVpZDogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFuaW1Db21wID0gbm9kZS5nZXRDb21wb25lbnQoY2MuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKCFhbmltQ29tcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQW5pbWF0aW9uIGNvbXBvbmVudCBmb3VuZCBvbiBub2RlJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhbmltQ29tcC5zdG9wKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdBbmltYXRpb24gc3RvcHBlZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgc2V0QW5pbWF0aW9uUHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgZGVmYXVsdENsaXA/OiBzdHJpbmcsIHBsYXlPbkxvYWQ/OiBib29sZWFuKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFuaW1Db21wID0gbm9kZS5nZXRDb21wb25lbnQoY2MuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKCFhbmltQ29tcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQW5pbWF0aW9uIGNvbXBvbmVudCBmb3VuZCBvbiBub2RlJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VkOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRlZmF1bHRDbGlwICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNsaXAgPSBhbmltQ29tcC5jbGlwcy5maW5kKChjOiBhbnkpID0+IGM/Lm5hbWUgPT09IGRlZmF1bHRDbGlwKTtcclxuICAgICAgICAgICAgICAgIGlmIChjbGlwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYW5pbUNvbXAuZGVmYXVsdENsaXAgPSBjbGlwO1xyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChgZGVmYXVsdENsaXA9JHtkZWZhdWx0Q2xpcH1gKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ2xpcCBub3QgZm91bmQ6ICR7ZGVmYXVsdENsaXB9YCB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocGxheU9uTG9hZCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBhbmltQ29tcC5wbGF5T25Mb2FkID0gcGxheU9uTG9hZDtcclxuICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChgcGxheU9uTG9hZD0ke3BsYXlPbkxvYWR9YCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBBbmltYXRpb24gcHJvcGVydGllcyBzZXQ6ICR7Y2hhbmdlZC5qb2luKCcsICcpfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZXhlY3V0ZVNjcmlwdChjb2RlOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IGNjO1xyXG4gICAgICAgICAgICBjb25zdCBmbiA9IG5ldyBGdW5jdGlvbignY2MnLCAnZGlyZWN0b3InLCBjb2RlKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZm4oY2MsIGRpcmVjdG9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHQgIT09IHVuZGVmaW5lZCA/IHJlc3VsdCA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnU2NyaXB0IGV4ZWN1dGVkJyxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgdmFsaWRhdGVTY2VuZShtYXhEZXB0aDogbnVtYmVyID0gMTApIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBpc3N1ZXM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIGxldCB0b3RhbE5vZGVzID0gMDtcclxuICAgICAgICAgICAgbGV0IHRvdGFsQ29tcG9uZW50cyA9IDA7XHJcbiAgICAgICAgICAgIGxldCBhY3R1YWxNYXhEZXB0aCA9IDA7XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiB3YWxrKG5vZGU6IGFueSwgZGVwdGg6IG51bWJlcikge1xyXG4gICAgICAgICAgICAgICAgdG90YWxOb2RlcysrO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlcHRoID4gYWN0dWFsTWF4RGVwdGgpIGFjdHVhbE1heERlcHRoID0gZGVwdGg7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGVwdGggPiBtYXhEZXB0aCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghbm9kZS5uYW1lIHx8IG5vZGUubmFtZS50cmltKCkgPT09ICcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eTogJ3dhcm5pbmcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlTmFtZTogbm9kZS5uYW1lIHx8ICcoZW1wdHkpJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ05vZGUgaGFzIGVtcHR5IG5hbWUnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uOiAnR2l2ZSB0aGUgbm9kZSBhIGRlc2NyaXB0aXZlIG5hbWUnLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbENvbXBvbmVudHMgKz0gbm9kZS5jb21wb25lbnRzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2Ygbm9kZS5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVOYW1lID0gY29tcC5jb25zdHJ1Y3Rvcj8ubmFtZSB8fCAndW5rbm93bic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChVSV9UUkFOU0ZPUk1fREVQRU5ERU5UUy5pbmNsdWRlcyh0eXBlTmFtZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc1VJVHJhbnNmb3JtID0gbm9kZS5nZXRDb21wb25lbnQoY2MuVUlUcmFuc2Zvcm0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNVSVRyYW5zZm9ybSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V2ZXJpdHk6ICdlcnJvcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGAke3R5cGVOYW1lfSByZXF1aXJlcyBVSVRyYW5zZm9ybSBidXQgbm9uZSBmb3VuZGAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb246IGBBZGQgY2MuVUlUcmFuc2Zvcm0gY29tcG9uZW50IHRvIHRoaXMgbm9kZWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXAuZW5hYmxlZCA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eTogJ2luZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICR7dHlwZU5hbWV9IGlzIGRpc2FibGVkYCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FsayhjaGlsZCwgZGVwdGggKyAxKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHdhbGsoc2NlbmUsIDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsaWQ6IGlzc3Vlcy5maWx0ZXIoaSA9PiBpLnNldmVyaXR5ID09PSAnZXJyb3InKS5sZW5ndGggPT09IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNzdWVzLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRzOiB7IHRvdGFsTm9kZXMsIHRvdGFsQ29tcG9uZW50cywgdG90YWxSZWZlcmVuY2VzOiAwLCBtYXhEZXB0aDogYWN0dWFsTWF4RGVwdGggfSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHZhbGlkYXRlTm9kZShub2RlVXVpZDogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgY29uc3QgaXNzdWVzOiBhbnlbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFub2RlLm5hbWUgfHwgbm9kZS5uYW1lLnRyaW0oKSA9PT0gJycpIHtcclxuICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBzZXZlcml0eTogJ3dhcm5pbmcnLCBub2RlVXVpZDogbm9kZS51dWlkLCBub2RlTmFtZTogbm9kZS5uYW1lIHx8ICcoZW1wdHkpJyxcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnTm9kZSBoYXMgZW1wdHkgbmFtZScsIHN1Z2dlc3Rpb246ICdHaXZlIHRoZSBub2RlIGEgZGVzY3JpcHRpdmUgbmFtZScsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG5vZGUuY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIG5vZGUuY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVOYW1lID0gY29tcC5jb25zdHJ1Y3Rvcj8ubmFtZSB8fCAndW5rbm93bic7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKFVJX1RSQU5TRk9STV9ERVBFTkRFTlRTLmluY2x1ZGVzKHR5cGVOYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYXNVSVRyYW5zZm9ybSA9IG5vZGUuZ2V0Q29tcG9uZW50KGNjLlVJVHJhbnNmb3JtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNVSVRyYW5zZm9ybSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldmVyaXR5OiAnZXJyb3InLCBub2RlVXVpZDogbm9kZS51dWlkLCBub2RlTmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGAke3R5cGVOYW1lfSByZXF1aXJlcyBVSVRyYW5zZm9ybSBidXQgbm9uZSBmb3VuZGAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdGlvbjogYEFkZCBjYy5VSVRyYW5zZm9ybSBjb21wb25lbnQgdG8gdGhpcyBub2RlYCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIW5vZGUucGFyZW50ICYmIG5vZGUgIT09IHNjZW5lKSB7XHJcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V2ZXJpdHk6ICdlcnJvcicsIG5vZGVVdWlkOiBub2RlLnV1aWQsIG5vZGVOYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ05vZGUgaGFzIG5vIHBhcmVudCAob3JwaGFuZWQpJyxcclxuICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uOiAnQXR0YWNoIHRoaXMgbm9kZSB0byBhIHBhcmVudCBpbiB0aGUgc2NlbmUgdHJlZScsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHZhbGlkOiBpc3N1ZXMuZmlsdGVyKGkgPT4gaS5zZXZlcml0eSA9PT0gJ2Vycm9yJykubGVuZ3RoID09PSAwLCBpc3N1ZXMsIG5vZGVJbmZvOiBub2RlVG9JbmZvKG5vZGUpIH0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHZhbGlkYXRlQ29tcG9uZW50cyhjb21wb25lbnRUeXBlPzogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBpc3N1ZXM6IGFueVtdID0gW107XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiB3YWxrKG5vZGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZU5hbWUgPSBjb21wLmNvbnN0cnVjdG9yPy5uYW1lIHx8ICd1bmtub3duJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXBvbmVudFR5cGUgJiYgdHlwZU5hbWUgIT09IGNvbXBvbmVudFR5cGUpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoVUlfVFJBTlNGT1JNX0RFUEVOREVOVFMuaW5jbHVkZXModHlwZU5hbWUpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBoYXNVSVRyYW5zZm9ybSA9IG5vZGUuZ2V0Q29tcG9uZW50KGNjLlVJVHJhbnNmb3JtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzVUlUcmFuc2Zvcm0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNldmVyaXR5OiAnZXJyb3InLCBub2RlVXVpZDogbm9kZS51dWlkLCBub2RlTmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgJHt0eXBlTmFtZX0gcmVxdWlyZXMgVUlUcmFuc2Zvcm0gYnV0IG5vbmUgZm91bmRgLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWdnZXN0aW9uOiBgQWRkIGNjLlVJVHJhbnNmb3JtIGNvbXBvbmVudCB0byBub2RlICcke25vZGUubmFtZX0nYCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7IGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikgeyB3YWxrKGNoaWxkKTsgfSB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHdhbGsoc2NlbmUpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHsgdmFsaWQ6IGlzc3Vlcy5maWx0ZXIoaSA9PiBpLnNldmVyaXR5ID09PSAnZXJyb3InKS5sZW5ndGggPT09IDAsIGlzc3VlcywgY2hlY2tlZFR5cGU6IGNvbXBvbmVudFR5cGUgfHwgJ2FsbCcgfSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZ2V0U2NlbmVTdGF0cygpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBsZXQgdG90YWxOb2RlcyA9IDA7XHJcbiAgICAgICAgICAgIGxldCB0b3RhbENvbXBvbmVudHMgPSAwO1xyXG4gICAgICAgICAgICBsZXQgbWF4RGVwdGggPSAwO1xyXG4gICAgICAgICAgICBjb25zdCBjb21wb25lbnRDb3VudHM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdhbGsobm9kZTogYW55LCBkZXB0aDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgICAgICB0b3RhbE5vZGVzKys7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGVwdGggPiBtYXhEZXB0aCkgbWF4RGVwdGggPSBkZXB0aDtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbENvbXBvbmVudHMgKz0gbm9kZS5jb21wb25lbnRzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2Ygbm9kZS5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVOYW1lID0gY29tcC5jb25zdHJ1Y3Rvcj8ubmFtZSB8fCAndW5rbm93bic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudENvdW50c1t0eXBlTmFtZV0gPSAoY29tcG9uZW50Q291bnRzW3R5cGVOYW1lXSB8fCAwKSArIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHsgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7IHdhbGsoY2hpbGQsIGRlcHRoICsgMSk7IH0gfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB3YWxrKHNjZW5lLCAwKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0b3RhbE5vZGVzLCB0b3RhbENvbXBvbmVudHMsIG1heERlcHRoLCBjb21wb25lbnREaXN0cmlidXRpb246IGNvbXBvbmVudENvdW50cyB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGdldFNjZW5lU25hcHNob3QoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZXM6IGFueVtdID0gW107XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiB3YWxrKG5vZGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZW50cnk6IGFueSA9IHtcclxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBub2RlLnV1aWQsIG5hbWU6IG5vZGUubmFtZSwgYWN0aXZlOiBub2RlLmFjdGl2ZSxcclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGUucGFyZW50Py51dWlkIHx8IG51bGwsXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgIGVudHJ5LmNvbXBvbmVudHMgPSBub2RlLmNvbXBvbmVudHMubWFwKChjOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6IGMuY29uc3RydWN0b3I/Lm5hbWUgfHwgJ3Vua25vd24nLCBlbmFibGVkOiBjLmVuYWJsZWQsXHJcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcG9zID0gbm9kZS5wb3NpdGlvbiB8fCBub2RlLmdldFBvc2l0aW9uPy4oKTtcclxuICAgICAgICAgICAgICAgIGlmIChwb3MpIGVudHJ5LnBvc2l0aW9uID0geyB4OiBwb3MueCwgeTogcG9zLnksIHo6IHBvcy56IH07XHJcbiAgICAgICAgICAgICAgICBub2Rlcy5wdXNoKGVudHJ5KTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7IGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikgeyB3YWxrKGNoaWxkKTsgfSB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHdhbGsoc2NlbmUpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IHRpbWVzdGFtcDogRGF0ZS5ub3coKSwgbm9kZUNvdW50OiBub2Rlcy5sZW5ndGgsIG5vZGVzIH0gfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn07XHJcbiJdfQ==