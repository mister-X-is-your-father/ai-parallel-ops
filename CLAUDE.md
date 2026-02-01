# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **methodology and configuration repository** for parallel AI agent supervision — not a runnable application. It contains documentation on orchestrating 3-7 concurrent AI agents (Claude Code, Gemini, etc.) using principles from aerospace (ATC scanning), military (Mission Command), and manufacturing (Theory of Constraints, Lean/Kanban).

There are no build, test, or lint commands. The repository consists of:
- Documentation (README.md, tmux-setup.md, flicker-prevention.md)
- Deployable dotfiles (tmux config, bashrc aliases, Claude Code hooks)
- Task Master integration config (.taskmaster/)

## Setup

Symlink configuration files and source aliases:
```bash
ln -sf ~/ai-parallel-ops/dotfiles/Makefile ~/Makefile
ln -sf ~/ai-parallel-ops/dotfiles/sessions.yaml ~/sessions.yaml
ln -sf ~/ai-parallel-ops/dotfiles/claude-settings.json ~/.claude/settings.json

# Add to ~/.bashrc (claude-chill aliases: cc-n, cc-r, cc-c, cc-n-m, cc-r-m, cc-c-m)
echo 'source ~/ai-parallel-ops/dotfiles/claude-aliases.sh' >> ~/.bashrc
```

## Architecture

**8-Stage Workflow:**
- **Stages 0-4 (Planning):** Goal → Success Criteria → Common Rules → Task Breakdown → Dependency Graph
- **Stages 5-8 (Execution):** Parallel Task Injection → Supervision Scanning (15-min heartbeat) → Exception Response (P1-P4 triage) → Review & Sign-Off

**Key dotfiles:**
- `dotfiles/Makefile` — tmuxセッション管理。`make claude` で対話メニュー、`make claude <name>` で直接起動、マルチペイン分割対応
- `dotfiles/sessions.yaml` — Makefileが参照するセッション定義とexcludeリスト
- `dotfiles/claude-settings.json` — Claude Code hooks that change tmux pane background on Stop (red) and UserPromptSubmit (blue)

**External tools used:** tmux, claude-chill (Rust PTY proxy), Task Master (task queue + dependency resolution via `tasks.json`)
