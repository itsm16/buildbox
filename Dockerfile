FROM node:25-alpine

# Install system dependencies
RUN apk update && apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    && npm install -g npm@latest

# Set working directory
WORKDIR /workspace

# Set default command
CMD ["tail", "-f", "/dev/null"]

#  docker build -t sandbox-runner:latest .

# got img


# create container

# docker run -d \
#   --name sandbox-runner \
#   --restart always \
#   -v /var/sandbox/workspace:/workspace \
#   sandbox-runner:latest
