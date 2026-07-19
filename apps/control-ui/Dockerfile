FROM node:22.22.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/sdk/package.json packages/sdk/package.json
COPY apps/control-ui/package.json apps/control-ui/package.json
COPY services/api/package.json services/api/package.json
RUN npm ci --ignore-scripts
COPY packages/sdk packages/sdk
COPY apps/control-ui apps/control-ui
RUN npm run build -w @nodi/sdk && npm run build -w @nodi/control-ui

FROM nginxinc/nginx-unprivileged:1.29.5-alpine
COPY apps/control-ui/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/control-ui/dist /usr/share/nginx/html
EXPOSE 8080
