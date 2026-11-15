# Free Model Radar

OpenCode などのコーディングエージェントから **課金なしで呼べる** LLM API を探し、**エージェントとして動くか**を別の情報として比較する静的サイトです。

- 公開 URL: https://tonbiattack.github.io/free-model-radar/
- データ: このリポジトリの `data/` 配下（JSON）
- ビルド・デプロイ: GitHub Actions（無料枠のみ）

「無料」と「使える」は別です。このサイトでは次の 2 点を混同しません。

1. **無料枠の種別** — 恒久無料 / 期間限定トライアル / 初回クレジット / 条件付き / 終了 / 不明
2. **不明な項目** — 「不明」は「非対応」でも「0」でもありません

## 何を解決するか

`ai-plan-radar` がサービスの料金プランを比較するのに対し、このプロジェクトは **無料 API と OpenCode での実用性** に絞っています。
「無料で呼べるはずのモデルが、実際にはレート制限でエージェントの 1 タスクすら完走できない」という失敗を、使う前に見えるようにするのが目的です。

## 主な機能

| 機能               | 内容                                                                              |
| ------------------ | --------------------------------------------------------------------------------- |
| モデル一覧         | 無料枠種別・登録の手間・認証・RPM/RPD/TPM・ツール呼び出し・検証状態・確認日を表示 |
| 検索と絞り込み     | 名前検索、恒久無料、カード不要、登録の手間、ツール対応、検証済み、鮮度、提供元    |
| 条件の共有         | 絞り込み条件を URL に保持するので、そのまま共有できます                           |
| 詳細ページ         | 出典 URL・確認日・信頼度、レート制限の適用範囲、公式記載と実機検証の分離          |
| 性能リンク         | 性能は自前評価せず、ai-plan-radar のモデル性能ページへリンク                      |
| 設定ジェネレーター | `opencode.json` を生成・プレビュー・コピー。API キーは扱いません                  |
| 変更履歴           | 無料枠の変更を、検出日時・変更前後・出典つきで記録                                |
| 調べ方             | 情報の集め方と限界を公開                                                          |

### 登録すれば使えるモデル

「無料枠がある」と「すぐ使い始められる」は別です。キー取得までの手間を 4 段階で持ち、一覧で絞り込めます。

| 手間         | 意味                                      |
| ------------ | ----------------------------------------- |
| 登録だけ     | アカウント作成で API キーが即時発行される |
| Discord 参加 | 提供元の Discord サーバーへの参加が条件   |
| 順番待ち     | 承認待ち・ウェイトリストがある            |
| カード登録   | 無料枠でも支払い方法の登録が必須          |

OpenCode から `/connect` だけで使えるもの（OpenCode Zen の無料モデルなど）は、一覧の「/connect だけで使える」の件数に含まれます。

## 開発

Node.js 22 以上と npm が必要です。外部の有料サービスは使いません。

```bash
npm ci

# データを検証してから開発サーバーを起動する
npm run dev

# データ検証 + 型チェック + ビルド
npm run build
```

`npm run dev` は起動前に `data/` を検証し、通ったデータだけを `src/generated/dataset.json` に書き出します。
検証に失敗した場合は生成せずに停止するので、壊れたデータで画面を確認してしまうことはありません。

### 主なコマンド

| コマンド                          | 内容                                                       |
| --------------------------------- | ---------------------------------------------------------- |
| `npm run dev`                     | データ検証 + 開発サーバー                                  |
| `npm run build`                   | データ検証 + 型チェック + 本番ビルド（`dist/`）            |
| `npm run preview`                 | ビルド結果をローカルで確認                                 |
| `npm test`                        | スキーマ・フィルタ・設定生成・UI のテスト                  |
| `npm run validate:data`           | データだけを検証（出典・日付・参照整合性）                 |
| `npm run build:data`              | 検証済みデータを `src/generated/dataset.json` に書き出す   |
| `npm run lint` / `npm run format` | ESLint / Prettier                                          |
| `npm run verify:models`           | API キーがある場合のみ、接続とツール呼び出しを検証（下記） |

`npm run check` は lint・データ生成・テスト・ビルドをまとめて実行します。

### ディレクトリ

```
data/
  providers/<provider-id>.json   # プロバイダー 1 件 = ファイル 1 件
  changelog.json                 # 変更履歴
  watch-sources.json             # 変更検知の監視対象
docs/SPEC.md                     # 仕様書
scripts/
  assemble-data.ts               # data/ を 1 つに集約
  build-data.ts                  # 検証して src/generated/ に書き出す
  validate-data.ts               # 検証のみ
  verify-models.ts               # 実機検証（キーがある場合のみ）
  watch-changes.ts               # 変更検知
src/
  lib/schema.ts                  # Zod スキーマ（型の唯一の定義）
  lib/validate.ts                # スキーマ + 意味の検証
  lib/filters.ts                 # 検索・絞り込み・URL 同期
  lib/opencode-config.ts         # opencode.json の生成
  pages/                         # 画面
```

## デプロイ

`main` に push すると GitHub Actions が次を実行し、すべて成功したときだけ GitHub Pages へ公開します。

1. `npm run lint`
2. `npm run build:data`（データ検証を含む）
3. `npm test`
4. `npm run build`
5. `dist/` を GitHub Pages にアップロード

データが不正な場合やテストが失敗した場合は公開しません。
Actions の権限は `contents: read` / `pages: write` / `id-token: write` のみで、`main` への push と手動実行だけを契機にします。
`pull_request` ではビルドとテストだけを実行し、公開は行いません。

### base path

GitHub Pages のプロジェクトページ（`/<repo>/`）で配信するため、本番ビルドの base は `/free-model-radar/` です。
別のパスや独自ドメインで配信する場合は、ビルド時に `BASE_PATH` を指定します。

```bash
BASE_PATH=/ npm run build
```

ルーティングは `BrowserRouter` で、`basename` に Vite の `BASE_URL` を渡しています。
GitHub Pages は存在しないパスに 404 を返すため、`index.html` をコピーした `404.html` を出力し、直リンクでも一覧に戻れるようにしています。

## データの追加・修正

`data/providers/<id>.json` を追加または編集し、`npm run validate:data` が通ることを確認してください。
出典 URL・確認日・無料枠の条件がないデータは CI で拒否されます。

検証している内容の例:

- プロバイダー ID・モデル ID の一意性
- 存在しないプロバイダーへの参照
- 出典のない確定的な条件
- 未来の確認日
- 「恒久無料」と「終了」が同時に立つ矛盾
- 検証成功なのに検証日時がない記録
- 同じ単位・適用範囲のレート制限の重複

詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

## 実機検証

`verify-models.ts` は環境変数にキーがある場合だけ実行し、**費用が発生する検証は行いません**。
キーがない場合はスキップして「未実施」のままにします。

```bash
# 例: Groq のモデルで接続とツール呼び出しを確認する
GROQ_API_KEY=... npm run verify:models -- --provider groq
```

利用者の API キーをサイトが預かることはありません。サイト上にキーの入力欄もありません。

## 情報の鮮度と免責

- 掲載内容は、各項目の **確認日時点** で公式ドキュメントに書かれていた内容です。
- 最終確認から 45 日を超えた項目には「再確認の時期」、90 日を超えた項目には「情報が古い可能性」を表示します。
- プロバイダーは予告なく条件を変更します。実際に使う前に、必ず各モデルの詳細ページから公式の出典を開いて確認してください。
- 当サイトは情報提供のみを目的とします。各サービスの利用規約に従う責任は利用者にあります。
- 無料枠の範囲を超えた利用や、複数アカウントによる上限の回避を助長するものではありません。

## 関連

- [ai-plan-radar](https://github.com/tonbiattack/ai-plan-radar) — AI サービスの料金プラン比較
- [仕様書](docs/SPEC.md)
