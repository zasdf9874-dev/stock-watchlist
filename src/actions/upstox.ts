'use server';

import zlib from 'zlib';
import { promisify } from 'util';

const gunzip = promisify(zlib.gunzip);

// Upstox provides a public JSON file mapping all symbols to their unique instrument keys
const UPSTOX_INSTRUMENT_URL = 'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz';

// Cache the instrument mapping in memory so we don't download it every time
let instrumentCache: Record<string, string> | null = null;

async function getInstrumentKey(symbol: string): Promise<string> {
  if (!instrumentCache) {
    try {
      const response = await fetch(UPSTOX_INSTRUMENT_URL);
      
      // Explicitly decompress the .gz file using Node's zlib
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const decompressed = await gunzip(buffer);
      
      // Parse the unzipped JSON
      const data = JSON.parse(decompressed.toString('utf-8'));
      instrumentCache = {};
      
      // Map trading symbols (e.g., RELIANCE) to their unique instrument_key
      for (const item of data) {
        if (item.trading_symbol && item.instrument_key) {
          instrumentCache[item.trading_symbol] = item.instrument_key;
        }
      }
    } catch (error) {
      console.error("Failed to load or unzip Upstox instrument keys:", error);
      throw new Error("Could not fetch instrument dictionary");
    }
  }

  const key = instrumentCache[symbol.toUpperCase()];
  if (!key) throw new Error(`Instrument key not found for symbol: ${symbol}`);
  
  return key;
}

export async function getHistoricalData(symbol: string) {
  try {
    const accessToken = process.env.UPSTOX_ACCESS_TOKEN;
    if (!accessToken) throw new Error("Missing UPSTOX_ACCESS_TOKEN");

    // 1. Get the exact instrument key for the symbol
    const instrumentKey = await getInstrumentKey(symbol);

    // 2. Calculate Date Range (Last 100 Days for accurate EMA/MACD calculations)
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - 100);

    const toDate = today.toISOString().split('T')[0];
    const fromDate = pastDate.toISOString().split('T')[0];

    // 3. Fetch Historical Daily Candles from Upstox
    const url = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(instrumentKey)}/day/${toDate}/${fromDate}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      next: { revalidate: 3600 } // Cache this fetch for 1 hour to prevent API limits
    });

    const data = await response.json();

    if (data.status !== "success" || !data.data || !data.data.candles) {
       throw new Error(data.errors?.[0]?.message || "Failed to fetch historical data");
    }

    // Upstox returns candles as arrays: [timestamp, open, high, low, close, volume, oi]
    // We reverse it so the oldest data is first (required for technical indicator math)
    const candles = data.data.candles.reverse().map((candle: any[]) => ({
      date: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    }));

    return {
      success: true,
      currentPrice: candles[candles.length - 1].close,
      candles: candles
    };

  } catch (error: any) {
    console.error(`Upstox Data Error for ${symbol}:`, error.message);
    return { success: false, error: error.message };
  }
}

// --- NEW SCREENER DATA FETCHER ---

// Helper function to fetch candles for a specific interval
async function fetchCandles(instrumentKey: string, interval: string, daysBack: number, accessToken: string) {
  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - daysBack);

  const toDate = today.toISOString().split('T')[0];
  const fromDate = pastDate.toISOString().split('T')[0];

  const url = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(instrumentKey)}/${interval}/${toDate}/${fromDate}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    next: { revalidate: 3600 } 
  });

  const data = await response.json();
  if (data.status !== "success" || !data.data || !data.data.candles) {
     throw new Error(`Failed to fetch ${interval} data`);
  }

  // Reverse so oldest data is first for indicator math
  return data.data.candles.reverse().map((candle: any[]) => ({
    date: candle[0], 
    open: candle[1], 
    high: candle[2], 
    low: candle[3], 
    close: candle[4], 
    volume: candle[5],
  }));
}

// Main function to fetch all 3 timeframes at once
export async function getScreenerData(symbol: string) {
  try {
    const accessToken = process.env.UPSTOX_ACCESS_TOKEN;
    if (!accessToken) throw new Error("Missing UPSTOX_ACCESS_TOKEN");

    const instrumentKey = await getInstrumentKey(symbol);

    // Fetch Daily (150 days), Weekly (700 days ~ 2 years), Monthly (2000 days ~ 5.5 years) simultaneously
    // This ensures we have enough historical data to calculate 21 EMA & 26 MACD on the larger timeframes
    const [daily, weekly, monthly] = await Promise.all([
      fetchCandles(instrumentKey, 'day', 150, accessToken),
      fetchCandles(instrumentKey, 'week', 700, accessToken),
      fetchCandles(instrumentKey, 'month', 2000, accessToken)
    ]);

    return {
      success: true,
      symbol,
      timeframes: {
        daily,
        weekly,
        monthly
      }
    };
  } catch (error: any) {
    console.error(`Screener Data Error for ${symbol}:`, error.message);
    return { success: false, error: error.message };
  }
}