import { Suspense, lazy, useEffect } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { RouteMeta } from "./components/RouteMeta";
import { ModelListPage } from "./pages/ModelListPage";

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

export default function App() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <ScrollToTop />
      <RouteMeta />
      <SiteHeader />
      <main id="main" className="main">
        <Suspense fallback={<p className="route-loading">読み込み中…</p>}>
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
  );
}

export function HomeLink({ children }: { children: React.ReactNode }) {
  return <Link to="/">{children}</Link>;
}
