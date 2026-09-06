import { describe, expect, it } from 'vitest';
import { externalUrl } from '@/utils/url';

describe('externalUrl', () => {
    it('passes an http and an https link through', () => {
        expect(externalUrl('https://example.com/story')).toBe('https://example.com/story');
        expect(externalUrl('http://example.com/story')).toBe('http://example.com/story');
    });

    it('normalises the URL rather than echoing the input', () => {
        expect(externalUrl('https://EXAMPLE.com')).toBe('https://example.com/');
    });

    it.each([
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
        'file:///etc/passwd',
    ])('refuses %s', (value) => {
        expect(externalUrl(value)).toBeNull();
    });

    it('refuses anything that is not a URL at all', () => {
        expect(externalUrl('example.com')).toBeNull();
        expect(externalUrl('')).toBeNull();
    });
});
