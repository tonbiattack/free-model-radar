import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { dataset } from "@/lib/dataset";
import { groupModels, offerPath, type ModelGroup, type Offer } from "@/lib/groups";
import { LOADED_AT_MS } from "@/lib/clock";
import {
  daysSinceMs,
  formatDate,
  formatDateTime,
  formatLimitValue,
  formatNumber,
  formatTokens,
  freshnessAt,
  latestCheck,
  sortedLimits,
  verificationSummary,
} from "@/lib/format";
import {
  apiFormatLabel,
  authLabel,
  availabilityLabel,
  freeTierTypeDescription,
  freeTierTypeLabel,
  limitMetricLabel,
  limitMetricLong,
  limitScopeLabel,
  signupFrictionDescription,
  signupFrictionLabel,
  tristateLabel,
  verificationMethodLabel,
  verificationStatusLabel,
} from "@/lib/labels";
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
  const { modelId, providerId } = useParams<{ modelId: string; providerId?: string }>();
  const group = groupModels(dataset).find((entry) => entry.canonical.id === modelId);

  if (!group) {
    return <NotFoundPage reason="指定されたモデルが見つかりませんでした。" />;
  }

  if (!providerId) {
    return <ModelOverview group={group} />;
  }

  const offer = group.offers.find((entry) => entry.provider.id === providerId);
  if (!offer) {
    return (
      <NotFoundPage reason={`${group.canonical.name} は指定された提供元では扱われていません。`} />
    );
  }

  return <ModelDetail group={group} offer={offer} />;
}

/**
 * モデル本体の概要と、提供元の比較表。
 * 「このモデルを無料で使える提供元」を横断して比べるのがこの画面の役割。
 */
function ModelOverview({ group }: { group: ModelGroup }) {
  const name = group.canonical.name;
  const liveOffers = group.offers.filter((offer) => offer.model.free_tier.availability !== "ended");
  const shown = liveOffers.length > 0 ? liveOffers : group.offers;

  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link to="/">モデル一覧</Link>
        <span aria-hidden="true">/</span>
        <span>{name}</span>
      </nav>

      <header className="detail-head">
        <div>
          <p className="detail-head__provider">{group.canonical.developer}</p>
          <h1>{name}</h1>
          <p className="detail-head__id">
            無料で使える提供元 {shown.length} 件
            {group.offers.length > shown.length
              ? `（終了 ${group.offers.length - shown.length} 件）`
              : ""}
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
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <Section title="このモデルを無料で使える提供元">
        <p className="section-note">
          同じモデルでも、提供元によって無料枠の種別・制限・登録の手間が違います。
          数値は単位と適用範囲が揃っている場合だけ比較できるため、単純な優劣はつけていません。
        </p>

        <div className="compare-wrap">
          <table className="compare-table">
            <caption className="sr-only">
              {name} を提供する事業者の比較。提供元ごとに条件が異なります。
            </caption>
            <thead>
              <tr>
                <th scope="col">提供元</th>
                <th scope="col">無料枠</th>
                <th scope="col">主な制限</th>
                <th scope="col">カード</th>
                <th scope="col">登録</th>
                <th scope="col">ツール</th>
                <th scope="col">検証</th>
                <th scope="col">確認日</th>
                <th scope="col">設定</th>
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
          <li>
            「カード」はクレジットカード登録の要否です。「不明」は登録が要るという意味ではありません。
          </li>
          <li>制限の適用範囲が違うため、数値の大きさだけでは比較できません。</li>
          <li>提供元ごとの詳しい条件と OpenCode の設定例は、提供元名から開けます。</li>
        </ul>
      </Section>

      <Section title="性能">
        <p className="section-note">
          性能はこのサイトで測っていません。モデル単位の比較ページへリンクします。
          提供元が違っても同じモデルなら同じ数値が載っていますが、配信構成の違いで実測は変わり得ます。
        </p>
        <PerformanceList refs={group.offers[0]?.model.performance ?? []} />
      </Section>
    </>
  );
}

function CompareRow({ offer }: { offer: Offer }) {
  const { model, provider } = offer;
  const limits = sortedLimits(model.free_tier.limits).slice(0, 3);
  const checked = latestCheck(model);
  const summary = verificationSummary(model);
  const ended = model.free_tier.availability === "ended";

  return (
    <tr className={ended ? "is-ended" : undefined}>
      <th scope="row">
        <Link to={offerPath(offer)} className="model-link">
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
          <span className="muted">記載なし</span>
        ) : (
          <ul className="limit-list">
            {limits.map((limit) => (
              <li key={`${limit.metric}-${limit.scope}`}>
                <span className="limit-list__metric">{limitMetricLabel[limit.metric]}</span>
                <span className="limit-list__value">{formatLimitValue(limit)}</span>
                <span className="limit-list__scope">{limitScopeLabel[limit.scope]}</span>
              </li>
            ))}
            {model.free_tier.limits.length > 3 ? (
              <li className="muted">他 {model.free_tier.limits.length - 3} 件</li>
            ) : null}
          </ul>
        )}
      </td>
      <td>
        {provider.credit_card_required === "yes"
          ? "必要"
          : provider.credit_card_required === "no"
            ? "不要"
            : "不明"}
      </td>
      <td>
        <span className={`signup signup--${provider.signup_friction ?? "unknown"}`}>
          {signupFrictionLabel[provider.signup_friction ?? "unknown"]}
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
            <time dateTime={checked}>{formatDate(checked)}</time>
          </span>
        ) : (
          <span className="muted">不明</span>
        )}
      </td>
      <td>
        {ended ? (
          <span className="muted">—</span>
        ) : (
          <Link to={offerPath(offer)} className="text-link">
            開く
          </Link>
        )}
      </td>
    </tr>
  );
}

function PerformanceList({ refs }: { refs: ModelGroup["offers"][number]["model"]["performance"] }) {
  if (refs.length === 0) {
    return <p className="empty-note">性能の参照先が登録されていません。</p>;
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
              リンク先での表記: <code>{ref.as}</code>
            </span>
          ) : null}
          {ref.note ? <span className="perf-list__note">{ref.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function ModelDetail({ group, offer }: { group: ModelGroup; offer: Offer }) {
  const { model, provider } = offer;
  const checked = latestCheck(model);
  const freshness = checked ? freshnessAt(checked, LOADED_AT_MS) : null;
  const limits = sortedLimits(model.free_tier.limits);
  // 生成は純粋で軽いので、メモ化せず素直に呼ぶ（React Compiler が自動で扱う）。
  const config = buildOpencodeConfig(provider, model);

  // 同じモデルの他の提供元。比較へ戻る導線として出す。
  const siblings = group.offers.filter((entry) => entry.provider.id !== provider.id);

  return (
    <>
      <nav className="breadcrumb" aria-label="パンくず">
        <Link to="/">モデル一覧</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/models/${group.canonical.id}`}>{group.canonical.name}</Link>
        <span aria-hidden="true">/</span>
        <span>{provider.name}</span>
      </nav>

      <header className="detail-head">
        <div>
          <p className="detail-head__provider">
            {group.canonical.name} を {provider.name} で使う
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
            {availabilityLabel[model.free_tier.availability]}
          </span>
        </div>
      </header>

      {group.offers.length > 1 ? (
        <p className="sibling-banner">
          このモデルは他に {siblings.length} 件の提供元があります。
          <Link to={`/models/${group.canonical.id}`}>提供元を比較する</Link>
        </p>
      ) : null}

      {model.free_tier.availability === "ended" ? (
        <p className="callout callout--stop" role="alert">
          この無料枠は現在利用できません。設定に使わないでください。
        </p>
      ) : null}

      {freshness === "stale" && checked ? (
        <p className="callout callout--warn" role="status">
          最終確認から {daysSinceMs(checked, LOADED_AT_MS)} 日経過しています。
          条件が変わっている可能性があるため、下の出典で最新の内容を確認してください。
        </p>
      ) : null}

      <div className="detail-grid">
        <div className="detail-main">
          <Section title="無料枠">
            <p className="section-note">{freeTierTypeDescription[model.free_tier.type]}</p>

            <dl className="facts">
              <div>
                <dt>種別</dt>
                <dd>{freeTierTypeLabel[model.free_tier.type]}</dd>
              </div>
              <div>
                <dt>現在の状態</dt>
                <dd>{availabilityLabel[model.free_tier.availability]}</dd>
              </div>
              <div>
                <dt>前提条件</dt>
                <dd>
                  {model.free_tier.requirements.length === 0
                    ? "公式に前提の記載なし"
                    : model.free_tier.requirements.join(" / ")}
                </dd>
              </div>
              <div>
                <dt>クレジット・総量</dt>
                <dd>
                  {model.free_tier.quota.kind === "none"
                    ? "なし（数値制限のみ）"
                    : model.free_tier.quota.kind === "unknown"
                      ? "不明"
                      : formatQuota(model.free_tier.quota)}
                </dd>
              </div>
              {model.free_tier.expires_on ? (
                <div>
                  <dt>期限</dt>
                  <dd>{formatDate(model.free_tier.expires_on)}</dd>
                </div>
              ) : null}
            </dl>

            {model.free_tier.caveats.length > 0 ? (
              <ul className="caveats">
                {model.free_tier.caveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            ) : null}
          </Section>

          <Section title="レート制限">
            {limits.length === 0 ? (
              <p className="empty-note">
                公式に数値の記載がありません。これは「0」や「利用不可」ではなく、
                <strong>確認できていない</strong>という意味です。
                {model.free_tier.quota.kind === "neurons" ||
                model.free_tier.quota.kind === "currency"
                  ? " 総量枠（クレジット）で管理されている可能性があります。"
                  : ""}
              </p>
            ) : (
              <table className="limit-table">
                <caption className="sr-only">レート制限の数値・単位・適用範囲</caption>
                <thead>
                  <tr>
                    <th scope="col">単位</th>
                    <th scope="col">値</th>
                    <th scope="col">適用範囲</th>
                    <th scope="col">補足</th>
                  </tr>
                </thead>
                <tbody>
                  {limits.map((limit) => (
                    <tr key={`${limit.metric}-${limit.scope}`}>
                      <th scope="row">
                        {limitMetricLabel[limit.metric]}
                        <span className="limit-table__long">{limitMetricLong[limit.metric]}</span>
                      </th>
                      <td className="num">{formatLimitValue(limit)}</td>
                      <td>{limitScopeLabel[limit.scope]}</td>
                      <td>{limit.note ?? <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="接続情報">
            <dl className="facts">
              <div>
                <dt>API 形式</dt>
                <dd>{apiFormatLabel[provider.api_format]}</dd>
              </div>
              <div>
                <dt>ベース URL</dt>
                <dd>
                  {provider.base_url ? (
                    <code className="wrap">{provider.base_url}</code>
                  ) : (
                    "不明（公式に記載なし）"
                  )}
                </dd>
              </div>
              <div>
                <dt>認証</dt>
                <dd>{authLabel[provider.authentication]}</dd>
              </div>
              <div>
                <dt>クレジットカード</dt>
                <dd>
                  {provider.credit_card_required === "yes"
                    ? "登録が必要"
                    : provider.credit_card_required === "no"
                      ? "不要"
                      : "不明"}
                </dd>
              </div>
              <div>
                <dt>キー取得までの手間</dt>
                <dd>
                  {signupFrictionLabel[provider.signup_friction]}
                  <span className="facts__note">
                    {signupFrictionDescription[provider.signup_friction]}
                  </span>
                </dd>
              </div>
              <div>
                <dt>OpenCode ネイティブ対応</dt>
                <dd>
                  {provider.native_opencode === "yes"
                    ? `対応（カタログ ID: ${provider.opencode_provider_id}）`
                    : provider.native_opencode === "no"
                      ? "未対応（カスタム設定が必要）"
                      : "不明"}
                </dd>
              </div>
              <div>
                <dt>コンテキスト長</dt>
                <dd>
                  {model.context_tokens ? `${formatTokens(model.context_tokens)} トークン` : "不明"}
                </dd>
              </div>
              <div>
                <dt>最大出力</dt>
                <dd>
                  {model.max_output_tokens
                    ? `${formatTokens(model.max_output_tokens)} トークン`
                    : "不明"}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="性能">
            <p className="section-note">
              性能はこのサイトで測っていません。モデルの比較ページへリンクします。
            </p>
            <PerformanceList refs={model.performance} />
          </Section>

          <Section title="機能と検証">
            <div className="two-col">
              <div>
                <h3 className="subhead">公式記載</h3>
                <ul className="cap-list">
                  {(
                    [
                      ["tool_calling", "ツール呼び出し"],
                      ["streaming", "ストリーミング"],
                      ["json_mode", "JSON モード"],
                      ["reasoning", "推論（reasoning）"],
                    ] as const
                  ).map(([key, label]) => (
                    <li key={key}>
                      <span>{label}</span>
                      <span className={`cap-value cap-value--${model.capabilities[key]}`}>
                        {tristateLabel[model.capabilities[key]]}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="section-note small">
                  「不明」は公式ドキュメントで確認できなかった項目です。非対応とは限りません。
                </p>
              </div>

              <div>
                <h3 className="subhead">実機検証</h3>
                {model.verification.length === 0 ? (
                  <p className="empty-note">検証の記録がありません。</p>
                ) : (
                  <ul className="verification-list">
                    {model.verification.map((item) => (
                      <li key={item.method}>
                        <span className="verification-list__method">
                          {verificationMethodLabel[item.method]}
                        </span>
                        <span
                          className={`cap-value cap-value--${item.status === "passed" ? "yes" : item.status === "failed" ? "no" : "unknown"}`}
                        >
                          {verificationStatusLabel[item.status]}
                        </span>
                        {item.tested_at ? (
                          <span className="verification-list__meta">
                            {formatDateTime(item.tested_at)}
                            {item.opencode_version ? ` / OpenCode ${item.opencode_version}` : ""}
                          </span>
                        ) : (
                          <span className="verification-list__meta">実施日なし</span>
                        )}
                        {item.notes ? (
                          <span className="verification-list__notes">{item.notes}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="section-note small">
                  単発の成功は長時間のエージェント利用を保証しません。検証条件は
                  <Link to="/method">調べ方</Link>にまとめています。
                </p>
              </div>
            </div>
          </Section>

          {model.caveats.length > 0 ? (
            <Section title="エージェント用途の注意">
              <ul className="caveats">
                {model.caveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="出典と確認日">
            <ul className="source-list">
              {model.sources.map((source, index) => {
                const status = freshnessAt(source.checked_at, LOADED_AT_MS);
                return (
                  <li key={`${source.source_url}-${index}`}>
                    <p className="source-list__field">
                      {source.field}
                      <span className={`source-type source-type--${source.source_type}`}>
                        {source.source_type === "official"
                          ? "公式"
                          : source.source_type === "community"
                            ? "コミュニティ"
                            : "実機検証"}
                      </span>
                    </p>
                    <p className="source-list__value">{source.value}</p>
                    <p className="source-list__meta">
                      <a href={source.source_url} rel="noreferrer noopener" target="_blank">
                        {source.source_url}
                      </a>
                      <span>
                        確認{" "}
                        <time dateTime={source.checked_at}>{formatDate(source.checked_at)}</time>
                      </span>
                      {source.observed_at ? (
                        <span>元情報の日付 {formatDate(source.observed_at)}</span>
                      ) : null}
                      <span>信頼度 {confidenceLabel[source.confidence]}</span>
                      {status !== "fresh" ? (
                        <FreshnessNote freshness={status} checkedAt={source.checked_at} />
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title="プロバイダーの注意">
            <ul className="caveats">
              {provider.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Section>
        </div>

        <aside className="detail-aside">
          <ConfigPanel config={config} provider={provider} model={model} />

          <div className="aside-block">
            <h2>入手手順</h2>
            <ol className="steps">
              {setupSteps(provider).map((step) => (
                <li key={step}>{step.replace(/^\d+\.\s*/, "")}</li>
              ))}
            </ol>
            <p className="aside-note">
              キーの取得先:{" "}
              <a href={provider.signup_url} target="_blank" rel="noreferrer noopener">
                {provider.signup_url}
              </a>
            </p>
            <p className="aside-note">
              ドキュメント:{" "}
              <a href={provider.docs_url} target="_blank" rel="noreferrer noopener">
                {provider.docs_url}
              </a>
            </p>
          </div>

          <div className="aside-block">
            <h2>同じモデルの他の提供元</h2>
            {siblings.length === 0 ? (
              <p className="aside-note">このモデルを扱う他の提供元はありません。</p>
            ) : (
              <ul className="sibling-list">
                {siblings.map((sibling) => (
                  <li key={sibling.provider.id}>
                    <Link to={offerPath(sibling)}>{sibling.provider.name}</Link>
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
            <h2>数値の読み方</h2>
            <p className="aside-note">
              制限値は公式ドキュメントの記載をそのまま載せています。
              {formatNumber(model.free_tier.limits.length)} 件の数値制限のうち、
              適用範囲が「モデル単位」でないものは、他のモデルと枠を共有している可能性があります。
            </p>
            <p className="aside-note">
              最終確認から 45
              日を超えた項目には注意表示を付けています。判断は出典を見て行ってください。
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

const confidenceLabel = { high: "高", medium: "中", low: "低" } as const;

function formatQuota(
  quota: NonNullable<(typeof dataset.models)[number]["free_tier"]["quota"]>,
): string {
  const amount = quota.amount === null ? "不明" : formatNumber(quota.amount);
  const unit =
    quota.kind === "currency"
      ? (quota.currency ?? "")
      : quota.kind === "neurons"
        ? "Neurons"
        : quota.kind === "requests"
          ? "リクエスト"
          : quota.kind === "tokens"
            ? "トークン"
            : quota.kind === "credits"
              ? "クレジット"
              : "";
  const period =
    quota.period === "day"
      ? " / 日"
      : quota.period === "month"
        ? " / 月"
        : quota.period === "one-time"
          ? "（一度きり）"
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
  const [copied, setCopied] = useState(false);
  const [revealed, setRevealed] = useState(true);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(config.json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードが使えない環境では選択状態にして手動コピーを促す
      setCopied(false);
    }
  };

  if (model.free_tier.availability === "ended") {
    return (
      <div className="config-panel">
        <h2>OpenCode 設定</h2>
        <p className="empty-note">終了したサービスのため、設定例は提供していません。</p>
      </div>
    );
  }

  return (
    <div className="config-panel">
      <h2>OpenCode 設定例</h2>

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
              {config.strategy === "native" ? "ネイティブ対応" : "OpenAI 互換として追加"}
            </span>
            <button type="button" className="ghost-button" onClick={() => setRevealed((v) => !v)}>
              {revealed ? "隠す" : "表示"}
            </button>
            <button type="button" className="copy-button" onClick={copy}>
              {copied ? "コピーしました" : "コピー"}
            </button>
          </div>

          {revealed ? (
            <pre
              className="config-code"
              tabIndex={0}
              aria-label={`${provider.name} の opencode.json 設定例`}
            >
              <code>{config.json}</code>
            </pre>
          ) : null}

          <p className="config-panel__warn">
            API キーは含まれていません。環境変数 <code>{keyEnvVar(provider as never)}</code>{" "}
            に自分のキーを設定してください。 当サイトはキーを入力・送信・保存しません。
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
