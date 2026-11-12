# 2. 同源架構、CORS 與 CSRF 機制

本篇說明專案之同源架構本質、跨來源資源共享（CORS）配置、Session Cookie 安全性，以及 `csrfMiddleware` 的防護比對機制。登入與 Token 生命週期另見 [第 6 篇：登入與認證](6-登入與認證.md)，正式環境之 Nginx 反向代理與 HTTPS 部署設定請參閱 [第 11 篇：正式部署與反向代理](11-正式部署與反向代理.md)。

---

## 一、同源架構概念與本專案設計

### 1.1 同源判定原則（Origin）

Web 瀏覽器的「同源政策（Same-Origin Policy）」是前端安全性的第一道防線，**Origin 僅由「通訊協定（Scheme）、主機域名（Host）、通訊埠（Port）」三者共同決定**，路徑不參與判定：

| 前端存取網址 | API 請求網址 | 是否同源 | 判定原因 |
| --- | --- | :---: | --- |
| `http://localhost:3000/app/` | `http://localhost:3000/api/posts` | **是** | 協定、主機、Port 皆完全相同（僅路徑不同）。 |
| `http://localhost:3000/app/` | `http://127.0.0.1:3000/api/posts` | **否** | 主機名稱不同（`localhost` 與 `127.0.0.1` 視為不同來源）。 |
| `http://localhost:5173/` | `http://localhost:3000/api/posts` | **否** | 通訊埠不同（Port 5173 與 Port 3000）。 |
| `https://app.example.com/` | `http://app.example.com/` | **否** | 通訊協定不同（HTTPS 與 HTTP）。 |
| `https://app.example.com/` | `https://api.example.com/` | **否** | 網域名稱不同（子網域不同）。 |

### 1.2 本專案的同源設計優勢

本專案採用前後端同 Port 架構，由後端 Express 同時託管：
* 前端 SPA 頁面：掛載於 `/app/`
* 後端 RESTful API：掛載於 `/api`
* 使用者靜態檔案：掛載於 `/uploads`

前端透過相對路徑（例如 `/api/posts`）發送請求，瀏覽器會直接向目前網址發出，**預設即為標準同源連線**，這帶來三大好處：
1. **免除 CORS 負擔**：同源請求完全不觸發跨來源預檢請求（Preflight OPTIONS），降低網路延遲。
2. **Cookie 原生相容**：Session Cookie 不會被瀏覽器判定為第三方 Cookie，避免現代瀏覽器防追蹤政策的阻擋。
3. **CSRF 防護天然一致**：請求標頭的 Host 與 Origin 天然吻合，無需繁雜的跨域轉接。

---

## 二、CORS 機制與跨來源 API 存取

當專案必須開放給外部獨立前端（例如行動 App、合作夥伴微前端、或獨立運行的前端開發機）存取時，需配置跨來源資源共享（CORS）。

### 2.1 CORS 核心設定（`CORS_ORIGINS`）

在專案根目錄的 `.env` 中設定允許存取的來源清單：

```dotenv
CORS_ORIGINS=https://app.example.com,http://localhost:5173
```

* **格式規範**：多個 Origin 以逗號分隔，必須為**完整 Origin**（包含協定與必要通訊埠），**不可包含任何路徑或尾端斜線**。
* **比對機制**：[corsMiddleware.js](../src/http/middleware/corsMiddleware.js) 採用嚴格字串完整比對，**不支援萬用字元 `*`**。

### 2.2 中介軟體回應行為與規則

| 請求情境 | 中介軟體處理行為 |
| --- | --- |
| **Origin 在清單內** | 回傳對應的 `Access-Control-Allow-Origin: <來源>` 與 `Access-Control-Allow-Credentials: true`。 |
| **Origin 不在清單內** | 不回傳任何允許該來源的 CORS 標頭，瀏覽器將封鎖該回應。 |
| **任何帶有 Origin 的請求** | 自動附加 `Vary: Origin`，防止快取伺服器或瀏覽器快取混淆不同來源的回應。 |
| **OPTIONS 預檢請求** | 回應 HTTP `204 No Content`，並告知允許之 Method、Headers 及預檢快取時間（86400 秒）。 |

#### 預設允許之 Method 與 Header
* **Methods**：`GET`, `HEAD`, `PUT`, `PATCH`, `POST`, `DELETE`, `OPTIONS`
* **Request Headers**：`Origin`, `Content-Type`, `Accept`, `Authorization`, `X-Request-Id`
* **Expose Headers**：對外暴露 `X-Request-Id`，讓前端能讀取鏈路追蹤碼。

> [!NOTE]
> **觀念提醒**：CORS 是瀏覽器端實施的跨來源防護，無法取代後端的 API 身分驗證機制，更無法限制 Postman、curl 或後端排程程式的直接呼叫。

---

## 三、Session Cookie 與 CSRF 防護深層機制

### 3.1 Cookie 安全旗標配置

本專案之 Session Token Cookie 具備以下安全屬性：
* `Path=/api`：限制 Cookie 僅在發送 `/api` 請求時自動攜帶。
* `HttpOnly`：禁止 JavaScript 存取，杜絕 XSS 竊取 Token。
* `SameSite=Lax`：提供跨站請求的基礎防護。
* `Secure`：由環境變數 `COOKIE_SECURE` 控制（正式 HTTPS 部署時務必設為 `true`）。

### 3.2 CSRF 防護比對機制（`csrfMiddleware`）

在以 Cookie 驗證的受保護寫入請求中，[csrfMiddleware.js](../src/http/middleware/csrfMiddleware.js) 會執行嚴格檢查：
1. 取得請求標頭中的 `Origin` 或 `Referer`。
2. 比對該來源網址的 Host（含 Port）是否與後端收到的請求 `Host` 標頭完全一致。
3. 若兩者不一致或兩項標頭均缺失，**直接回應 HTTP 403 Forbidden 拒絕請求**。

### 3.3 為什麼 CORS 已放行，寫入請求仍回傳 403？

CORS 與 CSRF 是兩道不同的檢查，CORS 用來設定允許瀏覽器從指定來源呼叫 API，檢查通過只表示瀏覽器可以繼續送出實際請求，但請求仍須通過後端的身分驗證與 CSRF 檢查。

例如，前端部署於 `https://app.example.com`，API 部署於 `https://api.example.com`，並已將前端來源加入 `CORS_ORIGINS`：

1. 瀏覽器送出 OPTIONS 預檢，CORS 檢查通過。
2. 前端以 Session Cookie 送出 `POST`、`PUT`、`PATCH` 或 `DELETE` 請求，此時請求的 `Origin` 是 `https://app.example.com`，API 收到的 `Host` 是 `api.example.com`。
3. `csrfMiddleware` 會檢查 `Origin` 或 `Referer` 的主機名稱與 Port 是否和請求的 `Host` 相同，此例的兩個主機名稱不同，因此後端回傳 HTTP 403，增加 CORS 允許來源無法通過這項檢查。

> [!IMPORTANT]
> **本專案目前的部署方式**：若使用 Session Cookie 驗證寫入請求，請讓瀏覽器以同一個主機名稱與 Port 存取前端及 API（例如由反向代理將 `/api` 轉送至後端）。若前端與 API 必須使用不同來源，可改以 `Authorization: Bearer <token>` 傳送 Token，以 Bearer 驗證的請求不會觸發上述 Cookie 專用的 CSRF 檢查。

---

## 四、可信任代理概念（Trust Proxy）

後端在記錄用戶端 IP 時（[requestContextMiddleware.js](../src/http/middleware/requestContextMiddleware.js)），優先依賴 Express 的 `req.ip`。

* **本地開發**：`APP_TRUST_PROXY=loopback`（預設值），信任本機環回連線。
* **無反代直接對外**：應設為 `APP_TRUST_PROXY=false`，防止偽造 `X-Forwarded-For`。
* **正式環境置於反向代理（Nginx / ALB）之後**：需依代理架構設定 `loopback`、IP 範圍或 hop 數。

> 正式環境中完整的 Nginx 反向代理配置、SSL 憑證設定、轉送標頭與安全隔離詳情，請參閱專屬的 [第 11 篇：正式部署與反向代理](11-正式部署與反向代理.md)。

---

## 五、請求安全性排查清單（Troubleshooting）

| 異常現象 | 可能原因與排查方向 |
| --- | --- |
| **瀏覽器 Console 顯示 CORS 錯誤** | 1. 檢查發送的 `Origin` 是否完整且精確包含在後端的 `CORS_ORIGINS` 清單中。<br>2. 檢查請求標頭是否包含了未被允許的自訂 Header。 |
| **登入成功但下一次請求變成 401 未授權** | 1. 檢查 Cookie 是否未包含在請求中，前端 fetch 需帶 `credentials: "include"`。<br>2. 若外部為 HTTPS，但 `COOKIE_SECURE` 設為 false，瀏覽器可能因安全政策拒絕寫入或發送。 |
| **以 Cookie 進行 POST 寫入時報 403 Forbidden** | 1. 檢查請求是否屬於跨網域呼叫（Origin 與 Host 不符）。<br>2. 若有反向代理，檢查代理層是否遺漏了保留原始 `Host` 的轉送標頭。 |
| **日誌中的用戶端 IP 全是 127.0.0.1** | 後端 `APP_TRUST_PROXY` 未正確設定，導致 Express 未讀取代理轉送之真實 IP。 |

