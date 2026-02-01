# Claude Code aliases (claude-chill -a 0 = ちらつき防止+自動スクロールバック無効)
# Setup: echo 'source ~/ai-parallel-ops/dotfiles/claude-aliases.sh' >> ~/.bashrc
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
