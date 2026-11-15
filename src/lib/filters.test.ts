import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  applyFilters,
  defaultFilters,
  parseFilters,
  serializeFilters,
  visibleOffers,
  type FilterState,
} from "./filters";
import type { ModelGroup } from "./groups";
import type { CanonicalModel, Model, Provider } from "./schema";
import { groupModels } from "./groups";
import type { Dataset } from "./schema";

const provider: Provider = {
  id: "acme",
  name: "Acme",
  website_url: "https://acme.example",
  docs_url: "https://acme.example/docs",
  signup_url: "https://acme.example/keys",
  api_format: "openai-compatible",
  base_url: "https://acme.example/v1",
  native_opencode: "no",
  opencode_provider_id: null,
  authentication: "api-key",
  credit_card_required: "no",
  signup_friction: "instant",
  notes: [],
  sources: [
    {
      field: "無料枠",
      value: "あり",
      source_url: "https://acme.example/pricing",
      source_type: "official",
      observed_at: null,
      checked_at: "2026-11-10",
      confidence: "high",
    },
  ],
};

function makeModel(overrides: Partial<Model> & { id: string }): Model {
  const { id, ...rest } = overrides;
  return {
    id,
    provider_id: "acme",
    canonical_id: "acme-model",
    display_name: id,
    model_id: id,
    context_tokens: 128000,
    max_output_tokens: 8192,
    capabilities: {
      tool_calling: "yes",
      streaming: "yes",
      json_mode: "unknown",
      reasoning: "no",
    },
    free_tier: {
      type: "permanent",
      availability: "available",
      requirements: [],
      limits: [{ metric: "rpm", value: 30, scope: "model" }],
      quota: { kind: "none", amount: null, period: "none", scope: "model" },
      caveats: [],
      expires_on: null,
    },
    verification: [],
    performance: [],
    caveats: [],
    sources: [
      {
        field: "無料枠",
        value: "30 RPM",
        source_url: "https://acme.example/pricing",
        source_type: "official",
        observed_at: null,
        checked_at: "2026-11-10",
        confidence: "high",
      },
    ],
    ...rest,
  };
}

function makeCanonical(id: string, name: string, aliases: string[] = []): CanonicalModel {
  return { id, name, developer: "Acme", family: null, aliases, notes: [] };
}

function makeGroup(
  canonical: CanonicalModel,
  offers: Array<{ model: Model; provider: Provider }>,
): ModelGroup {
  return { canonical, offers };
}

const now = new Date("2026-11-15T00:00:00Z");

const alphaGroup = makeGroup(makeCanonical("alpha", "Alpha Coder", ["alpha-coder"]), [
  { model: makeModel({ id: "alpha", display_name: "Alpha Coder" }), provider },
]);

const betaGroup = makeGroup(makeCanonical("beta", "Beta Chat"), [
  {
    model: makeModel({
      id: "beta",
      display_name: "Beta Chat",
      capabilities: {
        tool_calling: "unknown",
        streaming: "yes",
        json_mode: "no",
        reasoning: "no",
      },
    }),
    provider,
  },
]);

const gammaGroup = makeGroup(makeCanonical("gamma", "Gamma"), [
  {
    model: makeModel({
      id: "gamma",
      display_name: "Gamma",
      free_tier: {
        type: "trial",
        availability: "available",
        requirements: ["支払い方法の登録"],
        limits: [],
        quota: {
          kind: "currency",
          amount: 5,
          currency: "USD",
          period: "one-time",
          scope: "account",
        },
        caveats: [],
        expires_on: "2026-12-31",
      },
      sources: [
        {
          field: "無料枠",
          value: "5 USD",
          source_url: "https://acme.example/pricing",
          source_type: "official",
          observed_at: null,
          checked_at: "2026-06-01",
          confidence: "high",
        },
      ],
    }),
    provider,
  },
]);

const groups: ModelGroup[] = [alphaGroup, betaGroup, gammaGroup];

function withFilters(patch: Partial<FilterState>): FilterState {
  return { ...defaultFilters, ...patch };
}

describe("applyFilters（モデル単位）", () => {
  it("既定では終了していないものをすべて返す", () => {
    expect(applyFilters(groups, defaultFilters, now).groups).toHaveLength(3);
  });

  it("モデル名・別名・開発元・モデル ID で検索できる", () => {
    expect(
      applyFilters(groups, withFilters({ q: "alpha" }), now).groups.map((g) => g.canonical.id),
    ).toEqual(["alpha"]);
    // 別名でもヒットする
    expect(
      applyFilters(groups, withFilters({ q: "alpha-coder" }), now).groups.map(
        (g) => g.canonical.id,
      ),
    ).toEqual(["alpha"]);
    expect(
      applyFilters(groups, withFilters({ q: "acme" }), now).groups.map((g) => g.canonical.id),
    ).toEqual(["alpha", "beta", "gamma"]);
  });

  it("提供元名でも検索できる", () => {
    expect(
      applyFilters(groups, withFilters({ q: "Acme" }), now).groups.map((g) => g.canonical.id),
    ).toHaveLength(3);
  });

  it("無料枠タイプで絞り込む", () => {
    const result = applyFilters(groups, withFilters({ freeTypes: ["trial"] }), now);
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["gamma"]);
  });

  it("ツール呼び出し対応で絞り込むと、不明なものは除外される", () => {
    const result = applyFilters(groups, withFilters({ toolsOnly: true }), now);
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["alpha", "gamma"]);
    expect(result.hiddenUnknown).toBeGreaterThan(0);
  });

  it("登録の手間で絞り込める", () => {
    const withFriction: ModelGroup[] = [
      makeGroup(alphaGroup.canonical, [
        {
          model: alphaGroup.offers[0]!.model,
          provider: { ...provider, signup_friction: "instant" },
        },
      ]),
      makeGroup(makeCanonical("delta", "Delta"), [
        {
          model: makeModel({ id: "delta", canonical_id: "delta" }),
          provider: { ...provider, id: "acme2", signup_friction: "discord" },
        },
      ]),
    ];
    const result = applyFilters(withFriction, withFilters({ signupFriction: ["discord"] }), now);
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["delta"]);
  });

  it("カード登録が要らないものだけを選ぶと、要るものは落ちる", () => {
    const mixed: ModelGroup[] = [
      makeGroup(makeCanonical("instant", "Instant"), [
        { model: makeModel({ id: "instant", canonical_id: "instant" }), provider },
      ]),
      makeGroup(makeCanonical("paid", "Paid"), [
        {
          model: makeModel({ id: "paid", canonical_id: "paid" }),
          provider: { ...provider, id: "paid-provider", signup_friction: "paid" },
        },
      ]),
    ];
    const result = applyFilters(mixed, withFilters({ noPaidSignupOnly: true }), now);
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["instant"]);
  });

  it("検証済みで絞り込むと未実施は落ちる", () => {
    const verified: ModelGroup[] = [
      makeGroup(makeCanonical("verified", "Verified"), [
        {
          model: makeModel({
            id: "verified",
            canonical_id: "verified",
            verification: [
              {
                method: "connection",
                status: "passed",
                tested_at: "2026-11-14T00:00:00Z",
                opencode_version: "2.0.0",
                notes: null,
              },
            ],
          }),
          provider,
        },
      ]),
      ...groups,
    ];
    const result = applyFilters(verified, withFilters({ verifiedOnly: true }), now);
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["verified"]);
  });

  it("鮮度で絞り込む", () => {
    const result = applyFilters(groups, withFilters({ freshDays: 30 }), now);
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["alpha", "beta"]);
  });

  it("終了済みは既定で隠れ、指定すると出る", () => {
    const ended: ModelGroup[] = [
      makeGroup(makeCanonical("ended", "Ended"), [
        {
          model: makeModel({
            id: "ended",
            canonical_id: "ended",
            free_tier: {
              type: "ended",
              availability: "ended",
              requirements: [],
              limits: [],
              quota: { kind: "none", amount: null, period: "none", scope: "account" },
              caveats: [],
              expires_on: "2026-07-30",
            },
          }),
          provider,
        },
      ]),
      ...groups,
    ];
    expect(
      applyFilters(ended, defaultFilters, now).groups.map((g) => g.canonical.id),
    ).not.toContain("ended");
    expect(
      applyFilters(ended, withFilters({ includeEnded: true }), now).groups.map(
        (g) => g.canonical.id,
      ),
    ).toContain("ended");
  });

  it("複数条件を組み合わせられる", () => {
    const result = applyFilters(
      groups,
      withFilters({ freeTypes: ["permanent"], toolsOnly: true, q: "coder" }),
      now,
    );
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["alpha"]);
  });

  it("最終確認日の新しい順に並ぶ", () => {
    const result = applyFilters(groups, withFilters({ sort: "checked" }), now);
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("名前順に並ぶ", () => {
    const result = applyFilters(groups, withFilters({ sort: "name" }), now);
    expect(result.groups.map((g) => g.canonical.name)).toEqual([
      "Alpha Coder",
      "Beta Chat",
      "Gamma",
    ]);
  });
});

describe("提供元をまたぐ挙動", () => {
  const sharedModel = makeCanonical("shared", "Shared Model");
  const multiGroup = makeGroup(sharedModel, [
    {
      model: makeModel({ id: "shared-a", canonical_id: "shared", display_name: "Shared Model" }),
      provider: { ...provider, id: "prov-a", name: "Prov A" },
    },
    {
      model: makeModel({ id: "shared-b", canonical_id: "shared", display_name: "Shared Model" }),
      provider: {
        ...provider,
        id: "prov-b",
        name: "Prov B",
        credit_card_required: "yes",
        signup_friction: "paid",
      },
    },
  ]);

  it("同じモデルを扱う提供元が 1 つのモデルとしてまとまる", () => {
    expect(multiGroup.offers).toHaveLength(2);
    expect(applyFilters([multiGroup], defaultFilters, now).groups).toHaveLength(1);
  });

  it("提供元の条件で絞ると、該当する提供元だけが残る", () => {
    const filtered = visibleOffers(multiGroup, withFilters({ noCardOnly: true }), now);
    expect(filtered.map((o) => o.provider.id)).toEqual(["prov-a"]);
  });

  it("片方の提供元だけ条件を満たす場合でもモデルは残る", () => {
    const result = applyFilters([multiGroup], withFilters({ providerIds: ["prov-b"] }), now);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]?.offers.map((o) => o.provider.id)).toEqual(["prov-b"]);
  });

  it("複数の提供元があるモデルだけに絞れる", () => {
    const result = applyFilters(
      [multiGroup, ...groups],
      withFilters({ multiProviderOnly: true }),
      now,
    );
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["shared"]);
  });

  it("提供元を 1 つに絞っても、複数提供元のモデルは残る", () => {
    // 「複数の提供元がある」は提供元フィルタと独立に判定する。
    // そうしないと、提供元を絞った瞬間に必ず 0 件になる。
    const result = applyFilters(
      [multiGroup, ...groups],
      withFilters({ multiProviderOnly: true, providerIds: ["prov-a"] }),
      now,
    );
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["shared"]);
    // 表示する提供元は絞り込んだものだけ
    expect(result.groups[0]?.offers.map((o) => o.provider.id)).toEqual(["prov-a"]);
  });

  it("提供元の数で並べ替えられる", () => {
    const result = applyFilters([alphaGroup, multiGroup], withFilters({ sort: "providers" }), now);
    expect(result.groups.map((g) => g.canonical.id)).toEqual(["shared", "alpha"]);
  });

  it("提供元ごとに無料枠が違っても、まとめた 1 モデルとして数える", () => {
    const mixedGroup = makeGroup(makeCanonical("mixed", "Mixed"), [
      {
        model: makeModel({ id: "mixed-a", canonical_id: "mixed" }),
        provider: { ...provider, id: "p1" },
      },
      {
        model: makeModel({
          id: "mixed-b",
          canonical_id: "mixed",
          free_tier: {
            type: "trial",
            availability: "restricted",
            requirements: [],
            limits: [],
            quota: { kind: "none", amount: null, period: "none", scope: "account" },
            caveats: [],
            expires_on: null,
          },
        }),
        provider: { ...provider, id: "p2" },
      },
    ]);
    // 恒久無料で絞ると p1 だけが残るが、モデル自体は表示される
    const permanentOnly = applyFilters(
      [mixedGroup],
      withFilters({ freeTypes: ["permanent"] }),
      now,
    );
    expect(permanentOnly.groups).toHaveLength(1);
    expect(permanentOnly.groups[0]?.offers.map((o) => o.provider.id)).toEqual(["p1"]);

    // トライアルで絞ると p2 だけが残る
    const trialOnly = applyFilters([mixedGroup], withFilters({ freeTypes: ["trial"] }), now);
    expect(trialOnly.groups[0]?.offers.map((o) => o.provider.id)).toEqual(["p2"]);
  });
});

describe("URL 同期", () => {
  it("既定値は URL に出さない", () => {
    expect(serializeFilters(defaultFilters)).toBe("");
    expect(parseFilters("")).toEqual(defaultFilters);
  });

  it("絞り込み条件を往復できる", () => {
    const filters = withFilters({
      q: "gemini flash",
      freeTypes: ["permanent", "trial"],
      toolsOnly: true,
      noCardOnly: true,
      providerIds: ["google", "groq"],
      freshDays: 30,
      sort: "providers",
      includeEnded: true,
      signupFriction: ["instant", "discord"],
      noPaidSignupOnly: true,
      multiProviderOnly: true,
    });
    const query = serializeFilters(filters);
    expect(parseFilters(query)).toEqual(filters);
  });

  it("不正な値は既定値に落とす", () => {
    const parsed = parseFilters("?free=permanent,bogus&sort=nope&fresh=-5&tools=x");
    expect(parsed.freeTypes).toEqual(["permanent"]);
    expect(parsed.sort).toBe("checked");
    expect(parsed.freshDays).toBeNull();
    expect(parsed.toolsOnly).toBe(false);
  });

  it("有効な条件数を数える", () => {
    expect(activeFilterCount(defaultFilters)).toBe(0);
    expect(activeFilterCount(withFilters({ q: "a", toolsOnly: true }))).toBe(2);
  });
});

describe("groupModels", () => {
  function makeDataset(): Dataset {
    const providers: Provider[] = [
      { ...provider, id: "p1", name: "P1" },
      { ...provider, id: "p2", name: "P2" },
    ];
    const models: Model[] = [
      makeModel({ id: "a1", canonical_id: "model-a", provider_id: "p1" }),
      makeModel({ id: "a2", canonical_id: "model-a", provider_id: "p2" }),
      makeModel({ id: "b1", canonical_id: "model-b", provider_id: "p1" }),
    ];
    return {
      meta: { last_updated: "2026-11-15", spec_version: "1.0.0" },
      canonical_models: [makeCanonical("model-a", "Model A"), makeCanonical("model-b", "Model B")],
      providers,
      models,
      changelog: [],
      watch_sources: [],
    };
  }

  it("canonical_id が同じモデルを 1 つにまとめる", () => {
    const grouped = groupModels(makeDataset());
    expect(grouped).toHaveLength(2);
    expect(grouped.find((g) => g.canonical.id === "model-a")?.offers).toHaveLength(2);
    expect(grouped.find((g) => g.canonical.id === "model-b")?.offers).toHaveLength(1);
  });

  it("表示名が違っても canonical_id が同じなら同一モデルとして扱う", () => {
    const base = makeDataset();
    base.canonical_models.push(makeCanonical("model-c", "Model C"));
    base.models.push(
      makeModel({
        id: "c1",
        canonical_id: "model-c",
        display_name: "別名 C その1",
        provider_id: "p1",
      }),
      makeModel({
        id: "c2",
        canonical_id: "model-c",
        display_name: "C alias two",
        provider_id: "p2",
      }),
    );
    const grouped = groupModels(base);
    expect(grouped.find((g) => g.canonical.id === "model-c")?.offers).toHaveLength(2);
  });

  it("使える提供元が先に来る", () => {
    const base = makeDataset();
    const modelB = base.models.find((m) => m.id === "b1")!;
    modelB.free_tier = { ...modelB.free_tier, availability: "ended", type: "ended" };
    base.models.push(makeModel({ id: "b2", canonical_id: "model-b", provider_id: "p2" }));
    const grouped = groupModels(base);
    expect(grouped.find((g) => g.canonical.id === "model-b")?.offers[0]?.model.id).toBe("b2");
  });

  it("提供元が見つからないモデルは落とす（検証で弾かれる前提）", () => {
    const base = makeDataset();
    base.models.push(makeModel({ id: "orphan", canonical_id: "model-a", provider_id: "missing" }));
    const grouped = groupModels(base);
    const total = grouped.reduce((sum, g) => sum + g.offers.length, 0);
    expect(total).toBe(3);
  });
});
