FROM node:24.15.0-bookworm-slim
WORKDIR /app
COPY experiments/shared ./experiments/shared
COPY experiments/node ./experiments/node
COPY tests/platform-parity ./tests/platform-parity
USER 10001:10001
ENV TZ=Asia/Shanghai KLH_BENCH_LISTEN_HOST=0.0.0.0 KLH_BENCH_MEDIA_LISTEN_HOST=0.0.0.0
CMD ["node", "experiments/node/nas-suite.mjs"]
