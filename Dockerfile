FROM node:22-slim

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY build/ ./build/

# OpenShift runs containers with an arbitrary UID in the root group (GID 0).
# Make /app owned by root group and group-writable so any injected UID can write.
RUN mkdir -p /app/data \
    && chown -R 1001:0 /app \
    && chmod -R g=u /app

USER 1001

ENV PORT=5173
EXPOSE 5173

CMD ["node", "build/index.js"]
