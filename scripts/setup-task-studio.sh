#!/usr/bin/env bash
# setup-task-studio.sh
# Task StudioをWSL2 + Tailscale環境で動作するようにセットアップする。
# - chokidarのポーリング有効化（WSL2のinotify問題回避）
# - JSバンドルのWebSocket URLをTailscale IPに書き換え
#
# Usage:
#   ./scripts/setup-task-studio.sh                        # カレントディレクトリの.taskmasterで起動
#   ./scripts/setup-task-studio.sh -d ~/projects/myapp    # 指定ディレクトリの.taskmasterで起動
#   ./scripts/setup-task-studio.sh --kill                 # 停止のみ

set -euo pipefail

PORT_HTTP=5565
PORT_WS=5566
TARGET_DIR=""

kill_existing() {
  fuser -k "$PORT_HTTP/tcp" "$PORT_WS/tcp" 2>/dev/null || true
  sleep 1
}

# 引数パース
while [[ $# -gt 0 ]]; do
  case "$1" in
    --kill)
      echo "Stopping Task Studio..."
      kill_existing
      echo "Done."
      exit 0
      ;;
    -d|--dir)
      TARGET_DIR="$2"
      shift 2
      ;;
    *)
      TARGET_DIR="$1"
      shift
      ;;
  esac
done

# ターゲットディレクトリの解決
if [[ -n "$TARGET_DIR" ]]; then
  TARGET_DIR=$(realpath "$TARGET_DIR")
  # .taskmasterが直接指定された場合とプロジェクトルートの場合の両方に対応
  if [[ -d "$TARGET_DIR/.taskmaster" ]]; then
    TASKMASTER_DIR="$TARGET_DIR/.taskmaster"
  elif [[ "$(basename "$TARGET_DIR")" == ".taskmaster" ]] && [[ -d "$TARGET_DIR" ]]; then
    TASKMASTER_DIR="$TARGET_DIR"
  else
    echo "ERROR: .taskmaster directory not found in $TARGET_DIR" >&2
    exit 1
  fi
else
  # デフォルト: カレントディレクトリ
  TASKMASTER_DIR="$(pwd)/.taskmaster"
fi

if [[ ! -d "$TASKMASTER_DIR" ]]; then
  echo "ERROR: $TASKMASTER_DIR does not exist" >&2
  exit 1
fi

echo "Target: $TASKMASTER_DIR"

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

# 起動（TASKMASTER_DIRを環境変数で渡す）
echo "Starting Task Studio..."
TASKMASTER_DIR="$TASKMASTER_DIR" nohup npx task-studio@latest --no-open -d "$TASKMASTER_DIR" >/dev/null 2>&1 &
disown

# 起動待ち
for i in $(seq 1 10); do
  if ss -tlnp 2>/dev/null | grep -q ":$PORT_HTTP " && ss -tlnp 2>/dev/null | grep -q ":$PORT_WS "; then
    echo ""
    echo "Task Studio is running:"
    echo "  HTTP: http://$TS_IP:$PORT_HTTP"
    echo "  WS:   ws://$TS_IP:$PORT_WS"
    echo "  Dir:  $TASKMASTER_DIR"

    # 複数プロジェクト同期（projects.jsonがあれば自動起動）
    SYNC_SCRIPT="$(dirname "$0")/sync-tasks.sh"
    PROJECTS_FILE="$(dirname "$0")/../.taskmaster/projects.json"
    if [[ -x "$SYNC_SCRIPT" ]] && [[ -f "$PROJECTS_FILE" ]] && [[ "$(jq 'length' "$PROJECTS_FILE" 2>/dev/null)" -gt 0 ]]; then
      echo "Starting multi-project sync..."
      nohup "$SYNC_SCRIPT" --watch >/dev/null 2>&1 &
      disown
    fi

    exit 0
  fi
  sleep 1
done

echo "ERROR: Task Studio failed to start within 10 seconds" >&2
exit 1
