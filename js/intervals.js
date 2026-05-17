// Intervalos SRS (módulo leaf — no depende de nada para evitar ciclos
// entre srs.js y storage.js).

export const BOX_INTERVALS_MS = [
  10 * 60 * 1000,             // box 0 → 10 min
  24 * 60 * 60 * 1000,        // box 1 → 1 día
  3 * 24 * 60 * 60 * 1000,    // box 2 → 3 días
  7 * 24 * 60 * 60 * 1000,    // box 3 → 7 días
  21 * 24 * 60 * 60 * 1000,   // box 4 → 21 días
];

export function dueAtFor(box, fromTime) {
  if (typeof box !== 'number' || box < 0 || box >= BOX_INTERVALS_MS.length) {
    throw new Error(`Box fuera de rango: ${box}`);
  }
  return fromTime + BOX_INTERVALS_MS[box];
}
