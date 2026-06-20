FROM oven/bun:1.3 AS build

WORKDIR /app

COPY package.json bun.lock ./
COPY prisma/ prisma/
RUN bun install --frozen-lockfile
RUN bunx prisma generate

FROM oven/bun:1.3 AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs appuser

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/generated generated
COPY . .

RUN chown -R appuser:nodejs /app

USER appuser

EXPOSE 3001

CMD ["bun", "run", "server.ts"]
