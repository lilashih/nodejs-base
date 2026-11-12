# Node.js Base

本專案是一套以 Vue 3、Express 5、MySQL／SQLite 與 JWT 組成的全端基礎專案。前端、API 與圖片由同一個 HTTP 服務提供，支援 Node.js／PM2 執行，以及 Bun 獨立執行檔發布。

第一次閱讀請從 [架構總覽](docs/0-架構總覽.md) 開始，掌握前端、後端、DB 與打包之間的關係。

## 安裝與啟動

開發環境需要 Node.js 22.5 以上、pnpm 10，SQLite 模式使用 Node.js 內建模組，MySQL 模式需 MySQL 8.0.13 以上。於專案根目錄執行：

~~~powershell
pnpm install
pnpm --dir frontend install
Copy-Item .env.example .env
~~~

編輯 `.env`，以 `DB_CLIENT` 選擇 `mysql` 或 `sqlite`，設定對應的連線資訊及隨機 `JWT_SECRET`（至少 32 個字元）。MySQL 模式需先建立 `MYSQL_DATABASE` 指定的空資料庫，SQLite 模式會自動建立資料庫檔案。接著執行：

~~~powershell
pnpm migrate
pnpm dev
~~~

預設前端為 http://127.0.0.1:3000/app/，API 連線測試可呼叫 /api/health，debug／test 模式下可以開啟 API 文檔為 /apidoc。

`pnpm dev` 會啟動背景 PM2 後端並監看前端建置，若要關閉服務以 `pnpm stop` 停止後端，詳細設定見 [環境設定與啟動](docs/1-環境設定與啟動.md)。

## 常用指令

| 指令 | 用途 |
| --- | --- |
| `pnpm dev` | 前後端開發。 |
| `pnpm start:node` | Node 前景執行。 |
| `pnpm start`／`pnpm stop` | PM2 啟動／停止。 |
| `pnpm check` | 後端語法與命名檢查。 |
| `pnpm test` | 執行全套測試（單元與 API 測試）。 |
| `pnpm test:unit` | 單元測試。 |
| `pnpm test:coverage` | 執行測試並產生覆蓋率報告。 |
| `pnpm --dir frontend check` | 前端型別檢查。 |
| `pnpm build:frontend` | 前端建置。 |
| `pnpm migrate` | 執行待套用遷移。 |
| `pnpm migrate:create addPostCategory` | 建立遷移檔，仍須登錄 registry。 |
| `pnpm migrate:rollback` | 確認後回滾最近一批。 |
| `pnpm migrate:rollback -- --step=1` | 確認後逐筆回滾。 |
| `pnpm migrate:fresh` | debug／test 中刪除整個 DB 並重建。 |
| `pnpm migrate:unlock` | 確認無遷移程序後解除鎖。 |
| `pnpm build:bun` | 建置當前平台的 Bun 發布產物。 |
| `pnpm build:bun:windows`／`pnpm build:bun:linux` | 明確指定目標。 |

完整測試說明與架構見 [測試說明](docs/8-測試說明.md)。

## 文件導覽

| 文件 | 主題 |
| --- | --- |
| [0. 架構總覽](docs/0-架構總覽.md) | 全端結構、目錄、資料流程與發布方式。 |
| [1. 環境設定與啟動](docs/1-環境設定與啟動.md) | 安裝、設定值、啟動、路徑與全部自訂 pnpm 指令。 |
| [2. 同源架構、CORS 與 CSRF 機制](docs/2-同源架構、CORS與CSRF機制.md) | 同源架構本質、CORS 跨來源配置、Cookie 安全性與 CSRF 防護。 |
| [3. 請求處理、日誌與錯誤](docs/3-請求處理、日誌與錯誤.md) | Middleware、追蹤、回應、日誌與錯誤。 |
| [4. 資料庫與 Migration](docs/4-資料庫與Migration.md) | SQL、交易、資料表與結構版本。 |
| [5. Swagger 與 API 契約](docs/5-Swagger.md) | API 文件查看與維護。 |
| [6. 登入與認證](docs/6-登入與認證.md) | Cookie、Bearer JWT 與 CSRF。 |
| [7. 後端模組與圖片儲存](docs/7-後端模組與圖片儲存.md) | 模組分層、文章權限、分頁與圖片。 |
| [8. 測試說明](docs/8-測試說明.md) | 單元測試、API 測試、前端檢查與測試指南。 |
| [9. 前端開發](docs/9-前端開發.md) | Vue、路由、API、設定與靜態建置。 |
| [10. Bun 打包與部署](docs/10-Bun打包說明.md) | 建置、交付、Windows／Linux 服務與更新。 |
| [11. 正式部署與反向代理](docs/11-正式部署與反向代理.md) | Nginx 反向代理配置、HTTPS (SSL) 憑證設定、轉送標頭與上線排查。 |