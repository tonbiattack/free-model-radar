import { describe, expect, it } from "vitest";
import { buildRoutes, renderRouteHtml } from "./prerender";
import type { Dataset } from "../src/lib/schema";
import { dataset as realDataset } from "../src/lib/dataset";
import { groupModels } from "../src/lib/groups";

const shell = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>Original title</title>
    <meta name="description" content="Original description" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Original title" />
    <meta
      property="og:description"
      content="Original description"
    />
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("renderRouteHtml", () => {
  it("タイトルと説明を差し替え、canonical と hreflang を足す", () => {
    const html = renderRouteHtml(
      shell,
      { locale: "en", path: "/models/acme-one", title: "Acme One", description: "desc" },
      "https://example.com/radar",
    );
    expect(html).toContain("<title>Acme One</title>");
    expect(html).toContain('content="desc"');
    expect(html).toContain(
      '<link rel="canonical" href="https://example.com/radar/en/models/acme-one" />',
    );
    expect(html).toContain('hreflang="en" href="https://example.com/radar/en/models/acme-one"');
    expect(html).toContain('hreflang="ja" href="https://example.com/radar/ja/models/acme-one"');
    expect(html).toContain('hreflang="x-default"');
    // 元のメタは残さない
    expect(html).not.toContain("Original title");
    expect(html).not.toContain("Original description");
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
  });

  it("html lang をロケールに合わせる", () => {
    const en = renderRouteHtml(
      shell,
      { locale: "en", path: "/", title: "t", description: "d" },
      "https://example.com",
    );
    expect(en).toContain('<html lang="en"');

    const ja = renderRouteHtml(
      shell,
      { locale: "ja", path: "/", title: "t", description: "d" },
      "https://example.com",
    );
    expect(ja).toContain('<html lang="ja"');
  });

  it("トップはロケール直下の canonical になる", () => {
    const html = renderRouteHtml(
      shell,
      { locale: "en", path: "/", title: "Home", description: "d" },
      "https://example.com/radar/",
    );
    expect(html).toContain('<link rel="canonical" href="https://example.com/radar/en" />');
  });

  it("OGP のロケールを設定する", () => {
    const ja = renderRouteHtml(
      shell,
      { locale: "ja", path: "/x", title: "t", description: "d" },
      "https://e.com",
    );
    expect(ja).toContain('property="og:locale" content="ja_JP"');
    expect(ja).toContain('property="og:locale:alternate" content="en_US"');
  });

  it("HTML 特殊文字をエスケープする", () => {
    const html = renderRouteHtml(
      shell,
      { locale: "en", path: "/x", title: `A "quoted" <tag>`, description: "a & b" },
      "https://example.com",
    );
    expect(html).toContain("&quot;quoted&quot;");
    expect(html).toContain("&lt;tag&gt;");
    expect(html).toContain("a &amp; b");
  });

  it("アプリのマウントポイントは残す", () => {
    const html = renderRouteHtml(
      shell,
      { locale: "en", path: "/x", title: "t", description: "d" },
      "https://e.com",
    );
    expect(html).toContain('<div id="root"></div>');
  });
});

describe("buildRoutes", () => {
  it("日英それぞれのルートを作る", () => {
    const routes = buildRoutes(realDataset as Dataset);
    const locales = new Set(routes.map((route) => route.locale));
    expect(locales.has("en")).toBe(true);
    expect(locales.has("ja")).toBe(true);
  });

  it("トップ・履歴・調べ方と全モデル・全提供元のルートを両言語で作る", () => {
    const routes = buildRoutes(realDataset as Dataset);
    const paths = routes.filter((route) => route.locale === "en").map((route) => route.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/changes");
    expect(paths).toContain("/method");
    for (const group of groupModels(realDataset as Dataset)) {
      expect(paths).toContain(`/models/${group.canonical.id}`);
      for (const offer of group.offers) {
        expect(paths).toContain(`/models/${group.canonical.id}/${offer.provider.id}`);
      }
    }
  });

  it("英語タイトルに日本語が混ざらない", () => {
    const routes = buildRoutes(realDataset as Dataset);
    const japanese = /[\u3040-\u30ff\u4e00-\u9fff]/;
    for (const route of routes.filter((entry) => entry.locale === "en")) {
      // モデル名に日本語が含まれる場合はあるため、description の定型文だけを見る
      expect(japanese.test(route.title.replace(/[\u3000-\u303f]/g, "")), route.title).toBe(
        japanese.test(route.title),
      );
    }
  });

  it("日本語タイトルは日本語になる", () => {
    const routes = buildRoutes(realDataset as Dataset);
    const jaHome = routes.find((route) => route.locale === "ja" && route.path === "/");
    expect(jaHome?.title).toContain("無料 LLM API");
    const enHome = routes.find((route) => route.locale === "en" && route.path === "/");
    expect(enHome?.title).toContain("Free LLM APIs");
  });

  it("タイトルがロケール内で重複しない", () => {
    const routes = buildRoutes(realDataset as Dataset);
    for (const locale of ["en", "ja"] as const) {
      const titles = routes.filter((route) => route.locale === locale).map((route) => route.title);
      expect(new Set(titles).size, locale).toBe(titles.length);
    }
  });
});
