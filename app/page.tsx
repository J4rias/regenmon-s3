'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Incubator } from '@/components/incubator'
import { Dashboard } from '@/components/dashboard'
import { TopBar } from '@/components/top-bar'
import { MusicProvider } from '@/components/music-provider'
import { StartScreen } from '@/components/start-screen'
import { LoadingScreen } from '@/components/loading-screen'
import type { RegenmonData } from '@/lib/regenmon-types'
import { ARCHETYPES } from '@/lib/regenmon-types'
import { useLanguage } from '@/components/language-provider'
import { usePrivy } from '@privy-io/react-auth'
import { useConvex, useConvexAuth, useMutation, useQuery } from 'convex/react'
import { api } from "@/convex/_generated/api";

import { UserNamePopup } from '@/components/username-popup'

const THEME_KEY = 'regenmon-theme'

function GameContent() {
  // Remote Data
  const regenmon = useQuery(api.regenmon.get);
  const userProfile = useQuery(api.users.get);

  // Mutations
  const storeUser = useMutation(api.users.store);
  const markTutorialSeen = useMutation(api.users.markTutorialSeen);
  const hatch = useMutation(api.regenmon.hatch);
  const resetGame = useMutation(api.regenmon.reset);
  const updateRegenmon = useMutation(api.regenmon.update);

  const [isDark, setIsDark] = useState(true)
  const { locale, toggleLang } = useLanguage()
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const { authenticated: isPrivyAuthenticated, ready: isPrivyReady, getAccessToken } = usePrivy()
  const [mounted, setMounted] = useState(false)
  // Sync Auth with Convex User Table
  const userStoredRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      userStoredRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && !userStoredRef.current) {
      // Ensure user exists in our DB
      storeUser({});
      userStoredRef.current = true;
    }
  }, [isAuthLoading, isAuthenticated, storeUser]);

  const [hasSkippedName, setHasSkippedName] = useState(false)
  const [gameState, setGameState] = useState<'START' | 'LOADING' | 'GAME'>('START')

  useEffect(() => {
    setMounted(true)
  }, [])




  // Handle auth state changes
  useEffect(() => {
    // Only reset if Privy is ready and explicitly says we are NOT authenticated.
    if (mounted && isPrivyReady && !isPrivyAuthenticated && gameState !== 'START') {
      setGameState('START')
    }
  }, [mounted, isPrivyAuthenticated, isPrivyReady, gameState])

  // Auto-start if authenticated
  useEffect(() => {
    if (mounted && isPrivyAuthenticated && gameState === 'START') {
      setGameState('LOADING')
    }
  }, [mounted, isPrivyAuthenticated, gameState])

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


  function handleHatch(data: RegenmonData) {
    // We pass only the necessary args to the mutation
    hatch({ name: data.name, type: data.type });
  }

  // handleUpdate is no longer needed as Dashboard updates directly via mutations
  const handleUpdate = (data: RegenmonData) => {
    // This function is still called by Dashboard, so we need to map it to the Convex mutation
    if (regenmon && regenmon._id) {
      updateRegenmon({
        regenmonId: regenmon._id,
        name: data.name,
        type: data.type,
        stats: data.stats,
        coins: data.coins,
        evolutionBonus: data.evolutionBonus,
        gameOverAt: data.gameOverAt,
        isGameOver: data.isGameOver,
        chatHistory: data.chatHistory,
        history: data.history,
      });
    }
  }

  async function handleReset() {
    if (regenmon) {
      await resetGame({ regenmonId: regenmon._id });
      // The query will automatically update to null, 
      // which will trigger the Incubator to show.
    }
  }

  function toggleTheme() {
    setIsDark((prev) => !prev)
  }

  const handleStart = useCallback(() => {
    setGameState('LOADING')
  }, [])

  const handleLoaded = useCallback(() => {
    setGameState('GAME')
  }, [])

  const currentArchetype = regenmon ? ARCHETYPES.find((a) => a.id === regenmon.type) : null
  const archetypeInfo = currentArchetype
    ? `${currentArchetype.getName(locale)} — "${currentArchetype.getLabel(locale)}"`
    : undefined

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center font-sans">
        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Loading resources...</p>
      </main>
    )
  }



  function handleSaveName(name: string) {
    storeUser({ name });
  }

  function handleSkipName() {
    setHasSkippedName(true)
  }

  function handleTutorialSeen(tutorialId: string) {
    markTutorialSeen({ tutorialId });
  }

  return (
    <div className="min-h-screen font-sans">
      {gameState === 'START' && (
        <StartScreen
          onStart={handleStart}
          isDark={isDark}
          toggleTheme={toggleTheme}
          locale={locale}
          toggleLang={toggleLang}
        />
      )}

      {gameState === 'LOADING' && (
        <LoadingScreen onLoaded={handleLoaded} locale={locale} />
      )}

      {gameState === 'GAME' && (
        <div className="flex flex-col" style={{ height: '100dvh' }}>
          <TopBar
            isDark={isDark}
            locale={locale}
            onToggleTheme={toggleTheme}
            onToggleLang={toggleLang}
            archetypeInfo={archetypeInfo}
            onReset={regenmon ? handleReset : undefined}
            regenmonData={regenmon || null}
            playerName={userProfile?.name || ''}
          />
          <main style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
            {regenmon ? (
              <Dashboard
                locale={locale}
                data={regenmon as any}
                onUpdate={handleUpdate}
                onReset={handleReset}
                userSettings={{
                  playerName: userProfile?.name || '',
                  tutorialsSeen: userProfile?.tutorialsSeen || []
                }}
                onTutorialSeen={handleTutorialSeen}
              />
            ) : (
              <Incubator locale={locale} onHatch={handleHatch} />
            )}

            {/* Show popup if user exists but has no name or is default 'Trainer', and hasn't skipped */}
            {userProfile && (!userProfile.name || userProfile.name === 'Trainer') && !hasSkippedName && (
              <UserNamePopup locale={locale} onSave={handleSaveName} onSkip={handleSkipName} />
            )}
          </main>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <MusicProvider>
      <GameContent />
    </MusicProvider>
  )
}
