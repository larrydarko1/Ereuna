/**
 * The theme manifest — every theme the stylesheet defines, with the four
 * swatches a picker needs to draw a preview without mounting the theme.
 * Derived from `styles/_themes.scss`, which is the source of truth: the maps
 * there emit the CSS, and this list only names them. The old app kept the
 * names in three separate JavaScript arrays, which is how `tokyo-night` ended
 * up in the picker with no stylesheet behind it and three real themes
 * (jellybeans, falcon, forest-night) ended up unreachable.
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
        id: 'colorblind',
        label: 'Colorblind',
        mode: 'dark',
        preview: { bg: '#181926', surface: '#23243a', accent: '#0072B5', text: '#F7F7F7' },
    },
    {
        id: 'catpuccin',
        label: 'Catppuccin',
        mode: 'dark',
        preview: { bg: '#1e1e2e', surface: '#181825', accent: '#729e6e', text: '#cdd6f4' },
    },
    {
        id: 'black',
        label: 'Black',
        mode: 'dark',
        preview: { bg: '#000000', surface: '#010B13', accent: '#8c8dfe', text: '#ffffff' },
    },
    {
        id: 'nord',
        label: 'Nord',
        mode: 'dark',
        preview: { bg: '#2e3440', surface: '#3b4252', accent: '#88c0d0', text: '#eceff4' },
    },
    {
        id: 'dracula',
        label: 'Dracula',
        mode: 'dark',
        preview: { bg: '#282a36', surface: '#44475a', accent: '#bd93f9', text: '#f8f8f2' },
    },
    {
        id: 'gruvbox',
        label: 'Gruvbox',
        mode: 'dark',
        preview: { bg: '#282828', surface: '#3c3836', accent: '#fe8019', text: '#ebdbb2' },
    },
    {
        id: 'solarized',
        label: 'Solarized',
        mode: 'dark',
        preview: { bg: '#002b36', surface: '#073642', accent: '#268bd2', text: '#839496' },
    },
    {
        id: 'synthwave',
        label: 'Synthwave',
        mode: 'dark',
        preview: { bg: '#2b213a', surface: '#241b2f', accent: '#f92aad', text: '#fff' },
    },
    {
        id: 'github-dark',
        label: 'GitHub Dark',
        mode: 'dark',
        preview: { bg: '#0d1117', surface: '#161b22', accent: '#58a6ff', text: '#c9d1d9' },
    },
    {
        id: 'everforest',
        label: 'Everforest',
        mode: 'dark',
        preview: { bg: '#2d353b', surface: '#343f44', accent: '#83c092', text: '#d3c6aa' },
    },
    {
        id: 'ayu-dark',
        label: 'Ayu Dark',
        mode: 'dark',
        preview: { bg: '#0a0e14', surface: '#1f2430', accent: '#ffb454', text: '#b3b1ad' },
    },
    {
        id: 'rose-pine',
        label: 'Rosé Pine',
        mode: 'dark',
        preview: { bg: '#191724', surface: '#1f1d2e', accent: '#ebbcba', text: '#e0def4' },
    },
    {
        id: 'material',
        label: 'Material',
        mode: 'dark',
        preview: { bg: '#212121', surface: '#2b2b2b', accent: '#82aaff', text: '#eeffff' },
    },
    {
        id: 'one-dark',
        label: 'One Dark',
        mode: 'dark',
        preview: { bg: '#282c34', surface: '#353b45', accent: '#61afef', text: '#abb2bf' },
    },
    {
        id: 'night-owl',
        label: 'Night Owl',
        mode: 'dark',
        preview: { bg: '#011627', surface: '#0e293f', accent: '#82aaff', text: '#d6deeb' },
    },
    {
        id: 'panda',
        label: 'Panda',
        mode: 'dark',
        preview: { bg: '#292a2b', surface: '#1f2023', accent: '#ff75b5', text: '#e6e6e6' },
    },
    {
        id: 'monokai-pro',
        label: 'Monokai Pro',
        mode: 'dark',
        preview: { bg: '#2d2a2e', surface: '#403e41', accent: '#ffd866', text: '#fcfcfa' },
    },
    {
        id: 'tomorrow-night',
        label: 'Tomorrow Night',
        mode: 'dark',
        preview: { bg: '#1d1f21', surface: '#282a2e', accent: '#c66', text: '#c5c8c6' },
    },
    {
        id: 'oceanic-next',
        label: 'Oceanic Next',
        mode: 'dark',
        preview: { bg: '#1b2b34', surface: '#343d46', accent: '#6699cc', text: '#d8dee9' },
    },
    {
        id: 'palenight',
        label: 'Palenight',
        mode: 'dark',
        preview: { bg: '#292d3e', surface: '#333747', accent: '#82aaff', text: '#a6accd' },
    },
    {
        id: 'cobalt',
        label: 'Cobalt',
        mode: 'dark',
        preview: { bg: '#002240', surface: '#0c3764', accent: '#3a9bfd', text: '#f8f8f2' },
    },
    {
        id: 'poimandres',
        label: 'Poimandres',
        mode: 'dark',
        preview: { bg: '#1b1e28', surface: '#272a34', accent: '#7390aa', text: '#e4f0fb' },
    },
    {
        id: 'github-light',
        label: 'GitHub Light',
        mode: 'light',
        preview: { bg: '#ffffff', surface: '#f6f8fa', accent: '#0550ae', text: '#1f2328' },
    },
    {
        id: 'neon',
        label: 'Neon',
        mode: 'dark',
        preview: { bg: '#000000', surface: '#0a0a0a', accent: '#00ffff', text: '#ffffff' },
    },
    {
        id: 'moonlight',
        label: 'Moonlight',
        mode: 'dark',
        preview: { bg: '#1e2030', surface: '#222436', accent: '#82aaff', text: '#c8d3f5' },
    },
    {
        id: 'nightfox',
        label: 'Nightfox',
        mode: 'dark',
        preview: { bg: '#192330', surface: '#212e3f', accent: '#719cd6', text: '#cdcecf' },
    },
    {
        id: 'spacemacs',
        label: 'Spacemacs',
        mode: 'dark',
        preview: { bg: '#292b2e', surface: '#212026', accent: '#4f97d7', text: '#b2b2b2' },
    },
    {
        id: 'borland',
        label: 'Borland',
        mode: 'dark',
        preview: { bg: '#0000aa', surface: '#000088', accent: '#ffff54', text: '#ffffff' },
    },
    {
        id: 'amber',
        label: 'Amber',
        mode: 'dark',
        preview: { bg: '#2c1700', surface: '#402200', accent: '#ffb000', text: '#ffb000' },
    },
    {
        id: 'cyberpunk',
        label: 'Cyberpunk',
        mode: 'dark',
        preview: { bg: '#1a1a2e', surface: '#16213e', accent: '#f3e600', text: '#ffffff' },
    },
    {
        id: 'matrix',
        label: 'Matrix',
        mode: 'dark',
        preview: { bg: '#000000', surface: '#001100', accent: '#00ff41', text: '#00ff41' },
    },
    {
        id: 'sunset',
        label: 'Sunset',
        mode: 'dark',
        preview: { bg: '#1c1c1c', surface: '#2c2c2c', accent: '#ff9e64', text: '#e4e4e4' },
    },
    {
        id: 'deep-ocean',
        label: 'Deep Ocean',
        mode: 'dark',
        preview: { bg: '#0f111a', surface: '#1f2233', accent: '#84ffff', text: '#eeffff' },
    },
    {
        id: 'gotham',
        label: 'Gotham',
        mode: 'dark',
        preview: { bg: '#0c1014', surface: '#11151c', accent: '#599cab', text: '#d3ebe9' },
    },
    {
        id: 'retro',
        label: 'Retro',
        mode: 'dark',
        preview: { bg: '#2c2b2a', surface: '#3c3b3a', accent: '#ff8080', text: '#f0e3ca' },
    },
    {
        id: 'spotify',
        label: 'Spotify',
        mode: 'dark',
        preview: { bg: '#121212', surface: '#181818', accent: '#1db954', text: '#ffffff' },
    },
    {
        id: 'autumn',
        label: 'Autumn',
        mode: 'dark',
        preview: { bg: '#2e2a24', surface: '#3e3a34', accent: '#d08770', text: '#d8dee9' },
    },
    {
        id: 'noctis',
        label: 'Noctis',
        mode: 'dark',
        preview: { bg: '#1c2431', surface: '#263041', accent: '#7dcfff', text: '#d3e8f8' },
    },
    {
        id: 'iceberg',
        label: 'Iceberg',
        mode: 'dark',
        preview: { bg: '#161821', surface: '#1e2132', accent: '#84a0c6', text: '#c6c8d1' },
    },
    {
        id: 'tango',
        label: 'Tango',
        mode: 'dark',
        preview: { bg: '#2e3436', surface: '#3f4446', accent: '#729fcf', text: '#d3d7cf' },
    },
    {
        id: 'horizon',
        label: 'Horizon',
        mode: 'dark',
        preview: { bg: '#1c1e26', surface: '#232530', accent: '#da103f', text: '#fdf0ed' },
    },
    {
        id: 'railscasts',
        label: 'Railscasts',
        mode: 'dark',
        preview: { bg: '#2b2b2b', surface: '#333333', accent: '#6d9cbe', text: '#e6e1dc' },
    },
    {
        id: 'vscode-dark',
        label: 'VS Code Dark',
        mode: 'dark',
        preview: { bg: '#1e1e1e', surface: '#252526', accent: '#0078d4', text: '#d4d4d4' },
    },
    {
        id: 'slack-dark',
        label: 'Slack Dark',
        mode: 'dark',
        preview: { bg: '#1a1d21', surface: '#222529', accent: '#2eb67d', text: '#e6e6e6' },
    },
    {
        id: 'mintty',
        label: 'Mintty',
        mode: 'dark',
        preview: { bg: '#000000', surface: '#1c1c1c', accent: '#3e999f', text: '#c0c0c0' },
    },
    {
        id: 'atom-one',
        label: 'Atom One',
        mode: 'dark',
        preview: { bg: '#282c34', surface: '#2c313a', accent: '#4d78cc', text: '#abb2bf' },
    },
    {
        id: 'jellybeans',
        label: 'Jellybeans',
        mode: 'dark',
        preview: { bg: '#151515', surface: '#1c1c1c', accent: '#8197bf', text: '#e8e8d3' },
    },
    {
        id: 'falcon',
        label: 'Falcon',
        mode: 'dark',
        preview: { bg: '#020221', surface: '#0a0a2a', accent: '#ff875f', text: '#d8d8d8' },
    },
    {
        id: 'forest-night',
        label: 'Forest Night',
        mode: 'dark',
        preview: { bg: '#272e33', surface: '#323c41', accent: '#89b482', text: '#d3c6aa' },
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
