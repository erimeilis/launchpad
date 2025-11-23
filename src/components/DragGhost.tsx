import type { LaunchpadItem, MousePosition } from "../types";
import { isFolder } from "../types";

interface DragGhostProps {
  draggedItem: LaunchpadItem;
  mousePos: MousePosition;
}

/**
 * Ghost element that follows the cursor during drag operations
 */
export function DragGhost({ draggedItem, mousePos }: DragGhostProps) {
  return (
    <div
      style={{
        position: "fixed",
        left: mousePos.x - 50,
        top: mousePos.y - 50,
        width: "100px",
        height: "100px",
        pointerEvents: "none",
        zIndex: 10000,
        opacity: 0.8,
        transform: "scale(1.1)",
        transition: "none",
      }}
    >
      {isFolder(draggedItem) ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "rgba(100, 150, 255, 0.3)",
            borderRadius: "20px",
            border: "3px solid rgba(100, 150, 255, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "48px",
          }}
        >
          📁
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.7)",
            borderRadius: "12px",
            padding: "8px",
          }}
        >
          {draggedItem.icon ? (
            <img
              src={draggedItem.icon}
              alt={draggedItem.name}
              style={{ width: "64px", height: "64px" }}
            />
          ) : (
            <div style={{ fontSize: "48px" }}>{draggedItem.name.charAt(0).toUpperCase()}</div>
          )}
        </div>
      )}
    </div>
  );
}
