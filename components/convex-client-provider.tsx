"use client";

import { ReactNode, useMemo } from "react";
import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { usePrivy } from "@privy-io/react-auth";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Create a custom hook that adapts Privy's auth to what Convex expects
function usePrivyAuth() {
    const { authenticated, getAccessToken, ready } = usePrivy();

    return useMemo(() => ({
        isLoading: !ready,
        isAuthenticated: authenticated,
        fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
            try {
                return await getAccessToken();
            } catch (error) {
                console.error('Convex: Error fetching token', error);
                return null;
            }
        },
    }), [authenticated, ready, getAccessToken]);
}

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
    return (
        <ConvexProviderWithAuth client={convex} useAuth={usePrivyAuth}>
            {children}
        </ConvexProviderWithAuth>
    );
}
