import type {ReactNode} from 'react'

interface IconContainerProps {
    children: ReactNode;
    /** Size of the container (default: 64px / w-16 h-16) */
    size?: 'sm' | 'md' | 'lg';
    /** Additional className for the outer wrapper */
    className?: string;
}

const sizeClasses = {
    sm: 'w-14 h-14',  // 56px - for folder modal apps
    md: 'w-16 h-16',  // 64px - default for grid items
    lg: 'w-20 h-20',  // 80px - larger icons if needed
}

const radiusClasses = {
    sm: 'rounded-[12px]',
    md: 'rounded-[14px]',
    lg: 'rounded-[16px]',
}

/**
 * Reusable icon container with macOS-style appearance
 * Provides shadow, gradient overlay, and highlight border for depth effect
 */
export function IconContainer({children, size = 'md', className = ''}: IconContainerProps) {
    const sizeClass = sizeClasses[size]
    const radiusClass = radiusClasses[size]

    return (
        <div className={`icon-container relative ${sizeClass} ${className}`}>
            {/* Main container with shadow */}
            <div className={`relative w-full h-full ${radiusClass} overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.2)]`}>
                {children}
            </div>
            {/* Gradient overlay for volume/depth effect */}
            <div className={`absolute inset-0 ${radiusClass} bg-gradient-to-b from-white/15 via-transparent to-black/10 pointer-events-none`}/>
            {/* Border - using box-shadow for crisp rendering that won't clip */}
            <div className={`absolute inset-0 ${radiusClass} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2),inset_0_-1px_0_0_rgba(0,0,0,0.2)] pointer-events-none`}/>
        </div>
    )
}
