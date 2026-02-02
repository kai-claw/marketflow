import { describe, it, expect } from 'vitest';
import { generateMarketData, groupBySector } from '../data/marketData';
import { generateCandlestickData, STOCK_PRESETS, calculateSMA, calculateEMA } from '../data/candlestickData';

// --- Market Ticker Tests ---
describe('Market Ticker data requirements', () => {
  it('generates enough stocks for a meaningful ticker', () => {
    const stocks = generateMarketData();
    expect(stocks.length).toBeGreaterThanOrEqual(60);
  });

  it('all stocks have change values for ticker display', () => {
    const stocks = generateMarketData();
    for (const s of stocks) {
      expect(typeof s.change).toBe('number');
      expect(Number.isFinite(s.change)).toBe(true);
      expect(typeof s.price).toBe('number');
      expect(s.price).toBeGreaterThan(0);
    }
  });

  it('stocks can be sorted by absolute change for biggest movers', () => {
    const stocks = generateMarketData();
    const sorted = [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    expect(Math.abs(sorted[0].change)).toBeGreaterThanOrEqual(Math.abs(sorted[sorted.length - 1].change));
    // Should have variety
    const changes = new Set(stocks.map(s => s.change));
    expect(changes.size).toBeGreaterThan(10);
  });

  it('ticker doubling produces seamless loop data', () => {
    const stocks = generateMarketData();
    const sorted = [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const doubled = [...sorted, ...sorted];
    expect(doubled.length).toBe(sorted.length * 2);
    // First half matches second half
    for (let i = 0; i < sorted.length; i++) {
      expect(doubled[i].symbol).toBe(doubled[i + sorted.length].symbol);
    }
  });
});

// --- Heatmap Pulse Tests ---
describe('Heatmap pulse animation data', () => {
  it('all stocks have volume for pulse intensity calculation', () => {
    const stocks = generateMarketData();
    for (const s of stocks) {
      expect(typeof s.volume).toBe('number');
      expect(s.volume).toBeGreaterThan(0);
      expect(Number.isFinite(s.volume)).toBe(true);
    }
  });

  it('volume range produces meaningful pulse intensity variation', () => {
    const stocks = generateMarketData();
    const volumes = stocks.map(s => s.volume);
    const max = Math.max(...volumes);
    const min = Math.min(...volumes);
    const range = max - min;
    // There should be meaningful variation
    expect(range).toBeGreaterThan(0);
    // Intensity calculation: (vol - min) / range produces 0-1
    const intensities = volumes.map(v => (v - min) / range);
    expect(Math.min(...intensities)).toBeCloseTo(0, 5);
    expect(Math.max(...intensities)).toBeCloseTo(1, 5);
  });

  it('pulse duration calculation produces valid range', () => {
    // duration = 2 + (1 - intensity) * 3, so range is 2-5s
    const durations = [0, 0.25, 0.5, 0.75, 1].map(intensity => 2 + (1 - intensity) * 3);
    expect(durations[0]).toBe(5); // lowest intensity = slowest
    expect(durations[4]).toBe(2); // highest intensity = fastest
    for (const d of durations) {
      expect(d).toBeGreaterThanOrEqual(2);
      expect(d).toBeLessThanOrEqual(5);
    }
  });

  it('pulse opacity minimum range is valid', () => {
    // opacMin = 0.85 + (1 - intensity) * 0.15, range 0.85-1.0
    const opacMins = [0, 0.5, 1].map(intensity => 0.85 + (1 - intensity) * 0.15);
    expect(opacMins[0]).toBe(1.0);   // lowest intensity = no pulse
    expect(opacMins[2]).toBe(0.85);  // highest intensity = most visible pulse
    for (const o of opacMins) {
      expect(o).toBeGreaterThanOrEqual(0.85);
      expect(o).toBeLessThanOrEqual(1.0);
    }
  });
});

// --- Stock Comparison Tests ---
describe('Stock comparison normalization', () => {
  function normalizeToPercent(candles: { time: string; open: number; close: number }[]) {
    if (candles.length === 0) return [];
    const basePrice = candles[0].open;
    if (basePrice === 0) return [];
    return candles.map(c => ({
      time: c.time,
      value: Number((((c.close - basePrice) / basePrice) * 100).toFixed(2)),
    }));
  }

  it('normalizes candle data to percentage change from start', () => {
    const candles = generateCandlestickData('AAPL', 100, 30, 0.02, 0.001);
    const normalized = normalizeToPercent(candles);
    expect(normalized.length).toBe(candles.length);
    // First value should be close to 0% (open vs close of first day)
    expect(Math.abs(normalized[0].value)).toBeLessThan(10);
  });

  it('handles empty candle array', () => {
    const result = normalizeToPercent([]);
    expect(result).toEqual([]);
  });

  it('handles zero base price', () => {
    const result = normalizeToPercent([{ time: '2025-01-01', open: 0, close: 50 }]);
    expect(result).toEqual([]);
  });

  it('produces correct percentage values', () => {
    const mock = [
      { time: '2025-01-01', open: 100, close: 100 },
      { time: '2025-01-02', open: 105, close: 110 },
      { time: '2025-01-03', open: 110, close: 90 },
    ];
    const normalized = normalizeToPercent(mock);
    expect(normalized[0].value).toBe(0); // 100 → 100 = 0%
    expect(normalized[1].value).toBe(10); // 100 → 110 = +10%
    expect(normalized[2].value).toBe(-10); // 100 → 90 = -10%
  });

  it('different stocks produce different normalized curves', () => {
    const aapl = generateCandlestickData('AAPL', 228, 100, 0.018, 0.0004);
    const tsla = generateCandlestickData('TSLA', 245, 100, 0.04, 0.0002);
    const normalizedAAPL = normalizeToPercent(aapl);
    const normalizedTSLA = normalizeToPercent(tsla);
    // Both should have data
    expect(normalizedAAPL.length).toBeGreaterThan(0);
    expect(normalizedTSLA.length).toBeGreaterThan(0);
    // Final values should differ (different volatility/trend)
    const lastAAPL = normalizedAAPL[normalizedAAPL.length - 1].value;
    const lastTSLA = normalizedTSLA[normalizedTSLA.length - 1].value;
    expect(lastAAPL).not.toEqual(lastTSLA);
  });

  it('all STOCK_PRESETS generate valid comparison data', () => {
    const symbols = Object.keys(STOCK_PRESETS);
    expect(symbols.length).toBeGreaterThanOrEqual(10);
    for (const sym of symbols) {
      const preset = STOCK_PRESETS[sym];
      const candles = generateCandlestickData(sym, preset.price * 0.7, 100, preset.volatility, preset.trend);
      const normalized = normalizeToPercent(candles);
      expect(normalized.length).toBeGreaterThan(0);
      for (const point of normalized) {
        expect(Number.isFinite(point.value)).toBe(true);
      }
    }
  });
});

// --- Comparison colors and limits ---
describe('Comparison mode constraints', () => {
  const COMPARISON_COLORS = [
    '#3b82f6', '#f59e0b', '#a855f7', '#22c55e',
    '#ec4899', '#14b8a6', '#ef4444', '#6366f1',
  ];

  it('has 8 comparison colors for up to 8 stocks', () => {
    expect(COMPARISON_COLORS.length).toBe(8);
  });

  it('all comparison colors are valid hex', () => {
    for (const c of COMPARISON_COLORS) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('all comparison colors are unique', () => {
    const unique = new Set(COMPARISON_COLORS);
    expect(unique.size).toBe(COMPARISON_COLORS.length);
  });

  it('STOCK_PRESETS has enough symbols for meaningful comparison', () => {
    const symbols = Object.keys(STOCK_PRESETS);
    expect(symbols.length).toBeGreaterThanOrEqual(8);
  });
});

// --- Sector data for ticker grouping ---
describe('Sector data for ticker display', () => {
  it('sectors cover all stocks', () => {
    const stocks = generateMarketData();
    const sectors = groupBySector(stocks);
    const totalStocksInSectors = sectors.reduce((sum, s) => sum + s.stocks.length, 0);
    expect(totalStocksInSectors).toBe(stocks.length);
  });

  it('sector avgChange is a valid number', () => {
    const stocks = generateMarketData();
    const sectors = groupBySector(stocks);
    for (const s of sectors) {
      expect(Number.isFinite(s.avgChange)).toBe(true);
    }
  });
});
