# notif-tmuxname — 通知の先頭カッコを tmux セッション名にするパッチ

`claude-notifications-go` プラグイン（ntfy 等へ webhook 通知を飛ばすやつ）の
通知プレフィックスを、tmux セッション名に変えるための**バイナリパッチ**一式。

## 何が変わるか

| | プレフィックス |
|---|---|
| 変更前 | `[deer da335448 manademia] 本文…`（セッション UUID 由来の動物名 + フォルダ名） |
| 変更後（tmux 内） | `[manademia-sub] 本文…`（tmux セッション名 = rename-session / F2 で付けた名前） |
| 変更後（tmux 外） | 従来どおり `[deer da335448 manademia]`（フォールバック） |

通知本文（`✏️ 14 edited ▶ 19 cmds ⏱ 12m 56s` 等の集計）はそのまま維持。

## なぜパッチが必要か

プレフィックスはプラグインの**ビルド済み Go バイナリ内**（`internal/hooks/hooks.go`）で
`sessionname.GenerateSessionLabel(sessionID)` から生成している。設定ファイル
（`~/.claude/claude-notifications-go/config.json`）にも環境変数にも上書き口が無く、
「送信せず payload を出力する」dry-run も無い。よってバイナリを再ビルドするしかない。

## 仕組み（パッチ内容）

`patches/` に 2 つの unified diff:

- **`tmux.go.patch`** — `internal/notifier/tmux.go` に `GetTmuxSessionName()` を追加。
  既存の `getTmuxSocketPath()` / `$TMUX_PANE` 解決を流用し、
  `tmux display-message -p -t <pane> '#{session_name}'` を実行。tmux 外や失敗時は `""`。
- **`hooks.go.patch`** — `internal/hooks/hooks.go` のメッセージ組み立てで、
  `GetTmuxSessionName()` が非空なら `[<tmux名>] 本文` にし、構造化 `SessionName` にも伝播
  （Slack/Discord/ntfy プリセット間で一貫）。空なら従来フォーマットにフォールバック。

## 使い方

```bash
~/claudeutil/notif-tmuxname/build-and-deploy.sh
```

これで:
1. 最新のプラグインキャッシュ version ディレクトリを特定
2. パッチ適用（冪等。適用済みならスキップ）
3. `go build -ldflags "-s -w"` で再ビルド
4. 元バイナリを `*.orig-<version>` にバックアップしてから差し替え

**前提**: Go ツールチェーン。`PATH` に `go` が無ければ `~/.local/go-sdk/bin/go` を見る
（無ければ https://go.dev/dl の linux-amd64 tarball を `~/.local/go-sdk` に展開）。

## プラグイン更新時

プラグインを更新するとキャッシュ（とパッチ済みバイナリ）が作り直され、
**素のバイナリに戻る**。上記スクリプトをもう一度実行すれば現行バージョンに再適用される。

> パッチが当たらなくなったら（= upstream が該当箇所を変更）、`patches/*.patch` を
> 現行ソース（`~/.claude/plugins/cache/claude-notifications-go/.../internal/...`）に
> 対して手で当て直し、diff を取り直す。変更は 2 箇所だけなので軽い。

## 検証方法（参考）

tmux セッション `manademia-sub` 内で、webhook URL を mock に向けた一時 HOME を使い
`handle-hook Notification` を実行 → mock が受けた body の `"message"` が
`[manademia-sub] …` で始まることを確認した（2026-06-21）。
