# Claude Code aliases (claude-chill -a 0 = ちらつき防止+自動スクロールバック無効)
# Setup: echo 'source ~/ai-parallel-ops/dotfiles/claude-aliases.sh' >> ~/.bashrc

# Helper: send Escape after claude starts (brings up input field)
_cc_auto_esc() {
    (sleep 2 && tmux send-keys Escape) &
    "$@"
}

alias cc='echo "cc-n:   新規+自律
cc-r:   再開+自律 (失敗時→新規)
cc-c:   継続+自律 (失敗時→新規)
cc-n-m: 新規+手動
cc-r-m: 再開+手動
cc-c-m: 継続+手動"'
cc-n() {
    _cc_auto_esc claude-chill -a 0 -- claude --dangerously-skip-permissions "$@"
}
cc-r() {
    claude-chill -a 0 -- claude -r --dangerously-skip-permissions "$@"
    if [ $? -ne 0 ]; then
        echo "No conversation to resume. Starting new session..." >&2
        _cc_auto_esc claude-chill -a 0 -- claude --dangerously-skip-permissions "$@"
    fi
}
cc-c() {
    claude-chill -a 0 -- claude -c --dangerously-skip-permissions "$@"
    if [ $? -ne 0 ]; then
        echo "No conversation to continue. Starting new session..." >&2
        _cc_auto_esc claude-chill -a 0 -- claude --dangerously-skip-permissions "$@"
    fi
}
alias cc-n-m='claude-chill -a 0 claude'
alias cc-r-m='claude-chill -a 0 claude -r'
alias cc-c-m='claude-chill -a 0 claude -c'
