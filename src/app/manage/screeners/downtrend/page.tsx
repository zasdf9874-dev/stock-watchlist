'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../../../../lib/supabase/client';
import { getScreenerData } from '../../../../actions/upstox';
import { evaluateDowntrend, TimeframeEvaluation } from '../../../../lib/screener-logic';

interface ScreenerResult {
  id: string;
  symbol: string;
  company_name: string;
  price: number;
  daily: TimeframeEvaluation;
  weekly: TimeframeEvaluation;
  monthly: TimeframeEvaluation;
  error?: string;
}

export default function DowntrendScreenerPage() {
  const supabase = createClient();
  const [results, setResults] = useState<ScreenerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Initializing...');

  const runScreener = useCallback(async () => {
    setLoading(true);
    setStatus('Fetching watchlist...');

    // 1. Get watchlisted stocks from Supabase
    const { data: stocks, error: dbError } = await supabase
      .from('stocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError || !stocks || stocks.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const computedResults: ScreenerResult[] = [];

    // 2. Fetch multi-timeframe data and evaluate rules
    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      setStatus(`Evaluating ${stock.symbol} (${i + 1}/${stocks.length})...`);

      const res = await getScreenerData(stock.symbol);

      if (!res.success || !res.timeframes) {
        computedResults.push({
          id: stock.id,
          symbol: stock.symbol,
          company_name: stock.company_name,
          price: 0,
          daily: evaluateDowntrend([]),
          weekly: evaluateDowntrend([]),
          monthly: evaluateDowntrend([]),
          error: res.error || 'Failed to fetch data',
        });
        continue;
      }

      const { daily, weekly, monthly } = res.timeframes;
      const currentPrice = daily.length > 0 ? daily[daily.length - 1].close : 0;

     // SYNTHETIC CANDLE INJECTION: 
      // Force the current Weekly and Monthly closing price to match the latest Daily price
      // so indicators react to today's EOD price instead of waiting for the week/month to close.
      if (weekly.length > 0) weekly[weekly.length - 1].close = currentPrice;
      if (monthly.length > 0) monthly[monthly.length - 1].close = currentPrice;

      const dailyEval = evaluateDowntrend(daily);
      const weeklyEval = evaluateDowntrend(weekly);
      const monthlyEval = evaluateDowntrend(monthly);

      // Only add to screener if it is in a Downtrend on Daily AND Weekly AND Monthly timeframes
      if (dailyEval.isDowntrend && weeklyEval.isDowntrend && monthlyEval.isDowntrend) {
        computedResults.push({
          id: stock.id,
          symbol: stock.symbol,
          company_name: stock.company_name,
          price: currentPrice,
          daily: dailyEval,
          weekly: weeklyEval,
          monthly: monthlyEval,
        });
      }
    }

    setResults(computedResults);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    runScreener();
  }, [runScreener]);

  // Helper component to render the Red/Green badges
  const Badge = ({ value }: { value: 'Bearish' | 'Bullish' }) => {
    const isBearish = value === 'Bearish';
    return (
      <span className={`px-2 py-1 rounded text-[11px] font-bold tracking-wide ${
        isBearish 
          ? 'bg-rose-500/10 text-rose-500' 
          : 'bg-emerald-500/10 text-emerald-500'
      }`}>
        {value}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Downtrend Stocks</h1>
          <p className="text-sm text-slate-400 mt-1">
            Stocks with 3 or more Bearish indicators on the Daily timeframe.
          </p>
        </div>
        <button
          onClick={runScreener}
          disabled={loading}
          className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors"
        >
          {loading ? 'Scanning...' : 'Run Screener'}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm space-y-2">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            <div>{status}</div>
          </div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No stocks are currently in a strong daily downtrend.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs whitespace-nowrap">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
                {/* Top Header Row for Groupings */}
                <tr>
                  <th colSpan={2} className="px-4 py-2 border-r border-slate-800 bg-slate-950 text-left">Stock Details</th>
                  <th colSpan={4} className="px-4 py-2 border-r border-slate-800">Daily</th>
                  <th colSpan={4} className="px-4 py-2 border-r border-slate-800">Weekly</th>
                  <th colSpan={4} className="px-4 py-2">Monthly</th>
                </tr>
                {/* Sub Header Row for Indicators */}
                <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                  <th className="px-4 py-2 text-left sticky left-0 bg-slate-950 z-10 w-48">Stock</th>
                  <th className="px-4 py-2 text-right border-r border-slate-800">Price (₹)</th>
                  
                  {/* Daily */}
                  <th className="px-2 py-2">EMA</th>
                  <th className="px-2 py-2">MACD</th>
                  <th className="px-2 py-2">ST</th>
                  <th className="px-2 py-2 border-r border-slate-800">RSI</th>

                  {/* Weekly */}
                  <th className="px-2 py-2">EMA</th>
                  <th className="px-2 py-2">MACD</th>
                  <th className="px-2 py-2">ST</th>
                  <th className="px-2 py-2 border-r border-slate-800">RSI</th>

                  {/* Monthly */}
                  <th className="px-2 py-2">EMA</th>
                  <th className="px-2 py-2">MACD</th>
                  <th className="px-2 py-2">ST</th>
                  <th className="px-2 py-2">RSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 bg-slate-900">
                {results.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Stock Name */}
                    <td className="px-4 py-3 text-left sticky left-0 bg-slate-900 z-10">
                      <div className="font-semibold text-slate-200 truncate w-48" title={item.company_name || item.symbol}>
                        {item.company_name || item.symbol}
                      </div>
                    </td>
                    
                    {/* Price */}
                    <td className="px-4 py-3 text-right font-mono font-medium border-r border-slate-800">
                      {item.price.toFixed(2)}
                    </td>

                    {/* Daily Indicators */}
                    <td className="px-2 py-3"><Badge value={item.daily.ema} /></td>
                    <td className="px-2 py-3"><Badge value={item.daily.macd} /></td>
                    <td className="px-2 py-3"><Badge value={item.daily.st} /></td>
                    <td className="px-2 py-3 border-r border-slate-800"><Badge value={item.daily.rsi} /></td>

                    {/* Weekly Indicators */}
                    <td className="px-2 py-3"><Badge value={item.weekly.ema} /></td>
                    <td className="px-2 py-3"><Badge value={item.weekly.macd} /></td>
                    <td className="px-2 py-3"><Badge value={item.weekly.st} /></td>
                    <td className="px-2 py-3 border-r border-slate-800"><Badge value={item.weekly.rsi} /></td>

                    {/* Monthly Indicators */}
                    <td className="px-2 py-3"><Badge value={item.monthly.ema} /></td>
                    <td className="px-2 py-3"><Badge value={item.monthly.macd} /></td>
                    <td className="px-2 py-3"><Badge value={item.monthly.st} /></td>
                    <td className="px-2 py-3"><Badge value={item.monthly.rsi} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}