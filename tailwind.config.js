/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Dark Forge Design System
                bg: '#0a0907',
                'bg-2': '#0f0d0a',
                surface: { DEFAULT: '#151210', 2: '#1c1814', 3: '#241e18' },
                text: { DEFAULT: '#ece5d6', dim: '#9a9082', faint: '#6b6155' },
                gold: { DEFAULT: '#d9a441', bright: '#f1c870', deep: '#9c7322' },
                ember: '#c9663a',
                player: { DEFAULT: '#63c98c', deep: '#1f5e3a' },
                net: { DEFAULT: '#5b8fd6', deep: '#244a73' },
                ok: '#5bbf86',
                warn: '#d9a441',
                danger: '#cf5a44',
                // Legacy (for backward compat during migration)
                void: "#09090b",
                card: "#18181b",
                primary: "rgb(var(--color-primary) / <alpha-value>)",
                secondary: "#a1a1aa",
                border: "#27272a",
            },
            borderColor: {
                line: 'rgba(217,164,65,0.10)',
                'line-2': 'rgba(217,164,65,0.18)',
                'line-strong': 'rgba(217,164,65,0.34)',
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
                'glow-primary': '0 0 20px rgb(var(--color-primary) / 0.4)',
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
