'use client'

import { useState, useEffect } from 'react'
import { Incubator } from '@/components/incubator'
import { Dashboard } from '@/components/dashboard'
import { TopBar } from '@/components/top-bar'
import type { RegenmonData } from '@/lib/regenmon-types'
import type { Locale } from '@/lib/i18n'
import { LANG_KEY } from '@/lib/i18n'

const STORAGE_KEY = 'regenmon-data'
const THEME_KEY = 'regenmon-theme'

export default function Home() {
  const [regenmon, setRegenmon] = useState<RegenmonData | null>(null)
  const [isDark, setIsDark] = useState(true)
  const [locale, setLocale] = useState<Locale>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        setRegenmon(JSON.parse(saved))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }

    const savedTheme = localStorage.getItem(THEME_KEY)
    if (savedTheme === 'light') {
      setIsDark(false)
    } else {
      setIsDark(true)
    }

    const savedLang = localStorage.getItem(LANG_KEY)
    if (savedLang === 'es') {
      setLocale('es')
    } else {
      setLocale('en')
    }

    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const html = document.documentElement
    if (isDark) {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light')
  }, [isDark, mounted])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.lang = locale
    localStorage.setItem(LANG_KEY, locale)
  }, [locale, mounted])

  function handleHatch(data: RegenmonData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setRegenmon(data)
  }

  function handleUpdate(data: RegenmonData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setRegenmon(data)
  }

  function handleReset() {
    localStorage.removeItem(STORAGE_KEY)
    setRegenmon(null)
  }

  function toggleTheme() {
    setIsDark((prev) => !prev)
  }

  function toggleLang() {
    setLocale((prev) => (prev === 'en' ? 'es' : 'en'))
  }

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center font-sans">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading...</p>
      </main>
    )
  }

  return (
    <div className="min-h-screen font-sans">
      <TopBar
        isDark={isDark}
        locale={locale}
        onToggleTheme={toggleTheme}
        onToggleLang={toggleLang}
      />
      <main>
        {regenmon ? (
          <Dashboard locale={locale} data={regenmon} onUpdate={handleUpdate} onReset={handleReset} />
        ) : (
          <Incubator locale={locale} onHatch={handleHatch} />
        )}
      </main>
    </div>
  )
}
