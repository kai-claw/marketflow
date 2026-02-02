// Market mood computation — pure function, no side effects

import type { Stock, MarketMood } from '../types';

/** Mood classification thresholds (breadth ratio → mood) */
export const MOOD_THRESHOLDS: { min: number; label: string; emoji: string; color: string }[] = [
  { min: 0.70, label: 'Strong Rally', emoji: '🚀', color: '#22c55e' },
  { min: 0.55, label: 'Bullish',      emoji: '📈', color: '#4ade80' },
  { min: 0.45, label: 'Mixed',        emoji: '⚖️', color: '#f59e0b' },
  { min: 0.30, label: 'Bearish',      emoji: '📉', color: '#f87171' },
  { min: -Infinity, label: 'Selloff',  emoji: '🔻', color: '#ef4444' },
];

/**
 * Classify market mood from stock data.
 * Breadth = advancers / total stocks (0–1).
 */
export function computeMarketMood(stocks: Stock[]): MarketMood {
  const advancers = stocks.filter(s => s.change > 0).length;
  const decliners = stocks.filter(s => s.change < 0).length;
  const breadth = stocks.length > 0 ? advancers / stocks.length : 0.5;

  const tier = MOOD_THRESHOLDS.find(t => breadth >= t.min) || MOOD_THRESHOLDS[MOOD_THRESHOLDS.length - 1];

  return {
    label: tier.label,
    emoji: tier.emoji,
    color: tier.color,
    advancers,
    decliners,
    breadth,
  };
}
