"use server"

import { createConf, findConf } from "@/db/sqliteHandler";

// 获取配置信息
export const findConfig = async () => {
    const conf = await findConf();

    if (!conf) {
        // 默认值
        const cf = <API.Conf>{
            id: 1,
            locale: "zh",
            // 下单间隔s
            orderInterval: 3,
            // 下单重试次数
            effortTimes: 1,
            // 下单重试间隔s
            effortInterval: 20,
            // 撤单重试次数
            cancelingTimes: 1,
            // 撤单重试间隔s
            cancelingInterval: 10,
            // 
            bestEffortSeconds: 3,
            // 扫单时给出的溢/折价
            marketSpreads: 0.0001,
            // 订单缓存时间day
            orderCacheDays: 30,
            // 日志保留时间day
            logKeepDays: 10,
        }
        // 创建记录
        createConf(cf);

        return cf;
    }

    return conf;
}