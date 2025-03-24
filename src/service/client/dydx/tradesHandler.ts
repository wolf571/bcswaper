// TradesHandler.ts
import { conerr, conlog } from "@/utils/bchelper";
import { ClientSettings, IsoString } from "../context";

export class TradesHandler {
    private symbol: string;
    private trades!: TradeContent[];

    constructor(symbol: string) {
        this.symbol = symbol;
        this.trades = [];
    }

    // initialize
    public async initialize(obj: any) {
        const { id, contents } = obj;

        if (contents.trades) {
            this.trades = contents.trades;
        }
    }

    // update
    public async update(obj: any) {
        const { id, contents } = obj;

        // Update trades
        if (!contents.trades) {
            conerr("got empty contents for trades channel.")
            return;
        }
        this.trades.unshift(contents.trades);
        if (this.trades.length > ClientSettings.ListLenths) {
            this.trades.pop();
        }
    }

    // 
    public getTrades(): TradeContent[] {
        return this.trades;
    }
}

interface TradeContent {
    // Unique id of the trade, which is the taker fill id.
    id: string,
    size: string,
    price: string,
    side: string,
    createdAt: IsoString,
    type: TradeType,
}
export enum TradeType {
    // LIMIT is the trade type for a fill with a limit taker order.
    LIMIT = 'LIMIT',
    // LIQUIDATED is the trade type for a fill with a liquidated taker order.
    LIQUIDATED = 'LIQUIDATED',
    // DELEVERAGED is the trade type for a fill with a deleveraged taker order.
    DELEVERAGED = 'DELEVERAGED',
}