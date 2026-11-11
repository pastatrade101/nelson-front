# Emnel Adventures — Frontend

Public marketing site + admin CMS for Emnel Adventures, built with SvelteKit, Tailwind CSS, GSAP, Lenis, and Three.js (Threlte).

## Stack
- SvelteKit 2 + Svelte 5
- Tailwind CSS 3
- GSAP + Lenis (animation / smooth scroll)
- Three.js via `@threlte/core` / `@threlte/extras`
- Vite

## Scripts
```bash
npm install
npm run dev      # vite dev server
npm run build    # production build
npm run preview  # preview the build
npm run check    # svelte-check
```

## Environment variables
Copy `.env.example` to `.env`:

| Variable | Purpose |
|---|---|
| `PUBLIC_API_URL` | Base URL of the backend API, e.g. `https://your-backend.onrender.com/api` |

`PUBLIC_*` variables are exposed to the browser by design — only put non-secret config here.

## Deploy
1. Set `PUBLIC_API_URL` to your deployed backend's `/api` URL.
2. Install a SvelteKit adapter for your host (e.g. `@sveltejs/adapter-vercel`, `-netlify`, or `-node`) — the project currently uses `@sveltejs/adapter-auto`.
3. Build command: `npm install && npm run build`
4. Output/start depends on the chosen adapter.

The admin CMS lives under `/admin`; the public website is everything else.
