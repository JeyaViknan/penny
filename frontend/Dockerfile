# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Baked in at build time -- the production deployment target is Netlify
# (build-time env var), this image is for local docker-compose only.
ARG VITE_API_BASE_URL=http://localhost:8080
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Presence of this marks the build as a demo; it must match the API's
# PENNY_DEMO_PASSWORD or the one-click role logins will not authenticate.
ARG VITE_DEMO_PASSWORD=
ENV VITE_DEMO_PASSWORD=$VITE_DEMO_PASSWORD
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
