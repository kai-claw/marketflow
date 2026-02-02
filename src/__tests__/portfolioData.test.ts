import { describe, it, expect } from 'vitest';
import {
  createPortfolio,
  executeTrade,
  getPortfolioValue,
  getPortfolioReturn,
  getPositionPnL,
} from '../data/portfolioData';
import type { Portfolio } from '../types';

describe('createPortfolio', () => {
  it('creates with correct starting cash', () => {
    const p = createPortfolio(100000);
    expect(p.cash).toBe(100000);
    expect(p.startingCash).toBe(100000);
    expect(p.positions).toEqual([]);
    expect(p.trades).toEqual([]);
  });

  it('defaults to 100000', () => {
    const p = createPortfolio();
    expect(p.cash).toBe(100000);
  });
});

describe('executeTrade', () => {
  it('buy reduces cash and creates position', () => {
    const p = createPortfolio(10000);
    const result = executeTrade(p, 'AAPL', 'buy', 10, 150);
    expect(result.success).toBe(true);
    expect(result.portfolio.cash).toBe(10000 - 1500);
    expect(result.portfolio.positions.length).toBe(1);
    expect(result.portfolio.positions[0].symbol).toBe('AAPL');
    expect(result.portfolio.positions[0].shares).toBe(10);
    expect(result.portfolio.positions[0].avgCost).toBe(150);
  });

  it('buy fails with insufficient funds', () => {
    const p = createPortfolio(100);
    const result = executeTrade(p, 'AAPL', 'buy', 10, 150);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.portfolio.cash).toBe(100); // unchanged
  });

  it('buy averages cost on existing position', () => {
    let p = createPortfolio(100000);
    p = executeTrade(p, 'AAPL', 'buy', 10, 100).portfolio;
    p = executeTrade(p, 'AAPL', 'buy', 10, 200).portfolio;
    expect(p.positions.length).toBe(1);
    expect(p.positions[0].shares).toBe(20);
    expect(p.positions[0].avgCost).toBe(150); // (100*10 + 200*10) / 20
  });

  it('sell increases cash and reduces position', () => {
    let p = createPortfolio(100000);
    p = executeTrade(p, 'AAPL', 'buy', 20, 100).portfolio;
    const result = executeTrade(p, 'AAPL', 'sell', 10, 120);
    expect(result.success).toBe(true);
    expect(result.portfolio.positions[0].shares).toBe(10);
    expect(result.portfolio.cash).toBe(100000 - 2000 + 1200);
  });

  it('sell removes position when all shares sold', () => {
    let p = createPortfolio(100000);
    p = executeTrade(p, 'AAPL', 'buy', 10, 100).portfolio;
    p = executeTrade(p, 'AAPL', 'sell', 10, 120).portfolio;
    expect(p.positions.length).toBe(0);
  });

  it('sell fails with insufficient shares', () => {
    const p = createPortfolio(100000);
    const result = executeTrade(p, 'AAPL', 'sell', 10, 100);
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('sell fails when trying to sell more than owned', () => {
    let p = createPortfolio(100000);
    p = executeTrade(p, 'AAPL', 'buy', 5, 100).portfolio;
    const result = executeTrade(p, 'AAPL', 'sell', 10, 100);
    expect(result.success).toBe(false);
  });

  it('records trade in history', () => {
    const p = createPortfolio(100000);
    const result = executeTrade(p, 'AAPL', 'buy', 10, 150);
    expect(result.portfolio.trades.length).toBe(1);
    const trade = result.portfolio.trades[0];
    expect(trade.symbol).toBe('AAPL');
    expect(trade.type).toBe('buy');
    expect(trade.shares).toBe(10);
    expect(trade.price).toBe(150);
    expect(trade.total).toBe(1500);
    expect(trade.id).toBeTruthy();
    expect(trade.timestamp).toBeGreaterThan(0);
  });

  it('multiple symbols create separate positions', () => {
    let p = createPortfolio(100000);
    p = executeTrade(p, 'AAPL', 'buy', 10, 100).portfolio;
    p = executeTrade(p, 'GOOGL', 'buy', 5, 200).portfolio;
    expect(p.positions.length).toBe(2);
    expect(p.positions.find(pos => pos.symbol === 'AAPL')?.shares).toBe(10);
    expect(p.positions.find(pos => pos.symbol === 'GOOGL')?.shares).toBe(5);
  });
});

describe('getPortfolioValue', () => {
  it('returns cash when no positions', () => {
    const p = createPortfolio(50000);
    expect(getPortfolioValue(p)).toBe(50000);
  });

  it('includes position values', () => {
    let p = createPortfolio(100000);
    p = executeTrade(p, 'AAPL', 'buy', 10, 100).portfolio;
    // cash = 99000, position = 10 * 100 = 1000
    expect(getPortfolioValue(p)).toBe(100000);
  });
});

describe('getPortfolioReturn', () => {
  it('zero return when no trades', () => {
    const p = createPortfolio(100000);
    const ret = getPortfolioReturn(p);
    expect(ret.absolute).toBe(0);
    expect(ret.percent).toBe(0);
  });

  it('calculates correctly after trade', () => {
    let p = createPortfolio(100000);
    p = executeTrade(p, 'AAPL', 'buy', 10, 100).portfolio;
    // Simulate price change by modifying currentPrice
    p.positions[0].currentPrice = 110;
    const ret = getPortfolioReturn(p);
    // value = 99000 + 10*110 = 100100
    expect(ret.absolute).toBeCloseTo(100, 0);
    expect(ret.percent).toBeCloseTo(0.1, 1);
  });
});

describe('getPositionPnL', () => {
  it('positive PnL', () => {
    const pnl = getPositionPnL({ symbol: 'AAPL', shares: 10, avgCost: 100, currentPrice: 120 });
    expect(pnl.absolute).toBe(200);
    expect(pnl.percent).toBeCloseTo(20, 0);
  });

  it('negative PnL', () => {
    const pnl = getPositionPnL({ symbol: 'AAPL', shares: 10, avgCost: 100, currentPrice: 80 });
    expect(pnl.absolute).toBe(-200);
    expect(pnl.percent).toBeCloseTo(-20, 0);
  });

  it('zero PnL when price equals cost', () => {
    const pnl = getPositionPnL({ symbol: 'AAPL', shares: 10, avgCost: 100, currentPrice: 100 });
    expect(pnl.absolute).toBe(0);
    expect(pnl.percent).toBe(0);
  });
});
