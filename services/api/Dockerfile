FROM node:22.22.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/sdk/package.json packages/sdk/package.json
COPY services/api/package.json services/api/package.json
COPY apps/control-ui/package.json apps/control-ui/package.json
RUN npm ci --ignore-scripts
COPY packages/sdk packages/sdk
COPY services/api services/api
RUN npm run build -w @nodi/sdk && npm run build -w @nodi/api \
 && npm prune --omit=dev

FROM node:22.22.0-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
RUN apt-get update \
 && apt-get install --no-install-recommends --yes gosu \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/packages/sdk/package.json ./packages/sdk/package.json
COPY --from=build --chown=node:node /app/packages/sdk/dist ./packages/sdk/dist
COPY --from=build --chown=node:node /app/services/api/package.json ./services/api/package.json
COPY --from=build --chown=node:node /app/services/api/dist ./services/api/dist
COPY --chown=node:node catalog ./catalog
COPY --chown=node:node examples ./examples
COPY services/api/entrypoint.sh /usr/local/bin/nodi-api-entrypoint
RUN chmod 0755 /usr/local/bin/nodi-api-entrypoint
EXPOSE 8787
ENTRYPOINT ["nodi-api-entrypoint"]
