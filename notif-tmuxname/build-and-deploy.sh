#!/usr/bin/env bash
#
# claude-notifications-go の通知タイトル先頭カッコを tmux セッション名にするパッチを
# 当て、バイナリを再ビルドしてプラグインキャッシュに差し替える。
#
# なぜ必要か:
#   claude-notifications-go プラグインは通知の先頭カッコを "deer da335448 <folder>"
#   （セッション UUID から生成した動物名）で出す。設定・環境変数では変えられないため
#   バイナリにパッチを当てる必要がある。tmux 内なら "[manademia-sub]" のように
#   tmux セッション名（rename-session / F2 で付けた名前）を出す。tmux 外では従来動作。
#
# いつ実行するか:
#   プラグイン更新でキャッシュ（とパッチ済みバイナリ）が作り直されたとき。
#   1 コマンドで現行バージョンに再適用して再デプロイする。
#
# 冪等: 既にパッチ済みなら patch をスキップして再ビルドのみ行う。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCHES="$HERE/patches"

# --- Go ツールチェーン解決（PATH > ~/.local/go-sdk） ---
if command -v go >/dev/null 2>&1; then
  GO=go
elif [ -x "$HOME/.local/go-sdk/bin/go" ]; then
  GO="$HOME/.local/go-sdk/bin/go"
else
  echo "ERROR: go が見つからない。Go をインストールするか ~/.local/go-sdk に展開して" >&2
  exit 1
fi
echo "Go: $("$GO" version)"

# --- 最新のプラグインキャッシュ version ディレクトリを特定 ---
CACHE_GLOB="$HOME/.claude/plugins/cache/claude-notifications-go/claude-notifications-go"
SRC="$(ls -d "$CACHE_GLOB"/*/ 2>/dev/null | sort -V | tail -1)"
SRC="${SRC%/}"
if [ -z "$SRC" ] || [ ! -f "$SRC/go.mod" ]; then
  echo "ERROR: プラグインソースが見つからない: $CACHE_GLOB/*/" >&2
  exit 1
fi
echo "Source: $SRC"

# --- パッチ適用（冪等: 適用済みならスキップ） ---
cd "$SRC"
if grep -q "GetTmuxSessionName" internal/notifier/tmux.go 2>/dev/null; then
  echo "Patch: 既に適用済み（スキップ）"
else
  echo "Patch: 適用中..."
  patch -p1 --forward < "$PATCHES/tmux.go.patch"
  patch -p1 --forward < "$PATCHES/hooks.go.patch"
fi

# --- ビルド（strip して配布サイズを抑える） ---
echo "Build..."
export GOFLAGS=-mod=mod
OUT="$(mktemp)"
"$GO" build -ldflags "-s -w" -o "$OUT" ./cmd/claude-notifications
echo "Built: $("$OUT" version)"

# --- デプロイ（初回のみ元バイナリをバックアップして差し替え） ---
BIN="$SRC/bin/claude-notifications-linux-amd64"
VER="$(basename "$SRC")"
if [ ! -f "$BIN.orig-$VER" ]; then
  cp "$BIN" "$BIN.orig-$VER"
  echo "Backup: $BIN.orig-$VER"
fi
cp "$OUT" "$BIN"
rm -f "$OUT"
echo "Deployed: $BIN"
echo "Live: $("$SRC/bin/claude-notifications" version)"
echo "完了。tmux 内で新セッション起動 → 完了通知の先頭が [<tmux session 名>] になる。"
