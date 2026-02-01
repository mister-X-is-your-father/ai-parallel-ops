# tmux セットアップ

Claude Code並列運用のためのtmux設定。ペイン状態の視覚化とチートシート表示を含む。

## 設定ファイル

`~/.tmux.conf`:

```bash
# 256色対応
set -g default-terminal "tmux-256color"
set -ag terminal-overrides ",*256col*:Tc"

# マウス操作を有効化
set -g mouse on

# ペイン分割のキーバインド
bind | split-window -h
bind - split-window -v
unbind '"'

# ステータスバー2段
set -g status 2
set -g status-bg colour235
set -g status-fg white
set -g status-left '[#S] '
set -g status-right '%Y-%m-%d %H:%M'

# 2段目: チートシート
set -g status-format[1] '#[align=left,bg=colour236,fg=colour248] | split-h  - split-v  d detach  z zoom  x kill  [ copy  q quit-copy  arrows move  C-b+arrows resize  :setw sync on/off'

# ペインの背景色・文字色
set -g window-active-style 'bg=#000000,fg=#00ff00'
set -g window-style 'bg=#1a1a1a,fg=#aaaaaa'

# ペインボーダー色
set -g pane-active-border-style 'fg=#00ff00'
set -g pane-border-style 'fg=#666666'

# ヒストリーサイズ
set -g history-limit 500

# 下スクロールで一番下に達したら即座にコピーモード終了
bind -n WheelDownPane if-shell -F "#{pane_in_mode}" "send-keys -M" ""

# ペイン境界線にディレクトリ表示
set -g pane-border-status bottom
set -g pane-border-format ' #{s|/home/neo|~|:pane_current_path} '

# WSLクリップボード連携
bind-key -T copy-mode MouseDragEnd1Pane send-keys -X copy-pipe-and-cancel "clip.exe"
bind-key -T copy-mode-vi MouseDragEnd1Pane send-keys -X copy-pipe-and-cancel "clip.exe"
```

## Claude Hooks: ペイン状態の視覚化

ペイン背景色でClaudeの状態が一目でわかる:

- **紺色** = Claude処理中。放置でいい
- **赤色** = Claude停止。エスカレーションまたはタスク完了。対応が必要

`~/.claude/settings.json` に設定:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "if pgrep -f 'claude' -t $(tmux display-message -t $TMUX_PANE -p '#{pane_tty}' | sed 's|/dev/||') > /dev/null 2>&1; then tmux set-option -t $TMUX_PANE -p window-style 'bg=#1a0000,fg=#aaaaaa' && tmux set-option -t $TMUX_PANE -p window-active-style 'bg=#1a0000,fg=#00ff00'; else tmux set-option -t $TMUX_PANE -pu window-style && tmux set-option -t $TMUX_PANE -pu window-active-style; fi 2>/dev/null || true"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "tmux set-option -t $TMUX_PANE -p window-style 'bg=#000020,fg=#aaaaaa' && tmux set-option -t $TMUX_PANE -p window-active-style 'bg=#000020,fg=#00ff00' 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

### ポイント: 活性/非活性スタイルの両方を設定する

単に `window-style` だけを上書きすると、tmuxのグローバルな活性/非活性の切り替えが効かなくなる。そのため:

- **Stop時**: ペインのTTYでclaudeプロセスが生存しているか `pgrep` で判定
  - 生存 → 赤色に設定（一時停止中 = 対応が必要）
  - 不在 → `-pu` でペインオーバーライド削除（グローバルの活性/非活性スタイルに戻る）
- **UserPromptSubmit時**: 紺色で両方設定

### 見え方（4ペイン並列時）

```
┌──────────────┬──────────────┐
│   ペイン0    │   ペイン1    │
│   紺色       │   赤色       │
│  (処理中)    │ (入力待ち)   │
├──────────────┼──────────────┤
│   ペイン2    │   ペイン3    │
│   赤色       │   紺色       │
│ (入力待ち)   │  (処理中)    │
└──────────────┴──────────────┘
```

- 紺色(`#000020`) = Claude処理中。放置でいい
- 赤色(`#1a0000`) = Claude停止。対応が必要
- 通常色 = Claudeが終了済み（`/exit`等）。グローバルの活性/非活性スタイルに戻る
- 非活性ペインはグレー文字、活性ペインは緑文字で区別できる
- tmux外で実行しても `2>/dev/null || true` でエラーにならない

## 設定の反映

```bash
tmux source-file ~/.tmux.conf
```

Claude Hooksは `settings.json` を保存すれば次回のClaude Code起動から有効。既に起動中のセッションにも即反映される。

## ステータスバー: 3段構成

`~/.tmux.conf` でステータスバーを3段に拡張し、エイリアスのチートシートを常時表示する:

```bash
set -g status 3
set -g status-format[1] '#[align=left,bg=colour236,fg=colour248] cc-n: 新規+自律  cc-r: 再開+自律  cc-c: 継続+自律  |  -m付き(cc-n-m等): 手動確認モード'
set -g status-format[2] '#[align=left,bg=colour237,fg=colour244] 全て claude-chill -a 0 経由  |  cc でヒント表示'
```

- 1段目: セッション名 + 日時（デフォルト）
- 2段目: エイリアス一覧
- 3段目: 補足情報

## Claude Code 起動エイリアス

`~/.bashrc` に定義。全て `claude-chill -a 0`（ちらつき防止+自動スクロールバック無効）経由。

```bash
alias cc='echo "cc-n:   新規+自律
cc-r:   再開+自律
cc-c:   継続+自律
cc-n-m: 新規+手動
cc-r-m: 再開+手動
cc-c-m: 継続+手動"'
alias cc-n='claude-chill -a 0 -- claude --dangerously-skip-permissions'
alias cc-r='claude-chill -a 0 -- claude -r --dangerously-skip-permissions'
alias cc-c='claude-chill -a 0 -- claude -c --dangerously-skip-permissions'
alias cc-n-m='claude-chill -a 0 claude'
alias cc-r-m='claude-chill -a 0 claude -r'
alias cc-c-m='claude-chill -a 0 claude -c'
```

| エイリアス | 内容 |
|---|---|
| `cc` | ヒント表示 |
| `cc-n` | 新規セッション+自律実行 |
| `cc-r` | セッション選んで再開+自律実行 |
| `cc-c` | 直近の会話を継続+自律実行 |
| `cc-n-m` | 新規セッション+手動確認 |
| `cc-r-m` | セッション選んで再開+手動確認 |
| `cc-c-m` | 直近の会話を継続+手動確認 |

### 命名規則

- `cc` = Claude Chill
- `-n` = New / `-r` = Resume / `-c` = Continue
- `-m` = Manual（手動確認モード）
- `-m` なし = 自律実行（`--dangerously-skip-permissions`）

詳細は [flicker-prevention.md](flicker-prevention.md) を参照。
