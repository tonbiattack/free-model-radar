import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assembleDataset } from "./assemble-data";
import type { Dataset, Model } from "../src/lib/schema";

const SITE_URL = process.env.SITE_URL ?? "https://tonbiattack.github.io/free-model-radar";

/**
 * GitHub Pages は SPA のルーティングを解決しないため、そのままだと
 * 詳細ページの直リンクが HTTP 404 で返る。404.html で画面は出せるが、
 * 検索エンジンは 404 を「存在しないページ」として扱う。
 *
 * そこで各ルートの実体を <route>/index.html として書き出し、
 * 200 で返るようにする。中身はアプリのシェルにメタ情報を差し込んだもので、
 * 読み込むと通常どおり React が描画する。
 */

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tokensText(model: Model): string {
  if (!model.context_tokens) return "コンテキスト長は不明";
  return `コンテキスト ${Math.round(model.context_tokens / 1000)}K`;
}

const freeTypeText: Record<string, string> = {
  permanent: "恒久無料",
  trial: "期間限定トライアル",
  credit: "初回クレジット",
  conditional: "条件付き",
  ended: "終了・停止",
  unknown: "種別不明",
};

const limitUnit: Record<string, string> = {
  rpm: "RPM",
  rph: "RPH",
  rpd: "RPD",
  "rpm-month": "回/月",
  tpm: "TPM",
  tph: "TPH",
  tpd: "TPD",
  itpm: "入力TPM",
  otpm: "出力TPM",
  concurrency: "同時接続",
};

function modelDescription(model: Model, dataset: Dataset): string {
  const provider = dataset.providers.find((entry) => entry.id === model.provider_id);
  const limits = model.free_tier.limits
    .slice(0, 3)
    .map(
      (limit) =>
        `${limitUnit[limit.metric] ?? limit.metric} ${limit.value.toLocaleString("ja-JP")}`,
    )
    .join(", ");

  const parts = [
    `${provider?.name ?? model.provider_id} の ${model.display_name}。`,
    `${freeTypeText[model.free_tier.type] ?? model.free_tier.type}、${tokensText(model)}。`,
  ];
  if (limits) parts.push(`主な制限: ${limits}。`);
  if (model.free_tier.availability === "ended") parts.push("このサービスは現在利用できません。");
  parts.push("出典と確認日つきで掲載しています。");
  return parts.join("");
}

interface Route {
  path: string;
  title: string;
  description: string;
}

export function buildRoutes(dataset: Dataset): Route[] {
  return [
    {
      path: "/",
      title: "Free Model Radar — OpenCode で使える無料 LLM API を根拠つきで探す",
      description:
        "OpenCode などのコーディングエージェントから課金なしで使える LLM API を、公式の出典・確認日・実機検証の状態つきで比較できます。",
    },
    {
      path: "/changes",
      title: "変更履歴 — Free Model Radar",
      description:
        "無料枠・モデル・レート制限の変更履歴。検出日時・変更前後・出典つきで記録し、人手で確認したものだけを確定しています。",
    },
    {
      path: "/method",
      title: "調査と検証の方法 — Free Model Radar",
      description:
        "無料枠の 6 分類、3 値の機能情報、数値の適用範囲、鮮度の扱い、実機検証の条件と限界を公開しています。",
    },
    ...dataset.models.map((model) => ({
      path: `/models/${model.id}`,
      title: `${model.display_name}（${freeTypeText[model.free_tier.type] ?? "不明"}）— Free Model Radar`,
      description: modelDescription(model, dataset),
    })),
  ];
}

/** ルートごとの静的 HTML を、アプリのシェルから生成する。 */
export function renderRouteHtml(shell: string, route: Route, siteUrl: string): string {
  const canonical = `${siteUrl.replace(/\/$/, "")}${route.path === "/" ? "/" : route.path}`;
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);

  const head = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].join("\n    ");

  // 元の <title> と description を差し替える。canonical はここでだけ足す。
  const html = shell
    .replace(/\s*<title>[\s\S]*?<\/title>/, "")
    .replace(/\s*<meta\s+name="description"[\s\S]*?\/>/, "")
    .replace(/\s*<meta\s+property="og:title"[\s\S]*?\/>/, "")
    .replace(/\s*<meta\s+property="og:description"[\s\S]*?\/>/, "")
    .replace(/\s*<meta\s+property="og:type"[\s\S]*?\/>/, "");

  return html.replace("</head>", `    ${head}\n  </head>`);
}

export function writeRouteHtml(distDir: string, dataset: Dataset, siteUrl = SITE_URL): number {
  const shell = readFileSync(join(distDir, "index.html"), "utf8");
  const routes = buildRoutes(dataset);

  for (const route of routes) {
    const html = renderRouteHtml(shell, route, siteUrl);
    if (route.path === "/") {
      writeFileSync(join(distDir, "index.html"), html, "utf8");
      continue;
    }
    // /models/<id>/index.html として置くと、/models/<id> が 200 で返る
    const dir = join(distDir, ...route.path.split("/").filter(Boolean));
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), html, "utf8");
  }

  return routes.length;
}

if (process.argv[1]?.includes("prerender")) {
  const dist = join(import.meta.dirname, "..", "dist");
  const dataset = assembleDataset() as Dataset;
  const count = writeRouteHtml(dist, dataset);
  console.log(`ルート別の HTML を ${count} 件書き出しました（直リンクが 200 で返ります）。`);
}
