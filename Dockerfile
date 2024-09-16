FROM node:20-alpine AS base

RUN ["addgroup", "--system", "--gid", "1001", "nodejs"]
RUN ["adduser" , "--system", "--uid", "1001", "nodejs"]


FROM base AS dependencies

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN ["npm", "i", "-g", "pnpm", "prisma"]
RUN ["pnpm", "i", "--frozen-lockfile", "--prod"]


FROM base AS build

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN ["npm", "run", "build"]


FROM base AS runner

WORKDIR /app
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
USER nodejs
ENV NODE_ENV production
ENV PORT     3000
EXPOSE 3000

ENTRYPOINT ["node", "dist/index.js"]
