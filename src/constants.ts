// Centralized constants for MarketFlow — no magic numbers in components

import type { ChartTimeframe, IndicatorConfig, StockPreset } from './types';

// ── Timeframes ──

export const TIMEFRAME_DAYS: Record<ChartTimeframe, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

export const TIMEFRAMES: ChartTimeframe[] = ['1M', '3M', '6M', '1Y'];

// ── Sector Colors ──

export const SECTOR_COLORS: Record<string, string> = {
  'Technology': '#3b82f6',
  'Healthcare': '#22c55e',
  'Financials': '#f59e0b',
  'Consumer Discretionary': '#a855f7',
  'Consumer Staples': '#ec4899',
  'Energy': '#ef4444',
  'Industrials': '#6366f1',
  'Communication Services': '#14b8a6',
  'Utilities': '#84cc16',
  'Materials': '#f97316',
  'Real Estate': '#06b6d4',
};

// ── Chart Theme (lightweight-charts) ──

export const CHART_THEME = {
  background: '#0a0e17',
  textColor: '#94a3b8',
  fontSize: 11,
  gridColor: '#1e2a3a',
  crosshairColor: '#475569',
  crosshairLabelBg: '#334155',
  borderColor: '#1e2a3a',
  upColor: '#22c55e',
  downColor: '#ef4444',
} as const;

// ── Indicators ──

export const INDICATORS: IndicatorConfig[] = [
  { id: 'volume', label: 'VOL', color: '#64748b' },
  { id: 'sma20', label: 'SMA 20', color: '#f59e0b' },
  { id: 'sma50', label: 'SMA 50', color: '#a855f7' },
  { id: 'ema12', label: 'EMA 12', color: '#3b82f6' },
  { id: 'ema26', label: 'EMA 26', color: '#14b8a6' },
  { id: 'bollinger', label: 'BB', color: '#6366f1' },
  { id: 'rsi', label: 'RSI', color: '#a855f7' },
  { id: 'macd', label: 'MACD', color: '#3b82f6' },
];

// ── Comparison Mode ──

export const COMPARISON_COLORS = [
  '#3b82f6', // blue (primary)
  '#f59e0b', // amber
  '#a855f7', // purple
  '#22c55e', // green
  '#ec4899', // pink
  '#14b8a6', // teal
  '#ef4444', // red
  '#6366f1', // indigo
] as const;

export const MAX_COMPARISON_STOCKS = 8;

// ── Cinematic Autoplay ──

export const CINEMATIC_STOCKS = [
  'NVDA', 'TSLA', 'AAPL', 'LLY', 'NFLX',
  'XOM', 'JPM', 'AMZN', 'META', 'GOOGL',
] as const;

export const CINEMATIC_INTERVAL = 10000; // 10s per stock

// ── Stock Presets (chart generation params) ──

export const STOCK_PRESETS: Record<string, StockPreset> = {
  'AAPL': { price: 228.5, volatility: 0.018, trend: 0.0004 },
  'MSFT': { price: 427.3, volatility: 0.016, trend: 0.0005 },
  'NVDA': { price: 117.8, volatility: 0.035, trend: 0.001 },
  'GOOGL': { price: 176.4, volatility: 0.02, trend: 0.0003 },
  'AMZN': { price: 208.3, volatility: 0.022, trend: 0.0004 },
  'TSLA': { price: 244.6, volatility: 0.04, trend: 0.0002 },
  'META': { price: 612.7, volatility: 0.025, trend: 0.0006 },
  'JPM': { price: 215.3, volatility: 0.015, trend: 0.0003 },
  'V': { price: 285.6, volatility: 0.013, trend: 0.0003 },
  'JNJ': { price: 157.8, volatility: 0.012, trend: 0.0001 },
  'XOM': { price: 109.2, volatility: 0.018, trend: -0.0001 },
  'LLY': { price: 862.3, volatility: 0.025, trend: 0.001 },
  'NFLX': { price: 862.4, volatility: 0.028, trend: 0.0007 },
  'BRK.B': { price: 412.7, volatility: 0.01, trend: 0.0003 },
};

export const POPULAR_SYMBOLS = Object.keys(STOCK_PRESETS);

// ── Heatmap Change Colors ──

export const CHANGE_COLOR_STOPS: { threshold: number; color: string }[] = [
  { threshold: 3, color: '#15803d' },
  { threshold: 2, color: '#16a34a' },
  { threshold: 1, color: '#22c55e' },
  { threshold: 0.5, color: '#4ade80' },
  { threshold: 0, color: '#86efac' },
  { threshold: -0.5, color: '#fca5a5' },
  { threshold: -1, color: '#f87171' },
  { threshold: -2, color: '#ef4444' },
  { threshold: -3, color: '#dc2626' },
];

export const CHANGE_COLOR_FLOOR = '#b91c1c';

// ── Portfolio ──

export const DEFAULT_STARTING_CASH = 100000;

// ── Candlestick Generation ──

export const DEFAULT_CANDLE_DAYS = 400;
export const DEFAULT_VOLATILITY = 0.02;
export const DEFAULT_TREND = 0.0003;
export const DEFAULT_PRICE = 100;
