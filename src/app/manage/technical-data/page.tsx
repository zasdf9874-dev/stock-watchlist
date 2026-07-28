'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../../../lib/supabase/client';

interface Stock {
  id: string;
  symbol: string;
  company_name: string;
  exchange: string;
  created_at: string;
}

// Interface matching your prototype columns
interface StockTechnicalData extends Stock {
  price: number;
  sinceWatchlisted: {
    changePct: number;
    days: number;
  };
  ema5: number;
  ema8: number;
  ema13: number;
  ema21: number;
  macd: number;
  macdSignal: number;
  stUpperBand: number | null;
  stLowerBand: number | null;
  rsi: number;
}

export default function TechnicalDataPage() {
  const supabase = createClient();
  const [techData, setTechData] = useState<StockTechnicalData[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to generate realistic technical data for prototype display
  const calculateIndicators = (stock: Stock): StockTechnicalData => {
    // Generate deterministic baseline prices based on stock symbol length
    const basePrice = (stock.symbol.charCodeAt(0) * 8.5) + (stock.symbol.length * 15);
    const price = Math.round(basePrice * 100) / 100;
    
    // Simulate days since watchlisted
    const createdDate = new Date(stock.created_at);
    const diffDays = Math.max(1, Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24)));
    const changePct = Math.round(((stock.symbol.length % 2 === 0 ? 1 : -1) * (diffDays * 1.2)) * 10) / 10;

    return {
      ...stock,
      price: price,
      sinceWatchlisted: {
        changePct: changePct,
        days: diffDays,
      },
      ema5: Math.round((price * 1.015) * 100) / 100,
      ema8: Math.round((price * 1.022) * 100) / 100,
      ema13: Math.round((price * 1.028) * 100) / 100,
      ema21: Math.round((price * 1.035) * 100) / 100,
      macd: Math.round((price * 0.008 * (changePct >= 0 ? 1 : -1)) * 100) / 100,
      macdSignal: Math.round((price * 0.005 * (changePct >= 0 ? 1 : -1)) * 100) / 100,
      stUpperBand: changePct < 0 ? Math.round((price * 1.05) * 100) / 100 : null,
      stLowerBand: changePct >= 0 ? Math.round((price * 0.95) * 100) / 100 : null,
      rsi: Math.round((45 + (changePct * 2)) * 100) / 100,
    };
  };

  const fetchStockData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const computed = data.map((stock) => calculateIndicators(stock));
      setTechData(computed);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchStockData();
  }, [fetchStockData]);

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Technical Indicators Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Calculated multi-moving averages, MACD, Supertrend bands, and RSI for watchlisted stocks.
          </p>
        </div>
        <button 
          onClick={fetchStockData}
          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Recalculate
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Fetching technical indicators...
          </div>
        ) : techData.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No stocks found. Add stocks in <span className="text-blue-400 font-medium">Manage &gt; Add Stocks</span> first.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 sticky left-0 bg-slate-950 z-10">Stock</th>
                  <th className="px-4 py-3.5 text-right">Price (₹)</th>
                  <th className="px-4 py-3.5">Since Watchlisted</th>
                  <th className="px-4 py-3.5 text-right">5 EMA</th>
                  <th className="px-4 py-3.5 text-right">8 EMA</th>
                  <th className="px-4 py-3.5 text-right">13 EMA</th>
                  <th className="px-4 py-3.5 text-right">21 EMA</th>
                  <th className="px-4 py-3.5 text-right">MACD</th>
                  <th className="px-4 py-3.5 text-right">SIGNAL</th>
                  <th className="px-4 py-3.5 text-right">ST Upper Band</th>
                  <th className="px-4 py-3.5 text-right">ST Lower Band</th>
                  <th className="px-4 py-3.5 text-right">RSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                {techData.map((item) => {
                  const isUp = item.sinceWatchlisted.changePct >= 0;
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Stock Name Column */}
                      <td className="px-4 py-3 font-semibold text-slate-200 sticky left-0 bg-slate-900 font-sans">
                        <div>{item.company_name || item.symbol}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.symbol}</div>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right font-medium text-slate-100">
                        {item.price.toFixed(2)}
                      </td>

                      {/* Since Watchlisted */}
                      <td className="px-4 py-3 font-sans">
                        <span className={`font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({Math.abs(item.sinceWatchlisted.changePct)}% {isUp ? 'Up' : 'Down'} - {item.sinceWatchlisted.days} {item.sinceWatchlisted.days === 1 ? 'day' : 'days'})
                        </span>
                      </td>

                      {/* EMAs */}
                      <td className="px-4 py-3 text-right text-slate-300">{item.ema5.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{item.ema8.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{item.ema13.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{item.ema21.toFixed(2)}</td>

                      {/* MACD / Signal */}
                      <td className={`px-4 py-3 text-right ${item.macd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.macd.toFixed(2)}
                      </td>
                      <td className={`px-4 py-3 text-right ${item.macdSignal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.macdSignal.toFixed(2)}
                      </td>

                      {/* Supertrend Upper / Lower */}
                      <td className="px-4 py-3 text-right text-slate-400">
                        {item.stUpperBand ? item.stUpperBand.toFixed(2) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {item.stLowerBand ? item.stLowerBand.toFixed(2) : '-'}
                      </td>

                      {/* RSI */}
                      <td className={`px-4 py-3 text-right font-semibold ${item.rsi > 60 ? 'text-emerald-400' : item.rsi < 40 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {item.rsi.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}