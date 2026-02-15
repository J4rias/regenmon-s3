'use client'

import { Sun, Moon } from 'lucide-react'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'

interface TopBarProps {
  isDark: boolean
  locale: Locale
  onToggleTheme: () => void
  onToggleLang: () => void
}

export function TopBar({ isDark, locale, onToggleTheme, onToggleLang }: TopBarProps) {
  const s = t(locale)

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b-4 border-border px-4 py-3 sm:px-6" style={{ backgroundColor: 'var(--card)' }}>
      <h1
        className="text-sm leading-relaxed sm:text-lg"
        style={{ color: 'var(--foreground)' }}
      >
        {s.title}
      </h1>

      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <button
          type="button"
          onClick={onToggleLang}
          className="nes-btn"
          style={{ fontSize: '10px', padding: '4px 12px' }}
          aria-label={locale === 'en' ? 'Cambiar a Espanol' : 'Switch to English'}
        >
          {locale === 'en' ? 'ES' : 'EN'}
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="nes-btn flex items-center gap-2"
          style={{ fontSize: '10px', padding: '4px 10px' }}
          aria-label={isDark ? s.lightTheme : s.darkTheme}
        >
          {isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  )
}
