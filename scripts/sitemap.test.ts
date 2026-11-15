import { describe, expect, it } from "vitest";
import { buildSitemap } from "./sitemap";
import type { Dataset } from "../src/lib/schema";

const dataset = {
  meta: { last_updated: "2026-11-15", spec_version: "1.0.0" },
  canonical_models: [
    {
      id: "acme-one",
      name: "Acme One",
      developer: "Acme",
      family: null,
      aliases: [],
      notes: [],
    },
    {
      id: "acme-two",
      name: "Acme Two",
      developer: "Acme",
      family: null,
      aliases: [],
      notes: [],
    },
  ],
  providers: [
    {
      id: "p1",
      name: "P1",
      website_url: "https://p1.example",
      docs_url: "https://p1.example/docs",
      signup_url: "https://p1.example/keys",
      api_format: "openai-compatible",
      base_url: "https://p1.example/v1",
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
          source_url: "https://p1.example/pricing",
          source_type: "official",
          observed_at: null,
          checked_at: "2026-11-10",
          confidence: "high",
        },
      ],
    },
  ],
  models: [
    {
      id: "m1",
      provider_id: "p1",
      canonical_id: "acme-one",
      display_name: "Acme One",
      model_id: "acme-one-v1",
      context_tokens: null,
      max_output_tokens: null,
      capabilities: {
        tool_calling: "unknown",
        streaming: "unknown",
        json_mode: "unknown",
        reasoning: "unknown",
      },
      free_tier: {
        type: "unknown",
        availability: "unknown",
        requirements: [],
        limits: [],
        quota: { kind: "unknown", amount: null, period: "unknown", scope: "unknown" },
        caveats: [],
        expires_on: null,
      },
      verification: [],
      performance: [],
      caveats: [],
      sources: [
        {
          field: "無料枠",
          value: "あり",
          source_url: "https://p1.example/pricing",
          source_type: "official",
          observed_at: null,
          checked_at: "2026-11-10",
          confidence: "high",
        },
      ],
    },
    {
      id: "m2",
      provider_id: "p1",
      canonical_id: "acme-two",
      display_name: "Acme Two",
      model_id: "acme-two-v1",
      context_tokens: null,
      max_output_tokens: null,
      capabilities: {
        tool_calling: "unknown",
        streaming: "unknown",
        json_mode: "unknown",
        reasoning: "unknown",
      },
      free_tier: {
        type: "unknown",
        availability: "unknown",
        requirements: [],
        limits: [],
        quota: { kind: "unknown", amount: null, period: "unknown", scope: "unknown" },
        caveats: [],
        expires_on: null,
      },
      verification: [],
      performance: [],
      caveats: [],
      sources: [
        {
          field: "無料枠",
          value: "あり",
          source_url: "https://p1.example/pricing",
          source_type: "official",
          observed_at: null,
          checked_at: "2026-11-10",
          confidence: "high",
        },
      ],
    },
  ],
  changelog: [],
  watch_sources: [],
} as unknown as Dataset;

describe("buildSitemap", () => {
  it("トップ・履歴・調べ方・モデル・提供元別を載せる", () => {
    const xml = buildSitemap(dataset, "https://example.com/radar");
    expect(xml).toContain("<loc>https://example.com/radar/</loc>");
    expect(xml).toContain("<loc>https://example.com/radar/models/acme-one</loc>");
    expect(xml).toContain("<loc>https://example.com/radar/models/acme-two</loc>");
    // 提供元別の詳細も索引する
    expect(xml).toContain("<loc>https://example.com/radar/models/acme-one/p1</loc>");
    expect(xml).toContain("<lastmod>2026-11-15</lastmod>");
  });

  it("モデルと提供元の組み合わせごとに URL を持つ", () => {
    const xml = buildSitemap(dataset, "https://example.com/radar");
    const modelUrls = [...xml.matchAll(/<loc>[^<]*\/models\/[^<]*<\/loc>/g)];
    // モデル 2 件 + 提供元別 2 件
    expect(modelUrls).toHaveLength(4);
  });

  it("XML 宣言と urlset を持つ", () => {
    const xml = buildSitemap(dataset);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it("末尾スラッシュの有無で URL が二重にならない", () => {
    expect(buildSitemap(dataset, "https://example.com/radar/")).toContain(
      "<loc>https://example.com/radar/models/acme-one</loc>",
    );
  });
});
