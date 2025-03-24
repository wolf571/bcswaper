"use server"
import * as ts from 'typescript';
import _ from "lodash";

// 判断是否为空字符串
export const isEmpty = async (str: string | null | undefined): Promise<boolean> => {
    return _.isEmpty(str);
}

// confirm whether the object is empty
export const isObjectEmpty = async (obj: any): Promise<boolean> => {
    // 首先检查是否为null或undefined  
    if (obj === null || obj === undefined) {
        return true;
    }
    // 最后，检查对象是否有任何自身的属性  
    return Object.keys(obj).length === 0;
}

// 输出带时间戳的日志
export const conlog = async (...message: any[]) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]::`, ...message);
}

export const conerr = async (...message: any[]) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}]::`, ...message);
}
// 过滤重复项
export const unique = async (array: any[]): Promise<any[]> => {
    return Array.from(new Set(array));
}

// 休眠一定时间，毫秒
export const sleep = async (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 动态编译
export const dynamicTsc = async (code: string): Promise<string> => {
    const program = ts.transpileModule(code, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2020
        }
    });
    return program.outputText;
}