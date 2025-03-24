// 上下文对象
export type IsoString = string;

// client params
export type ClientParams = {
    // 交易标的
    symbol: string;
    // 结算币种
    ccy: string;
    // 账户信息
    account: any;
    // 其他信息
    options: any;
};

// client settings 
export enum ClientSettings {
    MaxFills = 200,
    OrderbookLength = 20,
    GTT = 300,
    ListLenths = 120,
    // 挂单有效期
    GoodTillTime = 60 * 60 * 24 * 7 * 4,
    // 下单间隔1s
    OrderInterval = 1,
    // 下单间隔2s
    OrderInterval2 = 2,
}

// dydx 账户结构
export type DydxAccount = {
    // 钱包地址
    address: string;
    subaccount: number;
    privateKey?: string;
    mnemonic: string;
}
// dydx 账户结构
export type OkxAccount = {
    apiKey: string,
    passphrase: string,
    secretKey: string,
    formally: boolean,
}

// 价格-量对
export type PriceLevel = {
    price: number;
    size: number;
};

// 订单簿列表
export interface Orderbook {
    bids: PriceLevel[];
    asks: PriceLevel[];
}
// 蜡烛周期
export enum CandleResolution {
    MIN1 = "1MIN",
    MIN5 = "5MINS",
    MIN15 = "15MINS",
    MIN30 = "30MINS",
    HOUR1 = "1HOUR",
    HOUR4 = "4HOURS",
    DAY1 = "1DAY",
}
// 蜡烛结构
export interface Candle {
    startedAt: string;
    ticker: string;
    resolution: CandleResolution;
    low: number;
    high: number;
    open: number;
    close: number;
    baseTokenVolume: number;
    usdVolume: number;
    trades: string;
    startingOpenInterest: number;
    id: string;
}

// 持仓方向
export enum PositionSide {
    LONG = 'LONG',
    SHORT = 'SHORT',
}
// 头寸结构
export interface PositionData {
    symbol: string;
    side: PositionSide | null;
    size: number;
}
// 头寸状态
export enum PositionStatus {
    OPEN = "OPEN",
    CLOSED = "CLOSED",
    LIQUIDATED = "LIQUIDATED"
}
// 订单方向
export enum OrderSide {
    BUY = "BUY",
    SELL = "SELL"
}
// 订单类型
export enum OrderType {
    LIMIT = "LIMIT",
    MARKET = "MARKET",
    STOP_LIMIT = "STOP_LIMIT",
    TAKE_PROFIT_LIMIT = "TAKE_PROFIT",
    STOP_MARKET = "STOP_MARKET",
    TAKE_PROFIT_MARKET = "TAKE_PROFIT_MARKET"
}
// 有效时间
export enum OrderTimeInForce {
    GTT = "GTT",
    // 立即下单或取消订单
    IOC = "IOC",
    // Fill-Or-KILl
    FOK = "FOK"
}
// export declare enum OrderExecution {
//     DEFAULT = "DEFAULT",
//     IOC = "IOC",
//     FOK = "FOK",
//     // 强制要求订单只能作为挂单订单下达
//     POST_ONLY = "POST_ONLY"
// }

// 订单状态
// 兼容多个平台
export enum OrderStatus {
    BEST_EFFORT_OPENED = "BEST_EFFORT_OPENED",
    OPEN = "OPEN",
    PARTIAL = "PARTIALLY_FILLED",
    FILLED = "FILLED",
    BEST_EFFORT_CANCELED = "BEST_EFFORT_CANCELED",
    CANCELED = "CANCELED"
}
// 订单结构
export interface Order {
    id: string;
    account: string;
    subaccountId: string;
    clientId: number;
    side: OrderSide;
    size: number;
    ticker: string;
    price: number;
    type: OrderType;
    timeInForce?: OrderTimeInForce;
    postOnly?: boolean;
    reduceOnly: boolean;
    status: OrderStatus;
    orderFlags: string;
    totalFilled?: number;
    filledPrice?: number;
    fee: number;
    goodTilBlock?: number;
    goodTilBlockTime?: number;
    createdAtHeight?: number;
    clientMetadata: string;
    triggerPrice?: string;
    updatedAt?: IsoString;
    updatedAtHeight?: number;
}
// 成交结构
export interface Fill {
    id: string;
    account: string;
    subaccountId: string;
    orderId: string;
    side: OrderSide;
    size: number;
    type: OrderType;
    ticker: string;
    price: number;
    fee: number;
    createdAt?: IsoString;
    quoteAmount: number;
}

// 策略订阅
export enum SubTypes {
    Account = "account",
    Position = "position",
    Order = "order",
    Deal = "deal",
    Tick = "tick",
    Candles = "candles",
    Orderbook = "orderbook",
    Trades = "trades",
};

// 回调函数注册
export type CallBackFuncs = {
    accountFunc?: (accountInfo: AccountInfo) => Promise<void>;
    positionFunc?: (positions: PositionData[]) => Promise<void>;
    orderFunc?: (order: Order) => Promise<void>;
    fillFunc?: (fill: Fill) => Promise<void>;
    tickFunc?: (price: number) => Promise<void>;
    candleFunc?: (candle: Candle, resolution: CandleResolution) => Promise<void>;
    orderBookFunc?: () => Promise<void>;
    tradesFunc?: () => Promise<void>;
};

// 账户基本信息
export interface AccountInfo {
    // 账户
    // dydx.address
    // okx.uid
    account: string;
    // 子账户
    subaccount: number;
    // 资产
    equity: number;
    // 可用资金USDC
    balance: number;
    // 持仓
    positions: PositionData[];
    // 持仓估值
    asset: number;
}
