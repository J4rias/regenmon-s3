'use client'

import { useEffect } from 'react'
import { Sun, Moon, Volume2, VolumeX, Globe, LogOut } from 'lucide-react'
import { useMusic } from '@/components/music-provider'
import type { Locale } from '@/lib/i18n'
import { usePrivy } from '@privy-io/react-auth'

interface StartScreenProps {
    onStart: () => void
    isDark: boolean
    toggleTheme: () => void
    locale: Locale
    toggleLang: () => void
}

export function StartScreen({ onStart, isDark, toggleTheme, locale, toggleLang }: StartScreenProps) {
    const { isPlaying, toggleMusic } = useMusic()
    const { login, authenticated, ready, logout } = usePrivy()

    // Auto-start causing loops, removed for stability
    // useEffect(() => {
    //     if (ready && authenticated) {
    //         onStart()
    //     }
    // }, [ready, authenticated, onStart])

    // Common button class for uniform size and centering
    // flex-col, items-center, justify-center ensures content is centered both horizontally and vertically
    const btnClass = "nes-btn flex flex-col items-center justify-center w-40 h-40 p-4 gap-4"

    return (
        <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-cover bg-center font-sans text-white"
            style={{
                backgroundImage: 'url(/images/intro-bg.png)',
                backgroundColor: '#2d2d2d'
            }}
        >
            <div className="absolute inset-0 bg-black/60" />

            <div className="relative z-10 flex flex-col items-center gap-12 p-4 w-full max-w-4xl">
                <h1 className="text-4xl md:text-6xl font-bold tracking-widest text-shadow-xl text-white mb-4 text-center animate-pulse">
                    REGENMON
                </h1>

                <div className="flex flex-wrap justify-center gap-8 w-full">
                    {/* Language Button - Primary (Blue) */}
                    <button
                        onClick={toggleLang}
                        className={`${btnClass} is-primary`}
                        aria-label="Change Language"
                    >
                        <div className="flex-1 flex items-center justify-center">
                            <Globe className="w-14 h-14" />
                        </div>
                        <span className="text-xs font-bold leading-none">{locale === 'en' ? 'ENGLISH' : 'ESPAÑOL'}</span>
                    </button>

                    {/* Theme Button - Warning (Yellow) */}
                    <button
                        onClick={toggleTheme}
                        className={`${btnClass} is-warning text-black`}
                        aria-label="Toggle Theme"
                    >
                        <div className="flex-1 flex items-center justify-center">
                            {isDark ? <Moon className="w-14 h-14" /> : <Sun className="w-14 h-14" />}
                        </div>
                        <span className="text-xs font-bold leading-none">{isDark ? (locale === 'en' ? 'DARK' : 'OSCURO') : (locale === 'en' ? 'LIGHT' : 'CLARO')}</span>
                    </button>

                    {/* Music Button - Success/Error (Green/Red) */}
                    <button
                        onClick={toggleMusic}
                        className={`${btnClass} ${isPlaying ? 'is-success' : 'is-error'}`}
                        aria-label="Toggle Music"
                    >
                        <div className="flex-1 flex items-center justify-center">
                            {isPlaying ? <Volume2 className="w-14 h-14" /> : <VolumeX className="w-14 h-14" />}
                        </div>
                        <span className="text-xs font-bold leading-none">{isPlaying ? (locale === 'en' ? 'MUSIC: ON' : 'MÚSICA: SI') : (locale === 'en' ? 'MUSIC: OFF' : 'MÚSICA: NO')}</span>
                    </button>
                </div>

                {/* Continue / Login Button */}
                {/* Continue / Login Button */}
                <button
                    onClick={() => {
                        console.log('Start Button Clicked:', { authenticated, ready });
                        if (authenticated) {
                            console.log('Calling onStart');
                            onStart();
                        } else {
                            console.log('Calling login');
                            login();
                        }
                    }}
                    disabled={!ready}
                    className={`nes-btn mt-8 px-16 py-6 text-2xl tracking-wider animate-bounce w-full max-w-md shadow-lg flex items-center justify-center ${!ready ? 'is-disabled' : 'is-primary'}`}
                >
                    {!ready
                        ? (locale === 'en' ? 'LOADING...' : 'CARGANDO...')
                        : authenticated
                            ? (locale === 'en' ? 'CONTINUE' : 'CONTINUAR')
                            : (locale === 'en' ? 'LOGIN' : 'ENTRAR')
                    }
                </button>

                {/* Logout Option (only if authenticated) */}
                {authenticated && (
                    <button
                        onClick={logout}
                        className="text-xs text-gray-400 hover:text-white underline mt-4 flex items-center gap-2"
                    >
                        <LogOut size={14} />
                        {locale === 'en' ? 'Logout' : 'Cerrar Sesión'}
                    </button>
                )}
            </div>

            <style jsx>{`
        .text-shadow-xl {
          text-shadow: 4px 4px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000;
        }
      `}</style>
        </div>
    )
}
