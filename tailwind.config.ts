import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Static (non-branded) tokens
        charcoal: '#1E1E1E',
        moss: '#6b8e23',
        skywash: '#e8f2f1',
        // Theme surfaces — flip between light/dark via CSS variables (app.css).
        // `surface` = cards/inputs (was bg-white), `canvas` = page background,
        // `heading` = primary heading text (was text-deep-green in light).
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        heading: 'rgb(var(--c-heading) / <alpha-value>)',
        // Branded tokens — driven by CSS variables so the admin Branding page can
        // recolor the whole site at runtime. Defaults live in app.css :root and
        // match the original hex values exactly (no visual change by default).
        'deep-green': 'rgb(var(--c-deep-green) / <alpha-value>)',
        forest: 'rgb(var(--c-forest) / <alpha-value>)',
        'goldfinch-gold': 'rgb(var(--c-goldfinch-gold) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        clay: 'rgb(var(--c-clay) / <alpha-value>)',
        sand: 'rgb(var(--c-sand) / <alpha-value>)',
        savanna: 'rgb(var(--c-savanna) / <alpha-value>)'
      },
      fontFamily: {
        // Admin UI font (Attex-style). Public site keeps its default font.
        admin: ['Figtree', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 18px 50px rgba(24, 33, 31, 0.08)',
        // Attex-style soft card elevation
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        'card-hover': '0 8px 24px rgba(16, 24, 40, 0.10)'
      },
      // Tighter corners site-wide for a crisp, editorial tour feel.
      // `full` (pills/avatars) and `none` keep their Tailwind defaults.
      borderRadius: {
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
        lg: '5px',
        xl: '6px',
        '2xl': '8px',
        '3xl': '10px'
      }
    }
  },
  plugins: []
} satisfies Config;
