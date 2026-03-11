'use strict';

module.exports = {
    'open_panel': 'MCP Server Panel',
    'description': 'MCP Server extension for AI-powered Cocos Creator control',
    'panel_title': 'Cocos MCP Server',

    // Panel sections
    'panel': {
        'mcp_server': 'MCP Server',
        'tools': 'Tools',
        'logs': 'Logs',

        // Labels
        'status': 'Status',
        'enable': 'Enable',
        'port': 'Port',
        'auto_start': 'Auto Start',

        // Status
        'running': 'Running ({0} tools / {1} actions)',
        'stopped': 'Stopped',

        // Buttons
        'select_all': 'Select All',
        'deselect_all': 'Deselect All',
        'tools_enabled': '{0} / {1} tools enabled',

        // Category groups
        'core': 'Core',
        'advanced': 'Advanced',

        // Category actions
        'all': 'All',
        'none': 'None',

        // Log messages
        'server_started': 'Server started',
        'server_stopped': 'Server stopped',
        'start_failed': 'Start failed: {0}',
        'port_updated': 'Port updated to {0}',
        'auto_start_enabled': 'Auto-start enabled',
        'auto_start_disabled': 'Auto-start disabled',
        'all_tools_enabled': 'All tools enabled',
        'all_tools_disabled': 'All tools disabled',
        'category_all_enabled': '{0}: all enabled',
        'category_all_disabled': '{0}: all disabled',
        'toggle_failed': 'Failed to toggle {0}: {1}',
        'failed': 'Failed: {0}',
    },

    // Tool descriptions
    'tool_desc': {
        // scene
        'scene_query': 'Get current scene info and hierarchy tree',
        'scene_list': 'List all scene files in the project',
        'scene_open': 'Open a scene by db:// path',
        'scene_save': 'Save the current scene',
        'scene_create': 'Create a new scene asset',
        'scene_snapshot': 'Create an undo snapshot of current scene',
        'scene_dirty': 'Check if the current scene has unsaved changes',
        'scene_reload': 'Soft reload the current scene',
        'scene_classes': 'List all registered component classes',
        'scene_close': 'Close the current scene',
        'scene_save_as': 'Save the current scene as a new scene file',
        'scene_ready': 'Check if the scene editor is ready',
        'scene_bounds': 'Get the bounding box of the current scene view',

        // node
        'node_query': 'Query node by UUID, name, or list all nodes. Use includeComponents for detailed component info in one call',
        'node_create': 'Create a new node with optional transform, components, and prefab instantiation in one call',
        'node_delete': 'Delete a node from the scene',
        'node_set_property': 'Set one or multiple node properties at once. Use "properties" for batch, or "property"+"value" for single',
        'node_duplicate': 'Duplicate a node (copy + paste)',
        'node_reset_transform': 'Reset node position/rotation/scale to defaults',
        'node_find_by_asset': 'Find all nodes using a specific asset UUID',
        'node_move': 'Move node to a new parent',

        // component
        'component_add': 'Add a component to a node',
        'component_remove': 'Remove a component from a node (uses component type/cid)',
        'component_query': 'Query components on a node. Without componentType returns type list only',
        'component_set_property': 'Set one or multiple component properties at once. Use "properties" array for batch, or single "property"+"propertyType"+"value"',
        'component_reset': 'Reset a component to its default values',
        'component_list_types': 'List all available component types that can be added to nodes',
        'component_query_detail': 'Query a single component by its UUID (from query-node results)',
        'component_execute_method': 'Execute a method on a component at runtime',
        'component_list_all': 'List all registered components with details (name, cid, script path, asset UUID)',

        // asset
        'asset_query': 'Query assets by pattern, UUID, or URL',
        'asset_create': 'Create a new asset file',
        'asset_delete': 'Delete an asset',
        'asset_move': 'Move or rename an asset',
        'asset_import': 'Import an external file as an asset into the project',
        'asset_info': 'Get detailed asset metadata including dependencies and library info',
        'asset_query_uuid': 'Convert between asset URL and UUID',
        'asset_copy': 'Copy an asset to a new location',
        'asset_save': 'Save/overwrite content of an existing asset',
        'asset_query_meta': 'Get asset meta information (import settings, sub-assets config)',
        'asset_query_users': 'Find which assets or scripts reference this asset (reverse dependency)',
        'asset_query_dependencies': 'Find which assets this asset depends on (forward dependency)',
        'asset_open': 'Open an asset in the editor (e.g. open a script in code editor, a scene in scene editor)',
        'asset_reimport': 'Re-import an asset (regenerate compiled/library files)',

        // prefab
        'prefab_list': 'List all prefab assets in the project',
        'prefab_instantiate': 'Instantiate a prefab into the scene',
        'prefab_create': 'Create a prefab from an existing scene node',
        'prefab_restore': 'Restore a prefab instance node to its original prefab state',
        'prefab_create_empty': 'Create a new empty prefab asset directly (no scene node needed)',

        // project
        'project_info': 'Get project path, engine version, and optional settings',
        'project_refresh': 'Refresh the asset database',
        'project_build': 'Build project for a target platform',
        'project_preview': 'Start or stop game preview in browser',
        'project_query_config': 'Read a project-level configuration value',
        'project_set_config': 'Set a project-level configuration value',

        // debug
        'debug_get_logs': 'Get recent console logs from the extension',
        'debug_clear_logs': 'Clear the log buffer',
        'debug_execute_script': 'Execute JavaScript in scene context (has access to cc.* APIs)',

        // scene_view
        'scene_view_gizmo_tool': 'Get or set gizmo tool type (position/rotation/scale/rect)',
        'scene_view_gizmo_pivot': 'Get or set gizmo pivot (pivot/center)',
        'scene_view_gizmo_coordinate': 'Get or set gizmo coordinate system (local/global)',
        'scene_view_view_mode': 'Get or set 2D/3D view mode',
        'scene_view_grid': 'Show or hide the scene grid',
        'scene_view_focus': 'Focus scene camera on specific node(s)',
        'scene_view_align_camera': 'Align scene camera with current view',
        'scene_view_align_view': 'Align view with a specific node',
        'scene_view_icon_gizmo': 'Get or set icon gizmo settings (3D mode and size)',
        'scene_view_status': 'Get all scene view settings at once',

        // editor
        'editor_preferences_query': 'Read editor or project preferences by key',
        'editor_preferences_set': 'Write editor or project preferences',
        'editor_open_settings': 'Open the editor preferences panel',
        'editor_network_info': 'Get server IPs and preview port information',
        'editor_editor_info': 'Get editor version, platform, and Node.js version',
        'editor_engine_info': 'Get engine version, path, and native engine info',
        'editor_open_url': 'Open a URL or external program',
        'editor_query_devices': 'Query connected devices (for native platform debugging)',

        // reference_image
        'reference_image_add': 'Add a reference image to the scene view',
        'reference_image_remove': 'Remove a reference image by index',
        'reference_image_switch': 'Switch active reference image by index',
        'reference_image_set_property': 'Set reference image properties (position, scale, opacity)',
        'reference_image_query': 'Get all reference image configurations',
        'reference_image_query_current': 'Get the current active reference image info',
        'reference_image_clear': 'Remove all reference images',

        // animation
        'animation_list_clips': 'List animation clips on a node',
        'animation_play': 'Play an animation clip on a node',
        'animation_stop': 'Stop animation on a node',
        'animation_set_clip': 'Set default animation clip or animation properties on a node',
    },
};
