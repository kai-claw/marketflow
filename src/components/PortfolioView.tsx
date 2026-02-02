import { useState, useMemo } from 'react';
import { useStore } from '../store';
import {
  getPortfolioValue,
  getPortfolioReturn,
  getPositionPnL,
} from '../data/portfolioData';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  RotateCcw,
  PieChart,
  ArrowUpCircle,
  ArrowDownCircle,
  Clock,
} from 'lucide-react';

export default function PortfolioView() {
  const {
    portfolio,
    stocks,
    buyStock,
    sellStock,
    resetPortfolio,
    setSelectedSymbol,
    setView,
  } = useStore();

  const [tradeSymbol, setTradeSymbol] = useState('AAPL');
  const [tradeShares, setTradeShares] = useState('10');
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  const totalValue = getPortfolioValue(portfolio);
  const { absolute: totalReturn, percent: returnPct } = getPortfolioReturn(portfolio);
  const positionsValue = totalValue - portfolio.cash;

  const stock = stocks.find((s) => s.symbol === tradeSymbol);
  const tradePrice = stock?.price || 0;

  const enrichedPositions = useMemo(() => {
    return portfolio.positions
      .map((p) => {
        const s = stocks.find((st) => st.symbol === p.symbol);
        const currentPrice = s?.price || p.currentPrice;
        const pnl = getPositionPnL({ ...p, currentPrice });
        const marketValue = p.shares * currentPrice;
        const weight = positionsValue > 0 ? (marketValue / positionsValue) * 100 : 0;
        return { ...p, currentPrice, pnl, marketValue, weight, change: s?.change || 0 };
      })
      .sort((a, b) => b.marketValue - a.marketValue);
  }, [portfolio.positions, stocks, positionsValue]);

  const handleTrade = (type: 'buy' | 'sell') => {
    setTradeError(null);
    setTradeSuccess(null);
    const shares = parseInt(tradeShares, 10);
    if (!Number.isFinite(shares) || shares <= 0) {
      setTradeError('Enter a valid positive number of shares');
      return;
    }
    if (tradePrice <= 0) {
      setTradeError('Invalid stock price');
      return;
    }
    const error =
      type === 'buy'
        ? buyStock(tradeSymbol, shares, tradePrice)
        : sellStock(tradeSymbol, shares, tradePrice);
    if (error) {
      setTradeError(error);
    } else {
      setTradeSuccess(
        `${type === 'buy' ? 'Bought' : 'Sold'} ${shares} ${tradeSymbol} @ $${tradePrice.toFixed(2)}`
      );
      setTimeout(() => setTradeSuccess(null), 3000);
    }
  };

  const handleReset = () => {
    if (!window.confirm('Reset portfolio to $100,000? All positions and trades will be lost.')) return;
    resetPortfolio();
    setTradeError(null);
    setTradeSuccess(null);
  };

  const cashPct = totalValue > 0 ? ((portfolio.cash / totalValue) * 100).toFixed(1) : '100.0';

  return (
    <div className="view-enter flex flex-col h-full overflow-y-auto" id="panel-portfolio" role="tabpanel" aria-label="Portfolio">
      {/* Portfolio summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-4">
        <SummaryCard
          icon={<DollarSign size={18} />}
          label="Total Value"
          value={`$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={null}
          color="blue"
        />
        <SummaryCard
          icon={totalReturn >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          label="Total Return"
          value={`${totalReturn >= 0 ? '+' : ''}$${Math.abs(totalReturn).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`}
          color={totalReturn >= 0 ? 'green' : 'red'}
        />
        <SummaryCard
          icon={<PieChart size={18} />}
          label="Positions Value"
          value={`$${positionsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${enrichedPositions.length} holding${enrichedPositions.length !== 1 ? 's' : ''}`}
          color="purple"
        />
        <SummaryCard
          icon={<DollarSign size={18} />}
          label="Cash"
          value={`$${portfolio.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub={`${cashPct}% of portfolio`}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4 px-2 sm:px-4 pb-2 sm:pb-4 flex-1 min-h-0">
        {/* Trade panel */}
        <div className="trade-panel bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-3 sm:p-4 flex flex-col" role="form" aria-label="Trade stocks">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ShoppingCart size={16} aria-hidden="true" />
              Trade
            </h2>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] hover:text-white px-2 py-1 rounded hover:bg-[var(--bg-card)] transition-colors"
              aria-label="Reset portfolio to $100,000"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Reset
            </button>
          </div>

          <div className="space-y-3 flex-1">
            <div>
              <label htmlFor="trade-symbol" className="text-[10px] text-[var(--text-secondary)] mb-1 block">Symbol</label>
              <select
                id="trade-symbol"
                value={tradeSymbol}
                onChange={(e) => { setTradeSymbol(e.target.value); setTradeError(null); }}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {stocks.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} — ${s.price.toFixed(2)} ({s.change >= 0 ? '+' : ''}{s.change.toFixed(2)}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="trade-shares" className="text-[10px] text-[var(--text-secondary)] mb-1 block">Shares</label>
              <input
                id="trade-shares"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                pattern="[0-9]*"
                value={tradeShares}
                onChange={(e) => { setTradeShares(e.target.value); setTradeError(null); }}
                onKeyDown={(e) => {
                  // Prevent decimal, minus, e
                  if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === 'E') e.preventDefault();
                }}
                className="w-full bg-[var(--bg-card)] border border-[var(--border)] text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-describedby="trade-estimate"
              />
            </div>

            {tradePrice > 0 && (
              <div id="trade-estimate" className="trade-estimate bg-[var(--bg-card)] rounded-lg p-3 text-xs space-y-1">
                <div className="est-row flex justify-between text-[var(--text-secondary)]">
                  <span>Price</span>
                  <span className="text-white font-mono">${tradePrice.toFixed(2)}</span>
                </div>
                <div className="est-row flex justify-between text-[var(--text-secondary)]">
                  <span>Est. Total</span>
                  <span className="text-white font-mono">
                    ${(tradePrice * (parseInt(tradeShares, 10) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="est-row flex justify-between text-[var(--text-secondary)]">
                  <span>Available Cash</span>
                  <span className="text-white font-mono">
                    ${portfolio.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleTrade('buy')}
                className="trade-btn-buy flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:ring-green-400"
              >
                <ArrowUpCircle size={16} aria-hidden="true" />
                Buy
              </button>
              <button
                onClick={() => handleTrade('sell')}
                className="trade-btn-sell flex-1 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg text-sm font-semibold focus-visible:ring-2 focus-visible:ring-red-400"
              >
                <ArrowDownCircle size={16} aria-hidden="true" />
                Sell
              </button>
            </div>

            {tradeError && (
              <div role="alert" className="trade-alert bg-red-900/30 border border-red-800/50 text-red-400 text-xs px-3 py-2 rounded-lg">
                {tradeError}
              </div>
            )}
            {tradeSuccess && (
              <div role="status" className="trade-alert bg-green-900/30 border border-green-800/50 text-green-400 text-xs px-3 py-2 rounded-lg">
                {tradeSuccess}
              </div>
            )}
          </div>
        </div>

        {/* Holdings */}
        <div className="lg:col-span-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-3 sm:p-4 flex flex-col min-h-0">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <PieChart size={16} aria-hidden="true" />
            Holdings
          </h2>

          {enrichedPositions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-sm">
              No positions yet — make your first trade!
            </div>
          ) : (
            <div className="overflow-auto flex-1 -mx-3 sm:-mx-4 px-3 sm:px-4">
              <table className="w-full text-xs" aria-label="Portfolio holdings">
                <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                  <tr className="text-[var(--text-secondary)] text-[10px] border-b border-[var(--border)]">
                    <th scope="col" className="text-left py-2 font-medium">Symbol</th>
                    <th scope="col" className="text-right py-2 font-medium">Shares</th>
                    <th scope="col" className="text-right py-2 font-medium hidden sm:table-cell">Avg Cost</th>
                    <th scope="col" className="text-right py-2 font-medium">Price</th>
                    <th scope="col" className="text-right py-2 font-medium hidden md:table-cell">Mkt Value</th>
                    <th scope="col" className="text-right py-2 font-medium">P&L</th>
                    <th scope="col" className="text-right py-2 font-medium hidden lg:table-cell">Weight</th>
                    <th scope="col" className="text-right py-2 font-medium hidden sm:table-cell">Day</th>
                  </tr>
                </thead>
                <tbody>
                  {enrichedPositions.map((p) => (
                    <tr
                      key={p.symbol}
                      className="holdings-row border-b border-[var(--border)]/50 cursor-pointer"
                      onClick={() => { setSelectedSymbol(p.symbol); setView('chart'); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedSymbol(p.symbol);
                          setView('chart');
                        }
                      }}
                      tabIndex={0}
                      role="row"
                      aria-label={`${p.symbol}: ${p.shares} shares, P&L ${p.pnl.absolute >= 0 ? '+' : ''}$${p.pnl.absolute.toFixed(2)}`}
                    >
                      <td className="py-2.5 font-semibold text-white">{p.symbol}</td>
                      <td className="py-2.5 text-right font-mono">{p.shares}</td>
                      <td className="py-2.5 text-right font-mono hidden sm:table-cell">${p.avgCost.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono">${p.currentPrice.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono hidden md:table-cell">
                        ${p.marketValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`py-2.5 text-right font-mono font-semibold ${p.pnl.absolute >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {p.pnl.absolute >= 0 ? '+' : ''}${p.pnl.absolute.toFixed(2)}
                        <span className="text-[10px] ml-1 opacity-70 hidden sm:inline">
                          ({p.pnl.percent >= 0 ? '+' : ''}{p.pnl.percent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono hidden lg:table-cell">{p.weight.toFixed(1)}%</td>
                      <td className={`py-2.5 text-right font-mono hidden sm:table-cell ${p.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {p.change >= 0 ? '+' : ''}{p.change.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Trade history */}
      {portfolio.trades.length > 0 && (
        <div className="px-2 sm:px-4 pb-2 sm:pb-4">
          <div className="bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-3 sm:p-4">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock size={16} aria-hidden="true" />
              Trade History
              <span className="text-[10px] text-[var(--text-secondary)] font-normal">
                ({portfolio.trades.length} trade{portfolio.trades.length !== 1 ? 's' : ''})
              </span>
            </h2>
            <div className="overflow-x-auto max-h-48 overflow-y-auto">
              <table className="w-full text-xs" aria-label="Trade history">
                <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                  <tr className="text-[var(--text-secondary)] text-[10px] border-b border-[var(--border)]">
                    <th scope="col" className="text-left py-2 font-medium">Time</th>
                    <th scope="col" className="text-left py-2 font-medium">Type</th>
                    <th scope="col" className="text-left py-2 font-medium">Symbol</th>
                    <th scope="col" className="text-right py-2 font-medium">Shares</th>
                    <th scope="col" className="text-right py-2 font-medium">Price</th>
                    <th scope="col" className="text-right py-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...portfolio.trades].reverse().map((t) => (
                    <tr key={t.id} className="trade-history-row border-b border-[var(--border)]/50">
                      <td className="py-2 text-[var(--text-secondary)] font-mono">
                        {new Date(t.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          t.type === 'buy' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                        }`}>
                          {t.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 font-semibold text-white">{t.symbol}</td>
                      <td className="py-2 text-right font-mono">{t.shares}</td>
                      <td className="py-2 text-right font-mono">${t.price.toFixed(2)}</td>
                      <td className="py-2 text-right font-mono">${t.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string | null;
  color: 'blue' | 'green' | 'red' | 'purple' | 'amber';
}) {
  const colorMap = {
    blue: 'from-blue-600/20 to-blue-800/10 border-blue-700/30',
    green: 'from-green-600/20 to-green-800/10 border-green-700/30',
    red: 'from-red-600/20 to-red-800/10 border-red-700/30',
    purple: 'from-purple-600/20 to-purple-800/10 border-purple-700/30',
    amber: 'from-amber-600/20 to-amber-800/10 border-amber-700/30',
  };
  const iconColorMap = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
  };

  return (
    <div className={`summary-card bg-gradient-to-br ${colorMap[color]} border rounded-xl p-2.5 sm:p-3.5`} aria-label={`${label}: ${value}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={iconColorMap[color]} aria-hidden="true">{icon}</span>
        <span className="text-[10px] text-[var(--text-secondary)] font-medium">{label}</span>
      </div>
      <div className="text-sm sm:text-lg font-bold font-mono leading-tight">{value}</div>
      {sub && <div className={`text-[10px] sm:text-xs mt-0.5 ${iconColorMap[color]} font-medium`}>{sub}</div>}
    </div>
  );
}
