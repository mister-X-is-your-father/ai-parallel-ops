#!/usr/bin/env bash
# leo hub — fzf 階層ランチャー。
# ナビ: ↑↓=移動 / →(または Enter)=入る・決定 / ←(または Esc)=戻る。
# 階層: トップ(既存tmuxセッション+カテゴリ) → プロジェクト → 起動モード → tmuxセッション。
# leo 接続時のランディングとして使う想定 (et ... -c "~/bin/hub")。
set -uo pipefail

CONFIG="$HOME/sessions.yaml"
TAB=$'\t'

# fzf 実行。候補は stdin("label<TAB>value")。
# 出力: "<key><TAB><value>"  key ∈ {enter,right,left}。Esc は rc!=0。
pick() {  # $1=prompt, $2(opt)=preview cmd
  local prompt="$1" preview="${2:-}" out key line
  local args=(--expect=left,right --height=90% --reverse --border --ansi \
              --prompt="$prompt > " --delimiter="$TAB" --with-nth=1 \
              --header='→/Enter: 入る   ←/Esc: 戻る')
  [ -n "$preview" ] && args+=(--preview="$preview" --preview-window=right:55%)
  out=$(fzf "${args[@]}") || return 1          # Esc/Ctrl-C
  key=$(sed -n 1p <<<"$out"); [ -z "$key" ] && key=enter
  line=$(sed -n 2p <<<"$out")
  printf '%s%s%s' "$key" "$TAB" "${line##*$TAB}"
}

excludes() { command -v yq >/dev/null 2>&1 && yq '.exclude[]' "$CONFIG" 2>/dev/null | tr -d '"'; }

attach_or_switch() {  # $1=session
  if [ -n "${TMUX:-}" ]; then tmux switch-client -t "=$1"; else tmux attach-session -t "=$1"; fi
}

launch() {  # $1=name $2=dir $3=mode(shell|claude|claude-c)
  local name="$1" dir="$2" mode="$3" cmd="" base n=2
  case "$mode" in
    claude)   cmd="claude" ;;
    claude-c) cmd="claude -c --dangerously-skip-permissions" ;;
  esac
  base="$name"
  while tmux has-session -t "=$name" 2>/dev/null; do name="${base}-${n}"; n=$((n+1)); done
  tmux new-session -d -s "$name" -c "$dir"
  [ -n "$cmd" ] && tmux send-keys -t "=$name" "$cmd" Enter
  attach_or_switch "$name"
}

launch_special() {  # $1=name (sessions.yaml の session)
  local name="$1" dir cmd n=2 base
  dir=$(yq ".sessions[] | select(.name==\"$name\") | .dir" "$CONFIG" 2>/dev/null | tr -d '"')
  cmd=$(yq ".sessions[] | select(.name==\"$name\") | .command" "$CONFIG" 2>/dev/null | tr -d '"')
  { [ "$dir" = "~" ] || [ "$dir" = "null" ] || [ -z "$dir" ]; } && dir="$HOME"
  dir="${dir/#\~/$HOME}"
  base="$name"
  while tmux has-session -t "=$name" 2>/dev/null; do name="${base}-${n}"; n=$((n+1)); done
  tmux new-session -d -s "$name" -c "$dir"
  { [ "$cmd" != "null" ] && [ -n "$cmd" ]; } && tmux send-keys -t "=$name" "$cmd" Enter
  attach_or_switch "$name"
}

# 候補生成 ---------------------------------------------------------------
cand_top() {
  while IFS= read -r s; do [ -n "$s" ] && printf '⧉ attach: %s%ssession:%s\n' "$s" "$TAB" "$s"; done \
    < <(tmux list-sessions -F '#{session_name}' 2>/dev/null)
  for c in apps infra vendor; do [ -d "$HOME/$c" ] && printf '▸ %s/%scat:%s\n' "$c" "$TAB" "$c"; done
  printf '▸ ~ (home)%scat:~\n' "$TAB"
  if command -v yq >/dev/null 2>&1; then
    while IFS= read -r n; do [ -n "$n" ] && printf '✶ %s (yaml)%sspecial:%s\n' "$n" "$TAB" "$n"; done \
      < <(yq '.sessions[].name' "$CONFIG" 2>/dev/null | tr -d '"')
  fi
}

cand_projects() {  # $1=category
  local cat="$1" base="$HOME/$cat" exc; [ "$cat" = "~" ] && base="$HOME"
  exc="$(excludes)"
  for d in "$base"/*/; do
    [ -d "$d" ] || continue
    local b; b="$(basename "$d")"
    [ -n "$exc" ] && grep -qxF "$b" <<<"$exc" && continue
    printf '%s%s%s/%s\n' "$b" "$TAB" "$base" "$b"
  done
}

cand_modes() {
  printf 'shell (素のシェル)%sshell\n' "$TAB"
  printf 'claude%sclaude\n' "$TAB"
  printf 'claude -c --dangerously (続き+権限スキップ)%sclaude-c\n' "$TAB"
}

# 状態マシン: top → project → mode -------------------------------------
main() {
  command -v fzf >/dev/null 2>&1 || { echo "fzf が必要です"; exit 1; }
  local level=top cat="" proj="" res key val prev
  prev='p={2}; echo "📁 {1}"; echo; git -C "$p" status -s 2>/dev/null | head -15; echo "── README ──"; head -8 "$p"/README.md 2>/dev/null'
  while true; do
    case "$level" in
      top)
        res=$(cand_top | pick "leo hub") || exit 0      # Esc=終了
        key="${res%%$TAB*}"; val="${res#*$TAB}"
        [ "$key" = left ] && exit 0                       # 左=これ以上戻れない→終了
        case "$val" in
          session:*) attach_or_switch "${val#session:}"; exit 0 ;;
          special:*) launch_special "${val#special:}"; exit 0 ;;
          cat:*)     cat="${val#cat:}"; level=project ;;
        esac ;;
      project)
        res=$(cand_projects "$cat" | pick "$cat" "$prev") || { level=top; continue; }  # Esc=戻る
        key="${res%%$TAB*}"; val="${res#*$TAB}"
        [ "$key" = left ] && { level=top; continue; }    # 左=戻る
        [ -z "$val" ] && { level=top; continue; }        # 候補なし
        proj="$val"; level=mode ;;
      mode)
        res=$(cand_modes | pick "起動モード") || { level=project; continue; }  # Esc=戻る
        key="${res%%$TAB*}"; val="${res#*$TAB}"
        [ "$key" = left ] && { level=project; continue; }  # 左=戻る
        launch "$(basename "$proj")" "$proj" "$val"; exit 0 ;;
    esac
  done
}
main "$@"
