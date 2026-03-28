
import { isWhite } from '../engine/chess.js';
export const CORR_VALUES = {
  K:  1.00, Q:  0.85, R:  0.70, B:  0.55, N:  0.40, P:  0.25,
  k: -1.00, q: -0.85, r: -0.70, b: -0.55, n: -0.40, p: -0.25,
};
export const VAR_LABELS = [
  'temp', 'pressure', 'humidity', 'pH',
  'viscosity', 'density', 'flow_rate', 'yield',
];

export function corrToColor(val) {
  if (val === null || val === undefined) return '#F7F7F7';
  const absVal = Math.abs(val);
  if (val > 0) {
    const r = 255;
    const g = Math.round(247 - absVal * 180);
    const b = Math.round(247 - absVal * 210);
    return `rgb(${r},${Math.max(30, g)},${Math.max(30, b)})`;
  } else if (val < 0) {
    const r = Math.round(247 - absVal * 200);
    const g = Math.round(247 - absVal * 140);
    const b = 255;
    return `rgb(${Math.max(30, r)},${Math.max(60, g)},${b})`;
  }
  return '#F7F7F7';
}

export function pieceToCorr(piece) {
  if (!piece) return 0;
  return CORR_VALUES[piece] || 0;
}
