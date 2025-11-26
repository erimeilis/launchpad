import type {Folder} from '../types'
import {IconContainer} from './ui/IconContainer'

interface FolderItemProps {
    folder: Folder;
    isDragging: boolean;
    isDragOver: boolean;
    onClick: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseEnter: () => void;
    onMouseUp: () => void;
}

/**
 * Folder item component with preview of contained apps
 */
export function FolderItem({
                               folder,
                               isDragging,
                               isDragOver,
                               onClick,
                               onMouseDown,
                               onMouseEnter,
                               onMouseUp,
                           }: FolderItemProps) {
    const previewApps = folder.apps.slice(0, 4)

    return (
        <div
            className={`gap-2 folder-item relative flex flex-col items-center w-[100px] cursor-pointer transition-all duration-200 select-none ${
                isDragging ? 'opacity-30 scale-90' : ''
            } ${isDragOver ? 'scale-110 brightness-125' : ''} hover:scale-105 active:scale-95`}
            onClick={onClick}
            onMouseDown={onMouseDown}
            onMouseEnter={onMouseEnter}
            onMouseUp={onMouseUp}
            title={folder.name}
            draggable="false"
        >
            <IconContainer>
                <div className="w-full h-full bg-white/20 backdrop-blur-xl">
                    <div className="grid grid-cols-2 gap-1 p-1.5 w-full h-full">
                        {previewApps.map((app) => (
                            <div key={app.bundle_id} className="flex items-center justify-center">
                                {app.icon ? (
                                    <img src={app.icon} alt={app.name} className="w-6 h-6 object-contain rounded-[4px]" draggable="false"/>
                                ) : (
                                    <div
                                        className="w-6 h-6 rounded-[4px] bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-[8px] text-white font-semibold">
                                        {app.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </IconContainer>
            <div className="text-[11px] text-white text-center max-w-[90px] truncate text-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {folder.name}
            </div>
        </div>
    )
}
