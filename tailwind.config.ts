import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Static (non-branded) tokens
        midnight: '#1C1A16',
        bark: '#4A3728',
        charcoal: '#1C1A16',
        stone: '#888888',
        linen: '#E8E0D2',
        ivory: '#FAFAF7',
        moss: '#4A3728',
        skywash: '#E8E0D2',
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
        sans: ['DM Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
        heading: ['Cormorant Garamond', 'Georgia', 'serif'],
        admin: ['DM Sans', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 18px 50px rgba(28, 26, 22, 0.08)',
        // Attex-style soft card elevation
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        'card-hover': '0 8px 24px rgba(16, 24, 40, 0.10)'
      },
      // Emnel system: square buttons/cards. `full` remains available for
      // avatars, round icons, and the WhatsApp action.
      borderRadius: {
        sm: '0px',
        DEFAULT: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px'
      }
    }
  },
  plugins: []
} satisfies Config;
