# syntax=docker/dockerfile:1

# ---------- build stage ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Build the SvelteKit app (adapter-node -> build/) and drop dev deps
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- runtime stage ----------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
# PUBLIC_API_URL and PUBLIC_SITE_URL are read at runtime ($env/dynamic/public).
# Do NOT bake a value here — provide them when running the container, e.g.:
#   docker run -e PUBLIC_API_URL=https://api.your-domain/api -e PUBLIC_SITE_URL=https://your-domain ...
# (or via docker-compose / your host's env). If unset, the app falls back to localhost.
WORKDIR /app

COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/',r=>process.exit(r.statusCode<500?0:1)).on('error',()=>process.exit(1))"

USER node
CMD ["node", "build"]
