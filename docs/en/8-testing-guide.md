# 8. Testing Guide

This document describes the project's automated testing architecture, design principles, test coverage, and commands. Comprehensive unit tests, HTTP API tests, and frontend type checks help keep modules at every layer stable during refactoring and iteration.

---

## 1. Testing Architecture

### 1.1 Testing Tools

- **Backend testing framework**: [Jest](https://jestjs.io/), with `module-alias` support for the `@src/*` absolute path alias (mapped to `<rootDir>/src/*`).
- **HTTP interface testing**: [Supertest](https://github.com/ladjs/supertest) sends requests directly to the Express application instance (`src/http/app.js`). It does not require a real HTTP server to listen on a port, so tests run quickly.
- **Frontend type and static checks**: `vue-tsc` checks static types in Vue 3 SFC components and TypeScript/JavaScript.
- **Project-wide syntax checks**: The custom `scripts/checkSyntax.js` checks JavaScript syntax and camelCase naming rules throughout the project.

### 1.2 Test Environment Isolation (`.env.test` and `.env.test.local`)

Tests use Node.js's native environment-file loading to separate test settings from the regular development environment and prevent tests from affecting production data:

| File | Purpose | Version control |
| :--- | :--- | :--- |
| `.env.test` | Required shared test defaults for all developers, including the database, port, and frontend path. | Tracked in Git. |
| `.env.test.local` | Optional overrides for personal database credentials and connection settings. | Excluded by `.gitignore`. |

Test commands use `node --env-file=.env.test --env-file-if-exists=.env.test.local` to load both files in order. Values in `.env.test.local` take precedence for duplicate names; other values come from `.env.test`.

pnpm test, pnpm test:unit, and pnpm test:coverage all use this mechanism.

Isolation rules:
- **Data and authentication isolation**: Use a separate test database and `JWT_SECRET`; **never point tests at a production or shared database**.
- **Frontend asset isolation**: Set `APP_FRONTEND_PATH` to dedicated mock static assets, so API tests can run without first building the production frontend.

### 1.3 Mocking Strategy

- **Unit tests**: Mock external systems, such as database connections and the disk filesystem, when testing core business logic (Services). Focus on calculations, error branches, and transformations.
- **API tests**: Usually use `jest.mock()` to simulate underlying Service responses. Focus on HTTP headers, input validation (express-validator), middleware, status codes, and the standard response structure.

---

## 2. Test Scope and Categories

Tests live in `test/` and are mainly divided into unit and API tests:

| Category | Directory | Coverage |
| :--- | :--- | :--- |
| **Unit tests** | `test/unit/` | Business logic, helpers, database connection pools, logging, and custom exceptions. |
| **HTTP contract tests** | `test/api/` | Supertest checks routes, field validation, authentication flows, permissions, CORS, and static-route fallback. |
| **Frontend checks** | `frontend/` | `vue-tsc --noEmit` checks Vue SFC components and frontend JavaScript types. |
| **Project-wide syntax** | `scripts/` | `checkSyntax.js` checks JavaScript syntax and camelCase names in the backend, tests, and scripts. |


## 3. Test Commands and Execution

Run all test and check commands from the project root.

### 3.1 Common Commands

| Command | Target | Description |
| :--- | :--- | :--- |
| `pnpm test` | Full test suite | Runs all Jest unit and API tests. |
| `pnpm test:unit` | Unit tests | Runs tests under test/unit/ without starting a database. |
| `pnpm test:coverage` | Coverage analysis | Runs tests and generates a code coverage report. |
| `pnpm --dir frontend check` | Frontend type checks | Uses vue-tsc --noEmit to check Vue and TypeScript types. |
| `pnpm check` | Backend syntax checks | Uses `node scripts/checkSyntax.js` to check JavaScript syntax and naming rules. |

### 3.2 Advanced Commands

Run a single test file:

```bash
node --env-file=.env.test --env-file-if-exists=.env.test.local ./node_modules/jest/bin/jest.js --runInBand test/unit/requestHelper.test.js
```

Filter by test case name:

```bash
node --env-file=.env.test ./node_modules/jest/bin/jest.js --runInBand -t "健康檢查"
```

Here, `--runInBand` runs tests sequentially, and `-t` selects cases whose names match the condition.

---

## 4. Rules and Best Practices for New Tests

Follow these rules when adding or changing tests to keep them consistent, maintainable, and reliable:

### 4.1 Naming and Language
- **File names**: Use `camelCase` and the `.test.js` suffix, for example `userProfile.test.js`.
- **Directories**: Put unit tests in `test/unit/` and API tests in `test/api/`.
- **Test descriptions**: Always write `describe` and `test` descriptions in **Traditional Chinese**, clearly stating the scenario and expected result.

### 4.2 Consistent Path Alias
Register the module alias at the top of each test file and import backend modules through `@src/*` instead of long relative paths such as `../../src/`:
```javascript
require("module-alias/register");

const app = require("@src/http/app.js");
const { request } = require("@src/helper/request.js");
```

### 4.3 API Response Validation
API tests must check the standard JSON response structure, including the `message` and `data` fields and the `X-Request-Id` tracing header:
```javascript
const response = await request(app).get("/api/health").expect(200);

expect(response.body).toHaveProperty("message");
expect(response.body).toHaveProperty("data");
expect(response.headers["x-request-id"]).toBeTruthy();
```

### 4.4 Mock Cleanup and Test Isolation
- Mock cleanup: Jest is configured with clearMocks: true, so mock call records are cleared automatically after each test case. Restore changed mock implementations or module state yourself when necessary.
- Deterministic tests: Results should be reproducible and should not depend on execution order, external services, or unstable environment state.
- Avoid side effects: Tests must not affect production data or external environments. Clean up temporary files and test data afterward.

---

## 5. Verification After Code Changes

After each change or feature addition, run the following checks in order as applicable:

1. **Backend module changes**:
   - Run affected unit tests, for example `pnpm test:unit`.
   - Run project-wide syntax and naming checks (`pnpm check`).
2. **API route or contract changes**:
   - Update `src/swagger/openapi.yaml` as well.
   - Run the relevant API tests, for example those in `test/api/`.
3. **Frontend code changes**:
   - Run frontend type checks (`pnpm --dir frontend check`).
   - Verify the frontend build (`pnpm build:frontend`).
