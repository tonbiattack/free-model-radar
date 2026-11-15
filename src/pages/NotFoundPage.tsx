import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { withLocale } from "@/lib/locale";

export function NotFoundPage({ reason }: { reason?: string }) {
  const { locale, t } = useI18n();
  return (
    <div className="empty-page">
      <h1>{t.notFound.title}</h1>
      <p>{reason ?? t.notFound.body}</p>
      <p>
        <Link to={withLocale("/", locale)} className="text-link">
          {t.notFound.back}
        </Link>
      </p>
    </div>
  );
}
