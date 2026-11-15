import { useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { dataset } from "@/lib/dataset";
import { groupModels } from "@/lib/groups";

import { defaultLocale, isLocale, localeHtmlLang, localeOg, type Locale } from "@/lib/locale";
import { messages } from "@/lib/messages";

/** サイト名と定型文。タイトルはロケールごとに組み立てる。 */
const siteName = "Free Model Radar";

function staticTitle(locale: Locale, path: string): { title: string; description: string } {
  const t = messages[locale];
  switch (path) {
    case "/":
      return locale === "ja"
        ? {
            title: `${siteName} — OpenCode で使える無料 LLM API を根拠つきで探す`,
            description:
              "OpenCode などのコーディングエージェントから課金なしで使える LLM API を、公式の出典・確認日・実機検証の状態つきで比較できます。同じモデルを扱う提供元も横断して比べられます。",
          }
        : {
            title: `${siteName} — Free LLM APIs you can actually use in OpenCode`,
            description:
              "Compare LLM APIs you can use in OpenCode without paying, with official sources, check dates, and verification status. Models offered by several providers are compared side by side.",
          };
    case "/changes":
      return locale === "ja"
        ? {
            title: `変更履歴 — ${siteName}`,
            description:
              "無料枠・モデル・レート制限の変更履歴。検出日時・変更前後・出典つきで記録し、人手で確認したものだけを確定しています。",
          }
        : {
            title: `Change log — ${siteName}`,
            description:
              "Changes to free tiers, models, and rate limits, recorded with detection time, before and after values, and the source. Only human-confirmed changes are published as fact.",
          };
    case "/method":
      return locale === "ja"
        ? {
            title: `調査と検証の方法 — ${siteName}`,
            description:
              "無料枠の 6 分類、3 値の機能情報、数値の適用範囲、鮮度の扱い、実機検証の条件と限界を公開しています。",
          }
        : {
            title: `How we verify — ${siteName}`,
            description:
              "The six free-tier types, three-valued capabilities, how limit scopes work, how freshness is handled, and the conditions and limits of our testing.",
          };
    default:
      return { title: `${t.notFound.title} — ${siteName}`, description: t.notFound.body };
  }
}

function modelTitle(
  locale: Locale,
  modelId: string,
  providerId?: string,
): { title: string; description: string } {
  const t = messages[locale];
  const group = groupModels(dataset).find((entry) => entry.canonical.id === modelId);

  if (!group) {
    return { title: `${t.notFound.title} — ${siteName}`, description: t.notFound.body };
  }

  if (providerId) {
    const offer = group.offers.find((entry) => entry.provider.id === providerId);
    if (!offer) {
      return { title: `${t.notFound.title} — ${siteName}`, description: t.notFound.body };
    }
    return locale === "ja"
      ? {
          title: `${group.canonical.name}（${offer.provider.name}）— ${siteName}`,
          description: `${offer.provider.name} で ${group.canonical.name} を無料で使う条件と、OpenCode の設定例。API のモデル ID は ${offer.model.model_id}。`,
        }
      : {
          title: `${group.canonical.name} on ${offer.provider.name} — ${siteName}`,
          description: `Terms for using ${group.canonical.name} for free on ${offer.provider.name}, plus an OpenCode configuration example. The API model ID is ${offer.model.model_id}.`,
        };
  }

  const providers = group.offers
    .map((offer) => offer.provider.name)
    .join(locale === "ja" ? "、" : ", ");
  const primary = group.offers[0]?.model;
  const limits = primary?.free_tier.limits
    .slice(0, 3)
    .map((limit) => `${limit.metric.toUpperCase()} ${limit.value.toLocaleString("en-US")}`)
    .join(", ");
  const freeType = primary
    ? {
        permanent: t.state.freeTypePermanent,
        trial: t.state.freeTypeTrial,
        credit: t.state.freeTypeCredit,
        conditional: t.state.freeTypeConditional,
        ended: t.state.freeTypeEnded,
        unknown: t.state.freeTypeUnknown,
      }[primary.free_tier.type]
    : t.state.freeTypeUnknown;

  return locale === "ja"
    ? {
        title: `${group.canonical.name} を無料で使える提供元 — ${siteName}`,
        description:
          `${group.canonical.developer} の ${group.canonical.name}。${providers} が無料枠で提供しています。${freeType}` +
          (limits ? `。主な制限: ${limits}` : "") +
          "。出典と確認日つきで掲載しています。",
      }
    : {
        title: `${group.canonical.name}: free providers — ${siteName}`,
        description:
          `${group.canonical.name} from ${group.canonical.developer}, offered free by ${providers}. ${freeType}` +
          (limits ? `. Main limits: ${limits}` : "") +
          ". Listed with official sources and check dates.",
      };
}

/**
 * ルートごとにタイトル・説明・canonical・hreflang を更新する。
 * 直リンクはビルド時にルート別 HTML を書き出して対応しているが、
 * クライアント側の遷移ではここで更新しないと最初の値のまま残る。
 */
export function RouteMeta() {
  const { pathname } = useLocation();
  const { locale } = useParams<{ locale: string }>();
  const current: Locale = isLocale(locale) ? locale : defaultLocale;

  useEffect(() => {
    // 末尾スラッシュを落として正規化する（GitHub Pages はどちらでも返す）。
    const path = pathname.replace(/\/+$/, "") || "/";
    const segments = path.split("/").filter(Boolean);
    const rest = isLocale(segments[0]) ? segments.slice(1) : segments;
    const bare = rest.length === 0 ? "/" : `/${rest.join("/")}`;

    const meta =
      rest[0] === "models" && rest.length >= 2
        ? modelTitle(current, rest[1] ?? "", rest[2])
        : staticTitle(current, bare);

    document.title = meta.title;
    document.documentElement.lang = localeHtmlLang[current];

    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", meta.description);

    // canonical と hreflang をロケール単位で整備する。
    const base = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}`;
    const canonicalUrl = `${base}/${current}${bare === "/" ? "" : bare}`;

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // 既存の hreflang を消してから貼り直す（ロケールを跨いだときに残らないように）
    for (const link of document.querySelectorAll('link[rel="alternate"][data-hreflang]')) {
      link.remove();
    }
    for (const alt of ["en", "ja"] as const) {
      const link = document.createElement("link");
      link.setAttribute("rel", "alternate");
      link.setAttribute("hreflang", alt);
      link.setAttribute("href", `${base}/${alt}${bare === "/" ? "" : bare}`);
      link.setAttribute("data-hreflang", "true");
      document.head.appendChild(link);
    }
    const defaultLink = document.createElement("link");
    defaultLink.setAttribute("rel", "alternate");
    defaultLink.setAttribute("hreflang", "x-default");
    defaultLink.setAttribute("href", `${base}/${defaultLocale}${bare === "/" ? "" : bare}`);
    defaultLink.setAttribute("data-hreflang", "true");
    document.head.appendChild(defaultLink);

    let ogLocale = document.querySelector('meta[property="og:locale"]');
    if (!ogLocale) {
      ogLocale = document.createElement("meta");
      ogLocale.setAttribute("property", "og:locale");
      document.head.appendChild(ogLocale);
    }
    ogLocale.setAttribute("content", localeOg[current]);
  }, [pathname, current]);

  return null;
}
