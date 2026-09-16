# syntax=docker/dockerfile:1

FROM node:22-alpine AS base

# --- deps: instala dependencias (cache separado do codigo-fonte) ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: gera os dois clients (src/lib/db.ts importa ambos de forma
# estatica, mesmo so usando um em runtime) e o build standalone ---
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npx prisma generate --config=prisma.config.production.ts
RUN npm run build

# --- runtime: imagem final minima, so o output standalone ---
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PROVIDER=postgresql
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
