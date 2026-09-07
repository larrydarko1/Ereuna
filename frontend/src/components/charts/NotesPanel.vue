<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { apiErrorMessage } from '@/api/client';
import { createNote, deleteNote, getNotes, updateNote, type NoteRow } from '@/api/note';
import AppIcon from '@/components/ui/AppIcon.vue';
import { useResource } from '@/composables/data/useResource';
import { formatDate } from '@/utils/formatters';

const { symbol } = defineProps<{ symbol: string }>();

/** The API's own ceiling. Enforcing it here keeps a rejected write out of the round trip. */
const MAX_LENGTH = 5000;

const { t } = useI18n();

const { data, pending, error, mutate } = useResource(
    () => symbol,
    async (current) => (await getNotes({ symbol: current, limit: 50 })).data.items,
    { enabled: (current): boolean => current !== '' },
);

const draft = ref('');
const saving = ref(false);
const writeError = ref<string | null>(null);
const editingId = ref<string | null>(null);
const editDraft = ref('');

const notes = computed<NoteRow[]>(() => data.value ?? []);
const tooLong = computed(() => draft.value.length > MAX_LENGTH);
const canSave = computed(() => draft.value.trim() !== '' && !tooLong.value && !saving.value);

async function save(): Promise<void> {
    if (!canSave.value) return;
    saving.value = true;
    writeError.value = null;
    try {
        const { data: note } = await createNote(symbol, draft.value.trim());
        // Newest first, matching the order the list read returns.
        mutate([note, ...notes.value]);
        draft.value = '';
    } catch (err) {
        writeError.value = apiErrorMessage(err, t('notes.saveFailed'));
    } finally {
        saving.value = false;
    }
}

function startEdit(note: NoteRow): void {
    editingId.value = note.id;
    editDraft.value = note.message;
    writeError.value = null;
}

function cancelEdit(): void {
    editingId.value = null;
    editDraft.value = '';
}

async function saveEdit(id: string): Promise<void> {
    const message = editDraft.value.trim();
    if (message === '' || message.length > MAX_LENGTH) return;

    const previous = data.value;
    if (previous === null) return;

    saving.value = true;
    writeError.value = null;
    try {
        const { data: note } = await updateNote(id, message);
        mutate(previous.map((row) => (row.id === id ? note : row)));
        cancelEdit();
    } catch (err) {
        writeError.value = apiErrorMessage(err, t('notes.updateFailed'));
    } finally {
        saving.value = false;
    }
}

async function remove(id: string): Promise<void> {
    const previous = data.value;
    if (previous === null) return;
    // The row is under the pointer: waiting a round trip to see it go reads as
    // a dead click, so it leaves now and comes back if the write fails.
    mutate(previous.filter((note) => note.id !== id));
    try {
        await deleteNote(id);
    } catch (err) {
        mutate(previous);
        writeError.value = apiErrorMessage(err, t('notes.deleteFailed'));
    }
}
</script>

<template>
    <form
        class="notes__composer"
        @submit.prevent="save">
        <label
            class="notes__label"
            :for="`note-${symbol}`"
            >{{ t('notes.newNote') }}</label
        >
        <textarea
            :id="`note-${symbol}`"
            v-model="draft"
            class="notes__input"
            rows="3"
            :maxlength="MAX_LENGTH"
            :placeholder="t('notes.placeholder')"></textarea>
        <div class="notes__actions">
            <span class="notes__count">{{ draft.length }}/{{ MAX_LENGTH }}</span>
            <button
                type="submit"
                class="notes__save"
                :disabled="!canSave"
                >{{ t('common.save') }}</button
            >
        </div>
    </form>

    <p
        v-if="writeError !== null"
        class="notes__note notes__note--error"
        role="alert"
        >{{ writeError }}</p
    >

    <p
        v-if="pending"
        class="notes__note"
        >{{ t('sidebar.loading') }}</p
    >
    <p
        v-else-if="error !== null"
        class="notes__note"
        >{{ error }}</p
    >
    <p
        v-else-if="notes.length === 0"
        class="notes__note"
        >{{ t('sidebar.noNotesAvailable') }}</p
    >

    <ul
        v-else
        class="notes">
        <li
            v-for="note in notes"
            :key="note.id"
            class="notes__item">
            <p class="notes__meta">
                <time
                    v-if="note.updatedAt === note.createdAt"
                    :datetime="note.createdAt">
                    {{ t('sidebar.created') }} {{ formatDate(note.createdAt) }}
                </time>
                <time
                    v-else
                    :datetime="note.updatedAt">
                    {{ t('sidebar.edited') }} {{ formatDate(note.updatedAt) }}
                </time>
                <span class="notes__controls">
                    <button
                        v-if="editingId !== note.id"
                        type="button"
                        class="notes__control"
                        :aria-label="t('notes.editNote')"
                        @click="startEdit(note)">
                        <AppIcon name="pencil" />
                    </button>
                    <button
                        type="button"
                        class="notes__control notes__control--delete"
                        :aria-label="t('notes.deleteNote')"
                        @click="remove(note.id)">
                        <AppIcon name="close" />
                    </button>
                </span>
            </p>

            <!-- Editing one row swaps the message for the same textarea the composer uses -->
            <form
                v-if="editingId === note.id"
                class="notes__composer"
                @submit.prevent="saveEdit(note.id)">
                <textarea
                    v-model="editDraft"
                    class="notes__input"
                    rows="3"
                    :maxlength="MAX_LENGTH"
                    :aria-label="t('notes.editNote')"></textarea>
                <div class="notes__actions">
                    <span class="notes__count">{{ editDraft.length }}/{{ MAX_LENGTH }}</span>
                    <span class="notes__buttons">
                        <button
                            type="button"
                            class="notes__cancel"
                            @click="cancelEdit">
                            {{ t('common.cancel') }}
                        </button>
                        <button
                            type="submit"
                            class="notes__save"
                            :disabled="editDraft.trim() === '' || saving">
                            {{ t('common.save') }}
                        </button>
                    </span>
                </div>
            </form>
            <p
                v-else
                class="notes__message"
                >{{ note.message }}</p
            >
        </li>
    </ul>
</template>

<style lang="scss" scoped>
.notes__composer {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    margin-bottom: $space-3;
}

.notes__item .notes__composer {
    margin-top: $space-1;
    margin-bottom: 0;
}

.notes__label {
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.notes__input {
    width: 100%;
    padding: $space-2;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: $color-bg;
    color: $color-text;
    font-family: inherit;
    font-size: $font-size-sm;
    resize: vertical;
}

.notes__actions {
    display: flex;
    gap: $space-2;
    align-items: center;
    justify-content: space-between;
}

.notes__count {
    color: $color-text-muted;
    font-size: $font-size-xs;
    font-variant-numeric: tabular-nums;
}

.notes__save {
    padding: $space-1 $space-3;
    border: none;
    border-radius: $radius-sm;
    background: $color-accent-1;
    color: $color-text-inverted;
    font-size: $font-size-xs;
    cursor: pointer;

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
}

.notes {
    margin: 0;
    padding: 0;
    list-style: none;
}

.notes__item + .notes__item {
    margin-top: $space-2;
    padding-top: $space-2;
    border-top: $border-width solid $color-elevated;
}

.notes__meta {
    display: flex;
    gap: $space-2;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-xs;
}

.notes__controls,
.notes__buttons {
    display: flex;
    gap: $space-2;
    align-items: center;
}

.notes__control {
    border: none;
    background: none;
    color: $color-text-muted;
    cursor: pointer;

    &:hover {
        color: $color-text;
    }
}

.notes__control--delete:hover {
    color: $color-negative;
}

.notes__cancel {
    padding: $space-1 $space-3;
    border: $border-width solid $color-elevated;
    border-radius: $radius-sm;
    background: none;
    color: $color-text-muted;
    font-size: $font-size-xs;
    cursor: pointer;

    &:hover {
        color: $color-text;
    }
}

.notes__message {
    margin: $space-1 0 0;
    color: $color-text;
    font-size: $font-size-sm;
    line-height: $line-height-body;
    overflow-wrap: anywhere;
}

.notes__note {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}

.notes__note--error {
    color: $color-negative;
}
</style>
