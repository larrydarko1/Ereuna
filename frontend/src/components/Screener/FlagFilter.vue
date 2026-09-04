<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { value = null, busy = false } = defineProps<{
    value?: { enabled: boolean } | null;
    busy?: boolean;
}>();

const emit = defineEmits<{ apply: [{ enabled: boolean }] }>();

const { t } = useI18n();
</script>

<template>
    <label class="flag-filter">
        <input
            type="checkbox"
            :checked="value?.enabled === true"
            :disabled="busy"
            @change="emit('apply', { enabled: ($event.target as HTMLInputElement).checked })" />
        <span>{{ t('screener.flagOn') }}</span>
    </label>
</template>

<style lang="scss" scoped>
.flag-filter {
    display: flex;
    gap: $space-2;
    align-items: center;
    font-size: $font-size-sm;
    cursor: pointer;
}
</style>
