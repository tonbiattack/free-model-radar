import type { FreeTierType } from "./schema";
import type { Locale } from "./locale";

type Messages = import("./messages").Messages;

export function freeTierTypeLabelWith(t: Messages, type: FreeTierType): string {
  switch (type) {
    case "permanent":
      return t.state.freeTypePermanent;
    case "trial":
      return t.state.freeTypeTrial;
    case "credit":
      return t.state.freeTypeCredit;
    case "conditional":
      return t.state.freeTypeConditional;
    case "ended":
      return t.state.freeTypeEnded;
    default:
      return t.state.freeTypeUnknown;
  }
}

export function availabilityLabelWith(
  t: Messages,
  availability: "available" | "restricted" | "ended" | "unknown",
): string {
  switch (availability) {
    case "available":
      return t.state.available;
    case "restricted":
      return t.state.restricted;
    case "ended":
      return t.state.ended;
    default:
      return t.state.unknown;
  }
}

export function tristateLabelWith(t: Messages, value: "yes" | "no" | "unknown"): string {
  if (value === "yes") return t.state.toolsYes;
  if (value === "no") return t.state.toolsNo;
  return t.state.toolsUnknown;
}

export function limitMetricLabelWith(t: Messages, metric: string): string {
  const table: Record<string, string> = {
    rpm: t.limits.rpm,
    rph: t.limits.rph,
    rpd: t.limits.rpd,
    "rpm-month": t.limits.rpmMonth,
    tpm: t.limits.tpm,
    tph: t.limits.tph,
    tpd: t.limits.tpd,
    itpm: t.limits.itpm,
    otpm: t.limits.otpm,
    concurrency: t.limits.concurrency,
  };
  return table[metric] ?? metric;
}

export function limitMetricLongWith(t: Messages, metric: string): string {
  const table: Record<string, string> = {
    rpm: t.limits.rpmLong,
    rph: t.limits.rphLong,
    rpd: t.limits.rpdLong,
    "rpm-month": t.limits.rpmMonthLong,
    tpm: t.limits.tpmLong,
    tph: t.limits.tphLong,
    tpd: t.limits.tpdLong,
    itpm: t.limits.itpmLong,
    otpm: t.limits.otpmLong,
    concurrency: t.limits.concurrencyLong,
  };
  return table[metric] ?? metric;
}

export function limitScopeLabelWith(t: Messages, scope: string): string {
  const table: Record<string, string> = {
    provider: t.scopes.provider,
    account: t.scopes.account,
    project: t.scopes.project,
    model: t.scopes.model,
    key: t.scopes.key,
    unknown: t.scopes.unknown,
  };
  return table[scope] ?? t.scopes.unknown;
}

export function signupFrictionLabelWith(t: Messages, value: string): string {
  const table: Record<string, string> = {
    instant: t.signup.instant,
    discord: t.signup.discord,
    waitlist: t.signup.waitlist,
    paid: t.signup.paid,
    unknown: t.signup.unknown,
  };
  return table[value] ?? t.signup.unknown;
}

export function apiFormatLabelWith(t: Messages, value: string): string {
  const table: Record<string, string> = {
    "openai-compatible": t.apiFormat["openai-compatible"],
    "google-generative": t.apiFormat["google-generative"],
    anthropic: t.apiFormat.anthropic,
    mistral: t.apiFormat.mistral,
    native: t.apiFormat.native,
    unknown: t.apiFormat.unknown,
  };
  return table[value] ?? t.apiFormat.unknown;
}

export function authLabelWith(t: Messages, value: string): string {
  const table: Record<string, string> = {
    "api-key": t.auth["api-key"],
    "google-account": t.auth["google-account"],
    "github-account": t.auth["github-account"],
    none: t.auth.none,
    unknown: t.auth.unknown,
  };
  return table[value] ?? t.auth.unknown;
}

export function verificationMethodLabelWith(t: Messages, value: string): string {
  const table: Record<string, string> = {
    connection: t.verification.connection,
    streaming: t.verification.streaming,
    "tool-calling": t.verification["tool-calling"],
    "json-mode": t.verification["json-mode"],
    "agent-task": t.verification["agent-task"],
  };
  return table[value] ?? value;
}

export function verificationStatusLabelWith(t: Messages, value: string): string {
  const table: Record<string, string> = {
    passed: t.verification.passed,
    failed: t.verification.failed,
    untested: t.verification.untested,
    unknown: t.verification.unknown,
  };
  return table[value] ?? t.verification.unknown;
}

/** 日付の書式。ロケールで表記を変える。 */
export function formatDateLocale(isoDate: string, locale: Locale): string {
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return isoDate;
  if (locale === "ja") return `${year}年${Number(month)}月${Number(day)}日`;
  return `${year}-${month}-${day}`;
}
