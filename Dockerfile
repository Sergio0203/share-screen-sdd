FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY public ./public
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "src/servidor.js"]
