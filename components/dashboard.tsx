'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  ARCHETYPES,
  SPRITE_MAP,
  EVOLUTION_STAGES,
  EVOLUTION_INTERVAL_MS,
  type RegenmonData,
  type EvolutionStage,
} from '@/lib/regenmon-types'
import type { Locale } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { ChatBox } from '@/components/chat-box'

interface DashboardProps {
  locale: Locale
  data: RegenmonData
  onUpdate: (data: RegenmonData) => void
  onReset: () => void
}

function getEvolutionStage(createdAt: string, bonus: number = 0, gameOverAt?: string): { stage: EvolutionStage; stageIndex: number; timeRemaining: number } {
  const endTime = gameOverAt ? new Date(gameOverAt).getTime() : Date.now()
  const elapsed = endTime - new Date(createdAt).getTime() + bonus
  const effectiveElapsed = Math.max(0, elapsed)
  const stageIndex = Math.min(Math.floor(effectiveElapsed / EVOLUTION_INTERVAL_MS), EVOLUTION_STAGES.length - 1)
  const stage = EVOLUTION_STAGES[stageIndex]
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
}

export function Dashboard({ locale, data, onUpdate, onReset }: DashboardProps) {
  const [now, setNow] = useState(Date.now())
  const [poppedStat, setPoppedStat] = useState<string | null>(null)
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({
    hunger: false,
    happiness: false,
    energy: false,
  })
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([])
  const floatingIdRef = useRef(0)
  const drainTickRef = useRef(0)
  const dataRef = useRef(data)
  dataRef.current = data

  const archetype = ARCHETYPES.find((a) => a.id === data.type)!
  const s = t(locale)

  // Tick every second for the timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Passive stat drain: every 5 seconds, decrease each stat by 1
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

        // Mood-based evolution time bonus
        const avg = (newStats.happiness + newStats.energy + newStats.hunger) / 3
        const timeBonus = avg > 50 ? 5000 : -3000 // happy: +5s, sad: -3s
        const currentBonus = current.evolutionBonus ?? 0
        const newBonus = currentBonus + timeBonus

        // Every 5 drain ticks, show a floating "-5" popup
        if (drainTickRef.current >= 5) {
          drainTickRef.current = 0
          const id = floatingIdRef.current++
          const randomX = Math.random() * 60 - 30
          setFloatingTexts((prev) => [...prev, { id, stat: 'drain', color: '#cd5c5c', x: randomX }])
          setTimeout(() => {
            setFloatingTexts((prev) => prev.filter((f) => f.id !== id))
          }, 1200)
        }
        const allZero = newStats.happiness <= 0 && newStats.energy <= 0 && newStats.hunger <= 0
        let gameOverAt = current.gameOverAt
        if (allZero && !gameOverAt) {
          gameOverAt = new Date().toISOString()
        }

        onUpdate({ ...current, stats: newStats, evolutionBonus: newBonus, gameOverAt })
        if (allZero) clearInterval(drain)
      }
    }, 5000)
    return () => clearInterval(drain)
  }, [onUpdate])

  const { stage, stageIndex, timeRemaining } = getEvolutionStage(data.createdAt, data.evolutionBonus ?? 0, data.gameOverAt)
  const mood = getMood(data.stats)
  const isGameOver = data.stats.happiness <= 0 && data.stats.energy <= 0 && data.stats.hunger <= 0
  const sprites = SPRITE_MAP[data.type]
  const currentSprite = sprites[stage][mood]
  const isMaxEvolution = stageIndex >= EVOLUTION_STAGES.length - 1
  const timerProgress = isMaxEvolution ? 100 : ((EVOLUTION_INTERVAL_MS - timeRemaining) / EVOLUTION_INTERVAL_MS) * 100

  const stageLabels: Record<EvolutionStage, string> = {
    baby: s.stageBaby,
    adult: s.stageAdult,
    full: s.stageFull,
  }

  const addStat = useCallback(
    (stat: 'happiness' | 'energy' | 'hunger') => {
      // Don't allow if on cooldown or stat is maxed
      if (cooldowns[stat] || data.stats[stat] >= 100 || isGameOver) return

      const amount = 10
      const newStats = { ...data.stats }
      newStats[stat] = Math.min(100, Math.max(0, newStats[stat] + amount))
      onUpdate({ ...data, stats: newStats })

      // Pop animation on stat bar
      setPoppedStat(stat)
      setTimeout(() => setPoppedStat(null), 400)

      // Floating +10 text
      const id = floatingIdRef.current++
      const randomX = Math.random() * 60 - 30
      setFloatingTexts((prev) => [...prev, { id, stat, color: STAT_COLORS[stat], x: randomX }])
      setTimeout(() => {
        setFloatingTexts((prev) => prev.filter((f) => f.id !== id))
      }, 1200)

      // Start cooldown
      setCooldowns((prev) => ({ ...prev, [stat]: true }))
      setTimeout(() => {
        setCooldowns((prev) => ({ ...prev, [stat]: false }))
      }, 3000)
    },
    [data, onUpdate, cooldowns]
  )

  // Force re-render sync with `now`
  void now

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center px-4 py-6 sm:px-6 sm:py-8">
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

              {floatingTexts.map((ft) => (
                <span
                  key={ft.id}
                  className="float-up absolute text-2xl font-bold sm:text-3xl"
                  style={{
                    color: ft.color,
                    top: '30%',
                    left: `calc(50% + ${ft.x}px)`,
                    transform: 'translateX(-50%)',
                    textShadow: `0 0 8px ${ft.color}80, 2px 2px 0 #000`,
                    zIndex: 10,
                  }}
                >
                  {ft.stat === 'drain' ? '-5' : '+10'}
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

        {/* ITEM 2: Chat Box (Placed directly under Sprite) */}
        <ChatBox data={data} locale={locale} onUpdate={onUpdate} isGameOver={isGameOver} />

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
            <button
              type="button"
              className={`nes-btn is-success hover-lift btn-press ${cooldowns.hunger || data.stats.hunger >= 100 || isGameOver ? 'btn-cooldown' : ''}`}
              onClick={() => addStat('hunger')}
              disabled={cooldowns.hunger || data.stats.hunger >= 100 || isGameOver}
              style={{ fontSize: '11px', padding: '4px 16px', height: '56px', display: 'inline-flex', alignItems: 'center' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className={`nes-icon like is-small ${data.stats.hunger > 50 ? '' : 'is-empty'}`} />
                {s.hunger}
              </span>
            </button>
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
      </div>
    </div>
  )
}
