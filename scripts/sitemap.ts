import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { assembleDataset } from "./assemble-data";
import type { Dataset } from "../src/lib/schema";

/**
 * モデル詳細ページは検索結果から直接開かれることを想定しているため、
 * ビルド時に sitemap.xml を生成する。
 */
const SITE_URL = process.env.SITE_URL ?? "https://tonbiattack.github.io/free-model-radar";

export function buildSitemap(dataset: Dataset, siteUrl = SITE_URL): string {
  const paths = [
    "/",
    "/changes",
    "/method",
    ...dataset.models.map((model) => `/models/${model.id}`),
  ];

  const lastmod = dataset.meta.last_updated;
  const urls = paths
    .map((path) => {
      const loc = `${siteUrl.replace(/\/$/, "")}${path === "/" ? "/" : path}`;
      const priority = path === "/" ? "1.0" : path.startsWith("/models/") ? "0.7" : "0.5";
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${path === "/" ? "daily" : "weekly"}</changefreq>`,
        `    <priority>${priority}</priority>`,
        "  </url>",
      ].join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

if (process.argv[1]?.includes("sitemap")) {
  const dataset = assembleDataset() as Dataset;
  const out = join(import.meta.dirname, "..", "dist", "sitemap.xml");
  writeFileSync(out, buildSitemap(dataset), "utf8");
  console.log(`sitemap.xml を書き出しました（${dataset.models.length + 3} URL）: ${out}`);
}
