'use client'

import { useState } from 'react'
import { Sun, Moon, LogOut, Menu, X } from 'lucide-react'
import { usePrivy } from '@privy-io/react-auth'
import type { Locale } from '@/lib/i18n'
import type { RegenmonData } from '@/lib/regenmon-types'
import { t } from '@/lib/i18n'
import { RegenmonTheme } from '@/components/regenmon-theme'
import { CeldaIcon } from '@/components/celda-icon'

interface TopBarProps {
  isDark: boolean
  locale: Locale
  onToggleTheme: () => void
  onToggleLang: () => void
  archetypeInfo?: string
  onReset?: () => void
  regenmonData?: any
  playerName?: string
}

export function TopBar({
  isDark,
  locale,
  onToggleTheme,
  onToggleLang,
  archetypeInfo,
  onReset,
  regenmonData,
  playerName
}: TopBarProps) {
  const s = t(locale)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const { user, logout } = usePrivy()

  const displayName = playerName || user?.email?.address || user?.wallet?.address || 'User'
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
          gap: '8px',
          backgroundColor: 'var(--card)',
          minHeight: '50px',
        }}
      >
        {/* Mobile Menu Button */}
        <button
          type="button"
          className="sm:hidden nes-btn"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          style={{ fontSize: '10px', width: '40px', height: '35px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Desktop Left: Toggles and Theme */}
        <div className="hidden sm:flex flex-row" style={{ alignItems: 'center', gap: '8px', flex: '0 0 auto', justifyContent: 'flex-start' }}>
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

        {/* Center: Archetype Info - Hidden on mobile */}
        <div className="hidden md:flex" style={{ display: 'flex', flexShrink: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 8px', minWidth: 0 }}>
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

        {/* Right: User Name, Coins, and Logout */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flex: '0 0 auto', gap: '8px' }}>
          {/* Coin Display */}
          {regenmonData && (
            <div
              className={`flex items-center gap-2 px-2 py-1 rounded border text-xs`}
              style={{
                backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(200, 200, 200, 0.5)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
              }}
              title={s.coinsTooltip}
            >
              <CeldaIcon className="w-3 h-3" />
              <span
                className="font-bold"
                style={{ color: isDark ? '#fbbf24' : '#b45309' }}
              >
                {regenmonData.coins ?? 0}
              </span>
            </div>
          )}

          {/* User Name - Always visible */}
          <div className="flex items-center gap-2 px-2 py-1 border-2 border-dashed border-gray-500 rounded text-[10px] sm:text-[11px]" style={{ color: 'var(--foreground)', height: '35px' }}>
            <span title={displayName} className="whitespace-nowrap">{shortName}</span>
          </div>

          {/* Logout Button - Always visible */}
          <button
            type="button"
            className="nes-btn is-warning"
            onClick={logout}
            style={{ fontSize: '10px', display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 6px' }}
            title={s.logoutButton}
          >
            <LogOut size={12} />
            <span className="hidden sm:inline">{s.logoutButton}</span>
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div
          className="sm:hidden fixed top-14 left-0 right-0 z-30 border-b-2 border-border"
          style={{
            backgroundColor: 'var(--card)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => {
              onToggleLang()
              setShowMobileMenu(false)
            }}
            className="nes-btn w-full"
            style={{ fontSize: '12px', textAlign: 'left' }}
          >
            {locale === 'en' ? '🇪🇸 Español' : '🇬🇧 English'}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => {
              onToggleTheme()
              setShowMobileMenu(false)
            }}
            className="nes-btn w-full"
            style={{ fontSize: '12px', textAlign: 'left' }}
          >
            {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>

          {/* Archetype Info */}
          {archetypeInfo && (
            <div
              className="nes-container w-full"
              style={{
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                fontSize: '12px',
                padding: '8px',
                textAlign: 'center',
              }}
            >
              <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
                {archetypeInfo}
              </p>
            </div>
          )}

          {/* Reset Button */}
          {onReset && (
            <button
              type="button"
              className="nes-btn is-error w-full"
              onClick={() => {
                setShowConfirm(true)
                setShowMobileMenu(false)
              }}
              style={{ fontSize: '12px' }}
            >
              {s.resetButton}
            </button>
          )}

          {/* Theme Component */}
          <div style={{ paddingTop: '8px' }}>
            <RegenmonTheme />
          </div>
        </div>
      )}

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
