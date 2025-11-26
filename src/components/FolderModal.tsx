import type {App, Folder} from '../types'
import {Modal} from './ui/Modal'
import {IconContainer} from './ui/IconContainer'
import {Button} from './ui/Button'

interface FolderModalProps {
    folder: Folder;
    isDragging: boolean;
    onClose: () => void;
    onLaunchApp: (appPath: string) => void;
    onUpdateName: (name: string) => void;
    onDelete: () => void;
    onMouseDown: (e: React.MouseEvent, app: App) => void;
}

/**
 * Modal that displays folder contents with editable name and delete option
 */
export function FolderModal({
                                folder,
                                isDragging,
                                onClose,
                                onLaunchApp,
                                onUpdateName,
                                onDelete,
                                onMouseDown,
                            }: FolderModalProps) {
    return (
        <Modal onClose={onClose} maxWidth="500px" padding="p-6" className="min-w-[320px]">
            <div className="flex items-center gap-3 mb-5">
                <input
                    type="text"
                    className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-lg font-medium outline-none transition-all focus:bg-white/15 focus:border-white/30"
                    value={folder.name}
                    onChange={(e) => onUpdateName(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                />
                <Button
                    variant="unstyled"
                    className="w-8 h-8 rounded-lg bg-transparent text-lg cursor-pointer flex items-center justify-center transition-all hover:bg-red-500/20"
                    onClick={(e) => {
                        e.stopPropagation()
                        onDelete()
                    }}
                    title="Delete folder"
                >
                    🗑️
                </Button>
                <Button
                    variant="unstyled"
                    className="w-8 h-8 rounded-lg bg-white/10 text-white text-xl cursor-pointer flex items-center justify-center transition-all hover:bg-white/20"
                    onClick={onClose}
                >
                    ×
                </Button>
            </div>
            <div className="grid grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-1">
                {folder.apps.map((app) => (
                    <div
                        key={app.bundle_id}
                        className="gap-2 flex flex-col items-center w-[80px] cursor-pointer transition-all duration-200 select-none hover:scale-105 active:scale-95"
                        onClick={() => {
                            if (!isDragging) {
                                onLaunchApp(app.path)
                                onClose()
                            }
                        }}
                        onMouseDown={(e) => {
                            e.preventDefault(); // Prevent native browser drag
                            onMouseDown(e, app);
                        }}
                        title={app.name}
                        draggable="false"
                    >
                        <IconContainer size="sm">
                            {app.icon ? (
                                <img src={app.icon} alt={app.name} className="w-full h-full object-contain" draggable="false"/>
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-xl font-semibold text-white">
                                    {app.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </IconContainer>
                        <div className="text-[10px] text-white text-center max-w-[75px] truncate">
                            {app.name}
                        </div>
                    </div>
                ))}
            </div>
        </Modal>
    )
}
