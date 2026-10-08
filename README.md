# Personal Income & Net Worth Tracker (Docker Edition)

A self-hosted finance dashboard converted for Docker deployment with **PostgreSQL 16**, **PHP 8.2 (Apache)** backend, and **Nginx** frontend.

---

## Architecture Overview

```text
finance-tracker/
├── frontend/
│   ├── Dockerfile             # Nginx Alpine container
│   ├── nginx.conf             # Serves static frontend and reverse-proxies /api/ to backend
│   └── public/
│       ├── index.html         # Single-page dashboard (React via CDN)
│       ├── api.js             # API client (configured for reverse proxy)
│       ├── app.js             # Main application logic
│       ├── components.js      # UI components
│       └── i18n.js            # Internationalization (EN, FR, AR)
├── backend/
│   ├── Dockerfile             # PHP 8.2 + Apache + PDO PostgreSQL driver
│   ├── api/                   # Modular PHP REST API endpoints
│   │   ├── config/            # database.php (reads env vars), bootstrap.php
│   │   ├── helpers/           # auth, csrf, currency, response, logger
│   │   ├── auth/              # login, logout, check, change_password
│   │   ├── dashboard/         # stats
│   │   ├── income/            # CRUD endpoints
│   │   ├── income_sources/    # CRUD + reorder endpoints
│   │   ├── networth/          # CRUD + upsert endpoints
│   │   ├── exchange_rates/    # get, update rates
│   │   ├── reports/           # CSV export
│   │   ├── settings/          # get, update, clear_data
│   │   └── activity_logs/     # list logs
│   └── sql/
│       └── schema.sql         # PostgreSQL database schema & initial seed data
├── docker-compose.yml         # Orchestrates db, backend, and frontend
└── README.md
```

---

## Quick Start (Docker)

### 1. Start the Containers

From the project root directory, run:

```bash
docker compose up -d --build
```

This will automatically:
1. Spin up the **PostgreSQL 16** database container and initialize it with `backend/sql/schema.sql`.
2. Build and start the **PHP 8.2 Apache** backend container (port `8080`).
3. Build and start the **Nginx** frontend container (port `3000`).

### 2. Access the Application

- **Web App**: Open [http://localhost:3000](http://localhost:3000) in your browser.
- **Default Login**:
  - **Username**: `admin`
  - **Password**: `Mangapro2022`

*(Please change your password immediately after logging in from Settings → Change Password)*

---

## Configuration & Environment Variables

The default configuration is defined in `docker-compose.yml`:

| Service | Environment Variable | Default | Description |
|---|---|---|---|
| `db` | `POSTGRES_USER` | `admin` | Database superuser |
| `db` | `POSTGRES_PASSWORD` | `admin` | Database password |
| `db` | `POSTGRES_DB` | `finance_tracker` | Database name |
| `backend` | `DB_HOST` | `db` | Hostname of the Postgres container |
| `backend` | `DB_PORT` | `5432` | PostgreSQL port |
| `backend` | `DB_NAME` | `finance_tracker` | PostgreSQL database name |
| `backend` | `DB_USER` | `admin` | Database username |
| `backend` | `DB_PASS` | `admin` | Database password |

---

## Management Commands

- **Stop all services**:
  ```bash
  docker compose down
  ```
- **Stop services and remove data volume**:
  ```bash
  docker compose down -v
  ```
- **View logs**:
  ```bash
  docker compose logs -f
  ```
- **View backend logs**:
  ```bash
  docker compose logs -f backend
  ```
- **Access PostgreSQL CLI**:
  ```bash
  docker compose exec db psql -U admin -d finance_tracker
  ```
