import { findConf } from "@/db/sqliteHandler";

// 
const locales = ['en', 'zh'];
const defaultLocale = "zh";

export const getLocales = async () => {
    return locales;
}

export const getLocale = async (): Promise<string> => {
    const conf = await findConf();
    if (!conf) {
        return defaultLocale;
    }
    console.log("conf====", conf)
    return conf.locale || defaultLocale;
}

export const setLocale = (locale: string) => {

}