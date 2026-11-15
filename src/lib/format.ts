import type { FreeTier, LimitEntry, LimitMetric, Model } from "./schema";

const numberFormat = new Intl.NumberFormat("ja-JP");

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

/** 1,048,576 -> "1M"、131072 -> "128K"。トークン数は桁を丸めて読みやすくする。 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    const thousands = tokens / 1000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`;
  }
  return String(tokens);
}

export function formatLimitValue(limit: LimitEntry): string {
  switch (limit.metric) {
    case "rpm":
    case "rph":
    case "rpd":
    case "rpm-month":
    case "concurrency":
      return formatNumber(limit.value);
    case "tpm":
    case "tph":
    case "tpd":
    case "itpm":
    case "otpm":
      return formatTokens(limit.value);
    default:
      return formatNumber(limit.value);
  }
}

const metricOrder: LimitMetric[] = [
  "rpm",
  "rph",
  "rpd",
  "rpm-month",
  "tpm",
  "tph",
  "tpd",
  "itpm",
  "otpm",
  "concurrency",
];

export function sortedLimits(limits: LimitEntry[]): LimitEntry[] {
  return [...limits].sort((a, b) => metricOrder.indexOf(a.metric) - metricOrder.indexOf(b.metric));
}

/**
 * 制限の「充実度」を数値化する。異なる単位をまたいで比較しないよう、
 * リクエスト系とトークン系を別々に数える。並べ替えの根拠としてのみ使う。
 */
export function limitCompleteness(freeTier: FreeTier): number {
  return new Set(freeTier.limits.map((limit) => limit.metric)).size;
}

/** 制限が「同じ単位で比較できるか」。揃っていなければソート順の根拠にしない。 */
export function comparableMetrics(models: Model[]): Set<LimitMetric> {
  if (models.length === 0) return new Set();
  const counts = new Map<LimitMetric, number>();
  for (const model of models) {
    for (const metric of new Set(model.free_tier.limits.map((limit) => limit.metric))) {
      counts.set(metric, (counts.get(metric) ?? 0) + 1);
    }
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count === models.length).map(([metric]) => metric),
  );
}

/** "2026-11-15" からの経過日数。鮮度警告の判定に使う。 */
export function daysSince(isoDate: string, now = new Date()): number {
  return daysSinceMs(isoDate, now.getTime());
}

/** 経過日数を基準時刻のミリ秒から数える。描画中に現在時刻を読まないための入口。 */
export function daysSinceMs(isoDate: string, nowMs: number): number {
  const then = new Date(`${isoDate}T00:00:00Z`);
  return Math.floor((nowMs - then.getTime()) / 86_400_000);
}

export function formatDate(isoDate: string, locale: "en" | "ja" = "ja"): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  return locale === "ja"
    ? `${year}年${Number(month)}月${Number(day)}日`
    : `${year}-${month}-${day}`;
}

export function formatDateTime(iso: string, locale: "en" | "ja" = "ja"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-GB", {
    year: "numeric",
    month: locale === "ja" ? "numeric" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export const FRESHNESS_WARN_DAYS = 45;
export const FRESHNESS_STALE_DAYS = 90;

export type Freshness = "fresh" | "aging" | "stale";

export function freshnessOf(checkedAt: string, now = new Date()): Freshness {
  return freshnessAt(checkedAt, now.getTime());
}

/** 描画中に new Date() を呼ばずに済ませるための入口。 */
export function freshnessAt(checkedAt: string, nowMs: number): Freshness {
  const days = daysSinceMs(checkedAt, nowMs);
  if (days > FRESHNESS_STALE_DAYS) return "stale";
  if (days > FRESHNESS_WARN_DAYS) return "aging";
  return "fresh";
}

export function latestCheck(model: Model): string | null {
  const dates = model.sources.map((source) => source.checked_at).sort();
  return dates.at(-1) ?? null;
}

/** 一覧で使う「最も強い検証結果」。成功 > 失敗 > 未実施 の順に見せる。 */
export function verificationSummary(model: Model): {
  status: "passed" | "failed" | "untested" | "unknown";
  passed: number;
  total: number;
} {
  const tested = model.verification.filter((v) => v.status !== "untested");
  const passed = model.verification.filter((v) => v.status === "passed").length;
  if (model.verification.length === 0) return { status: "unknown", passed: 0, total: 0 };
  if (tested.some((v) => v.status === "passed")) {
    return { status: "passed", passed, total: model.verification.length };
  }
  if (tested.some((v) => v.status === "failed")) {
    return { status: "failed", passed, total: model.verification.length };
  }
  if (tested.some((v) => v.status === "unknown")) {
    return { status: "unknown", passed, total: model.verification.length };
  }
  return { status: "untested", passed, total: model.verification.length };
}

/**
 * 性能リンクを 1 本にまとめる。同じベンチマークを複数持ち回らないよう、
 * 先頭の参照を代表として返す。
 */
export function primaryPerformance(model: Model): Model["performance"][number] | null {
  return model.performance[0] ?? null;
}
