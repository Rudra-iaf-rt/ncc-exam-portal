FROM node:22-alpine AS build

WORKDIR /app

# Native modules (bcrypt) may require build toolchain on Alpine.
RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY prisma/schema.prisma ./prisma/
RUN npm ci

COPY prisma ./prisma

COPY . .
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY --from=build /app/server.js ./server.js

USER node
EXPOSE 3000

CMD ["npm", "start"]