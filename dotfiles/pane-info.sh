#!/usr/bin/env bash
# tmux pane-border-format 用: そのペインの「ディレクトリ名 (git ブランチ)」を出す。
# 引数 $1 = #{pane_current_path}。tmux は #() をペインごとに評価するので per-pane で正しく出る。
#   - git 管理下     : "claudeutil (master)"
#   - detached HEAD  : "claudeutil (a1b2c3d)"
#   - git 管理外      : "somedir"
p="${1:-$PWD}"
dir=$(basename "$p")
branch=$(git -C "$p" rev-parse --abbrev-ref HEAD 2>/dev/null)
if [ "$branch" = "HEAD" ]; then
  branch=$(git -C "$p" rev-parse --short HEAD 2>/dev/null)
fi
if [ -n "$branch" ]; then
  printf '%s (%s)' "$dir" "$branch"
else
  printf '%s' "$dir"
fi
