import { ref, onMounted, watch } from 'vue';

const PUBLIC_THEME_KEY = 'public-theme';

export type PublicTheme = 'dark' | 'light';

export function usePublicTheme() {
    // Initialize from localStorage or default to 'dark'
    const storedTheme = localStorage.getItem(PUBLIC_THEME_KEY) as PublicTheme | null;
    const currentTheme = ref<PublicTheme>(storedTheme || 'dark');

    // Apply theme to the element
    const applyTheme = (theme: PublicTheme, element?: Element | null) => {
        const targetElement = element || document.querySelector('.landingPage, .communications-page, .quiz-container, .recovery-container, .beta-announcement, .mission-page');

        if (targetElement) {
            if (theme === 'light') {
                targetElement.classList.add('light-mode');
            } else {
                targetElement.classList.remove('light-mode');
            }
        }
    };

    // Toggle between dark and light
    const toggleTheme = () => {
        currentTheme.value = currentTheme.value === 'dark' ? 'light' : 'dark';
        localStorage.setItem(PUBLIC_THEME_KEY, currentTheme.value);
        applyTheme(currentTheme.value);
    };

    // Initialize theme on mount
    onMounted(() => {
        applyTheme(currentTheme.value);
    });

    // Watch for changes
    watch(currentTheme, (newTheme) => {
        applyTheme(newTheme);
    });

    return {
        currentTheme,
        toggleTheme,
        applyTheme,
    };
}
