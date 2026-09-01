<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import AppLogo from '@/components/ui/AppLogo.vue';
import { INVESTING_QUOTES } from '@/constants/quotes';

const { title, subtitle = null } = defineProps<{
    title: string;
    subtitle?: string | null;
}>();

const { t } = useI18n();

// Picked once when the component is created rather than in onMounted: chosen
// during setup it is part of the first render, instead of appearing a frame
// later as a layout shift.
const quote = computed(() => INVESTING_QUOTES[Math.floor(Math.random() * INVESTING_QUOTES.length)]);
</script>

<template>
    <div class="auth">
        <aside class="auth__aside" :aria-label="t('auth.quoteRegion')">
            <RouterLink to="/login" class="auth__brand">
                <AppLogo :width="220" />
            </RouterLink>
            <figure v-if="quote" class="auth__quote">
                <blockquote>{{ quote.text }}</blockquote>
                <figcaption>— {{ quote.author }}</figcaption>
            </figure>
        </aside>

        <main class="auth__main">
            <div class="auth__panel">
                <AppLogo class="auth__brand-compact" :width="180" />
                <header class="auth__header">
                    <h1 class="auth__title">{{ title }}</h1>
                    <p v-if="subtitle !== null" class="auth__subtitle">{{ subtitle }}</p>
                </header>
                <slot />
            </div>
        </main>
    </div>
</template>

<style lang="scss" scoped>
.auth {
    display: flex;

    // 100dvh accounts for mobile browser chrome, which 100vh does not; the vh
    // is the fallback for anything that does not know dvh, and must come first.
    min-height: 100vh;
    min-height: 100dvh;
    background: $color-bg;
}

.auth__aside {
    display: none;

    @include above($bp-lg) {
        display: flex;
        flex: 1 1 0;
        flex-direction: column;
        justify-content: space-between;
        padding: $space-7;
        background: $color-surface;
        color: $color-text-muted;
    }
}

.auth__brand {
    color: $color-text;
}

.auth__quote {
    margin: 0;
    max-width: 46ch;

    blockquote {
        margin: 0 0 $space-3;
        font-size: $font-size-lg;
        line-height: $line-height-body;
        color: $color-text;
    }

    figcaption {
        font-size: $font-size-sm;
    }
}

.auth__main {
    display: flex;
    flex: 1 1 0;
    align-items: center;
    justify-content: center;
    padding: $space-5;
}

.auth__panel {
    width: 100%;
    max-width: 380px;
}

// The compact mark stands in for the aside on narrow screens, where the aside
// is not rendered at all.
.auth__brand-compact {
    margin: 0 auto $space-5;
    color: $color-text;

    @include above($bp-lg) {
        display: none;
    }
}

.auth__header {
    margin-bottom: $space-5;
}

.auth__title {
    margin: 0 0 $space-1;
    font-size: $font-size-2xl;
}

.auth__subtitle {
    margin: 0;
    font-size: $font-size-sm;
    color: $color-text-muted;
}
</style>
