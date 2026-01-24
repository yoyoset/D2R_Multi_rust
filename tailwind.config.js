/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                void: "#09090b", // Deepest background
                card: "#18181b", // Content surface
                primary: "rgb(var(--color-primary) / <alpha-value>)", // Dynamic Theme Color
                secondary: "#a1a1aa", // Zinc-400
                border: "#27272a", // Zinc-800
                gold: {
                    DEFAULT: "#d4af37",
                    light: "#fcf6ba",
                    dark: "#aa8a2e",
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                'void': '0 0 0 1px #27272a', // Subtle border ring
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
