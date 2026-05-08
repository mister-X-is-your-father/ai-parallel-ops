# ntfy notification server for Claude Code

[claude-notifications-go](https://github.com/777genius/claude-notifications-go) からの通知を集約してWindows/Android/iOS等にfan-outするセルフホストntfyサーバー。Tailscale越しのプライベートエンドポイントで運用する想定。

## 構成

```
[Claude Code on host]
   ↓ Stop / Notification / PreToolUse hooks
[claude-notifications-go プラグイン (state machine)]
   ↓ webhook
[ntfy server (このディレクトリ)]
   ↓ push (Tailnet経由)
[Windows PWA / Android ntfyアプリ / iOS / etc.]
```

## 前提

- Docker + Docker Compose
- Tailscale（HTTPSエンドポイント用に `tailscale serve` を使用）
- Claude Code（プラグイン側のセットアップ用）

## セットアップ

### 1. ntfyサーバー起動

```bash
cp .env.example .env
$EDITOR .env  # NTFY_BASE_URL を自分の Tailnet ホスト名に
docker compose up -d
curl http://localhost:8765/v1/health  # {"healthy":true} が出ればOK
```

### 2. Tailscale経由のHTTPS化

```bash
tailscale serve --bg --https=11443 http://localhost:8765
# → https://YOUR-HOST.tail<XXXXX>.ts.net:11443 で到達可能に
```

`.env` の `NTFY_BASE_URL` をこのHTTPS URLに合わせて、`docker compose up -d` で再起動。

### 3. トピック生成

```bash
echo "claude-$(hostname)-$(openssl rand -hex 8)" > topic.txt
```

このトピック名は実質パスワードなので外部に漏らさないこと（`topic.txt` は gitignore 済み）。

### 4. Claude Codeプラグイン側

```bash
curl -fsSL https://raw.githubusercontent.com/777genius/claude-notifications-go/main/bin/bootstrap.sh | bash
```

`~/.claude/claude-notifications-go/config.json` に webhook を設定。テンプレートは `claude-plugin-config.example.json` を参照。

### 5. クライアント購読

- **Windows/Mac**: `https://YOUR-HOST.ts.net:11443/<topic>` をブラウザで開いて PWA 化、または ntfy デスクトップアプリで購読
- **Android**: F-Droid または Play Store から ntfy アプリ → "Use another server" で同URL + topic
- **Termux + termux-notification連携**: `ntfy subscribe URL --exec 'termux-notification ...'` で常駐

## ファイル

- `docker-compose.yml` — サーバー本体（パラメータ化済）
- `.env.example` — 環境変数テンプレート
- `RECOVERY.md` — 障害復旧手順
- `claude-plugin-config.example.json` — プラグイン側設定テンプレート

## 注意点

- **HTTPS必須**: AndroidのntfyアプリでカスタムサーバーをHTTPで購読は可能だが、PWA Web Push通知はHTTPS必須
- **Priority 5は連続バイブ**: ntfy仕様で max priority は continuous notification。普段使いは 3〜4 推奨
- **Tailscale経由のみ**: `tailscale serve` を使うと自動的にTailnet内のみアクセス可。インターネット公開はしない
