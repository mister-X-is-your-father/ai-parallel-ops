# 音声操作セットアップガイド

Windows + tmux 環境を音声で操作するためのガイド。Windows Voice Access（一般UI操作）と Talon（ターミナル/tmux操作）を併用する。

## 1. Windows Voice Access

### 要件

- Windows 11 22H2 以降

### セットアップ

1. 設定 → アクセシビリティ → 音声アクセス → オン
2. 初回は音声モデルのダウンロードが必要（英語）
3. 「Show numbers」で画面上の要素に番号オーバーレイ表示 → 「Click 5」で選択

### 主なコマンド

| コマンド | 動作 |
|---|---|
| `Click [名前]` | UI要素をクリック |
| `Show numbers` | 番号オーバーレイ表示 |
| `Click [番号]` | 番号で要素選択 |
| `Scroll down/up` | スクロール |
| `Press control b` | 修飾キー送信 |
| `Go to sleep` | 一時停止 |
| `Wake up` | 復帰 |

### 制限事項

- 日本語対応は限定的（英語コマンドが基本）
- ターミナル内の操作は冗長になりがち（修飾キーの発話が長い）

---

## 2. Talon（ターミナル/tmux 特化）

### インストール

1. https://talonvoice.com からダウンロード（無料）
2. 音声エンジンは **Conformer**（無料、高精度）を選択
3. コミュニティコマンドセットを導入:
   ```bash
   git clone https://github.com/talonhub/community ~/.talon/user/community
   ```

### tmux 用カスタムコマンド

`~/.talon/user/tmux.talon`:

```talon
# ペイン切り替え（番号指定）
pane one:    key(ctrl-b 1)
pane two:    key(ctrl-b 2)
pane three:  key(ctrl-b 3)
pane four:   key(ctrl-b 4)

# ペイン移動（方向指定）
pane left:   key(ctrl-b left)
pane right:  key(ctrl-b right)
pane up:     key(ctrl-b up)
pane down:   key(ctrl-b down)

# ウィンドウ操作
new window:  key(ctrl-b c)
next window: key(ctrl-b n)
prev window: key(ctrl-b p)
zoom pane:   key(ctrl-b z)

# Claude Code 操作
stop agent:   key(escape escape escape)
resume agent: insert("cc-r\n")
```

### Talon の利点

- 短い英単語でコマンド発火（「pane one」でペイン切替）
- Python スクリプトで任意のシェルコマンド実行可能
- Conformer エンジンの英語認識精度が非常に高い
- プログラミング用途に設計されており dictation も可能

---

## 推奨構成

| 用途 | ツール |
|---|---|
| 一般的な Windows UI 操作 | Windows Voice Access |
| tmux / ターミナル操作 | Talon |

両方を常駐させて併用可能。Voice Access は Windows 全般、Talon はターミナル作業時に使い分ける。
