# ERP 2026 — api-gateway image (root Dockerfile; multi-service images under docker/)
# Build: docker build -t erp/api-gateway:latest .
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc nest-cli.json tsconfig.json ./
COPY apps ./apps
COPY scripts ./scripts

RUN pnpm install --no-frozen-lockfile

# Fail the build if gateway TypeScript does not compile (no || true)
RUN rm -rf apps/api-gateway/dist \
  && pnpm --filter api-gateway run build

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4005

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api-gateway ./apps/api-gateway
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

EXPOSE 4005
CMD ["node", "apps/api-gateway/dist/main.js"]
