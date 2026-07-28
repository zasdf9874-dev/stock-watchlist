import { login, signup } from '../auth/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Vk Stock Watchlist</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to access your scanning portal</p>
        </div>

        {params.error && (
          <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-sm rounded-lg">
            {params.error}
          </div>
        )}

        {params.message && (
          <div className="p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-sm rounded-lg">
            {params.message}
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
              placeholder="you@domain.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:outline-none focus:border-blue-500 text-sm"
              placeholder="••••••••"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              formAction={login}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg text-sm transition-colors"
            >
              Log In
            </button>
            <button
              formAction={signup}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 rounded-lg text-sm transition-colors border border-slate-700"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}