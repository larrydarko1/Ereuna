/**
 * The read side of a `Delegate`: what a caller sees when it is handed
 * something to subscribe to.
 */
export type Callback<T1 = void, T2 = void, T3 = void> = (param1: T1, param2: T2, param3: T3) => void;

export type SubscribeOptions = {
    // What owns the subscription, so that unsubscribeAll can drop every listener
    // an object registered without each of them having to be named again
    linkedObject?: unknown;

    // Dropped after the first fire
    singleshot?: boolean;
};

export type ISubscription<T1 = void, T2 = void, T3 = void> = {
    subscribe(callback: Callback<T1, T2, T3>, options?: SubscribeOptions): void;
    unsubscribe(callback: Callback<T1, T2, T3>): void;
    unsubscribeAll(linkedObject: unknown): void;
};
