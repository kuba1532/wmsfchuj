# --- Etap 1: build aplikacji React (Vite) ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# W produkcji front woła API przez ten sam origin: /api/v1 (proxy w nginx),
# dzięki czemu nie ma problemów z CORS i wszystko idzie przez HTTPS.
ENV VITE_API_URL=/api/v1
RUN npm run build

# --- Etap 2: serwowanie statyków przez nginx + proxy do backendu ---
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
