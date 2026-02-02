// Portfolio simulator data and logic

import type { Portfolio, Position, TradeResult, PnL } from '../types';
import { DEFAULT_STARTING_CASH } from '../constants';

export function createPortfolio(startingCash: number = DEFAULT_STARTING_CASH): Portfolio {
  return {
    cash: startingCash,
    positions: [],
    trades: [],
    startingCash,
  };
}

export function executeTrade(
  portfolio: Portfolio,
  symbol: string,
  type: 'buy' | 'sell',
  shares: number,
  price: number
): TradeResult {
  // Validate inputs
  if (!Number.isFinite(shares) || shares <= 0 || !Number.isInteger(shares)) {
    return { success: false, error: 'Shares must be a positive integer', portfolio };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { success: false, error: 'Price must be a positive number', portfolio };
  }

  const total = shares * price;
  // Deep copy positions to avoid mutating original state
  const newPositions = portfolio.positions.map(p => ({ ...p }));
  const newPortfolio: Portfolio = {
    ...portfolio,
    positions: newPositions,
    trades: [...portfolio.trades],
  };

  if (type === 'buy') {
    if (total > portfolio.cash) {
      return {
        success: false,
        error: `Insufficient funds. Need $${total.toFixed(2)}, have $${portfolio.cash.toFixed(2)}`,
        portfolio,
      };
    }

    newPortfolio.cash -= total;

    const existingIdx = newPortfolio.positions.findIndex(p => p.symbol === symbol);
    if (existingIdx >= 0) {
      const existing = newPortfolio.positions[existingIdx];
      const totalShares = existing.shares + shares;
      newPortfolio.positions[existingIdx] = {
        ...existing,
        avgCost: ((existing.avgCost * existing.shares) + (price * shares)) / totalShares,
        shares: totalShares,
        currentPrice: price,
      };
    } else {
      newPortfolio.positions.push({ symbol, shares, avgCost: price, currentPrice: price });
    }
  } else {
    const existingIdx = newPortfolio.positions.findIndex(p => p.symbol === symbol);
    const existing = existingIdx >= 0 ? newPortfolio.positions[existingIdx] : null;
    if (!existing || existing.shares < shares) {
      return {
        success: false,
        error: `Insufficient shares. Have ${existing?.shares || 0}, trying to sell ${shares}`,
        portfolio,
      };
    }

    newPortfolio.cash += total;

    if (existing.shares === shares) {
      newPortfolio.positions = newPortfolio.positions.filter((_, i) => i !== existingIdx);
    } else {
      newPortfolio.positions[existingIdx] = {
        ...existing,
        shares: existing.shares - shares,
        currentPrice: price,
      };
    }
  }

  newPortfolio.trades.push({
    id: `T${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    symbol,
    type,
    shares,
    price,
    timestamp: Date.now(),
    total,
  });

  return { success: true, portfolio: newPortfolio };
}

export function getPortfolioValue(portfolio: Portfolio): number {
  const positionsValue = portfolio.positions.reduce(
    (sum, p) => sum + p.shares * p.currentPrice, 0
  );
  const total = portfolio.cash + positionsValue;
  return Number.isFinite(total) ? total : portfolio.cash;
}

export function getPortfolioReturn(portfolio: Portfolio): PnL {
  const currentValue = getPortfolioValue(portfolio);
  const absolute = currentValue - portfolio.startingCash;
  const percent = portfolio.startingCash > 0 ? (absolute / portfolio.startingCash) * 100 : 0;
  return {
    absolute: Number.isFinite(absolute) ? absolute : 0,
    percent: Number.isFinite(percent) ? percent : 0,
  };
}

export function getPositionPnL(position: Position): PnL {
  const absolute = (position.currentPrice - position.avgCost) * position.shares;
  const percent = position.avgCost > 0
    ? ((position.currentPrice - position.avgCost) / position.avgCost) * 100
    : 0;
  return {
    absolute: Number.isFinite(absolute) ? absolute : 0,
    percent: Number.isFinite(percent) ? percent : 0,
  };
}

// Re-export types for backward compat
export type { Portfolio, Position, Trade, PnL } from '../types';
