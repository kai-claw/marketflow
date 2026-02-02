import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, type ChartTimeframe, type Indicator, CINEMATIC_STOCKS, CINEMATIC_INTERVAL } from '../store';
import { STOCK_PRESETS } from '../data/candlestickData';
import CandlestickChart from './CandlestickChart';
import RSIChart from './RSIChart';
import MACDChart from './MACDChart';
import ComparisonChart from './ComparisonChart';
import { GitCompareArrows, Play, Pause } from 'lucide-react';

const TIMEFRAMES: ChartTimeframe[] = ['1M', '3M', '6M', '1Y'];

const INDICATORS: { id: Indicator; label: string; color: string }[] = [
  { id: 'volume', label: 'VOL', color: '#64748b' },
  { id: 'sma20', label: 'SMA 20', color: '#f59e0b' },
  { id: 'sma50', label: 'SMA 50', color: '#a855f7' },
  { id: 'ema12', label: 'EMA 12', color: '#3b82f6' },
  { id: 'ema26', label: 'EMA 26', color: '#14b8a6' },
  { id: 'bollinger', label: 'BB', color: '#6366f1' },
  { id: 'rsi', label: 'RSI', color: '#a855f7' },
  { id: 'macd', label: 'MACD', color: '#3b82f6' },
];

const POPULAR_SYMBOLS = Object.keys(STOCK_PRESETS);

export default function ChartView() {
  const {
    selectedSymbol,
    setSelectedSymbol,
    chartTimeframe,
    setChartTimeframe,
    activeIndicators,
    toggleIndicator,
    candleData,
    stocks,
    comparisonMode,
    setComparisonMode,
    cinematicActive,
    setCinematicActive,
  } = useStore();

  const [cinematicIndex, setCinematicIndex] = useState(0);
  const [cinematicProgress, setCinematicProgress] = useState(0);
  const progressRafRef = useRef<number>(0);

  // Cinematic autoplay — cycle through featured stocks
  const toggleCinematic = useCallback(() => {
    setCinematicActive(!cinematicActive);
    if (!cinematicActive) {
      // Starting: find current stock in cinematic list or start at 0
      const idx = CINEMATIC_STOCKS.indexOf(selectedSymbol);
      setCinematicIndex(idx >= 0 ? idx : 0);
      setCinematicProgress(0);
    }
  }, [cinematicActive, setCinematicActive, selectedSymbol]);

  useEffect(() => {
    if (!cinematicActive) return;

    let startTime = Date.now();
    let cancelled = false;
    
    // Set the initial stock
    setSelectedSymbol(CINEMATIC_STOCKS[cinematicIndex]);
    
    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / CINEMATIC_INTERVAL, 1);
      setCinematicProgress(progress);
      
      if (progress >= 1) {
        // Advance to next stock
        startTime = Date.now();
        setCinematicIndex(prev => {
          const next = (prev + 1) % CINEMATIC_STOCKS.length;
          setSelectedSymbol(CINEMATIC_STOCKS[next]);
          return next;
        });
        setCinematicProgress(0);
      }
      
      progressRafRef.current = requestAnimationFrame(tick);
    };

    progressRafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(progressRafRef.current);
    };
  }, [cinematicActive]); // Only depend on active state — index managed internally

  const stock = stocks.find(s => s.symbol === selectedSymbol);
  const lastCandle = candleData.length > 0 ? candleData[candleData.length - 1] : null;
  const prevCandle = candleData.length > 1 ? candleData[candleData.length - 2] : null;
  const dayChange = lastCandle && prevCandle ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100 : 0;
  const periodStart = candleData.length > 0 ? candleData[0] : null;
  const periodChange = lastCandle && periodStart && periodStart.open > 0
    ? ((lastCandle.close - periodStart.open) / periodStart.open) * 100
    : 0;

  return (
    <div className="flex flex-col h-full" id="panel-chart" role="tabpanel" aria-label="Charts">
      {/* Top bar - symbol info */}
      <div className="flex flex-wrap items-center justify-between px-2 sm:px-4 py-2.5 border-b border-[var(--border)] bg-[var(--bg-secondary)] gap-2">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {/* Symbol selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="symbol-select" className="sr-only">Stock symbol</label>
            <select
              id="symbol-select"
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-[var(--bg-card)] border border-[var(--border)] text-white px-2 py-1 rounded-md text-sm font-semibold focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Select stock symbol"
            >
              {POPULAR_SYMBOLS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {stock && (
              <span className="text-xs text-[var(--text-secondary)] hidden sm:inline">{stock.name}</span>
            )}
          </div>

          {/* Price */}
          {lastCandle && (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-base sm:text-lg font-bold font-mono">${lastCandle.close.toFixed(2)}</span>
              <div className={`text-xs sm:text-sm font-semibold ${dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <span aria-hidden="true">{dayChange >= 0 ? '▲' : '▼'}</span>
                <span className="sr-only">{dayChange >= 0 ? 'up' : 'down'}</span>
                {' '}{Math.abs(dayChange).toFixed(2)}%
              </div>
              <div className="text-xs text-[var(--text-secondary)] hidden md:block">
                Period: <span className={periodChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {periodChange >= 0 ? '+' : ''}{periodChange.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Timeframe + Compare + Cinematic buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCinematic}
            aria-pressed={cinematicActive}
            className={`cinematic-btn flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
              cinematicActive
                ? 'bg-amber-600/20 border-amber-500/50 text-amber-400 cinematic-btn-active'
                : 'border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
            }`}
            title="Cinematic autoplay — cycle through stocks (A)"
          >
            {cinematicActive ? <Pause size={12} /> : <Play size={12} />}
            <span className="hidden sm:inline">Autoplay</span>
          </button>
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            aria-pressed={comparisonMode}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
              comparisonMode
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                : 'border-transparent text-[var(--text-secondary)] hover:text-white hover:bg-white/5'
            }`}
            title="Compare stocks (normalized % change)"
          >
            <GitCompareArrows size={12} />
            <span className="hidden sm:inline">Compare</span>
          </button>
          <div className="flex gap-1 bg-[var(--bg-primary)] rounded-lg p-0.5" role="radiogroup" aria-label="Chart timeframe">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                role="radio"
                aria-checked={chartTimeframe === tf}
                onClick={() => setChartTimeframe(tf)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  chartTimeframe === tf
                    ? 'bg-[var(--bg-card)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Indicators bar */}
      <div className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-4 py-1.5 border-b border-[var(--border)] bg-[var(--bg-secondary)] overflow-x-auto">
        <span className="text-[10px] text-[var(--text-secondary)] mr-1 shrink-0">Indicators:</span>
        {INDICATORS.map(ind => (
          <button
            key={ind.id}
            onClick={() => toggleIndicator(ind.id)}
            aria-pressed={activeIndicators.has(ind.id)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all border shrink-0 ${
              activeIndicators.has(ind.id)
                ? 'border-opacity-60 text-white'
                : 'border-transparent text-[var(--text-secondary)] hover:text-white'
            }`}
            style={{
              borderColor: activeIndicators.has(ind.id) ? ind.color : 'transparent',
              backgroundColor: activeIndicators.has(ind.id) ? `${ind.color}20` : 'transparent',
            }}
          >
            {ind.label}
          </button>
        ))}
      </div>

      {/* OHLC bar */}
      {lastCandle && (
        <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-1 border-b border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)] overflow-x-auto" aria-label="OHLCV data">
          <span>O <span className="text-white">{lastCandle.open.toFixed(2)}</span></span>
          <span>H <span className="text-green-400">{lastCandle.high.toFixed(2)}</span></span>
          <span>L <span className="text-red-400">{lastCandle.low.toFixed(2)}</span></span>
          <span>C <span className="text-white">{lastCandle.close.toFixed(2)}</span></span>
          <span>Vol <span className="text-blue-400">{(lastCandle.volume / 1000000).toFixed(1)}M</span></span>
        </div>
      )}

      {/* Chart area */}
      {comparisonMode ? (
        <div className="flex-1 min-h-0 relative">
          <ComparisonChart onClose={() => setComparisonMode(false)} />
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 relative">
            {candleData.length > 0 ? (
              <CandlestickChart />
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--text-secondary)] text-sm">
                No data available for {selectedSymbol}
              </div>
            )}

            {/* Cinematic floating badge */}
            {cinematicActive && (
              <div className="cinematic-badge absolute bottom-3 right-3 z-20 bg-[var(--bg-card)]/90 backdrop-blur-md border border-amber-500/30 rounded-lg px-3 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <span className="cinematic-pulse-dot w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">Autoplay</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {cinematicIndex + 1}/{CINEMATIC_STOCKS.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm font-bold text-white">{selectedSymbol}</span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {stocks.find(s => s.symbol === selectedSymbol)?.name}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-1.5 h-1 rounded-full bg-amber-900/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-none"
                    style={{ width: `${cinematicProgress * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* RSI sub-chart */}
          {activeIndicators.has('rsi') && candleData.length > 15 && (
            <div className="border-t border-[var(--border)]">
              <RSIChart />
            </div>
          )}

          {/* MACD sub-chart */}
          {activeIndicators.has('macd') && candleData.length > 26 && (
            <div className="border-t border-[var(--border)]">
              <MACDChart />
            </div>
          )}
        </>
      )}
    </div>
  );
}
