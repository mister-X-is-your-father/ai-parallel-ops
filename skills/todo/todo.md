# TODO Management Skill

複数プロジェクト横断のTODO管理スキル。JSONマスターデータ + Markdown自動生成。

## データディレクトリ

```
~/.todo/
├── projects.json          # プロジェクト登録簿
└── {project-slug}/
    ├── todo.json           # マスターデータ
    └── todo.md             # 自動生成ビュー
```

## コマンド分岐

引数を解析し、以下のサブコマンドに分岐する。引数が空なら `status` として扱う。

| コマンド | 説明 |
|---------|------|
| `status` | 全プロジェクト横断の進捗サマリー |
| `next` | 依存関係・優先度ベースの推奨タスク |
| `add <project> <title> [priority]` | タスク追加（デフォルト: medium） |
| `done <project> <id>` | タスク完了にする |
| `start <project> <id>` | タスクをin-progressにする |
| `block <project> <id>` | タスクをblockedにする |
| `review <project> <id>` | タスクをreviewにする |
| `sync` | 全プロジェクトのtodo.mdを再生成 |
| `init <project>` | 新プロジェクトを登録（現在のディレクトリ） |
| `list <project>` | プロジェクトの全タスク一覧 |

## 実行手順

### 0. 共通: データ読み込み

1. `~/.todo/projects.json` をReadツールで読む。存在しない場合は空の `{"projects":[]}` として扱う。
2. 必要に応じて対象プロジェクトの `~/.todo/{slug}/todo.json` を読む。

### 1. `status` サブコマンド

全プロジェクトの `todo.json` を読み、以下のフォーマットで出力:

```
📋 プロジェクト横断 TODO Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ {project name}        [{done}/{total}] {progress bar} {percent}%
  → next: #{id} {title} ({priority})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
全体進捗: {done}/{total} ({percent}%) | blocked: {n} | review待ち: {n}
```

プログレスバー: 8文字幅、`█` (完了) と `░` (残り) で構成。
各プロジェクトの "next" は、next サブコマンドと同じロジックでそのプロジェクトの最優先タスクを表示。

### 2. `next` サブコマンド

全プロジェクトから次にやるべきタスクを最大5件提案する。

**選定ロジック:**
1. `status` が `pending` または `in-progress` のタスクのみ対象
2. `dependencies` 内のIDが全て `done` でないタスクは除外
3. 優先度でソート: high > medium > low
4. 同優先度内では、ブロックしている後続タスク数が多いものを優先
5. 同スコアなら `id` が小さいものを優先

出力フォーマット:
```
🎯 推奨タスク（優先度・依存関係ベース）

1. [HIGH] {project} #{id} — {title}
   理由: {reason}

2. [MED] {project} #{id} — {title}
   理由: {reason}
```

理由の例:
- "N個の後続タスクがブロック中" (ブロッカーの場合)
- "依存なし、すぐ着手可能" (依存がないもの)
- "リリースブロッカー" (high優先度)
- "進行中" (in-progressのもの)

### 3. `add <project> <title> [priority]` サブコマンド

1. 対象プロジェクトの `todo.json` を読む
2. 新タスクを追加（IDは既存最大ID + 1）:
   ```json
   {
     "id": <next_id>,
     "title": "<title>",
     "status": "pending",
     "priority": "<priority or medium>",
     "dependencies": [],
     "created": "<today YYYY-MM-DD>",
     "updated": "<today YYYY-MM-DD>",
     "notes": ""
   }
   ```
3. `todo.json` を書き込み
4. `todo.md` を再生成（syncと同じ処理）
5. 追加したタスクを表示: `✅ #{id} "{title}" を {project} に追加しました`

### 4. `done <project> <id>` サブコマンド

1. 対象タスクの `status` を `"done"` に、`updated` を今日の日付に変更
2. `todo.json` を書き込み
3. `todo.md` を再生成
4. 表示: `✅ #{id} "{title}" を完了にしました`

### 5. `start/block/review <project> <id>` サブコマンド

`done` と同じ手順で `status` を `in-progress` / `blocked` / `review` に変更。

### 6. `sync` サブコマンド

全プロジェクトの `todo.md` を再生成する。

**todo.md テンプレート:**

```markdown
# TODO — {project name}

> Auto-generated from todo.json. Do not edit manually.

## In Progress
- [ ] #{id} **{title}** `{priority}` _{notes}_

## Pending
- [ ] #{id} **{title}** `{priority}` [depends: #{dep1}, #{dep2}]

## Blocked
- [ ] #{id} **{title}** `{priority}` ⛔ _{notes}_

## Review
- [ ] #{id} **{title}** `{priority}`

## Done
- [x] #{id} ~~{title}~~ _{updated}_

---
*Updated: {timestamp}*
```

セクション内タスクがゼロの場合はそのセクションごと省略する。

### 7. `init <project>` サブコマンド

1. `projects.json` を読む（なければ作成）
2. slugが既に登録済みなら警告して終了
3. プロジェクトを追加:
   ```json
   { "slug": "<project>", "path": "<current working directory>", "name": "<project with hyphens replaced by spaces, title case>" }
   ```
4. `~/.todo/<project>/` ディレクトリを作成（Bashツール使用）
5. 空の `todo.json` を作成: `{"tasks": []}`
6. 空の `todo.md` を作成
7. 表示: `✅ プロジェクト "{name}" を登録しました`

### 8. `list <project>` サブコマンド

対象プロジェクトの全タスクをテーブル形式で表示:

```
📋 {project name} タスク一覧
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID  Status       Priority  Title
#1  ✅ done      high      タスク名
#2  🔄 progress  medium    タスク名
#3  ⏸️  pending   low       タスク名
#4  ⛔ blocked   high      タスク名
#5  👀 review    medium    タスク名
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
合計: 5 タスク | done: 1 | active: 4
```

## 注意事項

- JSONの読み書きにはReadツールとWriteツールを使う
- ディレクトリ作成にはBashツールで `mkdir -p` を使う
- 日付は常に `YYYY-MM-DD` 形式
- プロジェクトslugは引数で指定。部分一致で検索し、一意に特定できればそれを使う
- エラー時は具体的なメッセージを出力（例: "プロジェクト 'xxx' が見つかりません"）
