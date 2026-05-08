# Claude Code aliases (tmux alternate-screen off でスクロールバック保持)
# Setup: echo 'source ~/ai-parallel-ops/dotfiles/claude-aliases.sh' >> ~/.bashrc

alias cc='echo "cc-n:   新規+自律
cc-r:   再開+自律 (失敗時→新規)
cc-c:   継続+自律 (失敗時→新規)
cc-n-m: 新規+手動
cc-r-m: 再開+手動
cc-c-m: 継続+手動"'

cc-n() {
    claude --dangerously-skip-permissions "$@"
}

cc-r() {
    claude -r --dangerously-skip-permissions "$@" || {
        echo "No conversation to resume. Starting new session..." >&2
        claude --dangerously-skip-permissions "$@"
    }
}

cc-c() {
    claude -c --dangerously-skip-permissions "$@" || {
        echo "No conversation to continue. Starting new session..." >&2
        claude --dangerously-skip-permissions "$@"
    }
}

alias cc-n-m='claude'
alias cc-r-m='claude -r'
alias cc-c-m='claude -c'
