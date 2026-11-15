# コントリビューション

無料枠の情報は変化が速いので、修正の提案を歓迎します。
**API キーも有料サービスも不要**で、Pull Request を出せます。

## 貢献できること

| 種類                       | 方法                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------- |
| 情報の誤り・古さの指摘     | [Issue](https://github.com/tonbiattack/free-model-radar/issues/new/choose) を立てる |
| モデルや無料枠の追加・修正 | `data/providers/*.json` を編集して PR                                               |
| 画面・設定生成の改善       | `src/` を編集して PR                                                                |
| 実機検証の結果提供         | 検証条件と結果を Issue に書く（キーは共有しない）                                   |

## データの追加・修正

### 1. ファイルを決める

プロバイダー 1 件につき 1 ファイルです。既存のプロバイダーなら、そのファイルにモデルを足します。

```
data/providers/google.json
data/providers/groq.json
data/providers/openrouter.json
data/providers/cloudflare-workers-ai.json
data/providers/cerebras.json
data/providers/github-models.json
```

新しいプロバイダーは `data/providers/<provider-id>.json` を追加してください。
`id` は小文字英数字とハイフンのみです。名前を変えても ID は変えないでください（URL が壊れます）。

### 2. 必須の項目

**確定情報には、必ず出典と確認日を付けてください。**

```json
{
  "field": "無料枠のレート制限",
  "value": "openai/gpt-oss-120b: RPM 30 / RPD 1K / TPM 8K / TPD 200K",
  "source_url": "https://console.groq.com/docs/rate-limits",
  "source_type": "official",
  "observed_at": null,
  "checked_at": "2026-11-15",
  "confidence": "high"
}
```

- `source_url` … 公式ドキュメントか料金ページ。コミュニティ投稿だけの場合は `source_type` を `community` にして、確定値にしないでください。
- `checked_at` … 出典を開いて確認した日（今日）。
- `observed_at` … ページ側に更新日があればその日。分からなければ `null`。
- `confidence` … `high` / `medium` / `low`。

### 3. 数値は単位と適用範囲をセットで

同じ「30」でも、モデル単位かアカウント単位かで意味が変わります。

```json
{ "metric": "rpm", "value": 30, "scope": "model" }
{ "metric": "rpd", "value": 50, "scope": "account", "note": "無料モデル全体で共有" }
```

- `metric` … `rpm` / `rph` / `rpd` / `tpm` / `tph` / `tpd` / `itpm` / `otpm` / `concurrency` / `rpm-month`
- `scope` … `provider` / `account` / `project` / `model` / `key` / `unknown`

**公式に数値の記載がない場合は、`limits` を空配列にしてください。**
`0` を入れると「まったく呼べない」と読めてしまいます。0 が正しい場合だけ `note` で説明してください。

### 4. 不明は不明のまま

機能（ツール呼び出し・ストリーミング・JSON モード・推論）は 3 値です。

| 値          | 意味                                   |
| ----------- | -------------------------------------- |
| `"yes"`     | 公式ドキュメントに対応の記載がある     |
| `"no"`      | 公式ドキュメントに非対応と書かれている |
| `"unknown"` | 記載が見つからない（非対応ではない）   |

`"unknown"` は「調べていない」であって「できない」ではありません。
分からない項目を `"no"` にしないでください。

### 5. 無料枠の種別

| 種別          | 使いどころ                                   |
| ------------- | -------------------------------------------- |
| `permanent`   | 公式に継続的な無料利用が案内されている       |
| `trial`       | 期間が区切られた試用。`expires_on` を入れる  |
| `credit`      | 初回付与のクレジット。`quota` で金額を入れる |
| `conditional` | 支払い方法の登録など、条件を満たすと使える   |
| `ended`       | 提供終了。`availability` も `ended` にする   |
| `unknown`     | 種別を確認できていない                       |

### 6. 終了したサービス

`availability` を `ended`、`type` を `ended` にしてください。
一覧からは既定で隠れ、詳細ページでは設定例を生成しません。
過去の情報は消さずに残してください。出典が消えても履歴として意味があります。

## ローカルで確認する

```bash
npm ci
npm run validate:data   # 出典・日付・参照整合性の検証
npm test                # スキーマ・フィルタ・設定生成・UI
npm run dev             # 画面で確認
```

データを編集したら、生成物も更新してください。

```bash
npm run build:data
```

`src/generated/dataset.json` の差分もコミットしてください。CI は「生成し直して差分が出ないこと」も確認します。

## CI で弾かれるもの

- プロバイダー ID・モデル ID の重複
- 存在しないプロバイダーへの参照
- 出典のない確定的な条件
- 未来の確認日
- 「恒久無料」と「終了」が同時に立つ矛盾
- 検証成功なのに検証日時がない記録
- 同じ単位・適用範囲のレート制限の重複
- 監視対象が存在しないプロバイダーを参照している

## レビューの流れ

1. Issue で出典と確認日を共有する（PR を直接出しても構いません）
2. CI がデータ構造・テスト・ビルドを検証する
3. メンテナが次の点を確認する
   - 出典 URL が公式か
   - 確認日が妥当か
   - 「不明」を「非対応」と書いていないか
   - 恒久無料とトライアルを取り違えていないか
4. マージ後、`main` の CI が通ると GitHub Pages に反映される

## 書かないでほしいもの

- API キー、トークン、認証情報（Issue・PR・スクリーンショットすべて）
- 個人情報、アカウント名、メールアドレス
- 利用規約に反する取得方法の手順（自動登録、上限回避のための複数アカウント作成など）
- 確認していない推測値

## 行動規範

- 情報の正確さを、速さより優先してください。
- プロバイダーの利用規約と `robots.txt` を尊重してください。
- 間違いを見つけたら、相手ではなく情報を直してください。
