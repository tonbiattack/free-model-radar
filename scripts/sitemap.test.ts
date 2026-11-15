import { describe, expect, it } from "vitest";
import { buildSitemap } from "./sitemap";
import type { Dataset } from "../src/lib/schema";

const dataset = {
  meta: { last_updated: "2026-11-15", spec_version: "1.0.0" },
  canonical_models: [
    { id: "acme-one", name: "Acme One", developer: "Acme", family: null, aliases: [], notes: [] },
    { id: "acme-two", name: "Acme Two", developer: "Acme", family: null, aliases: [], notes: [] },
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
  it("日英それぞれの URL を載せる", () => {
    const xml = buildSitemap(dataset, "https://example.com/radar");
    expect(xml).toContain("<loc>https://example.com/radar/en</loc>");
    expect(xml).toContain("<loc>https://example.com/radar/ja</loc>");
    expect(xml).toContain("<loc>https://example.com/radar/en/models/acme-one</loc>");
    expect(xml).toContain("<loc>https://example.com/radar/ja/models/acme-one</loc>");
    expect(xml).toContain("<lastmod>2026-11-15</lastmod>");
  });

  it("提供元別の URL も日英で持つ", () => {
    const xml = buildSitemap(dataset, "https://example.com/radar");
    expect(xml).toContain("<loc>https://example.com/radar/en/models/acme-one/p1</loc>");
    expect(xml).toContain("<loc>https://example.com/radar/ja/models/acme-one/p1</loc>");
  });

  it("hreflang を併記する", () => {
    const xml = buildSitemap(dataset, "https://example.com/radar");
    expect(xml).toContain('hreflang="en" href="https://example.com/radar/en/models/acme-one"');
    expect(xml).toContain('hreflang="ja" href="https://example.com/radar/ja/models/acme-one"');
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).toContain("xmlns:xhtml");
  });

  it("XML 宣言と urlset を持つ", () => {
    const xml = buildSitemap(dataset);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it("末尾スラッシュの有無で URL が二重にならない", () => {
    expect(buildSitemap(dataset, "https://example.com/radar/")).toContain(
      "<loc>https://example.com/radar/en/models/acme-one</loc>",
    );
  });
});
