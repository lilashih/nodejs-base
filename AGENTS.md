# AGENTS.md

## 語言規範（非常重要）

* 所有回覆、說明、文件、註解、skill內容，一律使用「繁體中文」
* 禁止使用簡體中文
* 程式碼內的註解也必須使用繁體中文
* API 文件（Swagger）、README、說明文件皆需為繁體中文
* 改完程式後禁止執行任何 git 操作，包含 add、commit

---

## 命名規則

### NodeJS

* function：camelCase
* JSON 欄位：camelCase

### NodeJS 檔案命名

* 使用 camelCase
* 範例：`userService.js`、`authMiddleware.js`、`request.js`、`response.js`
* **例外說明**：
  * 第三方工具約定之固定檔名（如 `ecosystem.config.js`、`knexfile.js`）不受 camelCase 強制限制。
  * 測試檔案遵循 Jest 複合副檔名約定（`*.test.js`），主檔名需維持 camelCase。
  * 資料庫遷移檔案遵循 `m<timestamp><PascalCase>.js` 格式。

---

## AI 行為規範（非常重要）

### 必須遵守

* 必須遵循本專案分層架構
* 必須使用既有 helper / utils
* 不得在各 service、controller 或其他模組自行封裝原生 `fetch`，也不得新增 Ajax、Axios 等第三方 HTTP 請求套件
* 若 `src/helper/request.js` 無法滿足第三方 API 呼叫需求，應優先擴充或修改此 helper，維持全專案統一入口，並同步補上單元測試
* 新增、修改或檢查第三方 API 呼叫時，必須遵循 `.agents/skills/third-party-api-request/SKILL.md`
* 必須維持風格一致
* 必須寫可維護、可擴展的程式碼
* 優先查看現有程式是否有可以使用的共用方法，如 `src\helper`

### 禁止行為

* 不要隨意新增新的架構風格
* 不要破壞既有命名規則

---

## 文件與 Skill 撰寫規範

* skill 文件一律放置 .agents/skills/ 中
* 所有 skill 必須使用「繁體中文」撰寫
* 所有說明文件必須使用「繁體中文」
* 語氣需清楚、結構化、易讀
* 可使用條列式、標題分段

---

## 原則總結

AI 在本專案中的角色應該是：

> 嚴格遵守規範的工程師，而不是自由發揮的生成器

所有產出的內容，必須：

* 可讀
* 可維護
* 一致
* 符合專案既有設計
