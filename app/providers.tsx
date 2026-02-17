'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { LanguageProvider, useLanguage } from '@/components/language-provider';

function PrivyWrapper({ children }: { children: React.ReactNode }) {
    const { locale } = useLanguage();

    const landingHeader = locale === 'en' ? 'Log in or sign up' : 'Inicia Sesión o Regístrate';
    const loginMessage = locale === 'en' ? 'Log in to continue' : 'Inicia sesión para continuar';

    return (
        <PrivyProvider
            appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
            config={{
                loginMethods: ['email', 'google'],
                appearance: {
                    theme: 'light',
                    accentColor: '#676FFF',
                    logo: '/images/regenmon-logo.png',
                    landingHeader: landingHeader,
                },
                // embeddedWallets: {
                //     ethereum: {
                //         createOnLogin: 'users-without-wallets',
                //     },
                // },
            }}
        >
            {children}
        </PrivyProvider>
    );
}

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <LanguageProvider>
            <PrivyWrapper>
                {children}
            </PrivyWrapper>
        </LanguageProvider>
    );
}
