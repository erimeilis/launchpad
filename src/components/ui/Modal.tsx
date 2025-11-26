import type {ReactNode} from 'react'

interface ModalProps {
    children: ReactNode;
    onClose: () => void;
    /** Title displayed at the top of the modal */
    title?: string;
    /** Maximum width of the modal content (default: 380px) */
    maxWidth?: string;
    /** Additional padding for the modal content (default: p-7) */
    padding?: string;
    /** Center text content */
    centered?: boolean;
    /** Custom className for the content container */
    className?: string;
}

/**
 * Reusable modal component with backdrop blur and slide-up animation
 * Handles click-outside-to-close and stopPropagation
 */
export function Modal({
                          children,
                          onClose,
                          title,
                          maxWidth = '480px',
                          padding = 'px-6 py-4',
                          centered = false,
                          className = '',
                      }: ModalProps) {
    return (
        <div
            className="fixed inset-0 bg-[var(--bg-modal-backdrop)] backdrop-blur-[20px] flex items-center justify-center z-[1000] animate-[fadeIn_0.2s_ease]"
            onClick={onClose}
        >
            <div
                className={`bg-[var(--bg-modal)] rounded-2xl ${padding} w-[90%] shadow-[0_0_0_0.5px_var(--border-modal),0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-[60px] saturate-[180%] animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)] ${centered ? 'text-center' : ''} ${className}`}
                style={{maxWidth}}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <h2 className="m-0 mb-6 text-xl font-semibold text-[var(--text-primary)] tracking-tight">
                        {title}
                    </h2>
                )}
                {children}
            </div>
        </div>
    )
}
