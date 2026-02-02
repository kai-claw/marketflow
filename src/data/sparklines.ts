// Generate lightweight sparkline data for heatmap cells
// Uses a fast random walk — not full candlestick generation — for performance across 66+ stocks

import { seededRandom } from '../utils';
import { STOCK_PRESETS } from '../constants';

/** A sparkline is just an array of normalized values [0, 1] for rendering. */
export type Sparkline = number[];

/** Number of points per sparkline (30 trading days ≈ 6 weeks). */
export const SPARKLINE_POINTS = 30;

/**
 * Generate a normalized sparkline for a stock.
 * Uses stock-specific seed + daily change for deterministic, realistic micro-charts.
 * Returns values normalized to [0, 1] range (min → 0, max → 1) for easy SVG rendering.
 */
export function generateSparkline(symbol: string, dayChange: number): Sparkline {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 7919;
  const rand = seededRandom(seed);

  const preset = STOCK_PRESETS[symbol];
  const vol = preset ? preset.volatility : 0.02;
  const trend = preset ? preset.trend : 0.0003;

  // Generate random walk
  const raw: number[] = [];
  let price = 100;

  for (let i = 0; i < SPARKLINE_POINTS; i++) {
    const u1 = rand();
    const u2 = rand();
    const normal = Math.sqrt(-2 * Math.log(u1 || 0.001)) * Math.cos(2 * Math.PI * u2);
    price *= 1 + trend + normal * vol;
    raw.push(price);
  }

  // Nudge last point to reflect today's change direction
  // This makes the sparkline tail match the heatmap color
  const lastPrice = raw[raw.length - 1];
  const nudge = dayChange * 0.003; // subtle directional bias
  raw[raw.length - 1] = lastPrice * (1 + nudge);

  // Normalize to [0, 1]
  let min = raw[0], max = raw[0];
  for (let i = 1; i < raw.length; i++) {
    if (raw[i] < min) min = raw[i];
    if (raw[i] > max) max = raw[i];
  }
  const range = max - min || 1;

  return raw.map(v => (v - min) / range);
}

/**
 * Convert a sparkline to an SVG path `d` attribute.
 * Renders as a polyline fitting within (0, 0) to (width, height).
 * Y is inverted (0 = top = max value).
 */
export function sparklineToPath(
  sparkline: Sparkline,
  width: number,
  height: number,
): string {
  if (sparkline.length < 2) return '';

  const xStep = width / (sparkline.length - 1);
  const padding = height * 0.1; // 10% vertical padding
  const drawH = height - padding * 2;

  const points = sparkline.map((v, i) => {
    const x = i * xStep;
    const y = padding + (1 - v) * drawH; // invert Y
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `M${points.join('L')}`;
}

/**
 * Convert a sparkline to an SVG area fill path (closed shape for gradient fill).
 */
export function sparklineToArea(
  sparkline: Sparkline,
  width: number,
  height: number,
): string {
  if (sparkline.length < 2) return '';

  const linePath = sparklineToPath(sparkline, width, height);
  // Close the path along the bottom
  return `${linePath}L${width.toFixed(1)},${height}L0,${height}Z`;
}

/**
 * Pre-compute sparklines for all stocks in the market data.
 * Keyed by symbol for O(1) lookup during rendering.
 */
export function generateAllSparklines(
  stocks: { symbol: string; change: number }[],
): Map<string, Sparkline> {
  const map = new Map<string, Sparkline>();
  for (const stock of stocks) {
    map.set(stock.symbol, generateSparkline(stock.symbol, stock.change));
  }
  return map;
}
