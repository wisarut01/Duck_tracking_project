# One image with the whole backend, for a single Render free web service:
# auth / tracker / docs listen on 127.0.0.1 (gRPC) and the gateway on $PORT.
# Build from the repo root:  docker build -f deploy/render/Dockerfile .

# 1) gRPC code from proto/ (not committed)
FROM bufbuild/buf:1.75.0 AS gen
WORKDIR /work/proto
COPY proto/ .
RUN buf generate

# 2) the three Go programs
FROM golang:1.27 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY --from=gen /work/gen gen
COPY services/ services/
RUN for s in api-gateway auth-service tracker-service; do \
      CGO_ENABLED=0 go build -trimpath -o /out/$s ./services/$s || exit 1; \
    done

# 3) runtime: Python (for docs-service) + the Go binaries
FROM python:3.13-slim
WORKDIR /app
COPY services/docs-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=gen /work/gen/python gen/
COPY services/docs-service/docs_service docs_service/
COPY --from=build /out/ /usr/local/bin/
COPY api/openapi.yaml /app/openapi.yaml
COPY deploy/render/start.sh /app/start.sh
ENV PYTHONPATH=/app/gen PYTHONUNBUFFERED=1 OPENAPI_PATH=/app/openapi.yaml
USER nobody
CMD ["bash", "/app/start.sh"]
