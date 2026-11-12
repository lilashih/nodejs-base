# 6. Login and authentication

This system provides two login methods: **Cookie Session** and **Bearer Token**, and designs dual-track authentication, JWT signature and verification rules, CSRF protection and error handling mechanisms based on the same-origin architecture.

Cookie Session uses Cookie to carry JWT, and is not a session store structure where the server saves Session ID and status. For details on the overall architecture design, please see [Part 0: Architecture Overview](0-architecture-overview.md), for details on same-origin security, please see [Part 2: Same-origin architecture, CORS and CSRF mechanism](2-same-origin-cors-and-csrf.md), and for front-end status management, please see [Part 9: Front-end Development](9-frontend-development.md).

---

## 1. Overview and selection of dual-track login methods

The project provides two login endpoints for browser front-ends and third-party API clients:

|Usage context|Login endpoint|Authentication methods and headers|Login response|CSRF protection requirements|
| :--- | :--- | :--- | :--- | :--- |
|**Vue front-end or same-origin browser page for this project**| `POST /api/auth/session/login` |The browser automatically carries the `HttpOnly` Cookie (`token`)| `{ user }` |**Strictly protected by `csrfMiddleware`**<br> (check Origin / Referer Host)|
|**CLI command line, mobile app or third-party system**| `POST /api/auth/login` |The client comes with it<br>`Authorization: Bearer <token>`| `{ user, token }` |**Not subject to CSRF restrictions**<br> (non-browser automatic portability mechanism)|

---

## 2. JWT issuance and data process

After the user login verification is passed, the server uses the HS256 algorithm to issue a JWT, using the user ID as `subject` (`sub`), and configuring the validity period, issuer (`issuer`) and audience (`audience`).

### 2.1 Security rules and key compatibility

* **Do not store sensitive data**: A JWT signature only protects data integrity; it does not encrypt the payload. Therefore, **never put passwords, keys, or confidential information in the payload**.
* **Impact of changing the key**: Changing `JWT_SECRET` in `.env` will cause all existing issued Tokens to become invalid immediately; changing `issuer` or `audience` will also affect verification compatibility. The impact of user re-login must be properly assessed before deployment.

---

## 3. Cookie Session login mechanism

### 3.1 Login request and security settings

The client sends a login request:

```http
POST /api/auth/session/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourPassword"
}
```

When the login is successful, HTTP 200 is returned. The server sets `Set-Cookie` in the response header. The response body only contains user information and does not expose JWT:

```json
{
  "message": "登入成功",
  "data": {
    "user": {
      "id": 1,
      "name": "使用者",
      "email": "user@example.com",
      "createdAt": "2026-01-01 00:00:00",
      "updatedAt": "2026-01-01 00:00:00"
    }
  }
}
```

The project uses a cookie named `token` to store the JWT and applies the following security attributes:
* **`HttpOnly`**: Prohibit front-end JavaScript from reading Token through `document.cookie` to completely eliminate XSS theft.
* **`Path=/api`**: Limit cookies to be carried only when sending `/api` requests, narrowing the scope.
* **`SameSite=Lax`**: Restrict cross-site requests to automatically carry cookies to improve cross-site request defense.
* **`Secure`**: When enabled when `COOKIE_SECURE=true` (recommended for production environments), restricts transmission to only HTTPS encrypted connections.
* **Validity period**: The cookie storage period is dynamically set based on the JWT expiration time (default `JWT_EXPIRES_IN=1h`).

### 3.2 Query login status (`GET /api/auth/me`)

Call `GET /api/auth/me` and return `{ user }` after successful authentication. HTTP 401 will be returned when you are not logged in or the JWT has expired or is invalid.
Every time the front end refreshes the page, it actively calls this API to restore the login status on the screen, and **does not store Token or login information in `localStorage`**.

### 3.3 Log out (`POST /api/auth/session/logout`)

Calling `POST /api/auth/session/logout`, the server will overwrite and clear the cookie with the same name and Path, and return HTTP 200.
Even if the JWT has expired, this endpoint can still be called normally to complete the logout; if the network request is abnormally interrupted, the cookie may still remain in the browser, and you should be prompted to try again.

---

## 4. Bearer Token login mechanism

Applicable to external integrations, CLI tools or mobile apps that are not managed by browser cookies.

### 4.1 Login and Authorization Headers

After sending `POST /api/auth/login` to successfully log in, the server returns `{ user, token }`. When subsequently accessing the protected endpoint, the client must include the following in the HTTP request header:

```http
Authorization: Bearer <token>
```

### 4.2 Life cycle and cancellation characteristics

Since JWT is essentially a stateless signature, this project currently does not configure a Redis blacklist or Refresh Token revocation mechanism:
* Calling `POST /api/auth/session/logout` only clears the browser Cookie; **it does not revoke already issued Bearer Tokens**.
* The checked out Bearer Token will remain valid until the expiration time (`exp`). If it needs to expire immediately, you must wait for its natural expiration or replace the global `JWT_SECRET`.

---

## 5. Authentication Middleware (`authMiddleware`)

Global authentication middleware [src/http/middleware/authMiddleware.js](../../src/http/middleware/authMiddleware.js) determines the request credentials in the following order:

1. **Read Cookies First**: Check the request header for a cookie named `token`.
2. **Bounce Check Authorization**: Only read the `Authorization: Bearer <token>` header if no cookie is carried or the value is an empty string.
3. **Verification and Injection**: Verify the selected JWT signature, period, algorithm (HS256), issuer and audience; after passing, put the user ID into `req.user.id`, record the authentication source `req.authSource` (`cookie` or `bearer`), and bind it to the asynchronous log context through `setUserId()`.

> [!WARNING]
> **Credential Mutual Exclusion Principle**: If the request carries a cookie but the cookie has expired or expired, the middleware will **directly throw an HTTP 401 error and will never return the Bearer header** in the attempted request. If a legal Cookie and Bearer Token are provided at the same time, the system will always use the Cookie's identity as the criterion.

---

## 6. Cookie write request and CSRF protection mechanism

To ensure the security of operations in Cookie Session mode, the write route that mounts [src/http/middleware/csrfMiddleware.js](../../src/http/middleware/csrfMiddleware.js) will perform strict checks after passing the authentication:

### 6.1 Protection rules and comparison mechanism

* **Protection object**: Only effective for write requests with `req.authSource === "cookie"` and HTTP Method `POST`, `PUT`, `PATCH`, `DELETE`; **Bearer Token requests are not subject to this check**.
* **Host comparison rules**: Compare the Host (including host name and Port, not limited to http/https) of the request header `Origin` or `Referer`, which must completely match the `Host` of the current API request; if both are empty or inconsistent, HTTP 403 `無效的跨站請求` will be thrown immediately.

### 6.2 Cross-origin deployment considerations

* Even if a cross-origin cookie write request passes CORS preflight, if the source Host is different from the API Host, it will still be rejected by the CSRF check.
* When setting up a reverse proxy (such as Nginx), ensure that the correct `Host` and `X-Forwarded-*` headers are passed, and the URL Host that is publicly accessible to users is retained to avoid legitimate writes being misjudged as cross-site attacks.

---

## 7. Environment settings and common error handling

### 7.1 Core environment variable configuration

|environmental variables|Types and default values|illustrate|
| :--- | :--- | :--- |
| `JWT_SECRET` |String (at least 32 characters)|JWT signature private key, if the length is insufficient, the system will directly report an error and block it when it starts.|
| `JWT_EXPIRES_IN` |Time string (default `1h`)|JWT validity period; Cookie storage life is also linked to this value.|
| `JWT_ISSUER` |String|The identifying name of the JWT issuer, which must be exactly the same when validating.|
| `JWT_AUDIENCE` |String|The JWT target receives the object identification name, which must be exactly the same when validating.|
| `COOKIE_SECURE` |Bollinger value (`true`/`false`)|Whether to enable the `Secure` tag of cookies (the production environment HTTPS must be set to `true`).|
| `CORS_ORIGINS` |Comma separated list of URLs|Cross-origin list that is allowed to be accessed; when carrying cookies across origins, the front end needs to set `credentials: "include"`.|

### 7.2 Common HTTP error status codes

|HTTP status code|Error reason|Investigation direction|
| :--- | :--- | :--- |
| **401 Unauthorized** |The credentials are invalid, the Token has expired, or the authorization credentials are not provided.|Check the login password, confirm whether the cookies have been cleared by the browser or whether the token has expired.|
| **403 Forbidden** |Cross-site request check failed (CSRF), or resources that are not owned by the user are accessed.|Confirm whether the request header carries the correct `Origin` / `Referer` and check the `Host` header setting of the Nginx reverse proxy.|
| **422 Unprocessable** |Input field validation does not meet specifications.|Check whether the login account or password format meets API specification restrictions.|
