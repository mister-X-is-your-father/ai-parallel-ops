#!/usr/bin/env bash
# sync-tasks.sh
# 複数プロジェクトの .taskmaster/tasks/tasks.json を1つの統合tasks.jsonにマージする。
# Task Studioのタグ機能でプロジェクトを切り替えて表示できる。
#
# Usage:
#   ./scripts/sync-tasks.sh                          # 1回だけ同期
#   ./scripts/sync-tasks.sh --watch                  # 変更を監視して自動同期
#   ./scripts/sync-tasks.sh --add ~/projects/myapp   # プロジェクトを登録
#   ./scripts/sync-tasks.sh --remove myapp           # プロジェクトを削除
#   ./scripts/sync-tasks.sh --list                   # 登録済みプロジェクト一覧
#
# 統合先: ~/ai-parallel-ops/.taskmaster/tasks/tasks.json
# 設定:   ~/ai-parallel-ops/.taskmaster/projects.json

set -euo pipefail

HUB_DIR="$HOME/ai-parallel-ops/.taskmaster"
HUB_TASKS="$HUB_DIR/tasks/tasks.json"
PROJECTS_FILE="$HUB_DIR/projects.json"

mkdir -p "$HUB_DIR/tasks"

# projects.json がなければ作成
if [[ ! -f "$PROJECTS_FILE" ]]; then
  echo '{}' > "$PROJECTS_FILE"
fi

add_project() {
  local dir="$1"
  dir=$(realpath "$dir")
  local tasks_file="$dir/.taskmaster/tasks/tasks.json"

  if [[ ! -f "$tasks_file" ]]; then
    echo "ERROR: $tasks_file not found" >&2
    exit 1
  fi

  local name
  name=$(basename "$dir")

  # jqでprojects.jsonに追加
  local tmp
  tmp=$(mktemp)
  jq --arg name "$name" --arg path "$dir" '.[$name] = $path' "$PROJECTS_FILE" > "$tmp"
  mv "$tmp" "$PROJECTS_FILE"
  echo "Added: $name -> $dir"
}

remove_project() {
  local name="$1"
  local tmp
  tmp=$(mktemp)
  jq --arg name "$name" 'del(.[$name])' "$PROJECTS_FILE" > "$tmp"
  mv "$tmp" "$PROJECTS_FILE"
  echo "Removed: $name"
}

list_projects() {
  echo "Registered projects:"
  jq -r 'to_entries[] | "  \(.key) -> \(.value)"' "$PROJECTS_FILE"
}

do_sync() {
  local result="{}"

  # 各プロジェクトのtasks.jsonを読み込み、タグとしてマージ
  while IFS='=' read -r name dir; do
    local tasks_file="$dir/.taskmaster/tasks/tasks.json"
    if [[ -f "$tasks_file" ]]; then
      # プロジェクトのtasks.jsonからタスク配列を取得
      # 形式が {"default": {"tasks": [...]}} の場合
      local tasks_content
      tasks_content=$(cat "$tasks_file")

      # defaultキーの中身を取り出してプロジェクト名のキーに入れる
      local project_data
      project_data=$(echo "$tasks_content" | jq --arg name "$name" '
        if .default then
          {($name): .default}
        else
          # フラットな {"tasks": [...]} 形式の場合
          {($name): {tasks: .tasks, metadata: (.metadata // {})}}
        end
      ' 2>/dev/null || echo '{}')

      result=$(echo "$result" "$project_data" | jq -s '.[0] * .[1]')
    fi
  done < <(jq -r 'to_entries[] | "\(.key)=\(.value)"' "$PROJECTS_FILE")

  # ai-parallel-ops自身のタスクも含める（hubとして）
  if [[ -f "$HUB_TASKS" ]]; then
    local hub_content
    hub_content=$(cat "$HUB_TASKS")
    # 既に統合済みの場合はそのまま、defaultキーがあればhubとして残す
    local has_default
    has_default=$(echo "$hub_content" | jq 'has("default")' 2>/dev/null || echo "false")
    if [[ "$has_default" == "true" ]]; then
      local hub_data
      hub_data=$(echo "$hub_content" | jq '{hub: .default}')
      result=$(echo "$result" "$hub_data" | jq -s '.[0] * .[1]')
    fi
  fi

  # 書き込み
  echo "$result" | jq '.' > "$HUB_TASKS"
  echo "Synced $(echo "$result" | jq 'keys | length') projects -> $HUB_TASKS"
}

do_watch() {
  echo "Watching for changes... (Ctrl+C to stop)"
  do_sync

  # 全プロジェクトのtasks.jsonを監視
  local watch_files=()
  while IFS='=' read -r name dir; do
    local f="$dir/.taskmaster/tasks/tasks.json"
    [[ -f "$f" ]] && watch_files+=("$f")
  done < <(jq -r 'to_entries[] | "\(.key)=\(.value)"' "$PROJECTS_FILE")

  if [[ ${#watch_files[@]} -eq 0 ]]; then
    echo "No project files to watch."
    exit 0
  fi

  # inotifywaitがなければpollingにフォールバック
  if command -v inotifywait &>/dev/null; then
    while inotifywait -q -e modify "${watch_files[@]}" 2>/dev/null; do
      sleep 0.5
      do_sync
    done
  else
    echo "inotifywait not found, using polling (2s interval)"
    local -A checksums
    for f in "${watch_files[@]}"; do
      checksums["$f"]=$(md5sum "$f" 2>/dev/null | cut -d' ' -f1)
    done
    while true; do
      sleep 2
      local changed=false
      for f in "${watch_files[@]}"; do
        local new_sum
        new_sum=$(md5sum "$f" 2>/dev/null | cut -d' ' -f1)
        if [[ "${checksums[$f]:-}" != "$new_sum" ]]; then
          checksums["$f"]="$new_sum"
          changed=true
        fi
      done
      if [[ "$changed" == "true" ]]; then
        do_sync
      fi
    done
  fi
}

case "${1:-}" in
  --add)
    [[ -z "${2:-}" ]] && echo "Usage: $0 --add <project-dir>" >&2 && exit 1
    add_project "$2"
    do_sync
    ;;
  --remove)
    [[ -z "${2:-}" ]] && echo "Usage: $0 --remove <project-name>" >&2 && exit 1
    remove_project "$2"
    do_sync
    ;;
  --list)
    list_projects
    ;;
  --watch)
    do_watch
    ;;
  *)
    do_sync
    ;;
esac
