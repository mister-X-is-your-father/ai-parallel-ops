#!/bin/bash
# Claude Code statusline.
# 出力: [model] ctx:N% [5h:N%] [7d:N%] [wake:Xm] [last:HH:MM] [last user msg]
#
# wake セグメント: ScheduleWakeup tool の最新呼出を transcript .jsonl から
# 抽出して、 timestamp + delaySeconds = wake_at の残り時間を表示する。
# 過去の wake が消化済 (= 残時間 <= 0) なら非表示。
# last セグメント: 最後の assistant 応答の timestamp を HH:MM で表示。
input=$(cat)

IFS='|' read -r model ctx h5 d7 wake_s last_ts last_input <<<"$(STATUSLINE_INPUT="$input" python3 <<'PY'
import json, os, sys, time
from datetime import datetime
d = json.loads(os.environ.get("STATUSLINE_INPUT", "{}"))
ctx = d.get("context_window", {}).get("used_percentage", 0) or 0
rl  = d.get("rate_limits", {}) or {}
h5  = (rl.get("five_hour") or {}).get("used_percentage", -1)
d7  = (rl.get("seven_day") or {}).get("used_percentage", -1)
tp  = d.get("transcript_path", "") or ""

model_obj = d.get("model") or {}
model = model_obj.get("display_name") or model_obj.get("id") or ""

last_user = ""
wake_seconds_remaining = None
last_assistant_ts = None

def parse_ts(s):
    try:
        return datetime.strptime(s.replace("Z", "+00:00"),
                                 "%Y-%m-%dT%H:%M:%S.%f%z").timestamp()
    except Exception:
        return None

if tp:
    try:
        last_wakeup_ts = None
        last_wakeup_delay = None
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
                        last_user = c
                if j.get("type") == "assistant":
                    ts = parse_ts(j.get("timestamp", ""))
                    if ts is not None:
                        last_assistant_ts = ts
                    m = j.get("message") or {}
                    for block in (m.get("content") or []):
                        if not isinstance(block, dict): continue
                        if block.get("type") != "tool_use": continue
                        if block.get("name") != "ScheduleWakeup": continue
                        inp = block.get("input") or {}
                        delay = inp.get("delaySeconds")
                        if isinstance(delay, (int, float)) and ts is not None:
                            last_wakeup_ts = ts
                            last_wakeup_delay = int(delay)
        if last_wakeup_ts is not None and last_wakeup_delay is not None:
            wake_at = last_wakeup_ts + last_wakeup_delay
            remaining = wake_at - time.time()
            if remaining > 0:
                wake_seconds_remaining = int(remaining)
    except FileNotFoundError:
        pass

last_user = last_user.replace("\n", " ").replace("\t", " ").replace("|", " ")
if len(last_user) > 50:
    last_user = last_user[:50] + "..."

wake_str = "-" if wake_seconds_remaining is None else str(wake_seconds_remaining)
last_str = "-" if last_assistant_ts is None \
    else datetime.fromtimestamp(last_assistant_ts).strftime("%m-%d %H:%M")

print(f"{model}|{int(ctx)}|{int(h5) if h5 >= 0 else -1}|{int(d7) if d7 >= 0 else -1}|{wake_str}|{last_str}|{last_user}")
PY
)"

color_for() {
  local v=$1
  if [ "$v" -ge 80 ] 2>/dev/null; then echo '\033[01;31m'
  elif [ "$v" -ge 50 ] 2>/dev/null; then echo '\033[01;33m'
  else echo '\033[01;32m'; fi
}

format_duration() {
  local s=$1
  if [ "$s" -lt 60 ]; then
    echo "${s}s"
  elif [ "$s" -lt 3600 ]; then
    echo "$((s / 60))m"
  else
    echo "$((s / 3600))h$(((s % 3600) / 60))m"
  fi
}

out=""
[ -n "$model" ] && out+="\033[01;35m${model}\033[00m "
out+="$(color_for "$ctx")ctx:${ctx}%\033[00m"
[ "$h5" -ge 0 ] 2>/dev/null && out+=" $(color_for "$h5")5h:${h5}%\033[00m"
[ "$d7" -ge 0 ] 2>/dev/null && out+=" $(color_for "$d7")7d:${d7}%\033[00m"

if [ "$wake_s" != "-" ] && [ "$wake_s" -gt 0 ] 2>/dev/null; then
  out+=" \033[01;36mwake:$(format_duration "$wake_s")\033[00m"
fi

[ "$last_ts" != "-" ] && [ -n "$last_ts" ] && out+=" \033[0;36mlast:${last_ts}\033[00m"

[ -n "$last_input" ] && out+="\n\033[0;37m${last_input}\033[00m"

printf '%b' "$out"
