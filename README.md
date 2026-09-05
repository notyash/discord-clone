# Discord Clone (pure SurrealDB)

## Prerequisites, both machines
- Docker Desktop (WSL2 backend if on Windows)
- `surreal` CLI: `curl --proto '=https' --tlsv1.2 -sSf https://install.surrealdb.com | sh`
  (Windows without WSL: `iwr https://windows.surrealdb.com -useb | iex`)

## First-time setup
1. `cp .env.example .env`
2. `docker compose up -d`
3. Open SurrealDB Studio at http://localhost:8000, sign in with the values from `.env`
