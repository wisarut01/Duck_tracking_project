-- Runs once, when the Postgres volume is created (docker-entrypoint-initdb.d).
-- One database per service — services never share tables (docs/AGREEMENTS.md).
-- Each service creates its own tables on start.
CREATE DATABASE auth_db;
CREATE DATABASE tracker_db;
CREATE DATABASE docs_db;
