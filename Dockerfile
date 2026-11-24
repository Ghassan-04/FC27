<<<<<<< HEAD
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production PORT=3000
EXPOSE 3000

# Do not run as root
USER node

CMD ["node", "server.js"]
=======
FROM node

WORKDIR /app

COPY package*.json .

RUN npm install
COPY . . 
EXPOSE 3000
ENV PORT=3000

CMD ["npm", "start"]



>>>>>>> 34b23df9b90a8b29dc8db3facffc21cad1b306b5
