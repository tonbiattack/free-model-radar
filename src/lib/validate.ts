import { datasetSchema, type Dataset } from "./schema";

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  dataset: Dataset | null;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

const TODAY = new Date();
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isFutureDate(value: string, slackDays = 1): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  const limit = new Date(TODAY.getTime() + slackDays * 86400000);
  return date.getTime() > limit.getTime();
}

/**
 * データの整合性を検証する。スキーマ検証（形）に加えて、
 * 参照整合性・一意性・日付・出典の有無といった「意味」の検証も行う。
 */
export function validateDataset(input: unknown, options: { today?: Date } = {}): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const parsed = datasetSchema.safeParse(input);

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push({
        path: issue.path.join(".") || "(root)",
        message: issue.message,
      });
    }
    return { ok: false, dataset: null, errors, warnings };
  }

  const dataset = parsed.data;
  const today = options.today ?? TODAY;
  const checkLimit = new Date(today.getTime() + 86400000);

  // 一意性
  const providerIds = new Set<string>();
  for (const [index, provider] of dataset.providers.entries()) {
    if (providerIds.has(provider.id)) {
      errors.push({
        path: `providers.${index}.id`,
        message: `プロバイダー ID が重複しています: ${provider.id}`,
      });
    }
    providerIds.add(provider.id);

    if (provider.sources.length === 0) {
      errors.push({
        path: `providers.${index}.sources`,
        message: "プロバイダーには最低 1 件の出典が必要です",
      });
    }
    // ネイティブ対応とカタログ ID は整合させる
    if (provider.native_opencode === "yes" && !provider.opencode_provider_id) {
      errors.push({
        path: `providers.${index}.opencode_provider_id`,
        message: "native_opencode が yes の場合は opencode_provider_id が必須です",
      });
    }
    if (provider.native_opencode === "no" && provider.opencode_provider_id) {
      warnings.push({
        path: `providers.${index}.opencode_provider_id`,
        message: "native_opencode が no ですが opencode_provider_id が設定されています",
      });
    }
  }

  const modelIds = new Set<string>();
  const canonicalIds = new Set<string>();
  for (const [index, canonical] of dataset.canonical_models.entries()) {
    if (canonicalIds.has(canonical.id)) {
      errors.push({
        path: `canonical_models.${index}.id`,
        message: `モデル ID が重複しています: ${canonical.id}`,
      });
    }
    canonicalIds.add(canonical.id);
  }

  // 同じモデルを複数の提供元が扱えることが、このデータ構造の要点。
  // canonical_id でまとまることを前提に、参照の妥当性だけを検証する。
  const canonicalUsage = new Map<string, number>();

  for (const [index, model] of dataset.models.entries()) {
    const at = `models.${index}`;
    if (modelIds.has(model.id)) {
      errors.push({ path: `${at}.id`, message: `モデル ID が重複しています: ${model.id}` });
    }
    modelIds.add(model.id);

    if (!canonicalIds.has(model.canonical_id)) {
      errors.push({
        path: `${at}.canonical_id`,
        message: `data/models.json に存在しないモデルを参照しています: ${model.canonical_id}`,
      });
    } else {
      canonicalUsage.set(model.canonical_id, (canonicalUsage.get(model.canonical_id) ?? 0) + 1);
    }

    if (!providerIds.has(model.provider_id)) {
      errors.push({
        path: `${at}.provider_id`,
        message: `存在しないプロバイダーを参照しています: ${model.provider_id}`,
      });
    }

    if (model.sources.length === 0) {
      errors.push({ path: `${at}.sources`, message: "モデルには最低 1 件の出典が必要です" });
    }

    // 確定情報（数値・対応可否）には必ず出典と確認日を持たせる
    const hasConfirmedFacts =
      model.context_tokens !== null ||
      model.max_output_tokens !== null ||
      model.free_tier.limits.length > 0 ||
      model.free_tier.type !== "unknown";
    if (hasConfirmedFacts && model.sources.length === 0) {
      errors.push({
        path: `${at}.sources`,
        message: "確定的な条件を掲載するモデルには出典と確認日が必要です",
      });
    }

    for (const [sIndex, source] of model.sources.entries()) {
      if (
        isFutureDate(source.checked_at) &&
        new Date(`${source.checked_at}T00:00:00Z`) > checkLimit
      ) {
        errors.push({
          path: `${at}.sources.${sIndex}.checked_at`,
          message: `確認日が未来日です: ${source.checked_at}`,
        });
      }
      if (!/^https?:\/\//.test(source.source_url)) {
        errors.push({
          path: `${at}.sources.${sIndex}.source_url`,
          message: "出典 URL は http(s) で指定してください",
        });
      }
    }

    if (model.free_tier.type === "permanent" && model.free_tier.availability === "ended") {
      errors.push({
        path: `${at}.free_tier`,
        message: "恒久無料と「終了」が同時に立っています。種別と可用性を確認してください",
      });
    }

    // 期間限定で期限が非公表なのは正当な状態。警告ではなく UI で「期限不明」と表示する。
    // 一方、終了済みなのに期限がないのは矛盾なので弾く。
    if (model.free_tier.availability === "ended" && model.free_tier.expires_on === null) {
      warnings.push({
        path: `${at}.free_tier.expires_on`,
        message: "終了済みですが終了日がありません。判明していれば expires_on を埋めてください",
      });
    }

    // 制限値の意味を担保する: 同じ metric が 2 回出てきたら scope が違うはず
    const seen = new Map<string, number>();
    for (const limit of model.free_tier.limits) {
      const key = `${limit.metric}:${limit.scope}`;
      const count = (seen.get(key) ?? 0) + 1;
      seen.set(key, count);
      if (count > 1) {
        errors.push({
          path: `${at}.free_tier.limits`,
          message: `同じ metric/scope の制限が重複しています: ${key}`,
        });
      }
    }

    // 「不明」を 0 と混同していないか: 0 の制限は明示的な note を求める
    for (const limit of model.free_tier.limits) {
      if (limit.value === 0 && !limit.note) {
        warnings.push({
          path: `${at}.free_tier.limits`,
          message: "制限値 0 は「利用不可」の意味になり得ます。note で説明してください",
        });
      }
    }

    if (model.verification.some((v) => v.status === "passed" && !v.tested_at)) {
      errors.push({
        path: `${at}.verification`,
        message: "検証成功（passed）には検証日時が必要です",
      });
    }
  }

  // 変更履歴の参照整合性。entity_id は "provider:<id>" / "model:<id>" の接頭辞つきで参照する。
  for (const [index, entry] of dataset.changelog.entries()) {
    const expectedPrefix = `${entry.entity_type === "free-tier" ? "model" : entry.entity_type}:`;
    if (!entry.entity_id.startsWith(expectedPrefix)) {
      errors.push({
        path: `changelog.${index}.entity_id`,
        message: `entity_type が ${entry.entity_type} のとき entity_id は "${expectedPrefix}<id>" で指定してください`,
      });
      continue;
    }
    const exists =
      providerIds.has(entry.entity_id.replace(/^provider:/, "")) ||
      modelIds.has(entry.entity_id.replace(/^model:/, "")) ||
      canonicalIds.has(entry.entity_id.replace(/^model:/, ""));
    if (!exists) {
      warnings.push({
        path: `changelog.${index}.entity_id`,
        message: `変更履歴の対象が見つかりません: ${entry.entity_id}`,
      });
    }
  }

  for (const [index, source] of dataset.watch_sources.entries()) {
    if (!providerIds.has(source.provider_id)) {
      errors.push({
        path: `watch_sources.${index}.provider_id`,
        message: `存在しないプロバイダーを参照しています: ${source.provider_id}`,
      });
    }
  }

  // 空の見出し日付チェック
  if (!ISO_DATE.test(dataset.meta.last_updated)) {
    errors.push({
      path: "meta.last_updated",
      message: "last_updated は YYYY-MM-DD で指定してください",
    });
  }

  // どの提供元も扱っていないモデルは、定義だけ残っている状態。
  // 統合の取りこぼしを検出できるよう警告する。
  for (const canonical of dataset.canonical_models) {
    if (!canonicalUsage.has(canonical.id)) {
      warnings.push({
        path: `canonical_models.${canonical.id}`,
        message: "このモデルを扱う提供元がありません。不要なら削除してください",
      });
    }
  }

  // 同じ metric かつ同じ scope の制限だけが「比較可能」なので、比較可能性を数えておく
  const allMetrics = new Set(
    dataset.models.flatMap((m) => m.free_tier.limits.map((l) => l.metric)),
  );
  if (allMetrics.size === 0) {
    warnings.push({ path: "models", message: "比較可能な数値制限が 1 件もありません" });
  }

  return { ok: errors.length === 0, dataset, errors, warnings };
}
