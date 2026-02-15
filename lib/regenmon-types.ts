import type { Locale } from './i18n'
import { t } from './i18n'

export type ArchetypeId = 'Scrap-Eye' | 'Spore-Maw' | 'Prism-Core'
export type EvolutionStage = 'baby' | 'adult' | 'full'
export const EVOLUTION_STAGES: EvolutionStage[] = ['baby', 'adult', 'full']
export const EVOLUTION_INTERVAL_MS = 3 * 60 * 1000 // 3 minutes per stage

export interface Archetype {
  id: ArchetypeId
  color: string
  colorDark: string
  getName: (locale: Locale) => string
  getLabel: (locale: Locale) => string
  getDescription: (locale: Locale) => string
}

export interface RegenmonStats {
  happiness: number
  energy: number
  hunger: number
}

export interface RegenmonData {
  name: string
  type: ArchetypeId
  stats: RegenmonStats
  createdAt: string
}

// Sprite image map: archetypeId -> stage -> mood -> image path
export const SPRITE_MAP: Record<ArchetypeId, Record<EvolutionStage, { happy: string; sad: string }>> = {
  'Spore-Maw': {
    baby: {
      happy: '/images/spore-maw-baby-happy.png',
      sad: '/images/spore-maw-baby-sad.png',
    },
    adult: {
      happy: '/images/spore-maw-adult-happy.png',
      sad: '/images/spore-maw-adult-sad.png',
    },
    full: {
      happy: '/images/spore-maw-full-happy.png',
      sad: '/images/spore-maw-full-sad.png',
    },
  },
  // Placeholder for other archetypes (no sprites yet)
  'Scrap-Eye': {
    baby: { happy: '', sad: '' },
    adult: { happy: '', sad: '' },
    full: { happy: '', sad: '' },
  },
  'Prism-Core': {
    baby: { happy: '', sad: '' },
    adult: { happy: '', sad: '' },
    full: { happy: '', sad: '' },
  },
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'Scrap-Eye',
    color: '#cd5c5c',
    colorDark: 'rgba(205, 92, 92, 0.15)',
    getName: (l) => t(l).archIndustrialName,
    getLabel: (l) => t(l).archIndustrialLabel,
    getDescription: (l) => t(l).archIndustrialDesc,
  },
  {
    id: 'Spore-Maw',
    color: '#76c442',
    colorDark: 'rgba(118, 196, 66, 0.15)',
    getName: (l) => t(l).archFungiName,
    getLabel: (l) => t(l).archFungiLabel,
    getDescription: (l) => t(l).archFungiDesc,
  },
  {
    id: 'Prism-Core',
    color: '#67e6dc',
    colorDark: 'rgba(103, 230, 220, 0.15)',
    getName: (l) => t(l).archMineralName,
    getLabel: (l) => t(l).archMineralLabel,
    getDescription: (l) => t(l).archMineralDesc,
  },
]
