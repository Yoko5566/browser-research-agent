# Browser Research Agent

這是一個本地瀏覽器資訊抓取工具，用 Playwright 抓取公開網頁，輸出原始 Markdown、乾淨版 Markdown 與截圖。

## 目前功能

- 開啟指定網址
- 擷取網頁標題
- 記錄 Original URL / Final URL
- 記錄抓取時間
- 擷取頁面文字
- 儲存完整原始 Markdown
- 儲存乾淨版 Markdown
- 儲存整頁截圖

## 使用方式

```powershell
cd C:\Yoko_Local_AI_HQ\06_Code_Projects\browser_research_agent
node scripts\capture_page.js "https://example.com"