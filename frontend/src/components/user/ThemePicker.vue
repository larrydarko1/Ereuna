<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SettingCard from '@/components/user/SettingCard.vue';
import { useTheme } from '@/composables/ui/useTheme';

const { t } = useI18n();
const { currentTheme, themes, applyTheme } = useTheme();

// Grouped rather than badged: three of the fifty-two are light, and someone
// looking for one of them should not have to read every tile to find it
const groups = computed(() =>
    (['dark', 'light'] as const)
        .map((mode) => ({ mode, entries: themes.filter((theme) => theme.mode === mode) }))
        .filter((group) => group.entries.length > 0),
);
</script>

<template>
    <SettingCard :title="t('user.themes.title')" :description="t('user.themes.description')">
        <div v-for="group in groups" :key="group.mode" class="themes__group">
            <h3 class="themes__heading">{{ t(`user.themes.${group.mode}`) }}</h3>

            <ul class="themes__grid">
                <li v-for="theme in group.entries" :key="theme.id">
                    <button
                        type="button"
                        class="themes__card"
                        :class="{ 'themes__card--active': currentTheme === theme.id }"
                        :aria-pressed="currentTheme === theme.id"
                        @click="applyTheme(theme.id)"
                    >
                        <span class="themes__swatches" aria-hidden="true">
                            <span
                                v-for="(color, key) in theme.preview"
                                :key="key"
                                class="themes__swatch"
                                :style="{ background: color }"
                            ></span>
                        </span>
                        <span class="themes__label">{{ theme.label }}</span>
                    </button>
                </li>
            </ul>
        </div>
    </SettingCard>
</template>

<style lang="scss" scoped>
/* –––––– Groups –––––– */

.themes__group + .themes__group {
    margin-top: $space-5;
}

.themes__heading {
    margin: 0 0 $space-2;
    font-size: $font-size-xs;
    font-weight: $font-weight-medium;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.themes__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: $space-2;
    margin: 0;
    padding: 0;
    list-style: none;
}

/* –––––– Tiles –––––– */

.themes__card {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    width: 100%;
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-sunken;
    cursor: pointer;
    transition: border-color $duration-fast $ease-out;

    &:hover {
        border-color: $color-accent-1;
    }
}

.themes__card--active {
    border-color: $color-accent-1;
    box-shadow: inset 0 0 0 1px $color-accent-1;
}

.themes__swatches {
    display: flex;
    overflow: hidden;
    height: 28px;
    border-radius: $radius-sm;
}

.themes__swatch {
    flex: 1;
}

.themes__label {
    font-size: $font-size-xs;
    color: $color-text;
    text-align: start;
}
</style>
