import { useEffect, useRef, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { useStore } from '../store';
import { SECTOR_COLORS, type Stock } from '../data/marketData';
import { RefreshCw, Info } from 'lucide-react';

function changeToColor(change: number): string {
  if (change > 3) return '#15803d';
  if (change > 2) return '#16a34a';
  if (change > 1) return '#22c55e';
  if (change > 0.5) return '#4ade80';
  if (change > 0) return '#86efac';
  if (change > -0.5) return '#fca5a5';
  if (change > -1) return '#f87171';
  if (change > -2) return '#ef4444';
  if (change > -3) return '#dc2626';
  return '#b91c1c';
}

interface TooltipData {
  stock: Stock;
  x: number;
  y: number;
}

interface TreemapLeafData {
  name: string;
  value?: number;
  stock?: Stock;
  children?: TreemapLeafData[];
}

type TreemapNode = d3.HierarchyRectangularNode<TreemapLeafData>;

export default function Heatmap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { sectors, refreshMarket, setView, setSelectedSymbol } = useStore();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const handleStockClick = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    setView('chart');
  }, [setSelectedSymbol, setView]);

  const renderTreemap = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Build hierarchy
    const hierarchyData: TreemapLeafData = {
      name: 'market',
      children: sectors.map(sector => ({
        name: sector.name,
        children: sector.stocks.map(stock => ({
          name: stock.symbol,
          value: stock.marketCap,
          stock,
        })),
      })),
    };

    const root = d3.hierarchy<TreemapLeafData>(hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap<TreemapLeafData>()
      .size([width, height])
      .paddingOuter(3)
      .paddingInner(1)
      .paddingTop(22)
      .round(true)(root);

    // After treemap layout, nodes have x0/y0/x1/y1
    const sectorNodes = (root.children || []) as TreemapNode[];
    const leafNodes = root.leaves() as TreemapNode[];

    // Sector labels
    const sectorGroups = svg.selectAll('.sector')
      .data(sectorNodes)
      .enter()
      .append('g')
      .attr('class', 'sector');

    sectorGroups.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', 'none')
      .attr('stroke', '#1e2a3a')
      .attr('stroke-width', 1);

    sectorGroups.append('text')
      .attr('x', d => d.x0 + 6)
      .attr('y', d => d.y0 + 15)
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .text(d => {
        const w = d.x1 - d.x0;
        if (w < 60) return '';
        return d.data.name;
      });

    // Compute volume range for pulse intensity
    const allVolumes = leafNodes.map(d => d.data.stock?.volume || 0);
    const maxVol = Math.max(...allVolumes, 1);
    const minVol = Math.min(...allVolumes);
    const volRange = maxVol - minVol || 1;

    // Stock cells
    const leaves = svg.selectAll('.cell')
      .data(leafNodes)
      .enter()
      .append('g')
      .attr('class', 'treemap-cell')
      .attr('role', 'button')
      .attr('tabindex', '0')
      .attr('aria-label', d => {
        const s = d.data.stock;
        return s ? `${s.symbol} ${s.name}: ${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}% ($${s.price.toFixed(2)})` : d.data.name;
      });

    leaves.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => changeToColor(d.data.stock?.change || 0))
      .attr('rx', 2)
      .style('cursor', 'pointer')
      .each(function(d) {
        // Add breathing pulse animation keyed to volume
        const vol = d.data.stock?.volume || 0;
        const intensity = (vol - minVol) / volRange; // 0-1
        const duration = 2 + (1 - intensity) * 3; // 2-5s (higher vol = faster pulse)
        const opacMin = 0.85 + (1 - intensity) * 0.15; // 0.85-1.0 range
        const delay = Math.random() * duration; // random phase offset
        d3.select(this)
          .style('animation', `heatmapPulse ${duration}s ease-in-out ${delay}s infinite`)
          .style('--pulse-min', String(opacMin));
      })
      .on('click', (_, d) => {
        if (d.data.stock) handleStockClick(d.data.stock.symbol);
      })
      .on('mouseenter', (event: MouseEvent, d) => {
        if (!d.data.stock) return;
        const rect = container.getBoundingClientRect();
        setTooltip({
          stock: d.data.stock,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      })
      .on('mousemove', (event: MouseEvent, d) => {
        if (!d.data.stock) return;
        const rect = container.getBoundingClientRect();
        setTooltip({
          stock: d.data.stock,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      })
      .on('mouseleave', () => setTooltip(null));

    // Keyboard support on cells
    leaves.on('keydown', (event: KeyboardEvent, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (d.data.stock) handleStockClick(d.data.stock.symbol);
      }
    });

    // Symbol text
    leaves.append('text')
      .attr('x', d => d.x0 + (d.x1 - d.x0) / 2)
      .attr('y', d => d.y0 + (d.y1 - d.y0) / 2 - 4)
      .attr('text-anchor', 'middle')
      .attr('fill', 'white')
      .attr('font-size', d => {
        const w = d.x1 - d.x0;
        if (w < 35) return '0px';
        if (w < 55) return '9px';
        if (w < 80) return '11px';
        return '13px';
      })
      .attr('font-weight', '700')
      .attr('pointer-events', 'none')
      .attr('aria-hidden', 'true')
      .text(d => {
        const w = d.x1 - d.x0;
        return w < 35 ? '' : d.data.name;
      });

    // Change % text
    leaves.append('text')
      .attr('x', d => d.x0 + (d.x1 - d.x0) / 2)
      .attr('y', d => d.y0 + (d.y1 - d.y0) / 2 + 10)
      .attr('text-anchor', 'middle')
      .attr('fill', 'rgba(255,255,255,0.8)')
      .attr('font-size', d => {
        const w = d.x1 - d.x0;
        if (w < 50) return '0px';
        return '10px';
      })
      .attr('font-weight', '500')
      .attr('pointer-events', 'none')
      .attr('aria-hidden', 'true')
      .text(d => {
        const w = d.x1 - d.x0;
        if (w < 50) return '';
        const ch = d.data.stock?.change || 0;
        return `${ch > 0 ? '+' : ''}${ch.toFixed(2)}%`;
      });
  }, [sectors, handleStockClick]);

  // Render + resize
  useEffect(() => {
    renderTreemap();

    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      renderTreemap();
    });
    ro.observe(container);

    return () => ro.disconnect();
  }, [renderTreemap]);

  // Compute tooltip position with viewport clamping
  const getTooltipStyle = () => {
    if (!tooltip || !containerRef.current) return {};
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const tooltipW = 200;
    const tooltipH = 80;

    let left = tooltip.x + 12;
    let top = tooltip.y - 8;

    // Flip horizontal if near right edge
    if (left + tooltipW > cw) left = tooltip.x - tooltipW - 12;
    // Flip vertical if near bottom edge
    if (top + tooltipH > ch) top = tooltip.y - tooltipH - 8;
    // Clamp to top/left
    if (left < 4) left = 4;
    if (top < 4) top = 4;

    return { left, top };
  };

  return (
    <div className="flex flex-col h-full" id="panel-heatmap" role="tabpanel" aria-label="Market Map">
      {/* Sector legend */}
      <div className="flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 border-b border-[var(--border)] bg-[var(--bg-secondary)] overflow-x-auto">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {sectors.slice(0, 8).map(sector => (
            <div key={sector.name} className="flex items-center gap-1.5 shrink-0">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: SECTOR_COLORS[sector.name] }}
                aria-hidden="true"
              />
              <span className="text-[10px] text-[var(--text-secondary)]">{sector.name}</span>
              <span className={`text-[10px] font-medium ${sector.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {sector.avgChange > 0 ? '+' : ''}{sector.avgChange}%
              </span>
            </div>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <button
            onClick={refreshMarket}
            className="p-1.5 rounded-md hover:bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-white transition-colors"
            aria-label="Refresh market data"
          >
            <RefreshCw size={14} />
          </button>
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-[var(--text-secondary)]">
            <Info size={10} aria-hidden="true" />
            <span>Click a stock to view chart</span>
          </div>
        </div>
      </div>

      {/* Treemap */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <svg
          ref={svgRef}
          className="w-full h-full"
          role="img"
          aria-label="Stock market treemap heatmap showing sector allocation and daily performance"
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-50 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-2 shadow-xl"
            role="tooltip"
            style={getTooltipStyle()}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{tooltip.stock.symbol}</span>
              <span className="text-[10px] text-[var(--text-secondary)]">{tooltip.stock.name}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm font-mono">${tooltip.stock.price.toFixed(2)}</span>
              <span className={`text-sm font-semibold ${tooltip.stock.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {tooltip.stock.change > 0 ? '+' : ''}{tooltip.stock.change.toFixed(2)}%
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-secondary)] mt-1">
              MCap: ${tooltip.stock.marketCap}B · Vol: {(tooltip.stock.volume / 1000000).toFixed(1)}M
            </div>
          </div>
        )}
      </div>

      {/* Color scale legend */}
      <div className="flex items-center justify-center gap-0 px-4 py-2 border-t border-[var(--border)] bg-[var(--bg-secondary)]" aria-label="Color scale: red (-3%+) to green (+3%+)">
        <span className="text-[10px] text-[var(--text-secondary)] mr-2">-3%+</span>
        {['#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d'].map((color, i) => (
          <div key={i} className="w-4 sm:w-6 h-3" style={{ background: color }} aria-hidden="true" />
        ))}
        <span className="text-[10px] text-[var(--text-secondary)] ml-2">+3%+</span>
      </div>
    </div>
  );
}
