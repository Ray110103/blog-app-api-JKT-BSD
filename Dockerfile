FROM node:24-bullseye
WORKDIR /app

# Copy package files and Prisma schema
COPY package.json ./
COPY package-lock.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the TypeScript application and copy generated Prisma client
RUN npm run build && mkdir -p dist/generated && cp -r src/generated/prisma dist/generated/

# Expose port
EXPOSE 8000

# Start the application
CMD ["node", "dist/index.js"]
