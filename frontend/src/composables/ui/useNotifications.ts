/** Toast notifications — one module-scoped queue for the whole app. */
import { onScopeDispose, readonly, ref, type DeepReadonly, type Ref } from 'vue';

export type ToastTone = 'info' | 'success' | 'error';

export type Toast = {
    id: number;
    message: string;
    tone: ToastTone;
};

/** How long a toast stays up. Errors linger: they are the ones worth reading. */
const DURATION: Record<ToastTone, number> = {
    info: 4000,
    success: 4000,
    error: 8000,
};

/** Beyond this the stack covers the page it is describing. Oldest goes first. */
const MAX_VISIBLE = 4;

const timers = new Map<number, ReturnType<typeof setTimeout>>();

const items = ref<Toast[]>([]);

let nextId = 0;

export function notify(message: string, tone: ToastTone = 'info'): number {
    const id = ++nextId;
    items.value = [...items.value, { id, message, tone }].slice(-MAX_VISIBLE);
    timers.set(
        id,
        setTimeout(() => dismiss(id), DURATION[tone]),
    );
    return id;
}

export function notifyError(message: string): number {
    return notify(message, 'error');
}

export function notifySuccess(message: string): number {
    return notify(message, 'success');
}

export function dismiss(id: number): void {
    const timer = timers.get(id);
    if (timer !== undefined) {
        clearTimeout(timer);
        timers.delete(id);
    }
    items.value = items.value.filter((toast) => toast.id !== id);
}

/**
 * The queue, for the host component. Read-only on purpose: a toast is added
 * through `notify` so its dismissal timer is always registered with it, and a
 * caller that spliced the array directly would leak the timer.
 */
export function useNotifications(): {
    toasts: DeepReadonly<Ref<Toast[]>>;
    notify: typeof notify;
    notifyError: typeof notifyError;
    notifySuccess: typeof notifySuccess;
    dismiss: typeof dismiss;
} {
    return { toasts: readonly(items), notify, notifyError, notifySuccess, dismiss };
}

/** Clear the queue when the owning scope goes away — used by the host only. */
export function useNotificationCleanup(): void {
    onScopeDispose(dismissAll);
}

function dismissAll(): void {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    items.value = [];
}
