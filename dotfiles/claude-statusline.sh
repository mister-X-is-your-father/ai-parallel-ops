#!/bin/bash
# Claude Code statusline.
# 出力:
#   行1: [model] ctx:N% [5h:N%] [7d:N%] [wake:Xm] [last:HH:MM]
#   行2: [最後のユーザメッセージ]
#   行3: [脳トレ問題] (60秒ごとに回転)
#
# wake セグメント: ScheduleWakeup tool の最新呼出を transcript .jsonl から
# 抽出して、 timestamp + delaySeconds = wake_at の残り時間を表示する。
# 過去の wake が消化済 (= 残時間 <= 0) なら非表示。
# last セグメント: 最後の assistant 応答の timestamp を HH:MM で表示。
# brain セグメント: 抽象↔具体・本質抽出・反転・アナロジー等の演習を回転表示。
input=$(cat)

IFS='|' read -r model ctx h5 d7 wake_s last_ts last_input brain <<<"$(STATUSLINE_INPUT="$input" python3 <<'PY'
import json, os, sys, time
from datetime import datetime

BRAIN = [
    # 抽象↔具体
    "「信頼」を関数のシグネチャで書け",
    "君のPCをタンパク質で喩えよ",
    "プログラミングを料理に喩えよ。逆も",
    "「会議」をUMLクラス図で書け",
    "「友達」を集合論で定義せよ",
    "君の今日を1単語に。さらに1音に",
    "「思い出」のデータ構造は?",
    "「待つ」を関数で書け",
    "「もったいない」をシステム図で",
    "君の感情を有限状態機械で図示",
    # 本質抽出
    "椅子と便座、本質的な差は何?",
    "ペンの本質: 書く?細い?握る?",
    "階段の本質: 高さ?斜面?ステップ?",
    "「信用」と「信頼」の差を例で",
    "「学ぶ」と「覚える」の差",
    "「データ」と「情報」の境界は?",
    "「速度」と「効率」の違いを定義",
    "「予測」と「推測」の差は?",
    "知識と知恵の差をコードで",
    "「ある」と「無い」の境界",
    "「同じ」とは何か? 同一性条件",
    "「自分」とは何の集合か",
    # 因果連鎖
    "なぜ人は寝る? を3段階深掘り",
    "朝食を抜くとなぜ眠い?を3層で",
    "なぜ円は美しい? を3レベルで",
    "なぜ人は嘘をつく? 進化的に",
    "なぜ笑う? 機能から答えよ",
    "なぜ言語は進化する?を進化論で",
    # 反転思考
    "失敗の定義を成功側から書け",
    "1+1=2 を証明側でなく疑え",
    "「無料」のコストはどこに?",
    "「目的」と「手段」が入替わる例",
    "もし重力が斥力なら、まず何が壊れる?",
    "お金が消えた世界、最初の困難は?",
    "「自由意志」が幻想として、意味はあるか",
    # 制約除去
    "制限なしなら今の仕事をどう変える?",
    "予算無限ならこの問題をどう解く?",
    "時間が逆流するなら何が起こる?",
    "言語が1つしかなければ何が変わる?",
    # メタ認知
    "君が「理解した」とはどんな状態?",
    "知らないことを知らない、を構造化",
    "自分の意見と他人の意見の境界",
    "「考える」を物理現象で説明",
    "君が今迷ってる本当の理由は?",
    "今のタスクの真の目的は何?",
    # 構造化・列挙
    "朝の挨拶の機能を全部列挙",
    "「正しさ」を3レベルに分解",
    "君の趣味を競合分析せよ",
    "「面倒くさい」を分解せよ",
    "「美しい」を再定義せよ",
    "「比較」が成立する必要十分条件",
    # アナロジー
    "インターネットを電気の流れで",
    "DBトランザクションを料理で",
    "再帰関数を入れ子人形で説明",
    "git rebase を引っ越しで喩えよ",
    "TCP/IPを郵便で再現せよ",
    # 重い問い
    "「存在」は観測か独立か。立場を選び反論3つ",
    "「意味」と「価値」は独立軸か?",
    "AIに「美しい」を教えるなら何から",
    "正解が存在する問題としない問題の境界",
    "「自由」と「責任」の関係を1図で",
    "君の死後も残るものを3つ、なぜ?",
    # 具体↔抽象 ズーム
    "目の前のキーボード、抽象化すれば何?",
    "「水」を1段抽象化、1段具体化",
    "「歩く」をN段階に分解",
    "1万円の本質的価値は?",
    "0と1の間に何がある?",
    # 演繹↔帰納
    "帰納で得た結論を演繹で再検証せよ",
    "君の信念から1つ反証可能形に",
    "サンプル1からどこまで一般化できる?",
]

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

brain = BRAIN[int(time.time() // 60) % len(BRAIN)].replace("|", " ")

print(f"{model}|{int(ctx)}|{int(h5) if h5 >= 0 else -1}|{int(d7) if d7 >= 0 else -1}|{wake_str}|{last_str}|{last_user}|{brain}")
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

[ -n "$brain" ] && out+="\n\033[01;33m脳: ${brain}\033[00m"

printf '%b' "$out"
