import { describe, expect, it } from "vitest";
import { buildRoutes, renderRouteHtml } from "./prerender";
import type { Dataset } from "../src/lib/schema";
import { dataset as realDataset } from "../src/lib/dataset";
import { groupModels } from "../src/lib/groups";

const shell = `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <title>元のタイトル</title>
    <meta name="description" content="元の説明" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="元のタイトル" />
    <meta
      property="og:description"
      content="元の説明"
    />
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("renderRouteHtml", () => {
  it("タイトルと説明を差し替え、canonical を足す", () => {
    const html = renderRouteHtml(
      shell,
      { path: "/models/acme-one", title: "Acme One", description: "説明文" },
      "https://example.com/radar",
    );
    expect(html).toContain("<title>Acme One</title>");
    expect(html).toContain('content="説明文"');
    expect(html).toContain(
      '<link rel="canonical" href="https://example.com/radar/models/acme-one" />',
    );
    // 元のメタは残さない
    expect(html).not.toContain("元のタイトル");
    expect(html).not.toContain("元の説明");
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html.match(/name="description"/g)).toHaveLength(1);
  });

  it("トップは末尾スラッシュ付きの canonical になる", () => {
    const html = renderRouteHtml(
      shell,
      { path: "/", title: "Home", description: "d" },
      "https://example.com/radar/",
    );
    expect(html).toContain('<link rel="canonical" href="https://example.com/radar/" />');
  });

  it("HTML 特殊文字をエスケープする", () => {
    const html = renderRouteHtml(
      shell,
      { path: "/x", title: `A "quoted" <tag>`, description: "a & b" },
      "https://example.com",
    );
    expect(html).toContain("&quot;quoted&quot;");
    expect(html).toContain("&lt;tag&gt;");
    expect(html).toContain("a &amp; b");
  });

  it("アプリのマウントポイントは残す", () => {
    const html = renderRouteHtml(
      shell,
      { path: "/x", title: "t", description: "d" },
      "https://e.com",
    );
    expect(html).toContain('<div id="root"></div>');
  });
});

describe("buildRoutes", () => {
  it("トップ・履歴・調べ方と全モデルのルートを作る", () => {
    const routes = buildRoutes(realDataset as Dataset);
    const paths = routes.map((route) => route.path);
    expect(paths).toContain("/");
    expect(paths).toContain("/changes");
    expect(paths).toContain("/method");
    for (const group of groupModels(realDataset as Dataset)) {
      expect(paths).toContain(`/models/${group.canonical.id}`);
      // 提供元別の詳細も生成する
      for (const offer of group.offers) {
        expect(paths).toContain(`/models/${group.canonical.id}/${offer.provider.id}`);
      }
    }
  });

  it("モデルの説明に提供元の名前が入る", () => {
    const routes = buildRoutes(realDataset as Dataset);
    const group = groupModels(realDataset as Dataset).find((entry) => entry.offers.length > 1)!;
    const route = routes.find((entry) => entry.path === `/models/${group.canonical.id}`);
    expect(route?.description).toContain(group.canonical.name);
    for (const offer of group.offers) {
      expect(route?.description).toContain(offer.provider.name);
    }
  });

  it("提供元別の説明に API のモデル ID が入る", () => {
    const routes = buildRoutes(realDataset as Dataset);
    const group = groupModels(realDataset as Dataset).find((entry) => entry.offers.length > 1)!;
    const offer = group.offers[0]!;
    const route = routes.find(
      (entry) => entry.path === `/models/${group.canonical.id}/${offer.provider.id}`,
    );
    expect(route?.description).toContain(offer.model.model_id);
  });

  it("タイトルがルートごとに重複しない", () => {
    const routes = buildRoutes(realDataset as Dataset);
    const titles = routes.map((route) => route.title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
