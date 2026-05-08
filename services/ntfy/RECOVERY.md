# ntfy Recovery

## 自動起動チェーン

WSL boot → systemd → docker.service / tailscaled.service → ntfyコンテナ + tailscale serve config 自動復元

## 手動復旧

### ntfyコンテナが落ちた

```bash
cd $(dirname "$0") && docker compose up -d
```

### tailscale serve 設定が消えた

```bash
# .env の NTFY_HOST_PORT をプロキシ先に
source .env
tailscale serve --bg --https=11443 "http://localhost:${NTFY_HOST_PORT:-8765}"
```

### フルリセット

```bash
docker compose up -d
source .env
tailscale serve --bg --https=11443 "http://localhost:${NTFY_HOST_PORT:-8765}"
curl "${NTFY_BASE_URL}/v1/health"   # {"healthy":true}
```

## クライアント側設定

- **Windows**: ntfyデスクトップアプリ or PWA
- **Android**: ntfyアプリ（F-Droid推奨、Play Storeも可）
- 全クライアント共通: Server = `$NTFY_BASE_URL`、Topic = `topic.txt` の中身
