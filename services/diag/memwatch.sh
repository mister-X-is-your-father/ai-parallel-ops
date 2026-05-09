#!/bin/bash
# メモリ枯渇監視。閾値超過時にntfyへ通知し、即時diagスナップショットを残す
# systemd timerで2分毎に実行する想定

set -uo pipefail

WARN_THRESHOLD="${LEO_MEM_WARN:-85}"   # %
ALERT_THRESHOLD="${LEO_MEM_ALERT:-92}" # %
RECOVER_THRESHOLD="${LEO_MEM_OK:-75}"  # ヒステリシス: ここまで下がったら再アラート許可

NTFY_URL="${NTFY_URL:-https://leo.tail65add4.ts.net:11443}"
NTFY_TOPIC="${NTFY_TOPIC:-claude-leo-a23955a4cf517f5a}"

STATE_FILE="/var/run/leo-memwatch.state"
SNAPSHOT_BIN="/home/neo/claudeutil/services/diag/snapshot.sh"

# /proc/meminfoから取得
read TOTAL AVAIL < <(awk '
  /^MemTotal:/     { total=$2 }
  /^MemAvailable:/ { avail=$2 }
  END              { print total, avail }
' /proc/meminfo)

USED_PCT=$(( (TOTAL - AVAIL) * 100 / TOTAL ))
USED_MB=$(( (TOTAL - AVAIL) / 1024 ))
TOTAL_MB=$(( TOTAL / 1024 ))

PREV_LEVEL="ok"
[ -f "$STATE_FILE" ] && PREV_LEVEL=$(cat "$STATE_FILE" 2>/dev/null || echo "ok")

CURRENT_LEVEL="ok"
if (( USED_PCT >= ALERT_THRESHOLD )); then
    CURRENT_LEVEL="alert"
elif (( USED_PCT >= WARN_THRESHOLD )); then
    CURRENT_LEVEL="warn"
elif (( USED_PCT < RECOVER_THRESHOLD )); then
    CURRENT_LEVEL="ok"
else
    # ヒステリシス領域：前の状態を維持
    CURRENT_LEVEL="$PREV_LEVEL"
fi

publish() {
    local title="$1" priority="$2" tags="$3"
    curl -fsS -m 5 \
        -H "Title: $title" \
        -H "Priority: $priority" \
        -H "Tags: $tags" \
        -d "メモリ使用率 ${USED_PCT}% (${USED_MB}MB / ${TOTAL_MB}MB)" \
        "${NTFY_URL%/}/${NTFY_TOPIC}" >/dev/null 2>&1 || true
}

# 状態遷移時のみ通知
if [ "$PREV_LEVEL" != "$CURRENT_LEVEL" ]; then
    case "$CURRENT_LEVEL" in
        warn)
            publish "⚠️ leo メモリ警告 ${USED_PCT}%" 4 "warning"
            ;;
        alert)
            publish "🚨 leo メモリ危険域 ${USED_PCT}%" 5 "rotating_light"
            "$SNAPSHOT_BIN" --reason event-memory >/dev/null 2>&1 || true
            ;;
        ok)
            [ "$PREV_LEVEL" != "ok" ] && publish "✅ leo メモリ復帰 ${USED_PCT}%" 3 "white_check_mark"
            ;;
    esac
    echo "$CURRENT_LEVEL" > "$STATE_FILE"
fi

# Top消費プロセスをログ（毎回）
LOG_DIR="/var/log/leo-diag/$(date +%Y-%m-%d)"
mkdir -p "$LOG_DIR"
echo "$(date +%H:%M:%S) used=${USED_PCT}% level=${CURRENT_LEVEL}  top: $(ps -eo pcpu,pmem,comm --sort=-pmem | head -4 | tail -3 | tr '\n' '|')" >> "$LOG_DIR/memwatch.log"
