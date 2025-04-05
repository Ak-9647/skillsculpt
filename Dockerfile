# Dockerfile (Final Version - Includes ARG fix)

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
  
  # --- Add ARG declarations for build arguments ---
  ARG NEXT_PUBLIC_ENHANCE_FUNCTION_URL
  ARG NEXT_PUBLIC_SUGGEST_SKILLS_FUNCTION_URL
  ARG GOOGLE_CLOUD_PROJECT_ID
  # --- End ARG declarations ---
  
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  
  COPY FIREBASE_API_KEY_FILE /secrets/
  COPY FIREBASE_AUTH_DOMAIN_FILE /secrets/
  COPY FIREBASE_PROJECT_ID_FILE /secrets/
  COPY FIREBASE_STORAGE_BUCKET_FILE /secrets/
  COPY FIREBASE_MESSAGING_SENDER_ID_FILE /secrets/
  COPY FIREBASE_APP_ID_FILE /secrets/
  COPY FIREBASE_CLIENT_EMAIL_FILE /secrets/
  COPY FIREBASE_PRIVATE_KEY_FILE /secrets/
  
  # Modified RUN step: Create .env.production from secrets AND build args
  RUN \
    echo "--- Checking secrets copied into /secrets ---" && \
    ls -la /secrets && \
    API_KEY=$(cat /secrets/FIREBASE_API_KEY_FILE || true) && \
    AUTH_DOMAIN=$(cat /secrets/FIREBASE_AUTH_DOMAIN_FILE || true) && \
    PROJECT_ID=$(cat /secrets/FIREBASE_PROJECT_ID_FILE || true) && \
    STORAGE_BUCKET=$(cat /secrets/FIREBASE_STORAGE_BUCKET_FILE || true) && \
    MESSAGING_SENDER_ID=$(cat /secrets/FIREBASE_MESSAGING_SENDER_ID_FILE || true) && \
    APP_ID=$(cat /secrets/FIREBASE_APP_ID_FILE || true) && \
    CLIENT_EMAIL=$(cat /secrets/FIREBASE_CLIENT_EMAIL_FILE || true) && \
    PRIVATE_KEY=$(cat /secrets/FIREBASE_PRIVATE_KEY_FILE || true) && \
    \
    echo "NEXT_PUBLIC_FIREBASE_API_KEY=${API_KEY}" > .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${AUTH_DOMAIN}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${PROJECT_ID}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${STORAGE_BUCKET}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${MESSAGING_SENDER_ID}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_APP_ID=${APP_ID}" >> .env.production && \
    echo "NEXT_PUBLIC_ENHANCE_FUNCTION_URL=${NEXT_PUBLIC_ENHANCE_FUNCTION_URL}" >> .env.production && \
    echo "NEXT_PUBLIC_SUGGEST_SKILLS_FUNCTION_URL=${NEXT_PUBLIC_SUGGEST_SKILLS_FUNCTION_URL}" >> .env.production && \
    echo "GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID}" >> .env.production && \
    echo "FIREBASE_PROJECT_ID=${PROJECT_ID}" >> .env.production && \
    echo "FIREBASE_CLIENT_EMAIL=${CLIENT_EMAIL}" >> .env.production && \
    echo "FIREBASE_PRIVATE_KEY=${PRIVATE_KEY}" >> .env.production && \
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