import { useEffect, useCallback } from 'react';
import Header from './components/Header';
import MarketTicker from './components/MarketTicker';
import Heatmap from './components/Heatmap';
import ChartView from './components/ChartView';
import PortfolioView from './components/PortfolioView';
import ErrorBoundary from './components/ErrorBoundary';
import { useStore } from './store';

export default function App() {
  const { view, setView, comparisonMode, setComparisonMode } = useStore();

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
    }
  }, [setView, view, comparisonMode, setComparisonMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
        <Header />
        <MarketTicker />
        <main className="flex-1 min-h-0" role="main" aria-label={`${view === 'heatmap' ? 'Market Map' : view === 'chart' ? 'Charts' : 'Portfolio'} view`}>
          {view === 'heatmap' && <Heatmap />}
          {view === 'chart' && <ChartView />}
          {view === 'portfolio' && <PortfolioView />}
        </main>
      </div>
    </ErrorBoundary>
  );
}
