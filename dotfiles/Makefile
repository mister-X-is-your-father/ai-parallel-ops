# Home directory Makefile - tmux session manager
# Usage:
#   make claude               # Interactive selection (YAML + directories)
#   make claude <name>        # Direct session by name
#   make general              # Shell session (no Claude)
#   make claude-only          # Claude without repo
#   make new                  # Create new project (or 99 in menu)
#   make ls                   # List all tmux sessions
#   make attach <name>        # Attach to existing session
#   make kill <name>          # Kill a session

CONFIG := ~/sessions.yaml
CLAUDE_CMD := claude-chill -a 0 claude -c --dangerously-skip-permissions
MAKEFLAGS += --no-print-directory
HASH := \#

.PHONY: claude general claude-only new ls kill attach _split_menu _new_session_menu _multi_session _menu _create_repo _launch

# Main session launcher
claude:
	@name="$(filter-out claude,$(MAKECMDGOALS))"; \
	if [ -n "$$name" ]; then \
		$(MAKE) _launch NAME=$$name; \
	else \
		$(MAKE) _split_menu; \
	fi

# Quick shortcuts
general:
	@$(MAKE) _launch NAME=general

claude-only:
	@$(MAKE) _launch NAME=claude-only

# Create new project
new:
	@$(MAKE) _create_repo

# List sessions
ls:
	@echo "=== Active tmux sessions ==="; \
	tmux list-sessions 2>/dev/null || echo "(none)"; \
	echo ""; \
	echo "=== Configured in YAML ==="; \
	yq '.sessions[].name' $(CONFIG) 2>/dev/null | tr -d '"' || echo "(none)"; \
	echo ""; \
	echo "=== Project directories ==="; \
	excludes=$$(yq '.exclude[]' $(CONFIG) 2>/dev/null | tr -d '"'); \
	ls -d ~/*/ 2>/dev/null | xargs -n1 basename | grep -vxF "$$excludes"

# Kill a session
kill:
	@name="$(filter-out kill,$(MAKECMDGOALS))"; \
	if [ -n "$$name" ]; then \
		tmux kill-session -t $$name 2>/dev/null && echo "Killed: $$name" || echo "Session not found: $$name"; \
	else \
		echo "Usage: make kill <session-name>"; \
	fi

# Attach to existing session
attach:
	@name="$(filter-out attach,$(MAKECMDGOALS))"; \
	if [ -n "$$name" ]; then \
		tmux attach-session -t $$name 2>/dev/null || echo "Session not found: $$name"; \
	else \
		echo "Usage: make attach <session-name>"; \
	fi

# Internal: Split selection menu
_split_menu:
	@i=1; \
	existing=$$(tmux list-sessions -F '$(HASH)S' 2>/dev/null); \
	if [ -n "$$existing" ]; then \
		echo "  [Existing Sessions]"; \
		for s in $$existing; do \
			wins=$$(tmux list-windows -t "$$s" -F '$(HASH){window_index}:$(HASH){window_name}$(HASH){window_flags}' 2>/dev/null | tr '\n' ' '); \
			echo "    $$i) [$$s] $$wins"; \
			i=$$((i+1)); \
		done; \
		echo ""; \
	fi; \
	existing_count=$$((i-1)); \
	echo "  [New Session]"; \
	yaml_sessions=$$(yq '.sessions[].name' $(CONFIG) 2>/dev/null | tr -d '"'); \
	for s in $$yaml_sessions; do \
		cmd=$$(yq ".sessions[] | select(.name == \"$$s\") | .command" $(CONFIG) | tr -d '"'); \
		if [ "$$cmd" = "" ] || [ "$$cmd" = "null" ]; then \
			echo "    $$i) $$s (shell)"; \
		else \
			echo "    $$i) $$s"; \
		fi; \
		i=$$((i+1)); \
	done; \
	yaml_count=$$((i-1-existing_count)); \
	echo ""; \
	echo "  [Project Directories]"; \
	excludes=$$(yq '.exclude[]' $(CONFIG) 2>/dev/null | tr -d '"'); \
	dirs=$$(ls -d ~/*/ 2>/dev/null | xargs -n1 basename | grep -vxF "$$excludes"); \
	for d in $$dirs; do \
		echo "    $$i) $$d"; \
		i=$$((i+1)); \
	done; \
	echo ""; \
	echo "   99) [NEW] Create new project"; \
	if [ -n "$$existing" ]; then \
		echo "    s) Browse sessions (choose-tree)"; \
	fi; \
	echo ""; \
	read -p "Enter number: " choice; \
	if [ -z "$$choice" ]; then exit 0; fi; \
	if [ "$$choice" = "99" ]; then \
		$(MAKE) _create_repo; \
	elif [ "$$choice" = "s" ] || [ "$$choice" = "S" ]; then \
		if [ -n "$$TMUX" ]; then \
			tmux choose-tree -s; \
		else \
			tmux attach-session; \
		fi; \
	elif [ $$choice -le $$existing_count ] 2>/dev/null; then \
		sel=$$(echo "$$existing" | sed -n "$${choice}p"); \
		if [ -n "$$sel" ]; then \
			tmux attach-session -t "$$sel"; \
		else \
			echo "Invalid selection"; \
		fi; \
	elif [ $$choice -le $$((existing_count + yaml_count)) ] 2>/dev/null; then \
		adj=$$((choice - existing_count)); \
		sel=$$(echo "$$yaml_sessions" | sed -n "$${adj}p"); \
		$(MAKE) _launch NAME=$$sel; \
	else \
		adj=$$((choice - existing_count - yaml_count)); \
		sel=$$(echo "$$dirs" | sed -n "$${adj}p"); \
		if [ -n "$$sel" ]; then \
			$(MAKE) _new_session_menu SESSION_NAME=$$sel; \
		else \
			echo "Invalid selection"; \
		fi; \
	fi

# Internal: New session split menu
_new_session_menu:
	@echo "Select split count:"; \
	echo ""; \
	echo "  1) No split (single pane)"; \
	echo "  2.1) 2-split (left | right)"; \
	echo "  2.2) 2-split (top / bottom)"; \
	echo "  3) 3-split (left | right-top / right-bottom)"; \
	echo "  4) 4-split (2x2 grid)"; \
	echo ""; \
	read -p "Enter number [1/2.1/2.2/3/4]: " split_num; \
	if [ -z "$$split_num" ]; then split_num=1; fi; \
	sname="$(SESSION_NAME)"; \
	case $$split_num in \
		1) if [ -n "$$sname" ]; then $(MAKE) _launch NAME=$$sname; else $(MAKE) _menu; fi ;; \
		2.1) $(MAKE) _multi_session SPLIT=2h ;; \
		2.2) $(MAKE) _multi_session SPLIT=2v ;; \
		3) $(MAKE) _multi_session SPLIT=3 ;; \
		4) $(MAKE) _multi_session SPLIT=4 ;; \
		*) echo "Invalid selection"; exit 1 ;; \
	esac

# Internal: Multi-session with splits
_multi_session:
	@split=$(SPLIT); \
	split_count=$$(echo $$split | tr -d 'hv'); \
	echo ""; \
	echo "=== Select directory for each pane ==="; \
	echo ""; \
	echo "  [YAML Configured]"; \
	yaml_sessions=$$(yq '.sessions[].name' $(CONFIG) 2>/dev/null | tr -d '"'); \
	i=1; for s in $$yaml_sessions; do \
		cmd=$$(yq ".sessions[] | select(.name == \"$$s\") | .command" $(CONFIG) | tr -d '"'); \
		if [ "$$cmd" = "" ] || [ "$$cmd" = "null" ]; then \
			echo "    $$i) $$s (shell)"; \
		else \
			echo "    $$i) $$s"; \
		fi; \
		i=$$((i+1)); \
	done; \
	yaml_count=$$((i-1)); \
	echo ""; \
	echo "  [Project Directories]"; \
	excludes=$$(yq '.exclude[]' $(CONFIG) 2>/dev/null | tr -d '"'); \
	dirs=$$(ls -d ~/*/ 2>/dev/null | xargs -n1 basename | grep -vxF "$$excludes"); \
	for d in $$dirs; do \
		echo "    $$i) $$d"; \
		i=$$((i+1)); \
	done; \
	echo ""; \
	echo "  [Options]"; \
	echo "    <num>i  Ignore directory (add to exclude)"; \
	echo "    e       Edit exclude list"; \
	echo ""; \
	all_items="$$yaml_sessions"$$'\n'"$$dirs"; \
	selections=""; \
	pane=1; \
	while [ $$pane -le $$split_count ]; do \
		case $$split in \
			2h) case $$pane in 1) pos="left";; 2) pos="right";; esac ;; \
			2v) case $$pane in 1) pos="top";; 2) pos="bottom";; esac ;; \
			3) case $$pane in 1) pos="left";; 2) pos="right-top";; 3) pos="right-bottom";; esac ;; \
			4) case $$pane in 1) pos="top-left";; 2) pos="top-right";; 3) pos="bottom-left";; 4) pos="bottom-right";; esac ;; \
		esac; \
		read -p "Pane $$pane ($$pos): " num; \
		if [ -z "$$num" ]; then exit 0; fi; \
		if [ "$$num" = "e" ] || [ "$$num" = "E" ]; then \
			$${EDITOR:-vim} $(CONFIG); \
			continue; \
		elif echo "$$num" | grep -qE '^[0-9]+i$$'; then \
			idx=$$(echo "$$num" | tr -d 'i'); \
			if [ $$idx -le $$yaml_count ]; then \
				echo "Cannot ignore YAML configured sessions"; \
			else \
				adj=$$((idx - yaml_count)); \
				sel=$$(echo "$$dirs" | sed -n "$${adj}p"); \
				if [ -n "$$sel" ]; then \
					yq -i '.exclude += ["'"$$sel"'"]' $(CONFIG); \
					echo "Added '$$sel' to exclude list"; \
					excludes=$$(yq '.exclude[]' $(CONFIG) 2>/dev/null | tr -d '"'); \
					dirs=$$(ls -d ~/*/ 2>/dev/null | xargs -n1 basename | grep -vxF "$$excludes"); \
				else \
					echo "Invalid selection"; \
				fi; \
			fi; \
			continue; \
		fi; \
		if [ $$num -le $$yaml_count ] 2>/dev/null; then \
			sel=$$(echo "$$yaml_sessions" | sed -n "$${num}p"); \
		else \
			adj=$$((num - yaml_count)); \
			sel=$$(echo "$$dirs" | sed -n "$${adj}p"); \
		fi; \
		if [ -z "$$sel" ]; then echo "Invalid selection"; continue; fi; \
		selections="$$selections $$sel"; \
		pane=$$((pane+1)); \
	done; \
	session_name="multi-$$$$"; \
	echo ""; \
	echo "Creating session: $$session_name"; \
	first=1; pane_idx=0; \
	for sel in $$selections; do \
		yaml_entry=$$(yq ".sessions[] | select(.name == \"$$sel\")" $(CONFIG) 2>/dev/null); \
		if [ -n "$$yaml_entry" ]; then \
			dir=$$(echo "$$yaml_entry" | yq '.dir' | tr -d '"'); \
			cmd=$$(echo "$$yaml_entry" | yq '.command' | tr -d '"'); \
			[ "$$dir" = "~" ] && dir=$$HOME; \
			[ "$$dir" = "null" ] && dir=$$HOME; \
			dir=$$(echo "$$dir" | sed "s|^~/|$$HOME/|"); \
			[ "$$cmd" = "null" ] && cmd=""; \
		else \
			dir=$$HOME/$$sel; \
			cmd="$(CLAUDE_CMD)"; \
		fi; \
		if [ $$first -eq 1 ]; then \
			tmux new-session -d -s $$session_name -c "$$dir"; \
			if [ -n "$$cmd" ]; then tmux send-keys -t $$session_name "$$cmd" Enter; fi; \
			first=0; \
		else \
			case $$split in \
				2h) tmux split-window -t $$session_name -h -c "$$dir" ;; \
				2v) tmux split-window -t $$session_name -v -c "$$dir" ;; \
				3) if [ $$pane_idx -eq 1 ]; then \
					tmux split-window -t $$session_name -h -c "$$dir"; \
				   else \
					tmux split-window -t $$session_name:0.1 -v -c "$$dir"; \
				   fi ;; \
				4) case $$pane_idx in \
					1) tmux split-window -t $$session_name -h -c "$$dir" ;; \
					2) tmux split-window -t $$session_name:0.0 -v -c "$$dir" ;; \
					3) tmux select-pane -t $$session_name:0.0; \
					   tmux select-pane -R; \
					   tmux split-window -v -c "$$dir" ;; \
				   esac ;; \
			esac; \
			if [ -n "$$cmd" ]; then tmux send-keys -t $$session_name "$$cmd" Enter; fi; \
		fi; \
		pane_idx=$$((pane_idx+1)); \
	done; \
	tmux select-pane -t $$session_name:0.0; \
	tmux attach-session -t $$session_name

# Internal: Interactive menu
_menu:
	@echo "Select session:"; \
	echo ""; \
	echo "  [YAML Configured]"; \
	yaml_sessions=$$(yq '.sessions[].name' $(CONFIG) 2>/dev/null | tr -d '"'); \
	i=1; for s in $$yaml_sessions; do \
		cmd=$$(yq ".sessions[] | select(.name == \"$$s\") | .command" $(CONFIG) | tr -d '"'); \
		if [ "$$cmd" = "" ] || [ "$$cmd" = "null" ]; then \
			echo "    $$i) $$s (shell)"; \
		else \
			echo "    $$i) $$s"; \
		fi; \
		i=$$((i+1)); \
	done; \
	yaml_count=$$((i-1)); \
	echo ""; \
	echo "  [Project Directories]"; \
	excludes=$$(yq '.exclude[]' $(CONFIG) 2>/dev/null | tr -d '"'); \
	dirs=$$(ls -d ~/*/ 2>/dev/null | xargs -n1 basename | grep -vxF "$$excludes"); \
	for d in $$dirs; do \
		echo "    $$i) $$d"; \
		i=$$((i+1)); \
	done; \
	echo ""; \
	echo "   99) [NEW] Create new project"; \
	echo ""; \
	echo "  [Options]"; \
	echo "    <num>i  Ignore directory (add to exclude)"; \
	echo "    e       Edit exclude list"; \
	echo ""; \
	read -p "Enter number: " num; \
	if [ -z "$$num" ]; then exit 0; fi; \
	if [ "$$num" = "99" ]; then \
		$(MAKE) _create_repo; \
	elif [ "$$num" = "e" ] || [ "$$num" = "E" ]; then \
		$${EDITOR:-vim} $(CONFIG); \
	elif echo "$$num" | grep -qE '^[0-9]+i$$'; then \
		idx=$$(echo "$$num" | tr -d 'i'); \
		if [ $$idx -le $$yaml_count ]; then \
			echo "Cannot ignore YAML configured sessions"; \
		else \
			adj=$$((idx - yaml_count)); \
			sel=$$(echo "$$dirs" | sed -n "$${adj}p"); \
			if [ -n "$$sel" ]; then \
				yq -i '.exclude += ["'"$$sel"'"]' $(CONFIG); \
				echo "Added '$$sel' to exclude list"; \
			else \
				echo "Invalid selection"; \
			fi; \
		fi; \
	elif [ $$num -le $$yaml_count ] 2>/dev/null; then \
		sel=$$(echo "$$yaml_sessions" | sed -n "$${num}p"); \
		$(MAKE) _launch NAME=$$sel; \
	else \
		adj=$$((num - yaml_count)); \
		sel=$$(echo "$$dirs" | sed -n "$${adj}p"); \
		if [ -n "$$sel" ]; then \
			$(MAKE) _launch NAME=$$sel; \
		else \
			echo "Invalid selection"; \
		fi; \
	fi

# Internal: Create new project directory
_create_repo:
	@echo ""; \
	read -p "Enter project name: " repo_name; \
	if [ -z "$$repo_name" ]; then \
		echo "Cancelled."; \
		exit 0; \
	fi; \
	if [ -d "$$HOME/$$repo_name" ]; then \
		echo "Directory ~/$$repo_name already exists."; \
	else \
		mkdir -p "$$HOME/$$repo_name"; \
		(cd "$$HOME/$$repo_name" && git init); \
		echo "Created: ~/$$repo_name"; \
	fi; \
	echo ""; \
	$(MAKE) _launch NAME=$$repo_name

# Internal: Launch or attach to session
_launch:
	@name="$(NAME)"; \
	yaml_entry=$$(yq ".sessions[] | select(.name == \"$$name\")" $(CONFIG) 2>/dev/null); \
	if [ -n "$$yaml_entry" ]; then \
		dir=$$(echo "$$yaml_entry" | yq '.dir' | tr -d '"'); \
		cmd=$$(echo "$$yaml_entry" | yq '.command' | tr -d '"'); \
		[ "$$dir" = "~" ] && dir=$$HOME; \
		[ "$$dir" = "null" ] && dir=$$HOME; \
		dir=$$(echo "$$dir" | sed "s|^~/|$$HOME/|"); \
		[ "$$cmd" = "null" ] && cmd=""; \
	else \
		dir=$$HOME/$$name; \
		cmd="$(CLAUDE_CMD)"; \
		if [ ! -d "$$dir" ]; then \
			echo "Error: Directory $$dir does not exist"; \
			exit 1; \
		fi; \
	fi; \
	if tmux has-session -t $$name 2>/dev/null; then \
		echo "Attaching to existing session: $$name"; \
		if [ -n "$$cmd" ]; then \
			if ! tmux list-panes -t $$name -F '$(HASH){pane_current_command}' | grep -q claude; then \
				tmux send-keys -t $$name "cd $$dir && $$cmd" Enter; \
			fi; \
		fi; \
	else \
		echo "Creating new session: $$name"; \
		tmux new-session -d -s $$name -c "$$dir"; \
		if [ -n "$$cmd" ]; then \
			tmux send-keys -t $$name "$$cmd" Enter; \
		fi; \
	fi; \
	tmux attach-session -t $$name

# Catch-all for session names passed as targets
%:
	@:
