# Demo mode

This project ships with a one-command demo profile that boots the full stack and seeds the database
with realistic sample data (no payments required).

## One-command demo

Choose either option:

```bash
make demo
```

or:

```bash
docker compose --profile demo -f infra/docker-compose.yml up -d --build
```

The demo profile starts the usual services plus a one-shot `seed-demo` container that loads:

- 1 admin user + 1 demo user
- 30 demo vacancies (salary, location, remote mix)
- 20 demo matches
- 5 demo generated packages
- 10 demo applications across all statuses

## Demo accounts

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | `admin@career-demo.ai`  | `Admin1234!` |
| Demo  | `demo@career-demo.ai`   | `Demo1234!`  |

The login page shows a **Use demo account** button whenever `NEXT_PUBLIC_APP_ENV` is set to
`local` or `demo`. The demo profile sets `APP_ENV=demo` so the button appears automatically.
