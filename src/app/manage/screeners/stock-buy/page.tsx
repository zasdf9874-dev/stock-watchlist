'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../../../../lib/supabase/client';
import { getScreenerData } from '../../../../actions/upstox';
import { evaluateUptrend, evaluateLookbackReversal } from '../../../../lib/screener-logic';
import { useStore } from '../../../../store/useStore';

interface ScreenerResult {
  id: string;
  symbol: string;
  company_name: string;
  price: number;
  reversalType: string;
  daily: any;
  weekly: any;
  monthly: any;
}

export default function StockBuyScreenerPage() {
  const supabase = createClient();
  const results = useStore((state) => state.stockBuyResults);
  const setResults = useStore((state) => state.setStockBuyResults);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Initializing...');

  const runScreener = useCallback(async () => {
    setLoading(true);
    setStatus('Fetching watchlist...');

    // 1. Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Fetch user's portfolio symbols to exclude them
    let excludedSymbols = new Set<string>();
    if (user) {
      const { data: portData } = await supabase
        .from('portfolios')
        .select('symbol')
        .eq('user_id', user.id);
      
      if (portData) {
        excludedSymbols = new Set(portData.map(p => p.symbol));
      }
    }

    // 3. Fetch stocks from watchlist
    const { data: allStocks, error: dbError } = await supabase
      .from('stocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError || !allStocks) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Filter out stocks that are already in the portfolio
    const stocks = allStocks.filter(s => !excludedSymbols.has(s.symbol));

    if (stocks.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (dbError || !stocks || stocks.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const computedResults: ScreenerResult[] = [];
    const BATCH_SIZE = 5;

    for (let i = 0; i < stocks.length; i += BATCH_SIZE) {
      const batch = stocks.slice(i, i + BATCH_SIZE);
      setStatus(`Evaluating ${i + 1} to ${Math.min(i + BATCH_SIZE, stocks.length)} of ${stocks.length}...`);

      const batchPromises = batch.map(stock => getScreenerData(stock.symbol));
      const batchResponses = await Promise.all(batchPromises);

      batchResponses.forEach((res, index) => {
        const stock = batch[index];

        if (res.success && res.timeframes) {
          const { daily, weekly, monthly } = res.timeframes;
          const currentPrice = daily.length > 0 ? daily[daily.length - 1].close : 0;

          if (weekly.length > 0) weekly[weekly.length - 1].close = currentPrice;
          if (monthly.length > 0) monthly[monthly.length - 1].close = currentPrice;

          const dailyEval = evaluateUptrend(daily);
          const weeklyEval = evaluateUptrend(weekly);
          const monthlyEval = evaluateUptrend(monthly);
          
          const reversalData = evaluateLookbackReversal(monthly);

          const isMonthlyBullish = monthlyEval.bullishCount >= 2;
          const isFreshReversal = reversalData.isReversal;

          if (isMonthlyBullish && isFreshReversal) {
            computedResults.push({
              id: stock.id,
              symbol: stock.symbol,
              company_name: stock.company_name,
              price: currentPrice,
              reversalType: reversalData.reversalType,
              daily: dailyEval,
              weekly: weeklyEval,
              monthly: monthlyEval,
            });
          }
        }
      });
    }

    setResults(computedResults);
    setLoading(false);
  }, [supabase, setResults]);

  useEffect(() => {
    if (results.length === 0) {
      runScreener();
    } else {
      setLoading(false);
    }
  }, [runScreener, results.length]);

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
          <h1 className="text-2xl font-bold text-slate-100">Stock Buy Candidates</h1>
          <p className="text-sm text-slate-400 mt-1">
            Stocks with 2+ Monthly Bullish indicators AND a fresh 3-month reversal on EMA, MACD, or Supertrend.
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
            No stocks are currently showing a fresh monthly reversal.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs whitespace-nowrap">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold tracking-wider">
                <tr>
                  <th colSpan={3} className="px-4 py-2 border-r border-slate-800 bg-slate-950 text-left">Stock Details</th>
                  <th colSpan={4} className="px-4 py-2 border-r border-slate-800">Daily</th>
                  <th colSpan={4} className="px-4 py-2 border-r border-slate-800">Weekly</th>
                  <th colSpan={4} className="px-4 py-2">Monthly</th>
                </tr>
                <tr className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                  <th className="px-4 py-2 text-left sticky left-0 bg-slate-950 z-10 w-48">Stock</th>
                  <th className="px-4 py-2 text-right">Price (₹)</th>
                  <th className="px-4 py-2 text-center border-r border-slate-800">Reversal Trigger</th>
                  
                  <th className="px-2 py-2">EMA</th>
                  <th className="px-2 py-2">MACD</th>
                  <th className="px-2 py-2">ST</th>
                  <th className="px-2 py-2 border-r border-slate-800">RSI</th>

                  <th className="px-2 py-2">EMA</th>
                  <th className="px-2 py-2">MACD</th>
                  <th className="px-2 py-2">ST</th>
                  <th className="px-2 py-2 border-r border-slate-800">RSI</th>

                  <th className="px-2 py-2">EMA</th>
                  <th className="px-2 py-2">MACD</th>
                  <th className="px-2 py-2">ST</th>
                  <th className="px-2 py-2">RSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 bg-slate-900">
                {results.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-left sticky left-0 bg-slate-900 z-10">
                      <div className="font-semibold text-slate-200 truncate w-48" title={item.company_name || item.symbol}>
                        {item.company_name || item.symbol}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-emerald-400">
                      {item.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center border-r border-slate-800">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        {item.reversalType}
                      </span>
                    </td>

                    <td className="px-2 py-3"><Badge value={item.daily.ema} /></td>
                    <td className="px-2 py-3"><Badge value={item.daily.macd} /></td>
                    <td className="px-2 py-3"><Badge value={item.daily.st} /></td>
                    <td className="px-2 py-3 border-r border-slate-800"><Badge value={item.daily.rsi} /></td>

                    <td className="px-2 py-3"><Badge value={item.weekly.ema} /></td>
                    <td className="px-2 py-3"><Badge value={item.weekly.macd} /></td>
                    <td className="px-2 py-3"><Badge value={item.weekly.st} /></td>
                    <td className="px-2 py-3 border-r border-slate-800"><Badge value={item.weekly.rsi} /></td>

                    <td className="px-2 py-3"><Badge value={item.monthly.ema} /></td>
                    <td className="px-2 py-3"><Badge value={item.monthly.macd} /></td>
                    <td className="px-2 py-3"><Badge value={item.monthly.st} /></td>
                    <td className="px-2 py-3 border-r border-slate-800"><Badge value={item.monthly.rsi} /></td>
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