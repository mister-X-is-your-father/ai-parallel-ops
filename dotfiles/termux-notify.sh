#!/bin/bash
INPUT=$(cat)

# --- 設定読み込み ---
CONF="${HOME}/.claude/hooks/termux-notify.conf"
CWD_STYLE=basename
# 通知タイトルに出す名前: session=tmuxセッション名(F2で自由変更可)優先 / dir=ディレクトリ名 / both=両方
NAME_STYLE=session
SHOW_MESSAGE=true
NOTIFY_SOUND=true
NOTIFY_PRIORITY=high
REMOTE_HOST=neo@leo
REMOTE_PORT=5963
TUNNEL_PORT=28022
[ -f "$CONF" ] && source "$CONF"

# --- JSON パース ---
json_get() {
  echo "$INPUT" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('$1',''))" 2>/dev/null
}

HOOK_EVENT=$(json_get hook_event_name)
NOTIF_TYPE=$(json_get notification_type)
MSG_RAW=$(json_get message)
CWD=$(json_get cwd)

# --- ディレクトリ名（常に取得） ---
if [ -n "$CWD" ]; then
  if [ "$CWD_STYLE" = "fullpath" ]; then
    DIR_LABEL="$CWD"
  else
    DIR_LABEL=$(basename "$CWD")
  fi
fi

# --- tmux セッション名（F2 等で自由に変更できる名前。フックは pane 内で走るので取得可） ---
SESSION_NAME=""
if [ -n "${TMUX_PANE:-}" ]; then
  SESSION_NAME=$(tmux display-message -p -t "$TMUX_PANE" '#{session_name}' 2>/dev/null)
fi

# --- 表示する名前ラベルを NAME_STYLE で決定（session 優先、無ければ dir にフォールバック） ---
case "$NAME_STYLE" in
  dir)  NAME_LABEL="$DIR_LABEL" ;;
  both)
    if [ -n "$SESSION_NAME" ] && [ "$SESSION_NAME" != "$DIR_LABEL" ]; then
      NAME_LABEL="${SESSION_NAME} · ${DIR_LABEL}"
    else
      NAME_LABEL="${SESSION_NAME:-$DIR_LABEL}"
    fi ;;
  *)    NAME_LABEL="${SESSION_NAME:-$DIR_LABEL}" ;;   # session(既定)
esac

# --- 通知内容の組み立て ---
# permission_prompt: 確認待ち中に繰り返し発火するため --id + --alert-once で初回のみ音を鳴らす
# それ以外: 毎回独立した通知（--id なし）
NOTIF_OPT=""
case "$NOTIF_TYPE" in
  permission_prompt)
    ICON="🔐"
    LABEL="確認待ち"
    MSG="${MSG_RAW:-パーミッション確認}"
    NOTIF_OPT="--id 'claude-perm' --alert-once"
    ;;
  idle_prompt)
    ICON="✅"
    LABEL="完了"
    MSG="${MSG_RAW:-入力待ちです}"
    ;;
  *)
    case "$HOOK_EVENT" in
      Stop)
        ICON="⏹"
        LABEL="処理完了"
        MSG="${MSG_RAW:-停止しました}"
        ;;
      *)
        ICON="💬"
        LABEL="通知"
        MSG="${MSG_RAW:-通知}"
        ;;
    esac
    ;;
esac

# --- タイトル（セッション名/ディレクトリ名を含める） ---
if [ -n "$NAME_LABEL" ]; then
  TITLE="${ICON} ${NAME_LABEL} - ${LABEL}"
else
  TITLE="${ICON} ${LABEL}"
fi

# --- メッセージ表示の制御 ---
[ "$SHOW_MESSAGE" != "true" ] && MSG=""

# --- 文字数制限 ---
TITLE=$(echo "$TITLE" | head -c 100)
MSG=$(echo "$MSG" | head -c 200)

# --- 通知コマンド組み立て ---
TITLE_ESC=${TITLE//\'/\'\\\'\'}
MSG_ESC=${MSG//\'/\'\\\'\'}
NOTIF_CMD="termux-notification ${NOTIF_OPT} --title '${TITLE_ESC}'"
[ -n "$MSG_ESC" ] && NOTIF_CMD="$NOTIF_CMD --content '${MSG_ESC}'"
[ "$NOTIFY_SOUND" = "true" ] && NOTIF_CMD="$NOTIF_CMD --sound"
NOTIF_CMD="$NOTIF_CMD --priority ${NOTIFY_PRIORITY}"
NOTIF_CMD="$NOTIF_CMD --action 'am start -n com.termux/.app.TermuxActivity'"

# --- 実行 ---
if command -v termux-notification >/dev/null 2>&1; then
  setsid bash -c "$NOTIF_CMD" >/dev/null 2>&1 &
else
  ssh -p "$REMOTE_PORT" -o ConnectTimeout=3 -o StrictHostKeyChecking=no "$REMOTE_HOST" \
    "ssh -p $TUNNEL_PORT -o ConnectTimeout=3 localhost \"$NOTIF_CMD\"" >/dev/null 2>&1 &
fi
