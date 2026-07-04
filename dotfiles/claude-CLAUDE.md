# Global CLAUDE.md

## Network — サーバーURLの案内ルール

このマシンはTailscale経由でアクセスされる。**ユーザーはローカルにいない。**

### サーバー起動時の必須事項
1. **bind先は必ず `0.0.0.0`**（`127.0.0.1`/`localhost` だとTailscale越しに見えない）
2. **案内するURLはTailscaleホスト名を使う** — `localhost` / `127.0.0.1` は絶対に渡さない
3. 起動コマンドのオプションに `--host localhost` などが入っていないか確認する

### ホスト名取得
ホスト名は `hostname` コマンドで動的に取得する（環境によって異なるため決め打ちしない）。
このマシンの場合は `leo`。

IPを案内する必要があるときは `tailscale ip -4` で動的取得する。
（IPはデバイス再登録時などに変わる可能性あり。ホスト名優先）

### 案内テンプレ
- ✅ `http://leo:8080/...` （ホスト名優先）
- ✅ IPが必要なら `tailscale ip -4` で取得して使う
- ❌ `http://localhost:8080/...`
- ❌ `http://127.0.0.1:8080/...`

dev server (vite/next/uvicornなど) もすべて同じ。CLIのデフォルト出力に `localhost` が出てもユーザーには変換して伝える。

---

## Windows ホスト操作 (WSL → Windows、UAC 規約)

leo は WSL ホスト専用機。Windows 側の管理（サービス停止/アンインストール/レジストリ編集/`Start-Process -Verb RunAs` 等、**管理者権限が要る操作**）を WSL から `powershell.exe` 経由で行うことがある。`powershell.exe` はPATHに無いのでフルパス `/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`、文字化け回避に先頭で `[Console]::OutputEncoding=[Text.Encoding]::UTF8`。

### UAC 確認の必須ルール（毎回）
**管理者権限が要る Windows 操作をする前に、必ず UAC 設定を確認すること**:
```bash
/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe -NoProfile -Command "(Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System').ConsentPromptBehaviorAdmin"
```
- 返り値 **0 = 昇格時ダイアログ無し（UAC実質無効）** → `Start-Process -Verb RunAs` で **無人で管理者実行してよい**（ユーザー操作不要）。
- **0 以外（=承認ダイアログが出る）** → 実行前にユーザーへ「**UAC承認ダイアログが Windows 画面に出るので AnyDesk で繋いで『はい』を押して**」と伝えてから実行する。勝手に進めて承認待ちで詰まらせない。

（2026-06-17時点は `0`。詳細手順は memory `reference_windows_host_from_wsl`。ユーザーは「UAC無効のはず」と認識しているが、**思い込まず毎回上記で確認**する。）

---

## RPA (asus-1 Playwright MCP) の復旧

leo ↔ asus-1 のPlaywright MCPは `asus1-mcp-shim` が仲介する。上流断は**shimが無限再接続で勝手に吸収する**（瞬断で慌てない）。

「Chromeが勝手に頻繁に再起動」の定期再起動機構は**全廃済み (2026-06-13)**:
- asus-1の `RPA-Watchdog` スケジュールタスク（旧5分毎）→ トリガー無効化
- shimの上流断→Chrome自動kick → コード削除

MCPが本当に死んだときだけ、leoで手動コマンドを叩く:
```bash
rpa-restart      # asus-1のChrome+MCPを再起動 → 数十秒待つ → /mcp でreconnect
```
詳細SoT: `/home/neo/.claude/projects/-home-neo-rpa/memory/reference_mcp_shim_restart.md`

### ブラウザ操作のフォールバック規則 (= asus-1 が繋がらない時)

Web の動作確認 / RPA で **asus-1 (`mcp__playwright-asus1__*`) が繋がらない場合**:

1. asus-1 を **最大 3 回リトライ** (= 接続エラー `ECONNREFUSED` / `Target page... closed` 等)。途中で `rpa-restart` → 数十秒待機 → 再試行も 3 回のうちに含めてよい
2. **3 回ダメなら、leo 上のローカル Playwright (`mcp__playwright__*`) に切り替える**。ユーザーに毎回確認しない (= この規則が常時許可)
3. 切り替えた事実は一言ユーザーに伝える (= 「asus-1 が繋がらないのでローカルブラウザで確認します」)

ローカル Playwright は leo 上で動くので、案内 URL 規則 (= `0.0.0.0` bind / Tailscale ホスト名) と同様に `http://leo:PORT/...` 等へ普通にアクセスできる。スクショ保存先も leo ローカルになり Read で読める利点あり。

#### ローカル Playwright MCP = 常駐 HTTP サーバ (2026-06-22〜)

`mcp__playwright__*` は **stdio ではなく常駐 HTTP サーバ**で動く (stdio は idle で落ち毎回 `/mcp` 手動再接続が要ったため自動化)。

- サービス: `playwright-mcp.service` (systemd user, **enabled + Restart=always + Linger=yes** → boot/未ログインでも常時稼働)。`@playwright/mcp --isolated --headless --port 8931 --host 127.0.0.1 --allowed-hosts "*"` (127.0.0.1 bind = localhost 限定)。
- 接続: `~/.claude.json` の `playwright` = `{"type":"http","url":"http://127.0.0.1:8931/mcp"}`。**stdio 設定の backup = `~/.claude.json.bak-20260622-211157`**。
- ツールが `No matching deferred tools` で出ない時 = ハーネスの接続切れ → **`/mcp` で再接続** (server は常駐なので即・確実)。サーバ自体を疑うなら `systemctl --user restart playwright-mcp.service` → 数秒 → `/mcp`。
- 疎通: `curl -s -XPOST http://127.0.0.1:8931/mcp -H 'Accept: application/json, text/event-stream' -H 'Content-Type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"x","version":"1"}}}'` → `initialize` result が返れば健全。
- **同時接続**: `--shared-browser-context` を付けていないので **MCP セッションごとに独立した browser context** (= 並列クライアントは互いに干渉しない)。
- **⚠ chrome は service cgroup から逃げる** (`session-*.scope` 等)。service の `MemoryMax` は node (~100MB) しか cap しない (残置するが chrome 制御には無力)。
- **メモリ方針 = 「走査中は絶対 kill しない」**。代わりに2本立て:
  1. **idle 1h kill** (`playwright-mcp-reaper.sh`, timer 5分毎): output-dir の最新 mtime が 1h 更新されず & chrome RSS>800MB のとき、`/tmp/playwright_chromiumdev_profile` の chrome を profile path で kill (node は残す=接続維持・respawn)。**緊急 RSS kill は持たない** (= active を殺す経路を排除)。kill 直前 5秒 mtime 再チェックで活動あれば中止。
  2. **admission control** (`journey-tester/preflight-mem.sh`): 観測 launch 前に実行。**MemAvailable < 4GB なら新セッションを作らない** (rec_concurrency=0 → 起動見送り)。空きに応じ `rec_concurrency=(avail-4096)/700` を parallel の同時数上限に使う。**動的** (固定 3GB 上限は廃止)。
- **idle 検知 = output-dir mtime**: service に `--output-dir /tmp/playwright-mcp-output --save-session --output-max-size 52428800` (操作のたびファイル書込)。`--output-mode file` は付けない (snapshot inline 維持=agent を壊さない)。
- 容量目安: 実ページ context ≈ 数百MB〜1GB (core 共有で +context ~700MB 見積り)。

---

## asus-1 のファイルは `~/asus1/` で直接読み書きできる (Taildrive 常設マウント, 2026-07-04〜)

leo から asus-1 (Windows) のファイルは、**アップロードも SSH も介さず** `~/asus1/` 配下の普通のローカルファイルとして read-write できる。全プロジェクト共通の常設連携。**RPA (Chrome/Playwright MCP) とは別系統で、それらに依存しない**ので RPA が死んでいても使える。

- **マウント先**: `~/asus1/downloads/` = asus-1 の `C:\Users\ikimo\Downloads` / `~/asus1/ikimo/` = `C:\Users\ikimo` 丸ごと。`cat`/`cp`/Read でそのまま扱える (書込は asus-1 の Windows に即反映)。
- 実体: Tailscale **Taildrive** → `rclone` WebDAV マウント。`asus1-mount.service` (systemd --user, **enabled + linger + Restart=on-failure** → boot/未ログインでも自動)。
- ⚠ **プロファイル直下 (`~/asus1/ikimo/`・Downloads root) の `ls` は重い** (エントリ膨大)。目的のサブパスを直接指定すれば一瞬。
- **不通/stale 時**: `systemctl --user restart asus1-mount.service`。asus-1 疎通は `tailscale status | grep asus-1`。**唯一の弱点は asus-1 の電源OFF/スリープ** (その間だけ不通、復帰で自動回復)。
- 共有追加: asus-1 で `tailscale drive share <名> "<Windowsパス>"` → サービス restart で `~/asus1/<名>` に出る (ACL は `shares:["*"]` 全許可済みなので変更不要)。
- asus-1 への SSH は **ユーザー `ikimo`** (`ssh -i ~/.ssh/id_ed25519 ikimo@100.121.58.13`。`neo`/`ikimonogakaru` は拒否。短縮名は名前解決不可 → IP か FQDN)。shell は cmd.exe。
- **SoT / 詳細手順**: `~/remote-toolkit/docs/taildrive-file-access.md` (アーキ図・ACL要件〈nodeAttrs + grants の app capability 両方必須〉・再起動時挙動・トラブルシュート)。

---

## 自律実行モードの使い分け (= 3 つある)

ユーザーが「朝までやって」「N 時まで継続して」「夜の間に進めて」 など **session 終了をまたぐ自律実行** を頼んだ場合、 以下 3 候補から選ぶ。

### 判断ルール

| 状況 | 使うべき |
|---|---|
| **manademia リポジトリの作業** (= 圧倒的多数) で、 GitHub issue 起票 → 自動消化したい | **claude-executor** (= 既に systemd で常時稼働中) |
| session 内 only / user が見てる前提の数十分作業 | `/loop` |
| 別マシン / 別 repo / Anthropic cloud 必須 | `/schedule` (= remote trigger) |

### 推奨: manademia は **claude-executor** ファーストで

`/home/neo/apps/manademia/claude-executor/` に既存の自動消化 pipeline がある。 systemd で `claude-executor-runner.service` が常時稼働、 GitHub issue を polling して Sonnet で消化、 PR 作成 → watcher.service が auto-merge。 SoT は [`claude-executor/docs/conventions.md`](https://github.com/mister-X-is-your-father/manademia/blob/main/claude-executor/docs/conventions.md)。

**起動方法 (= 既に走ってるので確認のみ)**:
```bash
systemctl --user status claude-executor-runner   # active であること
systemctl --user status claude-executor-watcher  # active であること
```

**仕事を投げ込む手順**:
1. GitHub issue を **`gh issue create`** で起票
2. 適切な label を付ける (= `type/feature`, `priority/critical|high|medium|low`, `area/*`)
3. **`executor-skip` label は付けない** (= これがついてると消化対象外)
4. body に「Closes #N」 ではなく、 acceptance criteria を明示
5. 単発 issue は 通常 1 PR、 `type/epic` ラベル + body で対象 markdown path 指定なら N Want 順次消化

### 失敗パターン

- 「朝までループしてくれ」 と言われて `/loop` 起動 → session 閉じたら止まる → 何も進んでない
- 正解: claude-executor 用に issue を 1-N 個起票 → 寝てる間に自動消化 → 朝に PR で確認
- 「issue 起票したけど executor が拾わない」 → label / `executor-skip` 有無 / `gh pr list` で同 issue 参照中 PR が in-flight でないか確認

---

## 開発スタイル (= manademia + 個人 project 共通の規範)

### 原則

| 原則 | 説明 |
|---|---|
| **使えるライブラリは必ず使う** | 自前実装は library 不在 / 要件不一致 / ライセンス NG のみ。 衝動的な自前実装 NG。 「車輪の再発明 防止」 が長期保守の最大要素 |
| **5 年見通しで library 選ぶ** | maintainer 数 + backing + community 規模で「絶対に存続する」 もの優先。 急成長中の新参 library より 1-2 年枯れたものを選ぶ |
| **abstraction layer 越しに使う** | 重要 library (= Auth / Payment / Storage 等) は 自前 `interface` 経由で。 将来差し替え可能性確保 |
| **TDD は適材適所** | pure function / abstraction は TDD、 DB schema は schema-first + contract test、 UI は post-hoc snapshot、 e2e は最後の探索的バグ取り |
| **イケてない箇所はその場で改善** | refactor 機会を逃さない。 ただし scope crawl は避ける (= 別 PR / 別 commit に切る判断は user 確認) |

### TDD scope 判断

| 領域 | TDD 推奨度 | 理由 |
|---|---|---|
| 業務 logic (= pure function) | ★★★ 強く | input/output 明確 |
| Abstraction layer (= interface 設計) | ★★★ 強く | interface contract first で差し替え可 |
| server action | ★★ 推奨 | mock しやすい、 happy + error path |
| DB migration / schema | × schema-first | 既存 fixture 互換確認に重点 |
| UI component | △ post-hoc | snapshot で十分 |
| E2E flow | × 最後に | playwright + 探索的 (fast-check) |

Test pyramid: Unit 80% / Integration 15% / E2E 5%。

### DB conventions (= 全 project 共通)

| カテゴリ | 推奨 |
|---|---|
| ID | **UUID v7** (= time-ordered、 index 高速、 標準化済) |
| Naming | snake_case 厳密、 column 名 singular、 table 名 plural |
| Timestamps | 全 table に `created_at` + `updated_at` + `deleted_at` (= soft delete) — `timestamptz with timezone` |
| Soft delete | `deleted_at timestamptz NULL`、 hard delete は audit-only 除き禁止 |
| Enum | `CREATE TYPE` 避けて **CHECK constraint** で表現 (= ALTER 楽) |
| JSON column | 進化中フィールドのみ (= `metadata jsonb`、 `config jsonb`)、 schema-stable な data は使わない |
| Index | composite index は `(tenant_id, ...)` 形式が基本、 single column index 最小化 |
| Foreign key | child は `ON DELETE CASCADE`、 cross-domain は `ON DELETE SET NULL` |
| Trigger | `updated_at` 自動更新 + audit log のみ。 business logic は server action |
| RLS policy 命名 | `{table}_{role}_{action}` (e.g., `profiles_owner_select`) |
| Migration naming | `NNNN_short_description.sql` |
| tenant_id | tenant scope の全 user-facing table に置く (= JOIN コスト避ける、 RLS で安全網) |

### Code quality 規範

- TypeScript **strict** + `noUncheckedIndexedAccess` 有効化
- ESLint: `@typescript-eslint/no-explicit-any` error、 import 順序統一
- Prettier
- pre-commit hook: format + lint + typecheck (= husky)
- function 1 つあたり 30 行以内目安 (= guideline、 強制せず)
- 命名: 副作用ある関数は動詞 (`createUser`)、 query 系は `find` / `get` で区別

### Refactor 判断 (= 「イケてない箇所」 への対応)

| シナリオ | 対応 |
|---|---|
| 触ってる範囲の中で発見 | その場で fix + commit に含める (= scope creep 1 段階内なら OK) |
| 別領域で発見 | TODO コメント + 別 issue 起票 (= scope crawl 防止) |
| 大規模 (= 数百行影響) | ADR 化 → user 確認 → 別 PR |

---

## ハンドオフ品質規範 (= 並列 / 非同期 work で重要)

claude-executor / parallel agent / 翌日 self 等、 **「次の人 (= 自分含む) がコンテキスト無しで読む」** 前提で書く:

- commit message: WHY を 1-3 行 (= 何を / なぜ / 影響範囲)
- PR body: Summary + Test plan + 関連 issue/spec への link
- spec md: status (= 進行中 / 完了 / blocked) を header に明示
- TODO コメント: `// TODO(yyyy-mm-dd, owner): ...` 形式で trackable に
- ADR: 「検討した選択肢」 を必ず書く (= 採用しなかった理由が後で価値ある)

---

## 自律実行中の Infra 点検規範 (= 長時間 / 24h 自走時に必須)

claude-executor で長時間 (= 数時間〜数日) 自走させる時、 **手放しではダメ**。 以下のサイクルで infra 点検 + 自律修正:

### 点検サイクル

- **最初の 1 時間**: 15 分ごとに 4 回チェック (= 早期問題発見、 fail fast)
- **以降**: 1 時間ごとにチェック
- **問題発見時**: 自律的に修正 or escalate (= severity による)

### 各点検で確認する項目

1. **CI status**: `gh pr checks <PR>` で open PR 全部の CI を確認 (= fail なら ci-doctor 起動 or 手動 fix)
2. **PR mergeable + conflict 多発**: `gh pr list --state open` の数 + 各 PR の `mergeStateStatus`。 CONFLICTING が複数 / 連続発生したら **構造的な問題** (= main の急な変更 / 共通 file の触り過ぎ) を疑う、 原因突き止めて修正
3. **Branch merge 状況**: 期待した branch が main に merge されたか (= 既知 PR が closed/merged になってるか)
4. **claude-executor service**: `systemctl --user status claude-executor-runner` (= active か。 dead/failed なら restart)
5. **watcher service**: `systemctl --user status claude-executor-watcher` (= 同上)
6. **本番 service (manademia など)**: `systemctl --user status manademia-prod` (= 本番影響あれば即対応)
7. **disk / memory**: `df -h /home /tmp` + `free -h` (= 90% 超なら警告)
8. **executor cooldown**: status file 確認 (= /tmp/${PROJECT}-issue-executor-*.status) で連続失敗が無いか
9. **新規 issue / PR の生え方**: 想定外の issue / PR が生えてないか (= 急に PR 数が爆発、 同じ Want が複数 PR で並走、 等)。 違和感あれば即調査
10. **commit pattern**: 同じ error message を繰り返してないか (= `git log -20 --oneline` で「revert」「retry」「fix」 が連続なら詰まってる signal)
11. **executor log**: `tail -100 logs/issue-executor-*.log` で異常 pattern (= `ERROR`、 `FAILED`、 `cooldown`) を確認
12. **違和感 sensor**: 「何かおかしい」 と感じたら手を止めて原因突き止め。 直感を信頼、 「気のせい」 で済ませない

### 異常検知 → 自律対応の判断

| 状況 | 対応 |
|---|---|
| CI が format / lint で fail | 自動 fix push (= ci-doctor 任せ or 手動) |
| CI が unit test で fail | 失敗内容 review → 簡単なら fix push、 複雑なら escalate |
| PR conflict 1-2 件 | rebase 試行 (= conflict-doctor) |
| **PR conflict 多発 (= 3 件以上同時)** | **手を止めて原因調査**: 何が main を急変させた? 共通 file 触り過ぎ? executor 設定ミス? |
| service dead | restart 試行 → 失敗なら escalate |
| disk full | log rotation / 古い backup 削除 (= 安全な範囲) |
| **想定外の状態変化** (= 同じ Want が複数 PR で並走、 急に PR 大量発生) | **即調査 + executor 一時停止検討**、 user に escalate |
| 同じ error 繰り返し | infinite loop の可能性、 executor 設定 / spec / 環境のどれが悪いか切り分け |
| **違和感 (= 数値で説明できないが何かおかしい)** | **直感を信頼**、 手を止めて深掘り。 後悔より調査 |

### 自律修正の判断

| 状況 | 対応 |
|---|---|
| CI が format / lint で fail | 自動 fix push (= ci-doctor 任せ or 手動) |
| CI が unit test で fail | 失敗内容 review → 簡単なら fix push、 複雑なら escalate |
| PR conflict | rebase 試行 (= conflict-doctor) |
| service dead | restart 試行 → 失敗なら escalate |
| disk full | log rotation / 古い backup 削除 (= 安全な範囲) |
| 想定外の状態変化 | escalate (= 勝手に変更しない) |

### Escalate の方法

user に chat で報告 (= session 開いてれば) or issue にコメント (= 自走中ならこちら):
```
gh issue comment <epic_issue_num> --body "🚨 infra check {time}: {問題詳細} / {取った対応 or 待機中}"
```

### 失敗パターン

- 長時間自走中に「infra check」 を一切やらず、 翌朝起きたら 5 時間前から service が落ちてて何も進んでない
- 正解: 手放さない、 上記サイクルで自律監督
- 「忙しい」 を理由に skip しない (= サイクル維持が一番大事)

### コスト最適化: Haiku 委譲パターン (= 長時間 loop / 定期 check で重要)

長時間 loop (= infra-check、 status polling、 build watch 等) で **単純な status 取得 + format** を毎 cycle メイン Opus session で実行するのは token 浪費。 以下のパターンで分業:

| 役割 | 担当 | 内容 |
|---|---|---|
| **データ取得 + format** | **Haiku sub-agent** (`Agent(subagent_type="general-purpose", model="haiku")`) | gh / systemctl / df / git log / 各種 cli の結果を集めて指定 format で 1 度に return |
| **考察 + 異常判定 + 行動** | **メイン Opus** | Haiku の report を読み、 異常検知、 fix push / restart / escalate の判断 |

### 何を Haiku に任せる / 任せない

| 任せる (= Haiku OK) | 任せない (= Opus 必須) |
|---|---|
| 単純コマンドの実行 + 結果整形 | 「これは異常か?」 の判断 |
| 数値の集計 (= PR 数 / merge 数 / pending count) | 異常の root cause 推測 |
| 既定 format への mapping | fix push 内容の決定 |
| pattern match (= "FAILED" 含むか) | escalate するか / 自律修正するか |

### 使い方

メイン Opus は cycle ごとに 1 回 Agent ツールで Haiku を起動:
```
Agent({
  subagent_type: "general-purpose",
  model: "haiku",
  description: "infra-check cycle #N",
  prompt: "<取得 + format 指示を 1 度に。 余計な前置きなし、 raw 数値のみ>"
})
```

Haiku report 受信後、 メイン Opus が:
- Anomaly なし → cycle output を user に short show → ScheduleWakeup
- Anomaly あり → Opus が判断 + 行動 (= fix push / restart / escalate)

### Haiku 委譲時の注意

- prompt は「やること」 + 「format」 + 「余計な出力禁止」 を明示 (= Haiku は冗長になりがち)
- 判断を含む指示は書かない (= 「異常ならこうしろ」 は Opus 側で。 Haiku には判定基準だけ渡して anomaly 文字列を埋めさせる)
- 同 cycle で複数 cli 結果が必要なら **1 つの Haiku call にまとめる** (= sub-agent 起動コスト最小化)
- destructive 操作は委譲禁止 (= rm / kill / push --force は Opus が責任持って実行)

### 失敗パターン

- 毎 cycle で gh / systemctl / df を main Opus で直接実行 → 24 cycle × 10 コマンド = Opus token 浪費
- 正解: 1 つの Haiku call にまとめて status 取得、 Opus は report を読むだけ

---

## 開発スタイル (= 重要規範の総まとめ)

| 規範 | 場所 |
|---|---|
| TDD scope | §開発スタイル 「TDD scope 判断」 |
| DB conventions | §開発スタイル 「DB conventions」 |
| Code quality | §開発スタイル 「Code quality 規範」 |
| Library 採用判断 | §開発スタイル 「原則」 |
| Refactor 機会主義 | §開発スタイル 「Refactor 判断」 |
| 自律実行モード使い分け | §自律実行モードの使い分け |
| ハンドオフ品質 | §ハンドオフ品質規範 |
| Infra 点検 | §自律実行中の Infra 点検規範 |
| Haiku 委譲 (= cost 最適化) | §コスト最適化: Haiku 委譲パターン |
