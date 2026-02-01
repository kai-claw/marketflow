import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, ColorType, LineSeries, HistogramSeries } from 'lightweight-charts';
import { useStore } from '../store';
import { calculateMACD } from '../data/candlestickData';

export default function MACDChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { candleData } = useStore();

  useEffect(() => {
    if (!containerRef.current || candleData.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = containerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e17' },
        textColor: '#94a3b8',
        fontSize: 10,
      },
      grid: {
        vertLines: { color: '#1e2a3a' },
        horzLines: { color: '#1e2a3a' },
      },
      crosshair: {
        vertLine: { color: '#475569', labelBackgroundColor: '#334155' },
        horzLine: { color: '#475569', labelBackgroundColor: '#334155' },
      },
      rightPriceScale: { borderColor: '#1e2a3a' },
      timeScale: { borderColor: '#1e2a3a', visible: false },
    });

    chartRef.current = chart;

    const { macd, signal, histogram } = calculateMACD(candleData);

    // Histogram
    const histSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'macd',
      priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
    });
    histSeries.setData(histogram as any);

    // MACD line
    const macdSeries = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'macd',
    });
    macdSeries.setData(macd as any);

    // Signal line
    const signalSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'macd',
    });
    signalSeries.setData(signal as any);

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth, height: container.clientHeight });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [candleData]);

  return (
    <div className="relative">
      <div className="absolute top-1 left-2 z-10 flex gap-3 text-[10px] font-semibold">
        <span className="text-blue-400">MACD</span>
        <span className="text-amber-400">Signal</span>
        <span className="text-slate-400">Histogram</span>
      </div>
      <div ref={containerRef} className="w-full h-full" style={{ height: '120px' }} />
    </div>
  );
}
