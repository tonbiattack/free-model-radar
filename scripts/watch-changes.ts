import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

/**
 * 監視対象のページを取得し、前回のハッシュと比べて差分の候補を記録する。
 *
 * 守っていること:
 * - robots.txt を確認し、Disallow されたパスへは取得しに行かない
 * - 取得失敗と「サービス終了」を区別する。失敗してもデータは消さない
 * - 自動検知はあくまで「候補」。確定は人が出典を見て行う
 * - ページ全文は保存せず、ハッシュと短い抜粋だけを残す
 *
 * 使い方:
 *   npm run watch:changes            # 取得して差分を検出
 *   npm run watch:changes -- --dry-run
 */

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const root = join(import.meta.dirname, "..");
const stateDir = join(root, "scripts", "out");
const stateFile = join(stateDir, "watch-state.json");
const reportFile = join(stateDir, "watch-report.json");

interface WatchSource {
  provider_id: string;
  label: string;
  url: string;
  target: string;
  failure_threshold: number;
}

interface SourceState {
  url: string;
  hash: string | null;
  excerpt: string;
  last_checked: string;
  last_success: string | null;
  consecutive_failures: number;
  last_status: number | null;
}

interface WatchState {
  sources: Record<string, SourceState>;
}

function loadState(): WatchState {
  if (!existsSync(stateFile)) return { sources: {} };
  try {
    return JSON.parse(readFileSync(stateFile, "utf8")) as WatchState;
  } catch {
    console.warn("前回の状態を読めませんでした。新規として扱います。");
    return { sources: {} };
  }
}

const USER_AGENT =
  "free-model-radar/0.1 (+https://github.com/tonbiattack/free-model-radar; docs monitor)";

const robotsCache = new Map<string, string[]>();

async function allowedByRobots(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const origin = parsed.origin;

  if (!robotsCache.has(origin)) {
    try {
      const response = await fetch(`${origin}/robots.txt`, {
        headers: { "User-Agent": USER_AGENT },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        // robots.txt がない場合は制限なしとみなす
        robotsCache.set(origin, []);
      } else {
        const text = await response.text();
        const disallows = text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => /^Disallow:/i.test(line))
          .map((line) => line.replace(/^Disallow:\s*/i, "").trim())
          .filter(Boolean);
        robotsCache.set(origin, disallows);
      }
    } catch {
      console.warn(`robots.txt を取得できません: ${origin}`);
      robotsCache.set(origin, []);
    }
  }

  const disallows = robotsCache.get(origin) ?? [];
  return !disallows.some((rule) => rule !== "/" && parsed.pathname.startsWith(rule));
}

/** ページから、差分判定に使える程度に正規化したテキストを取り出す。 */
function normalize(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

/** 無料枠に関係しそうな文だけを抜き出す。全文を残すとノイズが多く、容量も増える。 */
function relevantSnippet(text: string): string {
  const keywords = /free|無料|rate limit|per day|per minute|quota|credit|trial|deprecat/i;
  const sentences = text.split(/(?<=[.!?。])\s+/);
  const picked = sentences.filter((sentence) => keywords.test(sentence)).slice(0, 4);
  return (picked.length > 0 ? picked : sentences.slice(0, 2)).join(" ").slice(0, 600);
}

interface Finding {
  provider_id: string;
  label: string;
  url: string;
  kind: "changed" | "failed" | "recovered" | "first-seen";
  status: number | null;
  excerpt: string;
  previous_excerpt: string | null;
  message: string;
  requires_human_review: boolean;
}

async function checkSource(source: WatchSource, state: WatchState): Promise<Finding | null> {
  const key = `${source.provider_id}::${source.target}`;
  const previous = state.sources[key];

  if (!(await allowedByRobots(source.url))) {
    return {
      provider_id: source.provider_id,
      label: source.label,
      url: source.url,
      kind: "failed",
      status: null,
      excerpt: "",
      previous_excerpt: previous?.excerpt ?? null,
      message: "robots.txt により取得を許可されていません。人手で確認してください。",
      requires_human_review: true,
    };
  }

  let status: number | null = null;
  let text = "";
  let failed = false;

  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/json" },
      signal: AbortSignal.timeout(20_000),
      redirect: "follow",
    });
    status = response.status;
    if (!response.ok) {
      failed = true;
    } else {
      text = normalize(await response.text());
    }
  } catch {
    failed = true;
  }

  const now = new Date().toISOString();

  if (failed) {
    const failures = (previous?.consecutive_failures ?? 0) + 1;
    state.sources[key] = {
      url: source.url,
      hash: previous?.hash ?? null,
      excerpt: previous?.excerpt ?? "",
      last_checked: now,
      last_success: previous?.last_success ?? null,
      consecutive_failures: failures,
      last_status: status,
    };

    // 失敗が続いてもデータは消さない。「取得できない」と「終了した」は別。
    return {
      provider_id: source.provider_id,
      label: source.label,
      url: source.url,
      kind: "failed",
      status,
      excerpt: "",
      previous_excerpt: previous?.excerpt ?? null,
      message:
        `取得に失敗しました（${failures} 回連続）。` +
        (failures >= source.failure_threshold
          ? "しきい値に達したため、人手での確認が必要です。データは変更していません。"
          : "一時的な障害の可能性があるため、データは変更しません。"),
      requires_human_review: failures >= source.failure_threshold,
    };
  }

  const nextHash = hash(text);
  const nextExcerpt = relevantSnippet(text);
  const wasFailing = (previous?.consecutive_failures ?? 0) > 0;

  state.sources[key] = {
    url: source.url,
    hash: nextHash,
    excerpt: nextExcerpt,
    last_checked: now,
    last_success: now,
    consecutive_failures: 0,
    last_status: status,
  };

  if (!previous) {
    return {
      provider_id: source.provider_id,
      label: source.label,
      url: source.url,
      kind: "first-seen",
      status,
      excerpt: nextExcerpt,
      previous_excerpt: null,
      message: "初回の記録を取りました。次回以降、差分を検知します。",
      requires_human_review: false,
    };
  }

  if (wasFailing) {
    return {
      provider_id: source.provider_id,
      label: source.label,
      url: source.url,
      kind: "recovered",
      status,
      excerpt: nextExcerpt,
      previous_excerpt: previous.excerpt,
      message: "取得に失敗していた状態から復帰しました。内容を確認してください。",
      requires_human_review: true,
    };
  }

  if (previous.hash !== nextHash) {
    return {
      provider_id: source.provider_id,
      label: source.label,
      url: source.url,
      kind: "changed",
      status,
      excerpt: nextExcerpt,
      previous_excerpt: previous.excerpt,
      message:
        "ページ内容が変わりました。無料枠・レート制限の変更かどうかを出典で確認し、必要ならデータを更新してください。",
      requires_human_review: true,
    };
  }

  return null;
}

async function main() {
  const watch = JSON.parse(readFileSync(join(root, "data", "watch-sources.json"), "utf8")) as {
    sources: WatchSource[];
  };

  const state = loadState();
  const findings: Finding[] = [];
  const now = new Date().toISOString();

  for (const source of watch.sources) {
    const finding = await checkSource(source, state);
    if (finding) {
      findings.push(finding);
      console.log(`[${finding.kind}] ${source.provider_id} / ${source.label}`);
      console.log(`        ${finding.message}`);
    } else {
      console.log(`[unchanged] ${source.provider_id} / ${source.label}`);
    }
    // 相手のサーバーに負荷をかけない
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  const report = { generated_at: now, findings };

  if (isDryRun) {
    console.log(`\n--dry-run のため保存していません。検出 ${findings.length} 件。`);
    console.log(JSON.stringify(report, null, 2).slice(0, 4000));
    return;
  }

  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  const needsReview = findings.filter((finding) => finding.requires_human_review);
  console.log(
    `\n検出 ${findings.length} 件（要確認 ${needsReview.length} 件）。` +
      `\n  ${stateFile}\n  ${reportFile}`,
  );

  // 取得失敗だけで「終了」と判断しない。ここでは終了コードを変えない。
  // ただし要確認があることは明示して、ワークフロー側で PR を作れるようにする。
  if (needsReview.length > 0) {
    console.log("\n要確認の変更があります。差分をレビューしてからデータを更新してください。");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
