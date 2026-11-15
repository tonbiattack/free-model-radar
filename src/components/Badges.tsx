import type { Availability, FreeTierType, Tristate } from "@/lib/schema";
import { useI18n } from "@/lib/i18n";
import {
  availabilityLabelWith,
  freeTierTypeLabelWith,
  limitScopeLabelWith,
  tristateLabelWith,
} from "@/lib/labels-i18n";

export function FreeTierBadge({ type, muted = false }: { type: FreeTierType; muted?: boolean }) {
  const { t } = useI18n();
  return (
    <span
      className={`badge badge--free badge--free-${type}${muted ? " is-muted" : ""}`}
      title={freeTierDescription(t, type)}
    >
      {freeTierTypeLabelWith(t, type)}
    </span>
  );
}

function freeTierDescription(t: ReturnType<typeof useI18n>["t"], type: FreeTierType): string {
  return t.freeTypeDescription[type] ?? t.freeTypeDescription.unknown;
}

export function AvailabilityMark({ availability }: { availability: Availability }) {
  const { t } = useI18n();
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
      <span className="sr-only">{availabilityLabelWith(t, availability)}</span>
    </span>
  );
}

/**
 * 3値の表示。unknown は「非対応」ではなく「調べていない」ことを
 * 見た目でも区別できるよう、破線と淡色で表す。
 */
export function TristateBadge({ value }: { value: Tristate }) {
  const { t } = useI18n();
  return (
    <span
      className={`tristate tristate--${value}`}
      title={value === "unknown" ? t.detail.capNote : undefined}
    >
      <span className="tristate__value">{tristateLabelWith(t, value)}</span>
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
  const { t } = useI18n();
  const text =
    status === "passed"
      ? t.state.verifiedCount(passed, total)
      : status === "failed"
        ? t.state.verifiedFailed
        : status === "untested"
          ? t.state.verifiedUntested
          : t.state.verifiedUnknown;

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
  const { t } = useI18n();
  return (
    <span className={`freshness freshness--${freshness}`} title={checkedAt}>
      {freshness === "stale" ? t.state.freshnessStale : t.state.freshnessAging}
    </span>
  );
}

/** 制限の適用範囲を表す小さなラベル。 */
export function ScopeLabel({ scope }: { scope: string }) {
  const { t } = useI18n();
  return <span className="limit-list__scope">{limitScopeLabelWith(t, scope)}</span>;
}
