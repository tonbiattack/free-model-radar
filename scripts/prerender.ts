import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assembleDataset } from "./assemble-data";
import { groupModels } from "../src/lib/groups";
import type { CanonicalModel, Dataset, Model } from "../src/lib/schema";

const SITE_URL = process.env.SITE_URL ?? "https://tonbiattack.github.io/free-model-radar";
const LOCALES = ["en", "ja"] as const;
type Locale = (typeof LOCALES)[number];

/**
 * GitHub Pages は SPA のルーティングを解決しないため、そのままだと
 * 詳細ページの直リンクが HTTP 404 で返る。404.html で画面は出せるが、
 * 検索エンジンは 404 を「存在しないページ」として扱う。
 *
 * そこで各ルート × 各ロケールの実体を <route>/index.html として書き出し、
 * 200 で返るようにする。あわせて title / description / canonical / hreflang /
 * OGP をロケール単位で差し込む。
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tokensText(model: Model, locale: Locale): string {
  if (!model.context_tokens) {
    return locale === "ja" ? "コンテキスト長は不明" : "context length unknown";
  }
  return locale === "ja"
    ? `コンテキスト ${Math.round(model.context_tokens / 1000)}K`
    : `context ${Math.round(model.context_tokens / 1000)}K`;
}

const freeTypeText: Record<Locale, Record<string, string>> = {
  en: {
    permanent: "Permanently free",
    trial: "Limited-time trial",
    credit: "Initial credit",
    conditional: "Conditional",
    ended: "Retired",
    unknown: "Unknown free tier",
  },
  ja: {
    permanent: "恒久無料",
    trial: "期間限定トライアル",
    credit: "初回クレジット",
    conditional: "条件付き",
    ended: "終了・停止",
    unknown: "種別不明",
  },
};

interface Route {
  /** ロケールを除いたパス。 */
  path: string;
  title: string;
  description: string;
}

function modelDescription(
  locale: Locale,
  canonical: CanonicalModel,
  offers: Array<{ model: Model; provider: { name: string } }>,
): string {
  const providers = offers.map((offer) => offer.provider.name).join(locale === "ja" ? "、" : ", ");
  const primary = offers[0]?.model;
  const freeType = primary
    ? (freeTypeText[locale][primary.free_tier.type] ?? "")
    : (freeTypeText[locale].unknown ?? "");

  if (locale === "ja") {
    return [
      `${canonical.developer} の ${canonical.name}。`,
      `${providers} が無料枠で提供しています。`,
      primary ? `${freeType}、${tokensText(primary, "ja")}。` : "",
      "提供元ごとに無料枠・レート制限・登録の手間が異なります。出典と確認日つきで掲載しています。",
    ].join("");
  }

  return [
    `${canonical.name} from ${canonical.developer}, offered free by ${providers}. `,
    primary ? `${freeType}, ${tokensText(primary, "en")}. ` : "",
    "Free tiers, rate limits, and sign-up effort differ by provider. Listed with official sources and check dates.",
  ].join("");
}

/** ロケールを除いたパスの一覧を作る。 */
export function buildBaseRoutes(dataset: Dataset): Route[] {
  return [
    { path: "/", title: "", description: "" },
    { path: "/changes", title: "", description: "" },
    { path: "/method", title: "", description: "" },
    ...groupModels(dataset).flatMap((group) => [
      { path: `/models/${group.canonical.id}`, title: "", description: "" },
      ...group.offers.map((offer) => ({
        path: `/models/${group.canonical.id}/${offer.provider.id}`,
        title: "",
        description: "",
      })),
    ]),
  ];
}

/** ロケール付きの全ルート（title / description 入り）。 */
export function buildRoutes(dataset: Dataset): Array<Route & { locale: Locale }> {
  const groups = groupModels(dataset);
  const routes: Array<Route & { locale: Locale }> = [];

  for (const locale of LOCALES) {
    const ja = locale === "ja";

    routes.push({
      locale,
      path: "/",
      title: ja
        ? "Free Model Radar — OpenCode で使える無料 LLM API を根拠つきで探す"
        : "Free Model Radar — Free LLM APIs you can actually use in OpenCode",
      description: ja
        ? "OpenCode などのコーディングエージェントから課金なしで使える LLM API を、公式の出典・確認日・実機検証の状態つきで比較できます。同じモデルを扱う提供元も横断して比べられます。"
        : "Compare LLM APIs you can use in OpenCode without paying, with official sources, check dates, and verification status. Models offered by several providers are compared side by side.",
    });

    routes.push({
      locale,
      path: "/changes",
      title: ja ? "変更履歴 — Free Model Radar" : "Change log — Free Model Radar",
      description: ja
        ? "無料枠・モデル・レート制限の変更履歴。検出日時・変更前後・出典つきで記録し、人手で確認したものだけを確定しています。"
        : "Changes to free tiers, models, and rate limits, recorded with detection time, before and after values, and the source. Only human-confirmed changes are published as fact.",
    });

    routes.push({
      locale,
      path: "/method",
      title: ja ? "調査と検証の方法 — Free Model Radar" : "How we verify — Free Model Radar",
      description: ja
        ? "無料枠の 6 分類、3 値の機能情報、数値の適用範囲、鮮度の扱い、実機検証の条件と限界を公開しています。"
        : "The six free-tier types, three-valued capabilities, how limit scopes work, how freshness is handled, and the conditions and limits of our testing.",
    });

    for (const group of groups) {
      routes.push({
        locale,
        path: `/models/${group.canonical.id}`,
        title: ja
          ? `${group.canonical.name} を無料で使える提供元 — Free Model Radar`
          : `${group.canonical.name}: free providers — Free Model Radar`,
        description: modelDescription(locale, group.canonical, group.offers),
      });

      for (const offer of group.offers) {
        routes.push({
          locale,
          path: `/models/${group.canonical.id}/${offer.provider.id}`,
          title: ja
            ? `${group.canonical.name}（${offer.provider.name}）— Free Model Radar`
            : `${group.canonical.name} on ${offer.provider.name} — Free Model Radar`,
          description: ja
            ? `${offer.provider.name} で ${group.canonical.name} を無料で使う条件と、OpenCode の設定例。API のモデル ID は ${offer.model.model_id}。`
            : `Terms for using ${group.canonical.name} for free on ${offer.provider.name}, plus an OpenCode configuration example. The API model ID is ${offer.model.model_id}.`,
        });
      }
    }
  }

  return routes;
}

/** ルートごとの静的 HTML を、アプリのシェルから生成する。 */
export function renderRouteHtml(
  shell: string,
  route: Route & { locale: Locale },
  siteUrl: string,
): string {
  const base = siteUrl.replace(/\/$/, "");
  const bare = route.path === "/" ? "" : route.path;
  const canonical = `${base}/${route.locale}${bare}`;
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);

  const head = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    ...LOCALES.map(
      (alt) => `<link rel="alternate" hreflang="${alt}" href="${base}/${alt}${bare}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${base}/en${bare}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:locale" content="${route.locale === "ja" ? "ja_JP" : "en_US"}" />`,
    `<meta property="og:locale:alternate" content="${route.locale === "ja" ? "en_US" : "ja_JP"}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join("\n    ");

  // 元の <title> と description を差し替える。canonical はここでだけ足す。
  const html = shell
    .replace(/\s*<title>[\s\S]*?<\/title>/, "")
    .replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, "")
    .replace(/\s*<meta\s+property="og:title"[\s\S]*?\/>/, "")
    .replace(/\s*<meta\s+property="og:description"[\s\S]*?\/>/, "")
    .replace(/\s*<meta\s+property="og:type"[\s\S]*?\/>/, "")
    // html lang はロケールごとに変える
    .replace(/<html lang="[^"]*"/, `<html lang="${route.locale}"`);

  return html.replace("</head>", `    ${head}\n  </head>`);
}

export function writeRouteHtml(distDir: string, dataset: Dataset, siteUrl = SITE_URL): number {
  const shell = readFileSync(join(distDir, "index.html"), "utf8");
  const routes = buildRoutes(dataset);

  for (const route of routes) {
    const html = renderRouteHtml(shell, route, siteUrl);
    if (route.path === "/") {
      // ルートは英語へ誘導するので、英語版の内容をそのまま置く。
      if (route.locale === "en") writeFileSync(join(distDir, "index.html"), html, "utf8");
      mkdirSync(join(distDir, route.locale), { recursive: true });
      writeFileSync(join(distDir, route.locale, "index.html"), html, "utf8");
      continue;
    }
    const dir = join(distDir, route.locale, ...route.path.split("/").filter(Boolean));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html, "utf8");
  }

  return routes.length;
}

if (process.argv[1]?.includes("prerender")) {
  const dist = join(import.meta.dirname, "..", "dist");
  const dataset = assembleDataset() as Dataset;
  const count = writeRouteHtml(dist, dataset);
  console.log(
    `ルート別の HTML を ${count} 件書き出しました（日英それぞれ直リンクが 200 で返ります）。`,
  );
}
