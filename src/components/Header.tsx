import { useMemo } from 'react';
import { TrendingUp, BarChart3, PieChart, Briefcase, Wifi, WifiOff, Clock } from 'lucide-react';
import { useStore } from '../store';
import type { View } from '../types';

const NAV_ITEMS: { view: View; label: string; icon: React.ReactNode; key: string }[] = [
  { view: 'heatmap', label: 'Market Map', icon: <PieChart size={16} />, key: '1' },
  { view: 'chart', label: 'Charts', icon: <BarChart3 size={16} />, key: '2' },
  { view: 'portfolio', label: 'Portfolio', icon: <Briefcase size={16} />, key: '3' },
];

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function Header() {
  const { view, setView, marketMood, stocks, isLiveData, lastUpdated, marketOpen, isLoading } = useStore();

  // Top gainer & loser — single O(n) pass instead of two O(n log n) sorts
  const { topGainer, topLoser } = useMemo(() => {
    let gainer = stocks[0] || null;
    let loser = stocks[0] || null;
    for (let i = 1; i < stocks.length; i++) {
      if (stocks[i].change > gainer.change) gainer = stocks[i];
      if (stocks[i].change < loser.change) loser = stocks[i];
    }
    return { topGainer: gainer, topLoser: loser };
  }, [stocks]);

  return (
    <header className="header-bar flex items-center justify-between px-3 sm:px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2.5">
        <div className="header-logo w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center shrink-0">
          <TrendingUp size={18} className="text-white" />
        </div>
        <div className="hidden sm:block">
          <h1 className="header-title text-base font-semibold tracking-tight leading-none">MarketFlow</h1>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Stock Market Visualizer</p>
        </div>
      </div>

      {/* Market Mood Indicator */}
      <div className="mood-indicator hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border)]">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{marketMood.emoji}</span>
          <span className="text-xs font-semibold" style={{ color: marketMood.color }}>{marketMood.label}</span>
        </div>
        <div className="w-px h-4 bg-[var(--border)]" />
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-green-400">▲{marketMood.advancers}</span>
          <span className="text-red-400">▼{marketMood.decliners}</span>
        </div>
        <div className="w-px h-4 bg-[var(--border)]" />
        <div className="flex items-center gap-1.5 text-[10px]">
          {topGainer && (
            <span className="text-green-400 font-mono">{topGainer.symbol} +{topGainer.change.toFixed(1)}%</span>
          )}
          {topLoser && (
            <>
              <span className="text-[var(--text-secondary)]">·</span>
              <span className="text-red-400 font-mono">{topLoser.symbol} {topLoser.change.toFixed(1)}%</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <nav
          className="flex gap-1 bg-[var(--bg-primary)] rounded-lg p-1"
          role="tablist"
          aria-label="View navigation"
        >
          {NAV_ITEMS.map(({ view: v, label, icon, key }) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              aria-controls={`panel-${v}`}
              onClick={() => setView(v)}
              className={`nav-tab flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === v
                  ? 'bg-[var(--bg-card)] text-white shadow-sm nav-tab-active'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
              title={`${label} (${key})`}
            >
              {icon}
              <span className="hidden xs:inline">{label}</span>
            </button>
          ))}
        </nav>

        <div className="text-right hidden sm:block">
          <div className="text-xs text-[var(--text-secondary)]">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-0.5">
            {/* Live / Mock data indicator */}
            {isLoading ? (
              <span className="text-[10px] text-amber-400 opacity-80 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Loading…
              </span>
            ) : isLiveData ? (
              <span className="text-[10px] text-emerald-400 opacity-80 flex items-center gap-1">
                <Wifi size={9} />
                Live Data
              </span>
            ) : (
              <span className="text-[10px] text-[var(--text-secondary)] opacity-60 flex items-center gap-1">
                <WifiOff size={9} />
                Simulated
              </span>
            )}
            {/* Market open/closed */}
            {!marketOpen && (
              <span className="text-[9px] font-mono text-amber-400/70 px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10">
                MKT CLOSED
              </span>
            )}
            {/* Last updated */}
            {lastUpdated && (
              <span className="text-[9px] text-[var(--text-secondary)] opacity-50 flex items-center gap-0.5">
                <Clock size={8} />
                {formatTime(lastUpdated)}
              </span>
            )}
            <span className="version-badge text-[9px] font-mono text-[var(--text-secondary)] opacity-50 px-1.5 py-0.5 rounded border border-[var(--border)]/50">v1.1.0</span>
          </div>
        </div>
      </div>
    </header>
  );
}
