FROM node:20-alpine AS client-deps
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci

FROM client-deps AS client-build
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3001
WORKDIR /app

COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist

EXPOSE 3001
USER node
CMD ["node", "server/server.js"]
