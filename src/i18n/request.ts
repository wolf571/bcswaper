// 
import { getRequestConfig } from 'next-intl/server';
import { getLocale } from './context';

// 
export default getRequestConfig(async () => {
    const locale = await getLocale();
    // console.log("locale==", locale)
    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default
    };
});

