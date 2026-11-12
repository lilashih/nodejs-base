# 前端開發

前端使用 Vue 3、Vue Router 與 Vite，與 Express 共用一個 HTTP 埠。完整目錄與系統關係見 [架構總覽](../docs/0-架構總覽.md)，前端實作規範見 [第 9 篇](../docs/9-前端開發.md)。

## 啟動

先依 [根目錄 README](../README.md) 設定後端與 Migration，再於專案根目錄執行：

~~~powershell
pnpm --dir frontend install
pnpm dev
~~~

預設網址為 http://127.0.0.1:3000/app/。Vite 使用 build --watch 重建靜態檔，不啟動另一個 HTTP server；修改前端後重新整理瀏覽器，修改後端由 PM2 重啟。結束前端監看後以 `pnpm stop` 停止背景後端。

## 建置與設定

~~~powershell
pnpm --dir frontend check
pnpm build:frontend
~~~

產物位於 `frontend/dist/`。API 使用同源 /api，圖片使用 /uploads。正式前端值放在 `src/config/config.js`，`VITE_*` 為建置時公開覆寫，不能在部署後透過修改 `.env` 更新已建置的 JavaScript。禁止放入任何機密資訊。

JWT 由後端放在 `HttpOnly` Cookie；前端記憶體保存 user 資訊。重整頁面會呼叫 /api/auth/me 還原登入，Cookie 有效時通常不需重新登入。認證與 CSRF 規則見 [第 6 篇](../docs/6-登入與認證.md)。

公開文章只顯示已發布內容，登入者透過「我的文章」管理自己的草稿。頁面使用 api 模組與共用 request helper，避免重複處理 HTTP。

