# Shortcuts for the backend demo. Run `make help` to list them.
SHELL := /bin/bash
MOCK_DIR := services/mock-api

.PHONY: help mock mock-dev smoke swagger up up-api ps down logs lint

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

ps: ## show the running containers
	docker compose ps

down: ## stop and remove the Docker containers
	docker compose down

logs: ## follow Docker logs
	docker compose logs -f

lint: ## lint api/openapi.yaml (rules in redocly.yaml)
	npx -y @redocly/cli@latest lint api/openapi.yaml
