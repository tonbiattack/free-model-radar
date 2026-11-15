import { Link, NavLink } from "react-router-dom";
import { dataset } from "@/lib/dataset";
import { RadarMark } from "./RadarMark";

const navItems = [
  { to: "/", label: "モデル一覧", end: true },
  { to: "/changes", label: "変更履歴" },
  { to: "/method", label: "調べ方" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <RadarMark />
          <span className="brand__text">
            <span className="brand__name">Free Model Radar</span>
            <span className="brand__tagline">無料枠の LLM API を、根拠つきで。</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="サイト内">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `site-nav__link${isActive ? " is-active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="site-header__meta">
        <span>
          最終更新 <time dateTime={dataset.meta.last_updated}>{dataset.meta.last_updated}</time>
        </span>
        <span aria-hidden="true">/</span>
        <span>{dataset.providers.length} プロバイダー</span>
        <span aria-hidden="true">/</span>
        <span>{dataset.models.length} モデル</span>
      </div>
    </header>
  );
}
