# 📈 MarketFlow

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/tests-325_passing-22c55e)](https://github.com/kai-claw/marketflow)
[![License](https://img.shields.io/badge/license-MIT-f59e0b)](./LICENSE)
[![Bundle](https://img.shields.io/badge/bundle-484KB_(153KB_gzip)-3b82f6)](https://kai-claw.github.io/marketflow/)

**Interactive Stock Market Visualizer & Portfolio Simulator**

A fully client-side stock market visualization platform featuring a Finviz-style sector treemap heatmap with sparkline overlays, professional candlestick charts with 6 technical indicators, stock comparison mode, and a $100K paper trading simulator — all powered by seeded random data with no API keys required.

🔗 **Live Demo:** [kai-claw.github.io/marketflow](https://kai-claw.github.io/marketflow/)

---

## ✨ Features

### Core Visualization

| Feature | Description |
|---------|-------------|
| **Sector Treemap Heatmap** | Finviz-style D3 treemap of 67 S&P 500 stocks across 11 sectors, sized by market cap, colored by daily change (-3% to +3%) |
| **Sparkline Overlays** | Mini 30-point price history charts rendered inside treemap cells (toggle with `S`) |
| **Candlestick Charts** | Professional OHLCV charts powered by Lightweight Charts v5 with crosshair, time axis, volume bars |
| **Stock Comparison** | Overlay up to 8 stocks as normalized % change lines on the same chart (key `C`) |
| **Portfolio Donut** | Interactive D3 donut chart showing position allocation with sector-matched colors |
| **Market Ticker** | Bloomberg-style continuous horizontal scroll showing biggest daily movers |

### Technical Indicators

| Indicator | Description |
|-----------|-------------|
| SMA 20/50 | Simple Moving Averages (20 & 50 period) |
| EMA 12/26 | Exponential Moving Averages (12 & 26 period) |
| Bollinger Bands | 20-period with 2σ upper/lower bands (rolling computation) |
| RSI (14) | Relative Strength Index with 30/70 overbought/oversold zones |
| MACD | 12/26/9 with signal line & color-coded histogram |
| Volume | Color-coded volume bars (green up, red down) |

### Interactive Features

| Feature | Description |
|---------|-------------|
| **Portfolio Simulator** | $100K paper trading — buy/sell 67+ stocks, P&L tracking, trade history, position weights |
| **Cinematic Autoplay** | Auto-cycles through 10 curated stocks every 10s with floating progress badge (`A`) |
| **Market Mood** | Real-time bull/bear/mixed indicator with advancer/decliner counts, top gainer/loser |
| **Volume Pulse** | Treemap cells breathe based on trading volume — higher volume = faster pulse |
| **Click Navigation** | Click any stock in heatmap, ticker, donut, or holdings to jump to its chart |

### Performance & Polish

| Feature | Description |
|---------|-------------|
| **Adaptive Performance Monitor** | FPS tracking with auto-degradation at <30fps (disables sparklines), auto-recovery at >45fps |
| **Candle Data LRU Cache** | LRU(32) cache eliminates PRNG re-generation on timeframe switches |
| **Rolling Bollinger** | O(n) rolling sum instead of O(n×period) windowed computation |
| **Single-pass Aggregation** | O(n) top gainer/loser instead of O(n log n) dual sorts |
| **Debounced Resize** | All ResizeObserver callbacks debounced at 100ms |
| **Visibility API** | Ticker animation pauses in background tabs |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Switch to Market Map view |
| `2` | Switch to Charts view |
| `3` | Switch to Portfolio view |
| `S` | Toggle sparklines in heatmap cells |
| `A` | Toggle cinematic autoplay (Charts) |
| `C` | Toggle stock comparison mode (Charts) |
| `H` | Toggle keyboard shortcuts help |
| `Esc` | Close dialogs |

---

## 🏗️ Architecture

```
src/
├── App.tsx                  (125 LOC)  View router + keyboard shortcuts + help overlay
├── store.ts                 (109 LOC)  Zustand store — thin state + actions, no business logic
├── types.ts                 (114 LOC)  Shared type definitions
├── constants.ts             (129 LOC)  Centralized config — no magic numbers in components
├── utils.ts                 (41 LOC)   Seeded PRNG, changeToColor, normalizeToPercent
├── chartHelpers.ts          (94 LOC)   Lightweight Charts configuration helpers
├── index.css                (656 LOC)  CSS variables, animations, micro-interactions
├── data/
│   ├── index.ts             (41 LOC)   Barrel export for all data modules
│   ├── marketData.ts        (127 LOC)  67 S&P 500 stocks, 11 sectors, seeded random generation
│   ├── candlestickData.ts   (77 LOC)   OHLCV candle generation with PRNG + weekend skipping
│   ├── candleHelpers.ts     (66 LOC)   LRU candle cache + timeframe slicing
│   ├── indicators.ts        (144 LOC)  SMA, EMA, RSI, MACD, Bollinger (rolling)
│   ├── portfolioData.ts     (129 LOC)  Immutable portfolio CRUD, trade execution, P&L
│   ├── marketMood.ts        (33 LOC)   Market breadth → mood classification
│   └── sparklines.ts        (107 LOC)  Seeded sparkline generation + SVG path builders
├── components/
│   ├── Header.tsx           (101 LOC)  Logo, nav tabs, market mood, date, version badge
│   ├── MarketTicker.tsx     (95 LOC)   Bloomberg-style scrolling ticker tape
│   ├── Heatmap.tsx          (472 LOC)  D3 treemap + sparkline overlays + volume pulse
│   ├── ChartView.tsx        (281 LOC)  Symbol selector, indicators, OHLC, cinematic autoplay
│   ├── CandlestickChart.tsx (182 LOC)  Lightweight Charts candlestick + indicator overlays
│   ├── ComparisonChart.tsx  (208 LOC)  Multi-stock normalized comparison chart
│   ├── RSIChart.tsx         (101 LOC)  RSI sub-chart with 30/70 zones
│   ├── MACDChart.tsx        (101 LOC)  MACD sub-chart with histogram
│   ├── PortfolioView.tsx    (384 LOC)  Summary cards, trade panel, holdings, history
│   ├── AllocationDonut.tsx  (263 LOC)  D3 donut chart with tooltips + sector legend
│   ├── ErrorBoundary.tsx    (65 LOC)   React error boundary with crash recovery
│   └── PerformanceMonitor.tsx (100 LOC) Adaptive FPS monitor with auto-degradation
```

All data is generated client-side with seeded randomness for reproducible daily results. No external APIs required.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | React 19 | Component architecture |
| Language | TypeScript 5.9 (strict) | Type safety |
| Build | Vite 7 | Fast dev + optimized production builds |
| Styling | Tailwind CSS 4 | Dark terminal theme |
| Charting | Lightweight Charts 5 | Candlestick/line/histogram charts |
| Visualization | D3.js 7 | Treemap heatmap + donut chart |
| State | Zustand 5 | Minimal reactive state management |
| Icons | Lucide React | Consistent icon set |
| Testing | Vitest 4 | 325 unit + integration tests |

---

## 📊 Market Concepts

| Concept | Implementation |
|---------|---------------|
| **Treemap Layout** | D3 squarified treemap — market cap determines cell area, daily % change determines color |
| **OHLCV Candles** | Seeded geometric Brownian motion with preset volatility/trend per stock, weekend skipping |
| **Simple Moving Average** | Rolling sum O(n) — subtract oldest, add newest each window step |
| **Exponential Moving Average** | Recursive EMA = α × price + (1-α) × prevEMA, where α = 2/(period+1) |
| **Bollinger Bands** | 20-period SMA ± 2σ rolling standard deviation |
| **RSI** | Wilder's smoothed RS = avg gain / avg loss over 14 periods, clamped 0-100 |
| **MACD** | EMA(12) - EMA(26) with 9-period signal line, histogram = MACD - signal |
| **Market Breadth** | advancers / total stocks → mood classification (Bullish/Bearish/Mixed/Rally/Selloff) |
| **P&L Calculation** | (currentPrice - avgCost) × shares, with immutable position tracking |

---

## 📦 Bundle Stats

| Asset | Size | Gzip |
|-------|------|------|
| JavaScript | 484 KB | 153 KB |
| CSS | 48 KB | 9 KB |
| **Total** | **532 KB** | **162 KB** |

---

## 🚀 Getting Started

```bash
git clone https://github.com/kai-claw/marketflow.git
cd marketflow
npm install
npm run dev       # Start dev server at localhost:5173
npm run build     # Production build
npm run test      # Run 325 tests
npm run preview   # Preview production build
npm run deploy    # Deploy to GitHub Pages
```

---

## 📄 License

[MIT](./LICENSE)

---

Built with ⚡ by [Kai](https://github.com/kai-claw)
