import type { Config } from 'tailwindcss'

/**
 * Tailwind v4 reads design tokens from `src/app/globals.css` (`@theme inline`).
 * This file mirrors font stacks for tooling and any JS-based Tailwind integrations.
 */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-orbitron)', 'sans-serif'],
        mono: ['var(--font-orbitron)', 'sans-serif'],
        code: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        'bg-app': '#0E0F11',
        'bg-surface': '#1A1C20',
        'bg-elevated': '#252830',
        'border-subtle': '#2E3038',
        'text-primary': '#E8E6E0',
        'text-secondary': '#8A8880',
        'text-disabled': '#4A4845',
        danger: '#A84040',
        'accent-primary': '#1E6FD9',
        'accent-primary-hover': '#2B7FEE',
        'accent-primary-muted': '#1E3A5F',
        'accent-teal': '#4A7C7E',
        'accent-gold': '#c8a84b',
      },
    },
  },
} satisfies Config
