import type { Availability, FreeTierType, LimitMetric, LimitScope, Tristate } from "./schema";

export const freeTierTypeLabel: Record<FreeTierType, string> = {
  permanent: "恒久無料",
  trial: "期間限定トライアル",
  credit: "初回クレジット",
  conditional: "条件付き",
  ended: "終了・停止",
  unknown: "不明",
};

export const freeTierTypeDescription: Record<FreeTierType, string> = {
  permanent: "公式に継続的な無料利用が案内されている枠。",
  trial: "期間が区切られた試用枠。終了後は有料になる。",
  credit: "初回付与のクレジットを消費する枠。残額が尽きると停止する。",
  conditional: "支払い方法の登録など、条件を満たすと使える枠。",
  ended: "提供が終了しているか、新規利用を停止している。",
  unknown: "無料枠の有無や種別を公式情報で確認できていない。",
};

export const availabilityLabel: Record<Availability, string> = {
  available: "利用可",
  restricted: "条件付きで利用可",
  ended: "終了",
  unknown: "未確認",
};

/** 3値を「はい/いいえ/不明」と出し分ける。不明を「非対応」と書かないための境界。 */
export const tristateLabel: Record<Tristate, string> = {
  yes: "対応",
  no: "非対応",
  unknown: "不明",
};

export const tristateShort: Record<Tristate, string> = {
  yes: "可",
  no: "不可",
  unknown: "?",
};

export const limitMetricLabel: Record<LimitMetric, string> = {
  rpm: "RPM",
  rph: "RPH",
  rpd: "RPD",
  "rpm-month": "回/月",
  tpm: "TPM",
  tph: "TPH",
  tpd: "TPD",
  itpm: "入力TPM",
  otpm: "出力TPM",
  concurrency: "同時接続",
};

export const limitMetricLong: Record<LimitMetric, string> = {
  rpm: "1分あたりのリクエスト数",
  rph: "1時間あたりのリクエスト数",
  rpd: "1日あたりのリクエスト数",
  "rpm-month": "1ヶ月あたりのリクエスト数",
  tpm: "1分あたりのトークン数",
  tph: "1時間あたりのトークン数",
  tpd: "1日あたりのトークン数",
  itpm: "1分あたりの入力トークン数",
  otpm: "1分あたりの出力トークン数",
  concurrency: "同時実行数",
};

export const limitScopeLabel: Record<LimitScope, string> = {
  provider: "プロバイダー全体",
  account: "アカウント単位",
  project: "プロジェクト単位",
  model: "モデル単位",
  key: "APIキー単位",
  unknown: "適用範囲不明",
};

export const verificationStatusLabel = {
  passed: "成功",
  failed: "失敗",
  untested: "未実施",
  unknown: "不明",
} as const;

export const verificationMethodLabel = {
  connection: "接続",
  streaming: "ストリーミング",
  "tool-calling": "ツール呼び出し",
  "json-mode": "JSON モード",
  "agent-task": "短い編集タスク",
} as const;

export const apiFormatLabel = {
  "openai-compatible": "OpenAI 互換",
  "google-generative": "Google Generative AI",
  anthropic: "Anthropic",
  mistral: "Mistral",
  native: "独自 API",
  unknown: "不明",
} as const;

/** キー取得までの手間。「登録すれば使える」かどうかを一覧で判断できるようにする。 */
export const signupFrictionLabel = {
  instant: "登録だけ",
  discord: "Discord 参加",
  waitlist: "順番待ち",
  paid: "カード登録",
  unknown: "不明",
} as const;

export const signupFrictionDescription = {
  instant: "アカウントを作ると API キーがすぐ発行される。",
  discord: "提供元の Discord サーバーへの参加が条件。退会するとアクセスが止まる。",
  waitlist: "順番待ちや承認待ちがある。",
  paid: "支払い方法の登録が必須。無料枠を使うにもカード情報が要る。",
  unknown: "キー取得までの手順を確認できていない。",
} as const;

export const authLabel = {
  "api-key": "API キー",
  "google-account": "Google アカウント",
  "github-account": "GitHub アカウント",
  none: "認証不要",
  unknown: "不明",
} as const;
