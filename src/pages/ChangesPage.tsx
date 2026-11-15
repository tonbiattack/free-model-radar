import { Link } from "react-router-dom";
import { dataset, providersById } from "@/lib/dataset";
import { translateText } from "@/lib/data-i18n";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { withLocale } from "@/lib/locale";

export function ChangesPage() {
  const { locale, t } = useI18n();
  const entries = [...dataset.changelog].sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  const pending = entries.filter((entry) => entry.review_status === "pending").length;

  const reviewLabel: Record<string, string> = {
    pending: t.changes.statusPending,
    confirmed: t.changes.statusConfirmed,
    rejected: t.changes.statusRejected,
    "auto-applied": t.changes.statusAuto,
  };

  return (
    <>
      <header className="page-head">
        <h1>{t.changes.title}</h1>
        <p>
          {t.changes.intro}
          {pending > 0 ? t.changes.pending(pending) : null}
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="empty-note">{t.changes.empty}</p>
      ) : (
        <ol className="changelog">
          {entries.map((entry) => {
            const targetId = entry.entity_id.replace(/^(provider|model):/, "");
            const provider = providersById.get(targetId);
            const group = dataset.canonical_models.find((canonical) => canonical.id === targetId);
            const model = dataset.models.find((m) => m.id === targetId);

            return (
              <li key={`${entry.entity_id}-${entry.field}-${entry.detected_at}`}>
                <div className="changelog__head">
                  <span className={`review review--${entry.review_status}`}>
                    {reviewLabel[entry.review_status] ?? entry.review_status}
                  </span>
                  <time dateTime={entry.detected_at}>
                    {formatDateTime(entry.detected_at, locale)}
                  </time>
                  <span className="changelog__target">
                    {group ? (
                      <Link to={withLocale(`/models/${group.id}`, locale)}>{group.name}</Link>
                    ) : model ? (
                      <Link to={withLocale(`/models/${model.canonical_id}`, locale)}>
                        {model.display_name}
                      </Link>
                    ) : (
                      (provider?.name ?? entry.entity_id)
                    )}
                  </span>
                </div>
                <p className="changelog__summary">{translateText(entry.summary, locale)}</p>
                <dl className="changelog__diff">
                  <div>
                    <dt>{t.changes.field}</dt>
                    <dd>
                      <code>{entry.field}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>{t.changes.before}</dt>
                    <dd>
                      {entry.previous ? translateText(entry.previous, locale) : t.changes.noRecord}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.changes.after}</dt>
                    <dd>
                      {entry.current ? translateText(entry.current, locale) : t.changes.noRecord}
                    </dd>
                  </div>
                  <div>
                    <dt>{t.changes.effective}</dt>
                    <dd>
                      {entry.effective_at
                        ? formatDateTime(entry.effective_at, locale)
                        : t.changes.unknownDate}
                    </dd>
                  </div>
                </dl>
                {entry.evidence_url ? (
                  <p className="changelog__source">
                    {t.changes.source}:{" "}
                    <a href={entry.evidence_url} target="_blank" rel="noreferrer noopener">
                      {entry.evidence_url}
                    </a>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <section className="page-section">
        <h2>{t.changes.typesTitle}</h2>
        <dl className="def-list">
          {(
            [
              ["permanent", t.state.freeTypePermanent, t.freeTypeDescription.permanent],
              ["trial", t.state.freeTypeTrial, t.freeTypeDescription.trial],
              ["credit", t.state.freeTypeCredit, t.freeTypeDescription.credit],
              ["conditional", t.state.freeTypeConditional, t.freeTypeDescription.conditional],
              ["ended", t.state.freeTypeEnded, t.freeTypeDescription.ended],
            ] as const
          ).map(([key, label, description]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
