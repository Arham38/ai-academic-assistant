.PHONY: up down down-v build rebuild logs logs-api logs-ai logs-webapp ps clean test

# Boot full ecosystem in background
up:
	docker compose up -d

# Stop all containers
down:
	docker compose down

# Stop containers and destroy volumes (clean slate)
down-v:
	docker compose down -v

# Rebuild all images without cache and boot
rebuild:
	docker compose up -d --build --remove-orphans

# View logs for all containers
logs:
	docker compose logs -f

# View API Gateway logs
logs-api:
	docker compose logs -f api-gateway

# View AI Engine logs
logs-ai:
	docker compose logs -f ai-engine

# View React Webapp logs
logs-webapp:
	docker compose logs -f webapp

# Check container status
ps:
	docker compose ps

# Run local code quality suite
test:
	npm run check:all

# Clean local cache directories
clean:
	rm -rf dist build coverage .pytest_cache .mypy_cache .ruff_cache
