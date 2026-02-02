import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { createChart, type IChartApi, ColorType, LineSeries } from 'lightweight-charts';
import { useStore } from '../store';
import { getCandleData } from '../data/candleHelpers';
import {
  COMPARISON_COLORS,
  MAX_COMPARISON_STOCKS,
  POPULAR_SYMBOLS,
  CHART_THEME,
} from '../constants';
import { normalizeToPercent } from '../utils';
import { toLineData } from '../chartHelpers';
import { X, Plus, GitCompareArrows } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function ComparisonChart({ onClose }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { selectedSymbol, chartTimeframe } = useStore();

  const [compareSymbols, setCompareSymbols] = useState<string[]>([selectedSymbol]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const availableSymbols = useMemo(
    () => POPULAR_SYMBOLS.filter(s => !compareSymbols.includes(s)),
    [compareSymbols]
  );

  const addSymbol = useCallback((s: string) => {
    if (compareSymbols.length < MAX_COMPARISON_STOCKS && !compareSymbols.includes(s)) {
      setCompareSymbols(prev => [...prev, s]);
    }
    setAddMenuOpen(false);
  }, [compareSymbols]);

  const removeSymbol = useCallback((s: string) => {
    setCompareSymbols(prev => prev.filter(sym => sym !== s));
  }, []);

  // Build chart
  useEffect(() => {
    if (!chartContainerRef.current || compareSymbols.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: CHART_THEME.background },
        textColor: CHART_THEME.textColor,
        fontSize: CHART_THEME.fontSize,
      },
      grid: {
        vertLines: { color: CHART_THEME.gridColor },
        horzLines: { color: CHART_THEME.gridColor },
      },
      crosshair: {
        vertLine: { color: CHART_THEME.crosshairColor, labelBackgroundColor: CHART_THEME.crosshairLabelBg },
        horzLine: { color: CHART_THEME.crosshairColor, labelBackgroundColor: CHART_THEME.crosshairLabelBg },
      },
      rightPriceScale: { borderColor: CHART_THEME.borderColor },
      timeScale: { borderColor: CHART_THEME.borderColor, timeVisible: false },
    });
    chartRef.current = chart;

    // Add zero line
    if (compareSymbols.length > 0) {
      const firstCandles = getCandleData(compareSymbols[0], chartTimeframe);
      const zeroData = toLineData(firstCandles.map(c => ({ time: c.time, value: 0 })));
      const zeroSeries = chart.addSeries(LineSeries, {
        color: 'rgba(148, 163, 184, 0.2)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      zeroSeries.setData(zeroData);
    }

    // Add each comparison stock
    compareSymbols.forEach((symbol, i) => {
      const candles = getCandleData(symbol, chartTimeframe);
      const normalized = normalizeToPercent(candles);
      const color = COMPARISON_COLORS[i % COMPARISON_COLORS.length];

      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title: symbol,
      });
      series.setData(toLineData(normalized));
    });

    chart.timeScale().fitContent();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (chartRef.current && container) {
          chartRef.current.applyOptions({
            width: container.clientWidth,
            height: container.clientHeight,
          });
        }
      }, 100);
    });
    ro.observe(container);

    return () => {
      clearTimeout(resizeTimer);
      ro.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [compareSymbols, chartTimeframe]);

  return (
    <div className="flex flex-col h-full">
      {/* Comparison header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <GitCompareArrows size={14} className="text-blue-400 shrink-0" />
        <span className="text-xs font-semibold text-blue-400">Compare</span>

        {/* Symbol chips */}
        <div className="flex items-center gap-1 flex-wrap flex-1">
          {compareSymbols.map((s, i) => (
            <div
              key={s}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border comparison-chip"
              style={{
                borderColor: COMPARISON_COLORS[i % COMPARISON_COLORS.length],
                color: COMPARISON_COLORS[i % COMPARISON_COLORS.length],
                backgroundColor: `${COMPARISON_COLORS[i % COMPARISON_COLORS.length]}15`,
              }}
            >
              {s}
              {compareSymbols.length > 1 && (
                <button
                  onClick={() => removeSymbol(s)}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                  aria-label={`Remove ${s} from comparison`}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          ))}

          {/* Add button */}
          {compareSymbols.length < MAX_COMPARISON_STOCKS && (
            <div className="relative">
              <button
                onClick={() => setAddMenuOpen(!addMenuOpen)}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] text-[var(--text-secondary)] hover:text-white border border-dashed border-[var(--border)] hover:border-[var(--text-secondary)] transition-all"
                aria-label="Add stock to comparison"
              >
                <Plus size={10} />
                <span>Add</span>
              </button>

              {addMenuOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg shadow-xl max-h-48 overflow-y-auto py-1 min-w-[100px] comparison-dropdown">
                  {availableSymbols.map(s => (
                    <button
                      key={s}
                      onClick={() => addSymbol(s)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 text-[var(--text-secondary)] hover:text-white transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="compare-close-btn p-1 rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-white shrink-0"
          aria-label="Close comparison mode"
        >
          <X size={14} />
        </button>
      </div>

      {/* Normalized % label */}
      <div className="absolute top-12 left-3 z-10 text-[10px] text-[var(--text-secondary)] bg-[var(--bg-primary)]/80 px-2 py-0.5 rounded">
        % Change from Period Start
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="flex-1 min-h-0" />
    </div>
  );
}
