FROM node:24-bookworm-slim

ENV CI=true WRANGLER_SEND_METRICS=false
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@12.10.1 && mkdir /app && chown node:node /app
USER node
WORKDIR /app

COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --store-dir /tmp/pnpm-store && rm -rf /tmp/pnpm-store

COPY --chown=node:node . .
RUN grep -q '^DEEPSEEK_API_KEY=..*' .dev.vars || { echo "Put DEEPSEEK_API_KEY in .dev.vars before building" >&2; exit 1; }
RUN pnpm db:seed && pnpm build

EXPOSE 4173
CMD ["pnpm", "exec", "vite", "preview", "--host", "0.0.0.0", "--port", "4173", "--strictPort"]
