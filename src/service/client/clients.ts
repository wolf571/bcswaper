import { AccountInfo, CallBackFuncs, Candle, CandleResolution, ClientParams, Fill, Order, Orderbook, OrderSide, PositionData, PositionSide, SubTypes } from "./context";

// 交易客户端
export interface Client {
    // 运行状态
    running: boolean;
    getPrice(): number;
    // 订单簿
    getOrderbook(): Orderbook;
    // 获取蜡烛列表
    getCandles(resolution: CandleResolution): Candle[];
    // 获取账户信息
    getAccountInfo(): AccountInfo;

    //初始化
    initialize(): void;

    // 订阅
    subscribe(subTypes: SubTypes, callback: (param: any) => Promise<void>): void;
    // 订阅candle数据
    subscribeCandle(resolution: CandleResolution, callback: (candle: Candle, resolution: CandleResolution) => Promise<void>): void

    // 下短期单
    // shortTermOrder?(clientId: number, side: OrderSide, price: number, size: number): Promise<void>;
    // 市价买
    buy(clientId: number, price: number, size: number): Promise<void>;
    // 市价卖
    sell(clientId: number, price: number, size: number): Promise<void>;
    // 市价平仓
    close(clientId: number, side: PositionSide, price: number, size: number): Promise<void>;
    // 限价下单买
    buyLimit(clientId: number, price: number, size: number): Promise<void>;
    // 限价下单买，不转换size，与sellLimit对应
    buyLimit2(clientId: number, price: number, size: number): Promise<void>;
    // 限价下单卖
    sellLimit(clientId: number, price: number, size: number): Promise<void>;
    // 限价下单卖，不转换size，与buyLimit对应
    sellLimit2(clientId: number, price: number, size: number): Promise<void>;
    // 限价平仓
    closeLimit(clientId: number, side: PositionSide, price: number, size: number, goodTillTime: number): Promise<void>;
    // 取消订单
    cancel(order: Order): Promise<void>;

    // 停止
    destroy(): void;
}

// abstract client
export abstract class AbstractClient implements Client {
    running: boolean = false;
    // 交易标的
    protected symbol!: string;
    // 结算币种
    protected ccy!: string;
    // callback functions
    protected clientCallBackFuncs: CallBackFuncs = {};
    // K线订阅 map
    protected clientCandleMap: Map<CandleResolution, number> = new Map();

    constructor(clientParams: ClientParams) {
        this.symbol = clientParams.symbol;
        this.ccy = clientParams.ccy;
    }

    abstract getPrice(): number;
    abstract getOrderbook(): Orderbook;
    abstract getCandles(resolution: CandleResolution): Candle[];
    abstract getAccountInfo(): AccountInfo;
    async initialize() {
        this.running = true;
    }

    // 订阅
    public subscribe(subTypes: SubTypes, callback: (param?: any) => Promise<void>) {
        switch (subTypes) {
            case SubTypes.Account:
                this.clientCallBackFuncs.accountFunc = callback;
                break;
            case SubTypes.Position:
                this.clientCallBackFuncs.positionFunc = callback;
                break;
            case SubTypes.Order:
                this.clientCallBackFuncs.orderFunc = callback;
                break;
            case SubTypes.Deal:
                this.clientCallBackFuncs.fillFunc = callback;
                break;
            case SubTypes.Tick:
                this.clientCallBackFuncs.tickFunc = callback;
                break;
            case SubTypes.Orderbook:
                this.clientCallBackFuncs.orderBookFunc = callback;
                break;
            case SubTypes.Trades:
                this.clientCallBackFuncs.tradesFunc = callback;
                break;
            default:
                console.error("error subscribing: ", subTypes);
        }
    }
    // 订阅K线
    public subscribeCandle(resolution: any, callback: (candle: Candle, resolution: CandleResolution) => Promise<void>) {
        this.clientCallBackFuncs.candleFunc = callback;
        this.clientCandleMap.set(resolution, 1);
    }

    abstract buy(clientId: number, price: number, size: number): Promise<void>;
    abstract sell(clientId: number, price: number, size: number): Promise<void>;
    abstract close(clientId: number, side: PositionSide, price: number, size: number): Promise<void>;
    abstract buyLimit(clientId: number, price: number, size: number): Promise<void>;
    abstract buyLimit2(clientId: number, price: number, size: number): Promise<void>;
    abstract sellLimit(clientId: number, price: number, size: number): Promise<void>;
    abstract sellLimit2(clientId: number, price: number, size: number): Promise<void>;
    abstract closeLimit(clientId: number, side: PositionSide, price: number, size: number, goodTillTime: number): Promise<void>;
    abstract cancel(order: Order): Promise<void>;
    destroy(): void {
        this.running = false;
    }
}