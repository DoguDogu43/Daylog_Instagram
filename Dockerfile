# syntax=docker/dockerfile:1

FROM node:20 AS builder
ARG INSECURE_NPM=0
WORKDIR /app
COPY package.json package-lock.json ./
RUN if [ "$INSECURE_NPM" = "1" ]; then npm config set strict-ssl false; fi && npm ci
COPY . .
RUN npm run build && npm run build:server

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-dist ./server-dist
COPY --from=builder /app/server.mjs ./server.mjs
EXPOSE 3000
CMD ["node", "server.mjs"]
