import { z } from "zod";

/**
 * このサービスの中核となる制約:
 * - 「不明」を false や 0 に潰さない。数値は null、機能は unknown。
 * - 確定情報には必ず出典と確認日を持たせる。
 * - 無料枠の「種別」と「現在利用できるか」を分けて持つ。
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定してください");

const isoDateTime = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/,
    "ISO 8601 の日時で指定してください",
  );

/** 3値。unknown は「未確認」であり、no（非対応）ではない。 */
export const tristateSchema = z.enum(["yes", "no", "unknown"]);
export type Tristate = z.infer<typeof tristateSchema>;

/** 無料枠の種別。恒久無料とトライアルを混同しないための軸。 */
export const freeTierTypeSchema = z.enum([
  "permanent", // 恒久無料
  "trial", // 期間限定トライアル
  "credit", // 初回クレジット
  "conditional", // 条件付き（支払い方法登録など）
  "ended", // 終了・停止
  "unknown",
]);
export type FreeTierType = z.infer<typeof freeTierTypeSchema>;

/** 現在その無料枠で API を呼べるか。種別とは独立。 */
export const availabilitySchema = z.enum(["available", "restricted", "ended", "unknown"]);
export type Availability = z.infer<typeof availabilitySchema>;

export const apiFormatSchema = z.enum([
  "openai-compatible",
  "google-generative",
  "anthropic",
  "mistral",
  "native",
  "unknown",
]);
export type ApiFormat = z.infer<typeof apiFormatSchema>;

export const authSchema = z.enum([
  "api-key",
  "google-account",
  "github-account",
  "none",
  "unknown",
]);
export type Auth = z.infer<typeof authSchema>;

/**
 * API キーを手に入れるまでの手間。「登録すれば使える」かどうかを
 * 利用者が判断できるようにするための軸で、無料枠の種別とは独立。
 */
export const signupFrictionSchema = z.enum([
  "instant", // アカウント作成だけでキーが即時発行される
  "discord", // Discord サーバーへの参加が条件
  "waitlist", // 順番待ち・承認待ちがある
  "paid", // 支払い方法の登録が必須
  "unknown",
]);
export type SignupFriction = z.infer<typeof signupFrictionSchema>;

/** 制限が何に対して掛かるか。プロバイダー/アカウント/モデルが混在するため必須。 */
export const limitScopeSchema = z.enum([
  "provider",
  "account",
  "project",
  "model",
  "key",
  "unknown",
]);
export type LimitScope = z.infer<typeof limitScopeSchema>;

export const limitMetricSchema = z.enum([
  "rpm", // requests per minute
  "rph", // requests per hour
  "rpd", // requests per day
  "rpm-month", // requests per month
  "tpm", // tokens per minute
  "tph", // tokens per hour
  "tpd", // tokens per day
  "itpm", // input tokens per minute
  "otpm", // output tokens per minute
  "concurrency",
]);
export type LimitMetric = z.infer<typeof limitMetricSchema>;

export const limitEntrySchema = z.object({
  metric: limitMetricSchema,
  /** 0 は「0 に制限」であり null(不明) とは違う。 */
  value: z.number().nonnegative(),
  scope: limitScopeSchema,
  /** 「入力トークンのみ」「キャッシュ未ヒット分」など、値の意味を補う。 */
  note: z.string().min(1).optional(),
});
export type LimitEntry = z.infer<typeof limitEntrySchema>;

/** RPM/RPD などでは表せない総量枠（クレジット、Neurons、リクエスト数など）。 */
export const quotaSchema = z.object({
  kind: z.enum(["credits", "currency", "neurons", "requests", "tokens", "none", "unknown"]),
  /** 不明なら null。 */
  amount: z.number().nonnegative().nullable(),
  currency: z.string().min(1).optional(),
  period: z.enum(["day", "month", "one-time", "none", "unknown"]),
  scope: limitScopeSchema,
  note: z.string().min(1).optional(),
});
export type Quota = z.infer<typeof quotaSchema>;

export const freeTierSchema = z.object({
  type: freeTierTypeSchema,
  availability: availabilitySchema,
  /** カード登録など、無料枠を使うための前提。空配列は「前提なし（公式に記載なし）」。 */
  requirements: z.array(z.string().min(1)),
  /** 数値制限。空配列は「公式に数値の記載がない」。 */
  limits: z.array(limitEntrySchema),
  quota: quotaSchema,
  /** 無料枠の継続条件・終了条件・注意点。 */
  caveats: z.array(z.string().min(1)),
  /** トライアルやクレジットの期限。 */
  expires_on: isoDate.nullable(),
});
export type FreeTier = z.infer<typeof freeTierSchema>;

/** 出典。公式・コミュニティ・実機検証を区別する。 */
export const evidenceSchema = z.object({
  /** 何の根拠か（例: "無料枠のレート制限", "ツール呼び出し対応"）。 */
  field: z.string().min(1),
  value: z.string().min(1),
  source_url: z.string().url(),
  source_type: z.enum(["official", "community", "test"]),
  /** 元情報がその状態だった日（ページの更新日など）。 */
  observed_at: isoDate.nullable(),
  /** このサイトが最後に確認した日。 */
  checked_at: isoDate,
  confidence: z.enum(["high", "medium", "low"]),
});
export type Evidence = z.infer<typeof evidenceSchema>;

export const verificationSchema = z.object({
  method: z.enum([
    "connection", // 疎通
    "streaming",
    "tool-calling",
    "json-mode",
    "agent-task", // OpenCode 経由の短い編集タスク
  ]),
  status: z.enum(["passed", "failed", "untested", "unknown"]),
  tested_at: isoDateTime.nullable(),
  opencode_version: z.string().min(1).nullable(),
  notes: z.string().min(1).nullable(),
});
export type Verification = z.infer<typeof verificationSchema>;

/**
 * 性能の参照先。このサイトでは性能を自前評価せず、
 * 出典のある比較ページへリンクする。
 */
export const performanceRefSchema = z.object({
  /** 例: "SWE-bench Verified", "Aider Polyglot" */
  benchmark: z.string().min(1),
  url: z.string().url(),
  /** リンク先でこのモデルが何と呼ばれているか。表記が違う場合に使う。 */
  as: z.string().min(1).nullable(),
  note: z.string().min(1).nullable(),
});
export type PerformanceRef = z.infer<typeof performanceRefSchema>;

export const providerSchema = z.object({
  /** URL に使う安定 ID。名前変更で変えない。 */
  id: z
    .string()
    .min(2)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "小文字英数字とハイフンのみ使用できます"),
  name: z.string().min(1),
  website_url: z.string().url(),
  docs_url: z.string().url(),
  signup_url: z.string().url(),
  api_format: apiFormatSchema,
  /** 公開可能な API ベース URL。不明なら null（推測で埋めない）。 */
  base_url: z.string().url().nullable(),
  /** OpenCode がカタログとしてネイティブ対応しているか。 */
  native_opencode: tristateSchema,
  /** OpenCode のカタログ上のプロバイダー ID（native のとき）。 */
  opencode_provider_id: z.string().min(1).nullable(),
  authentication: authSchema,
  credit_card_required: tristateSchema,
  /** キー取得までの手間。登録すれば使えるかを判断するために使う。 */
  signup_friction: signupFrictionSchema,
  notes: z.array(z.string().min(1)),
  sources: z.array(evidenceSchema),
});
export type Provider = z.infer<typeof providerSchema>;

export const modelSchema = z.object({
  id: z
    .string()
    .min(2)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "小文字英数字とハイフンのみ使用できます"),
  provider_id: z.string().min(1),
  display_name: z.string().min(1),
  /** API に渡すモデル ID。 */
  model_id: z.string().min(1),
  /** 公式記載のコンテキスト長。不明なら null。 */
  context_tokens: z.number().int().positive().nullable(),
  max_output_tokens: z.number().int().positive().nullable(),
  capabilities: z.object({
    tool_calling: tristateSchema,
    streaming: tristateSchema,
    json_mode: tristateSchema,
    reasoning: tristateSchema,
  }),
  free_tier: freeTierSchema,
  /** 公式記載と実機検証を分離して持つ。 */
  verification: z.array(verificationSchema),
  /** 性能は自前評価せず、出典つきの比較ページへリンクする。 */
  performance: z.array(performanceRefSchema),
  /** エージェント用途の注意点（長文で崩れる、など）。 */
  caveats: z.array(z.string().min(1)),
  sources: z.array(evidenceSchema),
});
export type Model = z.infer<typeof modelSchema>;

export const changeLogSchema = z.object({
  entity_id: z.string().min(1),
  entity_type: z.enum(["provider", "model", "free-tier"]),
  field: z.string().min(1),
  previous: z.string().nullable(),
  current: z.string().nullable(),
  /** 変更を検出した日時（自動検知）。 */
  detected_at: isoDateTime,
  /** 実際に効力が発生した日時。不明なら null。 */
  effective_at: isoDateTime.nullable(),
  evidence_url: z.string().url().nullable(),
  review_status: z.enum(["pending", "confirmed", "rejected", "auto-applied"]),
  summary: z.string().min(1),
});
export type ChangeLogEntry = z.infer<typeof changeLogSchema>;

/** 監視対象。変更検知の設定もデータとして持つ。 */
export const watchSourceSchema = z.object({
  provider_id: z.string().min(1),
  /** 何を見るか。 */
  label: z.string().min(1),
  url: z.string().url(),
  /** 差分を取りたい対象の種類。 */
  target: z.enum(["pricing", "rate-limits", "models", "changelog", "status"]),
  /** 取得失敗が何回続いたら「要確認」にするか。 */
  failure_threshold: z.number().int().positive().default(3),
});
export type WatchSource = z.infer<typeof watchSourceSchema>;

export const datasetSchema = z.object({
  meta: z.object({
    last_updated: isoDate,
    spec_version: z.string().min(1),
  }),
  providers: z.array(providerSchema),
  models: z.array(modelSchema),
  changelog: z.array(changeLogSchema),
  watch_sources: z.array(watchSourceSchema),
});
export type Dataset = z.infer<typeof datasetSchema>;

export type ProviderInput = z.input<typeof providerSchema>;
export type ModelInput = z.input<typeof modelSchema>;
