"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="h-8 w-40 bg-theme-surface border border-theme-border rounded-lg animate-pulse" />

  return (
    <div className="flex bg-theme-surface border border-theme-border rounded-lg p-1">
      {['light', 'dark', 'grey'].map((t) => (
        <button
          key={t}
          onClick={() => setTheme(t)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${
            theme === t ? 'bg-theme-border text-theme-text' : 'text-theme-muted hover:text-theme-text'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  )
}