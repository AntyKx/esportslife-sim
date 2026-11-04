# esportslife-sim

電競人生原型的戰鬥模擬（只含戰鬥引擎與報告腳本）。在 GitHub Actions 上執行，不佔用本機資源。

- `engine/`：從主專案複製的戰鬥引擎檔案
- `sim/report.cjs`：依選手判斷力（iq）跑 N 場，輸出擊殺、首殺、gank、反野、入侵等統計
- 執行：Actions → sim → Run workflow（或 `gh workflow run sim -f games=40`）
