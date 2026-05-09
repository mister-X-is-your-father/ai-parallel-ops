#!/bin/bash
# リアルタイムジャーナル監視。クリティカルパターン検出時に即時スナップショット
# systemd serviceとして常駐させる想定 (leo-diag-watcher.service)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SNAPSHOT_BIN="$SCRIPT_DIR/snapshot.sh"
COOLDOWN_SEC="${LEO_DIAG_COOLDOWN:-60}"
STATE_FILE="/var/run/leo-diag-watcher.last"

# 検出するパターン（クラッシュ・OOM・予期せぬ停止等）
PATTERNS='(out of memory|oom-killer|killed process|kernel panic|kernel BUG|general protection fault|segfault|service.*Failed with result|Main process exited.*code=killed|Main process exited.*status=139|tailscaled.*panic|tailscaled.*fatal)'

# クールダウン: 同じ事象で連続発火を防ぐ
should_fire() {
    local now=$(date +%s)
    local last=0
    [ -f "$STATE_FILE" ] && last=$(cat "$STATE_FILE" 2>/dev/null || echo 0)
    if (( now - last >= COOLDOWN_SEC )); then
        echo "$now" > "$STATE_FILE"
        return 0
    fi
    return 1
}

logger -t leo-diag-watcher "starting (patterns: $PATTERNS, cooldown: ${COOLDOWN_SEC}s)"

# journalctl -f でリアルタイムtail、新規エントリのみ
journalctl -f -n 0 --no-pager 2>&1 | while read -r line; do
    if echo "$line" | grep -qiE "$PATTERNS"; then
        if should_fire; then
            logger -t leo-diag-watcher "trigger: $line"
            "$SNAPSHOT_BIN" --reason event-watcher >/dev/null 2>&1 || true
        fi
    fi
done
