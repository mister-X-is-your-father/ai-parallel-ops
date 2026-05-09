#!/bin/bash
# leo (WSL) 状態スナップショット
# 出力: $LOG_DIR/YYYY-MM-DD/HHMMSS_<reason>.txt
# 引数: --reason scheduled|boot|event|manual

set -uo pipefail

REASON="manual"
[ "${1:-}" = "--reason" ] && REASON="${2:-manual}"

LOG_DIR="${LEO_DIAG_DIR:-/var/log/leo-diag}"
NOW=$(date +%Y-%m-%d_%H:%M:%S)
DATE_DIR=$(date +%Y-%m-%d)
TIME_STAMP=$(date +%H%M%S)
OUT_DIR="$LOG_DIR/$DATE_DIR"
OUT_FILE="$OUT_DIR/${TIME_STAMP}_${REASON}.txt"

mkdir -p "$OUT_DIR"

section() { echo -e "\n=== $1 === [$NOW]" >> "$OUT_FILE"; }

section "Reason: $REASON / Hostname: $(hostname) / Boot: $(who -b 2>/dev/null | awk '{print $3,$4}')"

section "Uptime / Load"
uptime >> "$OUT_FILE"

section "Memory"
free -h >> "$OUT_FILE"

section "Disk Free"
df -h / /home /tmp 2>/dev/null >> "$OUT_FILE"

section "Top10 CPU"
ps -eo pid,user,pcpu,pmem,etime,cmd --sort=-pcpu | head -11 >> "$OUT_FILE"

section "Top10 Memory"
ps -eo pid,user,pmem,pcpu,etime,cmd --sort=-pmem | head -11 >> "$OUT_FILE"

section "Tailscale Status"
tailscale status 2>&1 | head -30 >> "$OUT_FILE" || true

section "Tailscale Service"
systemctl status tailscaled --no-pager -n 5 2>&1 >> "$OUT_FILE" || true

section "Tailscale journal tail (last 30 lines, errors highlighted)"
journalctl -u tailscaled -n 30 --no-pager 2>&1 >> "$OUT_FILE" || true

section "Docker containers"
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>&1 >> "$OUT_FILE" || true

section "Claude Code processes"
ps -eo pid,etime,pcpu,pmem,cmd | grep -E "claude|node.*claude" | grep -v grep >> "$OUT_FILE" || true

section "Recent kernel messages (last 30)"
dmesg --time-format iso 2>/dev/null | tail -30 >> "$OUT_FILE" || dmesg | tail -30 >> "$OUT_FILE" 2>&1 || true

section "OOM killer activity (past 24h)"
journalctl --since "24 hours ago" --no-pager 2>/dev/null | grep -i "out of memory\|oom-killer\|killed process" | tail -20 >> "$OUT_FILE" || true

section "systemd failed units (system)"
systemctl --failed --no-pager 2>&1 >> "$OUT_FILE" || true

section "systemd failed units (user: neo)"
NEO_UID=$(id -u neo 2>/dev/null)
if [ -n "$NEO_UID" ]; then
    runuser -u neo -- bash -c "XDG_RUNTIME_DIR=/run/user/$NEO_UID DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/$NEO_UID/bus systemctl --user --failed --no-pager" 2>&1 >> "$OUT_FILE" || true
fi

section "Recently restarted services (auto-restart loops)"
journalctl --since "30 minutes ago" --no-pager 2>&1 | grep -iE "exited with status|Failed with result|auto-restart|Main process exited" | sort | uniq -c | sort -rn | head -10 >> "$OUT_FILE" || true

section "WSL host info"
[ -f /proc/version ] && cat /proc/version >> "$OUT_FILE"
[ -f /etc/wsl.conf ] && echo "--- /etc/wsl.conf ---" >> "$OUT_FILE" && cat /etc/wsl.conf >> "$OUT_FILE"

section "Network (ip addr summary)"
ip -br addr 2>&1 >> "$OUT_FILE" || true

section "Recent journal errors (last 30 min, priority err+)"
journalctl --since "30 minutes ago" -p err --no-pager 2>&1 | tail -30 >> "$OUT_FILE" || true

# 7日以上古いディレクトリ削除
find "$LOG_DIR" -maxdepth 1 -type d -name "20*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true

echo "Snapshot: $OUT_FILE"
