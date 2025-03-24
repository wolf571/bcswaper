// 
// const options = { year: 'numeric', month: 'long', day: 'numeric' };

//格式化时间
// yyyy/MM/dd
export const formatDate = (date: any): string => {
    if (!date) {
        return '';
    }
    return new Intl.DateTimeFormat().format(date);
}

// yyyyMMdd
export const formatToYYYYMMDD = (date: Date): string => {
    // 获取年、月、日  
    const year = date.getFullYear().toString().padStart(4, '0'); // 年份，至少4位  
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // 月份，+1是因为getMonth()是从0开始的，至少2位  
    const day = date.getDate().toString().padStart(2, '0'); // 日期，至少2位  

    // 拼接并返回结果  
    return `${year}${month}${day}`;
}
// 将时间戳转换成iso date string
export const timestampToISOString = (timestamp: number): string => {
    if (!timestamp) {
        return new Date().toISOString();
    }
    const date = new Date(Number(timestamp));
    return date.toISOString();
}

//将当前时间戳转为string
export const generateDate = (): string => {
    const n = Date.now();
    return n.toString();
}

// 首字母大写
export const capitalizeFirstLetter = (str: string): string => {
    if (!str) return '';
    return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
}

// 将字符串的部分字段变为*
export const replaceWithStars = (str: string, start: number, end: number): string => {
    // 检查索引是否在字符串范围内  
    if (start < 0 || end > str.length || start >= end) {
        return str;
    }
    // 计算需要替换的字符数  
    const numCharsToReplace = end - start;
    return str.substring(0, start) + '*'.repeat(numCharsToReplace) + str.substring(end);
}

// 根据正则表达式将部分字母变为*
export const replaceWithStarsByRegex = (str: string, regex: RegExp): string => {
    // 使用全局标志确保替换所有匹配项  
    return str.replace(regex, (match) => {
        // 使用'match[0]'来获取完整的匹配项，然后使用'.repeat()'生成相应数量的'*'  
        return '*'.repeat(match[0].length);
    });
}

// 计算一个数字的小数位数
export const countDecimalPlaces = (num: number): number => {
    // 将数字转换为字符串  
    const numberString = num.toString();
    // 查找小数点的位置  
    const decimalPointIndex = numberString.indexOf('.');
    // 如果没有小数点，则小数位数为 0
    if (decimalPointIndex === -1) {
        return 0;
    }
    // 返回小数部分的长度  
    return numberString.slice(decimalPointIndex + 1).length;
}

// 格式化数字，保留小数位数
export const formatNumber = (num: number, decimalPlaces: number): string => {
    if (decimalPlaces < 0) {
        decimalPlaces = 0;
    }
    if (decimalPlaces > 20) {
        decimalPlaces = 20;
    }
    // 使用 toFixed 方法格式化数字为字符串，并保留指定的小数位数  
    return num.toFixed(decimalPlaces);
}

// 让一个数字的小数位数与另一个数字相同
export const alignDecimalPlaces = (num1: number, num2: string): number => {
    // 获取num2的小数位数
    const decimalPlaceCount = num2.includes('.') ? num2.split('.')[1].length : 0;

    if (decimalPlaceCount === 0) {
        // 如果num2是整数，直接返回num1的整数部分
        return Math.trunc(num1);
    }

    // 计算因子（10的幂），用于将小数部分转换为整数
    const factor = Math.pow(10, decimalPlaceCount);

    // 将num1乘以因子，四舍五入到最接近的整数，然后再除以因子
    const alignedNum1 = Math.round(num1 * factor) / factor;

    return alignedNum1;
}

// 返回与一个数字小数位数相同的数字
export const fixedNumber = (num1: number, num2: string): string => {
    const decimalPlaceCount = num2?.includes('.') ? num2.split('.')[1].length : 0;
    return num1.toFixed(decimalPlaceCount)
}

// 字符串转Boolean
export const stringToBoolean = (str: string): boolean => {
    if (str.toLowerCase() === 'true' || str === '1') {
        return true;
    } else if (str.toLowerCase() === 'false' || str === '0') {
        return false;
    }
    return false;
}