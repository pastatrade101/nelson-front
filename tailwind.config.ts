import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Static (non-branded) tokens
        charcoal: '#1E1E1E',
        moss: '#6b8e23',
        skywash: '#e8f2f1',
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
      boxShadow: {
        soft: '0 18px 50px rgba(24, 33, 31, 0.08)'
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
