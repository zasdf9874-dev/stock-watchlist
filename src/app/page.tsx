import { redirect } from 'next/navigation'
import { createClient } from '../lib/supabase/server'

export default async function Dashboard() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Streamlined Welcome Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl font-bold text-slate-100">
            Welcome back, <span className="text-blue-400">{user.email?.split('@')[0]}</span>
          </h1>
          
          <form action="/auth/signout" method="post">
            <button className="text-sm text-slate-300 hover:text-white transition-colors border border-slate-700 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700">
              Sign Out
            </button>
          </form>
        </div>

        {/* Dashboard Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-800 pb-2 text-slate-200">Active Watchlist</h2>
            <p className="text-sm text-slate-400">Your stock scanner will appear here.</p>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 border-b border-slate-800 pb-2 text-slate-200">Paper Trading Portfolio</h2>
            <p className="text-sm text-slate-400">Your live positions and P&L will appear here.</p>
          </div>
        </main>
        
      </div>
    </div>
  )
}