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
    # --- Add ls command AFTER npm ci to check for node_modules ---
    RUN ls -la /app
    
    # ---- Builder ----
    FROM base AS builder
    WORKDIR /app # Explicitly set WORKDIR here too
    # Pass build arguments received from cloudbuild.yaml
    ARG NEXT_PUBLIC_FIREBASE_API_KEY
    ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ARG NEXT_PUBLIC_FIREBASE_APP_ID
    
    COPY --from=deps /app/node_modules ./node_modules # This is the step that failed previously
    COPY . .
    
    # Set ENV vars explicitly only for the build command, using ARGs
    RUN \
      export NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY && \
      export NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && \
      export NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID && \
      export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET && \
      export NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID && \
      export NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID && \
      echo "--- Checking ENV Vars before build ---" && \
      printenv | grep NEXT_PUBLIC_FIREBASE && \
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
    ENV PORT=8080 # Use PORT 8080 - common default expected by Cloud Run
    RUN addgroup --system --gid 1001 nodejs
    RUN adduser --system --uid 1001 nextjs
    COPY --from=builder --chown=nextjs:nodejs /app/public ./public
    COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
    COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
    USER nextjs
    EXPOSE 8080
    CMD ["node", "server.js"]