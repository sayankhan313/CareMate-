FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY prisma ./prisma
COPY prisma.config.ts ./

COPY tsconfig.json ./
COPY src ./src

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production

EXPOSE 5001

CMD ["npm", "start"]