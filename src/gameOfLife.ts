export const PATTERN_OFFSETS = {
  glider: [
    [1, 0],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ],
  blinker: [
    [-1, 0],
    [0, 0],
    [1, 0],
  ],
  lwss: [
    [-2, -1],
    [-1, -1],
    [0, -1],
    [1, -1],
    [-3, 0],
    [1, 0],
    [1, 1],
    [-3, 2],
    [0, 2],
  ],
  rPentomino: [
    [0, -1],
    [1, -1],
    [-1, 0],
    [0, 0],
    [0, 1],
  ],
} as const;

export type PatternName = keyof typeof PATTERN_OFFSETS;
export type RulePreset = "conway" | "highlife" | "seeds";

const RULE_TABLES: Record<RulePreset, { born: boolean[]; survive: boolean[] }> = {
  conway: {
    born: [false, false, false, true, false, false, false, false, false],
    survive: [false, false, true, true, false, false, false, false, false],
  },
  highlife: {
    born: [false, false, false, true, false, false, true, false, false],
    survive: [false, false, true, true, false, false, false, false, false],
  },
  seeds: {
    born: [false, false, true, false, false, false, false, false, false],
    survive: [false, false, false, false, false, false, false, false, false],
  },
};

export function indexOf(x: number, y: number, cols: number): number {
  return y * cols + x;
}

export function createGrid(cols: number, rows: number): Uint8Array {
  return new Uint8Array(cols * rows);
}

export function randomizeGrid(cols: number, rows: number, density = 0.2): Uint8Array {
  const grid = createGrid(cols, rows);
  for (let i = 0; i < grid.length; i += 1) {
    grid[i] = Math.random() < density ? 1 : 0;
  }
  return grid;
}

function getNeighborCount(grid: Uint8Array, x: number, y: number, cols: number, rows: number, wrapEdges: boolean): number {
  let neighbors = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;

      if (wrapEdges) {
        const nx = (x + dx + cols) % cols;
        const ny = (y + dy + rows) % rows;
        neighbors += grid[indexOf(nx, ny, cols)];
      } else {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        neighbors += grid[indexOf(nx, ny, cols)];
      }
    }
  }

  return neighbors;
}

export function stepGrid(
  current: Uint8Array,
  cols: number,
  rows: number,
  options: { rule: RulePreset; wrapEdges: boolean }
): Uint8Array {
  const next = createGrid(cols, rows);
  const rule = RULE_TABLES[options.rule];

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const idx = indexOf(x, y, cols);
      const neighbors = getNeighborCount(current, x, y, cols, rows, options.wrapEdges);
      const alive = current[idx] === 1;
      next[idx] = alive ? (rule.survive[neighbors] ? 1 : 0) : rule.born[neighbors] ? 1 : 0;
    }
  }

  return next;
}

function normalizeCoord(value: number, max: number, wrapEdges: boolean): number | null {
  if (wrapEdges) return (value + max) % max;
  if (value < 0 || value >= max) return null;
  return value;
}

export function applyBrush(
  grid: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  size: number,
  alive: boolean,
  wrapEdges: boolean
): Uint8Array {
  const next = new Uint8Array(grid);
  const radius = Math.max(0, Math.floor((size - 1) / 2));

  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = normalizeCoord(x + dx, cols, wrapEdges);
      const ny = normalizeCoord(y + dy, rows, wrapEdges);
      if (nx === null || ny === null) continue;
      next[indexOf(nx, ny, cols)] = alive ? 1 : 0;
    }
  }

  return next;
}

export function stampPattern(
  grid: Uint8Array,
  cols: number,
  rows: number,
  name: PatternName,
  cx = Math.floor(cols / 2),
  cy = Math.floor(rows / 2),
  wrapEdges = true
): Uint8Array {
  const next = new Uint8Array(grid);
  const offsets = PATTERN_OFFSETS[name];

  for (const [px, py] of offsets) {
    const x = normalizeCoord(cx + px, cols, wrapEdges);
    const y = normalizeCoord(cy + py, rows, wrapEdges);
    if (x === null || y === null) continue;
    next[indexOf(x, y, cols)] = 1;
  }

  return next;
}

export function countLiveCells(grid: Uint8Array): number {
  let count = 0;
  for (let i = 0; i < grid.length; i += 1) count += grid[i];
  return count;
}

export function createHeatFromGrid(grid: Uint8Array, maxHeat = 10): Uint8Array {
  const heat = new Uint8Array(grid.length);
  for (let i = 0; i < grid.length; i += 1) {
    heat[i] = grid[i] ? maxHeat : 0;
  }
  return heat;
}

export function updateHeatMap(previous: Uint8Array, currentGrid: Uint8Array, decay = 1, maxHeat = 10): Uint8Array {
  const next = new Uint8Array(previous.length);
  for (let i = 0; i < previous.length; i += 1) {
    if (currentGrid[i]) {
      next[i] = maxHeat;
    } else {
      next[i] = previous[i] > decay ? previous[i] - decay : 0;
    }
  }
  return next;
}

export function countBirthsAndDeaths(previous: Uint8Array, current: Uint8Array): { births: number; deaths: number } {
  let births = 0;
  let deaths = 0;

  for (let i = 0; i < previous.length; i += 1) {
    if (!previous[i] && current[i]) births += 1;
    if (previous[i] && !current[i]) deaths += 1;
  }

  return { births, deaths };
}