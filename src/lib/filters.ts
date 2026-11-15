import type { FreeTierType, Model, Provider, SignupFriction } from "./schema";

export type SortKey = "checked" | "name" | "limits";

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
};

const freeTypeValues: FreeTierType[] = [
  "permanent",
  "trial",
  "credit",
  "conditional",
  "ended",
  "unknown",
];

export interface Row {
  model: Model;
  provider: Provider | undefined;
}

/**
 * 「不明」を「不可」として除外しない。
 * 例: toolsOnly は tool_calling === "yes" のみ通し、unknown は「可能性あり」として別扱いにする。
 * ここでは仕様に従い、明示的に yes のものだけを「対応」とみなすが、
 * UI 側で unknown を隠したことを示せるよう filteredOutUnknown を返す。
 */
export interface FilterResult {
  rows: Row[];
  /** 絞り込みによって落ちたが、条件が「不明」だった件数。 */
  hiddenUnknown: number;
}

function textOf(row: Row): string {
  return [
    row.model.display_name,
    row.model.model_id,
    row.model.id,
    row.provider?.name ?? "",
    row.provider?.id ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function latestCheckedAt(row: Row): string {
  // 鮮度はそのモデル自身の確認日で判断する。プロバイダー側の確認日が新しいからといって
  // モデル固有の条件が新しいとは限らない。
  const dates = (row.model.sources.length > 0 ? row.model.sources : (row.provider?.sources ?? []))
    .map((source) => source.checked_at)
    .sort();
  return dates.at(-1) ?? "1970-01-01";
}

export function applyFilters(rows: Row[], filters: FilterState, now = new Date()): FilterResult {
  const query = filters.q.trim().toLowerCase();
  let hiddenUnknown = 0;
  const result: Row[] = [];

  for (const row of rows) {
    const { model, provider } = row;

    if (query && !textOf(row).includes(query)) continue;

    if (!filters.includeEnded && model.free_tier.availability === "ended") continue;

    if (filters.freeTypes.length > 0 && !filters.freeTypes.includes(model.free_tier.type)) {
      continue;
    }

    if (filters.providerIds.length > 0 && !filters.providerIds.includes(model.provider_id)) {
      continue;
    }

    if (filters.signupFriction.length > 0) {
      const friction = provider?.signup_friction ?? "unknown";
      if (!filters.signupFriction.includes(friction)) {
        // 「不明」を条件から外した場合だけ、隠したことを数える
        if (friction === "unknown") hiddenUnknown += 1;
        continue;
      }
    }

    if (filters.noPaidSignupOnly) {
      // カード登録そのものが要るものだけを外す。不明は残す（不明を「要る」と決めつけない）。
      if (provider?.signup_friction === "paid") continue;
    }

    if (filters.toolsOnly) {
      if (model.capabilities.tool_calling === "unknown") {
        hiddenUnknown += 1;
        continue;
      }
      if (model.capabilities.tool_calling !== "yes") continue;
    }

    if (filters.noCardOnly) {
      const cardFree = provider?.credit_card_required === "no";
      if (provider?.credit_card_required === "unknown") hiddenUnknown += 1;
      if (!cardFree) continue;
    }

    if (filters.verifiedOnly) {
      const hasPassed = model.verification.some((v) => v.status === "passed");
      if (model.verification.every((v) => v.status === "untested" || v.status === "unknown")) {
        hiddenUnknown += 1;
      }
      if (!hasPassed) continue;
    }

    if (filters.freshDays !== null) {
      const checked = latestCheckedAt(row);
      const days = Math.floor(
        (now.getTime() - new Date(`${checked}T00:00:00Z`).getTime()) / 86_400_000,
      );
      if (days > filters.freshDays) continue;
    }

    result.push(row);
  }

  result.sort((a, b) => {
    switch (filters.sort) {
      case "name":
        return a.model.display_name.localeCompare(b.model.display_name, "ja");
      case "limits": {
        // 単位が揃っているときだけ意味を持つので、制限の種類数で近似する
        const diff = b.model.free_tier.limits.length - a.model.free_tier.limits.length;
        if (diff !== 0) return diff;
        return a.model.display_name.localeCompare(b.model.display_name, "ja");
      }
      case "checked":
      default:
        return latestCheckedAt(b).localeCompare(latestCheckedAt(a));
    }
  });

  return { rows: result, hiddenUnknown };
}

const SORT_KEYS: SortKey[] = ["checked", "name", "limits"];

const signupFrictionValues: SignupFriction[] = [
  "instant",
  "discord",
  "waitlist",
  "paid",
  "unknown",
];

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
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** 有効な絞り込みが 1 つでもあるか。空状態の文言を変えるために使う。 */
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
  return count;
}
