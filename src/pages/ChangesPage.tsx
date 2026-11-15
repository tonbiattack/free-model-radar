import { Link } from "react-router-dom";
import { dataset, providersById } from "@/lib/dataset";
import { formatDateTime } from "@/lib/format";
import { freeTierTypeLabel } from "@/lib/labels";

export function ChangesPage() {
  const entries = [...dataset.changelog].sort((a, b) => b.detected_at.localeCompare(a.detected_at));

  const pending = entries.filter((entry) => entry.review_status === "pending").length;

  return (
    <>
      <header className="page-head">
        <h1>変更履歴</h1>
        <p>
          無料枠・モデル・レート制限の変更を記録します。自動検知した内容はそのまま公開せず、
          出典を確認してから <strong>確定</strong> にしています。
          {pending > 0 ? ` 現在 ${pending} 件が確認待ちです。` : null}
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="empty-note">変更履歴はまだありません。</p>
      ) : (
        <ol className="changelog">
          {entries.map((entry) => {
            const targetId = entry.entity_id.replace(/^(provider|model):/, "");
            const provider = providersById.get(targetId);
            const model = dataset.models.find((m) => m.id === targetId);

            return (
              <li key={`${entry.entity_id}-${entry.field}-${entry.detected_at}`}>
                <div className="changelog__head">
                  <span className={`review review--${entry.review_status}`}>
                    {reviewLabel[entry.review_status]}
                  </span>
                  <time dateTime={entry.detected_at}>{formatDateTime(entry.detected_at)}</time>
                  <span className="changelog__target">
                    {model ? (
                      <Link to={`/models/${model.id}`}>{model.display_name}</Link>
                    ) : (
                      (provider?.name ?? entry.entity_id)
                    )}
                  </span>
                </div>
                <p className="changelog__summary">{entry.summary}</p>
                <dl className="changelog__diff">
                  <div>
                    <dt>項目</dt>
                    <dd>
                      <code>{entry.field}</code>
                    </dd>
                  </div>
                  <div>
                    <dt>変更前</dt>
                    <dd>{entry.previous ?? "（記録なし）"}</dd>
                  </div>
                  <div>
                    <dt>変更後</dt>
                    <dd>{entry.current ?? "（記録なし）"}</dd>
                  </div>
                  <div>
                    <dt>効力発生</dt>
                    <dd>{entry.effective_at ? formatDateTime(entry.effective_at) : "不明"}</dd>
                  </div>
                </dl>
                {entry.evidence_url ? (
                  <p className="changelog__source">
                    出典:{" "}
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
        <h2>種別の見分け方</h2>
        <dl className="def-list">
          {(["permanent", "trial", "credit", "conditional", "ended"] as const).map((type) => (
            <div key={type}>
              <dt>{freeTierTypeLabel[type]}</dt>
              <dd>{typeDescription[type]}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

const reviewLabel = {
  pending: "確認待ち",
  confirmed: "確認済み",
  rejected: "却下",
  "auto-applied": "自動適用",
} as const;

const typeDescription = {
  permanent:
    "公式に継続的な無料利用が案内されている枠。今回の変更履歴ではこの種別を失った場合を重点的に記録します。",
  trial: "期間が区切られた試用。終了後は有料へ移行するか、アクセスが止まります。",
  credit: "初回付与のクレジット。残額か期限で必ず終わります。",
  conditional: "支払い方法の登録など、条件を満たすと使える枠。",
  ended: "提供終了、または新規受付の停止。設定例は提供しません。",
} as const;
