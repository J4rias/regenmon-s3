'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { MessageCircle } from 'lucide-react'
import {
  ARCHETYPES,
  SPRITE_MAP,
  EVOLUTION_STAGES,
  EVOLUTION_INTERVAL_MS,
  type RegenmonData,
  type EvolutionStage,
  type EconomyAction,
} from '@/lib/regenmon-types'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { ChatBox } from '@/components/chat-box'
import { CeldaIcon } from '@/components/celda-icon'
import { TutorialPopup } from '@/components/tutorial-popup'
import { DailyRewardChest } from '@/components/daily-reward-chest'
import { getRandomFeedingResponse } from '@/lib/feeding-responses'

interface DashboardProps {
  locale: Locale
  data: RegenmonData
  onUpdate: (data: RegenmonData) => void
  onReset: () => void
  userSettings?: { playerName: string; tutorialsSeen: string[] }
  onTutorialSeen?: (tutorialId: string) => void
}

function getEvolutionStage(createdAt: string | number, bonus: number = 0, gameOverAt?: string): { stage: EvolutionStage; stageIndex: number; timeRemaining: number } {
  const startTime = typeof createdAt === 'string' && !isNaN(Number(createdAt)) ? Number(createdAt) : new Date(createdAt).getTime()
  const endTime = gameOverAt ? new Date(gameOverAt).getTime() : Date.now()
  const elapsed = endTime - startTime + bonus
  const effectiveElapsed = Math.max(0, elapsed)
  const stageIndex = Math.min(Math.floor(effectiveElapsed / EVOLUTION_INTERVAL_MS), EVOLUTION_STAGES.length - 1)
  const stage = EVOLUTION_STAGES[stageIndex] || 'baby'
  const nextStageAt = (stageIndex + 1) * EVOLUTION_INTERVAL_MS
  const timeRemaining = stageIndex >= EVOLUTION_STAGES.length - 1 ? 0 : Math.max(0, nextStageAt - effectiveElapsed)
  return { stage, stageIndex, timeRemaining }
}

function getMood(stats: RegenmonData['stats']): 'happy' | 'sad' {
  const avg = (stats.happiness + stats.energy + stats.hunger) / 3
  return avg > 50 ? 'happy' : 'sad'
}

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Colors for each stat action
const STAT_COLORS = {
  hunger: '#76c442',   // Green (feed)
  happiness: '#209cee', // Blue (play)
  energy: '#f7d51d',   // Yellow (rest)
} as const

// Floating +10 popup type
interface FloatingText {
  id: number
  stat: string
  color: string
  x: number
  amount: number
}

export function Dashboard({ locale, data, onUpdate, onReset, userSettings, onTutorialSeen }: DashboardProps) {
  // Helper for simple ID generation
  const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9)

  const [now, setNow] = useState(Date.now())
  const [showTutorial, setShowTutorial] = useState(false)
  const [poppedStat, setPoppedStat] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [lastReadMessageCount, setLastReadMessageCount] = useState(data.chatHistory?.length || 0)
  const initialAssistantId = (data.chatHistory || []).filter((m: any) => m.role === 'assistant').slice(-1)[0]?.id || null
  const [lastShownMessageId, setLastShownMessageId] = useState<string | null>(initialAssistantId)
  const [showSpriteBubble, setShowSpriteBubble] = useState(false)
  const [spriteBubbleText, setSpriteBubbleText] = useState('')
  const [spriteBubbleMemory, setSpriteBubbleMemory] = useState<number | null>(null)
  const [spriteBubbleIsRecall, setSpriteBubbleIsRecall] = useState(false)
  const [isRegenmonTyping, setIsRegenmonTyping] = useState(false)
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({
    hunger: false,
    happiness: false,
    energy: false,
  })
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([])
  const floatingIdRef = useRef(0)
  const drainTickRef = useRef(0)
  const dataRef = useRef(data)

  // Update refs when data changes
  useEffect(() => {
    dataRef.current = data
  }, [data])

  // Auto-start tutorial for new users
  useEffect(() => {
    if (userSettings && !userSettings.tutorialsSeen?.includes('intro')) {
      setShowTutorial(true)
    }
  }, [userSettings])

  const prevStatsRef = useRef(data.stats)

  const archetype = ARCHETYPES.find((a) => a.id === data.type) || ARCHETYPES[0]
  const s = t(locale)

  const [isRewardUnlocked, setIsRewardUnlocked] = useState(false)

  // Floating text helper
  const triggerPopup = useCallback((stat: keyof typeof STAT_COLORS | 'drain' | 'cells', amount: number) => {
    const id = floatingIdRef.current++
    let randomX = 0
    if (stat === 'happiness') randomX = -80 - (Math.random() * 30)
    else if (stat === 'energy') randomX = 80 + (Math.random() * 30)
    else if (stat === 'hunger') randomX = -15 - (Math.random() * 30)
    else if (stat === 'cells') randomX = 15 + (Math.random() * 30)
    else randomX = (Math.random() * 20) - 10

    let color = ''
    if (stat === 'cells') color = amount > 0 ? '#76c442' : '#cd5c5c'
    else if (stat === 'drain') color = '#cd5c5c'
    else color = STAT_COLORS[stat]

    setFloatingTexts((prev: any) => [...prev, { id, stat, color, x: randomX, amount }])
    setTimeout(() => {
      setFloatingTexts((prev: any) => prev.filter((f: any) => f.id !== id))
    }, 1200)
  }, [])

  // Sync popups with stat changes
  useEffect(() => {
    const prev = prevStatsRef.current
    const curr = data.stats

    if (curr.happiness !== prev.happiness) {
      const diff = curr.happiness - prev.happiness
      if (diff > 0) {
        triggerPopup('happiness', diff)
        setPoppedStat('happiness')
        setTimeout(() => setPoppedStat(null), 400)
      }
    }

    if (curr.energy !== prev.energy) {
      const diff = curr.energy - prev.energy
      if (diff > 0) {
        triggerPopup('energy', diff)
        setPoppedStat('energy')
        setTimeout(() => setPoppedStat(null), 400)
      } else if (diff < -1) {
        triggerPopup('energy', diff)
        setPoppedStat('energy')
        setTimeout(() => setPoppedStat(null), 400)
      }
    }

    if (curr.hunger !== prev.hunger) {
      const diff = curr.hunger - prev.hunger
      if (diff > 0) {
        triggerPopup('hunger', diff)
        setPoppedStat('hunger')
        setTimeout(() => setPoppedStat(null), 400)
      }
    }

    prevStatsRef.current = curr
  }, [data.stats, triggerPopup])

  const prevCoinsRef = useRef(data.coins)
  useEffect(() => {
    const prev = prevCoinsRef.current
    const curr = data.coins ?? 0
    if (curr > prev) {
      triggerPopup('cells', curr - prev)
    }
    prevCoinsRef.current = curr
  }, [data.coins, triggerPopup])

  // Tick every second for the timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Detect unread messages
  const history = data.chatHistory || []
  const lastMessage = history[history.length - 1]
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(lastMessage?.id || null)

  const hasUnreadMessages = !isChatOpen && lastMessage && lastMessage.id !== lastReadMessageId

  useEffect(() => {
    if (isChatOpen && lastMessage && lastMessage.id !== lastReadMessageId) {
      setLastReadMessageId(lastMessage.id)
    }
  }, [isChatOpen, lastMessage, lastReadMessageId])

  const lastReadIndex = history.findIndex((m: any) => m.id === lastReadMessageId)
  let unreadCount = 0
  if (lastReadMessageId && lastReadIndex !== -1) {
    unreadCount = (history.length - 1) - lastReadIndex
  } else if (lastReadMessageId && lastReadIndex === -1) {
    unreadCount = history.length
  } else if (!lastReadMessageId && history.length > 0) {
    unreadCount = history.length
  }

  const bubbleTimerRef = useRef<any>(null)

  useEffect(() => {
    if (isChatOpen) {
      if (showSpriteBubble) setShowSpriteBubble(false)
      if (spriteBubbleText) setSpriteBubbleText('')

      const history = data.chatHistory || []
      const lastAssistantMessage = [...history].reverse().find(m => m.role === 'assistant')
      if (lastAssistantMessage && lastAssistantMessage.id !== lastShownMessageId) {
        setLastShownMessageId(lastAssistantMessage.id)
      }

      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current)
        bubbleTimerRef.current = null
      }
      return
    }

    const history = data.chatHistory || []
    const lastAssistantMessage = [...history].reverse().find(m => m.role === 'assistant')

    if (isRegenmonTyping) {
      if (!showSpriteBubble) setShowSpriteBubble(true)
      if (spriteBubbleText) setSpriteBubbleText('')
      if (spriteBubbleMemory) setSpriteBubbleMemory(null)
      if (spriteBubbleIsRecall) setSpriteBubbleIsRecall(false)
      if (bubbleTimerRef.current) {
        clearTimeout(bubbleTimerRef.current)
        bubbleTimerRef.current = null
      }
    } else if (lastAssistantMessage && lastAssistantMessage.id !== lastShownMessageId) {
      // Sound logic removed for brevity/safety in this fix, can re-add if needed or if already imported
      const playBeep = () => {
        try {
          const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext
          if (!AudioContextClass) return
          const ctx = new AudioContextClass()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()

          osc.type = 'square' // 8-bit style
          osc.frequency.setValueAtTime(523.25, ctx.currentTime) // C5
          osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1) // A5

          gain.gain.setValueAtTime(0.1, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)

          osc.connect(gain)
          gain.connect(ctx.destination)

          osc.start()
          osc.stop(ctx.currentTime + 0.2)
        } catch (e) {
          console.error("Audio error", e)
        }
      }
      playBeep()

      setLastShownMessageId(lastAssistantMessage.id)
      setSpriteBubbleText(lastAssistantMessage.content)
      setSpriteBubbleMemory(lastAssistantMessage.memoryIndex || null)
      setSpriteBubbleIsRecall(!!lastAssistantMessage.isRecall)
      setShowSpriteBubble(true)

      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
      bubbleTimerRef.current = setTimeout(() => {
        setShowSpriteBubble(false)
        setSpriteBubbleText('')
        setSpriteBubbleMemory(null)
        setSpriteBubbleIsRecall(false)
        bubbleTimerRef.current = null
      }, 5000)
    } else if (!isRegenmonTyping && !bubbleTimerRef.current && showSpriteBubble && !spriteBubbleText) {
      setShowSpriteBubble(false)
    }
  }, [isChatOpen, isRegenmonTyping, data.chatHistory, lastShownMessageId, showSpriteBubble, spriteBubbleText])

  useEffect(() => {
    return () => {
      if (bubbleTimerRef.current) clearTimeout(bubbleTimerRef.current)
    }
  }, [])

  const handleTypingChange = useCallback((typing: boolean) => {
    setIsRegenmonTyping(typing)
  }, [])

  // Passive stat drain
  useEffect(() => {
    const drain = setInterval(() => {
      const current = dataRef.current
      const newStats = { ...current.stats }
      let changed = false
      const keys: Array<'happiness' | 'energy' | 'hunger'> = ['happiness', 'energy', 'hunger']
      for (const key of keys) {
        if (newStats[key] > 0) {
          newStats[key] = Math.max(0, newStats[key] - 1)
          changed = true
        }
      }
      if (changed) {
        drainTickRef.current += 1

        const avg = (newStats.happiness + newStats.energy + newStats.hunger) / 3
        const timeBonus = avg > 50 ? 5000 : -3000
        const currentBonus = current.evolutionBonus ?? 0
        const newBonus = currentBonus + timeBonus

        if (drainTickRef.current >= 5) {
          drainTickRef.current = 0
          triggerPopup('drain', -5)
        }

        const allZero = newStats.happiness <= 0 && newStats.energy <= 0 && newStats.hunger <= 0
        let gameOverAt = current.gameOverAt
        if (allZero && !gameOverAt) {
          gameOverAt = new Date().toISOString()
        }

        const { history, ...rest } = current
        onUpdate({ ...rest, stats: newStats, evolutionBonus: newBonus, gameOverAt })
        if (allZero) clearInterval(drain)
      }
    }, 5000)
    return () => clearInterval(drain)
  }, [onUpdate, triggerPopup]) // Added triggerPopup to deps

  // ... (rendering logic) ...
  const { stage, stageIndex, timeRemaining } = getEvolutionStage(data.createdAt, data.evolutionBonus ?? 0, data.gameOverAt)
  const mood = getMood(data.stats)
  // Use local const for isGameOver to avoid TypeScript issues in callbacks if logic checks data directly
  const isGameOver = data.stats.happiness <= 0 && data.stats.energy <= 0 && data.stats.hunger <= 0

  const sprites = SPRITE_MAP[data.type as keyof typeof SPRITE_MAP] || SPRITE_MAP['Scrap-Eye'] // Fallback
  const currentSprite = (sprites[stage] && sprites[stage][mood]) ? sprites[stage][mood] : sprites.baby.happy
  const isMaxEvolution = stageIndex >= EVOLUTION_STAGES.length - 1
  const timerProgress = isMaxEvolution ? 100 : ((EVOLUTION_INTERVAL_MS - timeRemaining) / EVOLUTION_INTERVAL_MS) * 100

  const stageLabels: Record<EvolutionStage, string> = {
    baby: s.stageBaby,
    adult: s.stageAdult,
    full: s.stageFull,
  }

  const addStat = useCallback(
    (stat: 'happiness' | 'energy' | 'hunger') => {
      const currentData = dataRef.current
      const currentIsGameOver = currentData.stats.happiness <= 0 && currentData.stats.energy <= 0 && currentData.stats.hunger <= 0

      if (cooldowns[stat] || currentData.stats[stat] >= 100 || currentIsGameOver) return

      if (stat === 'hunger') {
        const cost = 10
        const currentCoins = currentData.coins ?? 0

        if (currentCoins < cost) {
          triggerPopup('drain', 0)
          setSpriteBubbleText(s.needCoins || "Need 10 cells")
          setShowSpriteBubble(true)
          setTimeout(() => setShowSpriteBubble(true), 10)
          setTimeout(() => setShowSpriteBubble(false), 3000)
          return
        }

        setCooldowns((prev: any) => ({ ...prev, [stat]: true }))
        setSpriteBubbleText(s.processing || "⏳ Procesando…")
        setShowSpriteBubble(true)

        setTimeout(() => {
          const latest = dataRef.current
          // Double check funds/stats again?
          if ((latest.coins ?? 0) < cost) return;

          const amount = 10
          const newStats = { ...latest.stats }
          newStats[stat] = Math.min(100, Math.max(0, newStats[stat] + amount))
          const newCoins = (latest.coins ?? 0) - cost
          const newAction: EconomyAction = {
            id: generateId(), // usage of helper
            type: 'feed',
            amount: -cost,
            date: new Date().toISOString()
          }
          // History logic: In Convex we trust the backend to append, but for optimistic UI we append here.
          // However, since we are sending the WHOLE object back to 'update', we MUST append here.
          const newHistory = [newAction, ...(latest.history || [])].slice(0, 10)

          onUpdate({
            ...latest,
            stats: newStats,
            coins: newCoins,
            history: newHistory
          })

          triggerPopup('cells', -cost)
          setSpriteBubbleText(s.ready || "✅ ¡Listo!")

          setTimeout(() => {
            setShowSpriteBubble(false)
            setSpriteBubbleText("")
            setCooldowns((prev: any) => ({ ...prev, [stat]: false }))

            const reaction = getRandomFeedingResponse(locale)
            const reactionMsg: any = {
              id: Date.now().toString(),
              role: 'assistant',
              content: reaction,
              timestamp: new Date().toISOString()
            }
            const currentAfterWait = dataRef.current
            const updatedHistory = [...(currentAfterWait.chatHistory || []), reactionMsg].slice(-20)

            onUpdate({
              ...currentAfterWait,
              chatHistory: updatedHistory
            })

          }, 2000)
        }, 800)

      } else {
        const latest = dataRef.current
        const amount = 10
        const newStats = { ...latest.stats }
        newStats[stat] = Math.min(100, Math.max(0, newStats[stat] + amount))

        const newAction: EconomyAction = {
          id: generateId(),
          type: stat === 'happiness' ? 'play' : 'sleep',
          amount: 0, // No cost for play/sleep currently
          date: new Date().toISOString()
        }
        const newHistory = [newAction, ...(latest.history || [])].slice(0, 10)

        onUpdate({ ...latest, stats: newStats, history: newHistory })

        setCooldowns((prev: any) => ({ ...prev, [stat]: true }))
        setTimeout(() => {
          setCooldowns((prev: any) => ({ ...prev, [stat]: false }))
        }, 3000)
      }
    },
    [onUpdate, cooldowns, triggerPopup, s, locale]
  )

  const handleCloseTutorial = () => {
    setShowTutorial(false)
    if (onTutorialSeen) onTutorialSeen('intro')
  }

  const handleUnlockReward = useCallback(() => {
    setIsRewardUnlocked(true)
    setIsChatOpen(false) // Close chat to show chest
  }, [])

  const handleResetTutorial = useCallback(() => {
    setShowTutorial(true)
  }, [])

  const handleRewardClaim = (amount: number) => {
    const latest = dataRef.current
    const currentCoins = latest.coins ?? 0
    const newCoins = currentCoins + amount

    const today = new Date().toISOString().split('T')[0]
    const lastDate = latest.lastDailyReward ? latest.lastDailyReward.split('T')[0] : ''
    const dailyClaimed = lastDate === today ? (latest.dailyRewardsClaimed ?? 0) : 0

    if (dailyClaimed >= 3) return

    const newAction: EconomyAction = {
      id: generateId(),
      type: 'earn',
      amount: amount,
      date: new Date().toISOString()
    }
    const newHistory = [newAction, ...(latest.history || [])].slice(0, 10)

    onUpdate({
      ...latest,
      coins: newCoins,
      history: newHistory,
      dailyRewardsClaimed: dailyClaimed + 1,
      lastDailyReward: new Date().toISOString()
    })

    setIsRewardUnlocked(false)
  }

  // Force re-render sync with `now`
  void now

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center px-4 py-6 sm:px-6 sm:py-8">
      {/* Tutorial Popup */}
      {showTutorial && <TutorialPopup locale={locale} onClose={handleCloseTutorial} />}

      {/* Daily Reward Chest (Shows ONLY IF Unlocked) */}
      {isRewardUnlocked && (
        <DailyRewardChest locale={locale} onClaim={handleRewardClaim} />
      )}
      {/* Floating +10 animation styles */}
      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          60% {
            opacity: 1;
            transform: translateY(-60px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-100px) scale(0.8);
          }
        }
        .float-up {
          animation: floatUp 1.2s ease-out forwards;
          pointer-events: none;
        }
        @keyframes cooldownPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.3; }
        }
        .btn-cooldown {
          animation: cooldownPulse 1s ease-in-out infinite;
          cursor: not-allowed !important;
          filter: grayscale(60%);
        }
        @keyframes notificationPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
        }
        .notification-pulse {
          animation: notificationPulse 2s ease-in-out infinite;
        }
        
        @keyframes bubbleFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px) scale(0.9);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .sprite-bubble {
          animation: bubbleFadeIn 0.3s ease-out forwards;
        }
        
        /* Responsive chat overlay */
        @media (max-width: 1024px) {
          .chat-overlay-responsive {
            width: 380px !important;
            height: 550px !important;
          }
        }
        
        @media (max-width: 640px) {
          .chat-overlay-responsive {
            bottom: 80px !important;
            right: 12px !important;
            left: 12px !important;
            width: auto !important;
            height: calc(100vh - 180px) !important;
            max-height: 600px !important;
          }
        }
      `}</style>



      {/* Main Layout - Single Column Stack for Focus */}
      <div className="flex w-full max-w-3xl flex-col gap-4">

        {/* ITEM 1: Sprite Container */}
        <div
          className="nes-container is-rounded scanlines relative w-full overflow-hidden"
          style={{
            backgroundColor: archetype.colorDark,
            borderColor: archetype.color,
            color: 'var(--foreground)',
          }}
        >
          <div className="flex flex-col items-center gap-2 py-4 sm:py-6" style={{ opacity: isGameOver ? 0.2 : 1, transition: 'opacity 0.5s ease' }}>
            <p className="text-center text-lg leading-relaxed sm:text-2xl" style={{ color: archetype.color }}>
              {data.name}
            </p>

            {/* Vertical Evolution Bar (Absolute Left) */}
            <div
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 flex flex-col items-center justify-between h-40 sm:h-64 py-2 z-10 pointer-events-none"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '8px', padding: '4px 2px', backdropFilter: 'blur(2px)', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
            >


              <span
                className="text-[10px] sm:text-xs font-bold tracking-widest uppercase"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: archetype.color }}
              >
                {stageLabels[stage]}
              </span>

              <div className="relative flex-1 w-2 sm:w-3 my-2 bg-black/20 rounded-full overflow-hidden border border-white/10">
                <div
                  className="absolute bottom-0 left-0 w-full transition-all duration-1000"
                  style={{ height: `${timerProgress}%`, backgroundColor: archetype.color }}
                />
              </div>

              <span className="text-[10px] font-mono text-center" style={{ color: 'white', textShadow: '0 1px 2px black' }}>
                {isMaxEvolution ? 'MAX' : formatTime(timeRemaining)}
              </span>
            </div>

            {/* Sprite Animation Container */}
            <div className="relative">
              <div className="animate-breathe flex flex-col items-center gap-2">
                {currentSprite ? (
                  <Image
                    src={currentSprite}
                    alt={`${data.name} - ${stage} ${mood}`}
                    width={300}
                    height={300}
                    className="h-48 w-48 sm:h-72 sm:w-72"
                    style={{ imageRendering: 'pixelated' }}
                    priority
                  />
                ) : (
                  <div
                    className="relative flex h-32 w-32 items-center justify-center border-4 sm:h-48 sm:w-48"
                    style={{
                      borderColor: archetype.color,
                      backgroundColor: archetype.colorDark,
                      imageRendering: 'pixelated',
                    }}
                  >
                    <div
                      className="h-12 w-12 sm:h-16 sm:w-16"
                      style={{
                        backgroundColor: archetype.color,
                        boxShadow: `0 0 24px ${archetype.color}80`,
                      }}
                    />
                  </div>
                )}
                <div className="h-2 w-20 opacity-30 sm:w-24" style={{ backgroundColor: archetype.color, filter: 'blur(4px)' }} />
              </div>

              {/* Sprite Speech Bubble (when chat is closed) */}
              {showSpriteBubble && !isChatOpen && (
                <div
                  className="sprite-bubble absolute top-[-20px] left-[55%]"
                  style={{
                    maxWidth: '280px',
                    width: 'max-content',
                    zIndex: 20,
                  }}
                >
                  <div
                    className="nes-balloon from-left"
                    style={{
                      backgroundColor: 'var(--secondary)',
                      color: 'var(--foreground)',
                      fontSize: '13px',
                      padding: '12px 16px',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      position: 'relative',
                    }}
                  >
                    {spriteBubbleText ? (
                      <>
                        {spriteBubbleText}
                        {spriteBubbleMemory && (
                          <div
                            className="absolute -bottom-2 -right-2 bg-yellow-400 text-black px-1.5 py-0.5 rounded border border-black text-[10px] font-bold flex items-center gap-1 shadow-sm"
                            style={{ zIndex: 1 }}
                            title={spriteBubbleIsRecall ? s.memoryRecalled : s.memorySaved}
                          >
                            🧠 {spriteBubbleMemory}
                          </div>
                        )}
                      </>
                    ) : isRegenmonTyping ? (
                      <span className="animate-pulse">...</span>
                    ) : null}
                  </div>
                </div>
              )}

              {floatingTexts.map((ft) => (
                <span
                  key={ft.id}
                  className="float-up absolute text-2xl font-bold sm:text-3xl"
                  style={{
                    color: ft.color,
                    top: ft.stat === 'cells' ? '15%' : '30%',
                    left: `calc(50% + ${ft.x}px)`,
                    transform: 'translateX(-50%)',
                    textShadow: `0 0 8px ${ft.color}80, 2px 2px 0 #000`,
                    zIndex: 100,
                  }}
                >
                  <span className="flex items-center gap-1">
                    {ft.amount > 0 ? `+${ft.amount}` : ft.amount}
                    {ft.stat === 'cells' && <CeldaIcon className="w-5 h-7" />}
                  </span>
                </span>
              ))}
            </div>

          </div>

          {isGameOver && (
            <>
              <style>{`
                @keyframes gameOverPulse {
                  0%, 100% { opacity: 1; transform: scale(1); }
                  50% { opacity: 0.7; transform: scale(1.05); }
                }
              `}</style>
              <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>
                <p style={{ color: '#cd5c5c', fontSize: 'clamp(24px, 6vw, 48px)', fontWeight: 'bold', textAlign: 'center', textShadow: '0 0 20px rgba(205,92,92,0.6), 3px 3px 0 #000', lineHeight: 1.3, margin: 0 }}>
                  {s.gameOver}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Floating Chat Button */}
        <button
          type="button"
          className={`nes-btn is-primary hover-lift btn-press ${hasUnreadMessages ? 'notification-pulse' : ''}`}
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
          title={isChatOpen ? (locale === 'es' ? 'Ocultar chat' : 'Hide chat') : (locale === 'es' ? 'Mostrar chat' : 'Show chat')}
        >
          <MessageCircle className="h-6 w-6" />
          {hasUnreadMessages && (
            <span
              style={{
                position: 'absolute',
                top: '6px',
                right: '6px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#000000',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>

        {/* Chat Overlay (Kept mounted to maintain state during transitions) */}
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            width: '450px',
            height: '600px',
            zIndex: 999,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            overflow: 'visible',
            opacity: isChatOpen ? 1 : 0,
            pointerEvents: isChatOpen ? 'auto' : 'none',
            visibility: isChatOpen ? 'visible' : 'hidden',
            transition: 'opacity 0.3s ease, transform 0.3s ease',
            transform: isChatOpen ? 'translateY(0)' : 'translateY(20px)',
          }}
          className="chat-overlay-responsive"
        >
          <ChatBox data={data} locale={locale} onUpdate={onUpdate} isGameOver={isGameOver} isOpen={isChatOpen} onTypingChange={handleTypingChange} onUnlockReward={handleUnlockReward} onResetTutorial={handleResetTutorial} userSettings={userSettings} />
        </div>

        {/* ITEM 3: Action Buttons */}
        <div
          className="nes-container is-rounded w-full"
          style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', padding: '16px' }}
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Image
              src={archetype.image}
              alt={archetype.id}
              width={56}
              height={56}
              style={{ imageRendering: 'pixelated', flexShrink: 0 }}
            />
            {/* Play button (Happiness) */}
            <button
              type="button"
              className={`nes-btn is-primary hover-lift btn-press ${cooldowns.happiness || data.stats.happiness >= 100 || isGameOver ? 'btn-cooldown' : ''}`}
              onClick={() => addStat('happiness')}
              disabled={cooldowns.happiness || data.stats.happiness >= 100 || isGameOver}
              style={{ fontSize: '11px', padding: '4px 16px', height: '56px', display: 'inline-flex', alignItems: 'center' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className={`nes-icon heart is-small ${data.stats.happiness > 75 ? '' : data.stats.happiness > 25 ? 'is-half' : 'is-empty'}`} />
                {s.happiness}
              </span>
            </button>

            {/* Rest button (Energy) */}
            <button
              type="button"
              className={`nes-btn is-warning hover-lift btn-press ${cooldowns.energy || data.stats.energy >= 100 || isGameOver ? 'btn-cooldown' : ''}`}
              onClick={() => addStat('energy')}
              disabled={cooldowns.energy || data.stats.energy >= 100 || isGameOver}
              style={{ fontSize: '11px', padding: '4px 16px', height: '56px', display: 'inline-flex', alignItems: 'center' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className={`nes-icon star is-small ${data.stats.energy > 75 ? '' : data.stats.energy > 25 ? 'is-half' : 'is-empty'}`} />
                {s.energy}
              </span>
            </button>

            {/* Feed button (Hunger) */}
            <div className="relative group">
              <button
                type="button"
                className={`nes-btn is-success hover-lift btn-press ${cooldowns.hunger || data.stats.hunger >= 100 || isGameOver || (data.coins ?? 0) < 10 ? 'btn-cooldown' : ''}`}
                onClick={() => addStat('hunger')}
                disabled={cooldowns.hunger || data.stats.hunger >= 100 || isGameOver}
                style={{ fontSize: '11px', padding: '4px 16px', height: '56px', display: 'inline-flex', alignItems: 'center' }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className={`nes-icon like is-small ${data.stats.hunger > 50 ? '' : 'is-empty'}`} />
                  {s.hunger}
                </span>
              </button>
              {/* Tooltip for cost */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-white/20">
                -10 {s.cellName} <CeldaIcon className="inline-block w-3 h-4 -mt-1" />
              </div>
            </div>
          </div>
        </div>

        {/* ITEM 4: Stats Panel */}
        <div
          className="nes-container is-rounded w-full"
          style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
        >
          <h2 className="mb-5 text-center text-sm leading-relaxed sm:text-base" style={{ color: 'var(--foreground)' }}>
            {s.statsTitle}
          </h2>

          <div className="flex flex-col gap-5">
            {/* Happiness Bar */}
            <div>
              <label className="mb-2 block text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--foreground)' }}>
                {s.happiness}
              </label>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <progress className="nes-progress is-primary" value={data.stats.happiness} max={100} style={{ flex: 1 }} />
                <span className={`transition-all duration-300 ${poppedStat === 'happiness' ? 'animate-stat-pop' : ''}`} style={{ color: poppedStat === 'happiness' ? STAT_COLORS.happiness : 'var(--muted-foreground)', fontSize: '12px', fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>{data.stats.happiness}%</span>
              </div>
            </div>

            {/* Energy Bar */}
            <div>
              <label className="mb-2 block text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--foreground)' }}>
                {s.energy}
              </label>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <progress className="nes-progress is-warning" value={data.stats.energy} max={100} style={{ flex: 1 }} />
                <span className={`transition-all duration-300 ${poppedStat === 'energy' ? 'animate-stat-pop' : ''}`} style={{ color: poppedStat === 'energy' ? STAT_COLORS.energy : 'var(--muted-foreground)', fontSize: '12px', fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>{data.stats.energy}%</span>
              </div>
            </div>

            {/* Hunger Bar */}
            <div>
              <label className="mb-2 block text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--foreground)' }}>
                {s.hunger}
              </label>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <progress className="nes-progress is-success" value={data.stats.hunger} max={100} style={{ flex: 1 }} />
                <span className={`transition-all duration-300 ${poppedStat === 'hunger' ? 'animate-stat-pop' : ''}`} style={{ color: poppedStat === 'hunger' ? STAT_COLORS.hunger : 'var(--muted-foreground)', fontSize: '12px', fontWeight: 'bold', minWidth: '40px', textAlign: 'right' }}>{data.stats.hunger}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ITEM 5: History Panel (Collapsible) */}
        <div
          className="nes-container is-rounded w-full"
          style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
        >
          <details>
            <summary className="text-xs sm:text-sm cursor-pointer outline-none select-none" style={{ color: 'var(--foreground)' }}>
              📜 {s.historyTitle || "Historial"}
            </summary>
            <div className="mt-4 flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {data.history && data.history.length > 0 ? (
                data.history.map((action) => (
                  <div key={action.id} className="flex justify-between items-center text-[10px] sm:text-xs border-b border-gray-700 pb-1 last:border-0">
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {action.type === 'feed' ? (
                        <>
                          <span className="w-4 text-center shrink-0">🍎</span>
                          <span className="truncate">{s.feedButton}</span>
                        </>
                      ) : action.type === 'play' ? (
                        <>
                          <span className="w-4 text-center shrink-0">🎮</span>
                          <span className="truncate">{s.playButton}</span>
                        </>
                      ) : action.type === 'sleep' ? (
                        <>
                          <span className="w-4 text-center shrink-0">💤</span>
                          <span className="truncate">{s.restButton}</span>
                        </>
                      ) : (
                        <>
                          <CeldaIcon className="w-4 h-5 shrink-0" />
                          <span className="truncate">{s.historyEarn || 'Ganar'}</span>
                        </>
                      )}
                    </div>
                    <div className={`w-24 sm:w-32 text-right font-mono whitespace-nowrap ${action.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {action.amount > 0 ? `+${action.amount}` : action.amount} {s.cellName}
                    </div>
                    <div className="w-20 sm:w-28 text-right text-gray-500 text-[9px] ml-4 shrink-0">
                      {new Date(action.date).toLocaleString([], {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      }).replace(',', '')}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-gray-500 italic text-center py-2">{s.noHistory || "No hay actividad reciente"}</p>
              )}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

