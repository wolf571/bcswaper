import { CandleResolution, OrderSide, OrderStatus, OrderType } from "../context";

// okx 常量
export const OkxConstants = {
    HTTP_ENDPOINT: "https://www.okx.com",
    PUBLIC_ENDPOINT: 'wss://ws.okx.com:8443/ws/v5/public',
    PRIVATE_ENDPOINT: 'wss://ws.okx.com:8443/ws/v5/private',
    BUSINESS_ENDPOINT: 'wss://ws.okx.com:8443/ws/v5/business',
    DEMO_PUBLIC_ENDPOINT: 'wss://wspap.okx.com:8443/ws/v5/public',
    DEMO_PRIVATE_ENDPOINT: 'wss://wspap.okx.com:8443/ws/v5/private',
    DEMO_BUSINESS_ENDPOINT: 'wss://wspap.okx.com:8443/ws/v5/business',
}

// okx resolution 与自定义resolution关系
const resolutions: [string, CandleResolution][] = [
    ["candle1m", CandleResolution.MIN1],
    ["candle5m", CandleResolution.MIN5],
    ["candle15m", CandleResolution.MIN15],
    ["candle30m", CandleResolution.MIN30],
    ["candle1H", CandleResolution.HOUR1],
    ["candle4H", CandleResolution.HOUR4],
    ["candle1D", CandleResolution.DAY1],
];
// CandleResolution对应map
const resolutionMap: Map<string, CandleResolution> = new Map(resolutions);

// 将自定义resolution转换为api格式
export const convertResolution = (resolution: CandleResolution): string | null => {
    const rs = resolutions.find(([k, v], _) => v === resolution);
    if (!rs) {
        return null;
    }
    return rs[0];
}

// 将api格式resolution转换为自定义格式
export const reverseResolution = (resolution: string): CandleResolution | undefined => {
    return resolutionMap.get(resolution);
}

// 将api order type 转换成自定义格式
const ordertypes: [string, OrderType][] = [
    ["market", OrderType.MARKET],
    ["limit", OrderType.LIMIT],
];
const ordertypeMap: Map<string, OrderType> = new Map(ordertypes);

export const convertOrderType = (orderType: string) => {
    return ordertypeMap.get(orderType);
}

// 将api order side 转换成自定义格式
const ordersides: [string, OrderSide][] = [
    ["buy", OrderSide.BUY],
    ["sell", OrderSide.SELL],
];
const ordersideMap: Map<string, OrderSide> = new Map(ordersides);

export const convertOrderSide = (orderside: string) => {
    return ordersideMap.get(orderside);
}

// 将api order state 转换为自定义格式
const orderstates: [string, OrderStatus][] = [
    ["live", OrderStatus.OPEN],
    ["partially_filled", OrderStatus.PARTIAL],
    ["filled", OrderStatus.FILLED],
    ["canceled", OrderStatus.CANCELED],
];
const orderstateMap: Map<string, OrderStatus> = new Map(orderstates);
export const convertOrderStatus = (state: string) => {
    return orderstateMap.get(state);
}

// typings
// event
export enum EventType {
    Login = "login",
    Subscribe = "subscribe",
    Unsubscribe = "unsubscribe",
    Trade = "trade",
    Error = "error",
}

// channel
export enum ChannelType {
    Tickers = "tickers",
    Candle = "candle",
    Orders = "orders",
    Fills = "fills",
    Account = "account",
    Positions = "positions",
}

// operation
export enum OpType {
    // 下单
    Order = "order",
    // 撤单
    Cancel = "cancel-order",
}

// instType
export enum InstType {
    // 币币
    SPOT = "SPOT",
    // 币币杠杆
    MARGIN = "MARGIN",
    // 永续合约
    SWAP = "SWAP",
    // 交割合约
    FUTURES = "FUTURES",
    // 期权
    OPTION = "OPTION",
}

// 产品信息
export type InstInfo = {
    instType: InstType;
    instId: string;
    uly: string;
    instFamily: string;
    baseCcy: string;
    quoteCcy: string;
    settleCcy: string;
    ctVal: number;
    ctMult: number;
    ctValCcy: string;
    optType: string;
    stk: number;
    listTime: number;
    auctionEndTime: number;
    expTime: number;
    lever: number;
    tickSz: number;
    // 下单数量精度，合约的数量单位是张，现货的数量单位是交易货币
    lotSz: string;
    minSz: number;
    ctType: string;
    state: string;
    ruleType: string;
    maxLmtSz: number;
    maxMktSz: number;
    maxLmtAmt: number;
    maxMktAmt: number;
    maxTwapSz: number;
    maxIcebergSz: number;
    maxTriggerSz: number;
    maxStopSz: number;
}

// private
// 账户频道
export type AccountChannel = {
    channel: 'account',
    ccy?: string,
    extraParams?: string,
}
// 持仓频道
export type PositionsChannel = {
    channel: 'positions'
    instType: string
    instFamily?: string
    instId?: string
    extraParams?: string,
}
// 账户余额和持仓频道
export type BalanceAndPositionChannel = {
    channel: 'balance_and_position'
    instType: string
    instFamily?: string
    instId?: string
}
// 订单频道
export type OrdersChannel = {
    channel: 'orders'
    instType: string
    instFamily?: string
    instId?: string
}
// 成交频道
export type FillsChannel = {
    channel: 'fills'
    instId?: string
}
// 策略委托订单频道
export type AlgoOrdersChannel = {
    channel: 'orders-algo'
    instType: string
    instFamily?: string
    instId?: string
}
// 高级策略委托订单频道
export type AdvanceAlgoOrdersChannel = {
    channel: 'algo-advance'
    instType: string
    instId?: string
    algoId?: string
}
export type PositionRiskWarningChannel = {
    channel: 'liquidation-warning'
    instType: string
    instFamily?: string
    instId?: string
}
export type AccountGreeksChannel = {
    channel: 'account-greeks'
    ccy?: string
}
export type SpotGridAlgoOrdersChannel = {
    channel: 'grid-orders-spot'
    instType: string
    instId?: string
    algoId?: string
}
export type ContractGridAlgoOrdersChannel = {
    channel: 'grid-orders-contract'
    instType: string
    instId?: string
    algoId?: string
}
export type MoonGridAlgoOrdersChannel = {
    channel: 'grid-orders-moon'
    instType: string
    instId?: string
    algoId?: string
}
export type GridPositionsChannel = {
    channel: 'grid-positions'
    algoId: string
}
export type GridSubordersChannel = {
    channel: 'grid-sub-orders'
    algoId: string
}

// public
export type InstrumentsChannel = {
    channel: 'instruments'
    instType: string
}
// 行情频道
export type TickersChannel = {
    channel: 'tickers'
    instId: string
}
export type OpenInterestChannel = {
    channel: 'open-interest'
    instId: string
}
// K线频道
export type CandlesticksChannel = {
    channel: string,
    instId: string,
}
// 交易频道
export type TradesChannel = {
    channel: 'trades'
    instId: string
}
export type EstimatedPriceChannel = {
    channel: 'estimated-price'
    instType: string
    instFamily?: string
    instId?: string
}
export type MarkPriceChannel = {
    channel: 'mark-price'
    instId: string
}
export type MarkPriceCandlesticksChannel = {
    channel: `mark-price-candle${string}`
    instId: string
}
export type PriceLimitChannel = {
    channel: 'price-limit'
    instId: string
}
export type OrderBookChannel = {
    channel: 'books' | 'books5' | 'books50-l2-tbt' | 'books-l2-tbt'
    instId: string
}
export type OptionSummaryChannel = {
    channel: 'opt-summary'
    instFamily: string
}
export type FundingRateChannel = {
    channel: 'funding-rate'
    instId: string
}
export type IndexCandlesticksChannel = {
    channel: `index-candle${string}`
    instId: string
}
export type IndexTickersChannel = {
    channel: 'index-tickers'
    instId: string
}
export type StatusChannel = {
    channel: 'status'
}
