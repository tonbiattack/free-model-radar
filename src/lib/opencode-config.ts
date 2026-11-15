import type { Dataset, Model, Provider } from "./schema";

/**
 * OpenCode V2 の設定は `providers` オブジェクトで宣言する。
 * ネイティブ対応プロバイダーは providers への追記だけで済ませ、
 * カスタム / OpenAI 互換は package と baseURL を明示する。
 *
 * 参考: https://opencode.ai/docs/providers
 */

export type ConfigStrategy = "native" | "openai-compatible" | "unsupported";
export type ConfigLocale = "en" | "ja";

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
  "opencode-zen": ["OPENCODE_API_KEY"],
};

/** プロバイダー ID は OpenCode の設定キーにそのまま使う。 */
function providerKey(provider: Provider): string {
  return provider.opencode_provider_id ?? provider.id;
}

/** ターミナルで案内する環境変数名。実キーは決して生成物に含めない。 */
export function keyEnvVar(provider: Provider): string {
  const known = catalogEnv[provider.id];
  if (known) {
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

/** 文言は UI の言語に合わせる。生成物（JSON）自体は言語に依存しない。 */
const text = {
  en: {
    nativeNote: (name: string) =>
      `OpenCode supports ${name} natively in its catalog. The quickest route is to run \`/connect\`, choose ${name}, and paste your API key.`,
    nativeCatalogNote:
      "The configuration above is an example for adding a model that is not in the catalog. If the model already appears in /models, you do not need it.",
    zenCredits:
      "Free models work without adding Console credits. Run /connect, choose OpenCode, and the free models appear in /models.",
    zenHide: "To hide free models, set OPENCODE_DISABLE_FREE_MODELS=1 on the server process.",
    baseUrlUnknown: (name: string) =>
      `${name} is not in OpenCode's native catalog and no API base URL could be confirmed from official sources. A configuration example cannot be generated until the URL is known.`,
    notOpenAiCompatible: (name: string, format: string) =>
      `${name} uses the "${format}" API format, which is not OpenAI-compatible. The OpenAI-compatible runtime cannot connect to it.`,
    placeholder: (list: string) =>
      `The API base URL contains placeholders (${list}). Replace them with your own values.`,
    nativeNeedsBaseUrl:
      "The catalog configuration alone will not connect. The API base URL needs an account-specific value, so replace the placeholder in settings.baseURL.",
    compatibleNote: (name: string, env: string) =>
      `${name} connects as an OpenAI-compatible API. Set the environment variable ${env} to your API key before starting OpenCode.`,
    noKeyInConfig:
      "The configuration does not contain the API key itself. OpenCode reads it from the environment variables listed in env.",
    cloudflareAccount:
      "Cloudflare also needs an account ID. Replace {account_id} in baseURL with your own value.",
  },
  ja: {
    nativeNote: (name: string) =>
      `OpenCode は ${name} をカタログでネイティブ対応しています。認証は \`/connect\` から ${name} を選び、API キーを入力するのが最短です。`,
    nativeCatalogNote:
      "上記の設定は、カタログに未登録のモデルを追加する場合の例です。すでにモデル一覧に出ているなら、この設定は不要です。",
    zenCredits:
      "無料モデルは Console のクレジットを追加しなくても使えます。/connect で OpenCode を選ぶと、/models に無料モデルが並びます。",
    zenHide:
      "無料モデルが不要な場合は、サーバーの環境変数に OPENCODE_DISABLE_FREE_MODELS=1 を設定すると一覧から消えます。",
    baseUrlUnknown: (name: string) =>
      `${name} は OpenCode のネイティブカタログになく、API ベース URL も公式情報で確認できていません。URL が判明するまで設定例を生成できません。`,
    notOpenAiCompatible: (name: string, format: string) =>
      `${name} の API 形式は「${format}」で、OpenAI 互換ではありません。OpenAI 互換ランタイムでは接続できません。`,
    placeholder: (list: string) =>
      `API ベース URL にプレースホルダ（${list}）が含まれます。自分の値に置き換えてください。`,
    nativeNeedsBaseUrl:
      "OpenCode のカタログ設定だけでは接続できません。API ベース URL にアカウント固有の値が必要なため、settings.baseURL のプレースホルダを自分の値に置き換えてください。",
    compatibleNote: (name: string, env: string) =>
      `${name} は OpenAI 互換 API として接続します。ターミナルで環境変数 ${env} に API キーを設定してから OpenCode を起動してください。`,
    noKeyInConfig:
      "設定に API キーそのものは書きません。OpenCode は env に並べた環境変数からキーを読みます。",
    cloudflareAccount:
      "Cloudflare はアカウント ID も必要です。baseURL の {account_id} を自分の値に置き換えてください。",
  },
} as const;

const apiFormatName: Record<string, string> = {
  "openai-compatible": "OpenAI-compatible",
  "google-generative": "Google Generative AI",
  anthropic: "Anthropic",
  mistral: "Mistral",
  native: "native",
  unknown: "unknown",
};

export function buildOpencodeConfig(
  provider: Provider,
  model: Model,
  options: { locale?: ConfigLocale; dataset?: Dataset } = {},
): ConfigResult {
  const locale = options.locale ?? "en";
  const s = text[locale];
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
      blockers.push(s.nativeNeedsBaseUrl);
    }

    const config = {
      $schema: "https://opencode.ai/config.json",
      model: `${providerKey(provider)}/${model.id}`,
      providers: {
        [providerKey(provider)]: providerBlock,
      },
    };

    notes.push(s.nativeNote(provider.name));
    notes.push(s.nativeCatalogNote);

    if (provider.id === "opencode-zen") {
      notes.push(s.zenCredits);
      notes.push(s.zenHide);
    }

    return { strategy: "native", json: JSON.stringify(config, null, 2), blockers, notes };
  }

  if (!provider.base_url) {
    blockers.push(s.baseUrlUnknown(provider.name));
    return { strategy: "unsupported", json: "", blockers, notes };
  }

  if (provider.api_format !== "openai-compatible") {
    blockers.push(
      s.notOpenAiCompatible(
        provider.name,
        apiFormatName[provider.api_format] ?? provider.api_format,
      ),
    );
    return { strategy: "unsupported", json: "", blockers, notes };
  }

  const { url, placeholders } = normalizeBaseUrl(provider.base_url);
  if (placeholders.length > 0) {
    blockers.push(s.placeholder(placeholders.map((p) => `{${p}}`).join(", ")));
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

  notes.push(s.compatibleNote(provider.name, keyEnvVar(provider)));
  notes.push(s.noKeyInConfig);
  if (provider.id === "cloudflare-workers-ai") {
    notes.push(s.cloudflareAccount);
  }

  return { strategy: "openai-compatible", json: JSON.stringify(config, null, 2), blockers, notes };
}

/** 設定の入手手順を返す。文言は UI の言語に合わせる。 */
export function setupSteps(provider: Provider, locale: ConfigLocale): string[] {
  const ja = locale === "ja";
  const envVar = keyEnvVar(provider);
  const steps: string[] = [];

  steps.push(
    ja
      ? `${provider.signup_url} で API キーを取得する`
      : `Get an API key at ${provider.signup_url}`,
  );

  if (provider.authentication === "google-account") {
    steps.push(
      ja
        ? "Google アカウントでサインインし、Google AI Studio でキーを発行する"
        : "Sign in with a Google account and issue a key in Google AI Studio",
    );
  } else if (provider.authentication === "github-account") {
    steps.push(ja ? "GitHub アカウントでサインインする" : "Sign in with a GitHub account");
  } else {
    steps.push(
      ja
        ? `ターミナルで環境変数を設定する: ${envVar}=...`
        : `Set the environment variable in your terminal: ${envVar}=...`,
    );
  }

  if (provider.native_opencode === "yes") {
    steps.push(
      ja
        ? "OpenCode で /connect を実行し、このプロバイダーを選んでキーを貼り付ける"
        : "Run /connect in OpenCode, choose this provider, and paste the key",
    );
    steps.push(ja ? "/models で対象モデルを選ぶ" : "Pick the model with /models");
  } else {
    steps.push(
      ja
        ? "この設定例を opencode.json に保存する"
        : "Save the configuration example as opencode.json",
    );
    steps.push(
      ja
        ? "OpenCode を起動し、/models で対象モデルを選ぶ"
        : "Start OpenCode and pick the model with /models",
    );
  }

  return steps;
}
