import { describe, expect, it } from 'vitest';

import { isTypingTarget } from '@/lib/charting/shared/key-target';

describe('isTypingTarget', () => {
    it.each([
        ['an input', (): EventTarget => document.createElement('input')],
        ['a textarea', (): EventTarget => document.createElement('textarea')],
    ])('is true for %s', (_label, make) => {
        expect(isTypingTarget(make())).toBe(true);
    });

    it('is true for an editable element', () => {
        const div = document.createElement('div');
        // jsdom leaves isContentEditable undefined rather than deriving it from the attribute
        Object.defineProperty(div, 'isContentEditable', { value: true });
        expect(isTypingTarget(div)).toBe(true);
    });

    it.each([
        ['a plain element', (): EventTarget | null => document.createElement('div')],
        ['the document', (): EventTarget | null => document],
        ['no target', (): EventTarget | null => null],
    ])('is false for %s', (_label, make) => {
        expect(isTypingTarget(make())).toBe(false);
    });
});
