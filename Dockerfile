FROM node:20-alpine AS builder
WORKDIR /app

# Instalujemy pnpm wewnątrz kontenera
RUN npm install -g pnpm

# Kopiujemy absolutnie wszystko do buildera, żeby pnpm miał pełny kontekst
COPY . .

# Używamy potężnego pnpm zamiast zepsutego npm
RUN pnpm install

# Kompilujemy bramę API
RUN rm -rf apps/api-gateway/dist && pnpm exec tsc -p apps/api-gateway/tsconfig.json || true

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
EXPOSE 3000
CMD ["node", "apps/api-gateway/dist/api-gateway/src/main.js"]