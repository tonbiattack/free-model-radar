import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { dataset } from "@/lib/dataset";
import { groupModels, offerPath, type ModelGroup, type Offer } from "@/lib/groups";
import { LOADED_AT_MS } from "@/lib/clock";
import { translateText } from "@/lib/data-i18n";
import {
  daysSinceMs,
  formatLimitValue,
  formatNumber,
  formatTokens,
  freshnessAt,
  latestCheck,
  sortedLimits,
  verificationSummary,
} from "@/lib/format";
import {
  apiFormatLabelWith,
  authLabelWith,
  availabilityLabelWith,
  formatDateLocale,
  limitMetricLabelWith,
  limitMetricLongWith,
  limitScopeLabelWith,
  signupFrictionLabelWith,
  tristateLabelWith,
  verificationMethodLabelWith,
  verificationStatusLabelWith,
} from "@/lib/labels-i18n";
import { useI18n } from "@/lib/i18n";
import { withLocale } from "@/lib/locale";
import { buildOpencodeConfig, keyEnvVar, setupSteps } from "@/lib/opencode-config";
import {
  FreeTierBadge,
  AvailabilityMark,
  FreshnessNote,
  TristateBadge,
  VerificationBadge,
} from "@/components/Badges";
import { NotFoundPage } from "./NotFoundPage";

/**
 * モデル詳細。2 階層に分かれている。
 *
 * /models/:modelId                      … モデル本体 + 提供元の比較表
 * /models/:modelId/:providerId          … 選んだ提供元の条件・導入手順・設定生成
 *
 * 同じモデルを複数の提供元が扱う場合、条件は提供元ごとに違う。
 * 比較表で選ばせてから、詳細に降りる導線にしている。
 */
export function ModelDetailPage() {
  const { t } = useI18n();
  const { modelId, providerId } = useParams<{ modelId: string; providerId?: string }>();
  const group = groupModels(dataset).find((entry) => entry.canonical.id === modelId);

  if (!group) {
    return <NotFoundPage reason={t.notFound.modelMissing} />;
  }

  if (!providerId) {
    return <ModelOverview group={group} />;
  }

  const offer = group.offers.find((entry) => entry.provider.id === providerId);
  if (!offer) {
    return <NotFoundPage reason={t.notFound.offerMissing(group.canonical.name)} />;
  }

  return <ModelDetail group={group} offer={offer} />;
}

/**
 * モデル本体の概要と、提供元の比較表。
 * 「このモデルを無料で使える提供元」を横断して比べるのがこの画面の役割。
 */
function ModelOverview({ group }: { group: ModelGroup }) {
  const { locale, t } = useI18n();
  const name = group.canonical.name;
  const liveOffers = group.offers.filter((offer) => offer.model.free_tier.availability !== "ended");
  const shown = liveOffers.length > 0 ? liveOffers : group.offers;
  const endedCount = group.offers.length - shown.length;

  return (
    <>
      <nav className="breadcrumb" aria-label={t.nav.mainLabel}>
        <Link to={withLocale("/", locale)}>{t.detail.breadcrumbModels}</Link>
        <span aria-hidden="true">/</span>
        <span>{name}</span>
      </nav>

      <header className="detail-head">
        <div>
          <p className="detail-head__provider">{group.canonical.developer}</p>
          <h1>{name}</h1>
          <p className="detail-head__id">
            {t.detail.providersCount(shown.length)}
            {endedCount > 0 ? t.detail.providerEnded(endedCount) : ""}
          </p>
        </div>
        <div className="detail-head__badges">
          {group.canonical.aliases.slice(0, 3).map((alias) => (
            <code key={alias} className="alias-chip">
              {alias}
            </code>
          ))}
        </div>
      </header>

      {group.canonical.notes.length > 0 ? (
        <ul className="caveats caveats--tight">
          {group.canonical.notes.map((note) => (
            <li key={note}>{translateText(note, locale)}</li>
          ))}
        </ul>
      ) : null}

      <Section title={t.detail.compare.title}>
        <p className="section-note">{t.detail.compare.note}</p>

        <div className="compare-wrap">
          <table className="compare-table">
            <caption className="sr-only">{t.detail.compare.title}</caption>
            <thead>
              <tr>
                <th scope="col">{t.detail.compare.provider}</th>
                <th scope="col">{t.detail.compare.freeTier}</th>
                <th scope="col">{t.detail.compare.limits}</th>
                <th scope="col">{t.detail.compare.card}</th>
                <th scope="col">{t.detail.compare.signup}</th>
                <th scope="col">{t.detail.compare.tools}</th>
                <th scope="col">{t.detail.compare.verification}</th>
                <th scope="col">{t.detail.compare.checked}</th>
                <th scope="col">{t.detail.compare.config}</th>
              </tr>
            </thead>
            <tbody>
              {group.offers.map((offer) => (
                <CompareRow key={offer.provider.id} offer={offer} />
              ))}
            </tbody>
          </table>
        </div>

        <ul className="compare-notes">
          <li>{t.detail.compare.cardNote}</li>
          <li>{t.detail.compare.scopeNote}</li>
          <li>{t.detail.compare.openNote}</li>
        </ul>
      </Section>

      <Section title={t.detail.sections.performance}>
        <p className="section-note">{t.detail.perfNote}</p>
        <PerformanceList refs={group.offers[0]?.model.performance ?? []} />
      </Section>
    </>
  );
}

function CompareRow({ offer }: { offer: Offer }) {
  const { locale, t } = useI18n();
  const { model, provider } = offer;
  const limits = sortedLimits(model.free_tier.limits).slice(0, 3);
  const checked = latestCheck(model);
  const summary = verificationSummary(model);
  const ended = model.free_tier.availability === "ended";

  return (
    <tr className={ended ? "is-ended" : undefined}>
      <th scope="row">
        <Link to={withLocale(offerPath(offer), locale)} className="model-link">
          {provider.name}
        </Link>
        <span className="model-row__meta">
          <code>{model.model_id}</code>
        </span>
      </th>
      <td>
        <span className="free-cell">
          <AvailabilityMark availability={model.free_tier.availability} />
          <FreeTierBadge type={model.free_tier.type} muted={ended} />
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
                <span className="limit-list__scope">{limitScopeLabelWith(t, limit.scope)}</span>
              </li>
            ))}
            {model.free_tier.limits.length > 3 ? (
              <li className="muted">{t.table.more(model.free_tier.limits.length - 3)}</li>
            ) : null}
          </ul>
        )}
      </td>
      <td>
        {provider.credit_card_required === "yes"
          ? t.detail.cardRequired
          : provider.credit_card_required === "no"
            ? t.detail.cardNotRequired
            : t.table.unknown}
      </td>
      <td>
        <span className={`signup signup--${provider.signup_friction ?? "unknown"}`}>
          {signupFrictionLabelWith(t, provider.signup_friction ?? "unknown")}
        </span>
      </td>
      <td>
        <TristateBadge value={model.capabilities.tool_calling} />
      </td>
      <td>
        <VerificationBadge status={summary.status} passed={summary.passed} total={summary.total} />
      </td>
      <td>
        {checked ? (
          <span className="checked-cell">
            <time dateTime={checked}>{formatDateLocale(checked, locale)}</time>
          </span>
        ) : (
          <span className="muted">{t.table.unknown}</span>
        )}
      </td>
      <td>
        {ended ? (
          <span className="muted">—</span>
        ) : (
          <Link to={withLocale(offerPath(offer), locale)} className="text-link">
            {t.detail.compare.open}
          </Link>
        )}
      </td>
    </tr>
  );
}

function PerformanceList({ refs }: { refs: ModelGroup["offers"][number]["model"]["performance"] }) {
  const { t } = useI18n();
  if (refs.length === 0) {
    return <p className="empty-note">{t.detail.perfNone}</p>;
  }
  return (
    <ul className="perf-list">
      {refs.map((ref) => (
        <li key={`${ref.benchmark}-${ref.url}`}>
          <a href={ref.url} target="_blank" rel="noreferrer noopener">
            {ref.benchmark}
          </a>
          {ref.as ? (
            <span className="perf-list__as">
              {t.detail.perfAs} <code>{ref.as}</code>
            </span>
          ) : null}
          {ref.note ? <span className="perf-list__note">{ref.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function ModelDetail({ group, offer }: { group: ModelGroup; offer: Offer }) {
  const { locale, t } = useI18n();
  const { model, provider } = offer;
  const checked = latestCheck(model);
  const freshness = checked ? freshnessAt(checked, LOADED_AT_MS) : null;
  const limits = sortedLimits(model.free_tier.limits);
  // 生成は純粋で軽いので、メモ化せず素直に呼ぶ（React Compiler が自動で扱う）。
  const config = buildOpencodeConfig(provider, model, { locale });

  const siblings = group.offers.filter((entry) => entry.provider.id !== provider.id);

  return (
    <>
      <nav className="breadcrumb" aria-label={t.nav.mainLabel}>
        <Link to={withLocale("/", locale)}>{t.detail.breadcrumbModels}</Link>
        <span aria-hidden="true">/</span>
        <Link to={withLocale(`/models/${group.canonical.id}`, locale)}>{group.canonical.name}</Link>
        <span aria-hidden="true">/</span>
        <span>{provider.name}</span>
      </nav>

      <header className="detail-head">
        <div>
          <p className="detail-head__provider">
            {t.detail.compareIn
              .replace("{model}", group.canonical.name)
              .replace("{provider}", provider.name)}
          </p>
          <h1>{group.canonical.name}</h1>
          <p className="detail-head__id">
            <code>{model.model_id}</code>
          </p>
        </div>
        <div className="detail-head__badges">
          <FreeTierBadge
            type={model.free_tier.type}
            muted={model.free_tier.availability === "ended"}
          />
          <span className="availability-text">
            <AvailabilityMark availability={model.free_tier.availability} />
            {availabilityLabelWith(t, model.free_tier.availability)}
          </span>
        </div>
      </header>

      {group.offers.length > 1 ? (
        <p className="sibling-banner">
          {t.detail.othersBanner(siblings.length)}
          <Link to={withLocale(`/models/${group.canonical.id}`, locale)}>
            {t.detail.providerCompare}
          </Link>
        </p>
      ) : null}

      {model.free_tier.availability === "ended" ? (
        <p className="callout callout--stop" role="alert">
          {t.detail.endedCallout}
        </p>
      ) : null}

      {freshness === "stale" && checked ? (
        <p className="callout callout--warn" role="status">
          {t.detail.staleCallout(daysSinceMs(checked, LOADED_AT_MS))}
        </p>
      ) : null}

      <div className="detail-grid">
        <div className="detail-main">
          <Section title={t.detail.sections.freeTier}>
            <p className="section-note">{t.detail.freeTierNote}</p>

            <dl className="facts">
              <div>
                <dt>{t.detail.type}</dt>
                <dd>
                  <FreeTierBadge type={model.free_tier.type} />
                </dd>
              </div>
              <div>
                <dt>{t.detail.status}</dt>
                <dd>{availabilityLabelWith(t, model.free_tier.availability)}</dd>
              </div>
              <div>
                <dt>{t.detail.requirements}</dt>
                <dd>
                  {model.free_tier.requirements.length === 0
                    ? t.detail.noRequirements
                    : model.free_tier.requirements
                        .map((req) => translateText(req, locale))
                        .join(" / ")}
                </dd>
              </div>
              <div>
                <dt>{t.detail.quota}</dt>
                <dd>
                  {model.free_tier.quota.kind === "none"
                    ? t.detail.quotaNone
                    : model.free_tier.quota.kind === "unknown"
                      ? t.table.unknown
                      : formatQuota(model.free_tier.quota, locale, t)}
                </dd>
              </div>
              {model.free_tier.expires_on ? (
                <div>
                  <dt>{t.detail.expiry}</dt>
                  <dd>{formatDateLocale(model.free_tier.expires_on, locale)}</dd>
                </div>
              ) : null}
            </dl>

            {model.free_tier.caveats.length > 0 ? (
              <ul className="caveats">
                {model.free_tier.caveats.map((caveat) => (
                  <li key={caveat}>{translateText(caveat, locale)}</li>
                ))}
              </ul>
            ) : null}
          </Section>

          <Section title={t.detail.sections.rateLimits}>
            {limits.length === 0 ? (
              <p className="empty-note">
                {t.detail.noLimitsDocs}
                {model.free_tier.quota.kind === "neurons" ||
                model.free_tier.quota.kind === "currency"
                  ? t.detail.noLimitsQuotaHint
                  : ""}
              </p>
            ) : (
              <table className="limit-table">
                <caption className="sr-only">{t.detail.sections.rateLimits}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.detail.unit}</th>
                    <th scope="col">{t.detail.value}</th>
                    <th scope="col">{t.detail.scope}</th>
                    <th scope="col">{t.detail.notes}</th>
                  </tr>
                </thead>
                <tbody>
                  {limits.map((limit) => (
                    <tr key={`${limit.metric}-${limit.scope}`}>
                      <th scope="row">
                        {limitMetricLabelWith(t, limit.metric)}
                        <span className="limit-table__long">
                          {limitMetricLongWith(t, limit.metric)}
                        </span>
                      </th>
                      <td className="num">{formatLimitValue(limit)}</td>
                      <td>{limitScopeLabelWith(t, limit.scope)}</td>
                      <td>
                        {limit.note ? (
                          translateText(limit.note, locale)
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title={t.detail.sections.connection}>
            <dl className="facts">
              <div>
                <dt>{t.detail.apiFormat}</dt>
                <dd>{apiFormatLabelWith(t, provider.api_format)}</dd>
              </div>
              <div>
                <dt>{t.detail.baseUrl}</dt>
                <dd>
                  {provider.base_url ? (
                    <code className="wrap">{provider.base_url}</code>
                  ) : (
                    t.detail.baseUrlUnknown
                  )}
                </dd>
              </div>
              <div>
                <dt>{t.detail.auth}</dt>
                <dd>{authLabelWith(t, provider.authentication)}</dd>
              </div>
              <div>
                <dt>{t.detail.card}</dt>
                <dd>
                  {provider.credit_card_required === "yes"
                    ? t.detail.cardRequired
                    : provider.credit_card_required === "no"
                      ? t.detail.cardNotRequired
                      : t.table.unknown}
                </dd>
              </div>
              <div>
                <dt>{t.detail.signupEffort}</dt>
                <dd>{signupFrictionLabelWith(t, provider.signup_friction)}</dd>
              </div>
              <div>
                <dt>{t.detail.opencodeNative}</dt>
                <dd>
                  {provider.native_opencode === "yes"
                    ? t.detail.nativeYes(provider.opencode_provider_id ?? "-")
                    : provider.native_opencode === "no"
                      ? t.detail.nativeNo
                      : t.detail.nativeUnknown}
                </dd>
              </div>
              <div>
                <dt>{t.table.context}</dt>
                <dd>
                  {model.context_tokens
                    ? t.detail.contextTokens(formatTokens(model.context_tokens))
                    : t.table.unknown}
                </dd>
              </div>
              <div>
                <dt>{t.detail.maxOutput}</dt>
                <dd>
                  {model.max_output_tokens
                    ? t.detail.contextTokens(formatTokens(model.max_output_tokens))
                    : t.table.unknown}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title={t.detail.sections.performance}>
            <p className="section-note">{t.detail.perfNote}</p>
            <PerformanceList refs={model.performance} />
          </Section>

          <Section title={t.detail.sections.capabilities}>
            <div className="two-col">
              <div>
                <h3 className="subhead">{t.detail.documented}</h3>
                <ul className="cap-list">
                  {(
                    [
                      ["tool_calling", t.verification["tool-calling"]],
                      ["streaming", t.verification.streaming],
                      ["json_mode", t.verification["json-mode"]],
                      ["reasoning", t.verification.reason],
                    ] as const
                  ).map(([key, label]) => (
                    <li key={key}>
                      <span>{label}</span>
                      <span className={`cap-value cap-value--${model.capabilities[key]}`}>
                        {tristateLabelWith(t, model.capabilities[key])}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="section-note small">{t.detail.capNote}</p>
              </div>

              <div>
                <h3 className="subhead">{t.detail.tested}</h3>
                {model.verification.length === 0 ? (
                  <p className="empty-note">{t.detail.noVerification}</p>
                ) : (
                  <ul className="verification-list">
                    {model.verification.map((item) => (
                      <li key={item.method}>
                        <span className="verification-list__method">
                          {verificationMethodLabelWith(t, item.method)}
                        </span>
                        <span
                          className={`cap-value cap-value--${
                            item.status === "passed"
                              ? "yes"
                              : item.status === "failed"
                                ? "no"
                                : "unknown"
                          }`}
                        >
                          {verificationStatusLabelWith(t, item.status)}
                        </span>
                        {item.tested_at ? (
                          <span className="verification-list__meta">
                            {item.tested_at}
                            {item.opencode_version ? ` / OpenCode ${item.opencode_version}` : ""}
                          </span>
                        ) : (
                          <span className="verification-list__meta">{t.detail.noTestDate}</span>
                        )}
                        {item.notes ? (
                          <span className="verification-list__notes">
                            {translateText(item.notes, locale)}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="section-note small">
                  {t.detail.verificationNote}{" "}
                  <Link to={withLocale("/method", locale)}>{t.nav.method}</Link>
                </p>
              </div>
            </div>
          </Section>

          {model.caveats.length > 0 ? (
            <Section title={t.detail.sections.caveats}>
              <ul className="caveats">
                {model.caveats.map((caveat) => (
                  <li key={caveat}>{translateText(caveat, locale)}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title={t.detail.sections.sources}>
            <ul className="source-list">
              {model.sources.map((source, index) => {
                const status = freshnessAt(source.checked_at, LOADED_AT_MS);
                return (
                  <li key={`${source.source_url}-${index}`}>
                    <p className="source-list__field">
                      {translateText(source.field, locale)}
                      <span className={`source-type source-type--${source.source_type}`}>
                        {source.source_type === "official"
                          ? t.detail.primarySource
                          : source.source_type === "community"
                            ? t.detail.communitySource
                            : t.detail.testSource}
                      </span>
                    </p>
                    <p className="source-list__value">{translateText(source.value, locale)}</p>
                    <p className="source-list__meta">
                      <a href={source.source_url} rel="noreferrer noopener" target="_blank">
                        {source.source_url}
                      </a>
                      <span>
                        {t.detail.checkedOn}{" "}
                        <time dateTime={source.checked_at}>
                          {formatDateLocale(source.checked_at, locale)}
                        </time>
                      </span>
                      {source.observed_at ? (
                        <span>
                          {t.detail.observedOn} {formatDateLocale(source.observed_at, locale)}
                        </span>
                      ) : null}
                      <span>
                        {t.detail.confidence}{" "}
                        {source.confidence === "high"
                          ? t.detail.confidenceHigh
                          : source.confidence === "medium"
                            ? t.detail.confidenceMedium
                            : t.detail.confidenceLow}
                      </span>
                      {status !== "fresh" ? (
                        <FreshnessNote freshness={status} checkedAt={source.checked_at} />
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Section>

          {provider.notes.length > 0 ? (
            <Section title={t.detail.sections.providerNotes}>
              <ul className="caveats">
                {provider.notes.map((note) => (
                  <li key={note}>{translateText(note, locale)}</li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <aside className="detail-aside">
          <ConfigPanel config={config} provider={provider} model={model} />

          <div className="aside-block">
            <h2>{t.detail.howToGet}</h2>
            <ol className="steps">
              {setupSteps(provider, locale).map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="aside-note">
              {t.detail.keyFrom}:{" "}
              <a href={provider.signup_url} target="_blank" rel="noreferrer noopener">
                {provider.signup_url}
              </a>
            </p>
            <p className="aside-note">
              {t.detail.docs}:{" "}
              <a href={provider.docs_url} target="_blank" rel="noreferrer noopener">
                {provider.docs_url}
              </a>
            </p>
          </div>

          <div className="aside-block">
            <h2>{t.detail.otherProviders}</h2>
            {siblings.length === 0 ? (
              <p className="aside-note">{t.detail.noOtherProviders}</p>
            ) : (
              <ul className="sibling-list">
                {siblings.map((sibling) => (
                  <li key={sibling.provider.id}>
                    <Link to={withLocale(offerPath(sibling), locale)}>{sibling.provider.name}</Link>
                    <FreeTierBadge
                      type={sibling.model.free_tier.type}
                      muted={sibling.model.free_tier.availability === "ended"}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="aside-block">
            <h2>{t.detail.readingNumbers}</h2>
            <p className="aside-note">
              {t.detail.readingNumbersBody(model.free_tier.limits.length)}
            </p>
            <p className="aside-note">{t.detail.readingFreshness}</p>
          </div>
        </aside>
      </div>
    </>
  );
}

function formatQuota(
  quota: {
    kind: string;
    amount: number | null;
    currency?: string;
    period: string;
  },
  locale: "en" | "ja",
  t: ReturnType<typeof useI18n>["t"],
): string {
  void t;
  const amount =
    quota.amount === null ? (locale === "ja" ? "不明" : "unknown") : formatNumber(quota.amount);
  const unit =
    quota.kind === "currency"
      ? (quota.currency ?? "")
      : quota.kind === "neurons"
        ? "Neurons"
        : quota.kind === "requests"
          ? locale === "ja"
            ? "リクエスト"
            : "requests"
          : quota.kind === "tokens"
            ? locale === "ja"
              ? "トークン"
              : "tokens"
            : quota.kind === "credits"
              ? locale === "ja"
                ? "クレジット"
                : "credits"
              : "";
  const period =
    quota.period === "day"
      ? locale === "ja"
        ? " / 日"
        : " / day"
      : quota.period === "month"
        ? locale === "ja"
          ? " / 月"
          : " / month"
        : quota.period === "one-time"
          ? locale === "ja"
            ? "（一度きり）"
            : " (one-time)"
          : "";
  return `${amount} ${unit}${period}`.trim();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="detail-section" aria-labelledby={`s-${title}`}>
      <h2 id={`s-${title}`}>{title}</h2>
      {children}
    </section>
  );
}

function ConfigPanel({
  config,
  provider,
  model,
}: {
  config: ReturnType<typeof buildOpencodeConfig>;
  provider: { id: string; name: string } & Record<string, unknown>;
  model: { free_tier: { availability: string } };
}) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(true);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(config.json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (model.free_tier.availability === "ended") {
    return (
      <div className="config-panel">
        <h2>{t.config.title}</h2>
        <p className="empty-note">{t.config.unavailable}</p>
      </div>
    );
  }

  return (
    <div className="config-panel">
      <h2>{t.config.title}</h2>

      {config.blockers.length > 0 ? (
        <ul className="blockers">
          {config.blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
      ) : null}

      {config.json ? (
        <>
          <div className="config-panel__bar">
            <span className={`strategy strategy--${config.strategy}`}>
              {config.strategy === "native" ? t.config.native : t.config.compatible}
            </span>
            <button type="button" className="ghost-button" onClick={() => setRevealed((v) => !v)}>
              {revealed ? t.config.hide : t.config.show}
            </button>
            <button type="button" className="copy-button" onClick={copy}>
              {copied ? t.config.copied : t.config.copy}
            </button>
          </div>

          {revealed ? (
            <pre className="config-code" tabIndex={0} aria-label={t.config.label(provider.name)}>
              <code>{config.json}</code>
            </pre>
          ) : null}

          <p className="config-panel__warn">
            {t.config.noKey} <code>{keyEnvVar(provider as never)}</code>. {t.config.privacy}
          </p>
        </>
      ) : null}

      {config.notes.length > 0 ? (
        <ul className="config-notes">
          {config.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
