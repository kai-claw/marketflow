import { useRef, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import type { Stock } from '../data/marketData';

function TickerItem({ stock, onClick }: { stock: Stock; onClick: () => void }) {
  const isUp = stock.change >= 0;
  return (
    <button
      className="ticker-item flex items-center gap-1.5 px-3 py-1 shrink-0 hover:bg-white/5 rounded transition-colors cursor-pointer"
      onClick={onClick}
      aria-label={`${stock.symbol} $${stock.price.toFixed(2)} ${isUp ? 'up' : 'down'} ${Math.abs(stock.change).toFixed(2)}%`}
    >
      <span className="text-[11px] font-bold text-white">{stock.symbol}</span>
      <span className="text-[10px] font-mono text-[var(--text-secondary)]">${stock.price.toFixed(2)}</span>
      <span className={`text-[10px] font-semibold font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '▲' : '▼'} {Math.abs(stock.change).toFixed(2)}%
      </span>
    </button>
  );
}

export default function MarketTicker() {
  const { stocks, setSelectedSymbol, setView } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const pausedRef = useRef(false);

  // Sort by absolute change — biggest movers first, then repeat for seamless loop
  const sortedStocks = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    // Double the list for seamless looping
    return [...sorted, ...sorted];
  }, [stocks]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let offset = 0;
    const speed = 0.5; // pixels per frame

    const animate = () => {
      if (!pausedRef.current) {
        offset += speed;
        // Reset when we've scrolled past the first copy
        const halfWidth = el.scrollWidth / 2;
        if (offset >= halfWidth) offset = 0;
        el.style.transform = `translateX(-${offset}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [sortedStocks]);

  const handleClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setView('chart');
  };

  return (
    <div
      className="ticker-container border-b border-[var(--border)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm overflow-hidden relative"
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      role="marquee"
      aria-label="Market ticker — biggest movers"
    >
      {/* Fade edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--bg-secondary)] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--bg-secondary)] to-transparent z-10 pointer-events-none" />

      <div ref={scrollRef} className="flex items-center whitespace-nowrap py-0.5 will-change-transform">
        {sortedStocks.map((stock, i) => (
          <TickerItem
            key={`${stock.symbol}-${i}`}
            stock={stock}
            onClick={() => handleClick(stock.symbol)}
          />
        ))}
      </div>
    </div>
  );
}
