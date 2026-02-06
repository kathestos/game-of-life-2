import { useCallback, useEffect, useMemo, useRef } from "react";
import { create } from "zustand";
import { GameCanvas } from "./GameCanvas";
import {
  PATTERN_OFFSETS,
  applyBrush,
  countBirthsAndDeaths,
  countLiveCells,
  createGrid,
  createHeatFromGrid,
  randomizeGrid,
  stampPattern,
  stepGrid,
  updateHeatMap,
  type PatternName,
  type RulePreset,
} from "./gameOfLife";

const IS_MOBILE_VIEW = typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches;
const COLS = IS_MOBILE_VIEW ? 36 : 64;
const ROWS = IS_MOBILE_VIEW ? 24 : 40;
const CELL_SIZE = IS_MOBILE_VIEW ? 18 : 16;

type ToolMode = "draw" | "erase" | "stamp";

type LifeState = {
  grid: Uint8Array;
  heat: Uint8Array;
  running: boolean;
  speedMs: number;
  generation: number;
  rule: RulePreset;
  wrapEdges: boolean;
  showTrails: boolean;
  showGridLines: boolean;
  brushSize: number;
  tool: ToolMode;
  selectedPattern: PatternName;
  births: number;
  deaths: number;
  setRunning: (running: boolean) => void;
  step: () => void;
  clear: () => void;
  randomize: () => void;
  interactAt: (x: number, y: number) => void;
  setSpeed: (speedMs: number) => void;
  setRule: (rule: RulePreset) => void;
  setWrapEdges: (wrap: boolean) => void;
  setShowTrails: (show: boolean) => void;
  setShowGridLines: (show: boolean) => void;
  setBrushSize: (size: number) => void;
  setTool: (tool: ToolMode) => void;
  setPattern: (pattern: PatternName) => void;
  placePatternInCenter: (pattern: PatternName) => void;
};

const useLifeStore = create<LifeState>((set) => ({
  grid: createGrid(COLS, ROWS),
  heat: createGrid(COLS, ROWS),
  running: false,
  speedMs: 120,
  generation: 0,
  rule: "conway",
  wrapEdges: true,
  showTrails: true,
  showGridLines: true,
  brushSize: 1,
  tool: "draw",
  selectedPattern: "glider",
  births: 0,
  deaths: 0,
  setRunning: (running) => set({ running }),
  step: () =>
    set((state) => {
      const nextGrid = stepGrid(state.grid, COLS, ROWS, { rule: state.rule, wrapEdges: state.wrapEdges });
      const diff = countBirthsAndDeaths(state.grid, nextGrid);
      return {
        grid: nextGrid,
        heat: updateHeatMap(state.heat, nextGrid, 1, 10),
        births: diff.births,
        deaths: diff.deaths,
        generation: state.generation + 1,
      };
    }),
  clear: () =>
    set({
      grid: createGrid(COLS, ROWS),
      heat: createGrid(COLS, ROWS),
      generation: 0,
      births: 0,
      deaths: 0,
      running: false,
    }),
  randomize: () =>
    set(() => {
      const nextGrid = randomizeGrid(COLS, ROWS, 0.24);
      return {
        grid: nextGrid,
        heat: createHeatFromGrid(nextGrid, 10),
        generation: 0,
        births: 0,
        deaths: 0,
      };
    }),
  interactAt: (x, y) =>
    set((state) => {
      let nextGrid: Uint8Array;

      if (state.tool === "stamp") {
        nextGrid = stampPattern(state.grid, COLS, ROWS, state.selectedPattern, x, y, state.wrapEdges);
      } else {
        const alive = state.tool === "draw";
        nextGrid = applyBrush(state.grid, COLS, ROWS, x, y, state.brushSize, alive, state.wrapEdges);
      }

      return {
        grid: nextGrid,
        heat: updateHeatMap(state.heat, nextGrid, 0, 10),
      };
    }),
  setSpeed: (speedMs) => set({ speedMs }),
  setRule: (rule) => set({ rule }),
  setWrapEdges: (wrapEdges) => set({ wrapEdges }),
  setShowTrails: (showTrails) => set({ showTrails }),
  setShowGridLines: (showGridLines) => set({ showGridLines }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setTool: (tool) => set({ tool }),
  setPattern: (selectedPattern) => set({ selectedPattern }),
  placePatternInCenter: (pattern) =>
    set((state) => {
      const cx = Math.floor(COLS / 2);
      const cy = Math.floor(ROWS / 2);
      const nextGrid = stampPattern(state.grid, COLS, ROWS, pattern, cx, cy, state.wrapEdges);
      return {
        grid: nextGrid,
        heat: updateHeatMap(state.heat, nextGrid, 0, 10),
        selectedPattern: pattern,
      };
    }),
}));

export function App() {
  const {
    grid,
    heat,
    running,
    speedMs,
    generation,
    rule,
    wrapEdges,
    showTrails,
    showGridLines,
    brushSize,
    tool,
    selectedPattern,
    births,
    deaths,
    setRunning,
    step,
    clear,
    randomize,
    interactAt,
    setSpeed,
    setRule,
    setWrapEdges,
    setShowTrails,
    setShowGridLines,
    setBrushSize,
    setTool,
    setPattern,
    placePatternInCenter,
  } = useLifeStore();

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);

  const liveCells = useMemo(() => countLiveCells(grid), [grid]);

  const loop = useCallback(
    (ts: number) => {
      if (!running) return;
      if (lastTickRef.current === 0) lastTickRef.current = ts;
      if (ts - lastTickRef.current >= speedMs) {
        step();
        lastTickRef.current = ts;
      }
      rafRef.current = requestAnimationFrame(loop);
    },
    [running, speedMs, step]
  );

  useEffect(() => {
    if (running) {
      rafRef.current = requestAnimationFrame(loop);
      return () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    }
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    lastTickRef.current = 0;
  }, [running, loop]);

  return (
    <main className="layout">
      <h1>Conway&apos;s Game of Life Lab</h1>

      <section className="panel">
        <button onClick={() => setRunning(!running)}>{running ? "Pause" : "Start"}</button>
        <button onClick={step} disabled={running}>
          Step
        </button>
        <button onClick={clear}>Clear</button>
        <button onClick={randomize}>Randomize</button>

        <label>
          Speed
          <input
            type="range"
            min={30}
            max={300}
            step={10}
            value={speedMs}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
          <span>{speedMs}ms</span>
        </label>

        <label>
          Rule
          <select value={rule} onChange={(event) => setRule(event.target.value as RulePreset)}>
            <option value="conway">Conway (B3/S23)</option>
            <option value="highlife">HighLife (B36/S23)</option>
            <option value="seeds">Seeds (B2/S0)</option>
          </select>
        </label>

        <label>
          Tool
          <select value={tool} onChange={(event) => setTool(event.target.value as ToolMode)}>
            <option value="draw">Draw</option>
            <option value="erase">Erase</option>
            <option value="stamp">Stamp Pattern</option>
          </select>
        </label>

        <label>
          Brush
          <input
            type="range"
            min={1}
            max={5}
            step={2}
            value={brushSize}
            disabled={tool === "stamp"}
            onChange={(event) => setBrushSize(Number(event.target.value))}
          />
          <span>{brushSize}x{brushSize}</span>
        </label>

        <label>
          Pattern
          <select
            value={selectedPattern}
            onChange={(event) => {
              const pattern = event.target.value as PatternName;
              setPattern(pattern);
              placePatternInCenter(pattern);
            }}
          >
            {Object.keys(PATTERN_OFFSETS).map((pattern) => (
              <option key={pattern} value={pattern}>
                {pattern}
              </option>
            ))}
          </select>
        </label>

        <label>
          <input type="checkbox" checked={wrapEdges} onChange={(event) => setWrapEdges(event.target.checked)} />
          Wrap edges
        </label>

        <label>
          <input type="checkbox" checked={showTrails} onChange={(event) => setShowTrails(event.target.checked)} />
          Ghost trails
        </label>

        <label>
          <input
            type="checkbox"
            checked={showGridLines}
            onChange={(event) => setShowGridLines(event.target.checked)}
          />
          Grid lines
        </label>

        <div className="stats">
          <span>Generation: {generation}</span>
          <span>Live: {liveCells}</span>
          <span>Births: {births}</span>
          <span>Deaths: {deaths}</span>
        </div>
      </section>

      <GameCanvas
        grid={grid}
        heat={heat}
        cols={COLS}
        rows={ROWS}
        cellSize={CELL_SIZE}
        showGridLines={showGridLines}
        showTrails={showTrails}
        dragEnabled={tool !== "stamp"}
        onInteractCell={interactAt}
      />
    </main>
  );
}
