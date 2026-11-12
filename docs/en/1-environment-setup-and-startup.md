# 1. Environment Setup and Startup

This article explains the project's pre-environment requirements, quick start process, environment variable (`.env`) management structure, service life cycle inspection mechanism, and complete descriptions of all customized `pnpm` instructions.

---

## 1. Quick Start (Installation and Startup)

### 1.1 Pre-environmental requirements

- **Node.js**: 22.5.0 or above
- **pnpm**: 10.0.0 or above
- **SQLite**: SQLite mode uses the built-in `node:sqlite` of Node.js. There is no need to install additional SQLite programs or packages.
- **MySQL**: 8.0.13 or above (MySQL mode)
- **Bun** (optional): 1.1 or above (if binary execution file packaging is required)

### 1.2 Package installation and environment file creation

The back-end and front-end of this project each have independent `package.json`, which are executed sequentially in the project root directory:

```bash
# 1. Install the backend dependency packages
pnpm install

# 2. Install front-end dependency packages
pnpm --dir frontend install

# 3. Copy the environment settings template
cp .env.example .env
```

### 1.3 Database initialization and migration

1. Edit `.env`, select the database type (`DB_CLIENT=sqlite` or `DB_CLIENT=mysql`), and set a custom `JWT_SECRET` (at least 32 characters in length).
2. Complete the settings according to the selected database:
   - **SQLite**: Set `SQLITE_FILE` (for example, `storage/database/database.sqlite`), and the database file and its upper-level directory will be automatically created when connecting. There is no need to create a database in advance.
   - **MySQL**: Fill in the connection information such as `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, etc., and manually create an empty database:
     ```sql
     CREATE DATABASE nodejs_base CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     ```
3. Execute database migration (Migration) to create a data table:
   ```bash
   pnpm migrate
   ```

### 1.4 Start the development environment

```bash
pnpm dev
```

- `pnpm dev` will first fully build the front-end product to `frontend/dist/`, then start the back-end in the background in PM2 monitoring mode, and continuously monitor the front-end file changes in the foreground. Through this command, both the front-end and back-end are started in hot-loading mode to facilitate development.
- The default listening address is `http://127.0.0.1:3000`
  - **Front-end page**: Enable `http://127.0.0.1:3000/app/`
  - **API connection test**: access `http://127.0.0.1:3000/api/health`
  - **API file (Swagger UI)**: Enable `http://127.0.0.1:3000/apidoc` in `debug` or `test` mode
- **End development**: Press `Ctrl + C` in the terminal to end front-end monitoring. The PM2 back-end program running in the background can be stopped with the following command:
  ```bash
  pnpm stop
  ```

---

## 2. Environment variable architecture and specifications (`.env`)

### 2.1 Core principles

Strictly follow the principle of **"settings belong to the environment; commands belong to scripts"**:
- **It is prohibited** to hardcode environment parameters in the script of `package.json`. For example, the following writing method **does not comply with the specifications of this project**.
  ```json
  {
    "scripts": {
      "start:node": "APP_MODE=debug APP_PORT=3000 node src/app.js"
    }
  }
  ```
- All execution phase parameters are uniformly managed by the `.env` file in the project root directory.
- The business module ** is strictly prohibited from directly accessing `process.env`** and must be read through the unified export of `src/config/`. The setting module is responsible for type conversion, default value injection and anti-fool verification.

### 2.2 Environmental file classification and responsibilities

|file|Instructions for use|version control status|
| --- | --- | --- |
| `.env.example` |An environment variable template file that lists the setting keys and development defaults required for the project.|Incorporate into version control (Git)|
| `.env` |Actual configuration files for local development or server production environments.|**Strictly Prohibited** from being included in version control|
| `.env.test` |Automated test-specific configuration file (including test DB, test Port, test Fixture path).|Incorporate into version control (Git)|
| `.env.test.local` |Developer's local test override file (optional, priority higher than `.env.test`).|**Strictly Prohibited** from being included in version control|

### 2.3 Backend and program management loading mechanism

The backend loads environment variables during Node.js execution:
- **Native Node command**: Load the .env path through the Node native parameter `node --env-file=.env src/app.js`.
- **PM2 loading mechanism**: In [ecosystem.config.js](../../ecosystem.config.js), the .env path setting is also injected into the Node process through `node_args: "--env-file=.env"` to maintain a single file source.

### 2.4 Front-end environment variable specifications

- **Same origin sharing**: The front-end and back-end share the same copy of `.env` in the root directory.
- **Vite read**: [frontend/vite.config.js](../../frontend/vite.config.js) `envDir: "../"` has been set, and the root directory environment variables are automatically read during construction.
- **Security and Limitations**:
  - Only variables with the `VITE_*` prefix will be exposed to the front end (such as `VITE_APP_NAME`).
  - The front-end is a pure static file after packaging. **`.env` on the server cannot be read when the production environment is running**. The value of the production environment must be written in the default value of [frontend/src/config/config.js](../../frontend/src/config/config.js).
  - **It is strictly prohibited** to put any private keys, passwords and other confidential information on the front end.

### 2.5 Complete environment variable reference table

#### (1) Basic application settings
|variable name|Program defaults|Instructions and Examples|
| --- | --- | --- |
| `APP_MODE` | `production` |Execution mode (`production`, `debug`, `test`), only `debug`/`test` opens Swagger UI.|
| `APP_HOST` | `127.0.0.1` |HTTP listening IP. If direct external access is required, please set it to `0.0.0.0`.|
| `APP_PORT` | `3000` |HTTP communication port, shared by front-end, API and static files.|
| `APP_TRUST_PROXY` | `loopback` |Reverse proxy trust settings (see [Part 11](11-production-deployment-and-reverse-proxy.md)).|
| `APP_FRONTEND_PATH` |*(automatic parsing)*|Front-end static resource entity path (default detection is `frontend/dist` and `dist` in sequence, the test environment can be customized such as `test/frontend/app`).|

#### (2) Database settings
|variable name|Program defaults|Instructions and Examples|
| --- | --- | --- |
| `DB_CLIENT` | `mysql` |Database type, can be set to `mysql` or `sqlite`.|
| `SQLITE_FILE` | `storage/database/database.sqlite` |SQLite file path. The relative path is based on the program root directory. `:memory:` can also be used (SQLite mode only).|
| `MYSQL_HOST` | `127.0.0.1` |MySQL host address.|
| `MYSQL_PORT` | `3306` |MySQL connection port.|
| `MYSQL_USER` | `root` |Database user name.|
| `MYSQL_PASSWORD` |*(empty string)*|Database user password.|
| `MYSQL_DATABASE` | `nodejs_base` |Database name (needs to be created manually in advance).|
| `MYSQL_CONNECTION_LIMIT` | `10` |The maximum number of connections in the connection pool.|

#### (3) Log system settings
|variable name|Program defaults|Instructions and Examples|
| --- | --- | --- |
| `LOG_LEVEL` | `info` |Record levels (`error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`).|
| `LOG_ENABLE_ACCESS_LOG` | `true` |Whether to enable independent HTTP Access logs (`true` / `false`).|
| `LOG_RETENTION_DAYS` | `0` |The number of days for log rotation to be retained, `0` means permanent retention.|

#### (4) Authentication and security settings (JWT / Cookie)
|variable name|Program defaults|Instructions and Examples|
| --- | --- | --- |
| `JWT_SECRET` |*(No default)*|JWT signing key, **length must be at least 32 characters**, mandatory verification at startup.|
| `JWT_EXPIRES_IN` | `1h` |Token validity period (such as `1h`, `7d`).|
| `JWT_ISSUER` | `nodejs-base` |JWT issuer identifying name.|
| `JWT_AUDIENCE` | `nodejs-base-api` |JWT audience identification name.|
| `COOKIE_SECURE`| `false` |Cookie Secure flag, please set it to `true` for production HTTPS environment.|
| `CORS_ORIGINS` | `http://localhost:3000` |List of allowed CORS sources, multiple sources separated by commas.|

#### (5) File upload and request restrictions
|variable name|Program defaults|Instructions and Examples|
| --- | --- | --- |
| `UPLOAD_MAX_FILE_SIZE` | `2097152` |The upper limit of decoding a single image, in bytes (default is about 2 M).|
| `UPLOAD_JSON_LIMIT` | `10mb` |Transmission limit for JSON and URL-encoded Request Body.|

---

## 3. Service startup and life cycle mechanism

### 3.1 Check the startup conditions in sequence

[src/app.js](../../src/app.js) When starting up, the following three conditions will be strictly verified in order. If any of the conditions is not met, the startup will be interrupted immediately and an error will be recorded:
1. **JWT Key Length Verification**: Check whether the length of `authConfig.jwt.secret` reaches 32 characters.
2. **Front-end resource availability check**: The front-end will be checked only in the production environment (`production`) mode to confirm that at least one of the entity static file (`index.html`) or the executable file embedded exists.
3. **Database connection test**: Execute the `SELECT 1 AS connected` test on the selected database to ensure that the connection is normal.

### 3.2 Comparison of execution architecture and modes

|execution mode|Command example|Applicable scenarios|Feature description|
| --- | --- | --- | --- |
|**Integrated development**| `pnpm dev` |Daily development of this machine|Hot reloading mode, real-time monitoring of front-end recoding + automatic restart of PM2 back-end code changes.|
|**Foreground Bugfix**| `pnpm start:node` |Start debugging and observe stdout|The native Node prospect appears directly, without program management, and Ctrl+C will stop.|
|**Background Permanent**| `pnpm start` |Traditional server deployment|Managed by PM2, including memory over limit protection and abnormal crash restart.|
|**Bun single file**|`./app.exe` (or `./app`)|Lightweight or Node host deployment|Independent binary single file, no need for Node.js/PM2 environment, extremely fast startup (see [Part 10](10-bun-packaging.md) for details).|

### 3.3 Graceful Shutdown

The service listens for operating system signals and global exceptions:
- When receiving `SIGINT` or `SIGTERM`, close the HTTP listener and database connection in order to ensure that the request in progress is processed before safely ending the process.
- Intercept uncaught exceptions (`uncaughtException`) and unhandled rejections (`unhandledRejection`), record the complete error stack and exit the process safely.

---

## 4. Complete Reference for Project Commands (`pnpm Scripts`)

The following commands are executed in the project root directory:

### 4.1 Service development and launch

|instruction|underlying execution action|Usage scenarios and instructions|
| --- | --- | --- |
| `pnpm dev` |Front-end build ➔ PM2 starts back-end watch ➔ Front-end monitors front-end|Recommended development instructions, front and back ends share the same communication port, hot loading experience.|
| `pnpm start` | `pm2 delete` ➔ `pm2 start ecosystem.config.js` |The production environment starts with the PM2 resident backend.|
| `pnpm start:node` | `node --env-file=.env src/app.js` |Native Node foreground startup, suitable for debugging startup phase logs.|
| `pnpm stop` | `pm2 stop ecosystem.config.js` |Stop the PM2 project from running in the background.|

### 4.2 Frontend build and monitoring

|instruction|underlying execution action|Usage scenarios and instructions|
| --- | --- | --- |
| `pnpm build:frontend` | `pnpm --dir frontend build` |Execute Vite formal build and output the product to `frontend/dist/`.|
| `pnpm dev:frontend` | `pnpm --dir frontend dev` |Only start Vite to monitor the front-end files and automatically re-edit, without starting the back-end.|
| `pnpm --dir frontend check` | `vue-tsc --noEmit` |Execute Vue/TypeScript type checking without generating files.|

> [!NOTE]
> For information about the front-end Vue 3 architecture, same-origin port integration, hot-loading development process, SPA routing Fallback hosting and shared HTTP request tools, please refer to [Part 9: Front-end Development](9-frontend-development.md).

### 4.3 Program inspection and testing

|instruction|underlying execution action|Usage scenarios and instructions|
| --- | --- | --- |
| `pnpm check` | `node scripts/checkSyntax.js` |Check project-wide JS syntax and camelCase naming conventions.|
| `pnpm test:unit` |Load `.env.test` and execute `jest test/unit/`|Execute all unit tests (including Service, Helper, Specifications, etc.).|
| `pnpm test` |Load the test environment to execute a full set of tests|Perform integration and unit testing.|
| `pnpm test:coverage` |Load the test environment with `--coverage`|Generate Jest test coverage reports.|

> [!NOTE]
> For information on automated test architecture, environment isolation (`.env.test` and `.env.test.local`), Mock isolation strategy, test coverage analysis and single-file testing guide, please refer to [Part 8: Test Instructions](8-testing-guide.md).

### 4.4 Database migration (Migration)

The project encapsulates the Knex migration engine through a customized [scripts/migrate.js](../../scripts/migrate.js) to provide database upgrade, rollback, reset and lock management functions:

|instruction|underlying execution action|Brief description|
| --- | --- | --- |
| `pnpm migrate` |Execute `scripts/migrate.js up`|Applies upwards all migrations that have not yet been executed.|
| `pnpm migrate:rollback` |Execute `scripts/migrate.js rollback`|Roll back the last batch of migrations (supports `--step=N` step-by-step rollback and `--yes` skip confirmation).|
| `pnpm migrate:unlock` |Execute `scripts/migrate.js unlock`|Forcibly release the migration lock (used to unlock when the program is stuck after interruption).|
| `pnpm migrate:fresh` |Execute `scripts/migrate.js fresh`|**Delete database and rebuild, re-execute all migrations** (`debug`/`test` mode only).|
| `pnpm migrate:create <name>` |Execute `scripts/createMigration.js`|Create a new migration file skeleton (`<name>` must be camelCase, and you must log in to the registry after creation).|

> [!NOTE]
> For the complete CLI parameter details of Migration (such as `--step=N`, `--yes`), `fresh` dual security protection mechanism, migration lock, troubleshooting SOP, as well as static registration and Schema writing specifications, please refer to [Part 4: Database and Migration](4-database-and-migration.md#7-complete-cli-command-set-and-safety-safeguards).

### 4.5 Bun binary single file packaging

|instruction|underlying execution action|Usage scenarios and instructions|
| --- | --- | --- |
| `pnpm build:bun` | `node scripts/buildBun.js` |Execute a fully automatic build process based on the current system platform and generate dual execution files.|
| `pnpm build:bun:windows`|append `--target=windows`|Compile and output `release/app.exe` and `migrate.exe` for Windows x64; if there is `frontend/public/favicon.ico`, apply the icon.|
| `pnpm build:bun:linux` |append `--target=linux`|Compile and output `release/app` and `migrate` for Linux x64.|

> [!NOTE]
> For information on the Bun single-file compilation mechanism, release directory structure, and Windows (NSSM) and Linux (Systemd) system service settings and on-site maintenance SOPs, please refer to [Part 10: Bun Packaging and Deployment](10-bun-packaging.md).


