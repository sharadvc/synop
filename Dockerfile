# Synop — self-host with Docker
#
# Builds the Next.js app and serves it against the Postgres database from
# docker-compose. Database tables are auto-created on first boot (db push),
# so `docker compose up --build` is all you need.

FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer-cached). npm ci keeps devDependencies so
# the `prisma` CLI is available at boot for `db push`.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# Build the app. .dockerignore keeps the host's node_modules/.next out.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Create/update tables on every boot (idempotent), then serve the app.
CMD ["sh", "-c", "npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate && npm run start"]
