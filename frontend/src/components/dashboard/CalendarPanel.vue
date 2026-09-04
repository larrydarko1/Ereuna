<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCalendar, type CalendarEvent } from '@/api/market';
import { useResource } from '@/composables/data/useResource';
import { toDateInput } from '@/utils/formatters';

type Group = {
    key: 'earnings' | 'dividends' | 'splits';
    events: CalendarEvent[];
};

const { t } = useI18n();

const date = ref(toDateInput(new Date()));

const { data, pending, error } = useResource(
    () => date.value,
    async (day) => (await getCalendar(day)).data,
);

const groups = computed<Group[]>(() => [
    { key: 'earnings', events: data.value?.earnings ?? [] },
    { key: 'dividends', events: data.value?.dividends ?? [] },
    { key: 'splits', events: data.value?.splits ?? [] },
]);

const isEmpty = computed(() => groups.value.every((group) => group.events.length === 0));

/**
 * The one detail worth showing beside a symbol, per event type.
 * The ingestor attaches a different payload to each, so there is no single
 * field to read — and a row with the wrong number on it is worse than a row
 * with none.
 */
function detail(group: Group['key'], event: CalendarEvent): string | null {
    const value =
        group === 'earnings'
            ? event.details.estimate
            : group === 'dividends'
              ? event.details.amount
              : event.details.ratio;

    return typeof value === 'number' || typeof value === 'string' ? String(value) : null;
}
</script>

<template>
    <div class="calendar">
        <label class="calendar__picker">
            <span class="visually-hidden">{{ t('dashboard.calendar.date') }}</span>
            <input
                v-model="date"
                class="form-input"
                type="date" />
        </label>

        <p
            v-if="pending"
            class="calendar__note"
            >{{ t('dashboard.loading') }}</p
        >
        <p
            v-else-if="error !== null"
            class="calendar__note"
            role="alert"
            >{{ error }}</p
        >
        <p
            v-else-if="isEmpty"
            class="calendar__note"
            >{{ t('dashboard.calendar.empty') }}</p
        >

        <div
            v-else
            class="calendar__groups">
            <section
                v-for="group in groups"
                :key="group.key"
                class="calendar__group">
                <h3 class="calendar__title">
                    {{ t(`dashboard.calendar.${group.key}`) }}
                    <span class="calendar__count">{{ group.events.length }}</span>
                </h3>

                <ul
                    v-if="group.events.length > 0"
                    class="calendar__list">
                    <li
                        v-for="event in group.events"
                        :key="`${event.type}-${event.symbol}`"
                        class="calendar__row">
                        <span class="calendar__symbol">{{ event.symbol }}</span>
                        <span
                            v-if="detail(group.key, event) !== null"
                            class="calendar__detail">
                            {{ detail(group.key, event) }}
                        </span>
                    </li>
                </ul>
                <p
                    v-else
                    class="calendar__note"
                    >{{ t('dashboard.calendar.empty') }}</p
                >
            </section>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.calendar {
    display: flex;
    flex-direction: column;
    gap: 0.6em;
}

.calendar__picker {
    align-self: flex-start;
}

.calendar__groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 1em;
}

.calendar__group {
    display: flex;
    flex-direction: column;
    gap: 0.3em;
}

.calendar__title {
    display: flex;
    align-items: center;
    gap: 0.4em;
    margin: 0;
    font-size: $font-size-xs;
    font-weight: $font-weight-regular;
    color: $color-text-muted;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.calendar__count {
    padding: 0.1em 0.45em;
    border-radius: $radius-pill;
    background: $color-sunken;
    font-family: $font-mono;
}

.calendar__list {
    display: flex;
    flex-direction: column;
    gap: 0.15em;
    max-height: 220px;
    overflow-y: auto;
    margin: 0;
    padding: 0;
    list-style: none;
}

.calendar__row {
    display: flex;
    justify-content: space-between;
    gap: 0.5em;
    font-size: $font-size-sm;
}

.calendar__symbol {
    color: $color-text;
}

.calendar__detail {
    font-family: $font-mono;
    font-size: $font-size-xs;
    color: $color-text-muted;
}

.calendar__note {
    margin: 0;
    color: $color-text-muted;
    font-size: $font-size-sm;
}
</style>
