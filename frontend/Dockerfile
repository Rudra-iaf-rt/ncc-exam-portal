# Step 1: Build stage
FROM node:22-alpine AS build
WORKDIR /app

# Accept build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_API_PREFIX
ARG VITE_COOKIE_AUTH

# Expose them as env variables so they are available during 'npm run build'
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_PREFIX=$VITE_API_PREFIX
ENV VITE_COOKIE_AUTH=$VITE_COOKIE_AUTH

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve stage
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
