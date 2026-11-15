import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { assembleDataset } from "./assemble-data";
import { groupModels } from "../src/lib/groups";
import type { Dataset } from "../src/lib/schema";

/**
 * モデル詳細ページは検索結果から直接開かれることを想定しているため、
 * ビルド時に sitemap.xml を生成する。日英それぞれの URL を載せ、
 * hreflang は各ページの HTML 側で宣言する。
 */
const SITE_URL = process.env.SITE_URL ?? "https://tonbiattack.github.io/free-model-radar";
const LOCALES = ["en", "ja"] as const;

export function buildSitemap(dataset: Dataset, siteUrl = SITE_URL): string {
  const groups = groupModels(dataset);
  const paths = [
    "/",
    "/changes",
    "/method",
    ...groups.map((group) => `/models/${group.canonical.id}`),
    ...groups.flatMap((group) =>
      group.offers.map((offer) => `/models/${group.canonical.id}/${offer.provider.id}`),
    ),
  ];

  const lastmod = dataset.meta.last_updated;
  const base = siteUrl.replace(/\/$/, "");
  const urls = LOCALES.flatMap((locale) =>
    paths.map((path) => {
      const bare = path === "/" ? "" : path;
      const loc = `${base}/${locale}${bare}`;
      const priority = path === "/" ? "1.0" : path.startsWith("/models/") ? "0.7" : "0.5";
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${path === "/" ? "daily" : "weekly"}</changefreq>`,
        `    <priority>${priority}</priority>`,
        ...LOCALES.map(
          (alt) =>
            `    <xhtml:link rel="alternate" hreflang="${alt}" href="${base}/${alt}${bare}" />`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${base}/en${bare}" />`,
        "  </url>",
      ].join("\n");
    }),
  ).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

if (process.argv[1]?.includes("sitemap")) {
  const dataset = assembleDataset() as Dataset;
  const out = join(import.meta.dirname, "..", "dist", "sitemap.xml");
  writeFileSync(out, buildSitemap(dataset), "utf8");
  console.log(`sitemap.xml を書き出しました（日英 ${dataset.models.length} 件を含む）: ${out}`);
}
