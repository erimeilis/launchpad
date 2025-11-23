import type { MousePosition } from "../types";

interface EdgeIndicatorsProps {
  currentPage: number;
  totalPages: number;
  mousePos: MousePosition;
}

/**
 * Visual indicators shown at screen edges during drag operations to suggest page switching
 */
export function EdgeIndicators({ currentPage, totalPages, mousePos }: EdgeIndicatorsProps) {
  const EDGE_ZONE = 100;

  return (
    <>
      {/* Left edge indicator */}
      {currentPage > 0 && mousePos.x < EDGE_ZONE && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            width: "100px",
            background: "linear-gradient(to right, rgba(100, 150, 255, 0.3), transparent)",
            pointerEvents: "none",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: "20px",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              color: "rgba(255, 255, 255, 0.8)",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
            }}
          >
            ←
          </div>
        </div>
      )}

      {/* Right edge indicator */}
      {currentPage < totalPages - 1 && mousePos.x > window.innerWidth - EDGE_ZONE && (
        <div
          style={{
            position: "fixed",
            right: 0,
            top: 0,
            bottom: 0,
            width: "100px",
            background: "linear-gradient(to left, rgba(100, 150, 255, 0.3), transparent)",
            pointerEvents: "none",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: "20px",
          }}
        >
          <div
            style={{
              fontSize: "48px",
              color: "rgba(255, 255, 255, 0.8)",
              textShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
            }}
          >
            →
          </div>
        </div>
      )}
    </>
  );
}
