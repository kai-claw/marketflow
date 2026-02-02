// Realistic S&P 500 sector and stock data for the treemap

import type { Stock, Sector } from '../types';
import { seededRandom } from '../utils';
import { SECTOR_COLORS } from '../constants';

const today = new Date();
const daySeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

const STOCK_DATA: Omit<Stock, 'change' | 'volume'>[] = [
  // Technology
  { symbol: 'AAPL', name: 'Apple', sector: 'Technology', marketCap: 3420, price: 228.5 },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Technology', marketCap: 3180, price: 427.3 },
  { symbol: 'NVDA', name: 'NVIDIA', sector: 'Technology', marketCap: 2890, price: 117.8 },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'Technology', marketCap: 2150, price: 176.4 },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', marketCap: 1580, price: 612.7 },
  { symbol: 'AVGO', name: 'Broadcom', sector: 'Technology', marketCap: 820, price: 178.3 },
  { symbol: 'TSM', name: 'TSMC', sector: 'Technology', marketCap: 780, price: 150.2 },
  { symbol: 'ORCL', name: 'Oracle', sector: 'Technology', marketCap: 450, price: 168.9 },
  { symbol: 'CRM', name: 'Salesforce', sector: 'Technology', marketCap: 280, price: 290.5 },
  { symbol: 'AMD', name: 'AMD', sector: 'Technology', marketCap: 240, price: 148.7 },
  { symbol: 'INTC', name: 'Intel', sector: 'Technology', marketCap: 100, price: 23.4 },
  { symbol: 'CSCO', name: 'Cisco', sector: 'Technology', marketCap: 230, price: 57.8 },
  // Healthcare
  { symbol: 'LLY', name: 'Eli Lilly', sector: 'Healthcare', marketCap: 820, price: 862.3 },
  { symbol: 'UNH', name: 'UnitedHealth', sector: 'Healthcare', marketCap: 540, price: 582.1 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', marketCap: 380, price: 157.8 },
  { symbol: 'ABBV', name: 'AbbVie', sector: 'Healthcare', marketCap: 340, price: 192.4 },
  { symbol: 'MRK', name: 'Merck', sector: 'Healthcare', marketCap: 310, price: 123.5 },
  { symbol: 'PFE', name: 'Pfizer', sector: 'Healthcare', marketCap: 160, price: 28.3 },
  { symbol: 'TMO', name: 'Thermo Fisher', sector: 'Healthcare', marketCap: 200, price: 528.6 },
  { symbol: 'ABT', name: 'Abbott Labs', sector: 'Healthcare', marketCap: 190, price: 110.2 },
  // Financials
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials', marketCap: 880, price: 412.7 },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', marketCap: 620, price: 215.3 },
  { symbol: 'V', name: 'Visa', sector: 'Financials', marketCap: 580, price: 285.6 },
  { symbol: 'MA', name: 'Mastercard', sector: 'Financials', marketCap: 440, price: 468.2 },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Financials', marketCap: 310, price: 38.9 },
  { symbol: 'WFC', name: 'Wells Fargo', sector: 'Financials', marketCap: 200, price: 58.4 },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Financials', marketCap: 170, price: 492.1 },
  { symbol: 'MS', name: 'Morgan Stanley', sector: 'Financials', marketCap: 160, price: 98.7 },
  // Consumer Discretionary
  { symbol: 'AMZN', name: 'Amazon', sector: 'Consumer Discretionary', marketCap: 2180, price: 208.3 },
  { symbol: 'TSLA', name: 'Tesla', sector: 'Consumer Discretionary', marketCap: 780, price: 244.6 },
  { symbol: 'HD', name: 'Home Depot', sector: 'Consumer Discretionary', marketCap: 380, price: 382.1 },
  { symbol: 'NKE', name: 'Nike', sector: 'Consumer Discretionary', marketCap: 130, price: 85.4 },
  { symbol: 'MCD', name: "McDonald's", sector: 'Consumer Discretionary', marketCap: 210, price: 292.7 },
  { symbol: 'SBUX', name: 'Starbucks', sector: 'Consumer Discretionary', marketCap: 110, price: 97.3 },
  // Consumer Staples
  { symbol: 'WMT', name: 'Walmart', sector: 'Consumer Staples', marketCap: 510, price: 63.4 },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer Staples', marketCap: 380, price: 161.2 },
  { symbol: 'COST', name: 'Costco', sector: 'Consumer Staples', marketCap: 350, price: 790.5 },
  { symbol: 'KO', name: 'Coca-Cola', sector: 'Consumer Staples', marketCap: 260, price: 60.8 },
  { symbol: 'PEP', name: 'PepsiCo', sector: 'Consumer Staples', marketCap: 220, price: 160.3 },
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', marketCap: 460, price: 109.2 },
  { symbol: 'CVX', name: 'Chevron', sector: 'Energy', marketCap: 280, price: 152.7 },
  { symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy', marketCap: 140, price: 108.4 },
  { symbol: 'SLB', name: 'Schlumberger', sector: 'Energy', marketCap: 80, price: 56.2 },
  { symbol: 'EOG', name: 'EOG Resources', sector: 'Energy', marketCap: 70, price: 120.8 },
  // Industrials
  { symbol: 'GE', name: 'GE Aerospace', sector: 'Industrials', marketCap: 200, price: 183.5 },
  { symbol: 'CAT', name: 'Caterpillar', sector: 'Industrials', marketCap: 180, price: 372.1 },
  { symbol: 'UNP', name: 'Union Pacific', sector: 'Industrials', marketCap: 150, price: 248.6 },
  { symbol: 'RTX', name: 'RTX Corp', sector: 'Industrials', marketCap: 150, price: 112.4 },
  { symbol: 'HON', name: 'Honeywell', sector: 'Industrials', marketCap: 140, price: 214.8 },
  { symbol: 'BA', name: 'Boeing', sector: 'Industrials', marketCap: 120, price: 168.3 },
  // Communications
  { symbol: 'NFLX', name: 'Netflix', sector: 'Communication Services', marketCap: 370, price: 862.4 },
  { symbol: 'DIS', name: 'Disney', sector: 'Communication Services', marketCap: 200, price: 110.6 },
  { symbol: 'CMCSA', name: 'Comcast', sector: 'Communication Services', marketCap: 170, price: 43.2 },
  { symbol: 'T', name: 'AT&T', sector: 'Communication Services', marketCap: 150, price: 21.4 },
  { symbol: 'VZ', name: 'Verizon', sector: 'Communication Services', marketCap: 170, price: 40.8 },
  // Utilities
  { symbol: 'NEE', name: 'NextEra Energy', sector: 'Utilities', marketCap: 160, price: 78.2 },
  { symbol: 'SO', name: 'Southern Co', sector: 'Utilities', marketCap: 90, price: 82.4 },
  { symbol: 'DUK', name: 'Duke Energy', sector: 'Utilities', marketCap: 80, price: 104.6 },
  { symbol: 'AEP', name: 'American Electric', sector: 'Utilities', marketCap: 50, price: 98.3 },
  // Materials
  { symbol: 'LIN', name: 'Linde', sector: 'Materials', marketCap: 210, price: 438.2 },
  { symbol: 'APD', name: 'Air Products', sector: 'Materials', marketCap: 70, price: 312.5 },
  { symbol: 'SHW', name: 'Sherwin-Williams', sector: 'Materials', marketCap: 85, price: 338.7 },
  { symbol: 'FCX', name: 'Freeport-McMoRan', sector: 'Materials', marketCap: 60, price: 42.1 },
  // Real Estate
  { symbol: 'PLD', name: 'Prologis', sector: 'Real Estate', marketCap: 120, price: 130.4 },
  { symbol: 'AMT', name: 'American Tower', sector: 'Real Estate', marketCap: 95, price: 204.7 },
  { symbol: 'EQIX', name: 'Equinix', sector: 'Real Estate', marketCap: 80, price: 842.3 },
  { symbol: 'SPG', name: 'Simon Property', sector: 'Real Estate', marketCap: 50, price: 156.8 },
];

export function generateMarketData(customSeed?: number): Stock[] {
  const rand = seededRandom(customSeed ?? daySeed);

  return STOCK_DATA.map(stock => {
    // Generate realistic daily change (-5% to +5%, biased toward smaller moves)
    const u1 = rand();
    const u2 = rand();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const change = Number((normal * 1.8).toFixed(2));

    // Volume based on market cap (bigger = more volume)
    const baseVolume = stock.marketCap * 100000;
    const volumeVariance = 0.5 + rand() * 1.5;
    const volume = Math.round(baseVolume * volumeVariance);

    return { ...stock, change, volume };
  });
}

export function groupBySector(stocks: Stock[]): Sector[] {
  const sectorMap = new Map<string, Stock[]>();

  for (const stock of stocks) {
    const arr = sectorMap.get(stock.sector) || [];
    arr.push(stock);
    sectorMap.set(stock.sector, arr);
  }

  return Array.from(sectorMap.entries()).map(([name, sectorStocks]) => ({
    name,
    stocks: sectorStocks.sort((a, b) => b.marketCap - a.marketCap),
    totalMarketCap: sectorStocks.reduce((s, st) => s + st.marketCap, 0),
    avgChange: Number((sectorStocks.reduce((s, st) => s + st.change, 0) / sectorStocks.length).toFixed(2)),
  })).sort((a, b) => b.totalMarketCap - a.totalMarketCap);
}

// Re-export for backward compat (used by tests and Heatmap)
export { SECTOR_COLORS };
export type { Stock, Sector };
