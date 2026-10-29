# Preview-only image: no AuthService, MathService, SQLite, native addon or learning mounts.
FROM --platform=linux/amd64 node:24.15.0-bookworm-slim@sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/preview ./apps/preview
COPY packages/math-training/source ./packages/math-training/source
COPY apps/web/src/style.css ./apps/web/src/style.css
COPY apps/web/src/math/math.css ./apps/web/src/math/math.css
COPY scripts/math-full-01/build.ts ./scripts/math-full-01/build.ts
COPY docs/implementation/evidence/math-full-01/origins.json ./docs/implementation/evidence/math-full-01/origins.json
COPY docs/implementation/evidence/math-full-02/source.json ./docs/implementation/evidence/math-full-02/source.json
COPY docs/implementation/evidence/math-full-remainder/source.json ./docs/implementation/evidence/math-full-remainder/source.json
COPY docs/implementation/evidence/math-onepass/study-source.json ./docs/implementation/evidence/math-onepass/study-source.json
COPY docs/implementation/evidence/math-onepass/reading-source.json ./docs/implementation/evidence/math-onepass/reading-source.json
COPY docs/implementation/evidence/math-onepass/source-import.json ./docs/implementation/evidence/math-onepass/source-import.json
ARG KLH_BUILD_SHA
RUN npm install --global npm@11.12.1 && npm ci --ignore-scripts && KLH_BUILD_SHA="$KLH_BUILD_SHA" npm run build:math-preview

FROM --platform=linux/amd64 node:24.15.0-bookworm-slim@sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde
ARG KLH_BUILD_SHA
LABEL org.opencontainers.image.revision=$KLH_BUILD_SHA org.kevin-learning-home.mode=content-only-preview
ENV NODE_ENV=production KLH_PREVIEW_PORT=4179
WORKDIR /app
COPY package.json ./
COPY --from=build /app/node_modules/zod ./node_modules/zod
COPY --from=build /app/apps/preview/dist ./apps/preview/dist
COPY --from=build /app/apps/preview/content ./apps/preview/content
COPY apps/preview/reading ./apps/preview/reading
COPY apps/preview/library ./apps/preview/library
COPY apps/preview/practice ./apps/preview/practice
COPY packages/contracts/math-study.ts ./packages/contracts/math-study.ts
COPY packages/math-training/study.mjs ./packages/math-training/study.mjs
COPY packages/contracts/math-training.ts ./packages/contracts/math-training.ts
COPY packages/math-training/engine.mjs ./packages/math-training/engine.mjs
COPY packages/math-training/source ./packages/math-training/source
COPY apps/preview/training.ts ./apps/preview/training.ts
COPY apps/preview/server.ts apps/preview/content.ts apps/preview/contract.ts apps/preview/registry-meta.ts apps/preview/runtime.ts apps/preview/learning-map.ts ./apps/preview/
COPY apps/preview/adapters/source/shared/intro-visuals.mjs ./apps/preview/adapters/source/shared/intro-visuals.mjs
USER node
CMD ["node","apps/preview/server.ts"]
