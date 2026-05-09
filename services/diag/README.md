# leo Diag Recorder

leo (WSL) 自身の状態を常時記録する診断ロガー。Tailscale停止・OOM killer・systemd失敗・WSL異常終了等を検出し、復旧後に「あの時何が起きたか」を遡れる。

## 検出するイベント

| 種別 | 検出方法 |
|---|---|
| 通常稼働状態 | systemd timer で 10分毎スナップショット |
| 起動直後 | systemd boot サービスで起動から30秒後にスナップショット |
| **Tailscale異常終了** | `tailscaled.service` の OnFailure ドロップインで自動発火 |
| OOM killer | journal から検出 |
| systemd失敗ユニット | スナップショット時に検出 |

ログ場所: `/var/log/leo-diag/YYYY-MM-DD/HHMMSS_<reason>.txt`

reason: `scheduled` / `boot` / `event-tsdown` / `manual`

ローテーション: 7日経過したディレクトリは自動削除。

## 各スナップショット内容

- Uptime / Load average
- メモリ使用量、ディスク残量
- CPU/メモリ Top10 プロセス
- Tailscale status / netcheck / journal末尾
- Docker コンテナ状態（ntfy等）
- Claude Code プロセス情報
- カーネルメッセージ末尾（dmesg）
- OOM killer発火履歴（過去24h）
- systemd失敗ユニット
- WSL host info、ネットワークIF
- journalのエラー（過去30分）

## セットアップ

```bash
cd ~/claudeutil/services/diag
sudo ./install.sh
```

これで以下が自動セットアップされる：
- `/var/log/leo-diag/` 作成
- systemd journal の persistent storage 有効化
- `leo-diag-snapshot.timer` (10分毎)
- `leo-diag-boot.service` (起動時)
- `tailscaled.service` の OnFailure フック → 異常時即時スナップショット

## 使い方

### 即時スナップショット

```bash
sudo systemctl start leo-diag-snapshot.service
ls -lt /var/log/leo-diag/$(date +%Y-%m-%d)/ | head -3
```

### インシデント分析

```bash
cd ~/claudeutil/services/diag
./analyze.sh           # 過去24時間
./analyze.sh 72        # 過去72時間
```

### 任意時点の状態を見る

```bash
ls /var/log/leo-diag/                # 日付一覧
cat /var/log/leo-diag/2026-05-09/142000_event-tsdown.txt
```

### ジャーナル横断（systemd journal）

```bash
journalctl --list-boots                              # 過去のboot履歴
journalctl --boot -1 -p err --no-pager               # 前回boot分のエラー
journalctl -u tailscaled --since "1 hour ago"        # tailscaled 1時間
journalctl --since "2026-05-09 14:00" --until "2026-05-09 15:00" -p warning
```

## WSL異常終了からの復旧

WSLが停止した場合、systemd journalがpersistent storage有効なので**前回までのログは残る**。  
WSL再起動後：

1. `journalctl --list-boots` で過去のboot ID取得
2. `journalctl --boot <ID>` で当該boot分の全ログ閲覧
3. `~/claudeutil/services/diag/analyze.sh 168` で過去1週間の異常履歴閲覧

## トラブル

- スナップショット出ない → `systemctl status leo-diag-snapshot.timer`
- timerリスト → `systemctl list-timers leo-diag-*`
- 失敗ログ → `journalctl -u leo-diag-snapshot.service -n 50`

## 拡張案

- インシデント検出時にntfy通知push（既存ntfy基盤を活用）
- claude-code crash検出（プロセス監視ループ）
- GPU状態取得（nvidia-smi等が必要なら）
