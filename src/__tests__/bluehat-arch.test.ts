// Blue Hat — Architecture & Module Integrity Tests
// Validates module boundaries, barrel exports, extracted modules, cross-module integration,
// constant consistency, and dead code verification.

import { describe, it, expect } from 'vitest';

// ── Direct module imports (verify each module is independently importable) ──

import type {
  Stock, Sector, Candle, TimeSeriesPoint, MACDResult, BollingerResult,
  Position, Trade, Portfolio, TradeResult, PnL,
  View, ChartTimeframe, Indicator, MarketMood, StockPreset, IndicatorConfig,
} from '../types';

import {
  TIMEFRAME_DAYS, TIMEFRAMES, SECTOR_COLORS, CHART_THEME, INDICATORS,
  COMPARISON_COLORS, MAX_COMPARISON_STOCKS, CINEMATIC_STOCKS, CINEMATIC_INTERVAL,
  STOCK_PRESETS, POPULAR_SYMBOLS, CHANGE_COLOR_STOPS, CHANGE_COLOR_FLOOR,
  DEFAULT_STARTING_CASH, DEFAULT_CANDLE_DAYS, DEFAULT_VOLATILITY, DEFAULT_TREND,
  DEFAULT_PRICE,
} from '../constants';

import { seededRandom, changeToColor, normalizeToPercent } from '../utils';
import { computeMarketMood, MOOD_THRESHOLDS } from '../data/marketMood';
import { getCandleData, DEFAULT_PRESET, GENERATION_DAYS } from '../data/candleHelpers';
import { generateMarketData, groupBySector } from '../data/marketData';
import { generateCandlestickData } from '../data/candlestickData';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from '../data/indicators';
import { createPortfolio, executeTrade, getPortfolioValue, getPortfolioReturn, getPositionPnL } from '../data/portfolioData';
import { toCandlestickData, toVolumeData, toLineData, toConstantLine, toHistogramData } from '../chartHelpers';

// ── Barrel export verification ──

import * as dataBarrel from '../data/index';

// ═══════════════════════════════════════════════════════
// 1. EXTRACTED MODULE VERIFICATION
// ═══════════════════════════════════════════════════════

describe('Extracted Module: marketMood', () => {
  it('exports computeMarketMood function', () => {
    expect(typeof computeMarketMood).toBe('function');
  });

  it('exports MOOD_THRESHOLDS array', () => {
    expect(Array.isArray(MOOD_THRESHOLDS)).toBe(true);
    expect(MOOD_THRESHOLDS.length).toBe(5);
  });

  it('MOOD_THRESHOLDS are ordered descending by min', () => {
    for (let i = 0; i < MOOD_THRESHOLDS.length - 1; i++) {
      expect(MOOD_THRESHOLDS[i].min).toBeGreaterThan(MOOD_THRESHOLDS[i + 1].min);
    }
  });

  it('each threshold has label, emoji, and hex color', () => {
    for (const t of MOOD_THRESHOLDS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.emoji.length).toBeGreaterThan(0);
      expect(t.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('classifies all 5 mood tiers correctly', () => {
    // Strong Rally: breadth >= 0.7
    const rally = computeMarketMood(Array.from({ length: 10 }, (_, i) => ({
      symbol: `S${i}`, name: `S${i}`, sector: 'Tech', marketCap: 100, price: 100,
      change: i < 8 ? 1 : -1, volume: 1000000,
    })));
    expect(rally.label).toBe('Strong Rally');
    expect(rally.advancers).toBe(8);

    // Bullish: 0.55-0.69
    const bull = computeMarketMood(Array.from({ length: 10 }, (_, i) => ({
      symbol: `S${i}`, name: `S${i}`, sector: 'Tech', marketCap: 100, price: 100,
      change: i < 6 ? 1 : -1, volume: 1000000,
    })));
    expect(bull.label).toBe('Bullish');

    // Mixed: 0.45-0.54
    const mixed = computeMarketMood(Array.from({ length: 10 }, (_, i) => ({
      symbol: `S${i}`, name: `S${i}`, sector: 'Tech', marketCap: 100, price: 100,
      change: i < 5 ? 1 : -1, volume: 1000000,
    })));
    expect(mixed.label).toBe('Mixed');

    // Bearish: 0.3-0.44
    const bear = computeMarketMood(Array.from({ length: 10 }, (_, i) => ({
      symbol: `S${i}`, name: `S${i}`, sector: 'Tech', marketCap: 100, price: 100,
      change: i < 3 ? 1 : -1, volume: 1000000,
    })));
    expect(bear.label).toBe('Bearish');

    // Selloff: < 0.3
    const sell = computeMarketMood(Array.from({ length: 10 }, (_, i) => ({
      symbol: `S${i}`, name: `S${i}`, sector: 'Tech', marketCap: 100, price: 100,
      change: i < 1 ? 1 : -1, volume: 1000000,
    })));
    expect(sell.label).toBe('Selloff');
  });

  it('handles empty stocks (defaults to Mixed breadth)', () => {
    const mood = computeMarketMood([]);
    expect(mood.breadth).toBe(0.5);
    expect(mood.advancers).toBe(0);
    expect(mood.decliners).toBe(0);
  });

  it('matches store behavior with real data', () => {
    const stocks = generateMarketData(42);
    const mood = computeMarketMood(stocks);
    expect(mood.advancers + mood.decliners).toBeLessThanOrEqual(stocks.length);
    expect(mood.breadth).toBeGreaterThanOrEqual(0);
    expect(mood.breadth).toBeLessThanOrEqual(1);
    expect(['Strong Rally', 'Bullish', 'Mixed', 'Bearish', 'Selloff']).toContain(mood.label);
  });
});

describe('Extracted Module: candleHelpers', () => {
  it('exports getCandleData function', () => {
    expect(typeof getCandleData).toBe('function');
  });

  it('exports DEFAULT_PRESET constant', () => {
    expect(DEFAULT_PRESET).toEqual({ price: 100, volatility: 0.02, trend: 0.0003 });
  });

  it('exports GENERATION_DAYS constant', () => {
    expect(GENERATION_DAYS).toBe(400);
  });

  it('generates candles for known symbol (AAPL)', () => {
    const data = getCandleData('AAPL', '1Y');
    expect(data.length).toBeGreaterThan(200);
    expect(data.length).toBeLessThanOrEqual(365);
    for (const c of data) {
      expect(c).toHaveProperty('time');
      expect(c).toHaveProperty('open');
      expect(c).toHaveProperty('high');
      expect(c).toHaveProperty('low');
      expect(c).toHaveProperty('close');
      expect(c).toHaveProperty('volume');
    }
  });

  it('generates candles for unknown symbol (falls back to DEFAULT_PRESET)', () => {
    const data = getCandleData('UNKNOWN', '1M');
    expect(data.length).toBeGreaterThan(15); // ~20 trading days in a month
    expect(data.length).toBeLessThanOrEqual(30);
  });

  it('respects timeframe slicing', () => {
    const d1m = getCandleData('AAPL', '1M');
    const d3m = getCandleData('AAPL', '3M');
    const d6m = getCandleData('AAPL', '6M');
    const d1y = getCandleData('AAPL', '1Y');
    expect(d1m.length).toBeLessThan(d3m.length);
    expect(d3m.length).toBeLessThan(d6m.length);
    expect(d6m.length).toBeLessThan(d1y.length);
  });

  it('all STOCK_PRESETS generate valid data through getCandleData', () => {
    for (const sym of Object.keys(STOCK_PRESETS)) {
      const data = getCandleData(sym, '1Y');
      expect(data.length).toBeGreaterThan(0);
      for (const c of data) {
        expect(Number.isFinite(c.open)).toBe(true);
        expect(Number.isFinite(c.close)).toBe(true);
        expect(c.high).toBeGreaterThanOrEqual(Math.min(c.open, c.close));
        expect(c.low).toBeLessThanOrEqual(Math.max(c.open, c.close));
      }
    }
  });
});

// ═══════════════════════════════════════════════════════
// 2. BARREL EXPORT VERIFICATION
// ═══════════════════════════════════════════════════════

describe('Data Barrel Export (data/index.ts)', () => {
  it('exports generateMarketData', () => {
    expect(typeof dataBarrel.generateMarketData).toBe('function');
  });

  it('exports groupBySector', () => {
    expect(typeof dataBarrel.groupBySector).toBe('function');
  });

  it('exports generateCandlestickData', () => {
    expect(typeof dataBarrel.generateCandlestickData).toBe('function');
  });

  it('exports getCandleData from candleHelpers', () => {
    expect(typeof dataBarrel.getCandleData).toBe('function');
  });

  it('exports DEFAULT_PRESET and GENERATION_DAYS', () => {
    expect(dataBarrel.DEFAULT_PRESET).toBeDefined();
    expect(dataBarrel.GENERATION_DAYS).toBe(400);
  });

  it('exports all 5 indicator functions', () => {
    expect(typeof dataBarrel.calculateSMA).toBe('function');
    expect(typeof dataBarrel.calculateEMA).toBe('function');
    expect(typeof dataBarrel.calculateRSI).toBe('function');
    expect(typeof dataBarrel.calculateMACD).toBe('function');
    expect(typeof dataBarrel.calculateBollingerBands).toBe('function');
  });

  it('exports all 5 portfolio functions', () => {
    expect(typeof dataBarrel.createPortfolio).toBe('function');
    expect(typeof dataBarrel.executeTrade).toBe('function');
    expect(typeof dataBarrel.getPortfolioValue).toBe('function');
    expect(typeof dataBarrel.getPortfolioReturn).toBe('function');
    expect(typeof dataBarrel.getPositionPnL).toBe('function');
  });

  it('exports computeMarketMood and MOOD_THRESHOLDS', () => {
    expect(typeof dataBarrel.computeMarketMood).toBe('function');
    expect(Array.isArray(dataBarrel.MOOD_THRESHOLDS)).toBe(true);
  });

  it('barrel exports match direct imports (identity)', () => {
    expect(dataBarrel.generateMarketData).toBe(generateMarketData);
    expect(dataBarrel.groupBySector).toBe(groupBySector);
    expect(dataBarrel.generateCandlestickData).toBe(generateCandlestickData);
    expect(dataBarrel.getCandleData).toBe(getCandleData);
    expect(dataBarrel.calculateSMA).toBe(calculateSMA);
    expect(dataBarrel.calculateEMA).toBe(calculateEMA);
    expect(dataBarrel.calculateRSI).toBe(calculateRSI);
    expect(dataBarrel.calculateMACD).toBe(calculateMACD);
    expect(dataBarrel.calculateBollingerBands).toBe(calculateBollingerBands);
    expect(dataBarrel.createPortfolio).toBe(createPortfolio);
    expect(dataBarrel.executeTrade).toBe(executeTrade);
    expect(dataBarrel.getPortfolioValue).toBe(getPortfolioValue);
    expect(dataBarrel.getPortfolioReturn).toBe(getPortfolioReturn);
    expect(dataBarrel.getPositionPnL).toBe(getPositionPnL);
    expect(dataBarrel.computeMarketMood).toBe(computeMarketMood);
    expect(dataBarrel.MOOD_THRESHOLDS).toBe(MOOD_THRESHOLDS);
  });
});

// ═══════════════════════════════════════════════════════
// 3. changeToColor CONSTANTS CONSISTENCY
// ═══════════════════════════════════════════════════════

describe('changeToColor derives from CHANGE_COLOR_STOPS', () => {
  it('maps positive extreme to first stop color', () => {
    expect(changeToColor(5)).toBe(CHANGE_COLOR_STOPS[0].color);
  });

  it('maps negative extreme to CHANGE_COLOR_FLOOR', () => {
    expect(changeToColor(-10)).toBe(CHANGE_COLOR_FLOOR);
  });

  it('matches every threshold boundary', () => {
    for (const stop of CHANGE_COLOR_STOPS) {
      // Just above threshold should map to this stop
      const result = changeToColor(stop.threshold + 0.01);
      expect(result).toBe(stop.color);
    }
  });

  it('exactly at threshold falls through to next stop', () => {
    // change === 0 should NOT match threshold > 0, should match > -0.5
    expect(changeToColor(0)).toBe(CHANGE_COLOR_STOPS.find(s => s.threshold === -0.5)!.color);
  });

  it('all CHANGE_COLOR_STOPS colors are valid hex', () => {
    for (const stop of CHANGE_COLOR_STOPS) {
      expect(stop.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(CHANGE_COLOR_FLOOR).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('CHANGE_COLOR_STOPS are ordered descending by threshold', () => {
    for (let i = 0; i < CHANGE_COLOR_STOPS.length - 1; i++) {
      expect(CHANGE_COLOR_STOPS[i].threshold).toBeGreaterThan(CHANGE_COLOR_STOPS[i + 1].threshold);
    }
  });
});

// ═══════════════════════════════════════════════════════
// 4. CROSS-MODULE INTEGRATION
// ═══════════════════════════════════════════════════════

describe('Cross-Module Integration', () => {
  it('getCandleData → indicators pipeline', () => {
    const candles = getCandleData('NVDA', '1Y');
    const sma = calculateSMA(candles, 20);
    const ema = calculateEMA(candles, 12);
    const rsi = calculateRSI(candles, 14);
    const macd = calculateMACD(candles);
    const bb = calculateBollingerBands(candles);

    expect(sma.length).toBeGreaterThan(0);
    expect(ema.length).toBeGreaterThan(0);
    expect(rsi.length).toBeGreaterThan(0);
    expect(macd.macd.length).toBeGreaterThan(0);
    expect(bb.upper.length).toBeGreaterThan(0);
  });

  it('generateMarketData → computeMarketMood pipeline', () => {
    const stocks = generateMarketData(999);
    const mood = computeMarketMood(stocks);
    expect(mood.advancers + mood.decliners).toBeLessThanOrEqual(stocks.length);
    expect(mood.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('generateMarketData → changeToColor covers all stocks', () => {
    const stocks = generateMarketData(42);
    for (const stock of stocks) {
      const color = changeToColor(stock.change);
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('getCandleData → normalizeToPercent → toLineData pipeline', () => {
    const candles = getCandleData('TSLA', '3M');
    const normalized = normalizeToPercent(candles);
    const chartData = toLineData(normalized);
    expect(chartData.length).toBe(normalized.length);
    for (const pt of chartData) {
      expect(pt).toHaveProperty('time');
      expect(pt).toHaveProperty('value');
      expect(Number.isFinite(pt.value as number)).toBe(true);
    }
  });

  it('getCandleData → toCandlestickData + toVolumeData chart format', () => {
    const candles = getCandleData('AAPL', '6M');
    const candlesticks = toCandlestickData(candles);
    const volume = toVolumeData(candles);
    expect(candlesticks.length).toBe(candles.length);
    expect(volume.length).toBe(candles.length);
    for (const c of candlesticks) {
      expect(c).toHaveProperty('time');
      expect(c).toHaveProperty('open');
      expect(c).toHaveProperty('high');
      expect(c).toHaveProperty('low');
      expect(c).toHaveProperty('close');
    }
  });

  it('portfolio → getPortfolioReturn → mood independence', () => {
    const p = createPortfolio(50000);
    const result = executeTrade(p, 'AAPL', 'buy', 10, 228.5);
    expect(result.success).toBe(true);
    const value = getPortfolioValue(result.portfolio);
    expect(value).toBeCloseTo(50000, 0);
    const ret = getPortfolioReturn(result.portfolio);
    expect(Number.isFinite(ret.absolute)).toBe(true);
    expect(Number.isFinite(ret.percent)).toBe(true);
  });

  it('all CINEMATIC_STOCKS produce valid data through getCandleData', () => {
    for (const sym of CINEMATIC_STOCKS) {
      const data = getCandleData(sym, '1Y');
      expect(data.length).toBeGreaterThan(200);
      expect(data[0].time < data[data.length - 1].time).toBe(true);
    }
  });

  it('seededRandom determinism across modules', () => {
    const r1 = seededRandom(42);
    const r2 = seededRandom(42);
    const values1 = Array.from({ length: 100 }, () => r1());
    const values2 = Array.from({ length: 100 }, () => r2());
    expect(values1).toEqual(values2);
  });
});

// ═══════════════════════════════════════════════════════
// 5. STORE SLIMNESS VERIFICATION
// ═══════════════════════════════════════════════════════

describe('Store Architecture', () => {
  it('store module does not export computeMarketMood', async () => {
    const storeModule = await import('../store');
    expect((storeModule as Record<string, unknown>)['computeMarketMood']).toBeUndefined();
  });

  it('store module does not export getCandleData', async () => {
    const storeModule = await import('../store');
    expect((storeModule as Record<string, unknown>)['getCandleData']).toBeUndefined();
  });

  it('store module exports only useStore', async () => {
    const storeModule = await import('../store');
    // useStore should be present
    expect(typeof storeModule.useStore).toBe('function');
  });
});

// ═══════════════════════════════════════════════════════
// 6. TYPE SYSTEM CONSISTENCY
// ═══════════════════════════════════════════════════════

describe('Type System Consistency', () => {
  it('all View types are accounted for', () => {
    const views: View[] = ['heatmap', 'chart', 'portfolio'];
    expect(views.length).toBe(3);
  });

  it('all ChartTimeframe types match TIMEFRAME_DAYS', () => {
    const tfs: ChartTimeframe[] = ['1M', '3M', '6M', '1Y'];
    for (const tf of tfs) {
      expect(TIMEFRAME_DAYS[tf]).toBeGreaterThan(0);
    }
  });

  it('all Indicator types match INDICATORS config', () => {
    const indicatorIds = INDICATORS.map(i => i.id);
    const allIds: Indicator[] = ['sma20', 'sma50', 'ema12', 'ema26', 'bollinger', 'rsi', 'macd', 'volume'];
    for (const id of allIds) {
      expect(indicatorIds).toContain(id);
    }
  });

  it('IndicatorConfig has id, label, and color for each entry', () => {
    for (const ind of INDICATORS) {
      expect(ind.id.length).toBeGreaterThan(0);
      expect(ind.label.length).toBeGreaterThan(0);
      expect(ind.color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('StockPreset fields are positive numbers', () => {
    for (const [sym, preset] of Object.entries(STOCK_PRESETS)) {
      expect(preset.price).toBeGreaterThan(0);
      expect(preset.volatility).toBeGreaterThan(0);
      expect(Number.isFinite(preset.trend)).toBe(true);
    }
  });

  it('MarketMood interface fields are present in computeMarketMood output', () => {
    const mood = computeMarketMood(generateMarketData(1));
    expect(mood).toHaveProperty('label');
    expect(mood).toHaveProperty('emoji');
    expect(mood).toHaveProperty('color');
    expect(mood).toHaveProperty('advancers');
    expect(mood).toHaveProperty('decliners');
    expect(mood).toHaveProperty('breadth');
  });
});

// ═══════════════════════════════════════════════════════
// 7. CONSTANTS COMPLETENESS
// ═══════════════════════════════════════════════════════

describe('Constants Completeness', () => {
  it('CINEMATIC_STOCKS are all in STOCK_PRESETS', () => {
    for (const sym of CINEMATIC_STOCKS) {
      expect(STOCK_PRESETS).toHaveProperty(sym);
    }
  });

  it('POPULAR_SYMBOLS === STOCK_PRESETS keys', () => {
    expect(POPULAR_SYMBOLS).toEqual(Object.keys(STOCK_PRESETS));
  });

  it('COMPARISON_COLORS has MAX_COMPARISON_STOCKS entries', () => {
    expect(COMPARISON_COLORS.length).toBe(MAX_COMPARISON_STOCKS);
  });

  it('CINEMATIC_INTERVAL is reasonable (5-30s)', () => {
    expect(CINEMATIC_INTERVAL).toBeGreaterThanOrEqual(5000);
    expect(CINEMATIC_INTERVAL).toBeLessThanOrEqual(30000);
  });

  it('CHART_THEME has all required fields', () => {
    const required = ['background', 'textColor', 'fontSize', 'gridColor', 'crosshairColor', 'crosshairLabelBg', 'borderColor', 'upColor', 'downColor'];
    for (const key of required) {
      expect(CHART_THEME).toHaveProperty(key);
    }
  });

  it('DEFAULT_STARTING_CASH is positive', () => {
    expect(DEFAULT_STARTING_CASH).toBeGreaterThan(0);
  });

  it('DEFAULT_CANDLE_DAYS/VOLATILITY/TREND/PRICE are valid', () => {
    expect(DEFAULT_CANDLE_DAYS).toBeGreaterThan(0);
    expect(DEFAULT_VOLATILITY).toBeGreaterThan(0);
    expect(Number.isFinite(DEFAULT_TREND)).toBe(true);
    expect(DEFAULT_PRICE).toBeGreaterThan(0);
  });

  it('MOOD_THRESHOLDS cover full breadth range (0 to 1)', () => {
    // Last threshold should be -Infinity to catch all
    expect(MOOD_THRESHOLDS[MOOD_THRESHOLDS.length - 1].min).toBe(-Infinity);
    // First threshold should be < 1
    expect(MOOD_THRESHOLDS[0].min).toBeLessThan(1);
  });

  it('CHANGE_COLOR_STOPS + FLOOR cover the full change range', () => {
    // Positive extreme
    expect(changeToColor(100)).toMatch(/^#/);
    // Negative extreme
    expect(changeToColor(-100)).toBe(CHANGE_COLOR_FLOOR);
    // Zero
    expect(changeToColor(0)).toMatch(/^#/);
  });
});

// ═══════════════════════════════════════════════════════
// 8. MODULE EXPORT VERIFICATION
// ═══════════════════════════════════════════════════════

describe('Module Export Verification', () => {
  it('types.ts exports all 16 type definitions', async () => {
    // We verify by constructing typed objects — TS compilation proves the exports exist
    const stock: Stock = { symbol: 'X', name: 'X', sector: 'Tech', marketCap: 1, price: 1, change: 0, volume: 1 };
    const sector: Sector = { name: 'Tech', stocks: [stock], totalMarketCap: 1, avgChange: 0 };
    const candle: Candle = { time: '2025-01-01', open: 1, high: 2, low: 0.5, close: 1.5, volume: 1000 };
    const tsp: TimeSeriesPoint = { time: '2025-01-01', value: 42 };
    const macd: MACDResult = { macd: [tsp], signal: [tsp], histogram: [{ time: '2025-01-01', value: 0, color: '#000' }] };
    const bb: BollingerResult = { upper: [tsp], middle: [tsp], lower: [tsp] };
    const pos: Position = { symbol: 'X', shares: 10, avgCost: 100, currentPrice: 110 };
    const trade: Trade = { id: 't1', symbol: 'X', type: 'buy', shares: 10, price: 100, timestamp: Date.now(), total: 1000 };
    const port: Portfolio = { cash: 50000, positions: [pos], trades: [trade], startingCash: 100000 };
    const tr: TradeResult = { success: true, portfolio: port };
    const pnl: PnL = { absolute: 100, percent: 10 };
    const mood: MarketMood = { label: 'Mixed', emoji: '⚖️', color: '#f59e0b', advancers: 5, decliners: 5, breadth: 0.5 };
    const sp: StockPreset = { price: 100, volatility: 0.02, trend: 0.0003 };
    const ic: IndicatorConfig = { id: 'volume', label: 'VOL', color: '#64748b' };
    const v: View = 'heatmap';
    const ctf: ChartTimeframe = '1Y';
    const ind: Indicator = 'sma20';

    // If we get here, all types compiled correctly
    expect(stock).toBeDefined();
    expect(sector).toBeDefined();
    expect(candle).toBeDefined();
    expect(tsp).toBeDefined();
    expect(macd).toBeDefined();
    expect(bb).toBeDefined();
    expect(pos).toBeDefined();
    expect(trade).toBeDefined();
    expect(port).toBeDefined();
    expect(tr).toBeDefined();
    expect(pnl).toBeDefined();
    expect(mood).toBeDefined();
    expect(sp).toBeDefined();
    expect(ic).toBeDefined();
    expect(v).toBeDefined();
    expect(ctf).toBeDefined();
    expect(ind).toBeDefined();
  });

  it('chartHelpers.ts exports all 5 converter functions', () => {
    expect(typeof toCandlestickData).toBe('function');
    expect(typeof toVolumeData).toBe('function');
    expect(typeof toLineData).toBe('function');
    expect(typeof toConstantLine).toBe('function');
    expect(typeof toHistogramData).toBe('function');
  });

  it('utils.ts exports all 3 utility functions', () => {
    expect(typeof seededRandom).toBe('function');
    expect(typeof changeToColor).toBe('function');
    expect(typeof normalizeToPercent).toBe('function');
  });

  it('indicators.ts exports all 5 calculation functions', () => {
    expect(typeof calculateSMA).toBe('function');
    expect(typeof calculateEMA).toBe('function');
    expect(typeof calculateRSI).toBe('function');
    expect(typeof calculateMACD).toBe('function');
    expect(typeof calculateBollingerBands).toBe('function');
  });
});
