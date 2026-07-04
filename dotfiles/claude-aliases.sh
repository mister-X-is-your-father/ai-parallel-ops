# Claude Code aliases (tmux alternate-screen off でスクロールバック保持)
# Setup: echo 'source ~/claudeutil/dotfiles/claude-aliases.sh' >> ~/.bashrc

alias cc='echo "cc-n:   新規+自律
cc-r:   再開+自律 (失敗時→新規)
cc-c:   継続+自律 (失敗時→新規)
cc-n-m: 新規+手動
cc-r-m: 再開+手動
cc-c-m: 継続+手動"'

cc-n() {
    claude --dangerously-skip-permissions "$@"
}

# 起動/終了を ~/.cache/cc-launcher.log に記録 (2026-06-12: 「Claudeが一瞬で終了する」事象の追跡用)
# exit code が残るので「本当に claude が即死したのか / そもそも起動していないのか」を後から確定できる。
_cc_log() { echo "$(date '+%F %T') $*" >> "$HOME/.cache/cc-launcher.log"; }

cc-r() {
    _cc_log "cc-r start pane=${TMUX_PANE:-none} cwd=$PWD"
    claude -r --dangerously-skip-permissions "$@"
    local _code=$?
    _cc_log "cc-r end exit=$_code pane=${TMUX_PANE:-none} cwd=$PWD"
    if [ "$_code" -ne 0 ]; then
        echo "No conversation to resume. Starting new session..." >&2
        claude --dangerously-skip-permissions "$@"
        _cc_log "cc-r fallback-new end exit=$? cwd=$PWD"
    fi
}

cc-c() {
    _cc_log "cc-c start pane=${TMUX_PANE:-none} cwd=$PWD"
    claude -c --dangerously-skip-permissions "$@"
    local _code=$?
    _cc_log "cc-c end exit=$_code pane=${TMUX_PANE:-none} cwd=$PWD"
    if [ "$_code" -ne 0 ]; then
        echo "No conversation to continue. Starting new session..." >&2
        claude --dangerously-skip-permissions "$@"
        _cc_log "cc-c fallback-new end exit=$? cwd=$PWD"
    fi
}

alias cc-n-m='claude'
alias cc-r-m='claude -r'
alias cc-c-m='claude -c'
