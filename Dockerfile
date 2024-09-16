FROM node:20-alpine AS base

RUN ["addgroup", "--system", "--gid", "1001", "nodejs"]
RUN ["adduser" , "--system", "--uid", "1001", "nodejs"]


FROM base AS build 

WORKDIR /app
COPY . .
RUN ["npm", "i", "-g", "pnpm", "prisma", "typescript"]
RUN ["pnpm", "i", "--frozen-lockfile"]
RUN ["pnpm", "run", "build"]


FROM base AS runner

WORKDIR /app
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
USER nodejs
ENV NODE_ENV production
ENV PORT     3000
EXPOSE 3000

ENTRYPOINT ["node", "dist/index.js"]
