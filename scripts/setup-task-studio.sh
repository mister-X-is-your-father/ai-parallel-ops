#!/usr/bin/env bash
# setup-task-studio.sh
# Task StudioをWSL2 + Tailscale環境で動作するようにセットアップする。
# - chokidarのポーリング有効化（WSL2のinotify問題回避）
# - JSバンドルのWebSocket URLをTailscale IPに書き換え
#
# Usage:
#   ./scripts/setup-task-studio.sh        # セットアップ + 起動
#   ./scripts/setup-task-studio.sh --kill  # 停止のみ

set -euo pipefail

PORT_HTTP=5565
PORT_WS=5566

kill_existing() {
  fuser -k "$PORT_HTTP/tcp" "$PORT_WS/tcp" 2>/dev/null || true
  sleep 1
}

if [[ "${1:-}" == "--kill" ]]; then
  echo "Stopping Task Studio..."
  kill_existing
  echo "Done."
  exit 0
fi

# Tailscale IPの取得（なければlocalhost）
TS_IP=$(tailscale ip -4 2>/dev/null || echo "localhost")
echo "Tailscale IP: $TS_IP"

# npxキャッシュにTask Studioをインストール（初回のみ）
echo "Ensuring task-studio is installed..."
npx task-studio@latest --help >/dev/null 2>&1

# npxキャッシュのパスを特定
NPX_CACHE=$(find ~/.npm/_npx -path "*/task-studio/scripts/ws.js" -printf "%h\n" 2>/dev/null | head -1)
if [[ -z "$NPX_CACHE" ]]; then
  echo "ERROR: task-studio cache not found" >&2
  exit 1
fi
TASK_STUDIO_ROOT=$(dirname "$NPX_CACHE")
echo "Task Studio root: $TASK_STUDIO_ROOT"

# Patch 1: chokidar polling（WSL2 inotify回避）
WS_JS="$NPX_CACHE/ws.js"
if ! grep -q 'usePolling' "$WS_JS"; then
  echo "Patching ws.js: enabling chokidar polling..."
  sed -i 's/persistent: true,/persistent: true,\n      usePolling: true,\n      interval: 500,/' "$WS_JS"
else
  echo "ws.js: polling already enabled"
fi

# Patch 2: JSバンドルのWebSocket URLをTailscale IPに書き換え
patch_js_bundle() {
  local js_file="$1"
  if [[ -f "$js_file" ]]; then
    if grep -q "ws://localhost:" "$js_file"; then
      echo "Patching $(basename "$js_file"): ws://localhost -> ws://$TS_IP"
      sed -i "s|ws://localhost:|ws://$TS_IP:|g" "$js_file"
    elif grep -q "ws://$TS_IP:" "$js_file"; then
      echo "$(basename "$js_file"): already patched for $TS_IP"
    fi
  fi
}

# 両方のlayout JSをパッチ（staticとstandalone）
for layout_js in $(find "$TASK_STUDIO_ROOT/.next" -name "layout-*.js" -path "*/chunks/app/*" 2>/dev/null); do
  patch_js_bundle "$layout_js"
done

# 既存プロセスを停止
kill_existing

# 起動
echo "Starting Task Studio..."
nohup npx task-studio@latest --no-open >/dev/null 2>&1 &
disown

# 起動待ち
for i in $(seq 1 10); do
  if ss -tlnp 2>/dev/null | grep -q ":$PORT_HTTP " && ss -tlnp 2>/dev/null | grep -q ":$PORT_WS "; then
    echo ""
    echo "Task Studio is running:"
    echo "  HTTP: http://$TS_IP:$PORT_HTTP"
    echo "  WS:   ws://$TS_IP:$PORT_WS"
    exit 0
  fi
  sleep 1
done

echo "ERROR: Task Studio failed to start within 10 seconds" >&2
exit 1
