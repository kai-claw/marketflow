import { describe, it, expect } from 'vitest';
import {
  generateMarketData,
  groupBySector,
  SECTOR_COLORS,
  type Stock,
} from '../data/marketData';

describe('generateMarketData', () => {
  const stocks = generateMarketData(12345);

  it('returns 67 stocks', () => {
    expect(stocks.length).toBe(67);
  });

  it('every stock has required fields', () => {
    for (const s of stocks) {
      expect(s.symbol).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.sector).toBeTruthy();
      expect(s.marketCap).toBeGreaterThan(0);
      expect(s.price).toBeGreaterThan(0);
      expect(typeof s.change).toBe('number');
      expect(s.volume).toBeGreaterThan(0);
      expect(Number.isFinite(s.change)).toBe(true);
    }
  });

  it('change values are in realistic range (-15 to +15)', () => {
    for (const s of stocks) {
      expect(s.change).toBeGreaterThanOrEqual(-15);
      expect(s.change).toBeLessThanOrEqual(15);
    }
  });

  it('symbols are unique', () => {
    const symbols = stocks.map(s => s.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('seeded random produces reproducible results', () => {
    const a = generateMarketData(99999);
    const b = generateMarketData(99999);
    expect(a.map(s => s.change)).toEqual(b.map(s => s.change));
  });

  it('different seeds produce different results', () => {
    const a = generateMarketData(11111);
    const b = generateMarketData(22222);
    const aChanges = a.map(s => s.change);
    const bChanges = b.map(s => s.change);
    expect(aChanges).not.toEqual(bChanges);
  });

  it('volume scales with market cap', () => {
    const sorted = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
    const top5AvgVol = sorted.slice(0, 5).reduce((s, st) => s + st.volume, 0) / 5;
    const bot5AvgVol = sorted.slice(-5).reduce((s, st) => s + st.volume, 0) / 5;
    expect(top5AvgVol).toBeGreaterThan(bot5AvgVol);
  });
});

describe('groupBySector', () => {
  const stocks = generateMarketData(12345);
  const sectors = groupBySector(stocks);

  it('returns 11 sectors', () => {
    expect(sectors.length).toBe(11);
  });

  it('sectors sorted by total market cap descending', () => {
    for (let i = 1; i < sectors.length; i++) {
      expect(sectors[i - 1].totalMarketCap).toBeGreaterThanOrEqual(sectors[i].totalMarketCap);
    }
  });

  it('stocks within sector sorted by market cap descending', () => {
    for (const sector of sectors) {
      for (let i = 1; i < sector.stocks.length; i++) {
        expect(sector.stocks[i - 1].marketCap).toBeGreaterThanOrEqual(sector.stocks[i].marketCap);
      }
    }
  });

  it('totalMarketCap equals sum of stock market caps', () => {
    for (const sector of sectors) {
      const sum = sector.stocks.reduce((s, st) => s + st.marketCap, 0);
      expect(sector.totalMarketCap).toBe(sum);
    }
  });

  it('avgChange is correct', () => {
    for (const sector of sectors) {
      const avg = sector.stocks.reduce((s, st) => s + st.change, 0) / sector.stocks.length;
      expect(sector.avgChange).toBeCloseTo(avg, 1);
    }
  });

  it('all stocks accounted for', () => {
    const total = sectors.reduce((s, sec) => s + sec.stocks.length, 0);
    expect(total).toBe(67);
  });
});

describe('SECTOR_COLORS', () => {
  it('has a color for every sector', () => {
    const stocks = generateMarketData(12345);
    const sectorNames = [...new Set(stocks.map(s => s.sector))];
    for (const name of sectorNames) {
      expect(SECTOR_COLORS[name]).toBeTruthy();
      expect(SECTOR_COLORS[name]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('all colors are unique', () => {
    const colors = Object.values(SECTOR_COLORS);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
