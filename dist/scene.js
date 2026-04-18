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
            const cc = require('cc');
            const scene = requireScene();
            const issues = [];
            let validatedNodes = 0;
            let validatedComponents = 0;
            let actualMaxDepth = 0;
            function walk(node, depth) {
                var _a;
                if (depth > actualMaxDepth)
                    actualMaxDepth = depth;
                if (depth > maxDepth)
                    return;
                validatedNodes++;
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
                    validatedComponents += node.components.length;
                    for (const comp of node.components) {
                        const typeName = ((_a = comp.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown';
                        if (UI_TRANSFORM_DEPENDENTS.includes(typeName)) {
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
                    stats: { totalNodes: validatedNodes, totalComponents: validatedComponents, totalReferences: 0, maxDepth: actualMaxDepth },
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
                    if (comp.enabled === false) {
                        issues.push({
                            severity: 'info', nodeUuid: node.uuid, nodeName: node.name,
                            message: `Component ${typeName} is disabled`,
                        });
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
            const UITransform = cc.UITransform;
            function walk(node) {
                var _a;
                if (node.components) {
                    for (const comp of node.components) {
                        const typeName = ((_a = comp.constructor) === null || _a === void 0 ? void 0 : _a.name) || 'unknown';
                        if (componentType && typeName !== componentType)
                            continue;
                        if (UI_TRANSFORM_DEPENDENTS.includes(typeName)) {
                            const hasUITransform = node.getComponent(UITransform);
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
                var _a, _b, _c, _d;
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
                const rot = node.eulerAngles || ((_c = node.getRotation) === null || _c === void 0 ? void 0 : _c.call(node));
                if (rot)
                    entry.rotation = { x: rot.x, y: rot.y, z: rot.z };
                const scl = node.scale || ((_d = node.getScale) === null || _d === void 0 ? void 0 : _d.call(node));
                if (scl)
                    entry.scale = { x: scl.x, y: scl.y, z: scl.z };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQTRCO0FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFekQsNERBQTREO0FBQzVELE1BQU0sdUJBQXVCLEdBQUc7SUFDNUIsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxRQUFRO0lBQzdELFVBQVUsRUFBRSxTQUFTLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxRQUFRO0lBQ3hELFVBQVUsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLGtCQUFrQjtDQUNyRCxDQUFDO0FBRUY7OztHQUdHO0FBRUgsa0JBQWtCO0FBRWxCLFNBQVMsa0JBQWtCLENBQUMsSUFBUyxFQUFFLElBQVk7SUFDL0MsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUk7UUFBRSxPQUFPLElBQUksQ0FBQztJQUNwQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7UUFDdEMsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksS0FBSztZQUFFLE9BQU8sS0FBSyxDQUFDO0lBQzVCLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxjQUFjO0lBQ25CLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkMsT0FBTyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDL0IsQ0FBQztBQUVELFNBQVMsWUFBWTtJQUNqQixNQUFNLEtBQUssR0FBRyxjQUFjLEVBQUUs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QUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7UUFDOUYsQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztDQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XHJcbm1vZHVsZS5wYXRocy5wdXNoKGpvaW4oRWRpdG9yLkFwcC5wYXRoLCAnbm9kZV9tb2R1bGVzJykpO1xyXG5cclxuLyoqIENvbXBvbmVudHMgdGhhdCByZXF1aXJlIGNjLlVJVHJhbnNmb3JtIGFzIGEgY29tcGFuaW9uICovXHJcbmNvbnN0IFVJX1RSQU5TRk9STV9ERVBFTkRFTlRTID0gW1xyXG4gICAgJ1Nwcml0ZScsICdMYWJlbCcsICdCdXR0b24nLCAnTGF5b3V0JywgJ1Njcm9sbFZpZXcnLCAnV2lkZ2V0JyxcclxuICAgICdSaWNoVGV4dCcsICdFZGl0Qm94JywgJ1Byb2dyZXNzQmFyJywgJ1RvZ2dsZScsICdTbGlkZXInLFxyXG4gICAgJ1BhZ2VWaWV3JywgJ0dyYXBoaWNzJywgJ01hc2snLCAnQmxvY2tJbnB1dEV2ZW50cycsXHJcbl07XHJcblxyXG4vKipcclxuICogU2NlbmUgc2NyaXB0IC0gdGhlIE9OTFkgcGxhY2Ugd2l0aCBhY2Nlc3MgdG8gY2MuKiBlbmdpbmUgQVBJcy5cclxuICogQ2FsbGVkIHZpYTogRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7IG5hbWUsIG1ldGhvZCwgYXJncyB9KVxyXG4gKi9cclxuXHJcbi8vID09PSBIZWxwZXJzID09PVxyXG5cclxuZnVuY3Rpb24gZmluZE5vZGVCeVV1aWREZWVwKHJvb3Q6IGFueSwgdXVpZDogc3RyaW5nKTogYW55IHtcclxuICAgIGlmIChyb290LnV1aWQgPT09IHV1aWQpIHJldHVybiByb290O1xyXG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiByb290LmNoaWxkcmVuIHx8IFtdKSB7XHJcbiAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kTm9kZUJ5VXVpZERlZXAoY2hpbGQsIHV1aWQpO1xyXG4gICAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGZvdW5kO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEFjdGl2ZVNjZW5lKCk6IGFueSB7XHJcbiAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xyXG4gICAgcmV0dXJuIGRpcmVjdG9yLmdldFNjZW5lKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlcXVpcmVTY2VuZSgpOiBhbnkge1xyXG4gICAgY29uc3Qgc2NlbmUgPSBnZXRBY3RpdmVTY2VuZSgpO1xyXG4gICAgaWYgKCFzY2VuZSkgdGhyb3cgbmV3IEVycm9yKCdObyBhY3RpdmUgc2NlbmUnKTtcclxuICAgIHJldHVybiBzY2VuZTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVxdWlyZU5vZGUoc2NlbmU6IGFueSwgdXVpZDogc3RyaW5nKTogYW55IHtcclxuICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIHV1aWQpO1xyXG4gICAgaWYgKCFub2RlKSB0aHJvdyBuZXcgRXJyb3IoYE5vZGUgbm90IGZvdW5kOiAke3V1aWR9YCk7XHJcbiAgICByZXR1cm4gbm9kZTtcclxufVxyXG5cclxuZnVuY3Rpb24gbm9kZVRvSW5mbyhub2RlOiBhbnkpOiBhbnkge1xyXG4gICAgY29uc3QgcG9zID0gbm9kZS5wb3NpdGlvbiB8fCBub2RlLmdldFBvc2l0aW9uPy4oKTtcclxuICAgIGNvbnN0IHJvdCA9IG5vZGUuZXVsZXJBbmdsZXMgfHwgbm9kZS5nZXRSb3RhdGlvbj8uKCk7XHJcbiAgICBjb25zdCBzY2wgPSBub2RlLnNjYWxlIHx8IG5vZGUuZ2V0U2NhbGU/LigpO1xyXG5cclxuICAgIGNvbnN0IGluZm86IGFueSA9IHtcclxuICAgICAgICB1dWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChwb3MpIGluZm8ucG9zaXRpb24gPSB7IHg6IHBvcy54LCB5OiBwb3MueSwgejogcG9zLnogfTtcclxuICAgIGlmIChyb3QpIGluZm8ucm90YXRpb24gPSB7IHg6IHJvdC54LCB5OiByb3QueSwgejogcm90LnogfTtcclxuICAgIGlmIChzY2wpIGluZm8uc2NhbGUgPSB7IHg6IHNjbC54LCB5OiBzY2wueSwgejogc2NsLnogfTtcclxuXHJcbiAgICBpZiAobm9kZS5wYXJlbnQpIGluZm8ucGFyZW50ID0gbm9kZS5wYXJlbnQudXVpZDtcclxuXHJcbiAgICBpZiAobm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgIGluZm8uY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoYzogYW55KSA9PiBjLnV1aWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICBpbmZvLmNvbXBvbmVudHMgPSBub2RlLmNvbXBvbmVudHMubWFwKChjOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgIHR5cGU6IGMuY29uc3RydWN0b3I/Lm5hbWUgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgICAgICBlbmFibGVkOiBjLmVuYWJsZWQsXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpbmZvO1xyXG59XHJcblxyXG5mdW5jdGlvbiBidWlsZEhpZXJhcmNoeShub2RlOiBhbnksIGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuLCBkZXB0aDogbnVtYmVyLCBtYXhEZXB0aDogbnVtYmVyKTogYW55IHtcclxuICAgIGNvbnN0IHJlc3VsdDogYW55ID0ge1xyXG4gICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcclxuICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKGluY2x1ZGVDb21wb25lbnRzICYmIG5vZGUuY29tcG9uZW50cykge1xyXG4gICAgICAgIHJlc3VsdC5jb21wb25lbnRzID0gbm9kZS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICB0eXBlOiBjLmNvbnN0cnVjdG9yPy5uYW1lIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgZW5hYmxlZDogYy5lbmFibGVkLFxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZGVwdGggPCBtYXhEZXB0aCAmJiBub2RlLmNoaWxkcmVuICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHJlc3VsdC5jaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PlxyXG4gICAgICAgICAgICBidWlsZEhpZXJhcmNoeShjaGlsZCwgaW5jbHVkZUNvbXBvbmVudHMsIGRlcHRoICsgMSwgbWF4RGVwdGgpXHJcbiAgICAgICAgKTtcclxuICAgIH0gZWxzZSBpZiAobm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXN1bHQuY2hpbGRDb3VudCA9IG5vZGUuY2hpbGRyZW4ubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbi8vID09PSBFeHBvcnRlZCBNZXRob2RzID09PVxyXG5cclxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFyZ3M6IGFueSkgPT4gYW55IH0gPSB7XHJcblxyXG4gICAgZ2V0Q3VycmVudFNjZW5lSW5mbygpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBzY2VuZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHNjZW5lLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZUNvdW50OiBzY2VuZS5jaGlsZHJlbiA/IHNjZW5lLmNoaWxkcmVuLmxlbmd0aCA6IDAsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBnZXRTY2VuZUhpZXJhcmNoeShpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbiA9IGZhbHNlLCBtYXhEZXB0aDogbnVtYmVyID0gMykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeSA9IGJ1aWxkSGllcmFyY2h5KHNjZW5lLCBpbmNsdWRlQ29tcG9uZW50cywgMCwgbWF4RGVwdGgpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBoaWVyYXJjaHkgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZ2V0Tm9kZUluZm8obm9kZVV1aWQ6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBub2RlVG9JbmZvKG5vZGUpIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGdldEFsbE5vZGVzKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBmdW5jdGlvbiBjb2xsZWN0KG5vZGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgbm9kZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbm9kZS5wYXJlbnQ/LnV1aWQsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxlY3QoY2hpbGQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb2xsZWN0KHNjZW5lKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0b3RhbE5vZGVzOiBub2Rlcy5sZW5ndGgsIG5vZGVzIH0gfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZmluZE5vZGVCeU5hbWUobmFtZTogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0czogYW55W10gPSBbXTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gc2VhcmNoKG5vZGU6IGFueSwgcGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50UGF0aCA9IHBhdGggPyBgJHtwYXRofS8ke25vZGUubmFtZX1gIDogbm9kZS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUubmFtZSA9PT0gbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lLCBwYXRoOiBjdXJyZW50UGF0aCB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaChjaGlsZCwgY3VycmVudFBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWFyY2goc2NlbmUsICcnKTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBObyBub2RlIGZvdW5kIHdpdGggbmFtZTogJHtuYW1lfWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXN1bHRzIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHNldE5vZGVQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdwb3NpdGlvbic6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gdmFsdWUgfHwge307XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih2LnggPz8gMCwgdi55ID8/IDAsIHYueiA/PyAwKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgJ3JvdGF0aW9uJzoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHYgPSB2YWx1ZSB8fCB7fTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5zZXRSb3RhdGlvbkZyb21FdWxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnNldFJvdGF0aW9uRnJvbUV1bGVyKHYueCA/PyAwLCB2LnkgPz8gMCwgdi56ID8/IDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgJ3NjYWxlJzoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHYgPSB2YWx1ZSB8fCB7fTtcclxuICAgICAgICAgICAgICAgICAgICBub2RlLnNldFNjYWxlKHYueCA/PyAxLCB2LnkgPz8gMSwgdi56ID8/IDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSAnYWN0aXZlJzpcclxuICAgICAgICAgICAgICAgICAgICBub2RlLmFjdGl2ZSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnbmFtZSc6XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5uYW1lID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIChub2RlIGFzIGFueSlbcHJvcGVydHldID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQgJHtwcm9wZXJ0eX0gb24gbm9kZSAke25vZGVVdWlkfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgYWRkQ29tcG9uZW50VG9Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGNjLmpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2xhc3Mgbm90IGZvdW5kOiAke2NvbXBvbmVudFR5cGV9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wID0gbm9kZS5hZGRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHsgY29tcG9uZW50SWQ6IGNvbXAudXVpZCB9LFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYEFkZGVkICR7Y29tcG9uZW50VHlwZX0gdG8gbm9kZSAke25vZGVVdWlkfWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHJlbW92ZUNvbXBvbmVudEZyb21Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGNjLmpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2xhc3Mgbm90IGZvdW5kOiAke2NvbXBvbmVudFR5cGV9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wID0gbm9kZS5nZXRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xyXG4gICAgICAgICAgICBpZiAoIWNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBub2RlLnJlbW92ZUNvbXBvbmVudChjb21wKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFJlbW92ZWQgJHtjb21wb25lbnRUeXBlfSBmcm9tIG5vZGUgJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHJlc2V0Q29tcG9uZW50KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGNjLmpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2xhc3Mgbm90IGZvdW5kOiAke2NvbXBvbmVudFR5cGV9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBvbGRDb21wID0gbm9kZS5nZXRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xyXG4gICAgICAgICAgICBpZiAoIW9sZENvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBSZW1vdmUgYW5kIHJlLWFkZCB0byByZXNldCB0byBkZWZhdWx0c1xyXG4gICAgICAgICAgICBub2RlLnJlbW92ZUNvbXBvbmVudChvbGRDb21wKTtcclxuICAgICAgICAgICAgbm9kZS5hZGRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFJlc2V0ICR7Y29tcG9uZW50VHlwZX0gb24gbm9kZSAke25vZGVVdWlkfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZ2V0Q29tcG9uZW50SW5mbyhub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlPzogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIW5vZGUuY29tcG9uZW50cyB8fCBub2RlLmNvbXBvbmVudHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG5vZGVVdWlkLCBjb21wb25lbnRzOiBbXSB9IH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICghY29tcG9uZW50VHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdHlwZXMgPSBub2RlLmNvbXBvbmVudHMubWFwKChjOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogYy5jb25zdHJ1Y3Rvcj8ubmFtZSB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogYy5lbmFibGVkLFxyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBub2RlVXVpZCwgY29tcG9uZW50czogdHlwZXMgfSB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wID0gbm9kZS5jb21wb25lbnRzLmZpbmQoKGM6IGFueSkgPT5cclxuICAgICAgICAgICAgICAgIGMuY29uc3RydWN0b3I/Lm5hbWUgPT09IGNvbXBvbmVudFR5cGUgfHwgYy5jb25zdHJ1Y3Rvcj8ubmFtZT8uaW5jbHVkZXMoY29tcG9uZW50VHlwZSlcclxuICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghY29tcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGVgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudFR5cGU6IGNvbXAuY29uc3RydWN0b3I/Lm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogY29tcC5lbmFibGVkLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgc2V0Q29tcG9uZW50UHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZTogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IENvbXBvbmVudENsYXNzID0gY2MuanMuZ2V0Q2xhc3NCeU5hbWUoY29tcG9uZW50VHlwZSk7XHJcbiAgICAgICAgICAgIGlmICghQ29tcG9uZW50Q2xhc3MpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCBjbGFzcyBub3QgZm91bmQ6ICR7Y29tcG9uZW50VHlwZX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXAgPSBub2RlLmdldENvbXBvbmVudChDb21wb25lbnRDbGFzcyk7XHJcbiAgICAgICAgICAgIGlmICghY29tcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50ICR7Y29tcG9uZW50VHlwZX0gbm90IGZvdW5kIG9uIG5vZGVgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFNwZWNpYWwgaGFuZGxpbmcgZm9yIGFzc2V0LXR5cGUgcHJvcGVydGllcyAoYXN5bmMgbG9hZClcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycgJiYgKHByb3BlcnR5ID09PSAnc3ByaXRlRnJhbWUnIHx8IHByb3BlcnR5ID09PSAnbWF0ZXJpYWwnKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gRmlyZS1hbmQtZm9yZ2V0IGFzeW5jIGFzc2V0IGxvYWRcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2MuYXNzZXRNYW5hZ2VyLmxvYWRBbnkodmFsdWUsIChlcnI6IGFueSwgYXNzZXQ6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWVyciAmJiBhc3NldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGNvbXAgYXMgYW55KVtwcm9wZXJ0eV0gPSBhc3NldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gSWdub3JlIGFzeW5jIGVycm9yc1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYExvYWRpbmcgYXNzZXQgZm9yICR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIERpcmVjdCBwcm9wZXJ0eSBhc3NpZ25tZW50XHJcbiAgICAgICAgICAgIChjb21wIGFzIGFueSlbcHJvcGVydHldID0gdmFsdWU7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgaW5zdGFudGlhdGVQcmVmYWIoYXNzZXRVdWlkOiBzdHJpbmcsIHBhcmVudFV1aWQ/OiBzdHJpbmcsIG5hbWU/OiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgIGNjLmFzc2V0TWFuYWdlci5sb2FkQW55KGFzc2V0VXVpZCwgKGVycjogYW55LCBwcmVmYWI6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYEZhaWxlZCB0byBsb2FkIHByZWZhYjogJHtlcnIubWVzc2FnZSB8fCBlcnJ9YCB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXByZWZhYiB8fCBwcmVmYWIuY29uc3RydWN0b3I/Lm5hbWUgIT09ICdQcmVmYWInKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdBc3NldCBpcyBub3QgYSBQcmVmYWInIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gY2MuaW5zdGFudGlhdGUocHJlZmFiKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRmluZCBwYXJlbnRcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcGFyZW50ID0gc2NlbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmVudFV1aWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIHBhcmVudFV1aWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZm91bmQpIHBhcmVudCA9IGZvdW5kO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50LmFkZENoaWxkKG5vZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQcmVmYWIgaW5zdGFudGlhdGVkOiAke25vZGUubmFtZX1gLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBjcmVhdGVQcmVmYWJGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBwcmVmYWJQYXRoOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQ6IG5vZGUudXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBub2RlTmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHByZWZhYlBhdGgsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYFByZWZhYiBjcmVhdGlvbiBpbml0aWF0ZWQgZm9yIG5vZGU6ICR7bm9kZS5uYW1lfWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIC8vID09PSBBbmltYXRpb24gTWV0aG9kcyA9PT1cclxuXHJcbiAgICBnZXRBbmltYXRpb25DbGlwcyhub2RlVXVpZDogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFuaW1Db21wID0gbm9kZS5nZXRDb21wb25lbnQoY2MuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKCFhbmltQ29tcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQW5pbWF0aW9uIGNvbXBvbmVudCBmb3VuZCBvbiBub2RlJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjbGlwcyA9IChhbmltQ29tcC5jbGlwcyB8fCBbXSkubWFwKChjbGlwOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICBuYW1lOiBjbGlwPy5uYW1lIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBjbGlwPy5kdXJhdGlvbiB8fCAwLFxyXG4gICAgICAgICAgICAgICAgc3BlZWQ6IGNsaXA/LnNwZWVkIHx8IDEsXHJcbiAgICAgICAgICAgICAgICB3cmFwTW9kZTogY2xpcD8ud3JhcE1vZGUsXHJcbiAgICAgICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHRDbGlwOiBhbmltQ29tcC5kZWZhdWx0Q2xpcD8ubmFtZSB8fCBudWxsLFxyXG4gICAgICAgICAgICAgICAgICAgIHBsYXlPbkxvYWQ6IGFuaW1Db21wLnBsYXlPbkxvYWQgfHwgZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgY2xpcHMsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBwbGF5QW5pbWF0aW9uKG5vZGVVdWlkOiBzdHJpbmcsIGNsaXBOYW1lPzogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFuaW1Db21wID0gbm9kZS5nZXRDb21wb25lbnQoY2MuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKCFhbmltQ29tcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQW5pbWF0aW9uIGNvbXBvbmVudCBmb3VuZCBvbiBub2RlJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoY2xpcE5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGFuaW1Db21wLnBsYXkoY2xpcE5hbWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgYW5pbUNvbXAucGxheSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgQW5pbWF0aW9uIHBsYXlpbmcke2NsaXBOYW1lID8gYDogJHtjbGlwTmFtZX1gIDogJyd9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBzdG9wQW5pbWF0aW9uKG5vZGVVdWlkOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYW5pbUNvbXAgPSBub2RlLmdldENvbXBvbmVudChjYy5BbmltYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAoIWFuaW1Db21wKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBBbmltYXRpb24gY29tcG9uZW50IGZvdW5kIG9uIG5vZGUnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGFuaW1Db21wLnN0b3AoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ0FuaW1hdGlvbiBzdG9wcGVkJyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBzZXRBbmltYXRpb25Qcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBkZWZhdWx0Q2xpcD86IHN0cmluZywgcGxheU9uTG9hZD86IGJvb2xlYW4pIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgYW5pbUNvbXAgPSBub2RlLmdldENvbXBvbmVudChjYy5BbmltYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAoIWFuaW1Db21wKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdObyBBbmltYXRpb24gY29tcG9uZW50IGZvdW5kIG9uIG5vZGUnIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZWQ6IHN0cmluZ1tdID0gW107XHJcblxyXG4gICAgICAgICAgICBpZiAoZGVmYXVsdENsaXAgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2xpcCA9IGFuaW1Db21wLmNsaXBzLmZpbmQoKGM6IGFueSkgPT4gYz8ubmFtZSA9PT0gZGVmYXVsdENsaXApO1xyXG4gICAgICAgICAgICAgICAgaWYgKGNsaXApIHtcclxuICAgICAgICAgICAgICAgICAgICBhbmltQ29tcC5kZWZhdWx0Q2xpcCA9IGNsaXA7XHJcbiAgICAgICAgICAgICAgICAgICAgY2hhbmdlZC5wdXNoKGBkZWZhdWx0Q2xpcD0ke2RlZmF1bHRDbGlwfWApO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDbGlwIG5vdCBmb3VuZDogJHtkZWZhdWx0Q2xpcH1gIH07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChwbGF5T25Mb2FkICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGFuaW1Db21wLnBsYXlPbkxvYWQgPSBwbGF5T25Mb2FkO1xyXG4gICAgICAgICAgICAgICAgY2hhbmdlZC5wdXNoKGBwbGF5T25Mb2FkPSR7cGxheU9uTG9hZH1gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYEFuaW1hdGlvbiBwcm9wZXJ0aWVzIHNldDogJHtjaGFuZ2VkLmpvaW4oJywgJyl9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBleGVjdXRlU2NyaXB0KGNvZGU6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3QgeyBkaXJlY3RvciB9ID0gY2M7XHJcbiAgICAgICAgICAgIGNvbnN0IGZuID0gbmV3IEZ1bmN0aW9uKCdjYycsICdkaXJlY3RvcicsIGNvZGUpO1xyXG4gICAgICAgICAgICBjb25zdCByZXN1bHQgPSBmbihjYywgZGlyZWN0b3IpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHJlc3VsdCAhPT0gdW5kZWZpbmVkID8gcmVzdWx0IDogbnVsbCxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdTY3JpcHQgZXhlY3V0ZWQnLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICB2YWxpZGF0ZVNjZW5lKG1heERlcHRoOiBudW1iZXIgPSAxMCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3QgaXNzdWVzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBsZXQgdmFsaWRhdGVkTm9kZXMgPSAwO1xyXG4gICAgICAgICAgICBsZXQgdmFsaWRhdGVkQ29tcG9uZW50cyA9IDA7XHJcbiAgICAgICAgICAgIGxldCBhY3R1YWxNYXhEZXB0aCA9IDA7XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiB3YWxrKG5vZGU6IGFueSwgZGVwdGg6IG51bWJlcikge1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlcHRoID4gYWN0dWFsTWF4RGVwdGgpIGFjdHVhbE1heERlcHRoID0gZGVwdGg7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGVwdGggPiBtYXhEZXB0aCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgICAgICAgIHZhbGlkYXRlZE5vZGVzKys7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCFub2RlLm5hbWUgfHwgbm9kZS5uYW1lLnRyaW0oKSA9PT0gJycpIHtcclxuICAgICAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldmVyaXR5OiAnd2FybmluZycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiBub2RlLm5hbWUgfHwgJyhlbXB0eSknLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiAnTm9kZSBoYXMgZW1wdHkgbmFtZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb246ICdHaXZlIHRoZSBub2RlIGEgZGVzY3JpcHRpdmUgbmFtZScsXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhbGlkYXRlZENvbXBvbmVudHMgKz0gbm9kZS5jb21wb25lbnRzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2Ygbm9kZS5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVOYW1lID0gY29tcC5jb25zdHJ1Y3Rvcj8ubmFtZSB8fCAndW5rbm93bic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChVSV9UUkFOU0ZPUk1fREVQRU5ERU5UUy5pbmNsdWRlcyh0eXBlTmFtZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGhhc1VJVHJhbnNmb3JtID0gbm9kZS5nZXRDb21wb25lbnQoY2MuVUlUcmFuc2Zvcm0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFoYXNVSVRyYW5zZm9ybSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V2ZXJpdHk6ICdlcnJvcicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGAke3R5cGVOYW1lfSByZXF1aXJlcyBVSVRyYW5zZm9ybSBidXQgbm9uZSBmb3VuZGAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb246IGBBZGQgY2MuVUlUcmFuc2Zvcm0gY29tcG9uZW50IHRvIHRoaXMgbm9kZWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbXAuZW5hYmxlZCA9PT0gZmFsc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eTogJ2luZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgQ29tcG9uZW50ICR7dHlwZU5hbWV9IGlzIGRpc2FibGVkYCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FsayhjaGlsZCwgZGVwdGggKyAxKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHdhbGsoc2NlbmUsIDApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFsaWQ6IGlzc3Vlcy5maWx0ZXIoaSA9PiBpLnNldmVyaXR5ID09PSAnZXJyb3InKS5sZW5ndGggPT09IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgaXNzdWVzLFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRzOiB7IHRvdGFsTm9kZXM6IHZhbGlkYXRlZE5vZGVzLCB0b3RhbENvbXBvbmVudHM6IHZhbGlkYXRlZENvbXBvbmVudHMsIHRvdGFsUmVmZXJlbmNlczogMCwgbWF4RGVwdGg6IGFjdHVhbE1heERlcHRoIH0sXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICB2YWxpZGF0ZU5vZGUobm9kZVV1aWQ6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGlzc3VlczogYW55W10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGlmICghbm9kZS5uYW1lIHx8IG5vZGUubmFtZS50cmltKCkgPT09ICcnKSB7XHJcbiAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V2ZXJpdHk6ICd3YXJuaW5nJywgbm9kZVV1aWQ6IG5vZGUudXVpZCwgbm9kZU5hbWU6IG5vZGUubmFtZSB8fCAnKGVtcHR5KScsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ05vZGUgaGFzIGVtcHR5IG5hbWUnLCBzdWdnZXN0aW9uOiAnR2l2ZSB0aGUgbm9kZSBhIGRlc2NyaXB0aXZlIG5hbWUnLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlTmFtZSA9IGNvbXAuY29uc3RydWN0b3I/Lm5hbWUgfHwgJ3Vua25vd24nO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChVSV9UUkFOU0ZPUk1fREVQRU5ERU5UUy5pbmNsdWRlcyh0eXBlTmFtZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFzVUlUcmFuc2Zvcm0gPSBub2RlLmdldENvbXBvbmVudChjYy5VSVRyYW5zZm9ybSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaGFzVUlUcmFuc2Zvcm0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzc3Vlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eTogJ2Vycm9yJywgbm9kZVV1aWQ6IG5vZGUudXVpZCwgbm9kZU5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgJHt0eXBlTmFtZX0gcmVxdWlyZXMgVUlUcmFuc2Zvcm0gYnV0IG5vbmUgZm91bmRgLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Z2dlc3Rpb246IGBBZGQgY2MuVUlUcmFuc2Zvcm0gY29tcG9uZW50IHRvIHRoaXMgbm9kZWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAoY29tcC5lbmFibGVkID09PSBmYWxzZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc3N1ZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eTogJ2luZm8nLCBub2RlVXVpZDogbm9kZS51dWlkLCBub2RlTmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYENvbXBvbmVudCAke3R5cGVOYW1lfSBpcyBkaXNhYmxlZGAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFub2RlLnBhcmVudCAmJiBub2RlICE9PSBzY2VuZSkge1xyXG4gICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHNldmVyaXR5OiAnZXJyb3InLCBub2RlVXVpZDogbm9kZS51dWlkLCBub2RlTmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdOb2RlIGhhcyBubyBwYXJlbnQgKG9ycGhhbmVkKScsXHJcbiAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdGlvbjogJ0F0dGFjaCB0aGlzIG5vZGUgdG8gYSBwYXJlbnQgaW4gdGhlIHNjZW5lIHRyZWUnLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogeyB2YWxpZDogaXNzdWVzLmZpbHRlcihpID0+IGkuc2V2ZXJpdHkgPT09ICdlcnJvcicpLmxlbmd0aCA9PT0gMCwgaXNzdWVzLCBub2RlSW5mbzogbm9kZVRvSW5mbyhub2RlKSB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICB2YWxpZGF0ZUNvbXBvbmVudHMoY29tcG9uZW50VHlwZT86IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3QgaXNzdWVzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBjb25zdCBVSVRyYW5zZm9ybSA9IGNjLlVJVHJhbnNmb3JtO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gd2Fsayhub2RlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2Ygbm9kZS5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVOYW1lID0gY29tcC5jb25zdHJ1Y3Rvcj8ubmFtZSB8fCAndW5rbm93bic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnRUeXBlICYmIHR5cGVOYW1lICE9PSBjb21wb25lbnRUeXBlKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKFVJX1RSQU5TRk9STV9ERVBFTkRFTlRTLmluY2x1ZGVzKHR5cGVOYW1lKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaGFzVUlUcmFuc2Zvcm0gPSBub2RlLmdldENvbXBvbmVudChVSVRyYW5zZm9ybSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWhhc1VJVHJhbnNmb3JtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNzdWVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXZlcml0eTogJ2Vycm9yJywgbm9kZVV1aWQ6IG5vZGUudXVpZCwgbm9kZU5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYCR7dHlwZU5hbWV9IHJlcXVpcmVzIFVJVHJhbnNmb3JtIGJ1dCBub25lIGZvdW5kYCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3VnZ2VzdGlvbjogYEFkZCBjYy5VSVRyYW5zZm9ybSBjb21wb25lbnQgdG8gbm9kZSAnJHtub2RlLm5hbWV9J2AsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikgeyBmb3IgKGNvbnN0IGNoaWxkIG9mIG5vZGUuY2hpbGRyZW4pIHsgd2FsayhjaGlsZCk7IH0gfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB3YWxrKHNjZW5lKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IHZhbGlkOiBpc3N1ZXMuZmlsdGVyKGkgPT4gaS5zZXZlcml0eSA9PT0gJ2Vycm9yJykubGVuZ3RoID09PSAwLCBpc3N1ZXMsIGNoZWNrZWRUeXBlOiBjb21wb25lbnRUeXBlIHx8ICdhbGwnIH0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGdldFNjZW5lU3RhdHMoKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgbGV0IHRvdGFsTm9kZXMgPSAwO1xyXG4gICAgICAgICAgICBsZXQgdG90YWxDb21wb25lbnRzID0gMDtcclxuICAgICAgICAgICAgbGV0IG1heERlcHRoID0gMDtcclxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50Q291bnRzOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge307XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiB3YWxrKG5vZGU6IGFueSwgZGVwdGg6IG51bWJlcikge1xyXG4gICAgICAgICAgICAgICAgdG90YWxOb2RlcysrO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRlcHRoID4gbWF4RGVwdGgpIG1heERlcHRoID0gZGVwdGg7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWxDb21wb25lbnRzICs9IG5vZGUuY29tcG9uZW50cy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIG5vZGUuY29tcG9uZW50cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlTmFtZSA9IGNvbXAuY29uc3RydWN0b3I/Lm5hbWUgfHwgJ3Vua25vd24nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRDb3VudHNbdHlwZU5hbWVdID0gKGNvbXBvbmVudENvdW50c1t0eXBlTmFtZV0gfHwgMCkgKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7IGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikgeyB3YWxrKGNoaWxkLCBkZXB0aCArIDEpOyB9IH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgd2FsayhzY2VuZSwgMCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgdG90YWxOb2RlcywgdG90YWxDb21wb25lbnRzLCBtYXhEZXB0aCwgY29tcG9uZW50RGlzdHJpYnV0aW9uOiBjb21wb25lbnRDb3VudHMgfSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBnZXRTY2VuZVNuYXBzaG90KCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVzOiBhbnlbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gd2Fsayhub2RlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGVudHJ5OiBhbnkgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLCBuYW1lOiBub2RlLm5hbWUsIGFjdGl2ZTogbm9kZS5hY3RpdmUsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50OiBub2RlLnBhcmVudD8udXVpZCB8fCBudWxsLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbnRyeS5jb21wb25lbnRzID0gbm9kZS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBjLmNvbnN0cnVjdG9yPy5uYW1lIHx8ICd1bmtub3duJywgZW5hYmxlZDogYy5lbmFibGVkLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNvbnN0IHBvcyA9IG5vZGUucG9zaXRpb24gfHwgbm9kZS5nZXRQb3NpdGlvbj8uKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAocG9zKSBlbnRyeS5wb3NpdGlvbiA9IHsgeDogcG9zLngsIHk6IHBvcy55LCB6OiBwb3MueiB9O1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgcm90ID0gbm9kZS5ldWxlckFuZ2xlcyB8fCBub2RlLmdldFJvdGF0aW9uPy4oKTtcclxuICAgICAgICAgICAgICAgIGlmIChyb3QpIGVudHJ5LnJvdGF0aW9uID0geyB4OiByb3QueCwgeTogcm90LnksIHo6IHJvdC56IH07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzY2wgPSBub2RlLnNjYWxlIHx8IG5vZGUuZ2V0U2NhbGU/LigpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHNjbCkgZW50cnkuc2NhbGUgPSB7IHg6IHNjbC54LCB5OiBzY2wueSwgejogc2NsLnogfTtcclxuICAgICAgICAgICAgICAgIG5vZGVzLnB1c2goZW50cnkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUuY2hpbGRyZW4pIHsgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7IHdhbGsoY2hpbGQpOyB9IH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgd2FsayhzY2VuZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgdGltZXN0YW1wOiBEYXRlLm5vdygpLCBub2RlQ291bnQ6IG5vZGVzLmxlbmd0aCwgbm9kZXMgfSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxufTtcclxuIl19