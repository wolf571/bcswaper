// tickerHandler.ts
// import { conerr, conlog } from '../utils';
import { CallBackFuncs } from "../context";

export class TickerHandler {
    private readonly symbol: string;
    // 当前价格
    private currentPrice: number = 0;
    private clientCallBackFuncs: CallBackFuncs;

    constructor(
        symbol: string = "ETH-USD",
        clientCallBackFuncs: CallBackFuncs,
    ) {
        this.symbol = symbol;
        this.clientCallBackFuncs = clientCallBackFuncs;
    }

    // 账户数据解析
    public async resolve(data: any[]) {
        // conlog(`=== resolve ticker data: \n `, JSON.stringify(data));
        if (data?.length === 0) {
            return;
        }
        const p = Number(data[0].last);
        await this.resetPrice(p);
    }

    // 设置当前价格
    public async resetPrice(price: number) {
        if (price === this.currentPrice) {
            return;
        }
        this.currentPrice = price;
        if (this.clientCallBackFuncs.tickFunc) {
            await this.clientCallBackFuncs.tickFunc(this.currentPrice);
        }
    }

    //获取当前价格
    public getPrice(): number {
        return this.currentPrice;
    }
}