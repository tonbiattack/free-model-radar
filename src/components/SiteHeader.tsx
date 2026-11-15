import { Link, NavLink, useLocation } from "react-router-dom";
import { dataset } from "@/lib/dataset";
import { useI18n } from "@/lib/i18n";
import { locales, localeLabel, withLocale } from "@/lib/locale";
import { RadarMark } from "./RadarMark";

export function SiteHeader() {
  const { locale, t } = useI18n();
  const { pathname, search } = useLocation();

  const navItems = [
    { to: "/", label: t.nav.models, end: true },
    { to: "/changes", label: t.nav.changes },
    { to: "/method", label: t.nav.method },
  ];

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to={withLocale("/", locale)} className="brand">
          <RadarMark />
          <span className="brand__text">
            <span className="brand__name">{t.brand.name}</span>
            <span className="brand__tagline">{t.brand.tagline}</span>
          </span>
        </Link>

        <div className="site-header__right">
          <nav className="site-nav" aria-label={t.nav.mainLabel}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={withLocale(item.to, locale)}
                end={item.end}
                className={({ isActive }) => `site-nav__link${isActive ? " is-active" : ""}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <LanguageSwitcher pathname={pathname} search={search} current={locale} />
        </div>
      </div>
      <div className="site-header__meta">
        <span>
          {t.meta.lastUpdated}{" "}
          <time dateTime={dataset.meta.last_updated}>{dataset.meta.last_updated}</time>
        </span>
        <span aria-hidden="true">/</span>
        <span>
          {dataset.providers.length} {t.meta.providers}
        </span>
        <span aria-hidden="true">/</span>
        <span>
          {dataset.models.length} {t.meta.models}
        </span>
      </div>
    </header>
  );
}

/**
 * 言語切替。現在のページ・絞り込み条件を保ったまま、ロケール接頭辞だけを差し替える。
 * 共有 URL をそのまま相手の言語へ渡せる。
 */
function LanguageSwitcher({
  pathname,
  search,
  current,
}: {
  pathname: string;
  search: string;
  current: string;
}) {
  const { t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t.nav.language}>
      {locales.map((locale) => {
        const target = `${withLocale(pathname, locale)}${search}`;
        return (
          <NavLink
            key={locale}
            to={target}
            className={`lang-switch__item${locale === current ? " is-active" : ""}`}
            hrefLang={locale}
            lang={locale}
          >
            {localeLabel[locale]}
          </NavLink>
        );
      })}
    </div>
  );
}
