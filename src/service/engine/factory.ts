// 
import { findConf } from "@/db/sqliteHandler";
import { ClientParams } from "@/service/client";
import { DyDxEngine } from "./dydxEngine";
import { DefaultEngine } from "./defaultEngine";
import { OkxEngine } from "./okxEngine";
import { Engine, EngineSettings } from "./engines";

// 引擎工厂
export const EngineFactory = () => {
    return {
        // 获取策略引擎
        async get(exchange: string, clientParams: ClientParams): Promise<Engine> {
            const conf = await findConf();
            const settings = <EngineSettings>{
                // 下单间隔s
                OrderInterval: conf?.orderInterval || 3,
                // 下单重试次数
                EffortTimes: conf?.effortTimes || 0,
                // 下单重试间隔s
                EffortInterval: conf?.effortInterval || 20,
                // 撤单重试次数
                CancelingTimes: conf?.cancelingTimes || 2,
                // 撤单重试间隔s
                CancelingInterval: conf?.cancelingInterval || 10,
                // 扫单时给出的溢/折价
                MarketSpreads: conf?.marketSpreads || 0.001,
            }
            settings.Name = exchange;
            switch (exchange) {
                case "dydx":
                    const dydxEngine = new DyDxEngine(clientParams);
                    dydxEngine.settings = settings;
                    return dydxEngine;
                case "okx":
                    const okxEngine = new OkxEngine(clientParams);
                    okxEngine.settings = settings;
                    return okxEngine;
                default:
                    return new DefaultEngine(clientParams);
            }
        },
    }
}