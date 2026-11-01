# syntax=docker/dockerfile:1.7
# ApoorvaSetu: one image serving the built SPA and the /api routes on a single port.
ARG NODE_IMAGE=node:24-bookworm-slim

# ---- 1. deps: full install (build tooling stays in this stage) ----------------
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
ENV NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---- 2. build: tsc -b + vite build, VITE_* inlined into the bundle ------------
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
COPY public ./public
COPY src ./src
COPY server ./server
RUN npm run build

# ---- 3. prod-deps: runtime node_modules only ---------------------------------
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---- 4. runner ---------------------------------------------------------------
FROM ${NODE_IMAGE} AS runner
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
# Only the modules the HTTP server imports. Add new server modules here.
COPY --chown=node:node server/index.ts server/aiService.ts server/authGuard.ts server/documentVerifier.ts ./server/
COPY --chown=node:node src/services/aiGuard.ts ./src/services/aiGuard.ts
COPY --chown=node:node src/data/platformKnowledgeBase.ts ./src/data/platformKnowledgeBase.ts

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node","-e","fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node","--experimental-strip-types","server/index.ts"]
