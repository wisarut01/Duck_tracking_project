# One Dockerfile for the three Go programs. Build from the repo root:
#   docker build -f services/go.Dockerfile --build-arg SERVICE=auth-service .
# (docker compose does this for you, see docker-compose.yml)

# 1) Generate the gRPC code from proto/ (it is not committed)
FROM bufbuild/buf:1.75.0 AS gen
WORKDIR /work/proto
COPY proto/ .
RUN buf generate   # proto/buf.gen.yaml → ../gen/go and ../gen/python

# 2) Build a static binary
FROM golang:1.27 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY --from=gen /work/gen gen
COPY services/ services/
ARG SERVICE
RUN CGO_ENABLED=0 go build -trimpath -o /out/app ./services/${SERVICE}

# 3) Small runtime image (alpine, so the healthcheck can use wget)
FROM alpine:3.20
COPY --from=build /out/app /usr/local/bin/app
COPY api/openapi.yaml /app/openapi.yaml
ENV OPENAPI_PATH=/app/openapi.yaml
USER nobody
ENTRYPOINT ["/usr/local/bin/app"]
