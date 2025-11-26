import type {App} from '../types'
import {IconContainer} from './ui/IconContainer'
import {Button} from './ui/Button'

interface AppItemProps {
    app: App;
    isDragging: boolean;
    isDragOver: boolean;
    isFolderJoinTarget: boolean;
    editMode: boolean;
    onLaunch: (appPath: string) => void;
    onRemove?: (bundleId: string) => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseEnter: () => void;
    onMouseUp: () => void;
}

/**
 * Individual app item component with icon and name
 * Handles drag operations and app launching
 */
export function AppItem({
                            app,
                            isDragging,
                            isDragOver,
                            isFolderJoinTarget,
                            editMode,
                            onLaunch,
                            onRemove,
                            onContextMenu,
                            onMouseDown,
                            onMouseEnter,
                            onMouseUp,
                        }: AppItemProps) {
    return (
        <div
            className={`gap-2 app-item relative flex flex-col items-center w-[100px] cursor-pointer transition-all duration-200 select-none ${
                isDragging ? 'opacity-30 scale-90' : ''
            } ${isDragOver && !isFolderJoinTarget ? 'scale-110' : ''} ${isFolderJoinTarget ? 'animate-folder-join' : ''} ${editMode ? 'animate-jiggle' : ''} hover:scale-105 active:scale-95`}
            onClick={() => {
                if (!isDragging && !editMode) onLaunch(app.path)
            }}
            onContextMenu={onContextMenu}
            onMouseDown={onMouseDown}
            onMouseEnter={onMouseEnter}
            onMouseUp={onMouseUp}
            title={app.name}
            draggable="false"
        >
            {editMode && onRemove && (
                <Button
                    variant="unstyled"
                    className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#ff453a] text-white text-xs font-bold cursor-pointer z-10 flex items-center justify-center shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:bg-[#ff6961]"
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove(app.bundle_id)
                    }}
                    title={`Remove ${app.name}`}
                >
                    ×
                </Button>
            )}
            <IconContainer>
                {app.icon ? (
                    <img src={app.icon} alt={app.name} className="w-full h-full object-contain" draggable="false"/>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-2xl font-semibold text-white">
                        {app.name.charAt(0).toUpperCase()}
                    </div>
                )}
            </IconContainer>
            <div className="text-[11px] text-white text-center max-w-[90px] truncate text-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {app.name}
            </div>
        </div>
    )
}
