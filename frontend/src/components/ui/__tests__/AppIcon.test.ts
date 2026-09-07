import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import AppIcon from '@/components/ui/AppIcon.vue';
import { ICON_PATHS, type IconName } from '@/constants/icons';

const icon = (props: Record<string, unknown>): ReturnType<typeof mount> =>
    mount(AppIcon, { props: { name: 'close' as IconName, ...props } });

describe('AppIcon', () => {
    it('draws the path the registry holds for the name it was given', () => {
        expect(icon({ name: 'arrow-up' }).get('path').attributes('d')).toBe(ICON_PATHS['arrow-up']);
    });

    it('names itself in the markup, so a caller can be asserted on', () => {
        expect(icon({ name: 'check' }).get('svg').attributes('data-icon')).toBe('check');
    });

    it('is decorative by default — a labelled control speaks for it', () => {
        const svg = icon({}).get('svg');

        expect(svg.attributes('aria-hidden')).toBe('true');
        expect(svg.attributes('role')).toBeUndefined();
    });

    it('becomes an image with a name when it is the whole control', () => {
        const svg = icon({ label: 'Close' }).get('svg');

        expect(svg.attributes('role')).toBe('img');
        expect(svg.attributes('aria-label')).toBe('Close');
        expect(svg.attributes('aria-hidden')).toBeUndefined();
    });

    it('scales by the size it is given, keeping the box square', () => {
        const svg = icon({ size: 24 }).get('svg');

        expect(svg.attributes('width')).toBe('24');
        expect(svg.attributes('height')).toBe('24');
        expect(svg.attributes('viewBox')).toBe('0 0 24 24');
    });

    it('takes the colour it sits in rather than one of its own', () => {
        const svg = icon({}).get('svg');

        expect(svg.attributes('stroke')).toBe('currentColor');
        expect(svg.attributes('fill')).toBe('none');
    });

    it('adds the pupil the eye needs, and nothing to the icons that do not', () => {
        expect(icon({ name: 'eye' }).findAll('circle')).toHaveLength(1);
        expect(icon({ name: 'eye-off' }).findAll('circle')).toHaveLength(0);
    });

    it('has a path for every name it offers', () => {
        for (const name of Object.keys(ICON_PATHS) as IconName[]) {
            expect(icon({ name }).get('path').attributes('d')).not.toBe('');
        }
    });
});
