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
import { calculateSMA, calculateEMA, calculateBollingerBands } from '../data/indicators';
import { CHART_THEME } from '../constants';
import { toCandlestickData, toVolumeData, toLineData } from '../chartHelpers';

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

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_THEME.upColor,
      downColor: CHART_THEME.downColor,
      borderUpColor: CHART_THEME.upColor,
      borderDownColor: CHART_THEME.downColor,
      wickUpColor: CHART_THEME.upColor,
      wickDownColor: CHART_THEME.downColor,
    });
    candleSeries.setData(toCandlestickData(candleData));

    // Volume
    if (activeIndicators.has('volume')) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });
      volumeSeries.setData(toVolumeData(candleData));
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
      s.setData(toLineData(sma20));
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
      s.setData(toLineData(sma50));
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
      s.setData(toLineData(ema12));
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
      s.setData(toLineData(ema26));
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
      upperS.setData(toLineData(bb.upper));

      const middleS = chart.addSeries(LineSeries, {
        color: 'rgba(99, 102, 241, 0.8)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      middleS.setData(toLineData(bb.middle));

      const lowerS = chart.addSeries(LineSeries, {
        color: 'rgba(99, 102, 241, 0.5)',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      lowerS.setData(toLineData(bb.lower));
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
