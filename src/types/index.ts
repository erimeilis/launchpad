/**
 * Type definitions for Launchpad application
 */

/**
 * Represents a macOS application
 */
export interface App {
  name: string;
  bundle_id: string;
  path: string;
  icon: string | null;
  source_folder?: string;
}

/**
 * Represents a folder containing apps
 */
export interface Folder {
  id: string;
  name: string;
  apps: App[];
}

/**
 * Union type for items that can be displayed in the launchpad grid
 */
export type LaunchpadItem = App | Folder;

/**
 * Grid settings configuration
 */
export interface GridSettings {
  rows: number;
  cols: number;
  fullWidth: boolean;
  hotCornerEnabled: boolean;
  hotCorner: string;
  hotCornerThreshold: number;
  hotCornerDebounce: number;
}

/**
 * Context menu position
 */
export interface ContextMenuPosition {
  x: number;
  y: number;
}

/**
 * Mouse position coordinates
 */
export interface MousePosition {
  x: number;
  y: number;
}

/**
 * Delete confirmation state
 */
export interface DeleteConfirmationState {
  folderId: string;
  folderName: string;
}

/**
 * Mouse down item state for drag operations
 */
export interface MouseDownItemState {
  index: number;
  item: LaunchpadItem;
}

/**
 * Type guard to check if an item is a Folder
 */
export function isFolder(item: LaunchpadItem): item is Folder {
  return "apps" in item;
}
