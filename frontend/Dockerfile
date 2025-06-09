FROM oven/bun:canary-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN bun i

COPY . .

RUN bun run build

# Stage 2: Minimal
FROM alpine:3.18


RUN apk add --no-cache nodejs

WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app && \
    chown -R nextjs:nodejs /app

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', res => res.statusCode === 200 ? process.exit(0) : process.exit(1))" || exit 1

EXPOSE 3000

CMD ["node", "server.js"]
