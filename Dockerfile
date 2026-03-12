# Stage 1: Build
FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

# Stage 2: Serve
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 80
ENV PORT=80
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
