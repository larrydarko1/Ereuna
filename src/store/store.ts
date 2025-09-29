import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null as null | { username: string;[key: string]: any },
        theme: localStorage.getItem('user-theme') || 'default',
    }),
    actions: {
        setUser(user: { username: string;[key: string]: any }) {
            this.user = user;
        },
        setTheme(theme: string) {
            this.theme = theme;
            localStorage.setItem('user-theme', theme);
        },
        loadUserFromToken() {
            const token = localStorage.getItem('token');
            if (!token) {
                this.user = null;
                return;
            }
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            if (decodedToken.exp < Date.now() / 1000) {
                localStorage.removeItem('token');
                this.user = null;
                return;
            }
            this.user = decodedToken.user as { username: string;[key: string]: any };
        },
    },
    getters: {
        getUser: (state): null | { username: string;[key: string]: any } => state.user,
        currentTheme: (state): string => state.theme,
        username: (state): string => state.user?.username ?? '',
    },
});