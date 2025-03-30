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
  
  # ADD COPY step: Copy secret files from /workspace (build context root) into /secrets
  # These files were created by the initial Cloud Build step (Step 0)
  COPY FIREBASE_API_KEY_FILE /secrets/
  COPY FIREBASE_AUTH_DOMAIN_FILE /secrets/
  COPY FIREBASE_PROJECT_ID_FILE /secrets/
  COPY FIREBASE_STORAGE_BUCKET_FILE /secrets/
  COPY FIREBASE_MESSAGING_SENDER_ID_FILE /secrets/
  COPY FIREBASE_APP_ID_FILE /secrets/
  
  # Modified RUN step: Create .env.production from secrets copied into /secrets
  RUN \
    echo "--- Checking secrets copied into /secrets ---" && \
    # List the files copied in the previous step
    ls -la /secrets && \
    # Read secret content from files in /secrets
    # Use '|| true' in case a secret file doesn't exist during local testing, prevent build fail
    API_KEY=$(cat /secrets/FIREBASE_API_KEY_FILE || true) && \
    AUTH_DOMAIN=$(cat /secrets/FIREBASE_AUTH_DOMAIN_FILE || true) && \
    PROJECT_ID=$(cat /secrets/FIREBASE_PROJECT_ID_FILE || true) && \
    STORAGE_BUCKET=$(cat /secrets/FIREBASE_STORAGE_BUCKET_FILE || true) && \
    MESSAGING_SENDER_ID=$(cat /secrets/FIREBASE_MESSAGING_SENDER_ID_FILE || true) && \
    APP_ID=$(cat /secrets/FIREBASE_APP_ID_FILE || true) && \
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