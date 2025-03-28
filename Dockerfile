# ---- Simplified Dockerfile for Parsing Test ----
  FROM node:20-alpine AS base
  WORKDIR /app
  
  # ---- Dependencies ----
  COPY package*.json ./
  RUN \
    if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
    else echo "Lockfile not found." && exit 1; \
    fi
  
  # ---- Code Copy ----
  COPY . .
  
  # ---- Simple Command (No Build) ----
  # We are not running build or setting complex ENV vars here.
  # Just seeing if this basic structure parses and runs a simple command.
  CMD ["ls", "-la"]