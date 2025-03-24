import { ClientParams, DydxClient, OrderSide, PositionSide } from "@/service/client";
import { AbstractEngine, ErrorType } from "./engines";
import { conerr } from "@/utils/bchelper";

// dydx enchange
export class DyDxEngine extends AbstractEngine {

    // 
    constructor(clientParams: ClientParams) {
        super();
        this.client = new DydxClient(clientParams);
    }
    async buy(price: number, size: number): Promise<boolean> {
        // 加价.01%
        const pc = price * (1 + Number(this.settings.MarketSpreads));
        return super.buy(pc, size);
    }
    async sell(price: number, size: number): Promise<boolean> {
        // 折价.01%
        const pc = price * (1 - this.settings.MarketSpreads);
        return super.sell(pc, size);
    }
    async close(side: PositionSide, price: number, size: number): Promise<boolean> {
        const p = side === PositionSide.LONG ? price * (1 - Number(this.settings.MarketSpreads)) : price * (1 + this.settings.MarketSpreads);
        return super.close(side, p, size);
    }
    // 错误处理
    onerror(err: any): void {
        const e: ErrorType = {
            code: err.code,
            message: err,
            result: err.result,
            remark: err.codespace,
        }
        conerr(e);
    }
}