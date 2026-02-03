// Zustand store — thin state + actions layer, no business logic.
// All computation lives in data/ modules.
// Now supports async data loading from Alpaca with auto-refresh.

import { create } from 'zustand';
import { generateMarketData, fetchMarketData, groupBySector } from './data/marketData';
import { getCandleData, getCandleDataAsync, clearCandleCache } from './data/candleHelpers';
import { computeMarketMood } from './data/marketMood';
import { createPortfolio, executeTrade } from './data/portfolioData';
import { isMarketOpen } from './api/alpaca';
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

  // Data status
  isLoading: boolean;
  isLiveData: boolean;
  isCandlesLive: boolean;
  lastUpdated: number | null;
  error: string | null;
  marketOpen: boolean;

  // Async actions
  initLiveData: () => Promise<void>;
  refreshMarketAsync: () => Promise<void>;

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

  // Async chart
  loadCandleData: (symbol: string, timeframe: ChartTimeframe) => Promise<void>;

  // Cinematic
  cinematicActive: boolean;
  setCinematicActive: (on: boolean) => void;

  // Portfolio
  portfolio: Portfolio;
  buyStock: (symbol: string, shares: number, price: number) => string | null;
  sellStock: (symbol: string, shares: number, price: number) => string | null;
  resetPortfolio: () => void;
}

// ── Initial state (computed once at module load — sync fallback) ──

const initialStocks = generateMarketData();
const initialSectors = groupBySector(initialStocks);
const initialMood = computeMarketMood(initialStocks);

// Auto-select biggest daily mover for first load wow
const biggestMover = [...initialStocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0]?.symbol || 'AAPL';

// ── Auto-refresh interval ──

let refreshInterval: ReturnType<typeof setInterval> | null = null;

function startAutoRefresh(refreshFn: () => Promise<void>) {
  stopAutoRefresh();
  // Refresh every 60s
  refreshInterval = setInterval(async () => {
    // Only refresh if market is open
    if (isMarketOpen()) {
      await refreshFn();
    }
  }, 60_000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// ── Store ──

export const useStore = create<AppState>((set, get) => ({
  view: 'heatmap',
  setView: (v) => set({ view: v }),

  stocks: initialStocks,
  sectors: initialSectors,
  marketMood: initialMood,

  // Data status
  isLoading: false,
  isLiveData: false,
  isCandlesLive: false,
  lastUpdated: null,
  error: null,
  marketOpen: isMarketOpen(),

  // Sync refresh (keeps backward compat — now only used as fallback)
  refreshMarket: () => {
    // Trigger async refresh instead
    get().refreshMarketAsync();
  },

  // Async init — called once on mount
  initLiveData: async () => {
    set({ isLoading: true, error: null, marketOpen: isMarketOpen() });

    try {
      const { stocks, isLive } = await fetchMarketData();
      const sectors = groupBySector(stocks);
      const mood = computeMarketMood(stocks);

      set({
        stocks,
        sectors,
        marketMood: mood,
        isLiveData: isLive,
        lastUpdated: Date.now(),
        isLoading: false,
      });

      // Load candle data for selected symbol
      const state = get();
      await state.loadCandleData(state.selectedSymbol, state.chartTimeframe);

      // Start auto-refresh
      startAutoRefresh(get().refreshMarketAsync);
    } catch (err) {
      console.warn('[Store] Init failed, using mock data:', err);
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load market data',
        isLiveData: false,
      });
    }
  },

  // Async refresh
  refreshMarketAsync: async () => {
    set({ marketOpen: isMarketOpen() });
    clearCandleCache();

    try {
      const { stocks, isLive } = await fetchMarketData();
      const sectors = groupBySector(stocks);
      const mood = computeMarketMood(stocks);

      set({
        stocks,
        sectors,
        marketMood: mood,
        isLiveData: isLive,
        lastUpdated: Date.now(),
        error: null,
      });
    } catch (err) {
      console.warn('[Store] Refresh failed:', err);
      // On refresh failure, keep existing data, just update with mock
      const stocks = generateMarketData(Date.now());
      set({
        stocks,
        sectors: groupBySector(stocks),
        marketMood: computeMarketMood(stocks),
        isLiveData: false,
        lastUpdated: Date.now(),
      });
    }
  },

  selectedSymbol: biggestMover,
  setSelectedSymbol: (s) => {
    // Immediately set symbol with sync data, then async load real data
    set({
      selectedSymbol: s,
      candleData: getCandleData(s, get().chartTimeframe),
      isCandlesLive: false,
    });
    // Fire and forget async load
    get().loadCandleData(s, get().chartTimeframe);
  },
  candleData: getCandleData(biggestMover, '1Y'),
  chartTimeframe: '1Y',
  setChartTimeframe: (t) => {
    set({
      chartTimeframe: t,
      candleData: getCandleData(get().selectedSymbol, t),
      isCandlesLive: false,
    });
    // Fire and forget async load
    get().loadCandleData(get().selectedSymbol, t);
  },

  // Async candle loader
  loadCandleData: async (symbol, timeframe) => {
    try {
      const { candles, isLive } = await getCandleDataAsync(symbol, timeframe);
      // Only update if still the selected symbol/timeframe (avoid stale updates)
      const state = get();
      if (state.selectedSymbol === symbol && state.chartTimeframe === timeframe) {
        set({ candleData: candles, isCandlesLive: isLive });
      }
    } catch {
      // Keep existing sync data
    }
  },

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
