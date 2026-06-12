/**
 * 工具總表：main.buildRegistry 經由此模組載入全部工具。
 * 使用動態 require（非頂層 import），讓 dev.reload_tools 清 cache 後
 * 連「新增的工具模組」也能熱載入，不需重啟編輯器。
 */
import { ToolDef } from '../types';

export function createAllTools(): ToolDef[] {
    /* eslint-disable @typescript-eslint/no-var-requires */
    return [
        require('./project').createProjectTool(),
        require('./scene').createSceneTool(),
        require('./node').createNodeTool(),
        require('./component').createComponentTool(),
        require('./asset').createAssetTool(),
        require('./prefab').createPrefabTool(),
        require('./scene-view').createSceneViewTool(),
        require('./editor').createEditorTool(),
    ];
    /* eslint-enable @typescript-eslint/no-var-requires */
}
