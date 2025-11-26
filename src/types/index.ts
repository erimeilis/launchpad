/**
 * Type definitions for Launchpad application
 */

import type { Icon } from "@phosphor-icons/react";

/**
 * Represents a macOS application
 */
export interface App {
  name: string;
  bundle_id: string;
  path: string;
  icon: string | null;
  source_folder?: string;
  tags: string[]; // Auto-detected category tags
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
 * Represents a tag for categorizing apps
 */
export interface Tag {
  key: string;
  label: string;
  labelKey?: string;
  icon: Icon;
  iconName: string;
  count: number;
  isCustom: boolean;
  isDeletable: boolean;
}

/**
 * Definition for a custom user-created tag
 */
export interface CustomTagDefinition {
  key: string;
  label: string;
  iconName: string;
}

/**
 * Settings for tag functionality
 */
export interface TagSettings {
  showTagBar: boolean;
  autoTagNewApps: boolean;
  customTags: CustomTagDefinition[];
}

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
  globalShortcut: string;
  tagSettings: TagSettings;
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
