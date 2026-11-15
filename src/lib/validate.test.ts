import { describe, expect, it } from "vitest";
import { validateDataset } from "./validate";
import type { Dataset } from "./schema";

function baseDataset(): Dataset {
  return {
    meta: { last_updated: "2026-11-15", spec_version: "1.0.0" },
    providers: [
      {
        id: "acme",
        name: "Acme",
        website_url: "https://acme.example",
        docs_url: "https://acme.example/docs",
        signup_url: "https://acme.example/keys",
        api_format: "openai-compatible",
        base_url: "https://acme.example/v1",
        native_opencode: "no",
        opencode_provider_id: null,
        authentication: "api-key",
        credit_card_required: "no",
        signup_friction: "instant",
        notes: [],
        sources: [
          {
            field: "無料枠",
            value: "あり",
            source_url: "https://acme.example/pricing",
            source_type: "official",
            observed_at: null,
            checked_at: "2026-11-01",
            confidence: "high",
          },
        ],
      },
    ],
    models: [
      {
        id: "acme-model",
        provider_id: "acme",
        display_name: "Acme Model",
        model_id: "acme-model-v1",
        context_tokens: 128000,
        max_output_tokens: 4096,
        capabilities: {
          tool_calling: "yes",
          streaming: "yes",
          json_mode: "unknown",
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
            checked_at: "2026-11-01",
            confidence: "high",
          },
        ],
      },
    ],
    changelog: [],
    watch_sources: [],
  };
}

const today = new Date("2026-11-15T00:00:00Z");

describe("validateDataset", () => {
  it("正しいデータは通り、警告も出ない", () => {
    const result = validateDataset(baseDataset(), { today });
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("プロバイダー ID の重複を拒否する", () => {
    const data = baseDataset();
    data.providers.push({ ...data.providers[0]! });
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.message.includes("重複"))).toBe(true);
  });

  it("存在しないプロバイダーへの参照を拒否する", () => {
    const data = baseDataset();
    data.models[0]!.provider_id = "missing";
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path.includes("provider_id"))).toBe(true);
  });

  it("出典のないモデルを拒否する", () => {
    const data = baseDataset();
    data.models[0]!.sources = [];
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.message.includes("出典"))).toBe(true);
  });

  it("未来の確認日を拒否する", () => {
    const data = baseDataset();
    data.models[0]!.sources[0]!.checked_at = "2027-01-01";
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.message.includes("未来日"))).toBe(true);
  });

  it("恒久無料と終了が同時に立つ矛盾を拒否する", () => {
    const data = baseDataset();
    data.models[0]!.free_tier.availability = "ended";
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.message.includes("恒久無料"))).toBe(true);
  });

  it("検証成功なのに検証日時がない場合を拒否する", () => {
    const data = baseDataset();
    data.models[0]!.verification = [
      {
        method: "connection",
        status: "passed",
        tested_at: null,
        opencode_version: null,
        notes: null,
      },
    ];
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.message.includes("検証日時"))).toBe(true);
  });

  it("期間限定トライアルで期限が非公表なのは警告にしない", () => {
    const data = baseDataset();
    data.models[0]!.free_tier.type = "trial";
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("期限"))).toBe(false);
  });

  it("終了済みなのに終了日がない場合は警告する", () => {
    const data = baseDataset();
    data.models[0]!.free_tier.type = "ended";
    data.models[0]!.free_tier.availability = "ended";
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("終了日"))).toBe(true);
  });

  it("同じ metric/scope の制限重複を拒否する", () => {
    const data = baseDataset();
    data.models[0]!.free_tier.limits = [
      { metric: "rpm", value: 30, scope: "model" },
      { metric: "rpm", value: 60, scope: "model" },
    ];
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.message.includes("重複"))).toBe(true);
  });

  it("値 0 の制限には説明を求める（警告）", () => {
    const data = baseDataset();
    data.models[0]!.free_tier.limits = [{ metric: "rpd", value: 0, scope: "model" }];
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.message.includes("note"))).toBe(true);
  });

  it("unknown なプロバイダーを参照する監視設定を拒否する", () => {
    const data = baseDataset();
    data.watch_sources = [
      {
        provider_id: "missing",
        label: "料金",
        url: "https://acme.example/pricing",
        target: "pricing",
        failure_threshold: 3,
      },
    ];
    const result = validateDataset(data, { today });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path.startsWith("watch_sources"))).toBe(true);
  });

  it("スキーマ違反はパスつきで返す", () => {
    const result = validateDataset({ meta: {}, providers: [], models: [] }, { today });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]?.path).toBeTruthy();
  });
});
