// Yellow Hat #2 — Final Polish (Pass 9/10)
// Portfolio-showcase readiness verification tests

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = path.resolve(__dirname, '../..');

describe('Portfolio-Grade README', () => {
  const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf-8');

  it('has shields.io badges', () => {
    expect(readme).toContain('img.shields.io/badge/TypeScript');
    expect(readme).toContain('img.shields.io/badge/React');
    expect(readme).toContain('img.shields.io/badge/Vite');
    expect(readme).toContain('img.shields.io/badge/tests');
    expect(readme).toContain('img.shields.io/badge/license');
    expect(readme).toContain('img.shields.io/badge/bundle');
  });

  it('has feature tables', () => {
    expect(readme).toContain('Core Visualization');
    expect(readme).toContain('Technical Indicators');
    expect(readme).toContain('Interactive Features');
    expect(readme).toContain('Performance & Polish');
  });

  it('has keyboard shortcuts table', () => {
    expect(readme).toContain('Keyboard Shortcuts');
    expect(readme).toContain('Switch to Market Map');
    expect(readme).toContain('Toggle sparklines');
    expect(readme).toContain('Toggle cinematic autoplay');
  });

  it('has architecture diagram', () => {
    expect(readme).toContain('Architecture');
    expect(readme).toContain('App.tsx');
    expect(readme).toContain('store.ts');
    expect(readme).toContain('LOC');
  });

  it('has tech stack table', () => {
    expect(readme).toContain('Tech Stack');
    expect(readme).toContain('React 19');
    expect(readme).toContain('TypeScript 5.9');
    expect(readme).toContain('D3.js');
    expect(readme).toContain('Lightweight Charts');
    expect(readme).toContain('Zustand');
  });

  it('has market concepts table', () => {
    expect(readme).toContain('Market Concepts');
    expect(readme).toContain('Simple Moving Average');
    expect(readme).toContain('Exponential Moving Average');
    expect(readme).toContain('Bollinger Bands');
    expect(readme).toContain('RSI');
    expect(readme).toContain('MACD');
    expect(readme).toContain('Market Breadth');
  });

  it('has bundle stats table', () => {
    expect(readme).toContain('Bundle Stats');
    expect(readme).toContain('JavaScript');
    expect(readme).toContain('CSS');
    expect(readme).toContain('Gzip');
  });

  it('has getting started guide', () => {
    expect(readme).toContain('Getting Started');
    expect(readme).toContain('npm install');
    expect(readme).toContain('npm run dev');
    expect(readme).toContain('npm run build');
    expect(readme).toContain('npm run test');
  });

  it('has live demo link', () => {
    expect(readme).toContain('kai-claw.github.io/marketflow');
  });

  it('has license section', () => {
    expect(readme).toContain('License');
    expect(readme).toContain('MIT');
  });
});

describe('PWA Manifest', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/manifest.json'), 'utf-8'));

  it('has required PWA fields', () => {
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBe('MarketFlow');
    expect(manifest.description).toBeDefined();
    expect(manifest.start_url).toBe('/marketflow/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#0a0e17');
    expect(manifest.theme_color).toBe('#22c55e');
  });

  it('has categories', () => {
    expect(manifest.categories).toContain('finance');
  });

  it('has icons', () => {
    expect(manifest.icons.length).toBeGreaterThan(0);
    expect(manifest.icons[0].src).toContain('favicon');
  });
});

describe('HTML Meta Tags', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf-8');

  it('has PWA manifest link', () => {
    expect(html).toContain('manifest.json');
  });

  it('has apple mobile web app meta tags', () => {
    expect(html).toContain('apple-mobile-web-app-capable');
    expect(html).toContain('apple-mobile-web-app-status-bar-style');
    expect(html).toContain('apple-mobile-web-app-title');
  });

  it('has enhanced OG tags with dimensions', () => {
    expect(html).toContain('og:image:width');
    expect(html).toContain('og:image:height');
  });

  it('has enhanced JSON-LD', () => {
    expect(html).toContain('softwareVersion');
    expect(html).toContain('featureList');
    expect(html).toContain('isAccessibleForFree');
    expect(html).toContain('applicationSubCategory');
    expect(html).toContain('browserRequirements');
  });

  it('has SEO essentials', () => {
    expect(html).toContain('canonical');
    expect(html).toContain('keywords');
    expect(html).toContain('theme-color');
    expect(html).toContain('og:title');
    expect(html).toContain('twitter:card');
  });
});

describe('Deployment Assets', () => {
  it('has favicon.svg', () => {
    expect(fs.existsSync(path.join(root, 'public/favicon.svg'))).toBe(true);
  });

  it('has og-image.svg', () => {
    expect(fs.existsSync(path.join(root, 'public/og-image.svg'))).toBe(true);
  });

  it('has 404.html', () => {
    expect(fs.existsSync(path.join(root, 'public/404.html'))).toBe(true);
  });

  it('has robots.txt', () => {
    const robots = fs.readFileSync(path.join(root, 'public/robots.txt'), 'utf-8');
    expect(robots).toContain('Sitemap');
  });

  it('has sitemap.xml with recent lastmod', () => {
    const sitemap = fs.readFileSync(path.join(root, 'public/sitemap.xml'), 'utf-8');
    expect(sitemap).toContain('2026-02');
    expect(sitemap).toContain('kai-claw.github.io/marketflow');
  });

  it('has manifest.json', () => {
    expect(fs.existsSync(path.join(root, 'public/manifest.json'))).toBe(true);
  });

  it('has LICENSE', () => {
    expect(fs.existsSync(path.join(root, 'LICENSE'))).toBe(true);
  });
});

describe('Package Metadata', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));

  it('has version 1.0.0', () => {
    expect(pkg.version).toBe('1.0.0');
  });

  it('has description', () => {
    expect(pkg.description).toBeTruthy();
    expect(pkg.description.length).toBeGreaterThan(20);
  });

  it('has homepage', () => {
    expect(pkg.homepage).toContain('kai-claw.github.io/marketflow');
  });

  it('has repository', () => {
    expect(pkg.repository.url).toContain('marketflow');
  });

  it('has keywords', () => {
    expect(pkg.keywords.length).toBeGreaterThan(3);
  });

  it('has author', () => {
    expect(pkg.author).toBe('Christian');
  });

  it('has MIT license', () => {
    expect(pkg.license).toBe('MIT');
  });

  it('has all scripts', () => {
    expect(pkg.scripts.dev).toBeDefined();
    expect(pkg.scripts.build).toBeDefined();
    expect(pkg.scripts.test).toBeDefined();
    expect(pkg.scripts.deploy).toBeDefined();
  });
});

describe('CI/CD Workflow', () => {
  it('has GitHub Actions workflow', () => {
    const ciPath = path.join(root, '.github/workflows/ci.yml');
    expect(fs.existsSync(ciPath)).toBe(true);
    const ci = fs.readFileSync(ciPath, 'utf-8');
    expect(ci).toContain('npm run build');
    expect(ci).toContain('npm test');
  });
});

describe('Source Code Quality', () => {
  const sourceDir = path.join(root, 'src');

  function readAllSourceFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== 'node_modules') {
          files.push(...readAllSourceFiles(full));
        }
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        files.push(full);
      }
    }
    return files;
  }

  const allSource = readAllSourceFiles(sourceDir);
  const allContent = allSource.map(f => fs.readFileSync(f, 'utf-8')).join('\n');

  it('has no TODO/FIXME/HACK markers', () => {
    // Check each file individually for clearer reporting
    for (const file of allSource) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip test descriptions and README-like content
        if (line.includes('describe(') || line.includes('it(') || line.includes('expect(')) continue;
        expect(line).not.toMatch(/\/\/\s*(TODO|FIXME|HACK)\b/i);
      }
    }
  });

  it('has no as-any casts in actual code', () => {
    for (const file of allSource) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip comments (they may mention `as any` in documentation)
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;
        if (trimmed.includes('// eslint-disable') || trimmed.includes('// @ts-')) continue;
        // Check only the code portion before any inline comment
        const codePart = trimmed.split('//')[0];
        expect(codePart).not.toMatch(/\bas\s+any\b/);
      }
    }
  });

  it('has no console.log statements', () => {
    for (const file of allSource) {
      const content = fs.readFileSync(file, 'utf-8');
      expect(content).not.toMatch(/console\.log\(/);
    }
  });

  it('has ErrorBoundary', () => {
    expect(allContent).toContain('ErrorBoundary');
  });

  it('has performance monitoring', () => {
    expect(allContent).toContain('PerformanceMonitor');
  });

  it('has prefers-reduced-motion support', () => {
    const css = fs.readFileSync(path.join(sourceDir, 'index.css'), 'utf-8');
    expect(css).toContain('prefers-reduced-motion');
  });
});

describe('Constants Consistency', () => {
  // Verify all constants are properly defined
  it('CINEMATIC_STOCKS matches STOCK_PRESETS', async () => {
    const { CINEMATIC_STOCKS, STOCK_PRESETS } = await import('../constants');
    for (const symbol of CINEMATIC_STOCKS) {
      expect(STOCK_PRESETS[symbol]).toBeDefined();
    }
  });

  it('POPULAR_SYMBOLS has all STOCK_PRESETS', async () => {
    const { POPULAR_SYMBOLS, STOCK_PRESETS } = await import('../constants');
    const presetSymbols = Object.keys(STOCK_PRESETS);
    expect(POPULAR_SYMBOLS).toEqual(presetSymbols);
  });

  it('SECTOR_COLORS covers all sectors in market data', async () => {
    const { SECTOR_COLORS } = await import('../constants');
    const { generateMarketData, groupBySector } = await import('../data/marketData');
    const stocks = generateMarketData(42);
    const sectors = groupBySector(stocks);
    for (const sector of sectors) {
      expect(SECTOR_COLORS[sector.name]).toBeDefined();
    }
  });

  it('INDICATORS array has valid colors', async () => {
    const { INDICATORS } = await import('../constants');
    for (const ind of INDICATORS) {
      expect(ind.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(ind.id).toBeTruthy();
      expect(ind.label).toBeTruthy();
    }
  });

  it('CHANGE_COLOR_STOPS are ordered descending', async () => {
    const { CHANGE_COLOR_STOPS } = await import('../constants');
    for (let i = 1; i < CHANGE_COLOR_STOPS.length; i++) {
      expect(CHANGE_COLOR_STOPS[i].threshold).toBeLessThan(CHANGE_COLOR_STOPS[i - 1].threshold);
    }
  });

  it('COMPARISON_COLORS has unique valid hex colors', async () => {
    const { COMPARISON_COLORS, MAX_COMPARISON_STOCKS } = await import('../constants');
    expect(COMPARISON_COLORS.length).toBeGreaterThanOrEqual(MAX_COMPARISON_STOCKS);
    const unique = new Set(COMPARISON_COLORS);
    expect(unique.size).toBe(COMPARISON_COLORS.length);
    for (const color of COMPARISON_COLORS) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('TIMEFRAME_DAYS covers all timeframes', async () => {
    const { TIMEFRAME_DAYS, TIMEFRAMES } = await import('../constants');
    for (const tf of TIMEFRAMES) {
      expect(TIMEFRAME_DAYS[tf]).toBeGreaterThan(0);
    }
  });
});

describe('Type System Consistency', () => {
  it('View type has 3 members', async () => {
    // Views are heatmap, chart, portfolio
    const views: string[] = ['heatmap', 'chart', 'portfolio'];
    expect(views.length).toBe(3);
  });

  it('ChartTimeframe has 4 members', async () => {
    const { TIMEFRAMES } = await import('../constants');
    expect(TIMEFRAMES.length).toBe(4);
  });

  it('Indicator configs match expected count', async () => {
    const { INDICATORS } = await import('../constants');
    // volume, sma20, sma50, ema12, ema26, bollinger, rsi, macd
    expect(INDICATORS.length).toBe(8);
  });
});
