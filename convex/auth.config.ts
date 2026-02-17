export default {
    providers: [
        {
            type: "customJwt",
            issuer: "privy.io",
            applicationID: "cmkyyrsbj04bck40bidlscndo",
            jwks: "https://auth.privy.io/api/v1/apps/cmkyyrsbj04bck40bidlscndo/jwks.json",
            algorithm: "ES256",
        },
    ],
};
// Forced sync update
