import { createContext, useContext } from "react";
import { messages, type Messages } from "./messages";
import type { Locale } from "./locale";

interface I18nValue {
  locale: Locale;
  t: Messages;
}

const I18nContext = createContext<I18nValue>({ locale: "en", t: messages.en });

export const I18nProvider = I18nContext.Provider;

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
