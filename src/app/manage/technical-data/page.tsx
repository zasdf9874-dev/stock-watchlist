'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../../../lib/supabase/client';
import { getHistoricalData } from '../../../actions/upstox';
import {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateSupertrend,
  Candle,
} from '../../../lib/indicators';

interface Stock {
  id: string;
  symbol: string;
  company_name: string;
  exchange: string;
  created_at: string;
}

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
  error?: string;
}

export default function TechnicalDataPage() {
  const supabase = createClient();
  const [techData, setTechData] = useState<StockTechnicalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState<string>('Initializing...');

  const fetchAndCalculateStockData = useCallback(async () => {
    setLoading(true);
    setLoadingStatus('Fetching saved stocks from database...');

    const { data: stocks, error: dbError } = await supabase
      .from('stocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError || !stocks || stocks.length === 0) {
      setTechData([]);
      setLoading(false);
      return;
    }

    const computedResults: StockTechnicalData[] = [];

    for (let i = 0; i < stocks.length; i++) {
      const stock = stocks[i];
      setLoadingStatus(`Fetching Upstox data for ${stock.symbol} (${i + 1}/${stocks.length})...`);

      const res = await getHistoricalData(stock.symbol);

      if (!res.success || !res.candles || res.candles.length === 0) {
        computedResults.push({
          ...stock,
          price: 0,
          sinceWatchlisted: { changePct: 0, days: 0 },
          ema5: 0,
          ema8: 0,
          ema13: 0,
          ema21: 0,
          macd: 0,
          macdSignal: 0,
          stUpperBand: null,
          stLowerBand: null,
          rsi: 0,
          error: res.error || 'Failed to load candle data',
        });
        continue;
      }

      const candles: Candle[] = res.candles;
      const closePrices = candles.map((c) => c.close);
      const currentPrice = res.currentPrice || closePrices[closePrices.length - 1];

      // Days since added
      const createdDate = new Date(stock.created_at);
      const diffDays = Math.max(
        1,
        Math.floor((new Date().getTime() - createdDate.getTime()) / (1000 * 3600 * 24))
      );

      // Compare current price to starting baseline (first candle in 100-day window or baseline price)
      const initialPrice = candles[0].close;
      const changePct =
        Math.round(((currentPrice - initialPrice) / initialPrice) * 100 * 10) / 10;

      // Indicator calculations using our indicators math module
      const ema5 = calculateEMA(closePrices, 5);
      const ema8 = calculateEMA(closePrices, 8);
      const ema13 = calculateEMA(closePrices, 13);
      const ema21 = calculateEMA(closePrices, 21);
      const rsi = calculateRSI(closePrices, 14);
      const macdObj = calculateMACD(closePrices);
      const supertrendObj = calculateSupertrend(candles, 10, 3);

      computedResults.push({
        ...stock,
        price: currentPrice,
        sinceWatchlisted: {
          changePct: changePct,
          days: diffDays,
        },
        ema5: ema5,
        ema8: ema8,
        ema13: ema13,
        ema21: ema21,
        macd: macdObj.macd,
        macdSignal: macdObj.signal,
        stUpperBand: supertrendObj.stUpperBand,
        stLowerBand: supertrendObj.stLowerBand,
        rsi: rsi,
      });
    }

    setTechData(computedResults);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchAndCalculateStockData();
  }, [fetchAndCalculateStockData]);

  return (
    <div className="p-4 sm:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Technical Indicators Overview</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time Upstox daily candle calculations for EMAs, MACD, Supertrend, and RSI.
          </p>
        </div>
        <button
          onClick={fetchAndCalculateStockData}
          disabled={loading}
          className="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Refreshing...' : 'Recalculate'}
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm space-y-2">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
            <div>{loadingStatus}</div>
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
                  if (item.error) {
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-200 sticky left-0 bg-slate-900 font-sans">
                          <div>{item.company_name || item.symbol}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{item.symbol}</div>
                        </td>
                        <td colSpan={11} className="px-4 py-3 text-rose-400 italic text-xs">
                          Upstox Error: {item.error}
                        </td>
                      </tr>
                    );
                  }

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