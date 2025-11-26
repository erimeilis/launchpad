/**
 * Tag definitions and constants for app categorization
 */

import * as PhosphorIcons from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

/**
 * Predefined tag definition with icon mapping
 */
interface PredefinedTagDefinition {
  key: string;
  labelKey: string;
  icon: Icon;
  iconName: string;
}

/**
 * All predefined tags with Phosphor Icons
 * Reduced to 8 practical desktop app categories
 */
export const PREDEFINED_TAGS: PredefinedTagDefinition[] = [
  {
    key: "dev-tools",
    labelKey: "tags.devTools",
    icon: PhosphorIcons.Code,
    iconName: "Code",
  },
  {
    key: "social",
    labelKey: "tags.social",
    icon: PhosphorIcons.ChatsCircle,
    iconName: "ChatsCircle",
  },
  {
    key: "browsers",
    labelKey: "tags.browsers",
    icon: PhosphorIcons.Globe,
    iconName: "Globe",
  },
  {
    key: "utilities",
    labelKey: "tags.utilities",
    icon: PhosphorIcons.Wrench,
    iconName: "Wrench",
  },
  {
    key: "entertainment",
    labelKey: "tags.entertainment",
    icon: PhosphorIcons.Television,
    iconName: "Television",
  },
  {
    key: "creativity",
    labelKey: "tags.creativity",
    icon: PhosphorIcons.Palette,
    iconName: "Palette",
  },
  {
    key: "planning",
    labelKey: "tags.planning",
    icon: PhosphorIcons.CalendarBlank,
    iconName: "CalendarBlank",
  },
  {
    key: "office",
    labelKey: "tags.office",
    icon: PhosphorIcons.Briefcase,
    iconName: "Briefcase",
  },
];

/**
 * Get tag definition by key
 */
export function getTagDefinition(
  key: string,
): PredefinedTagDefinition | undefined {
  return PREDEFINED_TAGS.find((tag) => tag.key === key);
}

// Import the icon map from CreateTagModal for custom tag icon lookups
import { ICON_MAP } from "../components/CreateTagModal";

/**
 * Get icon component by icon name (Phosphor icons)
 * Supports all 1512+ icons from @phosphor-icons/react
 * Handles both "Code" and "CodeIcon" formats for compatibility
 */
export function getIconByName(iconName: string): Icon | undefined {
  // First, try the ICON_MAP (works for all icons in CreateTagModal's AVAILABLE_ICONS)
  const mappedIcon = ICON_MAP.get(iconName);
  if (mappedIcon) {
    return mappedIcon;
  }

  // Fallback: try namespace import (for predefined tags)
  let icon = (PhosphorIcons as Record<string, unknown>)[iconName];

  // If not found and name ends with "Icon", try without the suffix
  if (!icon && iconName.endsWith("Icon")) {
    const nameWithoutSuffix = iconName.slice(0, -4);
    icon = (PhosphorIcons as Record<string, unknown>)[nameWithoutSuffix];
  }

  // Verify it's a valid icon component
  if (typeof icon === 'function') {
    return icon as Icon;
  }

  return undefined;
}
