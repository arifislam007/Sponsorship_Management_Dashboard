FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY sql ./sql
COPY .env.example .env

EXPOSE 5002

CMD ["npm", "start"]
