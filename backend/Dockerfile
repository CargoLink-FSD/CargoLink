# ── Stage 1: Install production dependencies ────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# ── Stage 2: Production image ───────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
ENV PORT=8080 NODE_ENV=production
CMD ["node", "server.js"]
