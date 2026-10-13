FROM node:24.15.0-bookworm-slim
WORKDIR /app
COPY experiments/shared ./experiments/shared
COPY experiments/node/adapter.mjs experiments/node/server.mjs ./experiments/node/
USER 10001:10001
ENV KLH_BENCH_LISTEN_HOST=0.0.0.0 TZ=Asia/Shanghai
CMD ["node", "experiments/node/server.mjs"]
