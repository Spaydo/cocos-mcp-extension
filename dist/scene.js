"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = void 0;
const path_1 = require("path");
module.paths.push((0, path_1.join)(Editor.App.path, 'node_modules'));
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
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQTRCO0FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFekQ7OztHQUdHO0FBRUgsa0JBQWtCO0FBRWxCLFNBQVMsa0JBQWtCLENBQUMsSUFBUyxFQUFFLElBQVk7SUFDL0MsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUk7UUFBRSxPQUFPLElBQUksQ0FBQztJQUNwQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7UUFDdEMsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksS0FBSztZQUFFLE9BQU8sS0FBSyxDQUFDO0lBQzVCLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxjQUFjO0lBQ25CLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkMsT0FBTyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDL0IsQ0FBQztBQUVELFNBQVMsWUFBWTtJQUNqQixNQUFNLEtBQUssR0FBRyxjQUFjLEVBQUUsQ0FBQztJQUMvQixJQUFJLENBQUMsS0FBSztRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMvQyxPQUFPLEtBQUssQ0FBQztBQUNqQixDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsS0FBVSxFQUFFLElBQVk7SUFDekMsTUFBTSxJQUFJLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdDLElB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QUFVLEVBQUUsQ0FBQztZQUNsQixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDTCxDQUFDO0NBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxubW9kdWxlLnBhdGhzLnB1c2goam9pbihFZGl0b3IuQXBwLnBhdGgsICdub2RlX21vZHVsZXMnKSk7XHJcblxyXG4vKipcclxuICogU2NlbmUgc2NyaXB0IC0gdGhlIE9OTFkgcGxhY2Ugd2l0aCBhY2Nlc3MgdG8gY2MuKiBlbmdpbmUgQVBJcy5cclxuICogQ2FsbGVkIHZpYTogRWRpdG9yLk1lc3NhZ2UucmVxdWVzdCgnc2NlbmUnLCAnZXhlY3V0ZS1zY2VuZS1zY3JpcHQnLCB7IG5hbWUsIG1ldGhvZCwgYXJncyB9KVxyXG4gKi9cclxuXHJcbi8vID09PSBIZWxwZXJzID09PVxyXG5cclxuZnVuY3Rpb24gZmluZE5vZGVCeVV1aWREZWVwKHJvb3Q6IGFueSwgdXVpZDogc3RyaW5nKTogYW55IHtcclxuICAgIGlmIChyb290LnV1aWQgPT09IHV1aWQpIHJldHVybiByb290O1xyXG4gICAgZm9yIChjb25zdCBjaGlsZCBvZiByb290LmNoaWxkcmVuIHx8IFtdKSB7XHJcbiAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kTm9kZUJ5VXVpZERlZXAoY2hpbGQsIHV1aWQpO1xyXG4gICAgICAgIGlmIChmb3VuZCkgcmV0dXJuIGZvdW5kO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldEFjdGl2ZVNjZW5lKCk6IGFueSB7XHJcbiAgICBjb25zdCB7IGRpcmVjdG9yIH0gPSByZXF1aXJlKCdjYycpO1xyXG4gICAgcmV0dXJuIGRpcmVjdG9yLmdldFNjZW5lKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlcXVpcmVTY2VuZSgpOiBhbnkge1xyXG4gICAgY29uc3Qgc2NlbmUgPSBnZXRBY3RpdmVTY2VuZSgpO1xyXG4gICAgaWYgKCFzY2VuZSkgdGhyb3cgbmV3IEVycm9yKCdObyBhY3RpdmUgc2NlbmUnKTtcclxuICAgIHJldHVybiBzY2VuZTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVxdWlyZU5vZGUoc2NlbmU6IGFueSwgdXVpZDogc3RyaW5nKTogYW55IHtcclxuICAgIGNvbnN0IG5vZGUgPSBmaW5kTm9kZUJ5VXVpZERlZXAoc2NlbmUsIHV1aWQpO1xyXG4gICAgaWYgKCFub2RlKSB0aHJvdyBuZXcgRXJyb3IoYE5vZGUgbm90IGZvdW5kOiAke3V1aWR9YCk7XHJcbiAgICByZXR1cm4gbm9kZTtcclxufVxyXG5cclxuZnVuY3Rpb24gbm9kZVRvSW5mbyhub2RlOiBhbnkpOiBhbnkge1xyXG4gICAgY29uc3QgcG9zID0gbm9kZS5wb3NpdGlvbiB8fCBub2RlLmdldFBvc2l0aW9uPy4oKTtcclxuICAgIGNvbnN0IHJvdCA9IG5vZGUuZXVsZXJBbmdsZXMgfHwgbm9kZS5nZXRSb3RhdGlvbj8uKCk7XHJcbiAgICBjb25zdCBzY2wgPSBub2RlLnNjYWxlIHx8IG5vZGUuZ2V0U2NhbGU/LigpO1xyXG5cclxuICAgIGNvbnN0IGluZm86IGFueSA9IHtcclxuICAgICAgICB1dWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChwb3MpIGluZm8ucG9zaXRpb24gPSB7IHg6IHBvcy54LCB5OiBwb3MueSwgejogcG9zLnogfTtcclxuICAgIGlmIChyb3QpIGluZm8ucm90YXRpb24gPSB7IHg6IHJvdC54LCB5OiByb3QueSwgejogcm90LnogfTtcclxuICAgIGlmIChzY2wpIGluZm8uc2NhbGUgPSB7IHg6IHNjbC54LCB5OiBzY2wueSwgejogc2NsLnogfTtcclxuXHJcbiAgICBpZiAobm9kZS5wYXJlbnQpIGluZm8ucGFyZW50ID0gbm9kZS5wYXJlbnQudXVpZDtcclxuXHJcbiAgICBpZiAobm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgIGluZm8uY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoYzogYW55KSA9PiBjLnV1aWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICBpbmZvLmNvbXBvbmVudHMgPSBub2RlLmNvbXBvbmVudHMubWFwKChjOiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgIHR5cGU6IGMuY29uc3RydWN0b3I/Lm5hbWUgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgICAgICBlbmFibGVkOiBjLmVuYWJsZWQsXHJcbiAgICAgICAgfSkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBpbmZvO1xyXG59XHJcblxyXG5mdW5jdGlvbiBidWlsZEhpZXJhcmNoeShub2RlOiBhbnksIGluY2x1ZGVDb21wb25lbnRzOiBib29sZWFuLCBkZXB0aDogbnVtYmVyLCBtYXhEZXB0aDogbnVtYmVyKTogYW55IHtcclxuICAgIGNvbnN0IHJlc3VsdDogYW55ID0ge1xyXG4gICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcclxuICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKGluY2x1ZGVDb21wb25lbnRzICYmIG5vZGUuY29tcG9uZW50cykge1xyXG4gICAgICAgIHJlc3VsdC5jb21wb25lbnRzID0gbm9kZS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICB0eXBlOiBjLmNvbnN0cnVjdG9yPy5uYW1lIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgZW5hYmxlZDogYy5lbmFibGVkLFxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZGVwdGggPCBtYXhEZXB0aCAmJiBub2RlLmNoaWxkcmVuICYmIG5vZGUuY2hpbGRyZW4ubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIHJlc3VsdC5jaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW4ubWFwKChjaGlsZDogYW55KSA9PlxyXG4gICAgICAgICAgICBidWlsZEhpZXJhcmNoeShjaGlsZCwgaW5jbHVkZUNvbXBvbmVudHMsIGRlcHRoICsgMSwgbWF4RGVwdGgpXHJcbiAgICAgICAgKTtcclxuICAgIH0gZWxzZSBpZiAobm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXN1bHQuY2hpbGRDb3VudCA9IG5vZGUuY2hpbGRyZW4ubGVuZ3RoO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiByZXN1bHQ7XHJcbn1cclxuXHJcbi8vID09PSBFeHBvcnRlZCBNZXRob2RzID09PVxyXG5cclxuZXhwb3J0IGNvbnN0IG1ldGhvZHM6IHsgW2tleTogc3RyaW5nXTogKC4uLmFyZ3M6IGFueSkgPT4gYW55IH0gPSB7XHJcblxyXG4gICAgZ2V0Q3VycmVudFNjZW5lSW5mbygpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBzY2VuZS5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IHNjZW5lLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZUNvdW50OiBzY2VuZS5jaGlsZHJlbiA/IHNjZW5lLmNoaWxkcmVuLmxlbmd0aCA6IDAsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBnZXRTY2VuZUhpZXJhcmNoeShpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbiA9IGZhbHNlLCBtYXhEZXB0aDogbnVtYmVyID0gMykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGhpZXJhcmNoeSA9IGJ1aWxkSGllcmFyY2h5KHNjZW5lLCBpbmNsdWRlQ29tcG9uZW50cywgMCwgbWF4RGVwdGgpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBoaWVyYXJjaHkgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZ2V0Tm9kZUluZm8obm9kZVV1aWQ6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBub2RlVG9JbmZvKG5vZGUpIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGdldEFsbE5vZGVzKCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGVzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICBmdW5jdGlvbiBjb2xsZWN0KG5vZGU6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgbm9kZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudDogbm9kZS5wYXJlbnQ/LnV1aWQsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbGxlY3QoY2hpbGQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb2xsZWN0KHNjZW5lKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0b3RhbE5vZGVzOiBub2Rlcy5sZW5ndGgsIG5vZGVzIH0gfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZmluZE5vZGVCeU5hbWUobmFtZTogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0czogYW55W10gPSBbXTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gc2VhcmNoKG5vZGU6IGFueSwgcGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50UGF0aCA9IHBhdGggPyBgJHtwYXRofS8ke25vZGUubmFtZX1gIDogbm9kZS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgaWYgKG5vZGUubmFtZSA9PT0gbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaCh7IHV1aWQ6IG5vZGUudXVpZCwgbmFtZTogbm9kZS5uYW1lLCBwYXRoOiBjdXJyZW50UGF0aCB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlYXJjaChjaGlsZCwgY3VycmVudFBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzZWFyY2goc2NlbmUsICcnKTtcclxuICAgICAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBObyBub2RlIGZvdW5kIHdpdGggbmFtZTogJHtuYW1lfWAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiByZXN1bHRzIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHNldE5vZGVQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBwcm9wZXJ0eTogc3RyaW5nLCB2YWx1ZTogYW55KSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdwb3NpdGlvbic6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gdmFsdWUgfHwge307XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRQb3NpdGlvbih2LnggPz8gMCwgdi55ID8/IDAsIHYueiA/PyAwKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgJ3JvdGF0aW9uJzoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHYgPSB2YWx1ZSB8fCB7fTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobm9kZS5zZXRSb3RhdGlvbkZyb21FdWxlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBub2RlLnNldFJvdGF0aW9uRnJvbUV1bGVyKHYueCA/PyAwLCB2LnkgPz8gMCwgdi56ID8/IDApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgJ3NjYWxlJzoge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHYgPSB2YWx1ZSB8fCB7fTtcclxuICAgICAgICAgICAgICAgICAgICBub2RlLnNldFNjYWxlKHYueCA/PyAxLCB2LnkgPz8gMSwgdi56ID8/IDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FzZSAnYWN0aXZlJzpcclxuICAgICAgICAgICAgICAgICAgICBub2RlLmFjdGl2ZSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnbmFtZSc6XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5uYW1lID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIChub2RlIGFzIGFueSlbcHJvcGVydHldID0gdmFsdWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBTZXQgJHtwcm9wZXJ0eX0gb24gbm9kZSAke25vZGVVdWlkfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgYWRkQ29tcG9uZW50VG9Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGNjLmpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2xhc3Mgbm90IGZvdW5kOiAke2NvbXBvbmVudFR5cGV9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wID0gbm9kZS5hZGRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHsgY29tcG9uZW50SWQ6IGNvbXAudXVpZCB9LFxyXG4gICAgICAgICAgICAgICAgbWVzc2FnZTogYEFkZGVkICR7Y29tcG9uZW50VHlwZX0gdG8gbm9kZSAke25vZGVVdWlkfWAsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHJlbW92ZUNvbXBvbmVudEZyb21Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGNjLmpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2xhc3Mgbm90IGZvdW5kOiAke2NvbXBvbmVudFR5cGV9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wID0gbm9kZS5nZXRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xyXG4gICAgICAgICAgICBpZiAoIWNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBub2RlLnJlbW92ZUNvbXBvbmVudChjb21wKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFJlbW92ZWQgJHtjb21wb25lbnRUeXBlfSBmcm9tIG5vZGUgJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGdldENvbXBvbmVudEluZm8obm9kZVV1aWQ6IHN0cmluZywgY29tcG9uZW50VHlwZT86IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFub2RlLmNvbXBvbmVudHMgfHwgbm9kZS5jb21wb25lbnRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBub2RlVXVpZCwgY29tcG9uZW50czogW10gfSB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbXBvbmVudFR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHR5cGVzID0gbm9kZS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6IGMuY29uc3RydWN0b3I/Lm5hbWUgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGMuZW5hYmxlZCxcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbm9kZVV1aWQsIGNvbXBvbmVudHM6IHR5cGVzIH0gfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcCA9IG5vZGUuY29tcG9uZW50cy5maW5kKChjOiBhbnkpID0+XHJcbiAgICAgICAgICAgICAgICBjLmNvbnN0cnVjdG9yPy5uYW1lID09PSBjb21wb25lbnRUeXBlIHx8IGMuY29uc3RydWN0b3I/Lm5hbWU/LmluY2x1ZGVzKGNvbXBvbmVudFR5cGUpXHJcbiAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnRUeXBlOiBjb21wLmNvbnN0cnVjdG9yPy5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGNvbXAuZW5hYmxlZCxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIHNldENvbXBvbmVudFByb3BlcnR5KG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBDb21wb25lbnRDbGFzcyA9IGNjLmpzLmdldENsYXNzQnlOYW1lKGNvbXBvbmVudFR5cGUpO1xyXG4gICAgICAgICAgICBpZiAoIUNvbXBvbmVudENsYXNzKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgY2xhc3Mgbm90IGZvdW5kOiAke2NvbXBvbmVudFR5cGV9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjb21wID0gbm9kZS5nZXRDb21wb25lbnQoQ29tcG9uZW50Q2xhc3MpO1xyXG4gICAgICAgICAgICBpZiAoIWNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogYENvbXBvbmVudCAke2NvbXBvbmVudFR5cGV9IG5vdCBmb3VuZCBvbiBub2RlYCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBTcGVjaWFsIGhhbmRsaW5nIGZvciBhc3NldC10eXBlIHByb3BlcnRpZXMgKGFzeW5jIGxvYWQpXHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdzdHJpbmcnICYmIChwcm9wZXJ0eSA9PT0gJ3Nwcml0ZUZyYW1lJyB8fCBwcm9wZXJ0eSA9PT0gJ21hdGVyaWFsJykpIHtcclxuICAgICAgICAgICAgICAgIC8vIEZpcmUtYW5kLWZvcmdldCBhc3luYyBhc3NldCBsb2FkXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNjLmFzc2V0TWFuYWdlci5sb2FkQW55KHZhbHVlLCAoZXJyOiBhbnksIGFzc2V0OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFlcnIgJiYgYXNzZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjb21wIGFzIGFueSlbcHJvcGVydHldID0gYXNzZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIElnbm9yZSBhc3luYyBlcnJvcnNcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBMb2FkaW5nIGFzc2V0IGZvciAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9YCB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBEaXJlY3QgcHJvcGVydHkgYXNzaWdubWVudFxyXG4gICAgICAgICAgICAoY29tcCBhcyBhbnkpW3Byb3BlcnR5XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgU2V0ICR7Y29tcG9uZW50VHlwZX0uJHtwcm9wZXJ0eX1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGluc3RhbnRpYXRlUHJlZmFiKGFzc2V0VXVpZDogc3RyaW5nLCBwYXJlbnRVdWlkPzogc3RyaW5nLCBuYW1lPzogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjYy5hc3NldE1hbmFnZXIubG9hZEFueShhc3NldFV1aWQsIChlcnI6IGFueSwgcHJlZmFiOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBGYWlsZWQgdG8gbG9hZCBwcmVmYWI6ICR7ZXJyLm1lc3NhZ2UgfHwgZXJyfWAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwcmVmYWIgfHwgcHJlZmFiLmNvbnN0cnVjdG9yPy5uYW1lICE9PSAnUHJlZmFiJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnQXNzZXQgaXMgbm90IGEgUHJlZmFiJyB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGNjLmluc3RhbnRpYXRlKHByZWZhYik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5uYW1lID0gbmFtZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbmQgcGFyZW50XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhcmVudCA9IHNjZW5lO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnRVdWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvdW5kID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCBwYXJlbnRVdWlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZvdW5kKSBwYXJlbnQgPSBmb3VuZDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudC5hZGRDaGlsZChub2RlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogeyB1dWlkOiBub2RlLnV1aWQsIG5hbWU6IG5vZGUubmFtZSB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUHJlZmFiIGluc3RhbnRpYXRlZDogJHtub2RlLm5hbWV9YCxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgY3JlYXRlUHJlZmFiRnJvbU5vZGUobm9kZVV1aWQ6IHN0cmluZywgcHJlZmFiUGF0aDogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVVdWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZU5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBwcmVmYWJQYXRoLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBQcmVmYWIgY3JlYXRpb24gaW5pdGlhdGVkIGZvciBub2RlOiAke25vZGUubmFtZX1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICAvLyA9PT0gQW5pbWF0aW9uIE1ldGhvZHMgPT09XHJcblxyXG4gICAgZ2V0QW5pbWF0aW9uQ2xpcHMobm9kZVV1aWQ6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhbmltQ29tcCA9IG5vZGUuZ2V0Q29tcG9uZW50KGNjLkFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIGlmICghYW5pbUNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIEFuaW1hdGlvbiBjb21wb25lbnQgZm91bmQgb24gbm9kZScgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY2xpcHMgPSAoYW5pbUNvbXAuY2xpcHMgfHwgW10pLm1hcCgoY2xpcDogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgbmFtZTogY2xpcD8ubmFtZSB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgICAgICBkdXJhdGlvbjogY2xpcD8uZHVyYXRpb24gfHwgMCxcclxuICAgICAgICAgICAgICAgIHNwZWVkOiBjbGlwPy5zcGVlZCB8fCAxLFxyXG4gICAgICAgICAgICAgICAgd3JhcE1vZGU6IGNsaXA/LndyYXBNb2RlLFxyXG4gICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2xpcDogYW5pbUNvbXAuZGVmYXVsdENsaXA/Lm5hbWUgfHwgbnVsbCxcclxuICAgICAgICAgICAgICAgICAgICBwbGF5T25Mb2FkOiBhbmltQ29tcC5wbGF5T25Mb2FkIHx8IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNsaXBzLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgcGxheUFuaW1hdGlvbihub2RlVXVpZDogc3RyaW5nLCBjbGlwTmFtZT86IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IHJlcXVpcmVOb2RlKHNjZW5lLCBub2RlVXVpZCk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBhbmltQ29tcCA9IG5vZGUuZ2V0Q29tcG9uZW50KGNjLkFuaW1hdGlvbik7XHJcbiAgICAgICAgICAgIGlmICghYW5pbUNvbXApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ05vIEFuaW1hdGlvbiBjb21wb25lbnQgZm91bmQgb24gbm9kZScgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGNsaXBOYW1lKSB7XHJcbiAgICAgICAgICAgICAgICBhbmltQ29tcC5wbGF5KGNsaXBOYW1lKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGFuaW1Db21wLnBsYXkoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYEFuaW1hdGlvbiBwbGF5aW5nJHtjbGlwTmFtZSA/IGA6ICR7Y2xpcE5hbWV9YCA6ICcnfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgc3RvcEFuaW1hdGlvbihub2RlVXVpZDogc3RyaW5nKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFuaW1Db21wID0gbm9kZS5nZXRDb21wb25lbnQoY2MuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKCFhbmltQ29tcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQW5pbWF0aW9uIGNvbXBvbmVudCBmb3VuZCBvbiBub2RlJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBhbmltQ29tcC5zdG9wKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6ICdBbmltYXRpb24gc3RvcHBlZCcgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgc2V0QW5pbWF0aW9uUHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgZGVmYXVsdENsaXA/OiBzdHJpbmcsIHBsYXlPbkxvYWQ/OiBib29sZWFuKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgY2MgPSByZXF1aXJlKCdjYycpO1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGFuaW1Db21wID0gbm9kZS5nZXRDb21wb25lbnQoY2MuQW5pbWF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKCFhbmltQ29tcCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnTm8gQW5pbWF0aW9uIGNvbXBvbmVudCBmb3VuZCBvbiBub2RlJyB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VkOiBzdHJpbmdbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRlZmF1bHRDbGlwICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNsaXAgPSBhbmltQ29tcC5jbGlwcy5maW5kKChjOiBhbnkpID0+IGM/Lm5hbWUgPT09IGRlZmF1bHRDbGlwKTtcclxuICAgICAgICAgICAgICAgIGlmIChjbGlwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYW5pbUNvbXAuZGVmYXVsdENsaXAgPSBjbGlwO1xyXG4gICAgICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChgZGVmYXVsdENsaXA9JHtkZWZhdWx0Q2xpcH1gKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ2xpcCBub3QgZm91bmQ6ICR7ZGVmYXVsdENsaXB9YCB9O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocGxheU9uTG9hZCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBhbmltQ29tcC5wbGF5T25Mb2FkID0gcGxheU9uTG9hZDtcclxuICAgICAgICAgICAgICAgIGNoYW5nZWQucHVzaChgcGxheU9uTG9hZD0ke3BsYXlPbkxvYWR9YCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBBbmltYXRpb24gcHJvcGVydGllcyBzZXQ6ICR7Y2hhbmdlZC5qb2luKCcsICcpfWAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZXhlY3V0ZVNjcmlwdChjb2RlOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IGNjO1xyXG4gICAgICAgICAgICBjb25zdCBmbiA9IG5ldyBGdW5jdGlvbignY2MnLCAnZGlyZWN0b3InLCBjb2RlKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZm4oY2MsIGRpcmVjdG9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHQgIT09IHVuZGVmaW5lZCA/IHJlc3VsdCA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnU2NyaXB0IGV4ZWN1dGVkJyxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn07XHJcbiJdfQ==