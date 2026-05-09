---
name: rpa
description: Tailscale越しにasus-1のChromeをリモート操作してWebタスクを実行する。検索、ページ閲覧、フォーム入力、スクレイピング、ログイン後の操作、複雑なWebワークフロー等。利用可能ツール群は mcp__playwright-asus1__browser_* (navigate, click, type, snapshot, screenshot, fill_form, evaluate, network_requests 等23種)。「Webサイト見て」「Googleで調べて」「フォーム埋めて」「ログインして」のような指示で発動。
user-invocable: true
---

# RPA - リモートブラウザ自動化

Tailscale越しに接続された別マシン（asus-1）のChromeを操作するスキル。`mcp__playwright-asus1__browser_*` ツール群で実装される。

## アーキテクチャ

```
[このClaude Code]
   ↓ MCP/SSE
   ↓ Tailscale (https://asus-1.tail65add4.ts.net:8443)
[asus-1: Playwright MCP server]
   ↓ CDP (localhost:9222)
[asus-1: Chrome (RpaProfile)]
```

設定はすべて永続化済み。Claude Code再起動でもツール自動ロード。MCP接続失敗時は対象マシンの状態を疑う。

## 主要ツール

| ツール | 用途 |
|---|---|
| `browser_navigate` | URL遷移 |
| `browser_snapshot` | ページのaccessibility tree取得（**スクショより軽量・LLM向き、迷ったらこれ**） |
| `browser_take_screenshot` | スクリーンショット（視覚確認が必要な時のみ） |
| `browser_click` | 要素クリック（snapshotから取得した `ref=eXX` を `target` に渡す） |
| `browser_type` | テキスト入力。`submit: true` でEnter送信併用可 |
| `browser_fill_form` | 複数フィールド一括入力 |
| `browser_press_key` | キー入力（Enter, Escape等） |
| `browser_select_option` | selectボックス操作 |
| `browser_evaluate` | 任意JS実行 |
| `browser_network_requests` | ページが発したHTTPリクエスト履歴取得 |
| `browser_console_messages` | ページのconsoleログ取得 |
| `browser_wait_for` | 要素・テキスト出現待機 |
| `browser_handle_dialog` | alert/confirmダイアログ処理 |
| `browser_tabs` | タブ管理 |

その他: `browser_drag`, `browser_drop`, `browser_hover`, `browser_resize`, `browser_file_upload`, `browser_navigate_back`, `browser_close` 等。

## 鉄則

1. **まず `browser_snapshot`** — ページ構造をaccessibility treeで把握。ref=eXX を以後のtarget指定に使う。
2. **screenshotは控えめに** — トークン消費大。視覚確認が必要な時のみ。
3. **target は ref優先** — `target: "e42"` のように snapshot 由来のrefを指定。CSSセレクタ直書きは最後の手段。
4. **submit属性活用** — `browser_type(..., submit: true)` で型入力＋Enter1コマンド完結。
5. **ログイン前提のサイト** — 初回はユーザーが手動でRpaProfile（asus-1の専用Chromeプロファイル）にログインすると、以降cookieが永続。

## 典型パターン

### A. 検索 → 結果抽出

```
1. browser_navigate(url="https://www.google.com")
2. browser_snapshot                              # 検索ボックスのref取得
3. browser_type(target="検索ボックスのref", text="クエリ", submit=true)
4. browser_snapshot(depth=5)                     # 結果取得
5. 必要に応じて browser_click で詳細へ
```

### B. フォーム送信

```
1. browser_navigate(url=フォームURL)
2. browser_snapshot                              # フィールド構造把握
3. browser_fill_form(fields=[{name, type, ref, value}, ...])
4. browser_click(target="submitボタンref")
5. browser_wait_for(text="完了メッセージ")
```

### C. スクレイピング（リスト取得）

```
1. browser_navigate(url=対象URL)
2. browser_snapshot(depth=10)                    # 深く取得
3. accessibility tree から構造化データを抽出（スキル内ロジックで処理）
4. 必要ならpaginate: browser_click(次ページボタン) → loop
```

### D. ログイン後のオペレーション

```
1. browser_navigate(url=ログイン後ダッシュボード)
2. browser_snapshot                              # ログイン状態か確認
3. もしログイン要求 → ユーザーに「RpaProfileに手動ログインしてください」と通知
4. ログイン済みなら通常操作へ
```

### E. ページのJS実行で値取得

```
browser_evaluate(function="() => document.querySelector('.target').innerText")
```

DOM構造で直接取れない値（計算結果、動的JS結果等）に有効。

## トラブルシューティング

| 症状 | 確認 |
|---|---|
| MCPツールがエラー | `curl -m 3 https://asus-1.tail65add4.ts.net:8443/sse \| head -2` で疎通 |
| Chromeに接続できない | asus-1で `Get-ScheduledTask -TaskName 'RPA-*'` の State確認 |
| 古いタブが残ってる | `browser_tabs` で一覧 → 不要分を `browser_close` |
| 言語が日本語じゃない | URLに `&hl=ja` 付与、または `browser_evaluate` で localStorage 確認 |

詳細セットアップ・永続化仕様は `~/rpa/ai-rpa/mcp/README.md` を参照。

## 設定値（asus-1のChrome）

- プロファイルパス: `C:\Users\ikimo\AppData\Local\Google\Chrome\RpaProfile`
- メインのChromeとは独立。RPA用の専用ブラウザ。
- ログイン情報は永続化されるが、本人が初回手動ログインする必要あり。
