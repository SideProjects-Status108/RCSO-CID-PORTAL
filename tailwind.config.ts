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
        'accent-primary': '#1E6FD9',
        'accent-primary-hover': '#2B7FEE',
        'accent-primary-muted': '#1E3A5F',
        'accent-teal': '#4A7C7E',
        'accent-gold': '#c8a84b',
      },
    },
  },
} satisfies Config
