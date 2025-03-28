# ---- Base Node ----
  FROM node:20-alpine AS base
  LABEL maintainer="SkillSculpt Development <your-email@example.com>"
  WORKDIR /app
  
  # ---- Dependencies ----
  FROM base AS deps
  WORKDIR /app
  COPY package*.json ./
  # Ensure clean RUN command for dependencies
  RUN \
    if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi
  
  # ---- Builder ----
  FROM base AS builder
  WORKDIR /app
  # NO ARG declarations needed here anymore
  
  COPY --from=deps /app/node_modules ./node_modules
  COPY . .
  
  # Modify RUN step: Add printenv for debugging
  RUN \
    echo "--- Checking Env Vars INSIDE Docker Build Step ---" && \
    printenv | grep FIREBASE_ && \
    echo "--------------------------------------------------" && \
    # Now create the .env.production file
    echo "NEXT_PUBLIC_FIREBASE_API_KEY=${FIREBASE_API_KEY}" > .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID}" >> .env.production && \
    echo "NEXT_PUBLIC_FIREBASE_APP_ID=${FIREBASE_APP_ID}" >> .env.production && \
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
  # Add back user/group setup
  RUN addgroup --system --gid 1001 nodejs
  RUN adduser --system --uid 1001 nextjs
  # Add back COPY commands for runner stage from builder
  COPY --from=builder --chown=nextjs:nodejs /app/public ./public
  COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
  # Add back USER instruction
  USER nextjs
  EXPOSE 8080
  # Restore the correct CMD to start the server
  CMD ["node", "server.js"]