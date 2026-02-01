// Portfolio simulator data and logic

export interface Position {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
}

export interface Trade {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  timestamp: number;
  total: number;
}

export interface Portfolio {
  cash: number;
  positions: Position[];
  trades: Trade[];
  startingCash: number;
}

export function createPortfolio(startingCash: number = 100000): Portfolio {
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
): { success: boolean; error?: string; portfolio: Portfolio } {
  const total = shares * price;
  const newPortfolio = { ...portfolio, positions: [...portfolio.positions], trades: [...portfolio.trades] };
  
  if (type === 'buy') {
    if (total > portfolio.cash) {
      return { success: false, error: `Insufficient funds. Need $${total.toFixed(2)}, have $${portfolio.cash.toFixed(2)}`, portfolio };
    }
    
    newPortfolio.cash -= total;
    
    const existing = newPortfolio.positions.find(p => p.symbol === symbol);
    if (existing) {
      const totalShares = existing.shares + shares;
      existing.avgCost = ((existing.avgCost * existing.shares) + (price * shares)) / totalShares;
      existing.shares = totalShares;
      existing.currentPrice = price;
    } else {
      newPortfolio.positions.push({ symbol, shares, avgCost: price, currentPrice: price });
    }
  } else {
    const existing = newPortfolio.positions.find(p => p.symbol === symbol);
    if (!existing || existing.shares < shares) {
      return { success: false, error: `Insufficient shares. Have ${existing?.shares || 0}, trying to sell ${shares}`, portfolio };
    }
    
    newPortfolio.cash += total;
    existing.shares -= shares;
    existing.currentPrice = price;
    
    if (existing.shares === 0) {
      newPortfolio.positions = newPortfolio.positions.filter(p => p.symbol !== symbol);
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
  return portfolio.cash + positionsValue;
}

export function getPortfolioReturn(portfolio: Portfolio): { absolute: number; percent: number } {
  const currentValue = getPortfolioValue(portfolio);
  const absolute = currentValue - portfolio.startingCash;
  const percent = (absolute / portfolio.startingCash) * 100;
  return { absolute, percent };
}

export function getPositionPnL(position: Position): { absolute: number; percent: number } {
  const absolute = (position.currentPrice - position.avgCost) * position.shares;
  const percent = ((position.currentPrice - position.avgCost) / position.avgCost) * 100;
  return { absolute, percent };
}
