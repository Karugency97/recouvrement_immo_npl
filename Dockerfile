FROM node:22-alpine AS base

# --- Dependencies stage ---
FROM base AS deps
WORKDIR /app

COPY apps/frontend/package.json ./
RUN npm install

# --- Build stage ---
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY apps/frontend/ ./

ARG NEXT_PUBLIC_DIRECTUS_URL
ENV NEXT_PUBLIC_DIRECTUS_URL=${NEXT_PUBLIC_DIRECTUS_URL}

# NEXT_PUBLIC_* are inlined by `next build` — they must exist as build args
# (Coolify forwards buildtime env vars automatically). lib/convex.ts throws
# at module scope when NEXT_PUBLIC_CONVEX_URL is missing, failing prerender.
ARG NEXT_PUBLIC_CONVEX_URL
ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL}
ARG NEXT_PUBLIC_LOGTO_ENDPOINT
ENV NEXT_PUBLIC_LOGTO_ENDPOINT=${NEXT_PUBLIC_LOGTO_ENDPOINT}
ARG NEXT_PUBLIC_LOGTO_APP_ID
ENV NEXT_PUBLIC_LOGTO_APP_ID=${NEXT_PUBLIC_LOGTO_APP_ID}
ARG NEXT_PUBLIC_LOGTO_RESOURCE
ENV NEXT_PUBLIC_LOGTO_RESOURCE=${NEXT_PUBLIC_LOGTO_RESOURCE}
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

RUN npm run build

# --- Production stage ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
