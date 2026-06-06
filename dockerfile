FROM oven/bun

WORKDIR /app


COPY ./package.json ./package.json
COPY ./bun.lock ./bun.lock

COPY . .


RUN bun install
RUN bunx prisma generate

EXPOSE 3001

CMD ["bun", "run","--cwd", "index.ts"]