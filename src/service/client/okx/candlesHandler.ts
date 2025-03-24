// 
import { conerr, conlog } from "@/utils/bchelper";
import { CallBackFuncs, ClientSettings, Candle } from "../context";
import { reverseResolution } from "./okxContext";

// 蜡烛图
export class CandlesHandler {
    private readonly symbol: string;
    private clientCallBackFuncs: CallBackFuncs;
    private candleMap!: Map<string, Candle[]>;

    constructor(symbol: string,
        clientCallBackFuncs: CallBackFuncs,
    ) {
        this.symbol = symbol;
        this.clientCallBackFuncs = clientCallBackFuncs;
        this.candleMap = new Map();
    }

    // 初始化K线
    public async initialize(resolution: string, data: string[][]) {
        let candles: Candle[] = [];
        this.candleMap.set(resolution, candles);
        data?.forEach(d => {
            const c = this.convertCandle(d);
            candles.push(c);
        })
    }

    // 解析ws k
    public async resolve(resolution: string, data: any[]) {
        // conlog(`resolve candle ${resolution}: `, data);
        if (data?.length === 0) {
            return;
        }
        const d = data[0];
        const cm = this.candleMap.get(resolution) || [];
        // 对于不存在的resolution不处理
        if (cm.length === 0) {
            conerr(`no initialize candles for symbol ${this.symbol}/${resolution}`);
            return;
        }
        const candle = this.convertCandle(d);
        //compare startedAt
        const at: string = candle.startedAt;
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
        // conlog(`resolution: ${resolution}, got candle: `, candle);
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

    // 获取K线列表
    public getCandles(resolution: any): Candle[] {
        return this.candleMap.get(resolution) || [];
    }

    // 根据data获取candle数据
    private convertCandle(data: string[]) {
        const candle = <Candle>{
            startedAt: data[0],
            open: Number(data[1]),
            high: Number(data[2]),
            low: Number(data[3]),
            close: Number(data[4]),
            baseTokenVolume: Number(data[5]),
            usdVolume: Number(data[5]),
        };

        return candle;
    }
}