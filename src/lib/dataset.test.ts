import { describe, expect, it } from "vitest";
import { dataset, validationWarnings } from "./dataset";
import { assembleDataset, loadAndValidate } from "./dataset-source";
import { buildOpencodeConfig } from "./opencode-config";

describe("同梱データ", () => {
  it("検証を通り、警告なしで読み込める", () => {
    expect(dataset.providers.length).toBeGreaterThanOrEqual(5);
    expect(validationWarnings).toEqual([]);
  });

  it("生データの検証結果と一致する（生成物の作り直し忘れを防ぐ）", () => {
    const source = loadAndValidate();
    expect(source.ok).toBe(true);
    expect(dataset).toEqual(source.dataset);
    expect(assembleDataset()).toBeTruthy();
  });

  it("恒久無料とトライアル/クレジットを混同していない", () => {
    const types = new Set(dataset.models.map((model) => model.free_tier.type));
    expect(types.has("permanent")).toBe(true);
    expect(types.has("credit")).toBe(true);
    expect(types.has("ended")).toBe(true);
  });

  it("すべてのモデルに確認日つきの公式出典がある", () => {
    for (const model of dataset.models) {
      expect(model.sources.length, model.id).toBeGreaterThan(0);
      expect(
        model.sources.some((source) => source.source_type === "official"),
        model.id,
      ).toBe(true);
      for (const source of model.sources) {
        expect(source.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("終了したサービスは availability が ended になる", () => {
    const ended = dataset.models.filter((model) => model.free_tier.availability === "ended");
    expect(ended.length).toBeGreaterThan(0);
    for (const model of ended) {
      expect(model.free_tier.type).toBe("ended");
    }
  });

  it("各モデルで設定生成が破綻しない", () => {
    for (const model of dataset.models) {
      const provider = dataset.providers.find((entry) => entry.id === model.provider_id);
      expect(provider, `${model.provider_id} が見つからない`).toBeTruthy();
      const result = buildOpencodeConfig(provider!, model);
      if (result.strategy !== "unsupported") {
        const parsed = JSON.parse(result.json) as { $schema: string };
        expect(parsed.$schema).toBe("https://opencode.ai/config.json");
      }
    }
  });

  it("監視設定の URL はすべて https", () => {
    expect(dataset.watch_sources.length).toBeGreaterThan(0);
    for (const source of dataset.watch_sources) {
      expect(source.url.startsWith("https://")).toBe(true);
    }
  });

  it("数値制限に単位と適用範囲が付いている", () => {
    for (const model of dataset.models) {
      for (const limit of model.free_tier.limits) {
        expect(limit.metric).toBeTruthy();
        expect(limit.scope).toBeTruthy();
        expect(limit.value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("すべてのプロバイダーがキー取得の手間を持つ", () => {
    for (const provider of dataset.providers) {
      expect(provider.signup_friction, provider.id).toBeTruthy();
    }
    // 実際に登録だけで始められるプロバイダーが存在する
    expect(dataset.providers.some((p) => p.signup_friction === "instant")).toBe(true);
  });

  it("すべてのモデルに性能の参照先がある", () => {
    for (const model of dataset.models) {
      expect(model.performance.length, model.id).toBeGreaterThan(0);
      for (const ref of model.performance) {
        expect(ref.url.startsWith("https://")).toBe(true);
      }
    }
  });

  it("OpenCode から /connect だけで使えるモデルが複数ある", () => {
    const zen = dataset.providers.find((p) => p.id === "opencode-zen");
    expect(zen).toBeTruthy();
    expect(zen?.native_opencode).toBe("yes");
    expect(zen?.credit_card_required).toBe("no");
    expect(zen?.signup_friction).toBe("instant");
    const zenModels = dataset.models.filter((m) => m.provider_id === "opencode-zen");
    expect(zenModels.length).toBeGreaterThanOrEqual(5);
    for (const model of zenModels) {
      expect(model.free_tier.availability).toBe("available");
      expect(model.capabilities.tool_calling).toBe("yes");
    }
  });

  it("期間限定の無料は恒久無料と混同していない", () => {
    const zenModels = dataset.models.filter((m) => m.provider_id === "opencode-zen");
    for (const model of zenModels) {
      expect(model.free_tier.type).toBe("trial");
    }
  });
});
