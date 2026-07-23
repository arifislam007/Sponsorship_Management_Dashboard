FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
COPY sql ./sql
EXPOSE 5003
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:5003/api/health || exit 1
CMD ["node", "src/server.js"]
