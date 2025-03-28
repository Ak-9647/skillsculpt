# ---- Base Node ----
  FROM node:20-alpine AS base
  LABEL maintainer="SkillSculpt Development <your-email@example.com>"
  WORKDIR /app
  
  # ---- Dependencies ----
  FROM base AS deps
  WORKDIR /app
  COPY package*.json ./
  RUN \
    if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi
  
  # ---- Builder ----
  FROM base AS builder
  WORKDIR /app
  # NO ARG declarations
  
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  
  # Modified RUN step: Create .env.production from secrets auto-mounted as files by Cloud Build in /workspace/.secrets/
  RUN \
    echo "--- Checking secrets in /workspace/.secrets ---" && \
    # List the files Cloud Build should have created (Use ls -la for more detail)
    ls -la /workspace/.secrets && \
    # Read secret content from files into shell variables
    # Using || true to prevent failure if a file is unexpectedly missing/empty during debug
    # Use the env var names defined in cloudbuild.yaml's availableSecrets section
    API_KEY=$(cat /workspace/.secrets/FIREBASE_API_KEY || true) && \
    AUTH_DOMAIN=$(cat /workspace/.secrets/FIREBASE_AUTH_DOMAIN || true) && \
    PROJECT_ID=$(cat /workspace/.secrets/FIREBASE_PROJECT_ID || true) && \
    STORAGE_BUCKET=$(cat /workspace/.secrets/FIREBASE_STORAGE_BUCKET || true) && \
    MESSAGING_SENDER_ID=$(cat /workspace/.secrets/FIREBASE_MESSAGING_SENDER_ID || true) && \
    APP_ID=$(cat /workspace/.secrets/FIREBASE_APP_ID || true) && \
    \
    # Create .env.production using the shell variables
    echo "NEXT_PUBLIC_FIREBASE_API_KEY=${API_KEY}" > .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${AUTH_DOMAIN}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT_ID}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${STORAGE_BUCKET}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${MESSAGING_SENDER_ID}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_APP_ID=${APP_ID}" >> .env.production && \
    \
    echo "--- Created .env.production ---" && \
    cat .env.production && \
    echo "--- Running Build ---" && \
    if [ -f yarn.lock ]; then yarn build; \
    elif [ -f package-lock.json ]; then npm run build; \
    elif [ -f pnpm-lock.yaml ]; then pnpm build; \
    else echo "Lockfile not found." && exit 1; \
    fi
  
  # ---- Runner ----
  FROM base AS runner
  WORKDIR /app
  ENV NODE_ENV=production
  ENV PORT=8080
  RUN addgroup --system --gid 1001 nodejs
  RUN adduser --system --uid 1001 nextjs
  COPY --from=builder --chown=nextjs:nodejs /app/public ./public
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
  USER nextjs
  EXPOSE 8080
  CMD ["node", "server.js"]