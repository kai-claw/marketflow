// Shared type definitions for MarketFlow

// ── Market Data ──

export interface Stock {
  symbol: string;
  name: string;
  sector: string;
  marketCap: number; // billions
  price: number;
  change: number; // percent
  volume: number;
}

export interface Sector {
  name: string;
  stocks: Stock[];
  totalMarketCap: number;
  avgChange: number;
}

// ── Candlestick / Chart ──

export interface Candle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TimeSeriesPoint {
  time: string;
  value: number;
}

export interface MACDResult {
  macd: TimeSeriesPoint[];
  signal: TimeSeriesPoint[];
  histogram: { time: string; value: number; color: string }[];
}

export interface BollingerResult {
  upper: TimeSeriesPoint[];
  middle: TimeSeriesPoint[];
  lower: TimeSeriesPoint[];
}

// ── Portfolio ──

export interface Position {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  timestamp: number;
  total: number;
}

export interface Portfolio {
  cash: number;
  positions: Position[];
  trades: Trade[];
  startingCash: number;
}

export interface TradeResult {
  success: boolean;
  error?: string;
  portfolio: Portfolio;
}

export interface PnL {
  absolute: number;
  percent: number;
}

// ── Store ──

export type View = 'heatmap' | 'chart' | 'portfolio';
export type ChartTimeframe = '1M' | '3M' | '6M' | '1Y';
export type Indicator = 'sma20' | 'sma50' | 'ema12' | 'ema26' | 'bollinger' | 'rsi' | 'macd' | 'volume';

export interface MarketMood {
  label: string;
  emoji: string;
  color: string;
  advancers: number;
  decliners: number;
  breadth: number; // advancers / total, 0-1
}

// ── Chart Config ──

export interface StockPreset {
  price: number;
  volatility: number;
  trend: number;
}

export interface IndicatorConfig {
  id: Indicator;
  label: string;
  color: string;
}
