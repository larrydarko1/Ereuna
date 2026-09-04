/**
 * user — the account itself and what the account remembers.
 * `user-account` owns identity and deletion; `user-preferences` owns the
 * per-user display state (locale, theme, panel layout) that no other domain
 * should be reaching into.
 */
export * from '@/services/user/user-account.js';
export * from '@/services/user/user-preferences.js';
