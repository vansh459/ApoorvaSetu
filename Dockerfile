# syntax=docker/dockerfile:1.7
# ApoorvaSetu: one image serving the built SPA, the /api routes and (optionally) Prisma.
ARG NODE_IMAGE=node:24-bookworm-slim

# ---- 0. base: Prisma's query engine probes libssl at runtime -------------------
FROM ${NODE_IMAGE} AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ---- 1. deps: full install (build tooling stays in this stage) ----------------
FROM base AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- 2. build: prisma client + tsc -b + vite build ---------------------------
FROM deps AS build
ARG VITE_DATA_MODE=demo
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_KEY=
ENV VITE_DATA_MODE=$VITE_DATA_MODE \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    NODE_OPTIONS=--max-old-space-size=2048
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts vitest.config.ts index.html ./
COPY prisma ./prisma
COPY public ./public
COPY src ./src
COPY server ./server
RUN npx prisma generate
RUN npm run build

# ---- 3. prod-deps: runtime node_modules only ---------------------------------
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate

# ---- 4. runner ---------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
# Prisma schema + migrations and the server's source imports. Nothing in src/ is web-served;
# the session/data API imports the shared workflow, RBAC and seed modules directly.
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node server ./server
COPY --chown=node:node src ./src
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD ["node","-e","fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["sh", "server/entrypoint.sh"]
