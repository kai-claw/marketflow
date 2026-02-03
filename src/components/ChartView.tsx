import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../store';
import {
  TIMEFRAMES,
  INDICATORS,
  CINEMATIC_STOCKS,
  CINEMATIC_INTERVAL,
  POPULAR_SYMBOLS,
} from '../constants';
import CandlestickChart from './CandlestickChart';
import RSIChart from './RSIChart';
import MACDChart from './MACDChart';
import ComparisonChart from './ComparisonChart';
import { GitCompareArrows, Play, Pause } from 'lucide-react';

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
    isCandlesLive,
    marketOpen,
  } = useStore();

  const [cinematicIndex, setCinematicIndex] = useState(0);
  const [cinematicProgress, setCinematicProgress] = useState(0);
  const progressRafRef = useRef<number>(0);

  // Cinematic autoplay — cycle through featured stocks
  const toggleCinematic = useCallback(() => {
    setCinematicActive(!cinematicActive);
    if (!cinematicActive) {
      // Starting: find current stock in cinematic list or start at 0
      const idx = CINEMATIC_STOCKS.indexOf(selectedSymbol as typeof CINEMATIC_STOCKS[number]);
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
    <div className="view-enter flex flex-col h-full" id="panel-chart" role="tabpanel" aria-label="Charts">
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
              <span className="price-display text-base sm:text-lg font-bold font-mono">${lastCandle.close.toFixed(2)}</span>
              <div className={`text-xs sm:text-sm font-semibold ${dayChange >= 0 ? 'text-green-400 price-change-up' : 'text-red-400 price-change-down'}`}>
                <span aria-hidden="true">{dayChange >= 0 ? '▲' : '▼'}</span>
                <span className="sr-only">{dayChange >= 0 ? 'up' : 'down'}</span>
                {' '}{Math.abs(dayChange).toFixed(2)}%
              </div>
              <div className="text-xs text-[var(--text-secondary)] hidden md:block">
                Period: <span className={periodChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {periodChange >= 0 ? '+' : ''}{periodChange.toFixed(2)}%
                </span>
              </div>
              {/* Data source badges */}
              {isCandlesLive && (
                <span className="hidden lg:flex items-center gap-1 text-[10px] text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              )}
              {!marketOpen && (
                <span className="hidden lg:flex text-[10px] text-amber-400/80 font-mono">
                  MKT CLOSED
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timeframe + Compare + Cinematic buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCinematic}
            aria-pressed={cinematicActive}
            className={`cinematic-btn flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${
              cinematicActive
                ? 'bg-amber-600/20 border-amber-500/50 text-amber-400 cinematic-btn-active play-btn-active'
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
                className={`timeframe-btn px-2.5 py-1 rounded-md text-xs font-medium ${
                  chartTimeframe === tf
                    ? 'bg-[var(--bg-card)] text-white timeframe-btn-active'
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
        {INDICATORS.map(ind => {
          const isActive = activeIndicators.has(ind.id);
          return (
            <button
              key={ind.id}
              onClick={() => toggleIndicator(ind.id)}
              aria-pressed={isActive}
              className={`indicator-pill px-2 py-0.5 rounded text-[10px] font-medium border shrink-0 ${
                isActive
                  ? 'border-opacity-60 text-white indicator-pill-active'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-white'
              }`}
              style={{
                borderColor: isActive ? ind.color : 'transparent',
                backgroundColor: isActive ? `${ind.color}20` : 'transparent',
                '--pill-color': `${ind.color}30`,
              } as React.CSSProperties}
            >
              {ind.label}
            </button>
          );
        })}
      </div>

      {/* OHLC bar */}
      {lastCandle && (
        <div className="ohlc-bar flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-1 border-b border-[var(--border)] text-[10px] font-mono text-[var(--text-secondary)] overflow-x-auto" aria-label="OHLCV data">
          <span>O <span className="ohlc-value text-white">{lastCandle.open.toFixed(2)}</span></span>
          <span>H <span className="ohlc-value text-green-400">{lastCandle.high.toFixed(2)}</span></span>
          <span>L <span className="ohlc-value text-red-400">{lastCandle.low.toFixed(2)}</span></span>
          <span>C <span className="ohlc-value text-white">{lastCandle.close.toFixed(2)}</span></span>
          <span>Vol <span className="ohlc-value text-blue-400">{(lastCandle.volume / 1000000).toFixed(1)}M</span></span>
        </div>
      )}

      {/* Chart area */}
      {comparisonMode ? (
        <div className="flex-1 min-h-0 relative">
          <ComparisonChart onClose={() => setComparisonMode(false)} />
        </div>
      ) : (
        <>
          <div className="chart-area flex-1 min-h-0 relative">
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
