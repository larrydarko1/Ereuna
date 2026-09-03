<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import SettingCard from '@/components/user/SettingCard.vue';
import { changeLocale, isSupportedLocale, SUPPORTED_LOCALES } from '@/i18n';
import { notifySuccess } from '@/composables/ui/useNotifications';

const { t, locale } = useI18n();

async function select(event: Event): Promise<void> {
    const value = (event.target as HTMLSelectElement).value;
    if (!isSupportedLocale(value)) return;
    await changeLocale(value);
    notifySuccess(t('user.language.changed'));
}
</script>

<template>
    <SettingCard :title="t('user.language.title')" :description="t('user.language.description')">
        <label class="form-field">
            <span class="form-label">{{ t('user.language.label') }}</span>
            <select class="form-input" :value="locale" @change="select">
                <option v-for="entry in SUPPORTED_LOCALES" :key="entry.code" :value="entry.code">
                    {{ entry.label }}
                </option>
            </select>
        </label>
        <p class="form-hint">{{ t('user.language.disclaimer') }}</p>
    </SettingCard>
</template>
