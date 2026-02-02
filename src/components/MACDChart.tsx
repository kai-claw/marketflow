import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, ColorType, LineSeries, HistogramSeries } from 'lightweight-charts';
import { useStore } from '../store';
import { calculateMACD } from '../data/indicators';
import { CHART_THEME } from '../constants';
import { toLineData, toHistogramData } from '../chartHelpers';

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
        background: { type: ColorType.Solid, color: CHART_THEME.background },
        textColor: CHART_THEME.textColor,
        fontSize: 10,
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
      timeScale: { borderColor: CHART_THEME.borderColor, visible: false },
    });

    chartRef.current = chart;

    const { macd, signal, histogram } = calculateMACD(candleData);

    // Histogram
    const histSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'macd',
      priceFormat: { type: 'price', precision: 4, minMove: 0.0001 },
    });
    histSeries.setData(toHistogramData(histogram));

    // MACD line
    const macdSeries = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'macd',
    });
    macdSeries.setData(toLineData(macd));

    // Signal line
    const signalSeries = chart.addSeries(LineSeries, {
      color: '#f59e0b',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'macd',
    });
    signalSeries.setData(toLineData(signal));

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
