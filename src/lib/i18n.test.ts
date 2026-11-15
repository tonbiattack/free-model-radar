import { describe, expect, it } from "vitest";
import source from "../../data/i18n/source.json";
import en from "../../data/i18n/en.json";
import { translateAll, translateText, translationStats, untranslated } from "./data-i18n";
import {
  defaultLocale,
  isLocale,
  localeFromPath,
  locales,
  stripLocale,
  withLocale,
} from "./locale";
import { messages } from "./messages";

describe("ロケール判定", () => {
  it("既定は英語", () => {
    expect(defaultLocale).toBe("en");
  });

  it("パスの接頭辞から判定する", () => {
    expect(localeFromPath("/en/models/x")).toBe("en");
    expect(localeFromPath("/ja/models/x")).toBe("ja");
    expect(localeFromPath("/models/x")).toBe("en");
    expect(localeFromPath("/")).toBe("en");
  });

  it("接頭辞の有効性を判定する", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ja")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("接頭辞を剥がせる", () => {
    expect(stripLocale("/ja/models/x")).toBe("/models/x");
    expect(stripLocale("/en")).toBe("/");
    expect(stripLocale("/models/x")).toBe("/models/x");
  });

  it("接頭辞を付けられる", () => {
    expect(withLocale("/models/x", "ja")).toBe("/ja/models/x");
    expect(withLocale("/ja/models/x", "en")).toBe("/en/models/x");
    expect(withLocale("/", "en")).toBe("/en");
  });

  it("絞り込み条件を持つ URL でもロケールだけ差し替えられる", () => {
    // ヘッダーの切替は withLocale + 現在の search を使う
    const target = `${withLocale("/ja/models/gpt-oss-120b", "en")}?multi=1&provider=groq`;
    expect(target).toBe("/en/models/gpt-oss-120b?multi=1&provider=groq");
  });
});

describe("データ説明文の翻訳", () => {
  it("全文が翻訳されている", () => {
    expect(untranslated()).toEqual([]);
    expect(translationStats.translated).toBe(translationStats.total);
  });

  it("英語では訳を返す", () => {
    const first = source.entries[0]!;
    const translated = translateText(first.ja, "en");
    expect(translated).not.toBe(first.ja);
    expect(translated.length).toBeGreaterThan(0);
  });

  it("日本語では原文をそのまま返す", () => {
    const first = source.entries[0]!;
    expect(translateText(first.ja, "ja")).toBe(first.ja);
  });

  it("訳がない文字列は原文を返す（情報を消さない）", () => {
    const unknown = "この文字列は翻訳対象に含まれていない";
    expect(translateText(unknown, "en")).toBe(unknown);
  });

  it("配列をまとめて変換できる", () => {
    const first = source.entries[0]!;
    const result = translateAll([first.ja, "not translated"], "en");
    expect(result[0]).not.toBe(first.ja);
    expect(result[1]).toBe("not translated");
  });

  it("訳キーは原文の内容に対応している", () => {
    for (const entry of source.entries.slice(0, 20)) {
      expect(en[entry.key as keyof typeof en], entry.ja).toBeTruthy();
    }
  });

  it("英語訳に日本語が残っていない", () => {
    const japanese = /[\u3040-\u30ff\u4e00-\u9fff]/;
    for (const [key, value] of Object.entries(en)) {
      expect(japanese.test(value), `${key}: ${value}`).toBe(false);
    }
  });
});

describe("UI 文言", () => {
  it("日英で同じキーを持つ", () => {
    const enKeys = JSON.stringify(Object.keys(messages.en).sort());
    const jaKeys = JSON.stringify(Object.keys(messages.ja).sort());
    expect(jaKeys).toBe(enKeys);
  });

  it("入れ子のキーも揃っている", () => {
    for (const section of Object.keys(messages.en) as Array<keyof typeof messages.en>) {
      const enValue = messages.en[section];
      const jaValue = messages.ja[section];
      if (typeof enValue === "object" && enValue !== null) {
        expect(Object.keys(jaValue as object).sort(), String(section)).toEqual(
          Object.keys(enValue).sort(),
        );
      }
    }
  });

  it("言語切替のラベルは各言語の自称になっている", () => {
    expect(messages.en.nav.language).toBe("Language");
    expect(messages.ja.nav.language).toBe("言語");
  });

  it("状態語の意味が日英で対応している", () => {
    expect(messages.en.state.unknown).toBe("Unconfirmed");
    expect(messages.ja.state.unknown).toBe("未確認");
    expect(messages.en.state.toolsUnknown).toBe("Unknown");
    expect(messages.ja.state.toolsUnknown).toBe("不明");
    // 「非対応」と「不明」を混同しない
    expect(messages.en.state.toolsNo).not.toBe(messages.en.state.toolsUnknown);
    expect(messages.ja.state.toolsNo).not.toBe(messages.ja.state.toolsUnknown);
  });

  it("ロケール一覧と一致する", () => {
    expect(Object.keys(messages).sort()).toEqual([...locales].sort());
  });
});
