// Barrel exports for data layer — single import point for all data modules

// Market data
export { generateMarketData, fetchMarketData, groupBySector } from './marketData';

// Candlestick data
export { generateCandlestickData, fetchCandlestickData } from './candlestickData';

// Candle helpers (shared between store and components)
export { getCandleData, getCandleDataAsync, clearCandleCache, DEFAULT_PRESET, GENERATION_DAYS } from './candleHelpers';

// Technical indicators
export {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from './indicators';

// Portfolio
export {
  createPortfolio,
  executeTrade,
  getPortfolioValue,
  getPortfolioReturn,
  getPositionPnL,
} from './portfolioData';

// Market mood
export { computeMarketMood, MOOD_THRESHOLDS } from './marketMood';

// Sparklines
export {
  generateSparkline,
  sparklineToPath,
  sparklineToArea,
  generateAllSparklines,
  SPARKLINE_POINTS,
} from './sparklines';
export type { Sparkline } from './sparklines';
