# ---- Base Node ----
    FROM node:20-alpine AS base
    LABEL maintainer="SkillSculpt Development <your-email@example.com>"
    WORKDIR /app
    
    # ---- Dependencies ----
    FROM base AS deps
    WORKDIR /app # Explicitly set WORKDIR here too
    COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
    RUN \
      if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
      elif [ -f package-lock.json ]; then npm ci; \
      elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
      else echo "Lockfile not found." && exit 1; \
      fi
    
    # ---- Builder ----
    FROM base AS builder
    WORKDIR /app # Explicitly set WORKDIR here too
    # ARG declarations still needed by cloudbuild.yaml even if not used directly in ENV below for this test
    ARG NEXT_PUBLIC_FIREBASE_API_KEY
    ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ARG NEXT_PUBLIC_FIREBASE_APP_ID
    
    # --- TEMPORARILY HARDCODE ENV VARS FOR PARSING TEST ---
    # Use simple strings instead of trying to substitute from ARGs
    ENV NEXT_PUBLIC_FIREBASE_API_KEY="DUMMY_API_KEY"
    ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="DUMMY_AUTH_DOMAIN"
    ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID="DUMMY_PROJECT_ID"
    ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="DUMMY_STORAGE_BUCKET"
    ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="DUMMY_SENDER_ID"
    ENV NEXT_PUBLIC_FIREBASE_APP_ID="DUMMY_APP_ID"
    
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    
    # Optional Debug: Print environment variables (will show DUMMY values)
    # RUN printenv | grep NEXT_PUBLIC_FIREBASE || true
    
    # Next.js build command (uses the hardcoded ENV vars above)
    RUN \
      if [ -f yarn.lock ]; then yarn build; \
      elif [ -f package-lock.json ]; then npm run build; \
      elif [ -f pnpm-lock.yaml ]; then pnpm build; \
      else echo "Lockfile not found." && exit 1; \
      fi
    
    # ---- Runner ----
    FROM base AS runner
    WORKDIR /app
    ENV NODE_ENV=production
    ENV PORT=8080 # Use PORT 8080 - common default expected by Cloud Run
    RUN addgroup --system --gid 1001 nodejs
    RUN adduser --system --uid 1001 nextjs
    COPY --from=builder --chown=nextjs:nodejs /app/public ./public
    # Copy the standalone server output
    COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
    # Copy static assets
    COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
    USER nextjs
    EXPOSE 8080 # Inform Docker that the container listens on this port
    # Correct CMD for standalone output (server.js is inside the standalone dir)
    CMD ["node", "server.js"]