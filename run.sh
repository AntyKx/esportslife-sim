#!/usr/bin/env bash
# 同步主專案的戰鬥引擎與報告腳本 → 推送 → 在 GitHub 雲端跑模擬，回傳 run id。
# 用法：bash run.sh [每組場數] [說明]
set -e
cd "$(dirname "$0")"
SRC="../電競人生原型"
for f in roster.js game.js battle.js rift.js rift-nav.js macro.js kits.js; do cp "$SRC/$f" engine/; done
sed "s#D=__dirname+'/..'#D=__dirname+'/../engine'#" "$SRC/.preview/report.cjs" > sim/report.cjs
sed "s#D=__dirname+'/..'#D=__dirname+'/../engine'#" "$SRC/.preview/calib.cjs" > sim/calib.cjs
git add -A
git -c user.name="AntyKx" -c user.email="antyk123@gmail.com" commit -q -m "${2:-同步引擎}

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" || true
git push -q
gh workflow run "${3:-sim}" -f games="${1:-40}" >/dev/null
sleep 5
gh run list --workflow "${3:-sim}" --limit 1 --json databaseId -q '.[0].databaseId'
