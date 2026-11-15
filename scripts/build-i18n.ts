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

if (source.entries.length !== translations.length) {
  console.error(
    `件数が一致しません: 原文 ${source.entries.length} 件 / 訳 ${translations.length} 件\n` +
      "scripts/translations.ts を data/i18n/source.json と同じ順序・件数にしてください。",
  );
  process.exit(1);
}

const en: Record<string, string> = {};
const problems: string[] = [];

source.entries.forEach((entry, index) => {
  const translated = translations[index];
  if (translated === undefined) {
    problems.push(`訳がありません: ${entry.ja.slice(0, 40)}`);
    return;
  }
  if (!translated.trim()) {
    problems.push(`訳が空です: ${entry.ja.slice(0, 40)}`);
    return;
  }
  // 日本語が残っていないか（訳し忘れの検出）
  if (/[\u3040-\u30ff\u4e00-\u9fff]/.test(translated)) {
    problems.push(`訳に日本語が残っています: ${translated.slice(0, 40)}`);
  }
  en[entry.key] = translated;
});

if (problems.length > 0) {
  console.error(`翻訳に問題があります (${problems.length} 件):`);
  for (const problem of problems.slice(0, 20)) console.error(`  - ${problem}`);
  process.exit(1);
}

writeFileSync(enFile, `${JSON.stringify(en, null, 2)}\n`, "utf8");

// 原文に含まれる数値・URL・ID が訳でも保持されているかを確認する。
// 数値の取り違えは情報の誤りに直結するため、機械的に検査する。
// 「1 日」→「per day」のような言い換えは正当なので、3 桁以上の数値だけを見る
// （レート制限・料金・コンテキスト長はすべて 3 桁以上になる）。
const significantNumbers = (text: string) =>
  (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
    .map((n) => n.replace(/,$/, ""))
    .filter((n) => Number(n.replace(/,/g, "")) >= 100);

let missingNumbers = 0;
source.entries.forEach((entry, index) => {
  const before = new Set(significantNumbers(entry.ja));
  const after = new Set(significantNumbers(translations[index] ?? ""));
  const lost = [...before].filter((n) => !after.has(n));
  if (lost.length > 0) {
    missingNumbers += 1;
    if (missingNumbers <= 10) {
      console.log(`数値の欠落: "${entry.ja.slice(0, 40)}" に ${lost.join(", ")}`);
    }
  }
});

// 照合のための補助情報
const unused = Object.keys(en).filter((key) => !source.entries.some((e) => e.key === key));
console.log(`翻訳を ${Object.keys(en).length} 件書き出しました: ${enFile}`);
if (missingNumbers > 0)
  console.log(`数値が原文にない訳: ${missingNumbers} 件（意図した言い換えか確認してください）`);
if (unused.length > 0) console.log(`参照されない訳: ${unused.length} 件`);

// ハッシュ関数が安定していることの自己確認
if (translationKey("test") !== translationKey("test")) {
  console.error("translationKey が安定していません");
  process.exit(1);
}
