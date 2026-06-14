#!/usr/bin/env bash
# leo hub — fzf 階層ランチャー。
# ナビ: ↑↓=移動 / →(または Enter)=入る・決定 / ←(または Esc)=戻る。
# 階層: トップ(既存tmuxセッション+カテゴリ) → プロジェクト → 起動モード → tmuxセッション。
# leo 接続時のランディングとして使う想定 (et ... -c "~/bin/hub")。
set -uo pipefail

CONFIG="$HOME/sessions.yaml"
TAB=$'\t'
SELF="$(readlink -f "$0" 2>/dev/null || echo "$0")"  # 自身の絶対パス(fzf bind から再呼出する)

# fzf 実行。候補は stdin("label<TAB>value")。
# 出力: "<key><TAB><value>"  key ∈ {enter,right,left}。Esc は rc!=0。
pick() {  # $1=prompt, $2(opt)=preview cmd, $3(opt)=rename(1で F2 名前変更を有効化)
  local prompt="$1" preview="${2:-}" rename="${3:-}" out key line hdr
  hdr='→/Enter: 入る   ←/Esc: 戻る'
  [ -n "$rename" ] && hdr="$hdr   F2: セッション名を変更"
  local args=(--expect=left,right --height=90% --reverse --border --ansi \
              --prompt="$prompt > " --delimiter="$TAB" --with-nth=1 \
              --header="$hdr")
  # F2: 選択中セッションを rename → 一覧を即リフレッシュ(session行以外は無視)
  [ -n "$rename" ] && args+=(--bind "f2:execute($SELF --rename {2})+reload($SELF --emit-top)")
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
  [ -n "$cmd" ] && tmux send-keys -t "=$name:" "$cmd" Enter
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
  { [ "$cmd" != "null" ] && [ -n "$cmd" ]; } && tmux send-keys -t "=$name:" "$cmd" Enter
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

# トップ画面 preview: 候補の正体(=判断材料)を右ペインに出す。
#   session行 → そのセッションの作業ディレクトリ + 各 pane の path/実行コマンド
#   cat行     → そのカテゴリ直下のプロジェクト一覧
#   special行 → sessions.yaml の該当エントリ
do_preview_top() {  # $1 = value(session:NAME | cat:X | special:Y)
  local val="${1:-}"
  case "$val" in
    session:*)
      local s="${val#session:}" dir
      dir=$(tmux list-panes -t "=$s" -F '#{pane_current_path}' 2>/dev/null | head -1)
      printf '⧉ tmux session: %s\n' "$s"
      printf '📁 %s\n\n' "${dir:-?}"
      echo "── windows / panes ──"
      tmux list-panes -s -t "=$s" \
        -F '  #{window_index}.#{pane_index}  #{pane_current_command}  ←  #{pane_current_path}' 2>/dev/null
      printf '\n↳ F2 でこのセッションを改名\n'
      ;;
    cat:*)
      local c base; c="${val#cat:}"; base="$HOME/$c"; [ "$c" = "~" ] && base="$HOME"
      printf '▸ %s\n\n' "$base"
      ls -1 "$base" 2>/dev/null | head -40
      ;;
    special:*)
      local n="${val#special:}"
      printf '✶ sessions.yaml: %s\n\n' "$n"
      command -v yq >/dev/null 2>&1 && yq ".sessions[] | select(.name==\"$n\")" "$CONFIG" 2>/dev/null
      ;;
  esac
}

# F2 から呼ばれる: 選択中のセッションを rename(session行以外は何もしない)
do_rename() {  # $1 = value(session:NAME ...)
  local val="${1:-}" old first rest new
  case "$val" in session:*) old="${val#session:}" ;; *) exit 0 ;; esac
  # F2 キーシーケンスの残留バイト(\177=DEL や \033[.. の断片)が tty バッファに
  # 残っていると 1文字目読みがそれを拾う(=名前先頭に紛れ込む)。先に排出する。
  while IFS= read -rsn1 -t 0.05 _ < /dev/tty; do :; done
  printf '\n  セッション名変更  "%s" → (Esc/空Enter で中止): ' "$old" > /dev/tty
  # 1文字目を生取りして Esc(0x1b)/空Enter を中止として捕捉(残骸排出後なので確実)
  IFS= read -rsn1 first < /dev/tty || { printf '中止\n' > /dev/tty; exit 0; }
  if [ "$first" = $'\033' ] || [ -z "$first" ]; then
    printf '中止\n' > /dev/tty; exit 0
  fi
  printf '%s' "$first" > /dev/tty            # 1文字目をエコーして残りを通常入力
  IFS= read -r rest < /dev/tty || { printf '\n中止\n' > /dev/tty; exit 0; }
  new="${first}${rest}"
  new=$(printf '%s' "$new" | tr -d '\000-\037\177')  # 念のため制御文字(DEL含む)を除去
  new="${new// /-}"                                   # tmux セッション名に空白は不向き → ハイフン化
  [ -z "$new" ] && { printf '中止\n' > /dev/tty; exit 0; }
  if tmux rename-session -t "=$old" "$new" 2>/dev/tty; then
    printf '  ✓ %s → %s\n' "$old" "$new" > /dev/tty
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
        res=$(cand_top | pick "leo hub" "$SELF --preview-top {2}" 1) || exit 0   # Esc=終了 / F2=rename
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
# fzf の bind / preview から再呼出されるサブコマンド(対話メイン前に捌く)
case "${1:-}" in
  --emit-top)    cand_top; exit 0 ;;
  --preview-top) do_preview_top "${2:-}"; exit 0 ;;
  --rename)      do_rename "${2:-}"; exit 0 ;;
esac

main "$@"
