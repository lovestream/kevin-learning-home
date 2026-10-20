# Fixed linux/amd64 manifest digest, verified from Docker Registry v2 on 2026-10-20.
FROM --platform=linux/amd64 node:24.15.0-bookworm-slim@sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde AS build
WORKDIR /app
COPY . .
RUN npm install --global npm@11.12.1 && npm ci && npm run build && npm prune --omit=dev

FROM --platform=linux/amd64 node:24.15.0-bookworm-slim@sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde
ENV NODE_ENV=production KLH_HOST=0.0.0.0 KLH_CONTAINER=1 KLH_PORT=4177 KLH_DATA_DIR=/data KLH_MEDIA_DIR=/media KLH_CONTENT_DIR=/content
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY apps/server ./apps/server
COPY packages ./packages
COPY scripts/maintenance.ts scripts/healthcheck.ts ./scripts/
COPY --from=build /app/apps/web/dist ./apps/web/dist
RUN mkdir /data /media /content && chown node:node /data /media /content
USER node
EXPOSE 4177
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=3 CMD ["node","scripts/healthcheck.ts"]
CMD ["node","apps/server/main.ts"]
