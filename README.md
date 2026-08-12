# CineScope

以 TMDB 為資料來源的電影瀏覽網站，支援搜尋、探索與個人收藏。

**線上預覽：** [https://react-movie-app-five-kappa.vercel.app](https://react-movie-app-five-kappa.vercel.app)

## 功能

- **首頁**：顯示台灣地區近期上映電影
- **找電影 / 台灣片**：依類型、評分等條件探索片單
- **搜尋**：依關鍵字搜尋電影
- **電影詳情**：簡介、評分、卡司等資訊
- **演員頁**：查看演員相關作品
- **登入**：Firebase 帳號登入（含 Google）
- **我的片單**：登入後可收藏電影，資料同步至 Firestore

## 技術

React、Vite、Tailwind CSS、React Router、Firebase、TMDB API

## 本地開發

```bash
npm install
npm run dev
```

請在 `.env` 設定 TMDB 與 Firebase 相關環境變數後再啟動。
