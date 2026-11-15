import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assembleDataset } from "./assemble-data";
import type { Dataset } from "../src/lib/schema";

/**
 * データ内の「説明文」を抽出して、翻訳キーと原文の対応表を作る。
 *
 * 事実データ（モデル ID・提供元 ID・数値・URL・日付）は言語非依存のまま 1 つだけ持つ。
 * 説明文だけを、原文の内容ハッシュをキーにして英語へ対応づける。
 * こうすると:
 *   - 事実を言語別に二重管理しなくてよい
 *   - 原文を書き換えるとキーが変わり、未翻訳として検出される（黙って古い訳が残らない）
 */
export function translationKey(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex").slice(0, 16);
}

export interface TranslatableEntry {
  key: string;
  ja: string;
  /** どこで使われているか。翻訳者とレビューの手がかりにする。 */
  where: string[];
}

/**
 * 翻訳対象を集める。`data/i18n/en.json` が同じキーを持っていれば翻訳済み。
 */
export function collectTranslatable(dataset: Dataset): TranslatableEntry[] {
  const map = new Map<string, TranslatableEntry>();
  const add = (text: string | null | undefined, where: string) => {
    if (!text) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    // 英数字・記号だけの文字列は翻訳しても同じ結果になるので対象外
    const key = translationKey(trimmed);
    const existing = map.get(key);
    if (existing) {
      if (!existing.where.includes(where)) existing.where.push(where);
    } else {
      map.set(key, { key, ja: trimmed, where: [where] });
    }
  };

  for (const canonical of dataset.canonical_models) {
    canonical.notes.forEach((note, index) =>
      add(note, `canonical:${canonical.id}:notes[${index}]`),
    );
  }

  for (const provider of dataset.providers) {
    provider.notes.forEach((note, index) => add(note, `provider:${provider.id}:notes[${index}]`));
    provider.sources.forEach((source, index) => {
      add(source.field, `provider:${provider.id}:sources[${index}].field`);
      add(source.value, `provider:${provider.id}:sources[${index}].value`);
    });
  }

  for (const model of dataset.models) {
    const at = `model:${model.id}`;
    model.caveats.forEach((note, index) => add(note, `${at}:caveats[${index}]`));
    model.free_tier.caveats.forEach((note, index) => add(note, `${at}:freeTier.caveats[${index}]`));
    model.free_tier.requirements.forEach((note, index) =>
      add(note, `${at}:freeTier.requirements[${index}]`),
    );
    model.sources.forEach((source, index) => {
      add(source.field, `${at}:sources[${index}].field`);
      add(source.value, `${at}:sources[${index}].value`);
    });
    model.free_tier.limits.forEach((limit, index) => {
      if (limit.note) add(limit.note, `${at}:freeTier.limits[${index}].note`);
    });
    if (model.free_tier.quota.note) add(model.free_tier.quota.note, `${at}:freeTier.quota.note`);
    model.verification.forEach((entry, index) => {
      if (entry.notes) add(entry.notes, `${at}:verification[${index}].notes`);
    });
  }

  for (const entry of dataset.changelog) {
    add(entry.summary, `changelog:${entry.entity_id}:${entry.field}`);
    // 変更前後の値も画面に出るので翻訳対象にする。
    // ただし "50" や "available" のような列挙値・数値は翻訳しても同じなので除く。
    const hasJapanese = (value: string) => /[\u3040-\u30ff\u4e00-\u9fff]/.test(value);
    if (entry.previous && hasJapanese(entry.previous)) {
      add(entry.previous, `changelog:${entry.entity_id}:${entry.field}:previous`);
    }
    if (entry.current && hasJapanese(entry.current)) {
      add(entry.current, `changelog:${entry.entity_id}:${entry.field}:current`);
    }
  }

  for (const source of dataset.watch_sources) {
    add(source.label, `watch:${source.provider_id}:${source.target}`);
  }

  return [...map.values()].sort((a, b) => a.ja.localeCompare(b.ja, "ja"));
}

if (process.argv[1]?.includes("extract-i18n")) {
  const root = join(import.meta.dirname, "..");
  const dataset = assembleDataset() as Dataset;
  const entries = collectTranslatable(dataset);

  const outDir = join(root, "data", "i18n");
  const outFile = join(outDir, "source.json");
  const enFile = join(outDir, "en.json");
  mkdirSync(outDir, { recursive: true });

  let translated: Record<string, string> = {};
  if (existsSync(enFile)) {
    translated = JSON.parse(readFileSync(enFile, "utf8")) as Record<string, string>;
  }

  const missing = entries.filter((entry) => !translated[entry.key]);
  const stale = Object.keys(translated).filter(
    (key) => !entries.some((entry) => entry.key === key),
  );

  writeFileSync(
    outFile,
    `${JSON.stringify(
      {
        generated_from: "data/",
        note: "原文の内容ハッシュをキーにしています。原文を変えるとキーが変わるため、未翻訳として検出されます。",
        entries: entries.map((entry) => ({ key: entry.key, ja: entry.ja, where: entry.where })),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  console.log(
    `説明文 ${entries.length} 件（翻訳済み ${entries.length - missing.length} / 未翻訳 ${missing.length}）`,
  );
  console.log(`  原文: ${outFile}`);
  if (missing.length > 0) {
    console.log(`  未翻訳の例:`);
    for (const entry of missing.slice(0, 5)) {
      console.log(`    - ${entry.ja.slice(0, 50)}`);
    }
  }
  if (stale.length > 0) {
    console.log(`  参照されていない訳 ${stale.length} 件（原文が変わった可能性）`);
  }
}
