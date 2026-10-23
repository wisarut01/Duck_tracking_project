# Shortcuts for the backend demo. Run `make help` to list them.
SHELL := /bin/bash
MOCK_DIR := services/mock-api

.PHONY: help mock mock-dev smoke swagger up up-api up-real test-real gen test-go test-docs ps down logs lint

help: ## show this help
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

$(MOCK_DIR)/node_modules: $(MOCK_DIR)/package.json
	cd $(MOCK_DIR) && npm install
	@touch $@

mock: $(MOCK_DIR)/node_modules ## run the mock API locally on :4010 (Node, no Docker)
	cd $(MOCK_DIR) && npm start

mock-dev: $(MOCK_DIR)/node_modules ## same, but restarts on file changes
	cd $(MOCK_DIR) && npm run dev

smoke: ## run the demo flow against a running mock (login → create → move → link → search)
	cd $(MOCK_DIR) && npm run smoke

swagger: ## Swagger UI on :8081 (Docker), "Try it out" → mock on :4010
	docker compose up -d --no-deps swagger-ui
	@echo "Swagger UI → http://localhost:8081"

up: ## start everything in Docker: mock-api, swagger-ui, web, storybook
	docker compose up -d --build mock-api swagger-ui web storybook
	@echo "Mock API   → http://localhost:4010/api/v1"
	@echo "Swagger UI → http://localhost:8081"
	@echo "Web        → http://localhost:5173"
	@echo "Storybook  → http://localhost:6006  (takes ~30s on first start)"
	@echo "Login      → duck@example.com / password123"

up-api: ## start only the backend in Docker: mock-api + swagger-ui
	docker compose up -d --build mock-api swagger-ui

up-real: ## start the real backend in Docker: postgres, auth/tracker/docs services, gateway :8080
	docker compose --profile real up -d --build postgres auth-service tracker-service docs-service api-gateway
	@echo "Gateway    → http://localhost:8080/api/v1"
	@echo "Login      → duck@example.com / password123"

test-real: ## run the Playwright API suite against the real gateway (make up-real first)
	cd e2e && API_BASE_URL=http://localhost:8080/api/v1 npx playwright test --project=api

gen: ## generate gRPC code from proto/ into gen/ (Docker, no buf install needed)
	docker run --rm -u $$(id -u):$$(id -g) -e HOME=/tmp -v "$$PWD:/work" -w /work/proto bufbuild/buf:1.75.0 generate

test-go: gen ## Go unit tests (DB tests need TEST_DATABASE_URL, e.g. a running `make up-real` postgres)
	docker run --rm -u $$(id -u):$$(id -g) -e HOME=/tmp -e GOCACHE=/tmp/gocache -e GOFLAGS=-buildvcs=false \
		-e TEST_DATABASE_URL=$${TEST_DATABASE_URL:-} --network host -v "$$PWD:/src" -w /src golang:1.27 \
		sh -c 'go vet ./services/... && go test ./services/...'

test-docs: gen ## docs-service tests (pytest, SQLite in memory) + ruff
	docker run --rm -u $$(id -u):$$(id -g) -e HOME=/tmp -e PYTHONDONTWRITEBYTECODE=1 \
		-v "$$PWD:/src" -w /src/services/docs-service python:3.13-slim \
		sh -c 'python -m venv /tmp/venv && . /tmp/venv/bin/activate && pip install -q -r requirements-dev.txt ruff \
		&& ruff check --no-cache . && ruff format --no-cache --check . && python -m pytest -q -p no:cacheprovider'

ps: ## show the running containers
	docker compose ps

down: ## stop and remove the Docker containers (data in postgres is kept)
	docker compose --profile real down

logs: ## follow Docker logs
	docker compose logs -f

lint: ## lint api/openapi.yaml (rules in redocly.yaml)
	npx -y @redocly/cli@latest lint api/openapi.yaml
