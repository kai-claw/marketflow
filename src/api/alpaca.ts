// Alpaca Market Data API client
// Uses paper trading credentials for free market data access
// Falls back gracefully if API is unavailable (CORS, rate limit, offline)

const BASE_URL = 'https://data.alpaca.markets';
const API_KEY = import.meta.env.VITE_ALPACA_KEY_ID || '';
const API_SECRET = import.meta.env.VITE_ALPACA_SECRET_KEY || '';

// ── Types ──

export interface AlpacaSnapshot {
  latestTrade: { p: number; s: number; t: string };
  latestQuote: { ap: number; as: number; bp: number; bs: number; t: string };
  minuteBar: { o: number; h: number; l: number; c: number; v: number; t: string };
  dailyBar: { o: number; h: number; l: number; c: number; v: number; t: string };
  prevDailyBar: { o: number; h: number; l: number; c: number; v: number; t: string };
}

export interface AlpacaBar {
  t: string; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
  n: number; // number of trades
  vw: number; // volume-weighted avg price
}

export interface AlpacaSnapshotsResponse {
  [symbol: string]: AlpacaSnapshot;
}

export interface AlpacaBarsResponse {
  bars: AlpacaBar[];
  symbol: string;
  next_page_token: string | null;
}

// ── Helpers ──

function headers(): HeadersInit {
  return {
    'APCA-API-KEY-ID': API_KEY,
    'APCA-API-SECRET-KEY': API_SECRET,
  };
}

/**
 * Check if the US stock market is currently open.
 * Simple heuristic: Mon–Fri, 9:30 AM – 4:00 PM ET.
 * Does not account for holidays.
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  // Convert to ET (UTC-5 standard, UTC-4 DST)
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = et.getDay();
  const hours = et.getHours();
  const minutes = et.getMinutes();
  const timeMinutes = hours * 60 + minutes;

  // Weekdays only
  if (day === 0 || day === 6) return false;
  // 9:30 AM = 570 min, 4:00 PM = 960 min
  return timeMinutes >= 570 && timeMinutes < 960;
}

/**
 * Format a date for the Alpaca API (RFC 3339).
 */
function formatDate(d: Date): string {
  return d.toISOString().split('.')[0] + 'Z';
}

// ── API Methods ──

/**
 * Fetch snapshots for multiple symbols.
 * Returns a map of symbol → snapshot data.
 */
export async function fetchSnapshots(symbols: string[]): Promise<AlpacaSnapshotsResponse | null> {
  if (!API_KEY || !API_SECRET) {
    console.warn('[Alpaca] Missing API credentials, using mock data');
    return null;
  }

  // Alpaca doesn't support dots in symbols via query params — filter them
  const cleanSymbols = symbols.filter(s => !s.includes('.'));

  try {
    const url = `${BASE_URL}/v2/stocks/snapshots?symbols=${cleanSymbols.join(',')}&feed=iex`;
    const res = await fetch(url, { headers: headers() });

    if (!res.ok) {
      console.warn(`[Alpaca] Snapshots failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const data: AlpacaSnapshotsResponse = await res.json();
    return data;
  } catch (err) {
    console.warn('[Alpaca] Snapshots fetch error:', err);
    return null;
  }
}

/**
 * Fetch historical bars for a single symbol.
 * @param symbol Stock ticker
 * @param timeframe Number of calendar days to fetch
 * @param barTimeframe Alpaca bar size (e.g. '1Day')
 */
export async function fetchBars(
  symbol: string,
  days: number,
  barTimeframe: string = '1Day',
): Promise<AlpacaBar[] | null> {
  if (!API_KEY || !API_SECRET) {
    console.warn('[Alpaca] Missing API credentials, using mock data');
    return null;
  }

  // Skip symbols with dots (BRK.B etc.)
  if (symbol.includes('.')) return null;

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const params = new URLSearchParams({
      timeframe: barTimeframe,
      start: formatDate(start),
      end: formatDate(end),
      limit: '1000',
      feed: 'iex',
      adjustment: 'split',
    });

    const allBars: AlpacaBar[] = [];
    let pageToken: string | null = null;

    // Paginate to get all bars
    do {
      const urlParams = new URLSearchParams(params);
      if (pageToken) urlParams.set('page_token', pageToken);

      const url = `${BASE_URL}/v2/stocks/${encodeURIComponent(symbol)}/bars?${urlParams}`;
      const res = await fetch(url, { headers: headers() });

      if (!res.ok) {
        console.warn(`[Alpaca] Bars failed for ${symbol}: ${res.status} ${res.statusText}`);
        return null;
      }

      const data: AlpacaBarsResponse = await res.json();
      if (data.bars) {
        allBars.push(...data.bars);
      }
      pageToken = data.next_page_token;
    } while (pageToken);

    return allBars.length > 0 ? allBars : null;
  } catch (err) {
    console.warn(`[Alpaca] Bars fetch error for ${symbol}:`, err);
    return null;
  }
}
