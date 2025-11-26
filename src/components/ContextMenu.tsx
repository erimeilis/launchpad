import {useTranslation} from 'react-i18next'
import type {ContextMenuPosition} from '../types'
import {Button} from './ui/Button'

interface ContextMenuProps {
    position: ContextMenuPosition;
    onCreateFolder: () => void;
    onSortAlphabetically: () => void;
    onEditApps: () => void;
    onResetTags: () => void;
    onLanguageSettings: () => void;
    onGridLayoutSettings: () => void;
    onHotCornersSettings: () => void;
    onKeyboardShortcutsSettings: () => void;
    onCustomTagsSettings: () => void;
    onAbout: () => void;
    editMode: boolean;
}

/**
 * Right-click context menu for creating folders and accessing settings
 */
export function ContextMenu({
                                position,
                                onCreateFolder,
                                onSortAlphabetically,
                                onEditApps,
                                onResetTags,
                                onLanguageSettings,
                                onGridLayoutSettings,
                                onHotCornersSettings,
                                onKeyboardShortcutsSettings,
                                onCustomTagsSettings,
                                onAbout,
                                editMode,
                            }: ContextMenuProps) {
    const {t} = useTranslation()

    const menuItemClass = 'w-full text-sm text-[var(--text-primary)] hover:bg-[var(--menu-hover)] active:bg-[var(--menu-active)]'

    return (
        <div
            className="fixed min-w-[200px] px-1.5 py-1 rounded-md bg-[var(--menu-bg)] backdrop-blur-[60px] saturate-[180%] shadow-[0_0_0_0.5px_var(--border-modal),0_10px_30px_rgba(0,0,0,0.7)] z-[2000] animate-[contextMenuFadeIn_0.12s_cubic-bezier(0.16,1,0.3,1)]"
            style={{left: position.x, top: position.y}}
            onClick={(e) => e.stopPropagation()}
        >
            <Button
                onClick={onCreateFolder}
                variant="ghost"
                align="left"
                size="sm"
                className={menuItemClass}>
                {t('contextMenu.createFolder')}
            </Button>
            <Button
                onClick={onSortAlphabetically}
                variant="ghost"
                align="left"
                size="sm"
                className={menuItemClass}>
                {t('contextMenu.sortAlphabetically')}
            </Button>
            <Button
                onClick={onEditApps}
                variant="ghost"
                align="left"
                size="sm"
                className={menuItemClass}>
                {editMode ? t('contextMenu.doneEditing') : t('contextMenu.editApps')}
            </Button>
            <div className="h-px bg-[var(--border-secondary)] my-1"/>
            <Button
                onClick={onLanguageSettings}
                variant="ghost"
                align="left"
                size="sm"
                className={menuItemClass}>
                {t('contextMenu.language')}
            </Button>
            <Button
                onClick={onGridLayoutSettings}
                variant="ghost"
                align="left"
                size="sm"
                className={menuItemClass}>
                {t('contextMenu.gridLayout')}
            </Button>
            <Button
                onClick={onHotCornersSettings}
                variant="ghost"
                align="left"
                size="sm"
                className={menuItemClass}>
                {t('contextMenu.hotCorners')}
            </Button>
            <Button
                onClick={onKeyboardShortcutsSettings}
                variant="ghost"
                align="left"
                size="sm"
                className={menuItemClass}>
                {t('contextMenu.keyboardShortcuts')}
            </Button>
            <Button
                onClick={onCustomTagsSettings}
                variant="ghost"
                align="left"
                size="sm"
                className={menuItemClass}>
                {t('contextMenu.customTags')}
            </Button>
            <div className="h-px bg-[var(--border-secondary)] my-1"/>
            <Button
                onClick={onResetTags}
                variant="ghost"
                align="left"
                size="sm"
                className={menuItemClass}>
                {t('contextMenu.resetAllTags')}
            </Button>
            <div className="h-px bg-[var(--border-secondary)] my-1"/>
            <Button
                onClick={onAbout}
                variant="ghost"
                align="left"
                size="sm"
                className={menuItemClass}>
                {t('contextMenu.about')}
            </Button>
        </div>
    )
}
