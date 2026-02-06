import { useEffect, useMemo, useRef, type PointerEvent } from "react";

type Props = {
  grid: Uint8Array;
  heat: Uint8Array;
  cols: number;
  rows: number;
  cellSize: number;
  showGridLines: boolean;
  showTrails: boolean;
  dragEnabled: boolean;
  onInteractCell: (x: number, y: number) => void;
};

const DEAD_COLOR = "#040712";
const LIVE_COLOR = "#5eead4";
const GRID_LINE_COLOR = "rgba(148, 163, 184, 0.25)";

export function GameCanvas({
  grid,
  heat,
  cols,
  rows,
  cellSize,
  showGridLines,
  showTrails,
  dragEnabled,
  onInteractCell,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPaintedRef = useRef<string | null>(null);

  const width = useMemo(() => cols * cellSize, [cols, cellSize]);
  const height = useMemo(() => rows * cellSize, [rows, cellSize]);

  const getCellCoords = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.floor(((event.clientX - rect.left) / rect.width) * cols);
    const y = Math.floor(((event.clientY - rect.top) / rect.height) * rows);
    return {
      x: Math.max(0, Math.min(cols - 1, x)),
      y: Math.max(0, Math.min(rows - 1, y)),
    };
  };

  const interactIfNeeded = (x: number, y: number) => {
    const key = `${x},${y}`;
    if (lastPaintedRef.current === key) return;
    onInteractCell(x, y);
    lastPaintedRef.current = key;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = DEAD_COLOR;
    ctx.fillRect(0, 0, width, height);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const idx = y * cols + x;
        const px = x * cellSize;
        const py = y * cellSize;

        if (grid[idx]) {
          ctx.fillStyle = LIVE_COLOR;
          ctx.fillRect(px, py, cellSize, cellSize);
          continue;
        }

        if (showTrails && heat[idx] > 0) {
          const alpha = Math.min(0.45, heat[idx] / 22);
          ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
          ctx.fillRect(px, py, cellSize, cellSize);
        }
      }
    }

    if (showGridLines) {
      ctx.strokeStyle = GRID_LINE_COLOR;
      ctx.lineWidth = 1;
      for (let x = 0; x <= cols; x += 1) {
        const px = x * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
      }
      for (let y = 0; y <= rows; y += 1) {
        const py = y * cellSize + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }
    }
  }, [grid, heat, cols, rows, cellSize, width, height, showGridLines, showTrails]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="game-canvas"
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        if (!event.isPrimary) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        const { x, y } = getCellCoords(event);
        interactIfNeeded(x, y);
        if (dragEnabled) {
          isDrawingRef.current = true;
        }
      }}
      onPointerMove={(event) => {
        if (!event.isPrimary) return;
        if (!isDrawingRef.current) return;
        const { x, y } = getCellCoords(event);
        interactIfNeeded(x, y);
      }}
      onPointerUp={(event) => {
        if (!event.isPrimary) return;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        isDrawingRef.current = false;
        lastPaintedRef.current = null;
      }}
      onPointerCancel={() => {
        isDrawingRef.current = false;
        lastPaintedRef.current = null;
      }}
      onPointerLeave={() => {
        isDrawingRef.current = false;
        lastPaintedRef.current = null;
      }}
    />
  );
}
