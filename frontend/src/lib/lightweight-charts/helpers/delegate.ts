/**
 * A typed event emitter: one of these per thing that can be subscribed to.
 *
 * A subscriber may pass a `linkedObject` so that everything registered by one
 * owner can be dropped in a single call, which is how a destroyed widget stops
 * being called back without tracking each callback it added.
 */
import {
    type Callback,
    type ISubscription,
    type SubscribeOptions,
} from '@/lib/lightweight-charts/helpers/isubscription';

type Listener<T1, T2, T3> = {
    callback: Callback<T1, T2, T3>;
    linkedObject?: unknown;
    singleshot: boolean;
};

export class Delegate<T1 = void, T2 = void, T3 = void> implements ISubscription<T1, T2, T3> {
    private _listeners: Listener<T1, T2, T3>[] = [];

    public subscribe(callback: Callback<T1, T2, T3>, options: SubscribeOptions = {}): void {
        this._listeners.push({
            callback,
            linkedObject: options.linkedObject,
            singleshot: options.singleshot === true,
        });
    }

    public unsubscribe(callback: Callback<T1, T2, T3>): void {
        const index = this._listeners.findIndex((listener: Listener<T1, T2, T3>) => callback === listener.callback);
        if (index > -1) {
            this._listeners.splice(index, 1);
        }
    }

    public unsubscribeAll(linkedObject: unknown): void {
        this._listeners = this._listeners.filter(
            (listener: Listener<T1, T2, T3>) => listener.linkedObject !== linkedObject,
        );
    }

    public fire(param1: T1, param2: T2, param3: T3): void {
        const listenersSnapshot = [...this._listeners];
        this._listeners = this._listeners.filter((listener: Listener<T1, T2, T3>) => !listener.singleshot);
        listenersSnapshot.forEach((listener: Listener<T1, T2, T3>) => listener.callback(param1, param2, param3));
    }

    public hasListeners(): boolean {
        return this._listeners.length > 0;
    }

    public destroy(): void {
        this._listeners = [];
    }
}
