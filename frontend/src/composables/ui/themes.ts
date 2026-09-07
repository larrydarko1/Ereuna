/**
 * The theme manifest — every theme the stylesheet defines, with the four
 * swatches a picker needs to draw a preview without mounting the theme.
 * Derived from `styles/_themes.scss`, which is the source of truth: the maps
 * there emit the CSS, and this list only names them. Six of them, three dark
 * and three light.
 */

export type ThemeId = (typeof THEMES)[number]['id'];

export type ThemeMeta = {
    id: string;
    label: string;
    mode: 'dark' | 'light';
    /** Swatches for the preview tile, straight from the theme's own map. */
    preview: { bg: string; surface: string; accent: string; text: string };
};

export const THEMES = [
    {
        id: 'default',
        label: 'Default',
        mode: 'dark',
        preview: { bg: '#1a1b26', surface: '#24283b', accent: '#7aa2f7', text: '#c0caf5' },
    },
    {
        id: 'ihatemyeyes',
        label: 'I Hate My Eyes',
        mode: 'light',
        preview: { bg: '#ffffff', surface: '#e9eaec', accent: '#5e7cbd', text: '#36454F' },
    },
    {
        id: 'catpuccin',
        label: 'Catppuccin',
        mode: 'dark',
        preview: { bg: '#1e1e2e', surface: '#181825', accent: '#729e6e', text: '#cdd6f4' },
    },
    {
        id: 'gruvbox',
        label: 'Gruvbox',
        mode: 'dark',
        preview: { bg: '#282828', surface: '#3c3836', accent: '#fe8019', text: '#ebdbb2' },
    },
    {
        id: 'github-light',
        label: 'GitHub Light',
        mode: 'light',
        preview: { bg: '#ffffff', surface: '#f6f8fa', accent: '#0550ae', text: '#1f2328' },
    },
    {
        id: 'light-owl',
        label: 'Light Owl',
        mode: 'light',
        preview: { bg: '#fbfbfb', surface: '#f0f0f0', accent: '#7e57c2', text: '#403f53' },
    },
] as const satisfies readonly ThemeMeta[];

export const DEFAULT_THEME: ThemeId = 'default';

/** Runtime guard — true when `value` names a theme the stylesheet actually defines. */
export function isThemeId(value: unknown): value is ThemeId {
    return typeof value === 'string' && THEMES.some((theme) => theme.id === value);
}
