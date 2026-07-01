FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data
COPY --from=build /app/dist/standalone ./
COPY --from=build /app/dist/static ./dist/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
