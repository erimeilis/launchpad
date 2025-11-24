import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Import translation files
import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import uk from "./locales/uk.json";
import pl from "./locales/pl.json";

// Get preferred language
function getPreferredLanguage(): string {
  // Check if user has saved a language preference
  const savedLang = localStorage.getItem("launchpad-language");
  if (savedLang) {
    return savedLang;
  }

  // Otherwise, try to get language from navigator
  const browserLang = navigator.language.toLowerCase();

  // Map browser language codes to our supported languages
  const langMap: Record<string, string> = {
    en: "en",
    es: "es",
    fr: "fr",
    de: "de",
    zh: "zh",
    "zh-cn": "zh",
    "zh-tw": "zh",
    ja: "ja",
    uk: "uk",
    pl: "pl",
  };

  // Check exact match first
  if (langMap[browserLang]) {
    return langMap[browserLang];
  }

  // Check language prefix (e.g., "en-US" -> "en")
  const langPrefix = browserLang.split("-")[0];
  if (langMap[langPrefix]) {
    return langMap[langPrefix];
  }

  // Default to English
  return "en";
}

// Initialize i18next
i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      zh: { translation: zh },
      ja: { translation: ja },
      uk: { translation: uk },
      pl: { translation: pl },
    },
    lng: getPreferredLanguage(),
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

// Helper function to change language and save preference
export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  localStorage.setItem("launchpad-language", lang);
};

export default i18n;
