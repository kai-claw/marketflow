import { useEffect, useCallback, useState } from 'react';
import Header from './components/Header';
import MarketTicker from './components/MarketTicker';
import Heatmap from './components/Heatmap';
import ChartView from './components/ChartView';
import PortfolioView from './components/PortfolioView';
import ErrorBoundary from './components/ErrorBoundary';
import { usePerformanceMonitor, FPSBadge } from './components/PerformanceMonitor';
import { useStore } from './store';

export default function App() {
  const { view, setView, comparisonMode, setComparisonMode, cinematicActive, setCinematicActive } = useStore();
  const [showHelp, setShowHelp] = useState(false);
  const perf = usePerformanceMonitor();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture when typing in inputs/selects
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

    switch (e.key) {
      case '1':
        setView('heatmap');
        break;
      case '2':
        setView('chart');
        break;
      case '3':
        setView('portfolio');
        break;
      case 'c':
      case 'C':
        if (view === 'chart') setComparisonMode(!comparisonMode);
        break;
      case 'a':
      case 'A':
        if (view === 'chart') setCinematicActive(!cinematicActive);
        break;
      case 'h':
      case 'H':
        setShowHelp(prev => !prev);
        break;
      case 'Escape':
        setShowHelp(false);
        break;
    }
  }, [setView, view, comparisonMode, setComparisonMode, cinematicActive, setCinematicActive]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <ErrorBoundary>
      <div className="app-entrance h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
        <Header />
        <MarketTicker />
        <main className="flex-1 min-h-0 relative" role="main" aria-label={`${view === 'heatmap' ? 'Market Map' : view === 'chart' ? 'Charts' : 'Portfolio'} view`}>
          {view === 'heatmap' && <Heatmap perfDegraded={perf.degraded} />}
          {view === 'chart' && <ChartView />}
          {view === 'portfolio' && <PortfolioView />}

          {/* Instructions bar */}
          <div className="instructions-bar hidden sm:flex absolute bottom-2 left-1/2 -translate-x-1/2 z-10 items-center gap-3 px-4 py-1.5 rounded-full bg-[var(--bg-card)]/80 backdrop-blur-sm border border-[var(--border)]/50 text-[10px] text-[var(--text-secondary)] pointer-events-none">
            <span><kbd className="kbd">1</kbd><kbd className="kbd">2</kbd><kbd className="kbd">3</kbd> Views</span>
            <span><kbd className="kbd">H</kbd> Help</span>
            {view === 'heatmap' && <span><kbd className="kbd">S</kbd> Sparklines</span>}
            {view === 'chart' && <span><kbd className="kbd">A</kbd> Autoplay</span>}
            {view === 'chart' && <span><kbd className="kbd">C</kbd> Compare</span>}
          </div>
        </main>

        {/* Help overlay */}
        {showHelp && (
          <div
            className="help-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
            role="dialog"
            aria-label="Keyboard shortcuts"
          >
            <div
              className="help-panel bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold mb-4 text-white">⌨️ Keyboard Shortcuts</h2>
              <div className="space-y-2 text-sm">
                <ShortcutRow keys="1" desc="Market Map view" />
                <ShortcutRow keys="2" desc="Charts view" />
                <ShortcutRow keys="3" desc="Portfolio view" />
                <div className="border-t border-[var(--border)] my-3" />
                <ShortcutRow keys="S" desc="Toggle Sparklines (Map)" />
                <ShortcutRow keys="A" desc="Cinematic Autoplay (Charts)" />
                <ShortcutRow keys="C" desc="Compare Mode (Charts)" />
                <ShortcutRow keys="H" desc="Toggle this help" />
                <ShortcutRow keys="Esc" desc="Close dialogs" />
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="mt-4 w-full py-2 rounded-lg bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-white text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
        {/* Performance monitor badge */}
        {perf.degraded && <FPSBadge {...perf} />}
      </div>
    </ErrorBoundary>
  );
}

function ShortcutRow({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="shortcut-row flex items-center justify-between">
      <span className="text-[var(--text-secondary)]">{desc}</span>
      <div className="flex gap-1">
        {keys.split('+').map(k => (
          <kbd key={k} className="kbd-lg">{k}</kbd>
        ))}
      </div>
    </div>
  );
}
