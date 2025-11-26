import {useState} from 'react'
import {CaretRightIcon, PlusIcon} from '@phosphor-icons/react'
import {useTranslation} from 'react-i18next'
import type {ContextMenuPosition, Tag} from '../types'
import {MenuItem} from './ui/MenuItem'
import {Button} from './ui/Button'

interface AppContextMenuProps {
    position: ContextMenuPosition;
    appName: string;
    appTags: string[];
    availableTags: Tag[];
    onOpen: () => void;
    onRevealInFinder: () => void;
    onMoveToTrash: () => void;
    onToggleTag: (tagKey: string) => void;
    onCreateTag: () => void;
    onClose: () => void;
}

const menuItemClass = 'w-full text-sm text-[var(--text-primary)] hover:bg-[var(--menu-hover)] active:bg-[var(--menu-active)]'

/**
 * Context menu for individual app items
 */
export function AppContextMenu({
                                   position,
                                   appName: _appName,
                                   appTags,
                                   availableTags,
                                   onOpen,
                                   onRevealInFinder,
                                   onMoveToTrash,
                                   onToggleTag,
                                   onCreateTag,
                                   onClose,
                               }: AppContextMenuProps) {
    const {t} = useTranslation()
    const [showTagSubmenu, setShowTagSubmenu] = useState(false)

    return (
        <div
            className="fixed min-w-[200px] px-1.5 py-1 rounded-md bg-[var(--menu-bg)] backdrop-blur-[60px] saturate-[180%] shadow-[0_0_0_0.5px_var(--border-modal),0_10px_30px_rgba(0,0,0,0.7)] z-[2000] animate-[contextMenuFadeIn_0.12s_cubic-bezier(0.16,1,0.3,1)]"
            style={{left: position.x, top: position.y}}
            onClick={(e) => e.stopPropagation()}
        >
            <Button
                onClick={() => {
                    onOpen()
                    onClose()
                }}
                align="left"
                variant="ghost"
                size="sm"
                className={menuItemClass}
            >
                {t('appContextMenu.open')}
            </Button>
            <Button
                onClick={() => {
                    onRevealInFinder()
                    onClose()
                }}
                align="left"
                variant="ghost"
                size="sm"
                className={menuItemClass}
            >
                {t('appContextMenu.revealInFinder')}
            </Button>
            <div className="h-px bg-[var(--border-secondary)] my-1"/>

            {/* Tag management */}
            <Button
                suffixIcon={CaretRightIcon}
                onClick={() => setShowTagSubmenu(!showTagSubmenu)}
                variant="ghost"
                align="left"
                size="sm"
                className={`${menuItemClass} justify-between`}
            >
                {t('appContextMenu.manageTags')}
            </Button>

            {showTagSubmenu && (
                <div
                    className="absolute left-full top-0 ml-1 min-w-[200px] max-h-[400px] overflow-y-auto bg-[var(--bg-modal)] backdrop-blur-[40px] border border-white/20 rounded-lg p-1 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                    {availableTags.map((tag) => {
                        const TagIcon = tag.icon
                        const label = tag.isCustom ? tag.label : t(tag.labelKey!)
                        return (
                            <MenuItem
                                key={tag.key}
                                icon={TagIcon}
                                checked={appTags.includes(tag.key)}
                                onClick={() => onToggleTag(tag.key)}
                            >
                                {label}
                            </MenuItem>
                        )
                    })}

                    <div className="h-px bg-[var(--border-secondary)] my-1"/>
                    <Button
                        variant="accent"
                        prefixIcon={PlusIcon}
                        onClick={onCreateTag}
                        align="left"
                        size="sm"
                        className="w-full"
                    >
                        {t('appContextMenu.createNewTag')}
                    </Button>
                </div>
            )}

            <div className="h-px bg-[var(--border-secondary)] my-1"/>
            <Button
                variant="danger"
                align="left"
                size="sm"
                onClick={() => {
                    onMoveToTrash()
                    onClose()
                }}
                className={menuItemClass}
            >
                {t('appContextMenu.moveToTrash')}
            </Button>
        </div>
    )
}
