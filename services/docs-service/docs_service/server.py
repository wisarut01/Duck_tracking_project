"""docs-service — spaces and the page tree. gRPC: proto/docs/v1/docs.proto

Env:
    DATABASE_URL    postgresql+psycopg://tb:tb@localhost:5432/docs_db
    GRPC_ADDR       [::]:50053
    SEED_DEMO_DATA  "true" = add the demo spaces ENG/PM when there are no spaces
"""

import logging
import os
import signal
import time
import traceback
from concurrent import futures

import grpc
from docs.v1 import docs_pb2_grpc
from sqlalchemy import Engine, create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker

from .models import Base
from .seed import seed
from .service import DocsService

log = logging.getLogger("docs-service")


class LogInterceptor(grpc.ServerInterceptor):
    """One line per call: "/docs.v1.DocsService/GetPage NOT_FOUND 3ms".
    Unexpected exceptions are logged in full and answered with INTERNAL."""

    def intercept_service(self, continuation, handler_call_details):
        handler = continuation(handler_call_details)
        if handler is None or handler.unary_unary is None:
            return handler
        method, inner = handler_call_details.method, handler.unary_unary

        def wrapped(request, context):
            started = time.monotonic()
            try:
                return inner(request, context)
            except Exception:
                if context.code() is None:  # not a context.abort() → a bug
                    log.error("%s internal error\n%s", method, traceback.format_exc())
                    context.abort(grpc.StatusCode.INTERNAL, "internal error")
                raise
            finally:
                code = context.code() or grpc.StatusCode.OK
                log.info("%s %s %dms", method, code.name, (time.monotonic() - started) * 1000)

        return grpc.unary_unary_rpc_method_handler(
            wrapped,
            request_deserializer=handler.request_deserializer,
            response_serializer=handler.response_serializer,
        )


def connect(url: str) -> Engine:
    """Create the engine, waiting for Postgres (in Docker it may start after us)."""
    engine = create_engine(url, pool_pre_ping=True)
    for _ in range(30):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return engine
        except OperationalError as err:
            log.info("database not ready (%s), retrying…", err.orig)
            time.sleep(1)
    raise SystemExit("could not connect to the database")


def build_server(session_factory: sessionmaker, addr: str) -> tuple[grpc.Server, int]:
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=16), interceptors=[LogInterceptor()])
    docs_pb2_grpc.add_DocsServiceServicer_to_server(DocsService(session_factory), server)
    port = server.add_insecure_port(addr)
    return server, port


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")
    engine = connect(os.environ.get("DATABASE_URL", "postgresql+psycopg://tb:tb@localhost:5432/docs_db"))
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(engine, expire_on_commit=False)
    if os.environ.get("SEED_DEMO_DATA") == "true":
        with session_factory.begin() as session:
            seed(session)

    addr = os.environ.get("GRPC_ADDR", "[::]:50053")
    server, _ = build_server(session_factory, addr)
    server.start()
    log.info("gRPC listening on %s", addr)

    signal.signal(signal.SIGTERM, lambda *_: server.stop(grace=5))
    server.wait_for_termination()


if __name__ == "__main__":
    main()
