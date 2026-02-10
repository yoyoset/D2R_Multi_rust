import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { invoke } from "@tauri-apps/api/core";

import zhCN from "./locales/zh-CN";
import en from "./locales/en";
import zhTW from "./locales/zh-TW";
import ja from "./locales/ja";
import ko from "./locales/ko";

const resources = {
    "zh-CN": { translation: zhCN },
    "en": { translation: en },
    "zh-TW": { translation: zhTW },
    "ja": { translation: ja },
    "ko": { translation: ko }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "zh-CN", // Default language
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

// Listen for language changes and update System Tray
i18n.on('languageChanged', (lng) => {
    invoke('update_tray_language', { lang: lng }).catch(console.error);
});

// Initial update on load
setTimeout(() => {
    invoke('update_tray_language', { lang: i18n.language }).catch(console.error);
}, 500);

export default i18n;
