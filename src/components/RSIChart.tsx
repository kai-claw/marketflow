import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, ColorType, LineStyle, LineSeries } from 'lightweight-charts';
import { useStore } from '../store';
import { calculateRSI } from '../data/indicators';
import { CHART_THEME } from '../constants';
import { toLineData, toConstantLine } from '../chartHelpers';

export default function RSIChart() {
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
      rightPriceScale: {
        borderColor: CHART_THEME.borderColor,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { borderColor: CHART_THEME.borderColor, visible: false },
    });

    chartRef.current = chart;

    const rsiData = calculateRSI(candleData, 14);

    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#a855f7',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    rsiSeries.setData(toLineData(rsiData));

    // Overbought line (70)
    const ob = chart.addSeries(LineSeries, {
      color: 'rgba(239, 68, 68, 0.4)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    ob.setData(toConstantLine(rsiData, 70));

    // Oversold line (30)
    const os = chart.addSeries(LineSeries, {
      color: 'rgba(34, 197, 94, 0.4)',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    os.setData(toConstantLine(rsiData, 30));

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
      <div className="absolute top-1 left-2 z-10 text-[10px] font-semibold text-purple-400">RSI (14)</div>
      <div ref={containerRef} className="w-full h-full" style={{ height: '120px' }} />
    </div>
  );
}
