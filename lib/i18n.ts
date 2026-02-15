export type Locale = 'en' | 'es'

export const LANG_KEY = 'regenmon-lang'

const strings = {
  en: {
    title: 'Regenmon',
    subtitle: 'Post-Apocalyptic Virtual Pet',
    loading: 'Loading...',
    // Incubator
    createTitle: 'Create Your Regenmon',
    nameLabel: 'Name (2-15 characters):',
    namePlaceholder: 'Enter a name...',
    nameMinError: 'Minimum 2 characters',
    selectArchetype: 'Select an Archetype:',
    hatchButton: 'Hatch!',
    // Archetypes
    archIndustrialName: 'Industrial',
    archIndustrialLabel: 'Scrap-Eye',
    archIndustrialDesc: 'Forged from the remnants of the old civilization.',
    archFungiName: 'Fungi',
    archFungiLabel: 'Spore-Maw',
    archFungiDesc: 'Born from the organic mutation of the wasteland.',
    archMineralName: 'Mineral',
    archMineralLabel: 'Prism-Core',
    archMineralDesc: 'Crystallized by residual radiation.',
    // Dashboard
    resetButton: 'Reset',
    statsTitle: 'Statistics',
    happiness: 'Happiness',
    energy: 'Energy',
    hunger: 'Satiety',
    confirmReset: 'Are you sure you want to abandon your Regenmon?',
    yes: 'Yes',
    no: 'No',
    // Theme
    lightTheme: 'Switch to light theme',
    darkTheme: 'Switch to dark theme',
    // Evolution
    evolutionLabel: 'Evolution',
    stageBaby: 'Baby',
    stageAdult: 'Adult',
    stageFull: 'Full',
    nextEvolution: 'Next evolution in',
    maxEvolution: 'Max evolution reached!',
    // Actions
    feedButton: 'Feed',
    playButton: 'Play',
    restButton: 'Rest',
  },
  es: {
    title: 'Regenmon',
    subtitle: 'Mascota Virtual Post-Apocaliptica',
    loading: 'Cargando...',
    // Incubator
    createTitle: 'Crea tu Regenmon',
    nameLabel: 'Nombre (2-15 caracteres):',
    namePlaceholder: 'Escribe un nombre...',
    nameMinError: 'Minimo 2 caracteres',
    selectArchetype: 'Selecciona un Arquetipo:',
    hatchButton: 'Eclosionar!',
    // Archetypes
    archIndustrialName: 'Industrial',
    archIndustrialLabel: 'Ojo de Chatarra',
    archIndustrialDesc: 'Forjado con restos de la vieja civilizacion.',
    archFungiName: 'Fungi',
    archFungiLabel: 'Fauces de Espora',
    archFungiDesc: 'Nacido de la mutacion organica del yermo.',
    archMineralName: 'Mineral',
    archMineralLabel: 'Nucleo de Prisma',
    archMineralDesc: 'Cristalizado por la radiacion residual.',
    // Dashboard
    resetButton: 'Reiniciar',
    statsTitle: 'Estadisticas',
    happiness: 'Felicidad',
    energy: 'Energia',
    hunger: 'Saciedad',
    confirmReset: 'Seguro que quieres abandonar a tu Regenmon?',
    yes: 'Si',
    no: 'No',
    // Theme
    lightTheme: 'Cambiar a tema claro',
    darkTheme: 'Cambiar a tema oscuro',
    // Evolution
    evolutionLabel: 'Evolucion',
    stageBaby: 'Bebe',
    stageAdult: 'Adulto',
    stageFull: 'Completo',
    nextEvolution: 'Siguiente evolucion en',
    maxEvolution: 'Evolucion maxima alcanzada!',
    // Actions
    feedButton: 'Alimentar',
    playButton: 'Jugar',
    restButton: 'Descansar',
  },
} as const

export type Strings = (typeof strings)['en']

export function t(locale: Locale): Strings {
  return strings[locale]
}
