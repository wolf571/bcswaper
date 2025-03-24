// 策略执行器
// 对策略的启动、运行和停止进行管理

import { ISwapUser } from "@/service/swapUser";
import { capitalizeFirstLetter } from "@/utils/formatter";

// swap map 
const swapMap: Map<string, ISwapUser> = new Map();

// 根据exchange和name生成swapName
export const generateName = (swap: API.Swap) => {
    return capitalizeFirstLetter(swap.exchange) + capitalizeFirstLetter(swap.name);
}

// 获取实例
export const get = (name: string): ISwapUser | undefined | null => {
    return swapMap.get(name);
}

// 设置实例
export const set = (name: string, obj: ISwapUser) => {
    swapMap.set(name, obj);
}

// 判断是否存在交易运行实例
export const exist = (name: string) => {
    const s = swapMap.get(name);
    if (s) {
        return true;
    }
    return false;
}

// 移除
export const remove = (name: string) => {
    swapMap.delete(name);
}