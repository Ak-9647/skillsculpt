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
    # Pass build arguments received from cloudbuild.yaml
    ARG NEXT_PUBLIC_FIREBASE_API_KEY
    ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
    ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    ARG NEXT_PUBLIC_FIREBASE_APP_ID
    
    COPY --from=deps /app/node_modules ./node_modules
    COPY . .
    
    # Debug: Print environment variables (Optional - can be removed later)
    # RUN printenv | grep NEXT_PUBLIC_FIREBASE || true
    
    # Set ENV vars explicitly only for the build command, using ARGs
    RUN \
      NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
      NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
      NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
      # --- Run the actual build command --- (NO COMMENT HERE)
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