import { describe, expect, it } from "vitest";
import { buildSitemap } from "./sitemap";
import type { Dataset } from "../src/lib/schema";

const dataset = {
  meta: { last_updated: "2026-11-15", spec_version: "1.0.0" },
  providers: [],
  models: [{ id: "acme-one" } as never, { id: "acme-two" } as never],
  changelog: [],
  watch_sources: [],
} as unknown as Dataset;

describe("buildSitemap", () => {
  it("トップ・履歴・調べ方・各モデルを載せる", () => {
    const xml = buildSitemap(dataset, "https://example.com/radar");
    expect(xml).toContain("<loc>https://example.com/radar/</loc>");
    expect(xml).toContain("<loc>https://example.com/radar/models/acme-one</loc>");
    expect(xml).toContain("<loc>https://example.com/radar/models/acme-two</loc>");
    expect(xml).toContain("<lastmod>2026-11-15</lastmod>");
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
