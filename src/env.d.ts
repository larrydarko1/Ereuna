/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_STRIPE_PUBLISHABLE_KEY: string;
    readonly VITE_EREUNA_KEY: string;
    // add more VITE_ variables here as needed
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}