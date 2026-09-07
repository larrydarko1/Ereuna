<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import SettingCard from '@/components/user/SettingCard.vue';
import { isThemeId } from '@/composables/ui/themes';
import { useTheme } from '@/composables/ui/useTheme';

const { t } = useI18n();
const { currentTheme, themes, applyTheme } = useTheme();

// Grouped into two optgroups rather than badged: the only thing anyone sorts a
// theme by is whether it is dark or light
const groups = computed(() =>
    (['dark', 'light'] as const)
        .map((mode) => ({ mode, entries: themes.filter((theme) => theme.mode === mode) }))
        .filter((group) => group.entries.length > 0),
);

const active = computed(() => themes.find((theme) => theme.id === currentTheme.value) ?? themes[0]);

function select(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (isThemeId(value)) applyTheme(value);
}
</script>

<template>
    <SettingCard
        :title="t('user.themes.title')"
        :description="t('user.themes.description')">
        <label class="form-field">
            <span class="form-label">{{ t('user.themes.label') }}</span>
            <select
                :value="currentTheme"
                @change="select">
                <optgroup
                    v-for="group in groups"
                    :key="group.mode"
                    :label="t(`user.themes.${group.mode}`)">
                    <option
                        v-for="theme in group.entries"
                        :key="theme.id"
                        :value="theme.id">
                        {{ theme.label }}
                    </option>
                </optgroup>
            </select>
        </label>

        <!-- The swatches of whatever is selected, so the choice is not name-only -->
        <p
            v-if="active !== undefined"
            class="themes__preview">
            <span
                class="themes__swatches"
                aria-hidden="true">
                <span
                    v-for="(color, key) in active.preview"
                    :key="key"
                    class="themes__swatch"
                    :style="{ background: color }"></span>
            </span>
            <span class="form-hint">{{ active.label }}</span>
        </p>
    </SettingCard>
</template>

<style lang="scss" scoped>
/* –––––– Preview –––––– */

.themes__preview {
    display: flex;
    align-items: center;
    gap: $space-2;
    margin: 0;
}

.themes__swatches {
    display: flex;
    overflow: hidden;
    width: 96px;
    height: 20px;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
}

.themes__swatch {
    flex: 1;
}
</style>
