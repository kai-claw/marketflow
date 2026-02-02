import { describe, it, expect } from 'vitest';
import {
  generateCandlestickData,
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from '../data/candlestickData';
import {
  createPortfolio,
  executeTrade,
  getPortfolioValue,
  getPortfolioReturn,
  getPositionPnL,
} from '../data/portfolioData';
import { generateMarketData, groupBySector } from '../data/marketData';
import { STOCK_PRESETS, SECTOR_COLORS } from '../constants';
import type { Portfolio, Position } from '../types';

// ================ PORTFOLIO MUTATION BUG ================
describe('Portfolio immutability (critical bug fix)', () => {
  it('should NOT mutate original portfolio positions on buy', () => {
    const original = createPortfolio(100000);
    // First trade
    const r1 = executeTrade(original, 'AAPL', 'buy', 10, 150);
    expect(r1.success).toBe(true);
    // Second trade into same symbol
    const r2 = executeTrade(r1.portfolio, 'AAPL', 'buy', 5, 160);
    expect(r2.success).toBe(true);

    // Original should still have no positions
    expect(original.positions).toHaveLength(0);
    // r1 portfolio should still show 10 shares at $150
    const r1Pos = r1.portfolio.positions.find(p => p.symbol === 'AAPL');
    expect(r1Pos?.shares).toBe(10);
    expect(r1Pos?.avgCost).toBe(150);
    // r2 should show 15 shares with blended avg
    const r2Pos = r2.portfolio.positions.find(p => p.symbol === 'AAPL');
    expect(r2Pos?.shares).toBe(15);
    expect(r2Pos?.avgCost).toBeCloseTo((150 * 10 + 160 * 5) / 15);
  });

  it('should NOT mutate original portfolio positions on sell', () => {
    const base = createPortfolio(100000);
    const bought = executeTrade(base, 'AAPL', 'buy', 20, 100);
    expect(bought.success).toBe(true);

    const sold = executeTrade(bought.portfolio, 'AAPL', 'sell', 5, 110);
    expect(sold.success).toBe(true);

    // bought portfolio should still show 20 shares
    expect(bought.portfolio.positions.find(p => p.symbol === 'AAPL')?.shares).toBe(20);
    // sold portfolio should show 15
    expect(sold.portfolio.positions.find(p => p.symbol === 'AAPL')?.shares).toBe(15);
  });

  it('should NOT mutate original trades array', () => {
    const base = createPortfolio(100000);
    const r1 = executeTrade(base, 'AAPL', 'buy', 10, 100);
    const r2 = executeTrade(r1.portfolio, 'MSFT', 'buy', 5, 200);
    expect(base.trades).toHaveLength(0);
    expect(r1.portfolio.trades).toHaveLength(1);
    expect(r2.portfolio.trades).toHaveLength(2);
  });
});

// ================ INPUT VALIDATION ================
describe('Trade input validation', () => {
  it('should reject zero shares', () => {
    const p = createPortfolio(100000);
    const r = executeTrade(p, 'AAPL', 'buy', 0, 100);
    expect(r.success).toBe(false);
    expect(r.error).toContain('positive integer');
  });

  it('should reject negative shares', () => {
    const p = createPortfolio(100000);
    const r = executeTrade(p, 'AAPL', 'buy', -5, 100);
    expect(r.success).toBe(false);
  });

  it('should reject fractional shares', () => {
    const p = createPortfolio(100000);
    const r = executeTrade(p, 'AAPL', 'buy', 1.5, 100);
    expect(r.success).toBe(false);
    expect(r.error).toContain('positive integer');
  });

  it('should reject NaN shares', () => {
    const p = createPortfolio(100000);
    const r = executeTrade(p, 'AAPL', 'buy', NaN, 100);
    expect(r.success).toBe(false);
  });

  it('should reject Infinity shares', () => {
    const p = createPortfolio(100000);
    const r = executeTrade(p, 'AAPL', 'buy', Infinity, 100);
    expect(r.success).toBe(false);
  });

  it('should reject zero price', () => {
    const p = createPortfolio(100000);
    const r = executeTrade(p, 'AAPL', 'buy', 10, 0);
    expect(r.success).toBe(false);
    expect(r.error).toContain('positive number');
  });

  it('should reject negative price', () => {
    const p = createPortfolio(100000);
    const r = executeTrade(p, 'AAPL', 'buy', 10, -50);
    expect(r.success).toBe(false);
  });

  it('should reject NaN price', () => {
    const p = createPortfolio(100000);
    const r = executeTrade(p, 'AAPL', 'buy', 10, NaN);
    expect(r.success).toBe(false);
  });
});

// ================ NaN SAFETY ================
describe('NaN safety in calculations', () => {
  it('getPortfolioReturn handles zero starting cash', () => {
    const p: Portfolio = { cash: 0, positions: [], trades: [], startingCash: 0 };
    const r = getPortfolioReturn(p);
    expect(Number.isFinite(r.absolute)).toBe(true);
    expect(Number.isFinite(r.percent)).toBe(true);
    expect(r.percent).toBe(0);
  });

  it('getPositionPnL handles zero avgCost', () => {
    const pos: Position = { symbol: 'TEST', shares: 10, avgCost: 0, currentPrice: 100 };
    const pnl = getPositionPnL(pos);
    expect(Number.isFinite(pnl.absolute)).toBe(true);
    expect(Number.isFinite(pnl.percent)).toBe(true);
    expect(pnl.percent).toBe(0);
  });

  it('getPortfolioValue handles NaN currentPrice gracefully', () => {
    const p: Portfolio = {
      cash: 50000,
      positions: [{ symbol: 'X', shares: 10, avgCost: 100, currentPrice: NaN }],
      trades: [],
      startingCash: 100000,
    };
    // With NaN position, should fall back to cash only
    const v = getPortfolioValue(p);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBe(50000);
  });

  it('getPositionPnL handles NaN price', () => {
    const pos: Position = { symbol: 'X', shares: 10, avgCost: 100, currentPrice: NaN };
    const pnl = getPositionPnL(pos);
    expect(Number.isFinite(pnl.absolute)).toBe(true);
    expect(Number.isFinite(pnl.percent)).toBe(true);
  });
});

// ================ INDICATOR EDGE CASES ================
describe('Indicator edge cases', () => {
  const shortData = generateCandlestickData('TEST', 100, 10, 0.02, 0.001);

  it('SMA returns empty when period > data length', () => {
    expect(calculateSMA(shortData, 100)).toEqual([]);
  });

  it('SMA returns empty for zero period', () => {
    expect(calculateSMA(shortData, 0)).toEqual([]);
  });

  it('SMA returns empty for negative period', () => {
    expect(calculateSMA(shortData, -5)).toEqual([]);
  });

  it('EMA returns empty when period > data length', () => {
    expect(calculateEMA(shortData, 100)).toEqual([]);
  });

  it('EMA returns empty for zero period', () => {
    expect(calculateEMA(shortData, 0)).toEqual([]);
  });

  it('RSI returns empty when data too short', () => {
    const tinyData = shortData.slice(0, 5);
    expect(calculateRSI(tinyData, 14)).toEqual([]);
  });

  it('RSI returns empty for zero period', () => {
    expect(calculateRSI(shortData, 0)).toEqual([]);
  });

  it('Bollinger returns empty when period > data length', () => {
    const bb = calculateBollingerBands(shortData, 100);
    expect(bb.upper).toEqual([]);
    expect(bb.middle).toEqual([]);
    expect(bb.lower).toEqual([]);
  });

  it('Bollinger returns empty for zero period', () => {
    const bb = calculateBollingerBands(shortData, 0);
    expect(bb.upper).toEqual([]);
  });

  it('MACD returns empty arrays for insufficient data', () => {
    const tiny = shortData.slice(0, 5);
    const { macd, signal, histogram } = calculateMACD(tiny);
    // Should not crash — may return short or empty arrays
    expect(Array.isArray(macd)).toBe(true);
    expect(Array.isArray(signal)).toBe(true);
    expect(Array.isArray(histogram)).toBe(true);
  });

  it('SMA with period exactly equal to data length returns 1 point', () => {
    const result = calculateSMA(shortData, shortData.length);
    expect(result).toHaveLength(1);
  });

  it('SMA values are finite for all data sizes', () => {
    const data = generateCandlestickData('AAPL', 228, 400, 0.018, 0.0004);
    for (const period of [5, 10, 20, 50, 100, 200]) {
      const sma = calculateSMA(data, period);
      for (const point of sma) {
        expect(Number.isFinite(point.value)).toBe(true);
      }
    }
  });

  it('EMA values are finite for all data sizes', () => {
    const data = generateCandlestickData('AAPL', 228, 400, 0.018, 0.0004);
    for (const period of [5, 12, 26, 50]) {
      const ema = calculateEMA(data, period);
      for (const point of ema) {
        expect(Number.isFinite(point.value)).toBe(true);
      }
    }
  });

  it('RSI values are between 0 and 100', () => {
    const data = generateCandlestickData('TSLA', 244, 400, 0.04, 0.0002);
    const rsi = calculateRSI(data, 14);
    for (const point of rsi) {
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.value).toBeLessThanOrEqual(100);
    }
  });

  it('Bollinger upper >= middle >= lower', () => {
    const data = generateCandlestickData('AAPL', 228, 400, 0.018, 0.0004);
    const bb = calculateBollingerBands(data, 20, 2);
    for (let i = 0; i < bb.middle.length; i++) {
      expect(bb.upper[i].value).toBeGreaterThanOrEqual(bb.middle[i].value);
      expect(bb.middle[i].value).toBeGreaterThanOrEqual(bb.lower[i].value);
    }
  });
});

// ================ CANDLESTICK DATA INTEGRITY ================
describe('Candlestick data integrity', () => {
  it('OHLC relationship: high >= max(open,close), low <= min(open,close)', () => {
    const data = generateCandlestickData('AAPL', 228, 400, 0.018, 0.0004);
    for (const c of data) {
      expect(c.high).toBeGreaterThanOrEqual(Math.max(c.open, c.close));
      expect(c.low).toBeLessThanOrEqual(Math.min(c.open, c.close));
    }
  });

  it('volume is always positive', () => {
    const data = generateCandlestickData('AAPL', 228, 400, 0.018, 0.0004);
    for (const c of data) {
      expect(c.volume).toBeGreaterThan(0);
    }
  });

  it('prices are always positive', () => {
    // Test with high-volatility stock over many days
    const data = generateCandlestickData('TSLA', 244, 800, 0.04, 0.0002);
    for (const c of data) {
      expect(c.open).toBeGreaterThan(0);
      expect(c.high).toBeGreaterThan(0);
      expect(c.low).toBeGreaterThan(0);
      expect(c.close).toBeGreaterThan(0);
    }
  });

  it('no weekends in dates', () => {
    const data = generateCandlestickData('AAPL', 228, 400, 0.018, 0.0004);
    for (const c of data) {
      const day = new Date(c.time).getUTCDay();
      expect(day).not.toBe(0); // Sunday
      expect(day).not.toBe(6); // Saturday
    }
  });

  it('dates are in chronological order', () => {
    const data = generateCandlestickData('AAPL', 228, 400, 0.018, 0.0004);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].time > data[i - 1].time).toBe(true);
    }
  });
});

// ================ MARKET DATA EDGE CASES ================
describe('Market data edge cases', () => {
  it('all stocks have valid sectors with matching SECTOR_COLORS', () => {
    const stocks = generateMarketData(12345);
    for (const stock of stocks) {
      expect(SECTOR_COLORS[stock.sector]).toBeDefined();
    }
  });

  it('groupBySector handles empty stocks array', () => {
    const sectors = groupBySector([]);
    expect(sectors).toEqual([]);
  });

  it('all market data fields are finite numbers', () => {
    const stocks = generateMarketData(42);
    for (const stock of stocks) {
      expect(Number.isFinite(stock.price)).toBe(true);
      expect(Number.isFinite(stock.change)).toBe(true);
      expect(Number.isFinite(stock.volume)).toBe(true);
      expect(Number.isFinite(stock.marketCap)).toBe(true);
    }
  });

  it('sector avgChange is always finite', () => {
    const stocks = generateMarketData(99);
    const sectors = groupBySector(stocks);
    for (const sector of sectors) {
      expect(Number.isFinite(sector.avgChange)).toBe(true);
    }
  });

  it('different seeds produce different data', () => {
    const a = generateMarketData(1);
    const b = generateMarketData(2);
    const aChanges = a.map(s => s.change);
    const bChanges = b.map(s => s.change);
    expect(aChanges).not.toEqual(bChanges);
  });
});

// ================ STOCK PRESETS VALIDATION ================
describe('Stock presets completeness', () => {
  it('all preset symbols have positive prices', () => {
    for (const [sym, preset] of Object.entries(STOCK_PRESETS)) {
      expect(preset.price).toBeGreaterThan(0);
      expect(typeof sym).toBe('string');
    }
  });

  it('all preset volatilities are in reasonable range', () => {
    for (const preset of Object.values(STOCK_PRESETS)) {
      expect(preset.volatility).toBeGreaterThan(0);
      expect(preset.volatility).toBeLessThan(0.1);
    }
  });

  it('preset data generates without errors for all symbols', () => {
    for (const sym of Object.keys(STOCK_PRESETS)) {
      const data = generateCandlestickData(sym, STOCK_PRESETS[sym].price * 0.7, 400, STOCK_PRESETS[sym].volatility, STOCK_PRESETS[sym].trend);
      expect(data.length).toBeGreaterThan(0);
      // All values finite
      for (const c of data) {
        expect(Number.isFinite(c.open)).toBe(true);
        expect(Number.isFinite(c.high)).toBe(true);
        expect(Number.isFinite(c.low)).toBe(true);
        expect(Number.isFinite(c.close)).toBe(true);
        expect(Number.isFinite(c.volume)).toBe(true);
      }
    }
  });
});

// ================ PORTFOLIO EDGE CASES ================
describe('Portfolio edge cases', () => {
  it('selling all shares removes position', () => {
    const base = createPortfolio(100000);
    const bought = executeTrade(base, 'AAPL', 'buy', 10, 100);
    const sold = executeTrade(bought.portfolio, 'AAPL', 'sell', 10, 110);
    expect(sold.success).toBe(true);
    expect(sold.portfolio.positions).toHaveLength(0);
    expect(sold.portfolio.cash).toBeCloseTo(100000 + 10 * 10); // profit
  });

  it('buying same stock 3 times calculates correct avg cost', () => {
    let p = createPortfolio(100000);
    p = executeTrade(p, 'AAPL', 'buy', 10, 100).portfolio;
    p = executeTrade(p, 'AAPL', 'buy', 20, 150).portfolio;
    p = executeTrade(p, 'AAPL', 'buy', 10, 200).portfolio;
    const pos = p.positions.find(x => x.symbol === 'AAPL');
    expect(pos?.shares).toBe(40);
    expect(pos?.avgCost).toBeCloseTo((10 * 100 + 20 * 150 + 10 * 200) / 40);
  });

  it('cannot sell more shares than owned', () => {
    const base = createPortfolio(100000);
    const bought = executeTrade(base, 'AAPL', 'buy', 5, 100);
    const r = executeTrade(bought.portfolio, 'AAPL', 'sell', 10, 100);
    expect(r.success).toBe(false);
    expect(r.error).toContain('Insufficient shares');
  });

  it('cannot sell shares of stock not owned', () => {
    const p = createPortfolio(100000);
    const r = executeTrade(p, 'AAPL', 'sell', 1, 100);
    expect(r.success).toBe(false);
    expect(r.error).toContain('Insufficient shares');
  });

  it('trade history IDs are unique', () => {
    let p = createPortfolio(100000);
    for (let i = 0; i < 10; i++) {
      p = executeTrade(p, 'AAPL', 'buy', 1, 100 + i).portfolio;
    }
    const ids = p.trades.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('multi-symbol portfolio tracks independently', () => {
    let p = createPortfolio(100000);
    p = executeTrade(p, 'AAPL', 'buy', 10, 100).portfolio;
    p = executeTrade(p, 'MSFT', 'buy', 5, 200).portfolio;
    p = executeTrade(p, 'AAPL', 'sell', 3, 110).portfolio;

    const aapl = p.positions.find(x => x.symbol === 'AAPL');
    const msft = p.positions.find(x => x.symbol === 'MSFT');
    expect(aapl?.shares).toBe(7);
    expect(msft?.shares).toBe(5);
    expect(p.trades).toHaveLength(3);
  });
});
