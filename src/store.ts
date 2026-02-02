// Zustand store — thin state + actions layer, no business logic.
// All computation lives in data/ modules.

import { create } from 'zustand';
import { generateMarketData, groupBySector } from './data/marketData';
import { getCandleData } from './data/candleHelpers';
import { computeMarketMood } from './data/marketMood';
import { createPortfolio, executeTrade } from './data/portfolioData';
import { DEFAULT_STARTING_CASH } from './constants';
import type {
  View,
  ChartTimeframe,
  Indicator,
  MarketMood,
  Stock,
  Sector,
  Candle,
  Portfolio,
} from './types';

// ── State shape ──

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

// ── Initial state (computed once at module load) ──

const initialStocks = generateMarketData();
const initialSectors = groupBySector(initialStocks);
const initialMood = computeMarketMood(initialStocks);

// Auto-select biggest daily mover for first load wow
const biggestMover = [...initialStocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0]?.symbol || 'AAPL';

// ── Store ──

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

  portfolio: createPortfolio(DEFAULT_STARTING_CASH),
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
  resetPortfolio: () => set({ portfolio: createPortfolio(DEFAULT_STARTING_CASH) }),
}));
