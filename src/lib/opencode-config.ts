import type { Dataset, Model, Provider } from "./schema";

/**
 * OpenCode V2 の設定は `providers` オブジェクトで宣言する。
 * ネイティブ対応プロバイダーは providers への追記だけで済ませ、
 * カスタム / OpenAI 互換は package と baseURL を明示する。
 *
 * 参考: https://opencode.ai/docs/providers
 */

export type ConfigStrategy = "native" | "openai-compatible" | "unsupported";

export interface ConfigResult {
  strategy: ConfigStrategy;
  /** 生成した JSON 文字列。unsupported のときは空文字。 */
  json: string;
  /** 表示用の不足情報（base URL 不明など）。 */
  blockers: string[];
  /** 補足説明。 */
  notes: string[];
}

const OPENAI_COMPATIBLE_PACKAGE = "@opencode/ai/providers/openai-compatible";

/** プロバイダー ID は OpenCode の設定キーにそのまま使う。 */
function providerKey(provider: Provider): string {
  return provider.opencode_provider_id ?? provider.id;
}

/**
 * OpenCode のカタログ（models.dev）が各プロバイダーで参照する環境変数。
 * ここに無いプロバイダーは、キーの名前を推測せず env を出力しない。
 * 参照: https://models.dev/api.json
 */
const catalogEnv: Record<string, string[]> = {
  google: ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "GEMINI_API_KEY"],
  groq: ["GROQ_API_KEY"],
  openrouter: ["OPENROUTER_API_KEY"],
  cerebras: ["CEREBRAS_API_KEY"],
  "cloudflare-workers-ai": ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_KEY"],
};

/** ターミナルで案内する環境変数名。実キーは決して生成物に含めない。 */
export function keyEnvVar(provider: Provider): string {
  const known = catalogEnv[provider.id];
  if (known) {
    // アカウント ID など、キー以外の必須変数を除いた「キー本体」の名前を返す
    return (
      known.find((name) => name.endsWith("_API_KEY")) ?? known.at(-1) ?? fallbackEnvVar(provider)
    );
  }
  return fallbackEnvVar(provider);
}

function fallbackEnvVar(provider: Provider): string {
  return `${provider.id.replace(/-/g, "_").toUpperCase()}_API_KEY`;
}

/** 設定に並べる環境変数の一覧。カタログ既知のものは全件、未知はキー名のみ。 */
export function providerEnvVars(provider: Provider): string[] {
  return catalogEnv[provider.id] ?? [fallbackEnvVar(provider)];
}

/**
 * baseURL に含まれる {account_id} のようなプレースホルダは、
 * 値を推測して埋めずに「要置換」として明示する。
 */
function normalizeBaseUrl(baseUrl: string): { url: string; placeholders: string[] } {
  const placeholders = [...baseUrl.matchAll(/\{([a-z_]+)\}/gi)].map((match) => match[1] ?? "");
  return { url: baseUrl, placeholders };
}

export function buildOpencodeConfig(
  provider: Provider,
  model: Model,
  _dataset?: Dataset,
): ConfigResult {
  const notes: string[] = [];
  const blockers: string[] = [];

  if (provider.native_opencode === "yes") {
    const providerBlock: Record<string, unknown> = {
      name: provider.name,
      // カタログ既定の環境変数と異なる場合に備え、キーの「名前」だけ明示する。
      // 値は決して出力しない。
      env: providerEnvVars(provider),
      models: {
        [model.id]: {
          name: model.display_name,
          modelID: model.model_id,
        },
      },
    };

    // Cloudflare のようにアカウント固有の URL が必要な場合、
    // カタログのままでは接続できない。baseURL の上書きが要ることを明示する。
    if (provider.base_url && /\{[a-z_]+\}/i.test(provider.base_url)) {
      providerBlock.settings = { baseURL: provider.base_url };
      blockers.push(
        "OpenCode のカタログ設定だけでは接続できません。API ベース URL にアカウント固有の値が必要なため、settings.baseURL のプレースホルダを自分の値に置き換えてください。",
      );
    }

    // ネイティブ対応でも、カタログに存在しないモデルは models へ追加する。
    // 注意: env はカタログ既定を上書きしない場合があるため、指定があれば残す。
    const config = {
      $schema: "https://opencode.ai/config.json",
      model: `${providerKey(provider)}/${model.id}`,
      providers: {
        [providerKey(provider)]: providerBlock,
      },
    };

    notes.push(
      `OpenCode は ${provider.name} をカタログでネイティブ対応しています。認証は \`/connect\` から ${provider.name} を選び、API キーを入力するのが最短です。`,
    );
    notes.push(
      "上記の設定は、カタログに未登録のモデルを追加する場合の例です。すでにモデル一覧に出ているなら、この設定は不要です。",
    );

    return { strategy: "native", json: JSON.stringify(config, null, 2), blockers, notes };
  }

  if (!provider.base_url) {
    blockers.push(
      `${provider.name} は OpenCode のネイティブカタログになく、API ベース URL も公式情報で確認できていません。URL が判明するまで設定例を生成できません。`,
    );
    return { strategy: "unsupported", json: "", blockers, notes };
  }

  if (provider.api_format !== "openai-compatible") {
    blockers.push(
      `${provider.name} の API 形式は「${provider.api_format}」で、OpenAI 互換ではありません。OpenAI 互換ランタイムでは接続できません。`,
    );
    return { strategy: "unsupported", json: "", blockers, notes };
  }

  const { url, placeholders } = normalizeBaseUrl(provider.base_url);
  if (placeholders.length > 0) {
    blockers.push(
      `API ベース URL にプレースホルダ（${placeholders.map((p) => `{${p}}`).join(", ")}）が含まれます。自分の値に置き換えてください。`,
    );
  }

  const config = {
    $schema: "https://opencode.ai/config.json",
    model: `${provider.id}/${model.id}`,
    providers: {
      [provider.id]: {
        name: provider.name,
        env: [keyEnvVar(provider)],
        package: OPENAI_COMPATIBLE_PACKAGE,
        settings: {
          baseURL: url,
        },
        models: {
          [model.id]: { name: model.display_name, modelID: model.model_id },
        },
      },
    },
  };

  notes.push(
    `OpenAI 互換 API として接続します。ターミナルで環境変数 ${keyEnvVar(provider)} に API キーを設定してから OpenCode を起動してください。`,
  );
  notes.push(
    "設定に API キーそのものは書きません。OpenCode は env に並べた環境変数からキーを読みます。",
  );
  if (provider.id === "cloudflare-workers-ai") {
    notes.push(
      "Cloudflare はアカウント ID も必要です。baseURL の {account_id} を自分の値に置き換えるか、文字列連結で埋め込まない方法を使ってください。",
    );
  }

  return { strategy: "openai-compatible", json: JSON.stringify(config, null, 2), blockers, notes };
}

/** 設定の入手手順をプロバイダーごとに返す。 */
export function setupSteps(provider: Provider): string[] {
  const steps: string[] = [];
  steps.push(`1. ${provider.signup_url} で API キーを取得する`);

  if (provider.authentication === "google-account") {
    steps.push("2. Google アカウントでサインインし、Google AI Studio でキーを発行する");
    steps.push("3. ターミナルで環境変数を設定する: export GEMINI_API_KEY=...");
  } else if (provider.authentication === "github-account") {
    steps.push("2. GitHub アカウントでサインインする");
  } else {
    steps.push(`2. ターミナルで環境変数を設定する: ${keyEnvVar(provider)}=...`);
  }

  if (provider.native_opencode === "yes") {
    steps.push("4. OpenCode で /connect を実行し、プロバイダーを選択してキーを貼り付ける");
    steps.push("5. /models で対象モデルを選ぶ");
  } else {
    steps.push("4. この設定例を opencode.json に保存する");
    steps.push("5. OpenCode を起動し、/models で対象モデルを選ぶ");
  }

  return steps;
}
