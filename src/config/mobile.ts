// Environment configuration for API endpoints
import { Capacitor } from '@capacitor/core';

const isNativePlatform = Capacitor.isNativePlatform();

// Configuration for different environments
export const config = {
    // API base URL
    apiBaseUrl: isNativePlatform
        ? import.meta.env.VITE_API_URL || 'https://ereuna.io'
        : 'http://localhost:5500',

    // WebSocket URL
    wsUrl: isNativePlatform
        ? import.meta.env.VITE_WS_URL || 'wss://ereuna.io'
        : 'ws://localhost:8000',

    // App environment
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    isMobile: isNativePlatform,

    // Platform detection
    platform: Capacitor.getPlatform(), // 'ios', 'android', or 'web'
};

// Helper to construct full API URL
export const getApiUrl = (endpoint: string): string => {
    const baseUrl = config.apiBaseUrl;
    return `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

export default config;
