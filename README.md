# 📈 MarketFlow

**Stock Market Visualizer & Portfolio Simulator**

A fully client-side stock market visualization platform featuring sector treemap heatmaps, interactive candlestick charts with technical indicators, and a portfolio trading simulator.

🔗 **Live Demo:** [kai-claw.github.io/marketflow](https://kai-claw.github.io/marketflow)

---

## Features

### 🗺️ Market Map (Sector Treemap)
- **Finviz-style heatmap** of 65+ S&P 500 stocks across 11 sectors
- Stocks sized by market cap, colored by daily performance (-3%+ to +3%+)
- Sector labels with average sector performance
- Hover tooltips with price, change%, market cap, volume
- Click any stock to jump to its chart

### 📊 Candlestick Charts
- Professional candlestick charts powered by [Lightweight Charts v5](https://tradingview.github.io/lightweight-charts/)
- **OHLC bar** with open/high/low/close/volume
- **Timeframes:** 1M, 3M, 6M, 1Y
- **14 stock presets** with realistic price profiles (AAPL, NVDA, TSLA, etc.)

### 📐 Technical Indicators
| Indicator | Description |
|-----------|-------------|
| SMA 20/50 | Simple Moving Averages |
| EMA 12/26 | Exponential Moving Averages |
| Bollinger Bands | 20-period with 2σ bands |
| RSI (14) | Relative Strength Index with 30/70 zones |
| MACD | 12/26/9 with signal line & histogram |
| Volume | Color-coded volume bars |

### 💼 Portfolio Simulator
- Start with **$100,000** virtual cash
- Buy/sell any of 65+ stocks at current prices
- Real-time **P&L tracking** (absolute + percentage)
- Position weights, average cost basis, day change
- Full **trade history** log
- Click any holding to jump to its chart

---

## Tech Stack

- **React 19** + **TypeScript**
- **Tailwind CSS v4** (dark terminal theme)
- **D3.js** — treemap heatmap
- **Lightweight Charts v5** — candlestick/line/histogram charts
- **Zustand** — state management
- **Lucide React** — icons
- **Vite 7** — build tooling

---

## Development

```bash
npm install
npm run dev     # Start dev server
npm run build   # Production build
npm run preview # Preview production build
```

---

## Architecture

```
src/
├── components/
│   ├── Header.tsx           # Navigation bar
│   ├── Heatmap.tsx          # D3 treemap sector heatmap
│   ├── ChartView.tsx        # Chart page with controls
│   ├── CandlestickChart.tsx # Lightweight Charts candlestick
│   ├── RSIChart.tsx         # RSI sub-chart
│   ├── MACDChart.tsx        # MACD sub-chart
│   └── PortfolioView.tsx    # Portfolio simulator
├── data/
│   ├── marketData.ts        # 65+ S&P 500 stocks, sectors
│   ├── candlestickData.ts   # OHLCV generator + indicators
│   └── portfolioData.ts     # Portfolio/trade logic
├── store.ts                 # Zustand global state
├── App.tsx                  # View router
└── index.css                # CSS variables + Tailwind
```

All data is generated client-side with seeded randomness for reproducible daily results. No external APIs required.

---

Built with ⚡ by [Kai](https://github.com/kai-claw)
