"""Runs the real gRPC server in-process against an in-memory SQLite database,
so the tests need neither Postgres nor Docker."""

import sys
from pathlib import Path

import grpc
import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Generated stubs (`buf generate` → /gen/python) unless PYTHONPATH already has them.
sys.path.append(str(Path(__file__).resolve().parents[3] / "gen" / "python"))

from docs.v1 import docs_pb2_grpc  # noqa: E402

from docs_service.models import Base  # noqa: E402
from docs_service.server import build_server  # noqa: E402


@pytest.fixture
def session_factory():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys = ON"))
    Base.metadata.create_all(engine)
    yield sessionmaker(engine, expire_on_commit=False)
    engine.dispose()


@pytest.fixture
def stub(session_factory):
    server, port = build_server(session_factory, "127.0.0.1:0")
    server.start()
    channel = grpc.insecure_channel(f"127.0.0.1:{port}")
    yield docs_pb2_grpc.DocsServiceStub(channel)
    channel.close()
    server.stop(grace=None)
