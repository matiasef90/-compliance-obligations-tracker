FROM node:20-slim

RUN npm install -g pnpm

WORKDIR /app

# Install deps (layer cache)
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 3000
CMD ["pnpm", "dev"]
