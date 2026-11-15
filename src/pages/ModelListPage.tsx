import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { dataset } from "@/lib/dataset";
import {
  activeFilterCount,
  applyFilters,
  parseFilters,
  serializeFilters,
  type FilterState,
  type SortKey,
} from "@/lib/filters";
import { groupModels, modelPath, type ModelGroup, type Offer } from "@/lib/groups";
import {
  freshnessAt,
  formatDate,
  formatLimitValue,
  latestCheck,
  sortedLimits,
  verificationSummary,
} from "@/lib/format";
import { LOADED_AT_MS } from "@/lib/clock";
import {
  freeTierTypeLabel,
  limitMetricLabel,
  limitScopeLabel,
  signupFrictionDescription,
  signupFrictionLabel,
} from "@/lib/labels";
import type { FreeTierType, SignupFriction } from "@/lib/schema";
import {
  AvailabilityMark,
  FreeTierBadge,
  FreshnessNote,
  TristateBadge,
  VerificationBadge,
} from "@/components/Badges";

const freeTypeOrder: FreeTierType[] = [
  "permanent",
  "trial",
  "credit",
  "conditional",
  "unknown",
  "ended",
];

const freshOptions = [
  { value: null, label: "指定なし" },
  { value: 7, label: "7日以内" },
  { value: 30, label: "30日以内" },
  { value: 90, label: "90日以内" },
];

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "checked", label: "最終確認日" },
  { value: "name", label: "モデル名" },
  { value: "providers", label: "提供元の数" },
  { value: "limits", label: "制限の記載量" },
];

export function ModelListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams.toString()), [searchParams]);
  const [queryDraft, setQueryDraft] = useState(filters.q);
  const [committedQuery, setCommittedQuery] = useState(filters.q);
  const searchRef = useRef<HTMLInputElement>(null);

  // URL が外から変わったとき（共有リンクを開いた、戻る/進む）は入力欄も追従させる。
  // effect で setState せず、レンダー中に前回値と比べて同期する。
  if (committedQuery !== filters.q) {
    setCommittedQuery(filters.q);
    setQueryDraft(filters.q);
  }

  const update = useCallback(
    (patch: Partial<FilterState>) => {
      const next = { ...filters, ...patch };
      setSearchParams(serializeFilters(next), { replace: true });
    },
    [filters, setSearchParams],
  );

  // 検索文字列は入力のたびに URL を書き換えると重いので、少し待ってから反映する
  useEffect(() => {
    if (queryDraft === filters.q) return;
    const timer = window.setTimeout(() => {
      update({ q: queryDraft });
    }, 220);
    return () => window.clearTimeout(timer);
  }, [queryDraft, filters.q, update]);

  const allGroups = useMemo(() => groupModels(dataset), []);

  const { groups, hiddenUnknown } = useMemo(
    () => applyFilters(allGroups, filters),
    [allGroups, filters],
  );

  const providers = useMemo(
    () => [...dataset.providers].sort((a, b) => a.name.localeCompare(b.name, "ja")),
    [],
  );

  const filterCount = activeFilterCount(filters);
  const totalVisible = allGroups.filter((group) =>
    group.offers.some((offer) => offer.model.free_tier.availability !== "ended"),
  ).length;
  const connectOnly = allGroups.filter((group) =>
    group.offers.some(
      (offer) =>
        offer.provider.native_opencode === "yes" &&
        offer.provider.signup_friction === "instant" &&
        offer.model.free_tier.availability !== "ended",
    ),
  ).length;
  const multiProvider = allGroups.filter(
    (group) =>
      group.offers.filter((offer) => offer.model.free_tier.availability !== "ended").length > 1,
  ).length;

  const toggleFreeType = (type: FreeTierType) => {
    const next = filters.freeTypes.includes(type)
      ? filters.freeTypes.filter((value) => value !== type)
      : [...filters.freeTypes, type];
    update({ freeTypes: next });
  };

  const toggleProvider = (id: string) => {
    const next = filters.providerIds.includes(id)
      ? filters.providerIds.filter((value) => value !== id)
      : [...filters.providerIds, id];
    update({ providerIds: next });
  };

  const toggleSignup = (value: SignupFriction) => {
    const next = filters.signupFriction.includes(value)
      ? filters.signupFriction.filter((entry) => entry !== value)
      : [...filters.signupFriction, value];
    update({ signupFriction: next });
  };

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero__lede">
          <h1 id="hero-title">
            OpenCode で
            <br />
            課金なしに使えるモデルを探す
          </h1>
          <p className="hero__sub">
            無料枠のある LLM API を、公式の出典・確認日・検証状態つきで並べています。
            「無料で呼べる」と「エージェントとして動く」は別の情報として扱います。
          </p>
          <p className="hero__links">
            <Link to="/method" className="text-link">
              何をどう確認しているか
            </Link>
            <Link to="/changes" className="text-link">
              最近の変更
            </Link>
          </p>
        </div>

        <dl className="hero__stats">
          <div>
            <dt>掲載モデル</dt>
            <dd>{totalVisible}</dd>
            <dd className="hero__stat-note">終了済みを除く</dd>
          </div>
          <div>
            <dt>恒久無料</dt>
            <dd>
              {
                allGroups.filter((group) =>
                  group.offers.some(
                    (offer) =>
                      offer.model.free_tier.type === "permanent" &&
                      offer.model.free_tier.availability !== "ended",
                  ),
                ).length
              }
            </dd>
            <dd className="hero__stat-note">継続利用できる枠</dd>
          </div>
          <div>
            <dt>複数の提供元</dt>
            <dd>{multiProvider}</dd>
            <dd className="hero__stat-note">横断比較できるモデル</dd>
          </div>
          <div>
            <dt>/connect だけで使える</dt>
            <dd>{connectOnly}</dd>
            <dd className="hero__stat-note">登録と接続のみ</dd>
          </div>
        </dl>
      </section>

      <div className="browse">
        <aside className="filters" aria-labelledby="filters-title">
          <div className="filters__head">
            <h2 id="filters-title">絞り込み</h2>
            {filterCount > 0 ? (
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setQueryDraft("");
                  setSearchParams("", { replace: true });
                  searchRef.current?.focus();
                }}
              >
                条件をすべて解除
              </button>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="search">モデル名・プロバイダー名</label>
            <input
              id="search"
              ref={searchRef}
              type="search"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder="例: gemini, groq, qwen"
              autoComplete="off"
            />
          </div>

          <fieldset className="field">
            <legend>無料枠の種別</legend>
            <ul className="check-list">
              {freeTypeOrder.map((type) => (
                <li key={type}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.freeTypes.includes(type)}
                      onChange={() => toggleFreeType(type)}
                    />
                    <span>{freeTierTypeLabel[type]}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className="field">
            <legend>条件</legend>
            <ul className="check-list">
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.toolsOnly}
                    onChange={(event) => update({ toolsOnly: event.target.checked })}
                  />
                  <span>ツール呼び出しに対応</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.noCardOnly}
                    onChange={(event) => update({ noCardOnly: event.target.checked })}
                  />
                  <span>クレジットカード不要</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(event) => update({ verifiedOnly: event.target.checked })}
                  />
                  <span>OpenCode で検証済み</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.multiProviderOnly}
                    onChange={(event) => update({ multiProviderOnly: event.target.checked })}
                  />
                  <span>複数の提供元がある</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.includeEnded}
                    onChange={(event) => update({ includeEnded: event.target.checked })}
                  />
                  <span>終了・停止したものも表示</span>
                </label>
              </li>
            </ul>
          </fieldset>

          <fieldset className="field">
            <legend>登録の手間</legend>
            <ul className="check-list">
              {(["instant", "discord", "waitlist", "paid"] as const).map((value) => (
                <li key={value}>
                  <label title={signupFrictionDescription[value]}>
                    <input
                      type="checkbox"
                      checked={filters.signupFriction.includes(value)}
                      onChange={() => toggleSignup(value)}
                    />
                    <span>{signupFrictionLabel[value]}</span>
                  </label>
                </li>
              ))}
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.noPaidSignupOnly}
                    onChange={(event) => update({ noPaidSignupOnly: event.target.checked })}
                  />
                  <span>カード登録なしで始められる</span>
                </label>
              </li>
            </ul>
          </fieldset>

          <fieldset className="field">
            <legend>プロバイダー</legend>
            <ul className="check-list">
              {providers.map((provider) => (
                <li key={provider.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.providerIds.includes(provider.id)}
                      onChange={() => toggleProvider(provider.id)}
                    />
                    <span>{provider.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <div className="field">
            <label htmlFor="fresh">情報の鮮度</label>
            <select
              id="fresh"
              value={filters.freshDays ?? ""}
              onChange={(event) =>
                update({ freshDays: event.target.value === "" ? null : Number(event.target.value) })
              }
            >
              {freshOptions.map((option) => (
                <option key={option.label} value={option.value ?? ""}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="sort">並び順</label>
            <select
              id="sort"
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value as SortKey })}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </aside>

        <section className="results" aria-labelledby="results-title">
          <div className="results__head">
            <h2 id="results-title">
              {groups.length} モデル
              {groups.length !== totalVisible ? (
                <span className="results__of"> / 全 {totalVisible} モデル</span>
              ) : null}
            </h2>
            <p className="results__hint">
              {filters.sort === "limits"
                ? "制限の記載量は、単位の異なる数値をまとめた目安です。厳密な比較には使えません。"
                : "\u00a0"}
            </p>
          </div>

          {hiddenUnknown > 0 ? (
            <p className="results__notice" role="status">
              条件が「不明」のため表示していない提供元が {hiddenUnknown}{" "}
              件あります。不明は非対応ではありません。
            </p>
          ) : null}

          {groups.length === 0 ? (
            <EmptyState filterCount={filterCount} />
          ) : (
            <>
              <div className="model-table-wrap">
                <table className="model-table">
                  <caption className="sr-only">
                    無料枠のあるモデルの一覧。同じモデルを複数の提供元が扱う場合は 1
                    行にまとめています。
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">モデル</th>
                      <th scope="col">無料枠</th>
                      <th scope="col">登録</th>
                      <th scope="col">主な制限</th>
                      <th scope="col">ツール</th>
                      <th scope="col">検証</th>
                      <th scope="col">最終確認</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group) => (
                      <ModelGroupRow key={group.canonical.id} group={group} />
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="model-cards">
                {groups.map((group) => (
                  <ModelGroupCard key={group.canonical.id} group={group} />
                ))}
              </ul>
            </>
          )}

          <p className="results__foot">
            数値は公式ドキュメントの記載値です。未記載の項目は空欄や「不明」と表示し、0
            や「非対応」としては扱いません。 空欄の理由は各モデルの詳細で確認できます。
          </p>
        </section>
      </div>
    </>
  );
}

/**
 * 一覧の 1 行。同じモデルを複数の提供元が扱う場合は 1 行にまとめ、
 * 提供元の数と代表的な条件を見せる。詳細で比較表を出す。
 */
function ModelGroupRow({ group }: { group: ModelGroup }) {
  const primary = group.offers[0];
  if (!primary) return null;

  const liveOffers = group.offers.filter((offer) => offer.model.free_tier.availability !== "ended");
  const shown = liveOffers.length > 0 ? liveOffers : group.offers;
  const model = primary.model;
  const limits = sortedLimits(model.free_tier.limits).slice(0, 3);
  const checked = latestCheck(model);
  const freshness = checked ? freshnessAt(checked, LOADED_AT_MS) : null;
  const allEnded = group.offers.every((offer) => offer.model.free_tier.availability === "ended");

  return (
    <tr className={allEnded ? "is-ended" : undefined}>
      <th scope="row">
        <Link to={modelPath(group)} className="model-link">
          {group.canonical.name}
        </Link>
        <span className="model-row__meta">
          {group.canonical.developer}
          {group.offers.length > 1 ? (
            <>
              <span aria-hidden="true"> · </span>
              <span className="provider-count">{group.offers.length} 提供元</span>
            </>
          ) : null}
        </span>
        <span className="model-row__ctx">
          コンテキスト{" "}
          {model.context_tokens ? `${Math.round(model.context_tokens / 1000)}K` : "不明"}
        </span>
      </th>
      <td>
        <span className="free-cell">
          <AvailabilityMark availability={model.free_tier.availability} />
          <FreeTierBadge type={model.free_tier.type} muted={allEnded} />
        </span>
        {shown.length > 1 ? (
          <span className="free-cell__note">
            {shown.map((offer) => offer.provider.name).join(" / ")}
          </span>
        ) : (
          <span className="free-cell__note">{primary.provider.name}</span>
        )}
      </td>
      <td>
        <span className={`signup signup--${primary.provider.signup_friction ?? "unknown"}`}>
          {signupFrictionLabel[primary.provider.signup_friction ?? "unknown"]}
        </span>
      </td>
      <td>
        {limits.length === 0 ? (
          <span className="muted">数値の記載なし</span>
        ) : (
          <ul className="limit-list">
            {limits.map((limit) => (
              <li key={`${limit.metric}-${limit.scope}`}>
                <span className="limit-list__metric">{limitMetricLabel[limit.metric]}</span>
                <span className="limit-list__value">{formatLimitValue(limit)}</span>
                {limit.scope !== "model" ? (
                  <span className="limit-list__scope">{limitScopeLabel[limit.scope]}</span>
                ) : null}
              </li>
            ))}
            {model.free_tier.limits.length > 3 ? (
              <li className="muted">他 {model.free_tier.limits.length - 3} 件</li>
            ) : null}
          </ul>
        )}
      </td>
      <td>
        <TristateBadge value={model.capabilities.tool_calling} />
      </td>
      <td>
        <GroupVerification offers={shown} />
      </td>
      <td>
        {checked ? (
          <span className="checked-cell">
            <time dateTime={checked}>{formatDate(checked)}</time>
            {freshness && freshness !== "fresh" ? (
              <FreshnessNote freshness={freshness} checkedAt={checked} />
            ) : null}
          </span>
        ) : (
          <span className="muted">不明</span>
        )}
      </td>
    </tr>
  );
}

/** 提供元ごとに検証状況が違うので、最も進んでいる結果を代表として見せる。 */
function GroupVerification({ offers }: { offers: Offer[] }) {
  const best = offers
    .map((offer) => verificationSummary(offer.model))
    .sort((a, b) => {
      const rank = { passed: 0, failed: 1, unknown: 2, untested: 3 } as const;
      return rank[a.status] - rank[b.status];
    })[0];
  if (!best) return <span className="muted">不明</span>;
  return <VerificationBadge status={best.status} passed={best.passed} total={best.total} />;
}

function ModelGroupCard({ group }: { group: ModelGroup }) {
  const primary = group.offers[0];
  if (!primary) return null;

  const liveOffers = group.offers.filter((offer) => offer.model.free_tier.availability !== "ended");
  const shown = liveOffers.length > 0 ? liveOffers : group.offers;
  const model = primary.model;
  const limits = sortedLimits(model.free_tier.limits).slice(0, 3);
  const checked = latestCheck(model);
  const allEnded = group.offers.every((offer) => offer.model.free_tier.availability === "ended");

  return (
    <li className={allEnded ? "model-card is-ended" : "model-card"}>
      <div className="model-card__head">
        <Link to={modelPath(group)} className="model-link">
          {group.canonical.name}
        </Link>
        <FreeTierBadge type={model.free_tier.type} muted={allEnded} />
      </div>
      <p className="model-card__meta">
        {group.canonical.developer}
        {group.offers.length > 1 ? ` · ${group.offers.length} 提供元` : ""}
      </p>
      <p className="model-card__providers">
        {shown.map((offer) => offer.provider.name).join(" / ")}
      </p>
      <dl className="model-card__facts">
        <div>
          <dt>登録</dt>
          <dd>
            <span className={`signup signup--${primary.provider.signup_friction ?? "unknown"}`}>
              {signupFrictionLabel[primary.provider.signup_friction ?? "unknown"]}
            </span>
          </dd>
        </div>
        <div>
          <dt>コンテキスト</dt>
          <dd>{model.context_tokens ? `${Math.round(model.context_tokens / 1000)}K` : "不明"}</dd>
        </div>
        <div>
          <dt>ツール</dt>
          <dd>
            <TristateBadge value={model.capabilities.tool_calling} />
          </dd>
        </div>
        <div>
          <dt>主な制限</dt>
          <dd>
            {limits.length === 0
              ? "記載なし"
              : limits
                  .map((limit) => `${limitMetricLabel[limit.metric]} ${formatLimitValue(limit)}`)
                  .join(" / ")}
          </dd>
        </div>
        <div>
          <dt>検証</dt>
          <dd>
            <GroupVerification offers={shown} />
          </dd>
        </div>
        <div>
          <dt>最終確認</dt>
          <dd>{checked ? formatDate(checked) : "不明"}</dd>
        </div>
      </dl>
    </li>
  );
}

function EmptyState({ filterCount }: { filterCount: number }) {
  return (
    <div className="empty">
      <h3>条件に合うモデルがない</h3>
      {filterCount > 0 ? (
        <p>
          絞り込みが厳しすぎる可能性があります。「終了・停止したものも表示」を有効にするか、条件を減らして試してください。
          掲載数がまだ少ないため、条件を 1 つ外すと見つかることがあります。
        </p>
      ) : (
        <p>掲載データがありません。</p>
      )}
    </div>
  );
}
