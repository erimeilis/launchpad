import type {Icon} from '@phosphor-icons/react'
import type {MouseEvent, ReactNode} from 'react'

interface ButtonProps {
    children?: ReactNode;
    onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
    variant?: 'default' | 'ghost' | 'accent' | 'danger' | 'unstyled';
    size?: 'sm' | 'md' | 'lg';
    align?: 'left' | 'center';
    prefixIcon?: Icon;
    suffixIcon?: Icon;
    className?: string;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    title?: string;
    style?: React.CSSProperties;
    'aria-label'?: string;
}

const variantClasses = {
    default: 'text-[var(--text-primary)] hover:bg-[var(--bg-quaternary)]',
    ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]',
    accent: 'bg-[var(--accent-color)] text-white font-medium hover:opacity-90',
    danger: 'text-[var(--danger-red)] hover:bg-[var(--danger-bg)]',
    unstyled: '',
}

const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-4 text-base gap-2.5',
}

const iconSizeMap = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
}

export function Button({
                           children,
                           onClick,
                           variant = 'default',
                           size = 'md',
                           align = 'center',
                           prefixIcon: PrefixIcon,
                           suffixIcon: SuffixIcon,
                           className = '',
                           disabled = false,
                           type = 'button',
                           title,
                           style,
                           'aria-label': ariaLabel,
                       }: ButtonProps) {
    const computedIconSize = iconSizeMap[size]
    const alignClass = align === 'left' ? 'justify-start text-left' : 'justify-center text-center'

    const baseClasses = variant === 'unstyled'
        ? ''
        : 'inline-flex items-center rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={style}
            aria-label={ariaLabel}
            className={`
        ${baseClasses}
        ${variant !== 'unstyled' ? alignClass : ''}
        ${variantClasses[variant]}
        ${variant !== 'unstyled' ? sizeClasses[size] : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
        >
            {PrefixIcon && (
                <PrefixIcon className={computedIconSize}/>
            )}
            {children}
            {SuffixIcon && (
                <SuffixIcon className={computedIconSize}/>
            )}
        </button>
    )
}
