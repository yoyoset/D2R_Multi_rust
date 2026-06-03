// Named UI theme (skin) — distinct from the legacy --color-primary accent.
// A theme only overrides the raw --c-* color channels defined in styles.css,
// so applying one re-skins both the Tailwind utilities and the semantic CSS.

export type ThemeId = 'forge' | 'obsidian' | 'daylight';

export interface ThemeMeta {
    id: ThemeId;
    /** i18n key for the display name */
    nameKey: string;
    /** representative swatch colors for the picker (bg, surface, accent) */
    swatch: [string, string, string];
}

export const THEMES: ThemeMeta[] = [
    { id: 'forge',    nameKey: 'theme_forge',    swatch: ['#0a0907', '#151210', '#d9a441'] },
    { id: 'obsidian', nameKey: 'theme_obsidian', swatch: ['#0d0f12', '#171b20', '#7da5d2'] },
    { id: 'daylight', nameKey: 'theme_daylight', swatch: ['#f4f3ef', '#fffefb', '#b07c26'] },
];

const STORAGE_KEY = 'd2r.theme';
const DEFAULT_THEME: ThemeId = 'forge';

export function getStoredTheme(): ThemeId {
    try {
        const v = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
        if (v && THEMES.some(t => t.id === v)) return v;
    } catch { /* ignore */ }
    return DEFAULT_THEME;
}

/** Apply a theme to the document root. `forge` is the :root default (no attr). */
export function applyTheme(theme: ThemeId): void {
    const root = document.documentElement;
    if (theme === 'forge') {
        root.removeAttribute('data-theme');
    } else {
        root.setAttribute('data-theme', theme);
    }
}

/** Apply + persist. */
export function setTheme(theme: ThemeId): void {
    applyTheme(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch { /* ignore */ }
}

/** Call once as early as possible (before first paint) to avoid a flash. */
export function initTheme(): void {
    applyTheme(getStoredTheme());
}
