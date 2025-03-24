// 上下文对象
// 数据归属策略设置的symbol
export const monacoExtraLib: string = `

declare type IsoString = string;

// 价格-量对
declare type PriceLevel = {
    price: number;
    size: number;
};

// 订单簿列表
declare interface Orderbook {
    bids: PriceLevel[];
    asks: PriceLevel[];
}

// 蜡烛周期
declare enum CandleResolution {
    MIN1 = "1MIN",
    MIN5 = "5MINS",
    MIN15 = "15MINS",
    MIN30 = "30MINS",
    HOUR1 = "1HOUR",
    HOUR4 = "4HOURS",
    DAY1 = "1DAY",
}
// 蜡烛结构
declare interface Candle {
    startedAt: string;
    ticker: string;
    resolution: CandleResolution;
    low: number;
    high: number;
    open: number;
    close: number;
    baseTokenVolume: number;
    usdVolume: number;
    trades: number;
    startingOpenInterest: number;
    id: string;
}
declare interface Order {
    id: string;
    subaccountId: string;
    clientId: number;
    side: OrderSide;
    size: number;
    ticker: string;
    price: number;
    type: OrderType;
    timeInForce: OrderTimeInForce;
    status: OrderStatus;
    postOnly: boolean;
    reduceOnly: boolean;
    orderFlags: string;
    totalFilled?: number;
    createdAtHeight?: number;
    clientMetadata: string;
    triggerPrice?: number;
    updatedAt?: IsoString;
    updatedAtHeight?: number;
}
declare interface Fill {
    id: string;
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
declare enum OrderType {
    LIMIT = "LIMIT",
    MARKET = "MARKET",
    STOP_LIMIT = "STOP_LIMIT",
    TAKE_PROFIT_LIMIT = "TAKE_PROFIT",
    STOP_MARKET = "STOP_MARKET",
    TAKE_PROFIT_MARKET = "TAKE_PROFIT_MARKET"
}
// 方向
declare enum OrderSide {
    BUY = "BUY",
    SELL = "SELL"
}
// 有效时间
declare enum OrderTimeInForce {
    GTT = "GTT",
    // 立即下单或取消订单
    IOC = "IOC",
    // Fill-Or-KILl
    FOK = "FOK"
}
// declare enum OrderExecution {
//     DEFAULT = "DEFAULT",
//     IOC = "IOC",
//     FOK = "FOK",
//     // 强制要求订单只能作为挂单订单下达
//     POST_ONLY = "POST_ONLY"
// }

// 订单状态状态
declare enum OrderStatus {
    BEST_EFFORT_OPENED = "BEST_EFFORT_OPENED",
    OPEN = "OPEN",
    PARTIAL = "PARTIALLY_FILLED",
    FILLED = "FILLED",
    BEST_EFFORT_CANCELED = "BEST_EFFORT_CANCELED",
    CANCELED = "CANCELED"
}
// 持仓方向
declare enum PositionSide {
    LONG = 'LONG',
    SHORT = 'SHORT',
}
// 头寸结构
declare interface PositionData {
    symbol: string;
    side: PositionSide;
    size: number;
}
// 头寸状态
declare enum PositionStatus {
    OPEN = "OPEN",
    CLOSED = "CLOSED",
    LIQUIDATED = "LIQUIDATED"
}
// 账户基本信息
declare interface AccountInfo {
    // 账户地址
    address: string;
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
// Engine define
declare interface Engine {
    // 当前价格
    getPrice(): number;
    // 订单簿
    getOrderbook(): Orderbook;
    // 获取蜡烛列表
    getCandles(resolution: CandleResolution): Candle[];
    // 获取某一资产的头寸，若参数为空，则返回默认品种（即策略设置的品种）头寸
    getAccountInfo(): AccountInfo;

    // 是否存在下单等待
    existEffort(side: OrderSide): boolean;
    // 是否存在撤单等待
    existCanceling(): boolean;

    // 市价买
    buy(
        price: number,
        size: number): Promise<boolean>;
    // 市价卖
    sell(
        price: number,
        size: number,): void;
    buyLimit(price: number, size: number): Promise<boolean>;
    buyLimit2(price: number, size: number): Promise<boolean>;
    sellLimit(price: number, size: number): Promise<boolean>;
    sellLimit2(price: number, size: number): Promise<boolean>;
    // 市价平仓
    close(side: PositionSide, price: number, size: number): Promise<boolean>;
    closeLimit(side: PositionSide, price: number, size: number, goodTillTime?: number): Promise<boolean>;
    // 取消订单
    cancel(order: Order): Promise<boolean>;
}

// 用户方法define
declare class SwapUser {
    // 交易品种
    symbol: string;
    bcswap: Engine;
    subscribeTick(): void;
    subscribeCandle(resolution: CandleResolution): void;
    timer(rule: string | Date | number, f: Function): void;
    getOrders(): Order[];
    setOrder(order: Order): Promise<void>;
    clearOrders(): Promise<void>;
    getOrdersBySide(side: OrderSide): Order[];
    getProfitOpenedOrders(side: OrderSide, price: number, diff?: number): Order[];
    getCancledOrder(side: OrderSide): Order | null;
    getCancledOpeningOrderWithPrice(side: OrderSide, price: number): Order | null;
    getCancledClosingOrder(side: OrderSide): Order | null;
    getCancledClosingOrderWithPrice(side: OrderSide, price: number): Order | null;
    clearLapseOrders(side: OrderSide): Promise<void>;
    cancelOpenedOrders(side: OrderSide, price: number, diff: number): Promise<void>;
    clean(side: PositionSide, price: number): Promise<boolean>;
    clearCanceledClosingOrders(side: OrderSide): Promise<void>;
    removeOrder(id: string): Promise<void>;
    validPosition(side: PositionSide, size: number): boolean;
    log(...message: any): Promise<void>;
    conlog2(...message: any): Promise<void>;
    calculateSize(price: number, n: number): number;
    addNumber(price: number, diff: number): number;
    subNumber(price: number, diff: number): number;
}
`;
