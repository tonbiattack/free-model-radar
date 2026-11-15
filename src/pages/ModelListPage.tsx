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
  formatLimitValue,
  latestCheck,
  sortedLimits,
  verificationSummary,
} from "@/lib/format";
import { LOADED_AT_MS } from "@/lib/clock";
import {
  formatDateLocale,
  limitMetricLabelWith,
  limitScopeLabelWith,
  signupFrictionLabelWith,
} from "@/lib/labels-i18n";
import { useI18n } from "@/lib/i18n";
import { withLocale } from "@/lib/locale";
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

export function ModelListPage() {
  const { locale, t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams.toString()), [searchParams]);
  const [queryDraft, setQueryDraft] = useState(filters.q);
  const [committedQuery, setCommittedQuery] = useState(filters.q);
  const searchRef = useRef<HTMLInputElement>(null);

  // URL が外から変わったとき（共有リンクを開いた、戻る/進む）は入力欄も追従させる。
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
  const permanent = allGroups.filter((group) =>
    group.offers.some(
      (offer) =>
        offer.model.free_tier.type === "permanent" &&
        offer.model.free_tier.availability !== "ended",
    ),
  ).length;
  const multiProvider = allGroups.filter(
    (group) =>
      group.offers.filter((offer) => offer.model.free_tier.availability !== "ended").length > 1,
  ).length;

  const freshOptions = [
    { value: null, label: t.filters.any },
    { value: 7, label: t.filters.days7 },
    { value: 30, label: t.filters.days30 },
    { value: 90, label: t.filters.days90 },
  ];

  const sortOptions: { value: SortKey; label: string }[] = [
    { value: "checked", label: t.filters.sortChecked },
    { value: "name", label: t.filters.sortName },
    { value: "providers", label: t.filters.sortProviders },
    { value: "limits", label: t.filters.sortLimits },
  ];

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
          <h1 id="hero-title">{t.hero.title}</h1>
          <p className="hero__sub">{t.hero.sub}</p>
          <p className="hero__links">
            <Link to={withLocale("/method", locale)} className="text-link">
              {t.hero.howWeCheck}
            </Link>
            <Link to={withLocale("/changes", locale)} className="text-link">
              {t.hero.recentChanges}
            </Link>
          </p>
        </div>

        <dl className="hero__stats">
          <div>
            <dt>{t.hero.statModels}</dt>
            <dd>{totalVisible}</dd>
            <dd className="hero__stat-note">{t.hero.statModelsNote}</dd>
          </div>
          <div>
            <dt>{t.hero.statPermanent}</dt>
            <dd>{permanent}</dd>
            <dd className="hero__stat-note">{t.hero.statPermanentNote}</dd>
          </div>
          <div>
            <dt>{t.hero.statMulti}</dt>
            <dd>{multiProvider}</dd>
            <dd className="hero__stat-note">{t.hero.statMultiNote}</dd>
          </div>
        </dl>
      </section>

      <div className="browse">
        <aside className="filters" aria-labelledby="filters-title">
          <div className="filters__head">
            <h2 id="filters-title">{t.filters.title}</h2>
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
                {t.filters.clearAll}
              </button>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="search">{t.filters.search}</label>
            <input
              id="search"
              ref={searchRef}
              type="search"
              value={queryDraft}
              onChange={(event) => setQueryDraft(event.target.value)}
              placeholder={t.filters.searchPlaceholder}
              autoComplete="off"
            />
          </div>

          <fieldset className="field">
            <legend>{t.filters.freeType}</legend>
            <ul className="check-list">
              {freeTypeOrder.map((type) => (
                <li key={type}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.freeTypes.includes(type)}
                      onChange={() => toggleFreeType(type)}
                    />
                    <span>
                      <FreeTypeOptionLabel type={type} />
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>

          <fieldset className="field">
            <legend>{t.filters.conditions}</legend>
            <ul className="check-list">
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.toolsOnly}
                    onChange={(event) => update({ toolsOnly: event.target.checked })}
                  />
                  <span>{t.filters.tools}</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.noCardOnly}
                    onChange={(event) => update({ noCardOnly: event.target.checked })}
                  />
                  <span>{t.filters.noCard}</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.verifiedOnly}
                    onChange={(event) => update({ verifiedOnly: event.target.checked })}
                  />
                  <span>{t.filters.verified}</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.multiProviderOnly}
                    onChange={(event) => update({ multiProviderOnly: event.target.checked })}
                  />
                  <span>{t.filters.multi}</span>
                </label>
              </li>
              <li>
                <label>
                  <input
                    type="checkbox"
                    checked={filters.includeEnded}
                    onChange={(event) => update({ includeEnded: event.target.checked })}
                  />
                  <span>{t.filters.showEnded}</span>
                </label>
              </li>
            </ul>
          </fieldset>

          <fieldset className="field">
            <legend>{t.filters.signup}</legend>
            <ul className="check-list">
              {(["instant", "discord", "waitlist", "paid"] as const).map((value) => (
                <li key={value}>
                  <label>
                    <input
                      type="checkbox"
                      checked={filters.signupFriction.includes(value)}
                      onChange={() => toggleSignup(value)}
                    />
                    <span>{signupFrictionLabelWith(t, value)}</span>
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
                  <span>{t.filters.noPaid}</span>
                </label>
              </li>
            </ul>
          </fieldset>

          <fieldset className="field">
            <legend>{t.filters.providers}</legend>
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
            <label htmlFor="fresh">{t.filters.freshness}</label>
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
            <label htmlFor="sort">{t.filters.sort}</label>
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
              {t.results.modelsCount(groups.length)}
              {groups.length !== totalVisible ? (
                <span className="results__of">{t.results.ofTotal(totalVisible)}</span>
              ) : null}
            </h2>
            <p className="results__hint">
              {filters.sort === "limits" ? t.results.limitsHint : "\u00a0"}
            </p>
          </div>

          {hiddenUnknown > 0 ? (
            <p className="results__notice" role="status">
              {t.results.hiddenUnknown(hiddenUnknown)}
            </p>
          ) : null}

          {groups.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <div className="model-table-wrap">
                <table className="model-table">
                  <caption className="sr-only">{t.table.caption}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t.table.model}</th>
                      <th scope="col">{t.table.freeTier}</th>
                      <th scope="col">{t.table.signup}</th>
                      <th scope="col">{t.table.limits}</th>
                      <th scope="col">{t.table.tools}</th>
                      <th scope="col">{t.table.verification}</th>
                      <th scope="col">{t.table.checked}</th>
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

          <p className="results__foot">{t.results.foot}</p>
        </section>
      </div>
    </>
  );
}

function EmptyState() {
  const { t } = useI18n();
  return (
    <div className="empty">
      <h3>{t.results.emptyTitle}</h3>
      <p>{t.results.emptyWithFilters}</p>
    </div>
  );
}

function FreeTypeOptionLabel({ type }: { type: FreeTierType }) {
  return <FreeTierBadge type={type} />;
}

/**
 * 一覧の 1 行。同じモデルを複数の提供元が扱う場合は 1 行にまとめ、
 * 提供元の数と代表的な条件を見せる。詳細で比較表を出す。
 */
function ModelGroupRow({ group }: { group: ModelGroup }) {
  const { locale, t } = useI18n();
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
        <Link to={withLocale(modelPath(group), locale)} className="model-link">
          {group.canonical.name}
        </Link>
        <span className="model-row__meta">
          {group.canonical.developer}
          {group.offers.length > 1 ? (
            <>
              <span aria-hidden="true"> · </span>
              <span className="provider-count">{t.table.providerCount(group.offers.length)}</span>
            </>
          ) : null}
        </span>
        <span className="model-row__ctx">
          {t.table.context}{" "}
          {model.context_tokens ? `${Math.round(model.context_tokens / 1000)}K` : t.table.unknown}
        </span>
      </th>
      <td>
        <span className="free-cell">
          <AvailabilityMark availability={model.free_tier.availability} />
          <FreeTierBadge type={model.free_tier.type} muted={allEnded} />
        </span>
        <span className="free-cell__note">
          {shown.map((offer) => offer.provider.name).join(" / ")}
        </span>
      </td>
      <td>
        <span className={`signup signup--${primary.provider.signup_friction ?? "unknown"}`}>
          {signupFrictionLabelWith(t, primary.provider.signup_friction ?? "unknown")}
        </span>
      </td>
      <td>
        {limits.length === 0 ? (
          <span className="muted">{t.table.noLimits}</span>
        ) : (
          <ul className="limit-list">
            {limits.map((limit) => (
              <li key={`${limit.metric}-${limit.scope}`}>
                <span className="limit-list__metric">{limitMetricLabelWith(t, limit.metric)}</span>
                <span className="limit-list__value">{formatLimitValue(limit)}</span>
                {limit.scope !== "model" ? <ScopeInline scope={limit.scope} /> : null}
              </li>
            ))}
            {model.free_tier.limits.length > 3 ? (
              <li className="muted">{t.table.more(model.free_tier.limits.length - 3)}</li>
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
            <time dateTime={checked}>{formatDateLocale(checked, locale)}</time>
            {freshness && freshness !== "fresh" ? (
              <FreshnessNote freshness={freshness} checkedAt={checked} />
            ) : null}
          </span>
        ) : (
          <span className="muted">{t.table.unknown}</span>
        )}
      </td>
    </tr>
  );
}

function ScopeInline({ scope }: { scope: string }) {
  const { t } = useI18n();
  return <span className="limit-list__scope">{limitScopeLabelWith(t, scope)}</span>;
}

/** 提供元ごとに検証状況が違うので、最も進んでいる結果を代表として見せる。 */
function GroupVerification({ offers }: { offers: Offer[] }) {
  const best = offers
    .map((offer) => verificationSummary(offer.model))
    .sort((a, b) => {
      const rank = { passed: 0, failed: 1, unknown: 2, untested: 3 } as const;
      return rank[a.status] - rank[b.status];
    })[0];
  if (!best) return null;
  return <VerificationBadge status={best.status} passed={best.passed} total={best.total} />;
}

function ModelGroupCard({ group }: { group: ModelGroup }) {
  const { locale, t } = useI18n();
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
        <Link to={withLocale(modelPath(group), locale)} className="model-link">
          {group.canonical.name}
        </Link>
        <FreeTierBadge type={model.free_tier.type} muted={allEnded} />
      </div>
      <p className="model-card__meta">
        {group.canonical.developer}
        {group.offers.length > 1 ? ` · ${t.table.providerCount(group.offers.length)}` : ""}
      </p>
      <p className="model-card__providers">
        {shown.map((offer) => offer.provider.name).join(" / ")}
      </p>
      <dl className="model-card__facts">
        <div>
          <dt>{t.table.signup}</dt>
          <dd>
            <span className={`signup signup--${primary.provider.signup_friction ?? "unknown"}`}>
              {signupFrictionLabelWith(t, primary.provider.signup_friction ?? "unknown")}
            </span>
          </dd>
        </div>
        <div>
          <dt>{t.table.context}</dt>
          <dd>
            {model.context_tokens ? `${Math.round(model.context_tokens / 1000)}K` : t.table.unknown}
          </dd>
        </div>
        <div>
          <dt>{t.table.tools}</dt>
          <dd>
            <TristateBadge value={model.capabilities.tool_calling} />
          </dd>
        </div>
        <div>
          <dt>{t.table.limits}</dt>
          <dd>
            {limits.length === 0
              ? t.table.noLimits
              : limits
                  .map(
                    (limit) =>
                      `${limitMetricLabelWith(t, limit.metric)} ${formatLimitValue(limit)}`,
                  )
                  .join(" / ")}
          </dd>
        </div>
        <div>
          <dt>{t.table.verification}</dt>
          <dd>
            <GroupVerification offers={shown} />
          </dd>
        </div>
        <div>
          <dt>{t.table.checked}</dt>
          <dd>{checked ? formatDateLocale(checked, locale) : t.table.unknown}</dd>
        </div>
      </dl>
    </li>
  );
}
