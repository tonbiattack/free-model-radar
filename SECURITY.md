# Security Policy

## このサイトが扱わない情報

- **API キーの入力・送信・保存は行いません。** サイト上にキーの入力欄はなく、生成される設定例にもキーの値は含まれません（環境変数の名前のみ）。
- ユーザーアカウント、決済、代理実行の機能はありません。すべて静的なサイトです。

## 脆弱性の報告

セキュリティ上の問題を見つけた場合は、公開 Issue を立てずに
[GitHub Security Advisories](https://github.com/tonbiattack/free-model-radar/security/advisories/new) から報告してください。

特に次のような問題を優先します。

- 生成された設定例に秘密情報が混入する
- 外部リンクやデータ経由で任意のスクリプトが実行される
- ワークフローが意図しない権限で動く

## データの誤りについて

無料枠情報の誤りはセキュリティ問題ではないため、通常の Issue で構いません。
[データ追加・修正のテンプレート](https://github.com/tonbiattack/free-model-radar/issues/new/choose) を使ってください。

## 自動化の権限

GitHub Actions の権限は最小限にしています。

- CI: `contents: read` のみ。公開ジョブだけが `pages: write` と `id-token: write` を持つ
- 監視: `contents: read` のみ。データを書き換えず、レポートを artifact として残す
- 外部のシークレットは使いません
