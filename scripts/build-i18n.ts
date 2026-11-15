import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { translationKey } from "./extract-i18n";
import { translations } from "./translations";

/**
 * 翻訳文を data/i18n/en.json に書き出す。
 * キーは原文の内容ハッシュなので、原文を変えると自動的に未翻訳になる。
 */
const root = join(import.meta.dirname, "..");
const sourceFile = join(root, "data", "i18n", "source.json");
const enFile = join(root, "data", "i18n", "en.json");

interface Source {
  entries: Array<{ key: string; ja: string; where: string[] }>;
}

const source = JSON.parse(readFileSync(sourceFile, "utf8")) as Source;

// 原文をキーにした対応表。順序に依存しないため、翻訳対象が増えても
// 位置ずれで別の訳が入ることがない。
const byOriginal = translations as Record<string, string>;

const en: Record<string, string> = {};
const problems: string[] = [];

for (const entry of source.entries) {
  const translated = byOriginal[entry.ja];
  if (translated === undefined) {
    problems.push(`訳がありません: ${entry.ja.slice(0, 40)}`);
    continue;
  }
  if (!translated.trim()) {
    problems.push(`訳が空です: ${entry.ja.slice(0, 40)}`);
    continue;
  }
  // 日本語が残っていないか（訳し忘れの検出）
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(translated)) {
    problems.push(`訳に日本語が残っています: ${translated.slice(0, 40)}`);
  }
  en[entry.key] = translated;
}

// 参照されていない訳（原文が変わった・消えた）
const japanese = new Set(source.entries.map((entry) => entry.ja));
for (const original of Object.keys(byOriginal)) {
  if (!japanese.has(original)) {
    problems.push(`参照されていない訳: "${original.slice(0, 40)}"（原文が変わった可能性）`);
  }
}

if (problems.length > 0) {
  console.error(`翻訳に問題があります (${problems.length} 件):`);
  for (const problem of problems.slice(0, 20)) console.error(`  - ${problem}`);
  process.exit(1);
}

writeFileSync(enFile, `${JSON.stringify(en, null, 2)}\n`, "utf8");

// 照合のための補助情報
const unused = Object.keys(en).filter((key) => !source.entries.some((e) => e.key === key));
console.log(`翻訳を ${Object.keys(en).length} 件書き出しました: ${enFile}`);
if (unused.length > 0) console.log(`参照されない訳: ${unused.length} 件`);

// ハッシュ関数が安定していることの自己確認
if (translationKey("test") !== translationKey("test")) {
  console.error("translationKey が安定していません");
  process.exit(1);
}
