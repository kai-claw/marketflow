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

interface AppState {
  view: View;
  setView: (v: View) => void;
  
  // Market data
  stocks: Stock[];
  sectors: Sector[];
  refreshMarket: () => void;
  
  // Chart
  selectedSymbol: string;
  setSelectedSymbol: (s: string) => void;
  candleData: Candle[];
  chartTimeframe: ChartTimeframe;
  setChartTimeframe: (t: ChartTimeframe) => void;
  activeIndicators: Set<Indicator>;
  toggleIndicator: (i: Indicator) => void;
  
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

const initialStocks = generateMarketData();
const initialSectors = groupBySector(initialStocks);

export const useStore = create<AppState>((set, get) => ({
  view: 'heatmap',
  setView: (v) => set({ view: v }),
  
  stocks: initialStocks,
  sectors: initialSectors,
  refreshMarket: () => {
    const stocks = generateMarketData(Date.now());
    set({ stocks, sectors: groupBySector(stocks) });
  },
  
  selectedSymbol: 'AAPL',
  setSelectedSymbol: (s) => set({ selectedSymbol: s, candleData: getCandleData(s, get().chartTimeframe) }),
  candleData: getCandleData('AAPL', '1Y'),
  chartTimeframe: '1Y',
  setChartTimeframe: (t) => set({ chartTimeframe: t, candleData: getCandleData(get().selectedSymbol, t) }),
  activeIndicators: new Set<Indicator>(['volume']),
  toggleIndicator: (i) => {
    const current = new Set(get().activeIndicators);
    if (current.has(i)) current.delete(i);
    else current.add(i);
    set({ activeIndicators: current });
  },
  
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
