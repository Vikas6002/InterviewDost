FROM oven/bun:1.3 AS build

ARG BACKEND_URL=http://localhost:3001

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN BACKEND_URL=$BACKEND_URL bun run build.ts

FROM nginx:alpine AS runner

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
