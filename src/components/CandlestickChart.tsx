import { useEffect, useRef } from 'react';
import {
  createChart,
  type IChartApi,
  ColorType,
  LineStyle,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from 'lightweight-charts';
import { useStore } from '../store';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
} from '../data/candlestickData';

export default function CandlestickChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const { candleData, activeIndicators, selectedSymbol } = useStore();

  useEffect(() => {
    if (!chartContainerRef.current || candleData.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0e17' },
        textColor: '#94a3b8',
        fontSize: 11,
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
      timeScale: { borderColor: '#1e2a3a', timeVisible: false },
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    candleSeries.setData(candleData as any);

    // Volume
    if (activeIndicators.has('volume')) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(
        candleData.map((c) => ({
          time: c.time as any,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
        }))
      );
    }

    // SMA 20
    if (activeIndicators.has('sma20')) {
      const sma20 = calculateSMA(candleData, 20);
      const s = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(sma20 as any);
    }

    // SMA 50
    if (activeIndicators.has('sma50')) {
      const sma50 = calculateSMA(candleData, 50);
      const s = chart.addSeries(LineSeries, {
        color: '#a855f7',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(sma50 as any);
    }

    // EMA 12
    if (activeIndicators.has('ema12')) {
      const ema12 = calculateEMA(candleData, 12);
      const s = chart.addSeries(LineSeries, {
        color: '#3b82f6',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(ema12 as any);
    }

    // EMA 26
    if (activeIndicators.has('ema26')) {
      const ema26 = calculateEMA(candleData, 26);
      const s = chart.addSeries(LineSeries, {
        color: '#14b8a6',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      s.setData(ema26 as any);
    }

    // Bollinger Bands
    if (activeIndicators.has('bollinger')) {
      const bb = calculateBollingerBands(candleData);

      const upperS = chart.addSeries(LineSeries, {
        color: 'rgba(99, 102, 241, 0.5)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      upperS.setData(bb.upper as any);

      const middleS = chart.addSeries(LineSeries, {
        color: 'rgba(99, 102, 241, 0.8)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      middleS.setData(bb.middle as any);

      const lowerS = chart.addSeries(LineSeries, {
        color: 'rgba(99, 102, 241, 0.5)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      lowerS.setData(bb.lower as any);
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(() => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
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
  }, [candleData, activeIndicators, selectedSymbol]);

  return <div ref={chartContainerRef} className="w-full h-full" />;
}
