"""DB_SCHEMA against a real Postgres. Skipped unless TEST_DATABASE_URL is set
(same variable as the Go tests), e.g. postgresql://tb:tb@localhost:5432/tb"""

import os
import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.orm import sessionmaker

from docs_service.models import Base, Space
from docs_service.server import connect

URL = os.environ.get("TEST_DATABASE_URL", "")
pytestmark = pytest.mark.skipif(not URL, reason="TEST_DATABASE_URL not set")


def test_tables_live_in_the_schema():
    schema = "test_" + uuid.uuid4().hex[:8]
    engine = connect(URL, schema)
    try:
        Base.metadata.create_all(engine)
        with sessionmaker(engine).begin() as session:
            session.add(Space(key="ENG", name="Engineering"))
        with engine.connect() as conn:
            where = conn.execute(text("SELECT table_schema FROM information_schema.tables WHERE table_name = 'spaces'"))
            assert schema in [row[0] for row in where]
    finally:
        with engine.begin() as conn:
            conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        engine.dispose()
