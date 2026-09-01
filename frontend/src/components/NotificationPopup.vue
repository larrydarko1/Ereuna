<script setup lang="ts">
/**
 * MIGRATION SCAFFOLDING — delete with the last unmigrated view.
 *
 * Eleven views still mount their own copy of this and raise a message through a
 * template ref. Rather than keep a second toast implementation alive for them,
 * this forwards into the one queue that AppToasts renders, and draws nothing
 * itself. The `show` signature is unchanged so those views need no edit until
 * their own batch.
 *
 * Replacement: `notify` / `notifyError` from @/composables/ui/useNotifications,
 * which any code can call — no ref, no mounted component.
 * Remaining consumers: charts/panel, charts/panel2, charts/WatchPanel,
 * charts/WatchPanelEditor, charts/ImportWatchlist, and the Charts, Screener,
 * Portfolio and User views.
 */
import { notify } from '@/composables/ui/useNotifications';

/** Accepts the same loose input the old component did: string, Error, or a
 *  response body with a message somewhere in it. */
function show(msg: unknown): void {
    notify(extractMessage(msg));
}

function extractMessage(msg: unknown): string {
    if (typeof msg === 'string') return msg;
    if (msg == null) return '';
    if (msg instanceof Error) return msg.message;
    if (Array.isArray(msg)) return msg.filter((entry) => typeof entry === 'string').join('; ');
    if (typeof msg === 'object') {
        const record = msg as Record<string, unknown>;
        const nested = record.data as Record<string, unknown> | undefined;
        const candidates = [record.message, record.msg, record.error, nested?.message, nested?.error];
        const found = candidates.find((entry) => typeof entry === 'string' && entry.trim() !== '');
        if (typeof found === 'string') return found;
    }
    return String(msg);
}

defineExpose({ show });
</script>

<template><!-- Rendering is AppToasts' job; this is a queue adapter. --></template>
