# Build from the repo root (needs proto/):
#   docker build -f services/docs-service/Dockerfile .

# 1) Generate the gRPC code from proto/ (it is not committed)
FROM bufbuild/buf:1.75.0 AS gen
WORKDIR /work/proto
COPY proto/ .
RUN buf generate   # proto/buf.gen.yaml → ../gen/go and ../gen/python

FROM python:3.13-slim
WORKDIR /app
COPY services/docs-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=gen /work/gen/python gen/
COPY services/docs-service/docs_service docs_service/
ENV PYTHONPATH=/app/gen PYTHONUNBUFFERED=1
USER nobody
CMD ["python", "-m", "docs_service"]
