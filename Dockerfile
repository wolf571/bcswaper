# step build
FROM node:22-alpine AS builder
WORKDIR /app
COPY . .
RUN yarn cache clean
RUN yarn config set network-timeout 180000
RUN yarn config set registry https://registry.npmmirror.com
RUN yarn
RUN npx prisma migrate dev --name init
RUN npx prisma generate
RUN yarn build

# step run
FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# COPY --from=builder /app/.next/server ./.next/server
COPY --from=builder /app/.next/types ./.next/types
COPY --from=builder /app/messages ./messages
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

ENV NODE_ENV production
ENV HOSTNAME="0.0.0.0"
ENV PORT=9527
EXPOSE 9527

CMD ["node", "server.js"]