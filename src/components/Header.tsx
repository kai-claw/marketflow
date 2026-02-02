import { TrendingUp, BarChart3, PieChart, Briefcase } from 'lucide-react';
import { useStore } from '../store';
import type { View } from '../types';

const NAV_ITEMS: { view: View; label: string; icon: React.ReactNode; key: string }[] = [
  { view: 'heatmap', label: 'Market Map', icon: <PieChart size={16} />, key: '1' },
  { view: 'chart', label: 'Charts', icon: <BarChart3 size={16} />, key: '2' },
  { view: 'portfolio', label: 'Portfolio', icon: <Briefcase size={16} />, key: '3' },
];

export default function Header() {
  const { view, setView, marketMood, stocks } = useStore();

  // Top gainer & loser
  const topGainer = [...stocks].sort((a, b) => b.change - a.change)[0];
  const topLoser = [...stocks].sort((a, b) => a.change - b.change)[0];

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
          <div className="text-[10px] text-[var(--text-secondary)] opacity-60">Simulated Data</div>
        </div>
      </div>
    </header>
  );
}
