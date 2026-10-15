# Pinned to active LTS: npm@latest dropped Node 25 (odd/non-LTS), and user
# projects target LTS. Re-verify when bumping major versions.
FROM node:24-alpine

# Install system dependencies.
# git/python3/make/g++: clone + native modules (node-gyp)
# bash/curl/ca-certificates/findutils/grep: postinstall scripts, healthchecks,
#   and the `grep -rl | xargs sed -i` asset-path fix used by the build routes.
RUN apk update && apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    bash \
    curl \
    ca-certificates \
    findutils \
    grep \
    && npm install -g npm@latest \
    && corepack enable \
    && corepack prepare pnpm@latest --activate \
    && corepack prepare yarn@stable --activate \
    && pnpm -v && yarn -v \
    && git config --global --add safe.directory '*'

# Set working directory (mounted from host: /var/sandbox/workspace:/workspace)
WORKDIR /workspace

# Keep the runner alive so the server can `exec` into it via dockerode
# (container must be named `sandbox-runner`, see run command below).
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -v && test -d /workspace || exit 1

# Set default command
CMD ["tail", "-f", "/dev/null"]

# Build image:
#  docker build -t sandbox-runner:latest .

# Create / keep container ready (idempotent — removes a stale one first):
#  sudo mkdir -p /var/sandbox/workspace
#  docker rm -f sandbox-runner 2>/dev/null; \
#  docker run -d \
#    --name sandbox-runner \
#    --restart always \
#    -v /var/sandbox/workspace:/workspace \
#    sandbox-runner:latest
#
# Verify:
#  docker exec sandbox-runner node -v
#  docker exec sandbox-runner npm -v
#  docker exec sandbox-runner pnpm -v
#  docker exec sandbox-runner yarn -v
#  docker exec sandbox-runner git --version
