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

Claudeが停止（質問・完了）するとペイン背景が赤に変わり、入力を送ると元に戻る。並列運用時にどのペインが対応を待っているか一目でわかる。

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
            "command": "tmux set-option -t $TMUX_PANE -p window-style 'bg=#1a0000' 2>/dev/null || true"
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
            "command": "tmux set-option -t $TMUX_PANE -p window-style 'bg=default' 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

### 見え方（4ペイン並列時）

```
┌──────────────┬──────────────┐
│   ペイン0    │   ペイン1    │
│   通常色     │   赤背景     │
│  (実行中)    │ (入力待ち)   │
├──────────────┼──────────────┤
│   ペイン2    │   ペイン3    │
│   赤背景     │   通常色     │
│ (入力待ち)   │  (実行中)    │
└──────────────┴──────────────┘
```

- 赤 = Claudeが停止。エスカレーションまたはタスク完了。対応が必要
- 通常色 = Claude稼働中。放置でいい
- tmux外で実行しても `2>/dev/null || true` でエラーにならない

## 設定の反映

```bash
tmux source-file ~/.tmux.conf
```

Claude Hooksは `settings.json` を保存すれば次回のClaude Code起動から有効。既に起動中のセッションにも即反映される。

## キーバインド早見表

全て `C-b`（prefix）の後に押す。

| キー | 動作 |
|------|------|
| `\|` | 横分割 |
| `-` | 縦分割 |
| `d` | デタッチ |
| `z` | ペインをズーム（トグル） |
| `x` | ペインを閉じる |
| `[` | コピーモード開始 |
| `q` | コピーモード終了 |
| `矢印` | ペイン移動 |
| `C-b + 矢印` | ペインリサイズ |
| `:setw synchronize-panes on` | 全ペイン同時入力 |
| `:setw synchronize-panes off` | 同時入力解除 |
