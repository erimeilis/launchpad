import {CheckIcon, Icon} from '@phosphor-icons/react'
import type {ReactNode} from 'react'
import {Button} from './Button'

interface MenuItemProps {
    icon?: Icon;
    iconSize?: number;
    checked?: boolean;
    onClick?: () => void;
    children: ReactNode;
    deleteButton?: ReactNode;
    variant?: 'ghost' | 'accent';
}

export function MenuItem({
                             icon,
                             checked,
                             onClick,
                             children,
                             deleteButton,
                             variant = 'ghost',
                         }: MenuItemProps) {
    return (
        <div className="w-full">
            <Button
                onClick={onClick}
                variant={variant}
                align="left"
                prefixIcon={icon}
                suffixIcon={checked ? CheckIcon : undefined}
                size="sm"
                className="w-full"
            >
                {children}
            </Button>
            {deleteButton}
        </div>
    )
}
