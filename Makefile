.PHONY: help env dbs up down logs ps restart build clean seed

SHARED_ENV := /opt/shared/.env
DB_PW := $(shell grep -E '^DB_MYSQL_ROOT_PASSWORD' $(SHARED_ENV) 2>/dev/null | cut -d= -f2- | tr -d "'\"")

help:
	@echo "Cenit — dashboard GA4 + Search Console multi-sitio. Usa la infra compartida de /opt/shared."
	@echo ""
	@echo "  make up      .env + DB + levanta api/web en net-shared"
	@echo "  make seed    Crea/asegura los sitios del portfolio (21 proyectos)"
	@echo "  make dbs     Crea/asegura la base CENIT"
	@echo "  make down    Baja los contenedores (no toca la infra compartida)"
	@echo "  make logs|ps Logs / estado"
	@echo ""
	@echo "Acceso: dashboard http://cenit.localhost (o http://localhost:4100) · api http://cenit-api.localhost"
	@echo "Login: Google (allowlist en api/.env → ALLOWED_EMAILS)."
	@echo "Requiere /opt/shared levantado (red net-shared + mysql_db + traefik)."

# Crea el .env de la api desde el .env.example, inyecta el password del MySQL compartido
# y genera SECRET_KEY / TOKEN_ENCRYPTION_KEY si siguen en su placeholder.
env:
	@if [ ! -f api/.env ]; then cp api/.env.example api/.env && echo "creado api/.env"; fi
	@if [ -z "$(DB_PW)" ]; then echo "⚠ No pude leer DB_MYSQL_ROOT_PASSWORD de $(SHARED_ENV)"; else \
	  sed -i "s|^DB_ROOT_PASSWORD=.*|DB_ROOT_PASSWORD=$(DB_PW)|" api/.env; \
	  echo "✓ password del MySQL compartido inyectado en api/.env"; fi
	@if grep -q '^SECRET_KEY=change-me' api/.env; then \
	  sed -i "s|^SECRET_KEY=change-me.*|SECRET_KEY=$$(openssl rand -hex 32)|" api/.env && echo "✓ SECRET_KEY generada"; fi
	@if grep -q '^TOKEN_ENCRYPTION_KEY=$$' api/.env; then \
	  sed -i "s|^TOKEN_ENCRYPTION_KEY=$$|TOKEN_ENCRYPTION_KEY=$$(openssl rand -hex 32)|" api/.env && echo "✓ TOKEN_ENCRYPTION_KEY generada"; fi

# Crea la base del proyecto en el MySQL compartido (idempotente).
dbs:
	@docker exec mysql_db sh -c 'mysql -uroot -p"$$MYSQL_ROOT_PASSWORD" -e "\
	  CREATE DATABASE IF NOT EXISTS CENIT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"' \
	  && echo "✓ base CENIT asegurada"

up: env dbs
	docker compose up -d --build

down:
	docker compose down

# Crea/asegura los sitios del portfolio.
seed:
	docker compose exec cenit_api node db/seed.js

clean: down

logs:
	docker compose logs -f

ps:
	docker compose ps

restart:
	docker compose restart

build:
	docker compose build
