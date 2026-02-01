// Generate realistic OHLCV candlestick data

export interface Candle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function generateCandlestickData(
  symbol: string,
  startPrice: number,
  days: number = 365,
  volatility: number = 0.02,
  trend: number = 0.0003
): Candle[] {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 31337;
  const rand = seededRandom(seed);
  
  const candles: Candle[] = [];
  let price = startPrice;
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // Skip weekends
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;
    
    // Generate OHLC with realistic patterns
    const u1 = rand();
    const u2 = rand();
    const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    const dailyReturn = trend + normal * volatility;
    const open = price;
    const close = open * (1 + dailyReturn);
    
    // Wicks
    const wickUp = Math.abs(normal * volatility * 0.5 * rand());
    const wickDown = Math.abs(normal * volatility * 0.5 * rand());
    const high = Math.max(open, close) * (1 + wickUp);
    const low = Math.min(open, close) * (1 - wickDown);
    
    // Volume pattern - higher on volatile days
    const baseVol = 10000000 + rand() * 40000000;
    const volMult = 1 + Math.abs(dailyReturn) * 20;
    const volume = Math.round(baseVol * volMult);
    
    candles.push({
      time: date.toISOString().slice(0, 10),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });
    
    price = close;
  }
  
  return candles;
}

// Technical indicators

export function calculateSMA(data: Candle[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((s, c) => s + c.close, 0);
    result.push({ time: data[i].time, value: Number((sum / period).toFixed(2)) });
  }
  return result;
}

export function calculateEMA(data: Candle[], period: number): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: Number(ema.toFixed(2)) });
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: Number(ema.toFixed(2)) });
  }
  return result;
}

export function calculateRSI(data: Candle[], period: number = 14): { time: string; value: number }[] {
  const result: { time: string; value: number }[] = [];
  const changes = data.slice(1).map((c, i) => c.close - data[i].close);
  
  let avgGain = 0, avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;
  
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({ time: data[period].time, value: Number((100 - 100 / (1 + rs)).toFixed(2)) });
  
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    result.push({ time: data[i + 1].time, value: Number(rsi.toFixed(2)) });
  }
  return result;
}

export function calculateMACD(data: Candle[]): {
  macd: { time: string; value: number }[];
  signal: { time: string; value: number }[];
  histogram: { time: string; value: number; color: string }[];
} {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  
  // Align by time
  const ema26Times = new Set(ema26.map(e => e.time));
  const aligned12 = ema12.filter(e => ema26Times.has(e.time));
  const ema26Map = new Map(ema26.map(e => [e.time, e.value]));
  
  const macdLine = aligned12.map(e => ({
    time: e.time,
    value: Number((e.value - (ema26Map.get(e.time) || 0)).toFixed(2)),
  }));
  
  // Signal line (9-period EMA of MACD)
  const signalPeriod = 9;
  const signalMult = 2 / (signalPeriod + 1);
  const signal: { time: string; value: number }[] = [];
  
  if (macdLine.length >= signalPeriod) {
    let sum = 0;
    for (let i = 0; i < signalPeriod; i++) sum += macdLine[i].value;
    let ema = sum / signalPeriod;
    signal.push({ time: macdLine[signalPeriod - 1].time, value: Number(ema.toFixed(4)) });
    
    for (let i = signalPeriod; i < macdLine.length; i++) {
      ema = (macdLine[i].value - ema) * signalMult + ema;
      signal.push({ time: macdLine[i].time, value: Number(ema.toFixed(4)) });
    }
  }
  
  const signalMap = new Map(signal.map(s => [s.time, s.value]));
  const histogram = macdLine
    .filter(m => signalMap.has(m.time))
    .map(m => {
      const val = Number((m.value - (signalMap.get(m.time) || 0)).toFixed(4));
      return { time: m.time, value: val, color: val >= 0 ? '#22c55e' : '#ef4444' };
    });
  
  return { macd: macdLine, signal, histogram };
}

export function calculateBollingerBands(data: Candle[], period: number = 20, stdDev: number = 2): {
  upper: { time: string; value: number }[];
  middle: { time: string; value: number }[];
  lower: { time: string; value: number }[];
} {
  const upper: { time: string; value: number }[] = [];
  const middle: { time: string; value: number }[] = [];
  const lower: { time: string; value: number }[] = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, c) => s + c.close, 0) / period;
    const variance = slice.reduce((s, c) => s + Math.pow(c.close - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    
    middle.push({ time: data[i].time, value: Number(mean.toFixed(2)) });
    upper.push({ time: data[i].time, value: Number((mean + stdDev * sd).toFixed(2)) });
    lower.push({ time: data[i].time, value: Number((mean - stdDev * sd).toFixed(2)) });
  }
  
  return { upper, middle, lower };
}

// Preset stock configs for quick access
export const STOCK_PRESETS: Record<string, { price: number; volatility: number; trend: number }> = {
  'AAPL': { price: 228.5, volatility: 0.018, trend: 0.0004 },
  'MSFT': { price: 427.3, volatility: 0.016, trend: 0.0005 },
  'NVDA': { price: 117.8, volatility: 0.035, trend: 0.001 },
  'GOOGL': { price: 176.4, volatility: 0.02, trend: 0.0003 },
  'AMZN': { price: 208.3, volatility: 0.022, trend: 0.0004 },
  'TSLA': { price: 244.6, volatility: 0.04, trend: 0.0002 },
  'META': { price: 612.7, volatility: 0.025, trend: 0.0006 },
  'JPM': { price: 215.3, volatility: 0.015, trend: 0.0003 },
  'V': { price: 285.6, volatility: 0.013, trend: 0.0003 },
  'JNJ': { price: 157.8, volatility: 0.012, trend: 0.0001 },
  'XOM': { price: 109.2, volatility: 0.018, trend: -0.0001 },
  'LLY': { price: 862.3, volatility: 0.025, trend: 0.001 },
  'NFLX': { price: 862.4, volatility: 0.028, trend: 0.0007 },
  'BRK.B': { price: 412.7, volatility: 0.01, trend: 0.0003 },
};
