# MarketFlow — White Hat Audit (Pass 1/10)

## Baseline (Pre-Pass)

| Metric | Value |
|--------|-------|
| LOC (source) | ~1,856 |
| Source files | 10 (7 components, 3 data modules) |
| Tests | 0 |
| TS errors | 0 |
| Lint errors | 44 (all `no-explicit-any` from D3/lightweight-charts) |
| Bundle JS | 444KB (140KB gzip) |
| Bundle CSS | 24KB (5KB gzip) |
| TODO/FIXME/HACK | 0 |
| `any` casts | ~39 |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19.2 |
| Language | TypeScript 5.9 (strict mode) |
| Build | Vite 7.3 |
| Styling | Tailwind CSS 4.1 |
| Charting | lightweight-charts 5.1, D3.js 7.9 |
| State | Zustand 5.0 |
| Icons | lucide-react 0.563 |

## Architecture

```
src/
├── App.tsx              (20 LOC)  — View router
├── main.tsx             (10 LOC)  — Entry point
├── store.ts             (92 LOC)  — Zustand store (view, market, chart, portfolio)
├── index.css            (44 LOC)  — CSS variables, scrollbar, treemap styles
├── data/
│   ├── marketData.ts    (161 LOC) — 67 S&P 500 stocks, 11 sectors, seeded random
│   ├── candlestickData.ts (218 LOC) — OHLCV generation, SMA/EMA/RSI/MACD/Bollinger
│   └── portfolioData.ts (108 LOC) — Portfolio CRUD, trade execution, P&L
├── components/
│   ├── Header.tsx       (50 LOC)  — Logo, nav, date
│   ├── Heatmap.tsx      (248 LOC) — D3 treemap, tooltip, legend
│   ├── ChartView.tsx    (149 LOC) — Symbol selector, indicators, OHLC bar
│   ├── CandlestickChart.tsx (185 LOC) — lightweight-charts, overlays
│   ├── RSIChart.tsx     (99 LOC)  — RSI sub-chart
│   ├── MACDChart.tsx    (99 LOC)  — MACD sub-chart
│   └── PortfolioView.tsx (357 LOC) — Summary cards, trade panel, holdings, history
```

## Features

| Category | Features |
|----------|----------|
| Market Map | D3 treemap heatmap, 67 stocks, 11 sectors, color-by-change, hover tooltips, click-to-chart |
| Charts | Candlestick OHLCV, SMA(20), SMA(50), EMA(12), EMA(26), Bollinger Bands, RSI, MACD, volume |
| Portfolio | $100K paper trading, buy/sell, average cost tracking, P&L calculation, trade history, reset |
| Data | 14 stock presets with unique volatility/trend, seeded random for reproducibility |

## Known Issues

1. **44 `any` casts** — D3/lightweight-charts type gaps, all in Heatmap.tsx, CandlestickChart.tsx, RSIChart.tsx, MACDChart.tsx
2. **No error boundary** — Unhandled errors crash the app
3. **No ARIA accessibility** — No roles, labels, keyboard navigation
4. **No keyboard shortcuts** — Everything mouse-only
5. **No mobile responsive** — Desktop-first, no touch handling
6. **No loading state** — *(fixed)* Added loading spinner
7. **No SEO/meta** — *(fixed)* Added full OG/Twitter/JSON-LD
8. **No tests** — *(fixed)* Added 62 unit tests
9. **No CI/CD** — *(fixed)* Added GitHub Actions
10. **No deploy infrastructure** — *(fixed)* Added 404.html, robots.txt, sitemap.xml, LICENSE
11. **Heatmap not responsive** — Uses container size but no ResizeObserver
12. **Chart time sync** — RSI/MACD sub-charts don't sync crosshair with main chart

## Post-Pass 1 State

| Metric | Value |
|--------|-------|
| LOC (source) | ~1,856 |
| Source files | 10 |
| Test files | 3 |
| Tests | 62 |
| TS errors | 0 |
| Bundle JS | 444KB (140KB gzip) |
| Infrastructure | CI/CD, SEO, OG tags, loading spinner, noscript, 404, robots.txt, sitemap, LICENSE |
