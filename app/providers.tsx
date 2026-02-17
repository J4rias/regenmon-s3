'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { LanguageProvider } from '@/components/language-provider';

export default function Providers({ children }: { children: React.ReactNode }) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

    // Only render PrivyProvider if a valid app ID is configured
    if (appId) {
        return (
            <LanguageProvider>
                <PrivyProvider
                    appId={appId}
                    config={{
                        loginMethods: ['email', 'google'],
                        appearance: {
                            theme: 'light',
                            accentColor: '#676FFF',
                            logo: '/images/regenmon-logo.png',
                        },
                        embeddedWallets: {
                            ethereum: {
                                createOnLogin: 'users-without-wallets',
                            },
                        },
                    }}
                >
                    {children}
                </PrivyProvider>
            </LanguageProvider>
        );
    }

    // Fallback without Privy if app ID is not configured
    return (
        <LanguageProvider>
            {children}
        </LanguageProvider>
    );
}
