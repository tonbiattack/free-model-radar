import source from "../../data/i18n/source.json";
import en from "../../data/i18n/en.json";

/**
 * データ内の説明文を英語に切り替える。
 *
 * 事実データ（モデル ID・提供元 ID・数値・URL・日付）は言語非依存のまま 1 つだけ持つ。
 * 説明文は原文の内容ハッシュで英語に対応づけているため、原文を書き換えると
 * 自動的に未翻訳になり、古い訳が黙って残ることはない。
 *
 * 原文→キーの対応は source.json が持っているので、ブラウザ側でハッシュを
 * 計算する必要はない（Node の crypto をバンドルに含めない）。
 */
type SourceFile = { entries: Array<{ key: string; ja: string; where: string[] }> };

const translations = en as Record<string, string>;
const entries = (source as SourceFile).entries;

const keyByOriginal = new Map(entries.map((entry) => [entry.ja, entry.key]));

/** 1 件の文言を英語にする。訳がなければ原文をそのまま返す（情報を消さない）。 */
export function translateText(text: string, locale: "en" | "ja"): string {
  if (locale === "ja") return text;
  const key = keyByOriginal.get(text);
  if (!key) return text;
  return translations[key] ?? text;
}

/** 配列の一括変換。 */
export function translateAll(texts: string[], locale: "en" | "ja"): string[] {
  return texts.map((text) => translateText(text, locale));
}

/** 訳が欠けている原文の一覧。テストと CI で使う。 */
export function untranslated(): string[] {
  return entries.filter((entry) => !translations[entry.key]).map((entry) => entry.ja);
}

/** 訳の件数（テストとレポート用）。 */
export const translationStats = {
  total: entries.length,
  translated: Object.keys(translations).length,
};
