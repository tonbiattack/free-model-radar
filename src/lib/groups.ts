import type { CanonicalModel, Dataset, Model, Provider } from "./schema";

/** モデル 1 件と、それを提供している事業者。 */
export interface Offer {
  model: Model;
  provider: Provider;
}

/** モデル本体と、そのモデルを無料枠で提供している事業者の一覧。 */
export interface ModelGroup {
  canonical: CanonicalModel;
  offers: Offer[];
}

/**
 * 提供元ごとのモデルを、モデル本体（canonical_id）でまとめる。
 *
 * 表示名や API のモデル ID は提供元ごとに表記が違うため、文字列の一致では判定しない。
 * 同一性は data/models.json の ID で明示的に定義する。
 */
export function groupModels(dataset: Dataset): ModelGroup[] {
  const providersById = new Map(dataset.providers.map((provider) => [provider.id, provider]));
  const canonicalById = new Map(dataset.canonical_models.map((entry) => [entry.id, entry]));

  const groups = new Map<string, ModelGroup>();

  for (const model of dataset.models) {
    const provider = providersById.get(model.provider_id);
    const canonical = canonicalById.get(model.canonical_id);
    // 検証で弾かれる前提だが、型を締めるために存在確認する
    if (!provider || !canonical) continue;

    const existing = groups.get(canonical.id);
    if (existing) {
      existing.offers.push({ model, provider });
    } else {
      groups.set(canonical.id, { canonical, offers: [{ model, provider }] });
    }
  }

  for (const group of groups.values()) {
    group.offers.sort((a, b) => {
      // 使えるもの → 条件付き → 終了 の順。同じ状態なら登録の手間が少ない順。
      const rank = availabilityRank(a.model) - availabilityRank(b.model);
      if (rank !== 0) return rank;
      const friction = frictionRank(a.provider) - frictionRank(b.provider);
      if (friction !== 0) return friction;
      return a.provider.name.localeCompare(b.provider.name, "ja");
    });
  }

  return [...groups.values()].sort((a, b) =>
    a.canonical.name.localeCompare(b.canonical.name, "ja"),
  );
}

function availabilityRank(model: Model): number {
  switch (model.free_tier.availability) {
    case "available":
      return 0;
    case "restricted":
      return 1;
    case "unknown":
      return 2;
    case "ended":
      return 3;
    default:
      return 4;
  }
}

function frictionRank(provider: Provider): number {
  switch (provider.signup_friction) {
    case "instant":
      return 0;
    case "discord":
      return 1;
    case "waitlist":
      return 2;
    case "paid":
      return 3;
    default:
      return 4;
  }
}

/** 提供元が 2 つ以上あるモデル。比較表を出す価値があるもの。 */
export function isComparable(group: ModelGroup): boolean {
  return group.offers.length > 1;
}

/** 実際に無料で使える提供元だけを残す。 */
export function availableOffers(group: ModelGroup): Offer[] {
  return group.offers.filter((offer) => offer.model.free_tier.availability !== "ended");
}

/** グループ全体の最終確認日。最も新しい提供元の確認日を採る。 */
export function groupCheckedAt(group: ModelGroup): string {
  const dates = group.offers
    .flatMap((offer) => offer.model.sources.map((source) => source.checked_at))
    .sort();
  return dates.at(-1) ?? "1970-01-01";
}

/** グループ内で最も制約の緩い数値を探す。単位が同じものだけを比較する。 */
export function bestLimit(
  group: ModelGroup,
  metric: Model["free_tier"]["limits"][number]["metric"],
) {
  const values = group.offers
    .flatMap((offer) => offer.model.free_tier.limits)
    .filter((limit) => limit.metric === metric)
    .map((limit) => limit.value);
  if (values.length === 0) return null;
  return Math.max(...values);
}

export function modelPath(group: ModelGroup): string {
  return `/models/${group.canonical.id}`;
}

/** 提供元ごとの詳細（既存の /offers/:id 相当）への経路。 */
export function offerPath(offer: Offer): string {
  return `/models/${offer.model.canonical_id}/${offer.provider.id}`;
}
