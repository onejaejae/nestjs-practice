# Stage 1: Build the application
FROM node:18 AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# Stage 2: Create the final production image
FROM node:18-alpine
WORKDIR /usr/src/app

# Copy production node_modules from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
# Copy compiled code from the builder stage
COPY --from=builder /usr/src/app/dist ./dist
# Copy package.json for runtime reference
COPY --from=builder /usr/src/app/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/main"]