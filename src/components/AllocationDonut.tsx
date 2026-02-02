// Interactive donut chart showing portfolio allocation by position
// D3-powered with animated arcs, sector coloring, and hover interactivity

import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useStore } from '../store';
import { SECTOR_COLORS } from '../constants';
import { getPortfolioValue, getPositionPnL } from '../data/portfolioData';

interface DonutSlice {
  symbol: string;
  sector: string;
  value: number;
  pnlPercent: number;
  weight: number;
}

export default function AllocationDonut() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { portfolio, stocks, setSelectedSymbol, setView } = useStore();
  const [hoveredSlice, setHoveredSlice] = useState<DonutSlice | null>(null);

  const totalValue = getPortfolioValue(portfolio);
  const positionsValue = totalValue - portfolio.cash;

  const slices = useMemo(() => {
    const result: DonutSlice[] = [];
    for (const pos of portfolio.positions) {
      const stock = stocks.find(s => s.symbol === pos.symbol);
      const currentPrice = stock?.price || pos.currentPrice;
      const marketValue = pos.shares * currentPrice;
      const pnl = getPositionPnL({ ...pos, currentPrice });
      const sector = stock?.sector || 'Unknown';

      result.push({
        symbol: pos.symbol,
        sector,
        value: marketValue,
        pnlPercent: pnl.percent,
        weight: positionsValue > 0 ? (marketValue / positionsValue) * 100 : 0,
      });
    }
    return result.sort((a, b) => b.value - a.value);
  }, [portfolio.positions, stocks, positionsValue]);

  const handleClick = useCallback((symbol: string) => {
    setSelectedSymbol(symbol);
    setView('chart');
  }, [setSelectedSymbol, setView]);

  const renderDonut = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const size = Math.min(container.clientWidth, container.clientHeight);
    if (size < 50) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = container.clientWidth;
    const height = container.clientHeight;
    svg.attr('width', width).attr('height', height);

    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = size * 0.42;
    const innerRadius = outerRadius * 0.62;

    const g = svg.append('g')
      .attr('transform', `translate(${cx}, ${cy})`);

    // Cash slice if positions don't fill everything
    const allSlices: (DonutSlice | { symbol: 'CASH'; sector: 'Cash'; value: number; pnlPercent: 0; weight: number })[] = [...slices];
    if (portfolio.cash > 0 && totalValue > 0) {
      allSlices.push({
        symbol: 'CASH' as const,
        sector: 'Cash' as const,
        value: portfolio.cash,
        pnlPercent: 0 as const,
        weight: (portfolio.cash / totalValue) * 100,
      });
    }

    if (allSlices.length === 0) return;

    const pie = d3.pie<(typeof allSlices)[number]>()
      .value(d => d.value)
      .sort(null)
      .padAngle(0.02);

    const arcGen = d3.arc<d3.PieArcDatum<(typeof allSlices)[number]>>()
      .innerRadius(innerRadius)
      .outerRadius(outerRadius)
      .cornerRadius(3);

    const hoverArcGen = d3.arc<d3.PieArcDatum<(typeof allSlices)[number]>>()
      .innerRadius(innerRadius - 2)
      .outerRadius(outerRadius + 6)
      .cornerRadius(4);

    const arcs = pie(allSlices);

    // Draw arcs with sector colors
    const paths = g.selectAll('.donut-arc')
      .data(arcs)
      .enter()
      .append('path')
      .attr('class', 'donut-arc')
      .attr('d', arcGen)
      .attr('fill', d => {
        if (d.data.symbol === 'CASH') return '#334155';
        return SECTOR_COLORS[d.data.sector] || '#6366f1';
      })
      .attr('stroke', 'var(--bg-primary)')
      .attr('stroke-width', 1.5)
      .style('cursor', d => d.data.symbol === 'CASH' ? 'default' : 'pointer')
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))')
      .style('transition', 'filter 0.2s ease');

    // Interaction
    paths.on('mouseenter', function (_, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('d', hoverArcGen as unknown as string)
        .style('filter', 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))');

      if (d.data.symbol !== 'CASH') {
        setHoveredSlice(d.data as DonutSlice);
      }
    })
    .on('mouseleave', function () {
      d3.select(this)
        .transition()
        .duration(200)
        .attr('d', arcGen as unknown as string)
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))');
      setHoveredSlice(null);
    })
    .on('click', (_, d) => {
      if (d.data.symbol !== 'CASH') handleClick(d.data.symbol);
    });

    // Labels on larger arcs
    g.selectAll('.donut-label')
      .data(arcs.filter(d => {
        const angle = d.endAngle - d.startAngle;
        return angle > 0.3; // Only label segments > ~17°
      }))
      .enter()
      .append('text')
      .attr('class', 'donut-label')
      .attr('transform', d => {
        const midAngle = (d.startAngle + d.endAngle) / 2;
        const labelRadius = (innerRadius + outerRadius) / 2;
        const x = Math.sin(midAngle) * labelRadius;
        const y = -Math.cos(midAngle) * labelRadius;
        return `translate(${x}, ${y})`;
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('fill', 'white')
      .attr('font-size', size > 200 ? '11px' : '9px')
      .attr('font-weight', '600')
      .attr('pointer-events', 'none')
      .text(d => d.data.symbol);

    // Center text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('y', -8)
      .attr('fill', 'white')
      .attr('font-size', size > 200 ? '14px' : '11px')
      .attr('font-weight', '700')
      .attr('font-family', 'ui-monospace, monospace')
      .text(`$${(positionsValue / 1000).toFixed(1)}K`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('y', 10)
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .text('Invested');
  }, [slices, portfolio.cash, totalValue, positionsValue, handleClick]);

  useEffect(() => {
    renderDonut();
    const container = containerRef.current;
    if (!container) return;
    let resizeTimer: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(renderDonut, 100);
    });
    ro.observe(container);
    return () => { clearTimeout(resizeTimer); ro.disconnect(); };
  }, [renderDonut]);

  if (portfolio.positions.length === 0) return null;

  return (
    <div className="donut-container bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)] p-3 sm:p-4 flex flex-col" aria-label="Portfolio allocation chart">
      <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" opacity="0.3" />
          <path d="M8 2a6 6 0 0 1 4.24 10.24" stroke="var(--purple)" strokeWidth="2" strokeLinecap="round" />
          <path d="M12.24 12.24A6 6 0 0 1 2.34 5" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Allocation
      </h2>

      <div ref={containerRef} className="flex-1 min-h-[140px] relative">
        <svg ref={svgRef} className="w-full h-full" role="img" aria-label="Portfolio allocation donut chart" />

        {/* Hover tooltip */}
        {hoveredSlice && (
          <div className="donut-tooltip absolute top-2 right-2 bg-[var(--bg-card)]/95 backdrop-blur-sm border border-[var(--border)] rounded-lg px-3 py-2 shadow-xl pointer-events-none z-10">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ background: SECTOR_COLORS[hoveredSlice.sector] || '#6366f1' }}
              />
              <span className="font-bold text-sm">{hoveredSlice.symbol}</span>
              <span className="text-[10px] text-[var(--text-secondary)]">{hoveredSlice.sector}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className="font-mono">${hoveredSlice.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              <span className="text-[var(--text-secondary)]">{hoveredSlice.weight.toFixed(1)}%</span>
              <span className={hoveredSlice.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                {hoveredSlice.pnlPercent >= 0 ? '+' : ''}{hoveredSlice.pnlPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sector breakdown legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
        {slices.slice(0, 6).map(s => (
          <div key={s.symbol} className="flex items-center gap-1.5 text-[10px]">
            <div
              className="w-2 h-2 rounded-sm"
              style={{ background: SECTOR_COLORS[s.sector] || '#6366f1' }}
            />
            <span className="text-[var(--text-secondary)]">{s.symbol}</span>
            <span className="font-mono text-white">{s.weight.toFixed(0)}%</span>
          </div>
        ))}
        {portfolio.cash > 0 && totalValue > 0 && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2 h-2 rounded-sm bg-slate-600" />
            <span className="text-[var(--text-secondary)]">Cash</span>
            <span className="font-mono text-white">{((portfolio.cash / totalValue) * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
