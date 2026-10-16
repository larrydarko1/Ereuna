import { describe, expect, it } from 'vitest';

import { targetOf } from '@/utils/dom';

const firedOn = (target: EventTarget): Event => {
    const event = new Event('input');
    target.dispatchEvent(event);
    return event;
};

describe('targetOf', () => {
    it('returns the target when it is the asked-for kind', () => {
        const input = document.createElement('input');
        expect(targetOf(firedOn(input), HTMLInputElement)).toBe(input);
    });

    it('throws for a target of another kind, naming both', () => {
        expect(() => targetOf(firedOn(document.createElement('select')), HTMLInputElement)).toThrow(
            'expected the input event to come from a HTMLInputElement',
        );
    });

    it('throws for an event never dispatched', () => {
        expect(() => targetOf(new Event('input'), HTMLInputElement)).toThrow(
            'expected the input event to come from a HTMLInputElement',
        );
    });
});
