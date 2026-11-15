<div align="center">

<img src="public/favicon.svg" width="96" height="96" alt="Free Model Radar のアイコン">

# Free Model Radar

**課金なしで呼べる LLM API を、エージェントとして使えるかで選ぶ。**

OpenCode などのコーディングエージェント向けに、無料枠つき LLM API の条件・出典・検証状態を
ひとつの表で比較する日本語の静的サイトです。

[![CI](https://github.com/tonbiattack/free-model-radar/actions/workflows/ci.yml/badge.svg)](https://github.com/tonbiattack/free-model-radar/actions/workflows/ci.yml)
[![Watch changes](https://github.com/tonbiattack/free-model-radar/actions/workflows/watch.yml/badge.svg)](https://github.com/tonbiattack/free-model-radar/actions/workflows/watch.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22-5FA04E?logo=nodedotjs&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](tsconfig.json)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](package.json)

[サイトを見る](https://tonbiattack.github.io/free-model-radar/) ·
[調べ方](https://tonbiattack.github.io/free-model-radar/method) ·
[変更履歴](https://tonbiattack.github.io/free-model-radar/changes) ·
[Issues](https://github.com/tonbiattack/free-model-radar/issues)

</div>

> [!NOTE]
> 掲載内容は各項目の**確認日時点**で公式ドキュメントに書かれていた内容です。
> プロバイダーは予告なく条件を変更します。使う前に詳細ページから公式の出典を開いて確認してください。

## なぜ必要か

「無料で呼べるはずのモデルが、実際にはレート制限でエージェントの 1 タスクすら完走できない」。
この失敗は、料金ページだけを見ていると分かりません。

Free Model Radar は **「無料で呼べる」と「エージェントとして使える」を別の情報** として扱います。
RPM / RPD / TPM の適用範囲、ツール呼び出しの有無、API キー取得までの手間、実機検証の状態を並べ、
使う前に落とし穴が見えるようにします。

- **無料枠の種別** — 恒久無料 / 期間限定トライアル / 初回クレジット / 条件付き / 終了 / 不明
- **不明は不明のまま** — 「不明」は「非対応」でも「0」でもありません。0 を入れると「まったく呼べない」と読めてしまいます
- **公式記載と実機検証を分離** — 出典のない確定的な条件はデータ検証で拒否します

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

## はじめ方

Node.js 22 以上と npm が必要です。外部の有料サービスは使いません。

```bash
git clone https://github.com/tonbiattack/free-model-radar.git
cd free-model-radar
npm ci

# データを検証してから開発サーバーを起動する
npm run dev
```

開発サーバーは http://localhost:5173/ で確認できます。
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
| `npm run watch:changes`           | 監視対象の公式ページから変更候補を取得                     |

`npm run check` は lint・データ生成・テスト・ビルドをまとめて実行します。

## データ

すべての掲載情報は [`data/`](data/) 配下の JSON です。生成スクリプトが 1 つに集約し、画面は生成物だけを読みます。

```
data/
  providers/<provider-id>.json   # プロバイダー 1 件 = ファイル 1 件（モデルを含む）
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

現在の収録数: **8 プロバイダー / 26 モデル**（提供元ごとの掲載数、2026-11-15 時点）。
同じモデルを複数の提供元が無料枠で出している場合も、条件が違うため別々に掲載します。
件数は `npm run build:data` の生成結果と一致します。

## コントリビュート

無料枠の情報は変化が速いので、修正の提案を歓迎します。**API キーも有料サービスも不要**で PR を出せます。

`data/providers/<id>.json` を追加または編集し、`npm run validate:data` が通ることを確認してください。
出典 URL・確認日・無料枠の条件がないデータは CI で拒否されます。

CI で弾かれるものの例:

- プロバイダー ID・モデル ID の重複
- 存在しないプロバイダーへの参照
- 出典のない確定的な条件
- 未来の確認日
- 「恒久無料」と「終了」が同時に立つ矛盾
- 検証成功なのに検証日時がない記録
- 同じ単位・適用範囲のレート制限の重複
- `src/generated/dataset.json` が `data/` と一致していない

手順・書き方・レビューの流れは [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。
脆弱性の報告は [SECURITY.md](SECURITY.md) へお願いします。

## 実機検証

`verify-models.ts` は環境変数にキーがある場合だけ実行し、**費用が発生する検証は行いません**。
キーがない場合はスキップして「未実施」のままにします。

```bash
# 例: Groq のモデルで接続とツール呼び出しを確認する
GROQ_API_KEY=... npm run verify:models -- --provider groq
```

利用者の API キーをサイトが預かることはありません。サイト上にキーの入力欄もありません。

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

## 情報の鮮度と免責

- 掲載内容は、各項目の **確認日時点** で公式ドキュメントに書かれていた内容です。
- 最終確認から 45 日を超えた項目には「再確認の時期」、90 日を超えた項目には「情報が古い可能性」を表示します。
- プロバイダーは予告なく条件を変更します。実際に使う前に、必ず各モデルの詳細ページから公式の出典を開いて確認してください。
- 当サイトは情報提供のみを目的とします。各サービスの利用規約に従う責任は利用者にあります。
- 無料枠の範囲を超えた利用や、複数アカウントによる上限の回避を助長するものではありません。

## 関連プロジェクト

- [ai-plan-radar](https://github.com/tonbiattack/ai-plan-radar) — AI サービスの料金プランとモデル性能の比較。本サイトは性能を自前評価せず、こちらへリンクします。
- [仕様書](docs/SPEC.md) — 目的・データモデル・検証ルール

## ライセンス

[MIT License](LICENSE)
