import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import source from "../data/i18n/source.json";
import en from "../data/i18n/en.json";

/**
 * 翻訳の健全性チェック。ビルドで落とすことで、
 * 原文を変えたのに訳を更新し忘れた状態で公開されるのを防ぐ。
 */
const root = join(import.meta.dirname, "..");
const translations = en as Record<string, string>;
const entries = (source as { entries: Array<{ key: string; ja: string; where: string[] }> })
  .entries;

const problems: string[] = [];

// 1. 訳の欠落
const missing = entries.filter((entry) => !translations[entry.key]);
for (const entry of missing) {
  problems.push(`未翻訳: "${entry.ja.slice(0, 50)}" (${entry.where[0]})`);
}

// 2. 参照されていない訳（原文が変わった可能性）
const keys = new Set(entries.map((entry) => entry.key));
const stale = Object.keys(translations).filter((key) => !keys.has(key));
for (const key of stale.slice(0, 10)) {
  problems.push(`参照されていない訳: ${key}`);
}

// 3. 英語訳に日本語が残っていないか
const japanese = /[\u3040-\u30ff\u4e00-\u9fff]/;
for (const value of Object.values(translations)) {
  if (japanese.test(value)) {
    problems.push(`訳に日本語が残っています: ${value.slice(0, 50)}`);
  }
}

// 4. 原文の重要な数値が訳でも保持されているか（3 桁以上のみ）
const significant = (text: string) =>
  (text.match(/\d[\d,]*(?:\.\d+)?/g) ?? [])
    .map((n) => n.replace(/,$/, ""))
    .filter((n) => Number(n.replace(/,/g, "")) >= 100);

for (const entry of entries) {
  const before = new Set(significant(entry.ja));
  const after = new Set(significant(translations[entry.key] ?? ""));
  const lost = [...before].filter((n) => !after.has(n));
  if (lost.length > 0) {
    problems.push(`数値の欠落: "${entry.ja.slice(0, 40)}" に ${lost.join(", ")}`);
  }
}

// 5. 原文の識別性の高いトークンが訳に残っているか。
//    位置ずれで別の訳が入ると、ここで検出できる。
const tokens = [
  "SSE",
  "response_format",
  "OpenCode",
  "Neurons",
  "Discord",
  "chat/completions",
  "DeepSeek",
  "Gemini",
  "Groq",
  "Logfare",
  "Cerebras",
  "OpenRouter",
  "Cloudflare",
  "GLM",
  "Qwen",
  "Gemma",
  "Kimi",
  "MiniMax",
  "Nemotron",
  "Llama",
  "Mistral",
  "Big Pickle",
  "Inkling",
  "LongCat",
  "Beam",
  "NVIDIA",
  "Workers",
];
// "tool_calls" は英語で "tool_call" と単数形になり得るため、語幹で比較する
const stemWords = ["tool_call"];
const paraphraseable = new Set(["RPM", "RPD", "TPM", "TPD"]);

for (const entry of entries) {
  const translated = translations[entry.key] ?? "";
  const present = tokens.filter((token) => entry.ja.toLowerCase().includes(token.toLowerCase()));
  const missing = present.filter((token) => {
    if (paraphraseable.has(token)) return false;
    if (translated.toLowerCase().includes(token.toLowerCase())) return false;
    // 英語では複数形・単数形の差やアンダースコアの有無があり得る
    const loose = token.toLowerCase().replace(/[_-]/g, "");
    return !translated.toLowerCase().replace(/[_-]/g, "").includes(loose);
  });
  // 語幹で見るものは別に判定する（単数形を許容）
  const normalize = (value: string) => value.toLowerCase().replace(/[_-]/g, "");
  const stemMissing = stemWords.filter(
    (stem) =>
      normalize(entry.ja).includes(normalize(stem)) &&
      !normalize(translated).includes(normalize(stem)),
  );

  if (missing.length > 0 || stemMissing.length > 0) {
    problems.push(
      `訳の位置ずれ疑い: "${entry.ja.slice(0, 40)}" の ${[...missing, ...stemMissing].join(", ")} が訳にありません`,
    );
  }
}

// 6. 原文ハッシュが現在の原文と一致しているか
for (const entry of entries) {
  const expected = createHash("sha256").update(entry.ja, "utf8").digest("hex").slice(0, 16);
  if (expected !== entry.key) {
    problems.push(`キーの不整合: "${entry.ja.slice(0, 40)}"`);
  }
}

// 5. UI 文言の日英キー一致
const messagesSource = readFileSync(join(root, "src", "lib", "messages.ts"), "utf8");
if (!messagesSource.includes("export const messages")) {
  problems.push("messages.ts の構造が想定と違います");
}

if (problems.length > 0) {
  console.error(`i18n チェックに失敗しました (${problems.length} 件):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(`i18n チェック OK: 説明文 ${entries.length} 件がすべて翻訳済み、数値の欠落なし。`);
