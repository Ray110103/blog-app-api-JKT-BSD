FROM node:24-bullseye
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma
RUN npm install
COPY . .
CMD ["npm", "start"]