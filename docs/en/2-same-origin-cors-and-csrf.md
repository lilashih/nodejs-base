# 2. Same-origin architecture, CORS and CSRF mechanism

This article explains the nature of the project's same-origin architecture, Cross-Origin Resource Sharing (CORS) configuration, Session Cookie security, and `csrfMiddleware`'s protection comparison mechanism. Please refer to [Part 6: Login and Authentication](6-login-and-authentication.md) for login and Token life cycle. Please refer to [Part 11: Production Deployment and Reverse Proxy](11-production-deployment-and-reverse-proxy.md) for the Nginx reverse proxy and HTTPS deployment settings in the production environment.

---

## 1. Concept of same-origin architecture and design of this project

### 1.1 Principle of same-origin determination (Origin)

The browser's Same-Origin Policy is the first line of defense for frontend security. **Origin is determined only by the scheme, host, and port**; the path does not affect it:

|Front-end access URL|API request URL|Is it same-origin?|Determine the cause|
| --- | --- | :---: | --- |
| `http://localhost:3000/app/` | `http://localhost:3000/api/posts` |**yes**|The protocol, host, and port are all exactly the same (only the path is different).|
| `http://localhost:3000/app/` | `http://127.0.0.1:3000/api/posts` |**no**|The host names are different (`localhost` and `127.0.0.1` are considered different sources).|
| `http://localhost:5173/` | `http://localhost:3000/api/posts` |**no**|The communication ports are different (Port 5173 and Port 3000).|
| `https://app.example.com/` | `http://app.example.com/` |**no**|The communication protocols are different (HTTPS vs. HTTP).|
| `https://app.example.com/` | `https://api.example.com/` |**no**|Domain names are different (subdomains are different).|

### 1.2 Advantages of same-origin design in this project

This project adopts the same Port architecture for the front-end and back-end, and is hosted by the back-end Express at the same time:
* Front-end SPA page: mounted on `/app/`
* Backend RESTful API: mounted on `/api`
* User static files: mounted on `/uploads`

The front-end sends a request through a relative path (such as `/api/posts`), and the browser will send it directly to the current URL. **The default is a standard same-origin connection**, which brings three major benefits:
1. **Relieve the burden of CORS**: Same-origin requests do not trigger cross-origin preflight requests (Preflight OPTIONS) at all, reducing network latency.
2. **Cookie native compatibility**: Session Cookie will not be judged as a third-party cookie by the browser, avoiding the blockage of modern browser anti-tracking policies.
3. **CSRF protection is naturally consistent**: The Host and Origin of the request header are naturally consistent, without the need for complicated cross-origin transfers.

---

## 2. CORS mechanism and cross-origin API access

When the project must be accessible to external independent front-ends (such as mobile apps, partner micro-frontends, or independently running front-end development machines), Cross-Origin Resource Sharing (CORS) needs to be configured.

### 2.1 CORS core settings (`CORS_ORIGINS`)

Set the list of sources allowed to be accessed in `.env` in the project root directory:

```dotenv
CORS_ORIGINS=https://app.example.com,http://localhost:5173
```

* **Format specification**: Multiple Origins are separated by commas and must be **complete Origin** (including protocol and necessary communication ports). **cannot contain any paths or trailing slashes**.
* **Comparison mechanism**: [corsMiddleware.js](../../src/http/middleware/corsMiddleware.js) uses strict string complete comparison, **does not support the wildcard `*`**.

### 2.2 Middleware response behavior and rules

|request context|Middleware processing behavior|
| --- | --- |
|**Origin is in the list**|Return the corresponding `Access-Control-Allow-Origin: <來源>` and `Access-Control-Allow-Credentials: true`.|
|**Origin is not in the list**|Do not pass back any CORS headers that allow this origin, and the browser will block the response.|
|**Any request with Origin**|Automatically append `Vary: Origin` to prevent caching servers or browser caches from obfuscating responses from different sources.|
|**OPTIONS Preflight Request**|Respond to HTTP `204 No Content`, and inform the allowed Method, Headers and preflight cache time (86400 seconds).|

#### Method and Header allowed by default
* **Methods**：`GET`, `HEAD`, `PUT`, `PATCH`, `POST`, `DELETE`, `OPTIONS`
* **Request Headers**：`Origin`, `Content-Type`, `Accept`, `Authorization`, `X-Request-Id`
* **Expose Headers**: Expose `X-Request-Id` to the outside world, allowing the front end to read the link tracking code.

> [!NOTE]
> **Concept Reminder**: CORS is a cross-origin protection implemented on the browser side. It cannot replace the back-end API authentication mechanism, nor can it restrict direct calls from Postman, curl, or back-end schedulers.

---

## 3. Session Cookie and CSRF protection deep mechanism

### 3.1 Cookie security flag configuration

The Session Token Cookie of this project has the following security attributes:
* `Path=/api`: Restrict cookies to be automatically carried only when sending `/api` requests.
* `HttpOnly`: Disable JavaScript access to prevent XSS from stealing tokens.
* `SameSite=Lax`: Provides basic protection for cross-site requests.
* `Secure`: controlled by the environment variable `COOKIE_SECURE` (must be set to `true` for production HTTPS deployment).

### 3.2 CSRF protection comparison mechanism (`csrfMiddleware`)

In cookie-validated protected write requests, [csrfMiddleware.js](../../src/http/middleware/csrfMiddleware.js) performs strict checks:
1. Get `Origin` or `Referer` from the request header.
2. Compare whether the Host (including Port) of the source URL is completely consistent with the request `Host` header received by the backend.
3. If the two are inconsistent or both headers are missing, **directly respond to HTTP 403 Forbidden to reject the request**.

### 3.3 Why does the write request still return 403 even though CORS has been released?

CORS and CSRF are two different checks. CORS is used to allow the browser to call the API from a specified source. Passing the check only means that the browser can continue to send actual requests, but the request must still pass the back-end authentication and CSRF checks.

For example, the frontend is deployed on `https://app.example.com`, the API is deployed on `https://api.example.com`, and the frontend source has been added to `CORS_ORIGINS`:

1. The browser sends OPTIONS pre-check, and the CORS check passes.
2. The front end uses Session Cookie to send `POST`, `PUT`, `PATCH` or `DELETE` requests. At this time, the `Origin` requested is `https://app.example.com`, and the `Host` received by the API is `api.example.com`.
3. `csrfMiddleware` will check whether the host name and Port of `Origin` or `Referer` are the same as the requested `Host`. In this example, the two host names are different, so the backend returns HTTP 403. Adding CORS allowed sources cannot pass this check.

> [!IMPORTANT]
> **Current deployment method of this project**: If you use Session Cookie to verify write requests, please let the browser access the front end and API with the same host name and Port (for example, the reverse proxy forwards `/api` to the back end). If the front end and API must use different sources, you can use `Authorization: Bearer <token>` to transmit the Token instead. Requests verified with Bearer will not trigger the above cookie-specific CSRF check.

---

## 4. Trust Proxy Concept

When the backend records the client IP ([requestContextMiddleware.js](../../src/http/middleware/requestContextMiddleware.js)), it preferentially relies on Express's `req.ip`.

* **Local development**: `APP_TRUST_PROXY=loopback` (default value), trust the local loopback connection.
* **Direct external without reverse proxy**: should be set to `APP_TRUST_PROXY=false` to prevent forgery of `X-Forwarded-For`.
* **Production environment is placed behind reverse proxy (Nginx/ALB)**: `loopback`, IP range or hop number need to be set according to the proxy architecture.

> For complete Nginx reverse proxy configuration, SSL certificate settings, forwarding headers and security isolation details in the production environment, please refer to the exclusive [Part 11: Production Deployment and Reverse Proxy](11-production-deployment-and-reverse-proxy.md).

---

## 5. Request security troubleshooting list (Troubleshooting)

|abnormal phenomenon|Possible causes and troubleshooting directions|
| --- | --- |
|**Browser Console shows CORS error**|1. Check that the sent `Origin` is complete and accurately included in the backend's `CORS_ORIGINS` manifest. <br>2. Check whether the request header contains an unallowed custom header.|
|**Login is successful but the next request becomes 401 Unauthorized**|1. Check whether the cookie is not included in the request. The front-end fetch needs to carry `credentials: "include"`. <br>2. If the external is HTTPS, but `COOKIE_SECURE` is set to false, the browser may refuse to write or send due to security policy.|
|**POST with Cookie to write Times 403 Forbidden**|1. Check whether the request is a cross-origin call (Origin and Host do not match). <br>2. If there is a reverse proxy, check whether the proxy layer misses the forwarding header that retains the original `Host`.|
|**The client IPs in the logs are all 127.0.0.1**|The backend `APP_TRUST_PROXY` is not set correctly, causing Express to not read the real IP forwarded by the proxy.|

