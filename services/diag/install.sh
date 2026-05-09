#!/bin/bash
# leo診断レコーダーをsystemd timerで常駐化
# 使い方: sudo ./install.sh

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
    echo "sudo で実行してください" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SNAPSHOT_BIN="$SCRIPT_DIR/snapshot.sh"
WATCHER_BIN="$SCRIPT_DIR/watcher.sh"
LOG_DIR="/var/log/leo-diag"

chmod +x "$SNAPSHOT_BIN" "$WATCHER_BIN"
mkdir -p "$LOG_DIR"
chown $SUDO_USER:$SUDO_USER "$LOG_DIR"

# systemd journal永続化（既に有効なら何もしない）
mkdir -p /var/log/journal
systemd-tmpfiles --create --prefix /var/log/journal 2>/dev/null || true
if grep -q "^#Storage=auto" /etc/systemd/journald.conf 2>/dev/null; then
    sed -i 's/^#Storage=auto/Storage=persistent/' /etc/systemd/journald.conf
    systemctl restart systemd-journald
    echo "✓ systemd-journald: persistent storage 有効化"
else
    echo "○ systemd-journald: 既存設定のまま"
fi

# === 1. periodic snapshot service & timer ===
cat > /etc/systemd/system/leo-diag-snapshot.service <<EOF
[Unit]
Description=leo diagnostic snapshot (one-shot)
After=tailscaled.service

[Service]
Type=oneshot
ExecStart=$SNAPSHOT_BIN --reason scheduled
User=root
EOF

cat > /etc/systemd/system/leo-diag-snapshot.timer <<EOF
[Unit]
Description=leo diag snapshot every 10 minutes

[Timer]
OnBootSec=2min
OnUnitActiveSec=10min
Persistent=true

[Install]
WantedBy=timers.target
EOF

# === 2. boot snapshot (oneshot at boot) ===
cat > /etc/systemd/system/leo-diag-boot.service <<EOF
[Unit]
Description=leo diag snapshot at boot
After=multi-user.target tailscaled.service
Wants=tailscaled.service

[Service]
Type=oneshot
ExecStartPre=/bin/sleep 30
ExecStart=$SNAPSHOT_BIN --reason boot
User=root

[Install]
WantedBy=multi-user.target
EOF

# === 3. tailscaledダウン検知 ===
cat > /etc/systemd/system/leo-diag-on-tsdown.service <<EOF
[Unit]
Description=Snapshot when tailscaled fails
BindsTo=tailscaled.service
After=tailscaled.service

[Service]
Type=oneshot
ExecStart=$SNAPSHOT_BIN --reason event-tsdown
User=root
EOF

# tailscaled.serviceのdrop-inでOnFailure発火
mkdir -p /etc/systemd/system/tailscaled.service.d
cat > /etc/systemd/system/tailscaled.service.d/leo-diag.conf <<EOF
[Unit]
OnFailure=leo-diag-on-tsdown.service
EOF

# === 4. realtime watcher (常駐、journal -f でクリティカル検出時即snapshot) ===
cat > /etc/systemd/system/leo-diag-watcher.service <<EOF
[Unit]
Description=leo diag realtime watcher (journalctl -f based)
After=systemd-journald.service

[Service]
Type=simple
ExecStart=$WATCHER_BIN
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

systemctl enable --now leo-diag-snapshot.timer
systemctl enable leo-diag-boot.service
systemctl enable --now leo-diag-watcher.service
systemctl restart tailscaled || true

echo
echo "=== インストール完了 ==="
echo "ログ場所: $LOG_DIR"
echo
echo "確認:"
echo "  systemctl list-timers leo-diag-*"
echo "  ls -lt $LOG_DIR/\$(date +%Y-%m-%d)/"
echo
echo "即時実行:"
echo "  sudo systemctl start leo-diag-snapshot.service"
