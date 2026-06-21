#!/usr/bin/env bash
# 起動中サーバー(listen socket)の tmux 連携。
#   --indicator : tmux 2段目に出す [srv:N] (N=起動中サーバー数)。status-interval 毎に更新。
#   --menu      : タップ時に live なサーバー一覧を tmux display-menu で表示(即時・全URL)。
#                 項目を選ぶと URL をクリップボード(clip.exe)へコピー。メニュー外タップで閉じる。
#   --list      : name<TAB>url を1行ずつ(デバッグ/再利用用)。
#
# 旧方式(Claude statusline に一覧を出す state ファイル トグル)は廃止。再描画遅延で
# 「リアルタイムに開閉」できなかったため、tmux ネイティブの即時メニューに変更。

list_servers() {
  ss -tlnpH 2>/dev/null | python3 -c '
import sys, re, os
HOST = os.uname().nodename.split(".")[0].lower()   # Tailscale ホスト名 (= leo)
ALIAS = {                                          # port -> 表示名
    3010: "manademia-prod", 3011: "manademia-dev",
    8080: "char-create", 8095: "e2e-shots", 8888: "embed-sandbox",
}
PATHS = {8080: "/characters-mece.html", 8095: "/index.html", 8888: "/index.html"}
def cwd_of(pid):
    try: return os.readlink(f"/proc/{pid}/cwd")
    except Exception: return ""
def derive(pid, argv):
    if "http.server" in argv:
        d = argv[argv.index("--directory")+1] if "--directory" in argv else cwd_of(pid)
        return os.path.basename(d.rstrip("/")) or "http"
    if any("next" in a for a in argv):
        parts = cwd_of(pid).split("/")
        if ".next" in parts: return parts[parts.index(".next")-1]
    if "-m" in argv:
        i = argv.index("-m")
        if i+1 < len(argv): return argv[i+1]
    scr = next((a for a in argv[1:] if a.endswith((".py",".js",".ts",".mjs"))), None)
    return os.path.basename(scr) if scr else (os.path.basename(argv[0]) if argv else "?")
seen = {}
for line in sys.stdin:
    parts = line.split()
    if len(parts) < 4: continue
    m = re.search(r":(\d+)$", parts[3])
    if not m: continue
    port = int(m.group(1))
    pm = re.search(r"pid=(\d+)", line)
    if not pm or port in seen: continue
    pid = pm.group(1)
    label = ALIAS.get(port)
    if not label:
        try:
            with open(f"/proc/{pid}/cmdline","rb") as f:
                argv = [a.decode("utf-8","replace") for a in f.read().split(b"\x00") if a]
            label = re.sub(r"\s.*$","", re.sub(r"\.(py|js|ts|mjs)$","", derive(pid, argv)))[:18]
        except Exception:
            label = "?"
    seen[port] = label
for p in sorted(seen):
    print(f"{seen[p]}\thttp://{HOST}:{p}" + PATHS.get(p, "/"))
' 2>/dev/null
}

case "${1:-}" in
  --indicator|"")
    n=$(list_servers | grep -c .)
    echo "[srv:${n}]"
    ;;
  --list)
    list_servers
    ;;
  --menu)
    # live なサーバー一覧でメニューを組む。選択で URL をクリップボードへ。
    args=()
    while IFS=$'\t' read -r name url; do
      [ -z "$name" ] && continue
      args+=( "$name  $url" "" "run-shell \"printf %s '$url' | clip.exe\"" )
    done < <(list_servers)
    if [ ${#args[@]} -eq 0 ]; then
      args=( "(起動中サーバーなし)" "" "" )
    fi
    tmux display-menu -T " 起動中サーバー (選ぶと URL コピー) " -x C -y C "${args[@]}"
    ;;
esac
