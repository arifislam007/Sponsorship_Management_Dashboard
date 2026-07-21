FROM node:22-alpine AS build

WORKDIR /frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN node ./node_modules/vite/bin/vite.js build

FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
