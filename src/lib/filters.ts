import type { FreeTierType, Model, SignupFriction } from "./schema";
import type { ModelGroup, Offer } from "./groups";

export type SortKey = "checked" | "name" | "providers" | "limits";

export interface FilterState {
  q: string;
  /** 空配列は「絞り込まない」。 */
  freeTypes: FreeTierType[];
  toolsOnly: boolean;
  noCardOnly: boolean;
  verifiedOnly: boolean;
  providerIds: string[];
  /** 最終確認から N 日以内。null は絞り込まない。 */
  freshDays: number | null;
  sort: SortKey;
  /** 終了済みも表示するか。既定は非表示。 */
  includeEnded: boolean;
  /** 登録の手間で絞る。空配列は絞り込まない。 */
  signupFriction: SignupFriction[];
  /** 支払い方法の登録が要らないものだけ。 */
  noPaidSignupOnly: boolean;
  /** 複数の提供元があるモデルだけ。 */
  multiProviderOnly: boolean;
}

export const defaultFilters: FilterState = {
  q: "",
  freeTypes: [],
  toolsOnly: false,
  noCardOnly: false,
  verifiedOnly: false,
  providerIds: [],
  freshDays: null,
  sort: "checked",
  includeEnded: false,
  signupFriction: [],
  noPaidSignupOnly: false,
  multiProviderOnly: false,
};

const freeTypeValues: FreeTierType[] = [
  "permanent",
  "trial",
  "credit",
  "conditional",
  "ended",
  "unknown",
];

const signupFrictionValues: SignupFriction[] = [
  "instant",
  "discord",
  "waitlist",
  "paid",
  "unknown",
];

const SORT_KEYS: SortKey[] = ["checked", "name", "providers", "limits"];

export interface FilterResult {
  groups: ModelGroup[];
  /** 絞り込みによって落ちたが、条件が「不明」だった提供元の数。 */
  hiddenUnknown: number;
}

/**
 * 絞り込みは「提供元ごと」に評価し、条件を満たす提供元が 1 つでもあるモデルを残す。
 * ただし「複数の提供元がある」は提供元フィルタとは独立に判定する。
 * そうしないと、提供元を 1 つに絞った瞬間に必ず 0 件になってしまう。
 */
export function visibleOffers(
  group: ModelGroup,
  filters: FilterState,
  now = new Date(),
  options: { ignoreProviderFilter?: boolean } = {},
): Offer[] {
  const query = filters.q.trim().toLowerCase();

  return group.offers.filter((offer) => {
    if (query && !matchesText(group, offer, query)) return false;
    if (!filters.includeEnded && offer.model.free_tier.availability === "ended") return false;
    if (filters.freeTypes.length > 0 && !filters.freeTypes.includes(offer.model.free_tier.type)) {
      return false;
    }
    if (
      !options.ignoreProviderFilter &&
      filters.providerIds.length > 0 &&
      !filters.providerIds.includes(offer.provider.id)
    ) {
      return false;
    }
    if (filters.toolsOnly && offer.model.capabilities.tool_calling !== "yes") return false;

    if (filters.noCardOnly && offer.provider.credit_card_required !== "no") return false;

    if (filters.signupFriction.length > 0) {
      const friction = offer.provider.signup_friction ?? "unknown";
      if (!filters.signupFriction.includes(friction)) return false;
    }

    if (filters.noPaidSignupOnly && offer.provider.signup_friction === "paid") return false;

    if (filters.verifiedOnly) {
      const passed = offer.model.verification.some((entry) => entry.status === "passed");
      if (!passed) return false;
    }

    if (filters.freshDays !== null) {
      const checked = latestCheckedAt(offer);
      if (daysSince(checked, now) > filters.freshDays) return false;
    }

    return true;
  });
}

function matchesText(group: ModelGroup, offer: Offer, query: string): boolean {
  const haystack = [
    group.canonical.name,
    ...group.canonical.aliases,
    group.canonical.developer,
    offer.model.display_name,
    offer.model.model_id,
    offer.model.id,
    offer.provider.name,
    offer.provider.id,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function latestCheckedAt(offer: Offer): string {
  const dates = (offer.model.sources.length > 0 ? offer.model.sources : offer.provider.sources)
    .map((source) => source.checked_at)
    .sort();
  return dates.at(-1) ?? "1970-01-01";
}

function daysSince(isoDate: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(`${isoDate}T00:00:00Z`).getTime()) / 86_400_000);
}

export function applyFilters(
  groups: ModelGroup[],
  filters: FilterState,
  now = new Date(),
): FilterResult {
  let hiddenUnknown = 0;
  const result: Array<{ group: ModelGroup; offers: Offer[] }> = [];

  for (const group of groups) {
    const offers = visibleOffers(group, filters, now);
    if (offers.length === 0) {
      // 条件が「不明」で落ちたものは、非対応と混同しないよう件数を出す
      hiddenUnknown += countUnknownExclusions(group, filters, now);
      continue;
    }

    // 「複数の提供元がある」は提供元フィルタとは独立に判定する。
    // 提供元を 1 つに絞ったときに必ず 0 件になるのを避ける。
    if (filters.multiProviderOnly) {
      const providerFiltered =
        filters.providerIds.length > 0
          ? visibleOffers(group, filters, now, { ignoreProviderFilter: true })
          : offers;
      if (providerFiltered.length < 2) continue;
    }

    result.push({ group, offers });
  }

  result.sort((a, b) => {
    switch (filters.sort) {
      case "name":
        return a.group.canonical.name.localeCompare(b.group.canonical.name, "ja");
      case "providers": {
        const diff = b.offers.length - a.offers.length;
        if (diff !== 0) return diff;
        return a.group.canonical.name.localeCompare(b.group.canonical.name, "ja");
      }
      case "limits": {
        // 単位も適用範囲も違う数値をまたいだランキングはしない。
        // 比較可能性の目安として、数値制限を持つ提供元の数で並べる。
        const count = (value: { group: ModelGroup; offers: Offer[] }) =>
          value.offers.filter((offer) => offer.model.free_tier.limits.length > 0).length;
        const diff = count(b) - count(a);
        if (diff !== 0) return diff;
        return a.group.canonical.name.localeCompare(b.group.canonical.name, "ja");
      }
      case "checked":
      default: {
        const latest = (value: { offers: Offer[] }) =>
          value.offers
            .flatMap((offer) => offer.model.sources.map((source) => source.checked_at))
            .sort()
            .at(-1) ?? "1970-01-01";
        return latest(b).localeCompare(latest(a));
      }
    }
  });

  return {
    groups: result.map((entry) => ({ ...entry.group, offers: entry.offers })),
    hiddenUnknown,
  };
}

/** 条件が不明なために落ちた提供元の数を数える。UI で「不明は非対応ではない」と示すために使う。 */
function countUnknownExclusions(group: ModelGroup, filters: FilterState, now: Date): number {
  let count = 0;
  for (const offer of group.offers) {
    const model: Model = offer.model;
    const unknownTool = filters.toolsOnly && model.capabilities.tool_calling === "unknown";
    const unknownCard =
      filters.noCardOnly &&
      offer.provider.credit_card_required !== "no" &&
      offer.provider.credit_card_required !== "yes";
    const unknownSignup =
      (filters.signupFriction.length > 0 || filters.noPaidSignupOnly) &&
      offer.provider.signup_friction === "unknown";
    const unknownVerification =
      filters.verifiedOnly &&
      model.verification.every(
        (entry) => entry.status === "untested" || entry.status === "unknown",
      );

    if (unknownTool || unknownCard || unknownSignup || unknownVerification) count += 1;
  }
  // 鮮度だけで落ちた場合は「不明」ではなく「古い」ので数えない
  void now;
  return count;
}

export function parseFilters(search: string): FilterState {
  const params = new URLSearchParams(search);
  const freeTypes = (params.get("free") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is FreeTierType => freeTypeValues.includes(value as FreeTierType));

  const signupFriction = (params.get("signup") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is SignupFriction =>
      signupFrictionValues.includes(value as SignupFriction),
    );

  const sortParam = params.get("sort");
  const sort = SORT_KEYS.includes(sortParam as SortKey) ? (sortParam as SortKey) : "checked";

  const freshParam = Number(params.get("fresh"));
  const freshDays = Number.isFinite(freshParam) && freshParam > 0 ? freshParam : null;

  return {
    q: params.get("q") ?? "",
    freeTypes,
    toolsOnly: params.get("tools") === "1",
    noCardOnly: params.get("card") === "0",
    verifiedOnly: params.get("verified") === "1",
    providerIds: (params.get("provider") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    freshDays,
    sort,
    includeEnded: params.get("ended") === "1",
    signupFriction,
    noPaidSignupOnly: params.get("nopaid") === "1",
    multiProviderOnly: params.get("multi") === "1",
  };
}

/** 既定値は URL に書かない。共有 URL を短く保ち、差分を読み取りやすくする。 */
export function serializeFilters(filters: FilterState): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.freeTypes.length) params.set("free", filters.freeTypes.join(","));
  if (filters.toolsOnly) params.set("tools", "1");
  if (filters.noCardOnly) params.set("card", "0");
  if (filters.verifiedOnly) params.set("verified", "1");
  if (filters.providerIds.length) params.set("provider", filters.providerIds.join(","));
  if (filters.freshDays !== null) params.set("fresh", String(filters.freshDays));
  if (filters.sort !== "checked") params.set("sort", filters.sort);
  if (filters.includeEnded) params.set("ended", "1");
  if (filters.signupFriction.length) params.set("signup", filters.signupFriction.join(","));
  if (filters.noPaidSignupOnly) params.set("nopaid", "1");
  if (filters.multiProviderOnly) params.set("multi", "1");
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function activeFilterCount(filters: FilterState): number {
  let count = 0;
  if (filters.q.trim()) count += 1;
  if (filters.freeTypes.length) count += 1;
  if (filters.toolsOnly) count += 1;
  if (filters.noCardOnly) count += 1;
  if (filters.verifiedOnly) count += 1;
  if (filters.providerIds.length) count += 1;
  if (filters.freshDays !== null) count += 1;
  if (filters.includeEnded) count += 1;
  if (filters.signupFriction.length) count += 1;
  if (filters.noPaidSignupOnly) count += 1;
  if (filters.multiProviderOnly) count += 1;
  return count;
}
