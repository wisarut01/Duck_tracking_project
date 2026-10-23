# Mock API image. The OpenAPI spec is NOT baked in — docker-compose mounts
# ../../api to /spec so the mock always validates against the latest spec.
FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV PORT=4010 OPENAPI_PATH=/spec/openapi.yaml
EXPOSE 4010
CMD ["node", "src/server.js"]
