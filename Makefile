.PHONY: check dev down logs start start-miner screen-preview

check:
	npm run check

dev:
	npm run dev

start:
	docker compose up -d --build

start-miner:
	docker compose --profile miner up -d --build

down:
	docker compose --profile miner down

logs:
	docker compose --profile miner logs -f --tail=200

screen-preview:
	python3 hardware/screen-agent/screen_agent.py --once --fixture hardware/screen-agent/fixture.json --output hardware/screen-agent/preview.png
