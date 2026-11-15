export const locales = ["en", "ja"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** 表示用のラベル。ヘッダーの切替で使う。 */
export const localeLabel: Record<Locale, string> = {
  en: "English",
  ja: "日本語",
};

/** <html lang> に入れる値。 */
export const localeHtmlLang: Record<Locale, string> = {
  en: "en",
  ja: "ja",
};

/** OGP のロケール表記。 */
export const localeOg: Record<Locale, string> = {
  en: "en_US",
  ja: "ja_JP",
};

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "ja";
}

/** URL からロケールを取り出す。未指定なら既定（英語）。 */
export function localeFromPath(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocale(first) ? first : defaultLocale;
}

/** パスからロケール接頭辞を除いた部分。 */
export function stripLocale(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (isLocale(parts[0])) {
    const rest = parts.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname || "/";
}

/** パスにロケール接頭辞を付ける。 */
export function withLocale(path: string, locale: Locale): string {
  const bare = stripLocale(path);
  return bare === "/" ? `/${locale}` : `/${locale}${bare}`;
}
