import { describe, expect, it } from "vitest";
import { buildOpencodeConfig, keyEnvVar, providerEnvVars, setupSteps } from "./opencode-config";
import type { Model, Provider } from "./schema";

const baseProvider: Provider = {
  id: "acme",
  name: "Acme",
  website_url: "https://acme.example",
  docs_url: "https://acme.example/docs",
  signup_url: "https://acme.example/keys",
  api_format: "openai-compatible",
  base_url: "https://llm.acme.example/v1",
  native_opencode: "no",
  opencode_provider_id: null,
  authentication: "api-key",
  credit_card_required: "no",
  signup_friction: "instant",
  notes: [],
  sources: [
    {
      field: "API ベース URL",
      value: "https://llm.acme.example/v1",
      source_url: "https://acme.example/docs",
      source_type: "official",
      observed_at: null,
      checked_at: "2026-11-15",
      confidence: "high",
    },
  ],
};

const baseModel: Model = {
  id: "acme-coder",
  provider_id: "acme",
  display_name: "Acme Coder",
  model_id: "acme-coder-v2",
  context_tokens: 128000,
  max_output_tokens: 8192,
  capabilities: {
    tool_calling: "yes",
    streaming: "yes",
    json_mode: "yes",
    reasoning: "no",
  },
  free_tier: {
    type: "permanent",
    availability: "available",
    requirements: [],
    limits: [{ metric: "rpm", value: 30, scope: "model" }],
    quota: { kind: "none", amount: null, period: "none", scope: "model" },
    caveats: [],
    expires_on: null,
  },
  verification: [],
  performance: [],
  caveats: [],
  sources: [
    {
      field: "無料枠",
      value: "30 RPM",
      source_url: "https://acme.example/pricing",
      source_type: "official",
      observed_at: null,
      checked_at: "2026-11-15",
      confidence: "high",
    },
  ],
};

describe("buildOpencodeConfig", () => {
  it("OpenAI 互換プロバイダーでは package と baseURL を出力する", () => {
    const result = buildOpencodeConfig(baseProvider, baseModel);
    expect(result.strategy).toBe("openai-compatible");
    const parsed = JSON.parse(result.json) as {
      $schema: string;
      model: string;
      providers: Record<string, { package: string; settings: { baseURL: string }; env: string[] }>;
    };
    const acme = parsed.providers["acme"];
    expect(parsed.$schema).toBe("https://opencode.ai/config.json");
    expect(parsed.model).toBe("acme/acme-coder");
    expect(acme?.package).toBe("@opencode/ai/providers/openai-compatible");
    expect(acme?.settings.baseURL).toBe("https://llm.acme.example/v1");
    expect(acme?.env).toEqual(["ACME_API_KEY"]);
  });

  it("ネイティブ対応プロバイダーではカタログのモデル追加に留める", () => {
    const provider: Provider = {
      ...baseProvider,
      id: "groq",
      name: "Groq",
      native_opencode: "yes",
      opencode_provider_id: "groq",
      base_url: null,
    };
    const result = buildOpencodeConfig(provider, { ...baseModel, provider_id: "groq" });
    expect(result.strategy).toBe("native");
    const parsed = JSON.parse(result.json) as {
      model: string;
      providers: Record<string, { package?: string; models: Record<string, { modelID: string }> }>;
    };
    expect(parsed.model).toBe("groq/acme-coder");
    const groq = parsed.providers["groq"];
    expect(groq?.package).toBeUndefined();
    expect(groq?.models["acme-coder"]?.modelID).toBe("acme-coder-v2");
  });

  it("base URL が不明なら設定を生成せず、理由を返す", () => {
    const result = buildOpencodeConfig({ ...baseProvider, base_url: null }, baseModel);
    expect(result.strategy).toBe("unsupported");
    expect(result.json).toBe("");
    expect(result.blockers.join()).toContain("ベース URL");
  });

  it("OpenAI 互換でない形式は接続できないと明示する", () => {
    const result = buildOpencodeConfig({ ...baseProvider, api_format: "mistral" }, baseModel);
    expect(result.strategy).toBe("unsupported");
    expect(result.blockers.join()).toContain("OpenAI 互換ではありません");
  });

  it("baseURL のプレースホルダを黙って埋めない", () => {
    const provider: Provider = {
      ...baseProvider,
      id: "cloudflare-workers-ai",
      base_url: "https://api.example.com/accounts/{account_id}/ai/v1",
    };
    const result = buildOpencodeConfig(provider, baseModel);
    expect(result.strategy).toBe("openai-compatible");
    expect(result.blockers.join()).toContain("{account_id}");
  });

  it("生成物に API キーらしき値が含まれない", () => {
    const result = buildOpencodeConfig(baseProvider, baseModel);
    expect(result.json).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
    expect(result.json).not.toContain("Bearer ");
    // キーは環境変数名としてのみ現れる
    expect(result.json).toContain("ACME_API_KEY");
  });

  it("カタログが複数の環境変数を要求するプロバイダーは、キー以外も出力する", () => {
    const provider: Provider = {
      ...baseProvider,
      id: "cloudflare-workers-ai",
      name: "Cloudflare Workers AI",
      native_opencode: "yes",
      opencode_provider_id: "cloudflare-workers-ai",
      base_url: "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1",
    };
    const result = buildOpencodeConfig(provider, { ...baseModel, provider_id: provider.id });
    const parsed = JSON.parse(result.json) as {
      providers: Record<string, { env: string[] }>;
    };
    expect(parsed.providers["cloudflare-workers-ai"]?.env).toEqual([
      "CLOUDFLARE_ACCOUNT_ID",
      "CLOUDFLARE_API_KEY",
    ]);
    // アカウント固有の URL が必要なことは黙って埋めず、置換を促す
    expect(result.blockers.join()).toContain("プレースホルダ");
  });

  it("セットアップ手順にキー取得 URL が含まれる", () => {
    const steps = setupSteps(baseProvider).join("\n");
    expect(steps).toContain("https://acme.example/keys");
    expect(steps).toContain("ACME_API_KEY");
  });

  it("キー名と設定に並べる変数名が矛盾しない", () => {
    for (const id of ["google", "groq", "openrouter", "cerebras", "cloudflare-workers-ai"]) {
      const provider: Provider = { ...baseProvider, id };
      const vars = providerEnvVars(provider);
      expect(vars).toContain(keyEnvVar(provider));
    }
  });
});
