import { TrendingUp, BarChart3, PieChart, Briefcase } from 'lucide-react';
import { useStore, type View } from '../store';

const NAV_ITEMS: { view: View; label: string; icon: React.ReactNode }[] = [
  { view: 'heatmap', label: 'Market Map', icon: <PieChart size={16} /> },
  { view: 'chart', label: 'Charts', icon: <BarChart3 size={16} /> },
  { view: 'portfolio', label: 'Portfolio', icon: <Briefcase size={16} /> },
];

export default function Header() {
  const { view, setView } = useStore();

  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
          <TrendingUp size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-semibold tracking-tight leading-none">MarketFlow</h1>
          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Stock Market Visualizer</p>
        </div>
      </div>

      <nav className="flex gap-1 bg-[var(--bg-primary)] rounded-lg p-1">
        {NAV_ITEMS.map(({ view: v, label, icon }) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              view === v
                ? 'bg-[var(--bg-card)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      <div className="text-right">
        <div className="text-xs text-[var(--text-secondary)]">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
        <div className="text-[10px] text-[var(--text-secondary)] opacity-60">Simulated Data</div>
      </div>
    </header>
  );
}
