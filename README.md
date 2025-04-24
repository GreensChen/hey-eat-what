# 欸！要吃什麼！

「欸！要吃什麼！」是一個幫助用戶快速決定用餐選擇的手機版網頁應用。當用戶無法決定吃什麼時，只需點擊一個按鈕，應用程式就會根據用戶當前位置，隨機推薦附近的餐廳，解決用戶的「選擇困難症」。

## 功能特色

- 自動獲取用戶當前位置
- 隨機推薦附近的餐廳
- 顯示餐廳名稱、地址、評分等信息
- 點擊餐廳卡片可直接開啟 Google Maps 導航
- 「再抽一次」功能提供新的餐廳推薦，不重複之前顯示過的餐廳

## 技術規格

- 前端框架：React + Next.js
- UI 元件庫：Material Design
- 外部 API：Google Maps Places API
- 定位服務：瀏覽器 Geolocation API

## 開始使用

### 1. 安裝依賴

```bash
npm install
```

### 2. 設置環境變數

在專案根目錄創建一個 `.env.local` 檔案，並添加以下內容：

```
GOOGLE_MAPS_API_KEY=您的Google_Maps_API_金鑰
```

注意：
- 請將此金鑰存儲在 `.env.local` 文件中，不要提交到版本控制系統
- 只通過後端 API 路由使用此金鑰，不要在前端代碼中暴露
- 所有 Google API 請求應通過 Next.js API 路由進行代理

### 3. 啟動開發伺服器

```bash
npm run dev
```

在瀏覽器中打開 [http://localhost:3000](http://localhost:3000) 查看應用程式。

## Google Maps API 設置

本應用程式使用 Google Maps Places API 獲取附近餐廳信息。您需要在 Google Cloud Platform 上創建一個專案並啟用以下 API：

- Places API (地點搜索)
- Maps JavaScript API (地圖顯示)
- Geocoding API (地址轉座標)
- Directions API (導航功能)

### 獲取 API 金鑰的步驟

1. 登入 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建一個新專案
3. 啟用上述必要的 API
4. 創建 API 金鑰
5. 設置 API 金鑰限制（建議限制 HTTP 參照網址和 API 使用範圍）

## 專案結構

```
src/
├── app/
│   ├── api/                 # API 路由
│   │   ├── nearby-restaurants/  # 獲取附近餐廳的 API
│   │   └── place-photo/     # 獲取餐廳照片的 API
│   ├── recommendation/      # 推薦頁面
│   ├── globals.css          # 全局樣式
│   ├── layout.tsx           # 應用程式布局
│   └── page.tsx             # 首頁
└── ...
```

## 部署

您可以使用 [Vercel Platform](https://vercel.com/) 輕鬆部署此 Next.js 應用程式。部署時，請確保設置環境變數 `GOOGLE_MAPS_API_KEY`。
