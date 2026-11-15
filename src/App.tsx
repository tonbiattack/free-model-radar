import { Suspense, lazy, useEffect } from "react";
import { Link, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { RouteMeta } from "./components/RouteMeta";
import { ModelListPage } from "./pages/ModelListPage";
import { I18nProvider } from "./lib/i18n";
import { messages } from "./lib/messages";
import { defaultLocale, isLocale, type Locale } from "./lib/locale";

// 一覧は最初の画面なので同期読み込みし、詳細・履歴・解説は遅延させて初回を軽くする。
const ModelDetailPage = lazy(() =>
  import("./pages/ModelDetailPage").then((module) => ({ default: module.ModelDetailPage })),
);
const ChangesPage = lazy(() =>
  import("./pages/ChangesPage").then((module) => ({ default: module.ChangesPage })),
);
const MethodPage = lazy(() =>
  import("./pages/MethodPage").then((module) => ({ default: module.MethodPage })),
);
const NotFoundPage = lazy(() =>
  import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

/** ルート接頭辞からロケールを取り出して、配下のツリーに渡す。 */
function LocaleLayout({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <I18nProvider value={{ locale, t: messages[locale] }}>
      <div className="shell">
        <a className="skip-link" href="#main">
          {messages[locale].nav.skip}
        </a>
        <ScrollToTop />
        <RouteMeta />
        <SiteHeader />
        <main id="main" className="main">
          <Suspense fallback={<p className="route-loading">{messages[locale].nav.loading}</p>}>
            <Routes>
              <Route path="/" element={<ModelListPage />} />
              <Route path="/models/:modelId" element={<ModelDetailPage />} />
              <Route path="/models/:modelId/:providerId" element={<ModelDetailPage />} />
              <Route path="/changes" element={<ChangesPage />} />
              <Route path="/method" element={<MethodPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </main>
        <SiteFooter />
      </div>
    </I18nProvider>
  );
}

/** 接頭辞なしのアクセスは既定ロケールへ送る。既存の共有 URL も壊さない。 */
function LocaleRedirect() {
  const { pathname, search, hash } = useLocation();
  const target = `/${defaultLocale}${pathname === "/" ? "" : pathname}${search}${hash}`;
  return <Navigate to={target} replace />;
}

/** 未知の接頭辞（/xx/...）は 404 として扱う。 */
function UnknownLocale() {
  const { locale } = useParams<{ locale: string }>();
  if (isLocale(locale)) return null;
  return <Navigate to={`/${defaultLocale}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LocaleRedirect />} />
      <Route path="/:locale/*" element={<LocaleRoutes />} />
      <Route path="*" element={<UnknownLocale />} />
    </Routes>
  );
}

function LocaleRoutes() {
  const { locale } = useParams<{ locale: string }>();
  if (!isLocale(locale)) return <Navigate to={`/${defaultLocale}`} replace />;
  return <LocaleLayout locale={locale} />;
}

export function HomeLink({ children }: { children: React.ReactNode }) {
  return <Link to=".">{children}</Link>;
}
