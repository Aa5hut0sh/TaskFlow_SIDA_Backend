FROM oven/bun

WORKDIR /app

ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL


COPY ./package.json ./package.json
COPY ./bun.lock ./bun.lock

COPY . .


RUN bun install
RUN bunx prisma generate

EXPOSE 3001

CMD ["bun", "run","--cwd", "index.ts"]