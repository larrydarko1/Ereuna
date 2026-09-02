/** useMarketStatus — whether the US market is open, and why not when it is shut. */
import { computed, onScopeDispose, readonly, ref, type ComputedRef, type Ref } from 'vue';
import { getHolidays, type MarketHoliday } from '@/api/market';

export type MarketStatus = 'open' | 'closed' | 'holiday';

export type UseMarketStatusReturn = {
    status: ComputedRef<MarketStatus>;
    holidayName: ComputedRef<string | null>;
    pending: Readonly<Ref<boolean>>;
};

/**
 * How often the badge re-reads the clock.
 * The only transitions are the open and the close, so a half-minute of lag on
 * a boundary crossed twice a day is not worth a timer per second — which is
 * what the old chart ran, alongside a second one for a countdown.
 */
const TICK_MS = 30_000;

const OPEN_MINUTES = 9 * 60 + 30;
const CLOSE_MINUTES = 16 * 60;
const WEEKEND = new Set(['Sat', 'Sun']);

const NY_TIME = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
});

const NY_DATE = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

// Module scope: the calendar is the same for every chart on the page and for
// every chart the user opens afterwards.
const holidays = ref<MarketHoliday[]>([]);
const pending = ref(true);
let loaded: Promise<void> | null = null;

/**
 * Whether the market is open right now.
 * `alwaysOpen` covers crypto, which has no session and no holidays — passing
 * the exchange in rather than deciding here keeps this free of any opinion
 * about what an exchange name means.
 */
export function useMarketStatus(alwaysOpen: () => boolean): UseMarketStatusReturn {
    const now = ref(new Date());
    const timer = window.setInterval(() => {
        now.value = new Date();
    }, TICK_MS);
    onScopeDispose(() => window.clearInterval(timer));

    void loadHolidays();

    const today = computed(() => NY_DATE.format(now.value));
    const holiday = computed(() => holidays.value.find((entry) => entry.date === today.value) ?? null);

    const status = computed<MarketStatus>(() => {
        if (alwaysOpen()) return 'open';
        if (holiday.value !== null) return 'holiday';
        return isSessionTime(now.value) ? 'open' : 'closed';
    });

    const holidayName = computed(() => (status.value === 'holiday' ? (holiday.value?.name ?? null) : null));

    return { status, holidayName, pending: readonly(pending) };
}

function loadHolidays(): Promise<void> {
    loaded ??= getHolidays()
        .then(({ data }) => {
            holidays.value = data.Holidays ?? [];
        })
        .catch(() => {
            // A missing calendar costs the holiday label, not the badge: the
            // session hours are arithmetic and still answer open or closed.
            holidays.value = [];
        })
        .finally(() => {
            pending.value = false;
        });

    return loaded;
}

function isSessionTime(now: Date): boolean {
    const parts = NY_TIME.formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((p) => p.type === type)?.value ?? '';

    if (WEEKEND.has(part('weekday'))) return false;

    const minutes = Number(part('hour')) * 60 + Number(part('minute'));
    return minutes >= OPEN_MINUTES && minutes < CLOSE_MINUTES;
}
