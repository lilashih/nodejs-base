---
name: third-party-api-request
description: 新增、修改或檢查本專案的第三方 HTTP API 呼叫時使用；統一透過 src/helper/request.js，並檢查逾時、重試、敏感資料、body、錯誤處理與測試契約。
---

# 第三方 API 請求規範與呼叫指南

處理任何後端對外 HTTP API 呼叫前，先閱讀 `src/helper/request.js` 與 `test/unit/requestHelper.test.js`，以目前程式碼與單元測試確認 helper 的實際契約。

本 Skill 專門規範**後端伺服器對外發出之第三方請求**（前端瀏覽器對本系統發起之 API 呼叫由 `frontend/src/helper/request.js` 處理，請勿混淆）。

---

## 一、核心原則與邊界

1. **唯一全域呼叫入口**：所有後端第三方 HTTP 呼叫一律使用 `src/helper/request.js` 匯出的 `request()`。
2. **嚴禁私自引入或封裝**：
   - 任何 service、controller、middleware、script 或其他模組，**嚴禁自行使用或封裝原生 `fetch`**。
   - **嚴禁新增 Axios、Ajax、got 或其他第三方 HTTP client 套件**。
3. **擴充優先於繞過**：若現有 helper 無法滿足特定第三方需求（如特殊標頭、特定串流等），應優先修改擴充 `src/helper/request.js` 並同步補齊單元測試，絕不在呼叫端另起爐灶。
4. **環境設定隔離**：第三方 API 之基礎網址（Base URL）、金鑰憑證、連線逾時等可變設定，一律由 `src/config/` 提供，業務層嚴禁直接存取 `process.env`。
5. **資料結構轉譯**：Service 負責將第三方回應資料轉為專案之 `camelCase` 領域資料，Controller 不處理供應商原始格式或原始例外。

---

## 二、呼叫方式與參數契約

### 1. 基礎呼叫範例

```javascript
const { request } = require("@src/helper/request.js");

const response = await request(
    "POST",
    "https://example.com/api/orders",
    { itemId: 123, quantity: 2 },
    { Authorization: "Bearer demo-token" },
    { timeout: 10000 },
);
```

### 2. 函式簽名與參數規範

```javascript
request(method, url, data = null, headers = {}, options = {})
```

| 參數 | 型態 | 預設值 | 行為與規範說明 |
| :--- | :--- | :--- | :--- |
| `method` | `string` | `"GET"` | HTTP 方法，helper 會自動轉為全大寫（如 `"GET"`、`"POST"`）。 |
| `url` | `string` | *(必填)* | 完整目標網址。若包含動態路徑片段（Path Segment），呼叫端必須先經 `encodeURIComponent()` 編碼。 |
| `data` | `any` | `null` | `GET` / `HEAD` 時自動轉為 URL Query String；其他 Method 時作為 Request Body。與 `options.query` 或 `options.body` 不得重複指定。 |
| `headers` | `object` | `{}` | 額外的 Request Headers。呼叫端負責傳遞第三方供應商要求的認證 Header（如 `Authorization`、`X-API-Key`）。 |
| `options.query` | `object` | `undefined` | 明確指定 Query 參數，適用於所有 HTTP 方法（可與非 GET/HEAD 的 Body 同時使用）。 |
| `options.body` | `any` | `undefined` | 明確指定 Request Body（GET / HEAD 嚴禁傳入 Body，否則拋出 `TypeError`）。 |
| `options.bodyType` | `string` | `undefined` | 可指定 `"formData"` 或 `"urlEncoded"`；未指定且 `data` 為物件時預設以 JSON 序列化。 |
| `options.timeout` | `number` | `8000` | 連線逾時毫秒數，必須為大於 0 之整數（預設 8000 ms）。 |
| `options.signal` | `AbortSignal` | `undefined` | 呼叫端傳入之取消信號，helper 會透過 `AbortSignal.any()` 將其與逾時信號自動合併。 |

> [!IMPORTANT]
> **參數防呆防衝突原則**：
> - `data` 不可與相同用途的明確參數重複指定（例如：GET 請求不能同時帶 `data` 與 `options.query`；POST 請求不能同時帶 `data` 與 `options.body`）。
> - 若 POST 請求既需要 URL Query 又需要 Request Body，應將 Body 傳入 `data`，Query 傳入 `options.query`：
>   ```javascript
>   const res = await request("POST", "https://api.example.com/items", { name: "測試" }, {}, { query: { notify: true } });
>   ```

---

## 三、Request Body 與 Content-Type 規範

| 傳輸格式 | 指定方式 | 標頭處理與型別限制 |
| :--- | :--- | :--- |
| **JSON** | 一般 JavaScript 物件 | 自動序列化為 JSON 字串；若未手動指定，自動補上 `Content-Type: application/json`。 |
| **FormData** | 傳入 `FormData` 實例，或設定 `options.bodyType = "formData"` | **嚴禁手動設定 `Content-Type`**，必須由執行環境自動產生包含隨機 Boundary 的標頭。<br/>欄位值僅接受字串、數字、布林值、`null` 或 `Blob`；巢狀物件或陣列會直接拋出 `TypeError`。若供應商要求傳入 JSON 欄位，需在傳入前先明確 `JSON.stringify()`。 |
| **URL-encoded** | 設定 `options.bodyType = "urlEncoded"` | 未指定 `Content-Type` 時自動補上 `application/x-www-form-urlencoded`；已指定時保留原值。 |
| **純文字 / 原生字串** | 直接傳入字串內容 | 依第三方 API 要求提供對應內容，並手動在 `headers` 帶上精確的 `Content-Type`。 |

> 串流（Stream）、大型檔案分塊下載等特殊情境，若現有 helper 無法支援，應先擴充 helper 及其單元測試，絕不在業務代碼中繞道處理。

---

## 四、成功回應結構與錯誤分類

### 1. 成功回應格式（HTTP 2xx）

當第三方 API 返回 2xx 狀態碼時，helper 回傳標準化物件：

```javascript
{
    httpCode: 200,      // 第三方返回之 HTTP 狀態碼 (number)
    headers: {},        // 一般 JavaScript 物件格式之回應標頭
    data: {},           // 自動嘗試解析為 JSON；若解析失敗則保留原始文字字串；若無內容為 null
    url: "https://...", // 請求完整 URL
    method: "POST"      // 當次請求之 HTTP 方法
}
```

### 2. 失敗回應與 `RequestError` 體系

凡非 2xx 回應、網路中斷、連線逾時或手動取消，helper 一律拋出專屬的 `RequestError`：

| 失敗情境 | `httpCode` | `errorType` | 特性與處理指引 |
| :--- | :---: | :---: | :--- |
| **HTTP 4xx / 5xx** | 第三方狀態碼 | `http_error` | 第三方回應錯誤。`error.message` 不直接使用供應商原始訊息；`error.url` 與 `error.response.url` 僅保留 Origin（遮蔽敏感 Query）。 |
| **連線逾時** | `408` | `timeout` | 請求超過指定之 `timeout` 毫秒數，底層 AbortController 觸發逾時中斷。 |
| **呼叫端取消** | `499` | `cancelled` | 呼叫端傳入之 `options.signal` 被手動觸發 abort。 |
| **網路連線失敗** | `500` | `network_error` | DNS 解析失敗、連線被拒絕等底層網路故障。底層例外保留於 `error.cause`。 |
| **參數規格不符** | *(不發出請求)* | *(TypeError)* | 無效的 timeout、參數衝突等，直接拋出 JavaScript `TypeError`。 |

> [!CAUTION]
> **業務層轉譯守則**：
> 1. `RequestError` 是外部通訊異常，**Service 應依業務邏輯主動捕獲並轉譯為專案的 `AppError`（如 `BadGatewayError` 或特定領域錯誤）**，絕不可將未處理的 `RequestError` 直接丟到全域中介層轉為 500。
> 2. 判斷錯誤時應依據 `error.httpCode` 或 `error.errorType`，**切勿依賴第三方的錯誤字串（message）進行業務邏輯判定**。
> 3. `error.data` 與 `error.cause` 可能包含第三方回傳的敏感原始資料，**嚴禁未經脫敏直接寫入日誌或對外回傳給前端客戶端**。

---

## 五、逾時、取消與重試原則

1. **有限逾時（Mandatory）**：每一次對外呼叫都必須設定有限逾時。預設為 `8000ms`，若特定批次服務較慢，必須從 `src/config/` 明確傳入數值。
2. **取消信號**：透過傳入 `options.signal` 支援請求中斷。
3. **重試安全防護**：
   - **預設絕對不自動重試**。
   - 僅在第三方契約與業務需求明確允許時，才可在 helper 擴充有限次數（如最多 2-3 次）的指數退避重試（Exponential Backoff）。
   - **嚴禁重試非冪等操作**：POST 建立資源、信用卡扣款、發送發票或外部通知等會產生副作用的操作，在沒有 Idempotency Key 或雙向補償機制的情況下，**絕對禁止重試**。

---

## 六、資安與日誌記錄守則

1. **嚴禁記錄憑證與機敏資料**：
   - API Key、Token、Secret、Cookie、Authorization 標頭、使用者身分證字號、信用卡號等，嚴禁寫入日誌、README、Swagger 或錯誤訊息。
2. **URL 脫敏處理**：
   - 記錄日誌時，僅保留服務名稱、HTTP Method、去除 Query 敏感參數之 URL、`httpCode` 與 Request ID。
3. **測試全面 Mock**：
   - 自動化測試中**絕對嚴禁發出真實的外部 HTTP 請求**。必須使用 Jest Mock 模擬 `fetch` 行為，並使用明顯的假憑證。

---

## 七、實作流程與完成前檢驗

### 實作 SOP

1. **查閱現有配置**：先搜尋 `src/config/`，確認是否已有該供應商的配置與既有 Service。
2. **核對第三方文件**：確認目標端點之 Method、URL、認證方式、Query 結構、Body 格式、逾時限制與冪等性要求。
3. **使用統一 helper 呼叫**：調用 `src/helper/request.js`，將回傳值 Mapping 為專案 `camelCase` 結構。
4. **撰寫單元與整合測試**：在 `test/unit/` 為 Service 補齊成功、HTTP 失敗、網路中斷、逾時及敏感資料遮罩測試。
5. **執行全專案檢查**：執行測試與語法檢驗。

### 完成前全專案掃描

執行以下命令，確認 `src/helper/request.js` 之外沒有任何直接調用原生 HTTP client 的代碼（測試中的 mock 允許保留）：

```powershell
rg -n --glob "*.js" "\bfetch\s*\(|axios|\bajax\s*\(" src test
```
