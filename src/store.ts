import { create } from 'zustand';
import { generateMarketData, groupBySector, type Stock, type Sector } from './data/marketData';
import { generateCandlestickData, STOCK_PRESETS, type Candle } from './data/candlestickData';
import {
  createPortfolio,
  executeTrade,
  type Portfolio,
} from './data/portfolioData';

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

interface AppState {
  view: View;
  setView: (v: View) => void;
  
  // Market data
  stocks: Stock[];
  sectors: Sector[];
  refreshMarket: () => void;
  marketMood: MarketMood;
  
  // Chart
  selectedSymbol: string;
  setSelectedSymbol: (s: string) => void;
  candleData: Candle[];
  chartTimeframe: ChartTimeframe;
  setChartTimeframe: (t: ChartTimeframe) => void;
  activeIndicators: Set<Indicator>;
  toggleIndicator: (i: Indicator) => void;
  comparisonMode: boolean;
  setComparisonMode: (on: boolean) => void;
  
  // Cinematic
  cinematicActive: boolean;
  setCinematicActive: (on: boolean) => void;
  
  // Portfolio
  portfolio: Portfolio;
  buyStock: (symbol: string, shares: number, price: number) => string | null;
  sellStock: (symbol: string, shares: number, price: number) => string | null;
  resetPortfolio: () => void;
}

const TIMEFRAME_DAYS: Record<ChartTimeframe, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

function getCandleData(symbol: string, timeframe: ChartTimeframe): Candle[] {
  const preset = STOCK_PRESETS[symbol] || { price: 100, volatility: 0.02, trend: 0.0003 };
  const allData = generateCandlestickData(symbol, preset.price * 0.7, 400, preset.volatility, preset.trend);
  const days = TIMEFRAME_DAYS[timeframe];
  return allData.slice(-days);
}

function computeMarketMood(stocks: Stock[]): MarketMood {
  const advancers = stocks.filter(s => s.change > 0).length;
  const decliners = stocks.filter(s => s.change < 0).length;
  const breadth = stocks.length > 0 ? advancers / stocks.length : 0.5;
  
  let label: string;
  let emoji: string;
  let color: string;
  
  if (breadth >= 0.7) { label = 'Strong Rally'; emoji = '🚀'; color = '#22c55e'; }
  else if (breadth >= 0.55) { label = 'Bullish'; emoji = '📈'; color = '#4ade80'; }
  else if (breadth >= 0.45) { label = 'Mixed'; emoji = '⚖️'; color = '#f59e0b'; }
  else if (breadth >= 0.3) { label = 'Bearish'; emoji = '📉'; color = '#f87171'; }
  else { label = 'Selloff'; emoji = '🔻'; color = '#ef4444'; }
  
  return { label, emoji, color, advancers, decliners, breadth };
}

// Curated cinematic tour stocks — diversified and interesting
export const CINEMATIC_STOCKS = ['NVDA', 'TSLA', 'AAPL', 'LLY', 'NFLX', 'XOM', 'JPM', 'AMZN', 'META', 'GOOGL'];
export const CINEMATIC_INTERVAL = 10000; // 10s per stock

const initialStocks = generateMarketData();
const initialSectors = groupBySector(initialStocks);
const initialMood = computeMarketMood(initialStocks);

// Auto-select biggest daily mover for first load wow
const biggestMover = [...initialStocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0]?.symbol || 'AAPL';

export const useStore = create<AppState>((set, get) => ({
  view: 'heatmap',
  setView: (v) => set({ view: v }),
  
  stocks: initialStocks,
  sectors: initialSectors,
  marketMood: initialMood,
  refreshMarket: () => {
    const stocks = generateMarketData(Date.now());
    set({ stocks, sectors: groupBySector(stocks), marketMood: computeMarketMood(stocks) });
  },
  
  selectedSymbol: biggestMover,
  setSelectedSymbol: (s) => set({ selectedSymbol: s, candleData: getCandleData(s, get().chartTimeframe) }),
  candleData: getCandleData(biggestMover, '1Y'),
  chartTimeframe: '1Y',
  setChartTimeframe: (t) => set({ chartTimeframe: t, candleData: getCandleData(get().selectedSymbol, t) }),
  activeIndicators: new Set<Indicator>(['volume']),
  toggleIndicator: (i) => {
    const current = new Set(get().activeIndicators);
    if (current.has(i)) current.delete(i);
    else current.add(i);
    set({ activeIndicators: current });
  },
  comparisonMode: false,
  setComparisonMode: (on) => set({ comparisonMode: on }),
  
  cinematicActive: false,
  setCinematicActive: (on) => set({ cinematicActive: on }),
  
  portfolio: createPortfolio(100000),
  buyStock: (symbol, shares, price) => {
    const result = executeTrade(get().portfolio, symbol, 'buy', shares, price);
    if (result.success) { set({ portfolio: result.portfolio }); return null; }
    return result.error || 'Trade failed';
  },
  sellStock: (symbol, shares, price) => {
    const result = executeTrade(get().portfolio, symbol, 'sell', shares, price);
    if (result.success) { set({ portfolio: result.portfolio }); return null; }
    return result.error || 'Trade failed';
  },
  resetPortfolio: () => set({ portfolio: createPortfolio(100000) }),
}));
