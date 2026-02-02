.PHONY: demo

demo:
\tAPP_ENV=demo docker compose --profile demo -f infra/docker-compose.yml up -d --build
