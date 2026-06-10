/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Dark Forge Design System — driven by RGB-triplet CSS vars
                // defined in styles.css :root, so [data-theme] overrides re-skin
                // both these Tailwind utilities and the semantic .css classes.
                bg: 'rgb(var(--c-bg) / <alpha-value>)',
                'bg-2': 'rgb(var(--c-bg2) / <alpha-value>)',
                surface: {
                    DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
                    2: 'rgb(var(--c-surface2) / <alpha-value>)',
                    3: 'rgb(var(--c-surface3) / <alpha-value>)',
                },
                text: {
                    DEFAULT: 'rgb(var(--c-text) / <alpha-value>)',
                    dim: 'rgb(var(--c-text-dim) / <alpha-value>)',
                    faint: 'rgb(var(--c-text-faint) / <alpha-value>)',
                },
                // Each semantic color exposes 400/500/600 shades that all resolve
                // to the same CSS-var hue. Many components were written with
                // -400/-500/-600 shades (pre-migration); without these keys those
                // utilities resolve to nothing and render as the inherited (white)
                // color. Visual hierarchy comes from the opacity modifiers
                // (/5, /10, /20), not the shade number.
                gold: {
                    DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)',
                    400: 'rgb(var(--c-gold) / <alpha-value>)',
                    500: 'rgb(var(--c-gold) / <alpha-value>)',
                    600: 'rgb(var(--c-gold) / <alpha-value>)',
                    bright: 'rgb(var(--c-gold-bright) / <alpha-value>)',
                    deep: 'rgb(var(--c-gold-deep) / <alpha-value>)',
                },
                ember: {
                    DEFAULT: 'rgb(var(--c-ember) / <alpha-value>)',
                    400: 'rgb(var(--c-ember) / <alpha-value>)',
                    500: 'rgb(var(--c-ember) / <alpha-value>)',
                    600: 'rgb(var(--c-ember) / <alpha-value>)',
                },
                player: {
                    DEFAULT: 'rgb(var(--c-player) / <alpha-value>)',
                    400: 'rgb(var(--c-player) / <alpha-value>)',
                    500: 'rgb(var(--c-player) / <alpha-value>)',
                    600: 'rgb(var(--c-player) / <alpha-value>)',
                    deep: '#1f5e3a',
                },
                net: {
                    DEFAULT: 'rgb(var(--c-net) / <alpha-value>)',
                    400: 'rgb(var(--c-net) / <alpha-value>)',
                    500: 'rgb(var(--c-net) / <alpha-value>)',
                    600: 'rgb(var(--c-net) / <alpha-value>)',
                    deep: '#244a73',
                },
                ok: {
                    DEFAULT: 'rgb(var(--c-ok) / <alpha-value>)',
                    400: 'rgb(var(--c-ok) / <alpha-value>)',
                    500: 'rgb(var(--c-ok) / <alpha-value>)',
                    600: 'rgb(var(--c-ok) / <alpha-value>)',
                },
                warn: {
                    DEFAULT: 'rgb(var(--c-warn) / <alpha-value>)',
                    400: 'rgb(var(--c-warn) / <alpha-value>)',
                    500: 'rgb(var(--c-warn) / <alpha-value>)',
                    600: 'rgb(var(--c-warn) / <alpha-value>)',
                },
                danger: {
                    DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)',
                    400: 'rgb(var(--c-danger) / <alpha-value>)',
                    500: 'rgb(var(--c-danger) / <alpha-value>)',
                    600: 'rgb(var(--c-danger) / <alpha-value>)',
                },
                line: 'rgb(var(--c-line) / <alpha-value>)',
                // Legacy (a few un-migrated modal components still reference these)
                void: "#09090b",
                card: "#18181b",
                secondary: "#a1a1aa",
                border: "#27272a",
            },
            borderColor: {
                line: 'rgb(var(--c-line) / 0.10)',
                'line-2': 'rgb(var(--c-line) / 0.18)',
                'line-strong': 'rgb(var(--c-line) / 0.34)',
            },
            fontFamily: {
                display: ['Cinzel', 'Noto Serif SC', 'serif'],
                ui: ['IBM Plex Sans', 'Noto Sans SC', 'system-ui', 'sans-serif'],
                mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
                sans: ['IBM Plex Sans', 'Noto Sans SC', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                DEFAULT: '4px',
                lg: '7px',
            },
            boxShadow: {
                card: '0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.7)',
                // Legacy
                'void': '0 0 0 1px #27272a',
                'void-lg': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                'glow-gold-sm': '0 0 10px rgba(212, 175, 55, 0.3)',
                'glow-gold': '0 0 20px rgba(212, 175, 55, 0.4)',
                'glow-gold-lg': '0 0 35px rgba(212, 175, 55, 0.5)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow-pulse': 'glow-pulse 2s infinite',
            },
            keyframes: {
                'glow-pulse': {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(212, 175, 55, 0.3)' },
                    '50%': { boxShadow: '0 0 20px rgba(212, 175, 55, 0.6)' },
                }
            }
        },
    },
    plugins: [],
}
