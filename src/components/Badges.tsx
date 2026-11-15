import type { Availability, FreeTierType, Tristate } from "@/lib/schema";
import {
  availabilityLabel,
  freeTierTypeDescription,
  freeTierTypeLabel,
  tristateLabel,
} from "@/lib/labels";

export function FreeTierBadge({ type, muted = false }: { type: FreeTierType; muted?: boolean }) {
  return (
    <span
      className={`badge badge--free badge--free-${type}${muted ? " is-muted" : ""}`}
      title={freeTierTypeDescription[type]}
    >
      {freeTierTypeLabel[type]}
    </span>
  );
}

export function AvailabilityMark({ availability }: { availability: Availability }) {
  const symbol =
    availability === "available"
      ? "●"
      : availability === "restricted"
        ? "◐"
        : availability === "ended"
          ? "×"
          : "–";
  return (
    <span className={`availability availability--${availability}`}>
      <span aria-hidden="true">{symbol}</span>
      <span className="sr-only">{availabilityLabel[availability]}</span>
    </span>
  );
}

/**
 * 3値の表示。unknown は「非対応」ではなく「調べていない」ことを
 * 見た目でも区別できるよう、破線と淡色で表す。
 */
export function TristateBadge({ value, label }: { value: Tristate; label?: string }) {
  return (
    <span
      className={`tristate tristate--${value}`}
      title={value === "unknown" ? "公式情報で確認できていない" : undefined}
    >
      {label ? <span className="tristate__label">{label}</span> : null}
      <span className="tristate__value">{tristateLabel[value]}</span>
    </span>
  );
}

export function VerificationBadge({
  status,
  passed,
  total,
}: {
  status: "passed" | "failed" | "untested" | "unknown";
  passed: number;
  total: number;
}) {
  const text =
    status === "passed"
      ? `検証済み ${passed}/${total}`
      : status === "failed"
        ? "検証で失敗"
        : status === "untested"
          ? "未検証"
          : "検証情報なし";

  return <span className={`verification verification--${status}`}>{text}</span>;
}

/** 鮮度が落ちたデータに付ける注意。数字を出すだけでなく、何をすべきか書く。 */
export function FreshnessNote({
  freshness,
  checkedAt,
}: {
  freshness: "aging" | "stale";
  checkedAt: string;
}) {
  const label = freshness === "stale" ? "情報が古い可能性" : "再確認の時期";
  return (
    <span className={`freshness freshness--${freshness}`} title={`最終確認 ${checkedAt}`}>
      {label}
    </span>
  );
}
