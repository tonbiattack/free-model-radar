import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  applyFilters,
  defaultFilters,
  parseFilters,
  serializeFilters,
  type FilterState,
  type Row,
} from "./filters";
import type { Model, Provider } from "./schema";

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

const rows: Row[] = [
  { model: makeModel({ id: "alpha", display_name: "Alpha Coder" }), provider },
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
];

const now = new Date("2026-11-15T00:00:00Z");

function withFilters(patch: Partial<FilterState>): FilterState {
  return { ...defaultFilters, ...patch };
}

describe("applyFilters", () => {
  it("既定では終了していないものをすべて返す", () => {
    expect(applyFilters(rows, defaultFilters, now).rows).toHaveLength(3);
  });

  it("モデル名・プロバイダー名・モデル ID で検索できる", () => {
    expect(
      applyFilters(rows, withFilters({ q: "alpha" }), now).rows.map((r) => r.model.id),
    ).toEqual(["alpha"]);
    expect(applyFilters(rows, withFilters({ q: "acme" }), now).rows).toHaveLength(3);
    expect(applyFilters(rows, withFilters({ q: "beta" }), now).rows.map((r) => r.model.id)).toEqual(
      ["beta"],
    );
  });

  it("無料枠タイプで絞り込む", () => {
    const result = applyFilters(rows, withFilters({ freeTypes: ["trial"] }), now);
    expect(result.rows.map((r) => r.model.id)).toEqual(["gamma"]);
  });

  it("ツール呼び出し対応で絞り込むと、不明なものは除外されるが件数を報告する", () => {
    const result = applyFilters(rows, withFilters({ toolsOnly: true }), now);
    // beta は tool_calling が unknown なので除外される（非対応とは断定しない）
    expect(result.rows.map((r) => r.model.id)).toEqual(["alpha", "gamma"]);
    expect(result.hiddenUnknown).toBe(1);
  });

  it("カード不要で絞り込む", () => {
    const withCard: Row[] = [
      ...rows,
      {
        model: makeModel({ id: "delta" }),
        provider: { ...provider, id: "acme2", credit_card_required: "yes" },
      },
    ];
    const result = applyFilters(withCard, withFilters({ noCardOnly: true }), now);
    expect(result.rows.map((r) => r.model.id)).not.toContain("delta");
  });

  it("検証済みで絞り込むと未実施は落ちる", () => {
    const verified: Row[] = [
      {
        model: makeModel({
          id: "verified",
          performance: [],
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
      ...rows,
    ];
    const result = applyFilters(verified, withFilters({ verifiedOnly: true }), now);
    expect(result.rows.map((r) => r.model.id)).toEqual(["verified"]);
  });

  it("登録の手間で絞り込める", () => {
    const withFriction: Row[] = rows.map((row, index) => ({
      ...row,
      provider: { ...provider, signup_friction: index === 0 ? "instant" : "discord" },
    }));
    const result = applyFilters(withFriction, withFilters({ signupFriction: ["discord"] }), now);
    expect(result.rows.map((r) => r.model.id)).toEqual(["beta", "gamma"]);
  });

  it("カード登録が要らないものだけを選ぶと、要るものは落ち不明は残す", () => {
    const mixed: Row[] = [
      {
        model: makeModel({ id: "instant" }),
        provider: { ...provider, signup_friction: "instant" },
      },
      { model: makeModel({ id: "paid" }), provider: { ...provider, signup_friction: "paid" } },
      {
        model: makeModel({ id: "unsure" }),
        provider: { ...provider, signup_friction: "unknown" },
      },
    ];
    const result = applyFilters(mixed, withFilters({ noPaidSignupOnly: true }), now);
    expect(result.rows.map((r) => r.model.id)).toEqual(["instant", "unsure"]);
    expect(result.hiddenUnknown).toBe(0);
  });

  it("鮮度で絞り込む", () => {
    const result = applyFilters(rows, withFilters({ freshDays: 30 }), now);
    expect(result.rows.map((r) => r.model.id)).toEqual(["alpha", "beta"]);
  });

  it("終了済みは既定で隠れ、指定すると出る", () => {
    const ended: Row[] = [
      {
        model: makeModel({
          id: "ended",
          free_tier: {
            type: "ended",
            availability: "ended",
            requirements: [],
            limits: [],
            quota: { kind: "none", amount: null, period: "none", scope: "account" },
            caveats: [],
            expires_on: null,
          },
        }),
        provider,
      },
      ...rows,
    ];
    expect(applyFilters(ended, defaultFilters, now).rows.map((r) => r.model.id)).not.toContain(
      "ended",
    );
    expect(
      applyFilters(ended, withFilters({ includeEnded: true }), now).rows.map((r) => r.model.id),
    ).toContain("ended");
  });

  it("複数条件を組み合わせられる", () => {
    const result = applyFilters(
      rows,
      withFilters({ freeTypes: ["permanent"], toolsOnly: true, q: "coder" }),
      now,
    );
    expect(result.rows.map((r) => r.model.id)).toEqual(["alpha"]);
  });

  it("最終確認日の新しい順に並ぶ", () => {
    const result = applyFilters(rows, withFilters({ sort: "checked" }), now);
    expect(result.rows.map((r) => r.model.id)).toEqual(["alpha", "beta", "gamma"]);
  });

  it("名前順に並ぶ", () => {
    const result = applyFilters(rows, withFilters({ sort: "name" }), now);
    expect(result.rows.map((r) => r.model.display_name)).toEqual([
      "Alpha Coder",
      "Beta Chat",
      "Gamma",
    ]);
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
      sort: "name",
      includeEnded: true,
      signupFriction: ["instant", "discord"],
      noPaidSignupOnly: true,
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
