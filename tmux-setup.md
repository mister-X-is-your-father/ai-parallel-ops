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
            "command": "tmux set-option -t $TMUX_PANE -p window-style 'bg=#1a0000,fg=#aaaaaa' && tmux set-option -t $TMUX_PANE -p window-active-style 'bg=#1a0000,fg=#00ff00' 2>/dev/null || true"
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
            "command": "tmux set-option -t $TMUX_PANE -pu window-style && tmux set-option -t $TMUX_PANE -pu window-active-style 2>/dev/null || true"
          }
        ]
      }
    ]
  }
}
```

### ポイント: 活性/非活性スタイルの両方を設定する

単に `window-style` だけを上書きすると、tmuxのグローバルな活性/非活性の切り替えが効かなくなる。そのため:

- **Stop時**: `window-style`（非活性用: 赤+グレー文字）と `window-active-style`（活性用: 赤+緑文字）の両方をペイン単位で設定
- **UserPromptSubmit時**: `-pu` でペイン単位のオーバーライドを削除し、グローバル設定に戻す

これにより、Claudeが停止したペインは赤背景になりつつ、別ペインを選択すると非活性色（赤+グレー文字）、そのペインを選択すると活性色（赤+緑文字）と正しく切り替わる。

### 見え方（4ペイン並列時）

```
┌──────────────┬──────────────┐
│   ペイン0    │   ペイン1    │
│   通常色     │ 赤+グレー文字│
│  (実行中)    │ (入力待ち)   │
│  [活性]      │  [非活性]    │
├──────────────┼──────────────┤
│   ペイン2    │   ペイン3    │
│ 赤+グレー文字│   通常色     │
│ (入力待ち)   │  (実行中)    │
│  [非活性]    │  [非活性]    │
└──────────────┴──────────────┘
→ ペイン1に切り替えると: 赤+緑文字（活性）に変わる
```

- 赤背景 = Claudeが停止。エスカレーションまたはタスク完了。対応が必要
- 通常色 = Claude稼働中。放置でいい
- 非活性ペインはグレー文字、活性ペインは緑文字で区別できる
- tmux外で実行しても `2>/dev/null || true` でエラーにならない

## 設定の反映

```bash
tmux source-file ~/.tmux.conf
```

Claude Hooksは `settings.json` を保存すれば次回のClaude Code起動から有効。既に起動中のセッションにも即反映される。

## 2段目ステータスバー: チートシート

ステータスバーを2段にし、下段にtmuxキーバインドのチートシートを常時表示する。`~/.tmux.conf` の以下の行で設定:

```bash
set -g status 2
set -g status-format[1] '#[align=left,bg=colour236,fg=colour248] | split-h  - split-v  d detach  z zoom  x kill  [ copy  q quit-copy  arrows move  C-b+arrows resize  :setw sync on/off'
```

- `set -g status 2` でステータスバーを2行に拡張
- `status-format[1]` が2段目（0始まり）の内容。表示するキーバインドは自由に変更可能
- 全て `C-b`（prefix）の後に押すキー

## Claude Code 起動コマンド

### 通常起動

```bash
claude
```

### claude-chill経由（フリッカー防止プロキシ）

```bash
# 通常
claude-chill claude

# auto-lookback無効（15秒ごとの履歴表示を止める）
claude-chill -a 0 claude
```

詳細は [flicker-prevention.md](flicker-prevention.md) を参照。

### よく使うオプション

```bash
# セッション再開（前回の続き）
claude --resume

# プロンプトを直接渡して実行
claude -p "やりたいこと"

# 自律モード（確認なしで実行。信頼できるタスク向け）
claude --dangerously-skip-permissions
```
