#!/bin/bash
# leo診断ログから直近の異常イベントを抽出
# 使い方: ./analyze.sh [hours]   デフォルト24時間

HOURS="${1:-24}"
LOG_DIR="${LEO_DIAG_DIR:-/var/log/leo-diag}"

if [ ! -d "$LOG_DIR" ]; then
    echo "ログディレクトリなし: $LOG_DIR" >&2
    echo "先に install.sh で常駐化を" >&2
    exit 1
fi

CUTOFF=$(date -d "$HOURS hours ago" +%s 2>/dev/null || date -v-${HOURS}H +%s)

echo "=== 過去${HOURS}時間のイベント発火 ==="
find "$LOG_DIR" -name "*_event-*.txt" -o -name "*_boot.txt" 2>/dev/null | while read f; do
    mtime=$(stat -c %Y "$f" 2>/dev/null || echo 0)
    [ "$mtime" -gt "$CUTOFF" ] && echo "▼ $(date -d @$mtime '+%H:%M:%S')  $(basename "$f")"
done

echo
echo "=== Tailscale 接続切断/エラー痕跡 ==="
grep -lE "PollNetMap|connection refused|panic|tailscaled.*error|tailscaled.*fatal" "$LOG_DIR"/*/*.txt 2>/dev/null | while read f; do
    mtime=$(stat -c %Y "$f"); [ "$mtime" -gt "$CUTOFF" ] && echo "$f"
done | tail -10

echo
echo "=== OOM killer痕跡 ==="
grep -lE "out of memory|oom-killer|killed process" "$LOG_DIR"/*/*.txt 2>/dev/null | while read f; do
    mtime=$(stat -c %Y "$f"); [ "$mtime" -gt "$CUTOFF" ] && echo "$f"
done | tail -10

echo
echo "=== systemd failed units ==="
grep -lE "● .*failed|Failed Units: [1-9]" "$LOG_DIR"/*/*.txt 2>/dev/null | while read f; do
    mtime=$(stat -c %Y "$f"); [ "$mtime" -gt "$CUTOFF" ] && echo "$f"
done | tail -10

echo
echo "=== 直近のスナップショット（最新5件） ==="
find "$LOG_DIR" -name "*.txt" -printf "%T@ %p\n" 2>/dev/null | sort -rn | head -5 | awk '{print strftime("%Y-%m-%d %H:%M:%S", $1), $2}'

echo
echo "詳細:  cat <ファイルパス>"
echo "ジャーナル横断:  journalctl --since '${HOURS} hours ago' -p err"
echo "前回Boot分:  journalctl --boot -1 -p err --no-pager"
