FROM node:24.15.0-bookworm-slim@sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde
ENV KLH_BASE_IMAGE_DIGEST=sha256:152aceace5c03e2597988763165ee33e3fd3633636db0fc983cd2e126b02cfde
ARG KLH_REPOSITORY_SHA
LABEL org.opencontainers.image.revision=$KLH_REPOSITORY_SHA
WORKDIR /opt/klh-probe
COPY --chown=node:node probe.mjs ./probe.mjs
USER node
ENTRYPOINT ["node", "probe.mjs"]
