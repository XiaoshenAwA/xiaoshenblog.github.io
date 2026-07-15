#!/bin/bash
set -e
if [ -z "$GH_PAT" ]; then
  echo "GH_PAT not set, skipping GitHub Pages deploy"
  exit 0
fi
WORK_DIR="/tmp/gh-deploy"
rm -rf "$WORK_DIR"
git clone --depth 1 -b main "https://x-access-token:$GH_PAT@github.com/XiaoshenAwA/xiaoshenblog.github.io.git" "$WORK_DIR"
rm -rf "$WORK_DIR/docs"
cp -r dist "$WORK_DIR/docs"
touch "$WORK_DIR/docs/.nojekyll"
cd "$WORK_DIR"
git add docs/
if git diff --staged --quiet; then
  echo "No changes"
  exit 0
fi
git config user.name "cloudflare-bot"
git config user.email "bot@cloudflare.com"
git commit -m "deploy: update GitHub Pages"
git push
