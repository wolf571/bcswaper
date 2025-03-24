// 
import { conerr, isObjectEmpty } from "@/utils/bchelper";
import { ClientSettings, CallBackFuncs, Candle, CandleResolution } from "../context";
import { reverseResolution } from "./dydxContext";

// 蜡烛图
export class CandlesHandler {
    private symbol: string;
    private clientCallBackFuncs: CallBackFuncs;
    private candleMap!: Map<string, Candle[]>;

    // 当前价格
    private currentPrice: number = 0;

    constructor(symbol: string,
        clientCallBackFuncs: CallBackFuncs,
    ) {
        this.symbol = symbol;
        this.clientCallBackFuncs = clientCallBackFuncs;
        this.candleMap = new Map();
    }

    // subscribed initial
    public async initialize(obj: any) {
        // console.log("initial candles: ", JSON.stringify(obj));
        const { id, contents } = obj;
        const confirm = await isObjectEmpty(contents?.candles);
        if (confirm) {
            conerr(`no initialized candles available for symbol ${this.symbol}`);
            return;
        }
        const rs = id?.split("/");
        if (rs.length < 2) {
            conerr(`error id found: ${id}`);
            return;
        }
        const resolution = rs[1];
        let candles: Candle[] = contents.candles;
        this.candleMap.set(resolution, candles);
        // 最长保存120个周期
        if (candles.length > ClientSettings.ListLenths) {
            candles = candles.slice(0, ClientSettings.ListLenths);
        }
        // price
        const p = candles[0].close;
        this.resetPrice(p);
    }

    // channel data
    public async update(obj: any) {
        // console.log("update candle: ", obj);
        const { id, contents } = obj;
        const confirm = await isObjectEmpty(contents);
        if (confirm) {
            conerr(`no candle available to update for symbol ${this.symbol}`);
            return;
        }
        const rs = id?.split("/");
        if (rs.length < 2) {
            return;
        }

        const resolution = rs[1];
        const cm = this.candleMap.get(resolution) || [];
        // 对于不存在的resolution不处理
        if (cm?.length == 0) {
            conerr(`no initialized candles for symbol ${this.symbol}/${resolution}`);
            return;
        }
        const candle = contents[0];
        // current price
        const p = candle.close;
        await this.resetPrice(p);
        //compare startedAt
        const at: string = candle.startedAt as string;
        const compare = at.localeCompare(cm[0].startedAt);
        if (compare > 0) {
            const length = cm.unshift(candle);
            if (length > ClientSettings.ListLenths) {
                cm.pop();
            }
        } else if (compare === 0) {
            cm[0] = candle;
        } else {
            // 重复回调，不操作
            return;
        }
        // console.log(`resolution: ${resolution}, got candle: `, candle);
        //有新的K线，进行回调
        if (this.clientCallBackFuncs.candleFunc) {
            const rc = reverseResolution(resolution);
            if (!rc) {
                conerr("resolution converted error: ", resolution);
                return;
            }
            await this.clientCallBackFuncs.candleFunc(candle, rc);
        }
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

    // 获取K线列表
    public getCandles(resolution: any): Candle[] {
        return this.candleMap.get(resolution) || [];
    }
}