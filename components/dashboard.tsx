'use client'

import { useState, useEffect, useCallback } from 'react'
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

interface DashboardProps {
  locale: Locale
  data: RegenmonData
  onUpdate: (data: RegenmonData) => void
  onReset: () => void
}

function getEvolutionStage(createdAt: string): { stage: EvolutionStage; stageIndex: number; timeRemaining: number } {
  const elapsed = Date.now() - new Date(createdAt).getTime()
  const stageIndex = Math.min(Math.floor(elapsed / EVOLUTION_INTERVAL_MS), EVOLUTION_STAGES.length - 1)
  const stage = EVOLUTION_STAGES[stageIndex]
  const nextStageAt = (stageIndex + 1) * EVOLUTION_INTERVAL_MS
  const timeRemaining = stageIndex >= EVOLUTION_STAGES.length - 1 ? 0 : Math.max(0, nextStageAt - elapsed)
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

export function Dashboard({ locale, data, onUpdate, onReset }: DashboardProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [poppedStat, setPoppedStat] = useState<string | null>(null)
  const archetype = ARCHETYPES.find((a) => a.id === data.type)!
  const s = t(locale)

  // Tick every second for the timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const { stage, stageIndex, timeRemaining } = getEvolutionStage(data.createdAt)
  const mood = getMood(data.stats)
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
    (stat: 'happiness' | 'energy' | 'hunger', amount: number) => {
      const newStats = { ...data.stats }
      newStats[stat] = Math.min(100, Math.max(0, newStats[stat] + amount))
      onUpdate({ ...data, stats: newStats })
      setPoppedStat(stat)
      setTimeout(() => setPoppedStat(null), 400)
    },
    [data, onUpdate]
  )

  // Force re-render sync with `now`
  void now

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center px-4 py-6 sm:px-6 sm:py-8">
      {/* Header row */}
      <div className="mb-4 flex w-full max-w-3xl items-center justify-between">
        <div>
          <p className="text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {archetype.getName(locale)} &mdash; {`"${archetype.getLabel(locale)}"`}
          </p>
        </div>
        <button
          type="button"
          className="nes-btn is-error"
          onClick={() => setShowConfirm(true)}
          style={{ fontSize: '10px', padding: '4px 12px' }}
        >
          {s.resetButton}
        </button>
      </div>

      {/* Evolution timer bar */}
      <div
        className="nes-container is-rounded mb-4 w-full max-w-3xl"
        style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', padding: '12px 16px' }}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs" style={{ color: 'var(--foreground)' }}>
            {s.evolutionLabel}: <span style={{ color: archetype.color }}>{stageLabels[stage]}</span>
          </span>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {isMaxEvolution ? s.maxEvolution : `${s.nextEvolution} ${formatTime(timeRemaining)}`}
          </span>
        </div>
        <div
          className="relative h-6 w-full overflow-hidden border-4"
          style={{ borderColor: archetype.color, backgroundColor: 'var(--secondary)' }}
        >
          <div
            className="absolute inset-y-0 left-0 transition-all duration-1000"
            style={{
              width: `${timerProgress}%`,
              backgroundColor: archetype.color,
            }}
          />
        </div>
        {/* Stage dots */}
        <div className="mt-2 flex justify-between px-1">
          {EVOLUTION_STAGES.map((s2, i) => (
            <span
              key={s2}
              className="text-xs"
              style={{ color: i <= stageIndex ? archetype.color : 'var(--muted-foreground)' }}
            >
              {stageLabels[s2]}
            </span>
          ))}
        </div>
      </div>

      {/* Display area with creature sprite */}
      <div
        className="nes-container is-rounded scanlines relative mb-4 w-full max-w-3xl overflow-hidden"
        style={{
          backgroundColor: archetype.colorDark,
          borderColor: archetype.color,
          color: 'var(--foreground)',
        }}
      >
        <div className="flex flex-col items-center gap-4 py-6 sm:py-8">
          <p className="text-center text-lg leading-relaxed sm:text-2xl" style={{ color: archetype.color }}>
            {data.name}
          </p>

          {/* Creature sprite or fallback placeholder */}
          <div className="animate-breathe flex flex-col items-center gap-2">
            {currentSprite ? (
              <Image
                src={currentSprite}
                alt={`${data.name} - ${stage} ${mood}`}
                width={192}
                height={192}
                className="h-32 w-32 sm:h-48 sm:w-48"
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

            {/* Shadow */}
            <div
              className="h-2 w-20 opacity-30 sm:w-24"
              style={{
                backgroundColor: archetype.color,
                filter: 'blur(4px)',
              }}
            />
          </div>

          {/* Mood indicator */}
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {mood === 'happy' ? ':)' : ':('}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div
        className="nes-container is-rounded mb-4 w-full max-w-3xl"
        style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)', padding: '16px' }}
      >
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="nes-btn is-success hover-lift btn-press"
            onClick={() => addStat('hunger', 15)}
            style={{ fontSize: '11px', padding: '6px 16px' }}
          >
            {s.feedButton}
          </button>
          <button
            type="button"
            className="nes-btn is-primary hover-lift btn-press"
            onClick={() => addStat('happiness', 15)}
            style={{ fontSize: '11px', padding: '6px 16px' }}
          >
            {s.playButton}
          </button>
          <button
            type="button"
            className="nes-btn is-warning hover-lift btn-press"
            onClick={() => addStat('energy', 15)}
            style={{ fontSize: '11px', padding: '6px 16px' }}
          >
            {s.restButton}
          </button>
        </div>
      </div>

      {/* Stats panel */}
      <div
        className="nes-container is-rounded w-full max-w-3xl"
        style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
      >
        <h2
          className="mb-5 text-center text-sm leading-relaxed sm:text-base"
          style={{ color: 'var(--foreground)' }}
        >
          {s.statsTitle}
        </h2>

        <div className="flex flex-col gap-5">
          {/* Happiness */}
          <div>
            <label className="mb-2 flex items-center justify-between text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--foreground)' }}>
              <span>{s.happiness}</span>
              <span className={`transition-all duration-300 ${poppedStat === 'happiness' ? 'animate-stat-pop' : ''}`} style={{ color: poppedStat === 'happiness' ? '#76c442' : 'var(--muted-foreground)' }}>{data.stats.happiness}/100</span>
            </label>
            <progress className="nes-progress is-success" value={data.stats.happiness} max={100} style={{ transition: 'width 0.3s ease' }} />
          </div>

          {/* Energy */}
          <div>
            <label className="mb-2 flex items-center justify-between text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--foreground)' }}>
              <span>{s.energy}</span>
              <span className={`transition-all duration-300 ${poppedStat === 'energy' ? 'animate-stat-pop' : ''}`} style={{ color: poppedStat === 'energy' ? '#d4a85c' : 'var(--muted-foreground)' }}>{data.stats.energy}/100</span>
            </label>
            <progress className="nes-progress is-warning" value={data.stats.energy} max={100} style={{ transition: 'width 0.3s ease' }} />
          </div>

          {/* Satiety */}
          <div>
            <label className="mb-2 flex items-center justify-between text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--foreground)' }}>
              <span>{s.hunger}</span>
              <span className={`transition-all duration-300 ${poppedStat === 'hunger' ? 'animate-stat-pop' : ''}`} style={{ color: poppedStat === 'hunger' ? '#cd5c5c' : 'var(--muted-foreground)' }}>{data.stats.hunger}/100</span>
            </label>
            <progress className="nes-progress is-error" value={data.stats.hunger} max={100} style={{ transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div
            className="nes-container is-rounded w-full max-w-md"
            style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
          >
            <p className="mb-6 text-center text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--foreground)' }}>
              {s.confirmReset}
            </p>
            <div className="flex justify-center gap-4">
              <button
                type="button"
                className="nes-btn is-error"
                onClick={() => { setShowConfirm(false); onReset() }}
                style={{ fontSize: '12px' }}
              >
                {s.yes}
              </button>
              <button
                type="button"
                className="nes-btn"
                onClick={() => setShowConfirm(false)}
                style={{ fontSize: '12px' }}
              >
                {s.no}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
