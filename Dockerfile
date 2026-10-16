# PICSite local LWR harness (mock data from src/mock), served with `lwr start`.
# This is a preview/demo image; the real site deploys to Experience Cloud with
# `sf project deploy` (see README).
#
# Base image is swappable, e.g. an Iron Bank Node 22 image:
#   docker compose build --build-arg NODE_IMAGE=registry1.dso.mil/ironbank/opensource/nodejs/nodejs22:<tag>
# It must be glibc-based (not Alpine): @napi-rs/lzma only ships a -gnu binary.
ARG NODE_IMAGE=node:22-slim

# ---- build: install locked dependencies, generate site/ ----
FROM ${NODE_IMAGE} AS build
WORKDIR /app

# Dependencies first so this layer is reused until package*.json change.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY lwr.config.json ./
COPY scripts ./scripts
COPY src ./src
COPY force-app/main/default/lwc ./force-app/main/default/lwc
RUN npm run build

# ---- runtime: built site plus the packages `lwr start` needs ----
FROM ${NODE_IMAGE}
# Non-root user that exists in the base image (official node images: "node").
ARG APP_USER=node
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY --from=build --chown=${APP_USER} /app/package.json /app/lwr.config.json ./
COPY --from=build --chown=${APP_USER} /app/node_modules ./node_modules
COPY --from=build --chown=${APP_USER} /app/site ./site
# lwr start creates __lwr_cache__/ in the app root at startup.
RUN chown ${APP_USER} /app

USER ${APP_USER}
EXPOSE 3000
# Call lwr directly (not through npm) so the server gets SIGTERM on `docker stop`.
CMD ["node", "node_modules/lwr/bin/lwr.js", "start"]
