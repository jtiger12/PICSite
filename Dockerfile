# PICSite local LWR harness (mock data from src/mock), built with `lwr build`
# and served the way `lwr start` serves it. This is a preview/demo image; the
# real site deploys to Experience Cloud with `sf project deploy` (see README).
# Being the public demo, it also runs scripts/demo-rename.mjs over its copy of
# the sources before building, which turns every "Army" into "GSD".
#
# Base image is swappable, e.g. an Iron Bank Node 22 image:
#   docker compose build --build-arg NODE_IMAGE=registry1.dso.mil/ironbank/opensource/nodejs/nodejs22:<tag>
# It must be glibc-based (not Alpine): @napi-rs/lzma only ships a -gnu binary.
# Needs BuildKit (Docker 23+ / Compose v2) for the COPY heredoc below.
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
# Demo wording, applied to this image's copy of the sources only.
RUN node scripts/demo-rename.mjs src force-app/main/default/lwc && npm run build

# site/ is fully static: `lwr start` answers it with express.static before any
# LWR middleware runs. So the runtime takes only express and its dependency
# tree from the locked install, not LWR's ~600 MB toolchain.
RUN npm query '#express, #express *' \
    | node -e "const fs = require('fs'); for (const { location } of JSON.parse(fs.readFileSync(0, 'utf8'))) fs.cpSync(location, '/runtime/' + location, { recursive: true })" \
 && test -f /runtime/node_modules/express/package.json

# ---- runtime: built site plus express ----
FROM ${NODE_IMAGE}
# Non-root user that exists in the base image (official node images: "node").
ARG APP_USER=node
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY --from=build /runtime/node_modules ./node_modules
COPY --from=build /app/site ./site
# What `lwr start` does for site/: express.static over the build output, then
# LWR's plain-text 404 for anything else. Handles SIGTERM so `docker stop`
# returns at once (node as PID 1 otherwise ignores it until SIGKILL).
COPY <<'EOF' server.mjs
import express from 'express';

const port = Number(process.env.PORT) || 3000;
const app = express();
app.use(express.static('site'));
app.get('/*', (req, res) => {
    res.status(404).send(`404: Could not find view at "${escape(req.originalUrl)}"`);
});
const server = app.listen(port, () => {
    console.log(`Application is available at: http://localhost:${port}/`);
});
for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => server.close(() => process.exit(0)));
}
EOF

USER ${APP_USER}
EXPOSE 3000
CMD ["node", "server.mjs"]
