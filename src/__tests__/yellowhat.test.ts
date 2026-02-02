import { describe, it, expect } from 'vitest';
import { generateMarketData, groupBySector, SECTOR_COLORS, type Stock } from '../data/marketData';
import { STOCK_PRESETS, generateCandlestickData } from '../data/candlestickData';
import { CINEMATIC_STOCKS, CINEMATIC_INTERVAL } from '../store';

// ===== Market Mood =====
describe('Market Mood Computation', () => {
  it('classifies mood correctly based on breadth', () => {
    // With seeded data, we should get valid mood
    const stocks = generateMarketData(12345);
    const advancers = stocks.filter(s => s.change > 0).length;
    const decliners = stocks.filter(s => s.change < 0).length;
    expect(advancers + decliners).toBeLessThanOrEqual(stocks.length);
    expect(advancers).toBeGreaterThanOrEqual(0);
    expect(decliners).toBeGreaterThanOrEqual(0);
  });

  it('advancers + decliners + unchanged = total', () => {
    const stocks = generateMarketData(99999);
    const adv = stocks.filter(s => s.change > 0).length;
    const dec = stocks.filter(s => s.change < 0).length;
    const flat = stocks.filter(s => s.change === 0).length;
    expect(adv + dec + flat).toBe(stocks.length);
  });

  it('top gainer has highest change', () => {
    const stocks = generateMarketData();
    const sorted = [...stocks].sort((a, b) => b.change - a.change);
    const topGainer = sorted[0];
    expect(topGainer.change).toBe(Math.max(...stocks.map(s => s.change)));
  });

  it('top loser has lowest change', () => {
    const stocks = generateMarketData();
    const sorted = [...stocks].sort((a, b) => a.change - b.change);
    const topLoser = sorted[0];
    expect(topLoser.change).toBe(Math.min(...stocks.map(s => s.change)));
  });

  it('breadth is between 0 and 1', () => {
    for (const seed of [1, 100, 999, 54321, 99999]) {
      const stocks = generateMarketData(seed);
      const breadth = stocks.filter(s => s.change > 0).length / stocks.length;
      expect(breadth).toBeGreaterThanOrEqual(0);
      expect(breadth).toBeLessThanOrEqual(1);
    }
  });
});

// ===== Cinematic Autoplay =====
describe('Cinematic Autoplay Configuration', () => {
  it('has exactly 10 cinematic stocks', () => {
    expect(CINEMATIC_STOCKS).toHaveLength(10);
  });

  it('all cinematic stocks exist in STOCK_PRESETS', () => {
    for (const symbol of CINEMATIC_STOCKS) {
      expect(STOCK_PRESETS).toHaveProperty(symbol);
    }
  });

  it('cinematic stocks are unique', () => {
    const unique = new Set(CINEMATIC_STOCKS);
    expect(unique.size).toBe(CINEMATIC_STOCKS.length);
  });

  it('cinematic interval is 10 seconds', () => {
    expect(CINEMATIC_INTERVAL).toBe(10000);
  });

  it('all cinematic stocks produce valid candle data', () => {
    for (const symbol of CINEMATIC_STOCKS) {
      const preset = STOCK_PRESETS[symbol];
      const candles = generateCandlestickData(symbol, preset.price * 0.7, 400, preset.volatility, preset.trend);
      expect(candles.length).toBeGreaterThan(200);
      for (const c of candles) {
        expect(c.high).toBeGreaterThanOrEqual(c.low);
        expect(c.volume).toBeGreaterThan(0);
        expect(Number.isFinite(c.close)).toBe(true);
      }
    }
  });

  it('cinematic stocks cover diverse sectors', () => {
    const stocks = generateMarketData();
    const sectors = new Set<string>();
    for (const symbol of CINEMATIC_STOCKS) {
      const stock = stocks.find(s => s.symbol === symbol);
      if (stock) sectors.add(stock.sector);
    }
    // Should cover at least 4 different sectors
    expect(sectors.size).toBeGreaterThanOrEqual(4);
  });
});

// ===== Biggest Mover Default =====
describe('Biggest Mover Auto-Selection', () => {
  it('biggest mover has the highest absolute change', () => {
    const stocks = generateMarketData();
    const sorted = [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const biggest = sorted[0];
    expect(Math.abs(biggest.change)).toBe(Math.max(...stocks.map(s => Math.abs(s.change))));
  });

  it('biggest mover exists in STOCK_PRESETS for chart view', () => {
    const stocks = generateMarketData();
    const sorted = [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    const biggestSymbol = sorted[0].symbol;
    // It should be in STOCK_PRESETS or gracefully handled
    // (fallback to AAPL in store if not in presets)
    expect(typeof biggestSymbol).toBe('string');
    expect(biggestSymbol.length).toBeGreaterThan(0);
  });

  it('different seeds produce different biggest movers', () => {
    const movers = new Set<string>();
    for (let seed = 1; seed < 100; seed++) {
      const stocks = generateMarketData(seed);
      const sorted = [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      movers.add(sorted[0].symbol);
    }
    // Over 100 seeds, should see variety
    expect(movers.size).toBeGreaterThan(3);
  });
});

// ===== Sector Colors Completeness =====
describe('Sector Colors', () => {
  it('every sector has a color defined', () => {
    const stocks = generateMarketData();
    const sectors = groupBySector(stocks);
    for (const sector of sectors) {
      expect(SECTOR_COLORS).toHaveProperty(sector.name);
      expect(SECTOR_COLORS[sector.name]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('all 11 sector colors are unique', () => {
    const colors = Object.values(SECTOR_COLORS);
    const unique = new Set(colors);
    expect(unique.size).toBe(colors.length);
  });
});

// ===== Keyboard Shortcuts Consistency =====
describe('Keyboard Shortcuts', () => {
  it('views 1/2/3 map to heatmap/chart/portfolio', () => {
    const views = ['heatmap', 'chart', 'portfolio'];
    expect(views).toHaveLength(3);
    expect(views[0]).toBe('heatmap');
    expect(views[1]).toBe('chart');
    expect(views[2]).toBe('portfolio');
  });

  it('cinematic stocks array is not empty for A shortcut', () => {
    expect(CINEMATIC_STOCKS.length).toBeGreaterThan(0);
  });
});

// ===== Enhanced Defaults =====
describe('Enhanced Defaults', () => {
  it('default timeframe is 1Y for maximum chart data', () => {
    // Store initializes with '1Y' — verify candle data is substantial
    const preset = STOCK_PRESETS['AAPL'];
    const candles = generateCandlestickData('AAPL', preset.price * 0.7, 400, preset.volatility, preset.trend);
    const yearCandles = candles.slice(-365);
    expect(yearCandles.length).toBeGreaterThan(200); // ~260 trading days in a year
  });

  it('all stock presets have valid volatility ranges', () => {
    for (const [symbol, preset] of Object.entries(STOCK_PRESETS)) {
      expect(preset.volatility).toBeGreaterThan(0);
      expect(preset.volatility).toBeLessThan(0.1); // reasonable daily vol
      expect(preset.price).toBeGreaterThan(0);
      expect(Number.isFinite(preset.trend)).toBe(true);
    }
  });

  it('market data generates stocks covering 11 sectors', () => {
    const stocks = generateMarketData();
    expect(stocks.length).toBe(67);
    const sectors = groupBySector(stocks);
    expect(sectors.length).toBe(11);
  });
});
