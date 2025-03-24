// 
import { conerr, isObjectEmpty } from "@/utils/bchelper";

export class MarketsHandler {
    private symbol: string;
    private marketData: TradingPerpetualMarketMessage = {};

    constructor(symbol: string) {
        this.symbol = symbol;
    }

    // subscribed initial
    public async initialize(obj: any) {
        const markets = obj.contents.markets;
        const symbolData = markets[this.symbol];
        if (symbolData) {
            this.marketData = symbolData;
        } else {
            conerr(`no data available for symbol ${this.symbol}`);
        }
    }

    // channel data
    public async update(obj: any) {
        const contents = obj.contents;
        const confirm = await isObjectEmpty(contents);
        if (confirm) {
            return;
        }
        for (const item of contents) {
            // item type is trding
            if (item.trading) {
                const trading = item.trading;
                if (!trading[this.symbol]) {
                    continue;
                }
                const symbolData = trading[this.symbol];
                Object.assign(this.marketData, symbolData);
            }
        }
    }
}

// 
interface TradingPerpetualMarketMessage {
    id?: string;
    clobPairId?: string;
    ticker?: string;
    marketId?: number;
    status?: PerpetualMarketStatus; // 'ACTIVE', 'PAUSED', 'CANCEL_ONLY', 'POST_ONLY', or 'INITIALIZING'
    baseAsset?: string;
    quoteAsset?: string;
    initialMarginFraction?: string;
    maintenanceMarginFraction?: string;
    basePositionSize?: string;
    incrementalPositionSize?: string;
    maxPositionSize?: string;
    openInterest?: string;
    quantumConversionExponent?: number;
    atomicResolution?: number;
    subticksPerTick?: number;
    stepBaseQuantums?: number;
    priceChange24H?: string;
    volume24H?: string;
    trades24H?: number;
    nextFundingRate?: string;
}

export enum PerpetualMarketStatus {
    ACTIVE = "ACTIVE",
    PAUSED = "PAUSED",
    CANCEL_ONLY = "CANCEL_ONLY",
    POST_ONLY = "POST_ONLY"
}