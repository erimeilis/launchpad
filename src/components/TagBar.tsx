/**
 * TagBar component for displaying and filtering by tags
 */

import {GridFourIcon} from '@phosphor-icons/react'
import {useTranslation} from 'react-i18next'
import type {Tag} from '../types'
import {Button} from './ui/Button'

interface TagBarProps {
    tags: Tag[];
    selectedTag: string | null;
    onTagSelect: (tagKey: string | null) => void;
    totalAppsCount: number;
}

export function TagBar({tags, selectedTag, onTagSelect, totalAppsCount}: TagBarProps) {
    const {t} = useTranslation()

    const pillClass = (isActive: boolean) =>
        `px-3 py-1 flex items-center gap-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-all duration-200 whitespace-nowrap ${
            isActive
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/90'
        }`

    return (
        <div className="mb-4 px-6 flex justify-center">
            <div className="flex gap-2 overflow-x-auto max-w-full pb-1 scrollbar-hide">
                {/* "All" pill */}
                <Button variant="unstyled" className={pillClass(selectedTag === null)} onClick={() => onTagSelect(null)}>
                    <GridFourIcon size={16} weight="regular"/>
                    <span>{t('tags.all')}</span>
                    <span className="text-white/50">({totalAppsCount})</span>
                </Button>

                {/* Tag pills */}
                {tags.map((tag) => {
                    const label = tag.isCustom ? tag.label : t(tag.labelKey!)
                    const TagIcon = tag.icon

                    return (
                        <Button
                            key={tag.key}
                            variant="unstyled"
                            className={pillClass(selectedTag === tag.key)}
                            onClick={() => onTagSelect(tag.key === selectedTag ? null : tag.key)}
                        >
                            {TagIcon && <TagIcon size={16} weight="regular"/>}
                            <span>{label}</span>
                            <span className="text-white/50">({tag.count})</span>
                        </Button>
                    )
                })}
            </div>
        </div>
    )
}
