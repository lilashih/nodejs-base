# Node.js Base

This project is a full-stack foundation built with Vue 3, Express 5, MySQL/SQLite, and JWT. The frontend, API, and images are served by the same HTTP service. It supports running with Node.js/PM2 and distribution as a standalone Bun executable.

For a first read, start with the [architecture overview](docs/en/0-architecture-overview.md) to understand how the frontend, backend, database, and packaging fit together.

## Installation and Startup

The development environment requires Node.js 22.5 or later and pnpm 10. SQLite mode uses a built-in Node.js module; MySQL mode requires MySQL 8.0.13 or later. Run the following commands from the project root:

~~~powershell
pnpm install
pnpm --dir frontend install
Copy-Item .env.example .env
~~~

Edit `.env`. Use `DB_CLIENT` to select `mysql` or `sqlite`, set the corresponding connection details, and provide a random `JWT_SECRET` of at least 32 characters. For MySQL mode, first create the empty database specified by `MYSQL_DATABASE`. SQLite mode creates the database file automatically. Then run:

~~~powershell
pnpm migrate
pnpm dev
~~~

By default, the frontend is available at http://127.0.0.1:3000/app/. You can test the API connection at /api/health. API documentation is available at /apidoc in debug/test mode.

`pnpm dev` starts the PM2 backend in the background and watches the frontend build. To shut down the service, use `pnpm stop` to stop the backend. See [Environment Setup and Startup](docs/en/1-environment-setup-and-startup.md) for detailed settings.

## Common Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Develop the frontend and backend. |
| `pnpm start:node` | Run Node.js in the foreground. |
| `pnpm start` / `pnpm stop` | Start / stop PM2. |
| `pnpm check` | Check backend syntax and naming. |
| `pnpm test` | Run the full test suite (unit and API tests). |
| `pnpm test:unit` | Run unit tests. |
| `pnpm test:coverage` | Run tests and generate a coverage report. |
| `pnpm --dir frontend check` | Check frontend types. |
| `pnpm build:frontend` | Build the frontend. |
| `pnpm migrate` | Apply pending migrations. |
| `pnpm migrate:create addPostCategory` | Create a migration file; it must still be registered in the registry. |
| `pnpm migrate:rollback` | Roll back the latest batch after confirmation. |
| `pnpm migrate:rollback -- --step=1` | Roll back migrations one at a time after confirmation. |
| `pnpm migrate:fresh` | Delete and rebuild the entire database in debug/test mode. |
| `pnpm migrate:unlock` | Release the lock after confirming that no migration process is running. |
| `pnpm build:bun` | Build Bun release artifacts for the current platform. |
| `pnpm build:bun:windows` / `pnpm build:bun:linux` | Specify the target platform explicitly. |

For the complete testing guide and architecture, see [Testing Guide](docs/en/8-testing-guide.md).

## Documentation

| Document | Topic |
| --- | --- |
| [0. Architecture Overview](docs/en/0-architecture-overview.md) | Full-stack structure, directories, data flow, and release options. |
| [1. Environment Setup and Startup](docs/en/1-environment-setup-and-startup.md) | Installation, configuration values, startup, paths, and all custom pnpm commands. |
| [2. Same-Origin Architecture, CORS, and CSRF](docs/en/2-same-origin-cors-and-csrf.md) | Same-origin architecture, cross-origin CORS configuration, Cookie security, and CSRF protection. |
| [3. Request Processing, Logging, and Errors](docs/en/3-request-processing-logging-and-errors.md) | Middleware, tracing, responses, logs, and errors. |
| [4. Database and Migration](docs/en/4-database-and-migration.md) | SQL, transactions, tables, and schema versions. |
| [5. Swagger and API Contract](docs/en/5-swagger-and-api-contract.md) | Viewing and maintaining API documentation. |
| [6. Login and Authentication](docs/en/6-login-and-authentication.md) | Cookies, Bearer JWT, and CSRF. |
| [7. Backend Modules and Image Storage](docs/en/7-backend-modules-and-image-storage.md) | Module layers, article permissions, pagination, and images. |
| [8. Testing Guide](docs/en/8-testing-guide.md) | Unit tests, API tests, frontend checks, and testing instructions. |
| [9. Frontend Development](docs/en/9-frontend-development.md) | Vue, routing, API, configuration, and static builds. |
| [10. Bun Packaging and Deployment](docs/en/10-bun-packaging.md) | Building, delivery, Windows/Linux services, and updates. |
| [11. Production Deployment and Reverse Proxy](docs/en/11-production-deployment-and-reverse-proxy.md) | Nginx reverse proxy configuration, HTTPS (SSL) certificates, forwarding headers, and deployment troubleshooting. |