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

export default function AddStocksPage() {
  const supabase = createClient();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [symbol, setSymbol] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [exchange, setExchange] = useState('NSE');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch stocks from Supabase
  const fetchStocks = useCallback(async () => {
    const { data, error } = await supabase
      .from('stocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching stocks:', error);
    } else {
      setStocks(data || []);
    }
  }, [supabase]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Add stock to Supabase
  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;

    setLoading(true);
    setErrorMsg('');

    const formattedSymbol = symbol.trim().toUpperCase();

    const { error } = await supabase.from('stocks').insert([
      {
        symbol: formattedSymbol,
        company_name: companyName.trim() || formattedSymbol,
        exchange: exchange,
      },
    ]);

    if (error) {
      if (error.code === '23505') {
        setErrorMsg('Stock symbol already exists in your watchlist.');
      } else {
        setErrorMsg(error.message);
      }
    } else {
      setSymbol('');
      setCompanyName('');
      fetchStocks(); // Refresh the list
    }
    setLoading(false);
  };

  // Delete stock from Supabase
  const handleDeleteStock = async (id: string) => {
    const { error } = await supabase.from('stocks').delete().eq('id', id);
    if (!error) {
      setStocks(stocks.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Stock Directory Management</h1>
        <p className="text-sm text-slate-400 mt-1">
          Add stock tickers to your database. These symbols will feed into your screeners and live trackers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form Column */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-800">
            Add New Stock
          </h2>

          <form onSubmit={handleAddStock} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Stock Symbol / Ticker *
              </label>
              <input
                type="text"
                placeholder="e.g. RELIANCE, TCS, INFY"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Company Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Reliance Industries"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Exchange
              </label>
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
                <option value="NASDAQ">NASDAQ</option>
                <option value="NYSE">NYSE</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Saving...' : 'Add Stock'}
            </button>
          </form>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-slate-200">
              Active Watchlist Database
            </h2>
            <span className="text-xs font-medium bg-slate-800 text-blue-400 px-2.5 py-1 rounded-full border border-slate-700">
              {stocks.length} {stocks.length === 1 ? 'Stock' : 'Stocks'}
            </span>
          </div>

          {stocks.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No stocks added yet. Use the form to store your first symbol.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Exchange</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {stocks.map((stock) => (
                    <tr key={stock.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-blue-400">
                        {stock.symbol}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {stock.company_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                          {stock.exchange}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteStock(stock.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}