'use client'

import { useState } from 'react'
import { Sun, Moon, LogOut } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import type { Locale } from '@/lib/i18n'
import type { RegenmonData } from '@/lib/regenmon-types'
import { t } from '@/lib/i18n'
import { RegenmonTheme } from '@/components/regenmon-theme'

interface TopBarProps {
  isDark: boolean
  locale: Locale
  onToggleTheme: () => void
  onToggleLang: () => void
  archetypeInfo?: string
  onReset?: () => void
  regenmonData?: any // Using any to avoid circular dependency issues if types aren't fully propagated yet, but ideally RegenmonData
}

export function TopBar({
  isDark,
  locale,
  onToggleTheme,
  onToggleLang,
  archetypeInfo,
  onReset,
  regenmonData
}: TopBarProps) {
  const s = t(locale)
  const [showConfirm, setShowConfirm] = useState(false)
  const { user, logout } = usePrivy()

  const displayName = user?.email?.address || user?.wallet?.address || 'User'
  const shortName = displayName.length > 10 ? `${displayName.slice(0, 4)}...${displayName.slice(-4)}` : displayName

  return (
    <>
      <style>{`
        .topbar-header .nes-btn { margin: 0 !important; }
        .topbar-header p { margin: 0 !important; }
      `}</style>

      <header
        className="topbar-header sticky top-0 z-40 border-b-2 border-border"
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '8px 12px',
          gap: '12px',
          backgroundColor: 'var(--card)',
        }}
      >
        {/* Left: Toggles and User Info */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onToggleLang}
            className="nes-btn"
            style={{ fontSize: '10px', width: '40px', height: '35px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {locale === 'en' ? 'ES' : 'EN'}
          </button>
          <button
            type="button"
            onClick={onToggleTheme}
            className="nes-btn"
            style={{ fontSize: '10px', width: '40px', height: '35px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          <RegenmonTheme />
        </div>

        {/* Center: Archetype Info (Hidden on very small screens if needed, or truncated) */}
        <div style={{ display: 'flex', flex: '1 1 0%', minWidth: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 8px' }}>
          {archetypeInfo && (
            <p
              style={{
                color: 'var(--foreground)',
                fontSize: '12px',
                fontWeight: 'bold',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textTransform: 'uppercase',
                maxWidth: '100%',
                margin: 0,
              }}
            >
              {archetypeInfo}
            </p>
          )}
        </div>

        {/* Right: Actions (User Info, Reset & Logout) */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexShrink: 0, gap: '8px' }}>

          {/* Coin Display */}
          {regenmonData && (
            <div
              className={`flex items-center gap-2 mr-2 px-3 py-1 rounded border ${isDark ? 'bg-black/20 border-white/20' : 'bg-gray-200/50 border-black/10'}`}
              title={s.coinsTooltip}
            >
              <i className="nes-icon coin is-small scale-75"></i>
              <span
                className="text-xs sm:text-sm font-bold relative group"
                style={{ color: isDark ? '#fbbf24' : '#b45309' }} // Darker amber for light theme
              >
                {regenmonData.coins ?? 0}
              </span>
            </div>
          )}

          <div className="hidden sm:flex items-center gap-2 px-2 py-1 border-2 border-dashed border-gray-500 rounded text-[10px]" style={{ color: 'var(--foreground)', height: '35px' }}>
            <span title={displayName}>{shortName}</span>
          </div>

          {onReset && (
            <button
              type="button"
              className="nes-btn is-error"
              onClick={() => setShowConfirm(true)}
              style={{ fontSize: '10px' }}
            >
              {s.resetButton}
            </button>
          )}

          <button
            type="button"
            className="nes-btn is-warning"
            onClick={logout}
            style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title={s.logoutButton}
          >
            <LogOut size={12} />
            {s.logoutButton}
          </button>
        </div>
      </header>

      {/* Confirm Reset Dialog */}
      {showConfirm && onReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div
            className="nes-container is-rounded w-full max-w-md"
            style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
          >
            <p className="mb-6 text-center text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--foreground)' }}>
              {s.confirmReset}
            </p>
            <div className="flex justify-center gap-4">
              <button type="button" className="nes-btn is-error" onClick={() => { setShowConfirm(false); onReset() }} style={{ fontSize: '12px' }}>
                {s.yes}
              </button>
              <button type="button" className="nes-btn" onClick={() => setShowConfirm(false)} style={{ fontSize: '12px' }}>
                {s.no}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
