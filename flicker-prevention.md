# フリッカー（画面ちらつき）防止対策

Claude Codeは大量のターミナル出力を高速に送信するため、画面のちらつきや高速スクロールが発生する。これを軽減する方法をまとめる。

## Claude Chill（推奨）

[claude-chill](https://github.com/davidbeesley/claude-chill) はClaude Codeとターミナルの間に入るPTYプロキシ。出力を差分レンダリングに変換し、フリッカーとスクロール問題を解消する。

### セットアップ

#### 1. Rustのインストール（未導入の場合）

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env
```

#### 2. claude-chillのインストール

```bash
git clone https://github.com/davidbeesley/claude-chill.git /tmp/claude-chill
cd /tmp/claude-chill
cargo install --path crates/claude-chill
```

#### 3. PATHの設定

`~/.bashrc` または `~/.zshrc` に追加:

```bash
source ~/.cargo/env
```

#### 4. 使い方

```bash
# 通常起動
claude-chill claude

# auto-lookbackを無効にする場合（15秒ごとの履歴表示が邪魔な場合）
claude-chill -a 0 claude
```

`claude` の代わりに `claude-chill claude` で起動するだけ。

### 機能

| 機能 | 説明 |
|------|------|
| 差分レンダリング | 画面の変更部分だけを送信。フリッカーを解消 |
| Lookbackモード | `Ctrl+6` で出力を一時停止して過去の出力を読み返せる |
| Auto-lookback | Claude停止後15秒で自動的に履歴表示（`-a 0` で無効化可能） |

### 注意点

- 個人開発ツール。広くテストされていない
- Claudeとターミナルの間にプロキシが挟まるため、クラッシュ時にセッションが切れる可能性がある
- フルスクリーン再描画時に履歴がクリアされる
- 気に入らなければ通常の `claude` コマンドで起動すればいいだけ

## その他の対策

### Ghosttyターミナル

[Ghostty](https://ghostty.org/) はSynchronized Output (DEC mode 2026) をネイティブ対応しており、描画が原子的になることでフリッカーが発生しない。

### IDE内蔵ターミナルを避ける

VS CodeやCursorの内蔵ターミナルはフリッカーが悪化しやすい。外部ターミナル + tmuxの方が安定する。
