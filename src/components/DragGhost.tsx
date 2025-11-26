import type { LaunchpadItem, MousePosition } from "../types";
import { isFolder } from "../types";

interface DragGhostProps {
  draggedItem: LaunchpadItem;
  mousePos: MousePosition;
}

/**
 * Ghost element that follows the cursor during drag operations
 * Simplified styling for reliable rendering as fixed overlay
 */
export function DragGhost({ draggedItem, mousePos }: DragGhostProps) {
  const previewApps = isFolder(draggedItem) ? draggedItem.apps.slice(0, 4) : [];

  return (
    <div
      className="fixed pointer-events-none z-[10000]"
      style={{
        left: mousePos.x - 32,
        top: mousePos.y - 32,
        transform: "scale(1.1)",
        opacity: 0.9,
      }}
    >
      <div className="w-16 h-16 rounded-[14px] shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden">
        {isFolder(draggedItem) ? (
          <div className="w-full h-full bg-white/20 backdrop-blur-xl">
            <div className="grid grid-cols-2 gap-1 p-1.5 w-full h-full">
              {previewApps.map((app) => (
                <div key={app.bundle_id} className="flex items-center justify-center">
                  {app.icon ? (
                    <img src={app.icon} alt={app.name} className="w-6 h-6 object-contain rounded-[4px]" draggable="false" />
                  ) : (
                    <div className="w-6 h-6 rounded-[4px] bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-[8px] text-white font-semibold">
                      {app.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {draggedItem.icon ? (
              <img src={draggedItem.icon} alt={draggedItem.name} className="w-full h-full object-contain" draggable="false" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-2xl font-semibold text-white">
                {draggedItem.name.charAt(0).toUpperCase()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
