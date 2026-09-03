<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import AppDialog from '@/components/ui/AppDialog.vue';
import { downloadFile } from '@/utils/download';

const { codes } = defineProps<{ codes: readonly string[] }>();

const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();

const copied = ref(false);

async function copy(): Promise<void> {
    try {
        await navigator.clipboard.writeText(codes.join('\n'));
        copied.value = true;
    } catch {
        // Clipboard access is refused in some browsers and over plain HTTP.
        // The codes are on screen and downloadable, so this is not worth a toast
    }
}

function download(): void {
    downloadFile('ereuna-recovery-codes.txt', `${codes.join('\n')}\n`, 'text/plain');
}
</script>

<template>
    <AppDialog :title="t('user.security.codes.title')" :dismissible="false" @close="emit('close')">
        <p class="codes__lead">{{ t('user.security.codes.description') }}</p>

        <ul class="codes__list">
            <li v-for="code in codes" :key="code" class="codes__item">{{ code }}</li>
        </ul>

        <template #footer>
            <button type="button" class="btn" @click="copy">
                {{ copied ? t('user.security.codes.copied') : t('user.security.codes.copy') }}
            </button>
            <button type="button" class="btn" @click="download">{{ t('common.download') }}</button>
            <button type="button" class="btn btn--primary" @click="emit('close')">
                {{ t('user.security.codes.done') }}
            </button>
        </template>
    </AppDialog>
</template>

<style lang="scss" scoped>
.codes__lead {
    margin: 0 0 $space-3;
    font-size: $font-size-sm;
    line-height: $line-height-body;
    color: $color-text;
}

.codes__list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: $space-2;
    margin: 0;
    padding: 0;
    list-style: none;
}

.codes__item {
    padding: $space-2;
    border-radius: $radius-sm;
    background: $color-sunken;
    font-family: $font-mono;
    font-size: $font-size-sm;
    color: $color-text;
    text-align: center;
}
</style>
