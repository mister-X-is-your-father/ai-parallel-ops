#!/bin/bash
input=$(cat)

read -r ctx h5 d7 last_input <<<"$(STATUSLINE_INPUT="$input" python3 <<'PY'
import json, os, sys
d = json.loads(os.environ.get("STATUSLINE_INPUT", "{}"))
ctx = d.get("context_window", {}).get("used_percentage", 0) or 0
rl  = d.get("rate_limits", {}) or {}
h5  = (rl.get("five_hour") or {}).get("used_percentage", -1)
d7  = (rl.get("seven_day") or {}).get("used_percentage", -1)
tp  = d.get("transcript_path", "") or ""
last = ""
if tp:
    try:
        with open(tp) as f:
            for line in f:
                try:
                    j = json.loads(line)
                except Exception:
                    continue
                if j.get("type") == "user":
                    m = j.get("message") or {}
                    c = m.get("content")
                    if isinstance(c, str) and c.strip():
                        last = c
    except FileNotFoundError:
        pass
last = last.replace("\n", " ").replace("\t", " ")
if len(last) > 60:
    last = last[:60] + "..."
print(f"{int(ctx)} {int(h5) if h5 >= 0 else -1} {int(d7) if d7 >= 0 else -1} {last}")
PY
)"

color_for() {
  local v=$1
  if [ "$v" -ge 80 ] 2>/dev/null; then echo '\033[01;31m'
  elif [ "$v" -ge 50 ] 2>/dev/null; then echo '\033[01;33m'
  else echo '\033[01;32m'; fi
}

out=""
out+="$(color_for "$ctx")ctx:${ctx}%\033[00m"
[ "$h5" -ge 0 ] 2>/dev/null && out+=" $(color_for "$h5")5h:${h5}%\033[00m"
[ "$d7" -ge 0 ] 2>/dev/null && out+=" $(color_for "$d7")7d:${d7}%\033[00m"
[ -n "$last_input" ] && out+=" \033[0;37m${last_input}\033[00m"

printf '%b' "$out"
