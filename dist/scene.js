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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NlbmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zb3VyY2Uvc2NlbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsK0JBQTRCO0FBQzVCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFFekQ7OztHQUdHO0FBRUgsa0JBQWtCO0FBRWxCLFNBQVMsa0JBQWtCLENBQUMsSUFBUyxFQUFFLElBQVk7SUFDL0MsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUk7UUFBRSxPQUFPLElBQUksQ0FBQztJQUNwQyxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxRQUFRLElBQUksRUFBRSxFQUFFLENBQUM7UUFDdEMsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksS0FBSztZQUFFLE9BQU8sS0FBSyxDQUFDO0lBQzVCLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBRUQsU0FBUyxjQUFjO0lBQ25CLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbkMsT0FBTyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDL0IsQ0FBQztBQUVELFNBQVMsWUFBWTtJQUNqQixNQUFNLEtBQUssR0FBRyxjQUFjLEVBQUUsQ0FBQztJQUMvQixJQUFJLENBQUMsS0FBSztRQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMvQyxPQUFPLEtBQUssQ0FBQztBQUNqQixDQUFDO0FBRUQsU0FBUyxXQUFXLENBQUMsS0FBVSxFQUFFLElBQVk7SUFDekMsTUFBTSxJQUFJLEdBQUcsa0JBQWtCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzdDLElB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Q0FBQyxDQUFDLENBQUMsSUFBSTtnQkFDMUMsT0FBTyxFQUFFLGlCQUFpQjthQUM3QixDQUFDO1FBQ04sQ0FBQztRQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7WUFDbEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwRCxDQUFDO0lBQ0wsQ0FBQztDQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XHJcbm1vZHVsZS5wYXRocy5wdXNoKGpvaW4oRWRpdG9yLkFwcC5wYXRoLCAnbm9kZV9tb2R1bGVzJykpO1xyXG5cclxuLyoqXHJcbiAqIFNjZW5lIHNjcmlwdCAtIHRoZSBPTkxZIHBsYWNlIHdpdGggYWNjZXNzIHRvIGNjLiogZW5naW5lIEFQSXMuXHJcbiAqIENhbGxlZCB2aWE6IEVkaXRvci5NZXNzYWdlLnJlcXVlc3QoJ3NjZW5lJywgJ2V4ZWN1dGUtc2NlbmUtc2NyaXB0JywgeyBuYW1lLCBtZXRob2QsIGFyZ3MgfSlcclxuICovXHJcblxyXG4vLyA9PT0gSGVscGVycyA9PT1cclxuXHJcbmZ1bmN0aW9uIGZpbmROb2RlQnlVdWlkRGVlcChyb290OiBhbnksIHV1aWQ6IHN0cmluZyk6IGFueSB7XHJcbiAgICBpZiAocm9vdC51dWlkID09PSB1dWlkKSByZXR1cm4gcm9vdDtcclxuICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygcm9vdC5jaGlsZHJlbiB8fCBbXSkge1xyXG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZE5vZGVCeVV1aWREZWVwKGNoaWxkLCB1dWlkKTtcclxuICAgICAgICBpZiAoZm91bmQpIHJldHVybiBmb3VuZDtcclxuICAgIH1cclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRBY3RpdmVTY2VuZSgpOiBhbnkge1xyXG4gICAgY29uc3QgeyBkaXJlY3RvciB9ID0gcmVxdWlyZSgnY2MnKTtcclxuICAgIHJldHVybiBkaXJlY3Rvci5nZXRTY2VuZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXF1aXJlU2NlbmUoKTogYW55IHtcclxuICAgIGNvbnN0IHNjZW5lID0gZ2V0QWN0aXZlU2NlbmUoKTtcclxuICAgIGlmICghc2NlbmUpIHRocm93IG5ldyBFcnJvcignTm8gYWN0aXZlIHNjZW5lJyk7XHJcbiAgICByZXR1cm4gc2NlbmU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlcXVpcmVOb2RlKHNjZW5lOiBhbnksIHV1aWQ6IHN0cmluZyk6IGFueSB7XHJcbiAgICBjb25zdCBub2RlID0gZmluZE5vZGVCeVV1aWREZWVwKHNjZW5lLCB1dWlkKTtcclxuICAgIGlmICghbm9kZSkgdGhyb3cgbmV3IEVycm9yKGBOb2RlIG5vdCBmb3VuZDogJHt1dWlkfWApO1xyXG4gICAgcmV0dXJuIG5vZGU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG5vZGVUb0luZm8obm9kZTogYW55KTogYW55IHtcclxuICAgIGNvbnN0IHBvcyA9IG5vZGUucG9zaXRpb24gfHwgbm9kZS5nZXRQb3NpdGlvbj8uKCk7XHJcbiAgICBjb25zdCByb3QgPSBub2RlLmV1bGVyQW5nbGVzIHx8IG5vZGUuZ2V0Um90YXRpb24/LigpO1xyXG4gICAgY29uc3Qgc2NsID0gbm9kZS5zY2FsZSB8fCBub2RlLmdldFNjYWxlPy4oKTtcclxuXHJcbiAgICBjb25zdCBpbmZvOiBhbnkgPSB7XHJcbiAgICAgICAgdXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgICBhY3RpdmU6IG5vZGUuYWN0aXZlLFxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAocG9zKSBpbmZvLnBvc2l0aW9uID0geyB4OiBwb3MueCwgeTogcG9zLnksIHo6IHBvcy56IH07XHJcbiAgICBpZiAocm90KSBpbmZvLnJvdGF0aW9uID0geyB4OiByb3QueCwgeTogcm90LnksIHo6IHJvdC56IH07XHJcbiAgICBpZiAoc2NsKSBpbmZvLnNjYWxlID0geyB4OiBzY2wueCwgeTogc2NsLnksIHo6IHNjbC56IH07XHJcblxyXG4gICAgaWYgKG5vZGUucGFyZW50KSBpbmZvLnBhcmVudCA9IG5vZGUucGFyZW50LnV1aWQ7XHJcblxyXG4gICAgaWYgKG5vZGUuY2hpbGRyZW4pIHtcclxuICAgICAgICBpbmZvLmNoaWxkcmVuID0gbm9kZS5jaGlsZHJlbi5tYXAoKGM6IGFueSkgPT4gYy51dWlkKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobm9kZS5jb21wb25lbnRzKSB7XHJcbiAgICAgICAgaW5mby5jb21wb25lbnRzID0gbm9kZS5jb21wb25lbnRzLm1hcCgoYzogYW55KSA9PiAoe1xyXG4gICAgICAgICAgICB0eXBlOiBjLmNvbnN0cnVjdG9yPy5uYW1lIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgZW5hYmxlZDogYy5lbmFibGVkLFxyXG4gICAgICAgIH0pKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaW5mbztcclxufVxyXG5cclxuZnVuY3Rpb24gYnVpbGRIaWVyYXJjaHkobm9kZTogYW55LCBpbmNsdWRlQ29tcG9uZW50czogYm9vbGVhbiwgZGVwdGg6IG51bWJlciwgbWF4RGVwdGg6IG51bWJlcik6IGFueSB7XHJcbiAgICBjb25zdCByZXN1bHQ6IGFueSA9IHtcclxuICAgICAgICB1dWlkOiBub2RlLnV1aWQsXHJcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgIGFjdGl2ZTogbm9kZS5hY3RpdmUsXHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChpbmNsdWRlQ29tcG9uZW50cyAmJiBub2RlLmNvbXBvbmVudHMpIHtcclxuICAgICAgICByZXN1bHQuY29tcG9uZW50cyA9IG5vZGUuY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgdHlwZTogYy5jb25zdHJ1Y3Rvcj8ubmFtZSB8fCAndW5rbm93bicsXHJcbiAgICAgICAgICAgIGVuYWJsZWQ6IGMuZW5hYmxlZCxcclxuICAgICAgICB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGRlcHRoIDwgbWF4RGVwdGggJiYgbm9kZS5jaGlsZHJlbiAmJiBub2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcclxuICAgICAgICByZXN1bHQuY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuLm1hcCgoY2hpbGQ6IGFueSkgPT5cclxuICAgICAgICAgICAgYnVpbGRIaWVyYXJjaHkoY2hpbGQsIGluY2x1ZGVDb21wb25lbnRzLCBkZXB0aCArIDEsIG1heERlcHRoKVxyXG4gICAgICAgICk7XHJcbiAgICB9IGVsc2UgaWYgKG5vZGUuY2hpbGRyZW4gJiYgbm9kZS5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcmVzdWx0LmNoaWxkQ291bnQgPSBub2RlLmNoaWxkcmVuLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcblxyXG4vLyA9PT0gRXhwb3J0ZWQgTWV0aG9kcyA9PT1cclxuXHJcbmV4cG9ydCBjb25zdCBtZXRob2RzOiB7IFtrZXk6IHN0cmluZ106ICguLi5hcmdzOiBhbnkpID0+IGFueSB9ID0ge1xyXG5cclxuICAgIGdldEN1cnJlbnRTY2VuZUluZm8oKSB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogc2NlbmUubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB1dWlkOiBzY2VuZS51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVDb3VudDogc2NlbmUuY2hpbGRyZW4gPyBzY2VuZS5jaGlsZHJlbi5sZW5ndGggOiAwLFxyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZ2V0U2NlbmVIaWVyYXJjaHkoaW5jbHVkZUNvbXBvbmVudHM6IGJvb2xlYW4gPSBmYWxzZSwgbWF4RGVwdGg6IG51bWJlciA9IDMpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBoaWVyYXJjaHkgPSBidWlsZEhpZXJhcmNoeShzY2VuZSwgaW5jbHVkZUNvbXBvbmVudHMsIDAsIG1heERlcHRoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaGllcmFyY2h5IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGdldE5vZGVJbmZvKG5vZGVVdWlkOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbm9kZVRvSW5mbyhub2RlKSB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBnZXRBbGxOb2RlcygpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlczogYW55W10gPSBbXTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gY29sbGVjdChub2RlOiBhbnkpIHtcclxuICAgICAgICAgICAgICAgIG5vZGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHV1aWQ6IG5vZGUudXVpZCxcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlOiBub2RlLmFjdGl2ZSxcclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQ6IG5vZGUucGFyZW50Py51dWlkLFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb2xsZWN0KGNoaWxkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29sbGVjdChzY2VuZSk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgdG90YWxOb2Rlczogbm9kZXMubGVuZ3RoLCBub2RlcyB9IH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGZpbmROb2RlQnlOYW1lKG5hbWU6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdHM6IGFueVtdID0gW107XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHNlYXJjaChub2RlOiBhbnksIHBhdGg6IHN0cmluZykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFBhdGggPSBwYXRoID8gYCR7cGF0aH0vJHtub2RlLm5hbWV9YCA6IG5vZGUubmFtZTtcclxuICAgICAgICAgICAgICAgIGlmIChub2RlLm5hbWUgPT09IG5hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnB1c2goeyB1dWlkOiBub2RlLnV1aWQsIG5hbWU6IG5vZGUubmFtZSwgcGF0aDogY3VycmVudFBhdGggfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAobm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZWFyY2goY2hpbGQsIGN1cnJlbnRQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2VhcmNoKHNjZW5lLCAnJyk7XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgTm8gbm9kZSBmb3VuZCB3aXRoIG5hbWU6ICR7bmFtZX1gIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0cyB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBzZXROb2RlUHJvcGVydHkobm9kZVV1aWQ6IHN0cmluZywgcHJvcGVydHk6IHN0cmluZywgdmFsdWU6IGFueSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAncG9zaXRpb24nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdiA9IHZhbHVlIHx8IHt9O1xyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUuc2V0UG9zaXRpb24odi54ID8/IDAsIHYueSA/PyAwLCB2LnogPz8gMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlICdyb3RhdGlvbic6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gdmFsdWUgfHwge307XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG5vZGUuc2V0Um90YXRpb25Gcm9tRXVsZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRSb3RhdGlvbkZyb21FdWxlcih2LnggPz8gMCwgdi55ID8/IDAsIHYueiA/PyAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXNlICdzY2FsZSc6IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB2ID0gdmFsdWUgfHwge307XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5zZXRTY2FsZSh2LnggPz8gMSwgdi55ID8/IDEsIHYueiA/PyAxKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhc2UgJ2FjdGl2ZSc6XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZS5hY3RpdmUgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgJ25hbWUnOlxyXG4gICAgICAgICAgICAgICAgICAgIG5vZGUubmFtZSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAobm9kZSBhcyBhbnkpW3Byb3BlcnR5XSA9IHZhbHVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgU2V0ICR7cHJvcGVydHl9IG9uIG5vZGUgJHtub2RlVXVpZH1gIH07XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGFkZENvbXBvbmVudFRvTm9kZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBjYy5qcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgaWYgKCFDb21wb25lbnRDbGFzcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IGNsYXNzIG5vdCBmb3VuZDogJHtjb21wb25lbnRUeXBlfWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcCA9IG5vZGUuYWRkQ29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7IGNvbXBvbmVudElkOiBjb21wLnV1aWQgfSxcclxuICAgICAgICAgICAgICAgIG1lc3NhZ2U6IGBBZGRlZCAke2NvbXBvbmVudFR5cGV9IHRvIG5vZGUgJHtub2RlVXVpZH1gLFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICByZW1vdmVDb21wb25lbnRGcm9tTm9kZShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBjYy5qcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgaWYgKCFDb21wb25lbnRDbGFzcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IGNsYXNzIG5vdCBmb3VuZDogJHtjb21wb25lbnRUeXBlfWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcCA9IG5vZGUuZ2V0Q29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcclxuICAgICAgICAgICAgaWYgKCFjb21wKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbm9kZS5yZW1vdmVDb21wb25lbnQoY29tcCk7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG1lc3NhZ2U6IGBSZW1vdmVkICR7Y29tcG9uZW50VHlwZX0gZnJvbSBub2RlICR7bm9kZVV1aWR9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBnZXRDb21wb25lbnRJbmZvKG5vZGVVdWlkOiBzdHJpbmcsIGNvbXBvbmVudFR5cGU/OiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBzY2VuZSA9IHJlcXVpcmVTY2VuZSgpO1xyXG4gICAgICAgICAgICBjb25zdCBub2RlID0gcmVxdWlyZU5vZGUoc2NlbmUsIG5vZGVVdWlkKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghbm9kZS5jb21wb25lbnRzIHx8IG5vZGUuY29tcG9uZW50cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbm9kZVV1aWQsIGNvbXBvbmVudHM6IFtdIH0gfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKCFjb21wb25lbnRUeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0eXBlcyA9IG5vZGUuY29tcG9uZW50cy5tYXAoKGM6IGFueSkgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICB0eXBlOiBjLmNvbnN0cnVjdG9yPy5uYW1lIHx8ICd1bmtub3duJyxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjLmVuYWJsZWQsXHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG5vZGVVdWlkLCBjb21wb25lbnRzOiB0eXBlcyB9IH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbXAgPSBub2RlLmNvbXBvbmVudHMuZmluZCgoYzogYW55KSA9PlxyXG4gICAgICAgICAgICAgICAgYy5jb25zdHJ1Y3Rvcj8ubmFtZSA9PT0gY29tcG9uZW50VHlwZSB8fCBjLmNvbnN0cnVjdG9yPy5uYW1lPy5pbmNsdWRlcyhjb21wb25lbnRUeXBlKVxyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgaWYgKCFjb21wKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbm9kZVV1aWQsXHJcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50VHlwZTogY29tcC5jb25zdHJ1Y3Rvcj8ubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiBjb21wLmVuYWJsZWQsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBzZXRDb21wb25lbnRQcm9wZXJ0eShub2RlVXVpZDogc3RyaW5nLCBjb21wb25lbnRUeXBlOiBzdHJpbmcsIHByb3BlcnR5OiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgQ29tcG9uZW50Q2xhc3MgPSBjYy5qcy5nZXRDbGFzc0J5TmFtZShjb21wb25lbnRUeXBlKTtcclxuICAgICAgICAgICAgaWYgKCFDb21wb25lbnRDbGFzcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgQ29tcG9uZW50IGNsYXNzIG5vdCBmb3VuZDogJHtjb21wb25lbnRUeXBlfWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgY29tcCA9IG5vZGUuZ2V0Q29tcG9uZW50KENvbXBvbmVudENsYXNzKTtcclxuICAgICAgICAgICAgaWYgKCFjb21wKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGBDb21wb25lbnQgJHtjb21wb25lbnRUeXBlfSBub3QgZm91bmQgb24gbm9kZWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gU3BlY2lhbCBoYW5kbGluZyBmb3IgYXNzZXQtdHlwZSBwcm9wZXJ0aWVzIChhc3luYyBsb2FkKVxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJyAmJiAocHJvcGVydHkgPT09ICdzcHJpdGVGcmFtZScgfHwgcHJvcGVydHkgPT09ICdtYXRlcmlhbCcpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBGaXJlLWFuZC1mb3JnZXQgYXN5bmMgYXNzZXQgbG9hZFxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjYy5hc3NldE1hbmFnZXIubG9hZEFueSh2YWx1ZSwgKGVycjogYW55LCBhc3NldDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghZXJyICYmIGFzc2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoY29tcCBhcyBhbnkpW3Byb3BlcnR5XSA9IGFzc2V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBJZ25vcmUgYXN5bmMgZXJyb3JzXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBgTG9hZGluZyBhc3NldCBmb3IgJHtjb21wb25lbnRUeXBlfS4ke3Byb3BlcnR5fWAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gRGlyZWN0IHByb3BlcnR5IGFzc2lnbm1lbnRcclxuICAgICAgICAgICAgKGNvbXAgYXMgYW55KVtwcm9wZXJ0eV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogYFNldCAke2NvbXBvbmVudFR5cGV9LiR7cHJvcGVydHl9YCB9O1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBlcnJvci5tZXNzYWdlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuXHJcbiAgICBpbnN0YW50aWF0ZVByZWZhYihhc3NldFV1aWQ6IHN0cmluZywgcGFyZW50VXVpZD86IHN0cmluZywgbmFtZT86IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGNjID0gcmVxdWlyZSgnY2MnKTtcclxuICAgICAgICAgICAgY29uc3Qgc2NlbmUgPSByZXF1aXJlU2NlbmUoKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY2MuYXNzZXRNYW5hZ2VyLmxvYWRBbnkoYXNzZXRVdWlkLCAoZXJyOiBhbnksIHByZWZhYjogYW55KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBgRmFpbGVkIHRvIGxvYWQgcHJlZmFiOiAke2Vyci5tZXNzYWdlIHx8IGVycn1gIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghcHJlZmFiIHx8IHByZWZhYi5jb25zdHJ1Y3Rvcj8ubmFtZSAhPT0gJ1ByZWZhYicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0Fzc2V0IGlzIG5vdCBhIFByZWZhYicgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vZGUgPSBjYy5pbnN0YW50aWF0ZShwcmVmYWIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChuYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5vZGUubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBGaW5kIHBhcmVudFxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXJlbnQgPSBzY2VuZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGFyZW50VXVpZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3VuZCA9IGZpbmROb2RlQnlVdWlkRGVlcChzY2VuZSwgcGFyZW50VXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmb3VuZCkgcGFyZW50ID0gZm91bmQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBwYXJlbnQuYWRkQ2hpbGQobm9kZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgdXVpZDogbm9kZS51dWlkLCBuYW1lOiBub2RlLm5hbWUgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogYFByZWZhYiBpbnN0YW50aWF0ZWQ6ICR7bm9kZS5uYW1lfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICByZXR1cm4geyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGNyZWF0ZVByZWZhYkZyb21Ob2RlKG5vZGVVdWlkOiBzdHJpbmcsIHByZWZhYlBhdGg6IHN0cmluZykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHNjZW5lID0gcmVxdWlyZVNjZW5lKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IG5vZGUgPSByZXF1aXJlTm9kZShzY2VuZSwgbm9kZVV1aWQpO1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICBub2RlVXVpZDogbm9kZS51dWlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG5vZGVOYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogcHJlZmFiUGF0aCxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiBgUHJlZmFiIGNyZWF0aW9uIGluaXRpYXRlZCBmb3Igbm9kZTogJHtub2RlLm5hbWV9YCxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAgZXhlY3V0ZVNjcmlwdChjb2RlOiBzdHJpbmcpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBjYyA9IHJlcXVpcmUoJ2NjJyk7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgZGlyZWN0b3IgfSA9IGNjO1xyXG4gICAgICAgICAgICBjb25zdCBmbiA9IG5ldyBGdW5jdGlvbignY2MnLCAnZGlyZWN0b3InLCBjb2RlKTtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gZm4oY2MsIGRpcmVjdG9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiByZXN1bHQgIT09IHVuZGVmaW5lZCA/IHJlc3VsdCA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnU2NyaXB0IGV4ZWN1dGVkJyxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogZXJyb3IubWVzc2FnZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbn07XHJcbiJdfQ==