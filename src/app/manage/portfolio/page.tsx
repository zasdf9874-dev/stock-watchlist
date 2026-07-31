'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../../../lib/supabase/client';

interface PortfolioItem {
  id: string;
  user_id: string;
  symbol: string;
  company_name: string;
  quantity: number;
  buy_price: number;
  exchange: string;
}

interface WatchlistStock {
  symbol: string;
  company_name: string;
}

// ⚠️ MAKE SURE THIS MATCHES YOUR EXACT LOGIN EMAIL IF YOU ARE ADMIN
const ADMIN_EMAIL = 'YOUR_ADMIN_EMAIL@gmail.com';

export default function PortfolioPage() {
  const supabase = createClient();
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Admin state
  const [isAdmin, setIsAdmin] = useState(false);
  const [allPortfolios, setAllPortfolios] = useState<PortfolioItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('self');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Form State for Adding a Position
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Fetch user session and data (Removed `portfolio` from dependencies to prevent infinite loop)
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);
    const userIsAdmin = user.email === ADMIN_EMAIL;
    setIsAdmin(userIsAdmin);

    let currentPortfolios: PortfolioItem[] = [];

    if (userIsAdmin) {
      const { data: portData, error: portError } = await supabase
        .from('portfolios')
        .select('*')
        .order('created_at', { ascending: false });

      if (!portError && portData) {
        setAllPortfolios(portData);
        currentPortfolios = portData;
        if (selectedUserId === 'self') {
          setPortfolio(portData.filter((p) => p.user_id === user.id));
        } else {
          setPortfolio(portData.filter((p) => p.user_id === selectedUserId));
        }
      }
    } else {
      const { data: portData, error: portError } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!portError && portData) {
        currentPortfolios = portData;
        setPortfolio(portData);
      }
    }

    // Fetch watchlist stocks to choose from when adding positions
    const { data: stockData } = await supabase
      .from('stocks')
      .select('symbol, company_name');

    if (stockData) {
      const activeSymbols = new Set(currentPortfolios.map((p) => p.symbol));
      const available = stockData.filter((s) => !activeSymbols.has(s.symbol));
      setWatchlist(available);
    }

    setLoading(false);
  }, [supabase, selectedUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle user change in admin dropdown
  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetId = e.target.value;
    setSelectedUserId(targetId);
    if (targetId === 'self') {
      setPortfolio(allPortfolios.filter((p) => p.user_id === currentUserId));
    } else {
      setPortfolio(allPortfolios.filter((p) => p.user_id === targetId));
    }
  };

  // Handle adding stock to portfolio
  const handleAddToPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSymbol || !quantity || !buyPrice) return;

    setIsAdding(true);
    setErrorMsg('');

    const targetStock = watchlist.find((s) => s.symbol === selectedSymbol);

    const { error } = await supabase.from('portfolios').insert([
      {
        symbol: selectedSymbol,
        company_name: targetStock?.company_name || selectedSymbol,
        quantity: parseFloat(quantity),
        buy_price: parseFloat(buyPrice),
      },
    ]);

    if (error) {
      setErrorMsg(error.message);
    } else {
      setSelectedSymbol('');
      setQuantity('');
      setBuyPrice('');
      fetchData();
    }
    setIsAdding(false);
  };

  // Remove position (Sell / Exit)
  const handleRemovePosition = async (id: string) => {
    const { error } = await supabase.from('portfolios').delete().eq('id', id);
    if (!error) {
      fetchData();
    }
  };

  const uniqueUserIds = Array.from(new Set(allPortfolios.map((p) => p.user_id)));

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">My Portfolio</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your active investments. Added stocks are automatically hidden from your screeners.
          </p>
        </div>

        {/* Admin User Selector Dropdown */}
        {isAdmin && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Admin View:</span>
            <select
              value={selectedUserId}
              onChange={handleUserChange}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="self">My Portfolio (Self)</option>
              {uniqueUserIds
                .filter((id) => id !== currentUserId)
                .map((uid) => (
                  <option key={uid} value={uid}>
                    User ID: {uid.slice(0, 8)}...
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Add Position Form */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm h-fit">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 pb-2 border-b border-slate-800">
            Add Position
          </h2>

          <form onSubmit={handleAddToPortfolio} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Select Stock from Watchlist *
              </label>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-blue-500 text-sm"
              >
                <option value="">-- Choose Stock --</option>
                {watchlist.map((s) => (
                  <option key={s.symbol} value={s.symbol}>
                    {s.symbol} - {s.company_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Buy Price (₹) *
              </label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 2450.50"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isAdding}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg transition-colors disabled:opacity-50 mt-2"
            >
              {isAdding ? 'Adding...' : 'Add to Portfolio'}
            </button>
          </form>
        </div>

        {/* Portfolio List Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-slate-200">
              Active Holdings {selectedUserId !== 'self' && <span className="text-xs text-amber-400">(Viewing User Portfolio)</span>}
            </h2>
            <span className="text-xs font-medium bg-slate-800 text-blue-400 px-2.5 py-1 rounded-full border border-slate-700">
              {portfolio.length} {portfolio.length === 1 ? 'Holding' : 'Holdings'}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-400 text-sm">Loading portfolio...</div>
          ) : portfolio.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No holdings found in this portfolio.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="text-xs uppercase bg-slate-950/50 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Symbol</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Buy Price</th>
                    <th className="px-4 py-3 text-right">Invested</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {portfolio.map((item) => {
                    const invested = item.quantity * item.buy_price;
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-blue-400">{item.symbol}</div>
                          <div className="text-xs text-slate-400 truncate max-w-[150px]">{item.company_name}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono">₹{item.buy_price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-mono font-medium text-slate-200">
                          ₹{invested.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemovePosition(item.id)}
                            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded transition-colors"
                          >
                            Sell / Exit
                          </button>
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
    </div>
  );
}