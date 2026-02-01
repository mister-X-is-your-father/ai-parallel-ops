# TODO管理ツール（Task Master連携）

[Task Master (taskmaster-ai)](https://github.com/eyecuelab/taskmaster-ai) をタスク管理の中核に据える。段取りフェーズで作成したTODOをTask Masterに投入し、各Claudeが参照・更新する。

## Task Masterが担う役割

| ワークフローの段階 | Task Masterの使い方 |
|------------------|-------------------|
| 0. ゴール定義 | PRDとしてまとめ、`parse-prd` でタスクを自動生成 |
| 3. TODO整理 | 生成されたタスク一覧がそのままTODOリストになる |
| 4. 依存関係の整理 | タスク間の `dependencies` で依存関係を定義 |
| 5. 一斉投入 | `next-task` で依存解消済みの投入候補を自動取得 |
| 6. 監督 | `get-tasks --status in-progress` で稼働中タスクを一覧 |
| 8. レビュー・承認 | 完了時に `set-task-status --status done` で状態更新 |

## 具体的な運用フロー

### 段取りフェーズ: PRDからタスク自動生成

```bash
# 1. PRDを書く（ゴール・成果物・制約を記述）
vi .taskmaster/docs/prd.txt

# 2. Task Masterにタスクを自動生成させる
# → TODO一覧、依存関係、サブタスクが一括で生まれる
```

Claude Code上で `parse-prd` を実行すれば、段取りフェーズの3（TODO整理）と4（依存関係整理）が一気に完了する。

### 実行フェーズ: 各Claudeがタスクを取得

各ウィンドウのClaude Codeで:
```
「next-taskで次のタスクを取得して、それを実行しろ。
 完了したらdoneにして、次のnext-taskを取得して続けろ。
 判断に迷ったら聞け。」
```

これにより:
- **各Claudeが自律的にタスクキューから仕事を引っ張る**（プル型）
- 依存関係が解消されたタスクだけが `next-task` に出てくる
- 完了したら自動的に次が取れる。監督がいちいち指示しなくていい

### 人間が直接確認・修正する方法

Task MasterにはCLIがある。Claudeに頼まなくても、自分のターミナルから直接操作できる。

```bash
# タスク一覧を確認（サブタスク付き）
task-master list all --with-subtasks

# 特定ステータスのタスクだけ見る
task-master list in-progress
task-master list pending

# タスクの詳細を見る
task-master show <タスクID>

# ステータスを変更する（レビュー後にdoneにする等）
task-master set-status <タスクID> done
task-master set-status <タスクID> blocked

# 次にやるべきタスクを確認
task-master next
```

**監督の使い分け:**

| 操作 | 方法 | 理由 |
|------|------|------|
| 全体状況の確認 | CLI `task-master list` | 自分で即座に見える。Claudeを待たなくていい |
| タスクの承認・差し戻し | CLI `task-master set-status` | 判断は人間がやる。Claudeを介す必要なし |
| タスクの内容修正 | Claude Codeに依頼 | JSONの手編集は面倒。Claudeに「タスク3の内容を○○に変えろ」が楽 |
| 新規タスク追加 | Claude Codeに依頼 | 依存関係の整合性をClaude側で保ってもらう |
| 依存関係の変更 | Claude Codeに依頼 | 同上 |

**原則: 「見る」はCLIで自分で、「変える」はClaudeに頼む。**

### GUIで確認する方法

CLIよりビジュアルに全体を把握したい場合、以下のツールが `.taskmaster/tasks.json` をリアルタイム監視してカンバンボード等で表示する。

| ツール | 起動方法 | 特徴 |
|--------|---------|------|
| [Task Studio](https://github.com/udecode/task-studio) | `npx task-studio@latest` → http://localhost:5565 | Web UIでカンバンボード＋リスト表示。ドラッグ&ドロップでステータス変更。tasks.jsonのリアルタイム監視 |
| [Taskmaster AI VS Code拡張](https://marketplace.visualstudio.com/items?itemName=Hamster.task-master-hamster) | VS Code Marketplaceからインストール | VS Code内にカンバンボード。ドラッグ&ドロップ対応 |
| [Taskboard](https://github.com/shokks/taskboard) | GitHubからセットアップ | リアルタイム更新のカンバンダッシュボード |

**推奨: Task Studio** — `npx` 一発で起動。ブラウザで常時開いておけば、15分バトルリズムのダッシュボードになる。全Claudeの作業状態がカンバンで一目瞭然。

#### Task Studioの自動起動

`dotfiles/.bashrc` にて、tmuxセッション内で初回シェル起動時にTask Studioを自動起動する設定が入っている。ポート5565が未使用の場合のみ起動する。

```bash
# .bashrc内の該当箇所
if [ -n "$TMUX" ] && ! lsof -i :5565 -sTCP:LISTEN &>/dev/null; then
  nohup npx task-studio@latest --no-open &>/dev/null &
  disown
fi
```

手動で起動する場合: `npx task-studio@latest` → http://localhost:5565

> 注: Linear, Jira, Notion等の外部PMツールとの直接連携は現時点ではない。Task Masterはtasks.jsonによる自己完結型。

### 監督フェーズ: 状態の一元管理

15分バトルリズムで確認するとき、自分のターミナルで:
```bash
task-master list all --with-subtasks
```

またはClaude Codeに:
```
「get-tasksで全タスクの状態を見せろ」
```

| ステータス | 意味 | 監督のアクション |
|-----------|------|----------------|
| `pending` | 未着手 | 依存が解消されていれば投入可能 |
| `in-progress` | どこかのClaudeが実行中 | 順調か巡回で確認 |
| `blocked` | 依存タスクが未完了 | 先行タスクの進捗を確認 |
| `done` | 完了 | レビュー対象 |
| `review` | レビュー待ち | 自分が確認して承認 or 差し戻し |

## タスクファイルの共有

Task Masterのタスクデータは `.taskmaster/tasks/tasks.json` に保存される。

- **全Claudeが同じプロジェクトディレクトリで起動**すれば、同じタスクファイルを参照できる
- 各Claudeが `set-task-status` で状態を更新すれば、他のClaudeの `next-task` に反映される
- これがストリップボード（外部記憶）の役割を果たす

## PRDの書き方（Task Master用）

段取りフェーズ0〜2の内容をそのままPRDに書く:

```markdown
# プロジェクト名

## ゴール
[今回達成したいこと]

## 成果物と完了条件
- 成果物A: [具体的な完了条件]
- 成果物B: [具体的な完了条件]

## 共通ルール・制約
- [トーン、命名規則、ディレクトリ構成など]

## タスク概要
- [大まかな作業項目を列挙。Task Masterが詳細化する]
```
