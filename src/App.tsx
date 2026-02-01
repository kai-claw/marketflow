import Header from './components/Header';
import Heatmap from './components/Heatmap';
import ChartView from './components/ChartView';
import PortfolioView from './components/PortfolioView';
import { useStore } from './store';

export default function App() {
  const { view } = useStore();

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden">
      <Header />
      <main className="flex-1 min-h-0">
        {view === 'heatmap' && <Heatmap />}
        {view === 'chart' && <ChartView />}
        {view === 'portfolio' && <PortfolioView />}
      </main>
    </div>
  );
}
