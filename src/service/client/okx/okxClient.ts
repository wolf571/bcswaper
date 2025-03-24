// okxClient.ts
import { ErrorEvent, MessageEvent } from "ws";
import hmacSHA256 from "crypto-js/hmac-sha256"
import Base64 from "crypto-js/enc-base64"
import { conerr, conlog } from "@/utils/bchelper";
import { AccountInfo, Candle, CandleResolution, ClientParams, OkxAccount, Order, Orderbook, OrderSide, OrderType, PositionSide } from "../context";
import { convertResolution, OkxConstants, AccountChannel, CandlesticksChannel, ChannelType, EventType, PositionsChannel, TickersChannel, InstType, InstInfo, OpType, OrdersChannel, FillsChannel } from "./okxContext";
import { AccountHandler } from "./accountHandler";
import { OrderbookHandler } from "./orderbookHandler";
import { CandlesHandler } from "./candlesHandler";
import { OkxSocketClient } from "./okxWebSocket";
import { TickerHandler } from "./tickerHandler";
import { OkxHttpClient } from "./okHttpClient";
import { AbstractClient } from "../clients";
import { fixedNumber } from "@/utils/formatter";

// okx client
export class OkxClient extends AbstractClient {
    // 账户信息
    private okxAccInfo!: OkxAccount;

    private publicEndpoint: string = OkxConstants.DEMO_PUBLIC_ENDPOINT;
    private privateEndpoint: string = OkxConstants.DEMO_PRIVATE_ENDPOINT;
    private businessEndpoint: string = OkxConstants.DEMO_BUSINESS_ENDPOINT;

    // handler
    private accountHandler!: AccountHandler;
    private candlesHandler!: CandlesHandler;
    private tickerHandler!: TickerHandler;
    private orderbookHandler!: OrderbookHandler;

    private okxHttpClient!: OkxHttpClient;

    private publicWss!: OkxSocketClient;
    private privateWss!: OkxSocketClient;
    private businessWss!: OkxSocketClient;

    // 产品信息
    private instInfo!: InstInfo;

    constructor(clientParams: ClientParams) {
        super(clientParams);
        this.okxAccInfo = clientParams.account as OkxAccount;
        if (this.okxAccInfo.formally) {
            this.publicEndpoint = OkxConstants.PUBLIC_ENDPOINT;
            this.privateEndpoint = OkxConstants.PRIVATE_ENDPOINT;
            this.businessEndpoint = OkxConstants.BUSINESS_ENDPOINT;
        }
    }

    // init
    public async initialize() {
        conlog("initializing ...");

        this.accountHandler = new AccountHandler(this.symbol, this.clientCallBackFuncs);
        this.tickerHandler = new TickerHandler(this.symbol, this.clientCallBackFuncs);
        this.candlesHandler = new CandlesHandler(this.symbol, this.clientCallBackFuncs);
        this.orderbookHandler = new OrderbookHandler(this.symbol);

        // K线初始化
        this.okxHttpClient = new OkxHttpClient(this.okxAccInfo);

        this.initialCandle();
        this.initialInstInfo();

        this.createSocketClient();

        super.initialize();
        conlog("done.");
    }

    // 初始化K线数据
    private async initialCandle() {
        this.clientCandleMap?.forEach(async (_, resolution) => {
            conlog("initial candle: ", resolution);
            const cc = convertResolution(resolution);
            if (!cc) {
                conerr("error initial resolution: ", resolution);
                return;
            }
            const bar = cc.replace("candle", "");
            const kds = await this.okxHttpClient.getCandles(this.symbol, bar);
            this.candlesHandler.initialize(cc, kds);
        });
    }

    // 获取产品基础信息
    private async initialInstInfo() {
        conlog("initial instrument info: ", this.symbol);
        const result: InstInfo[] = await this.okxHttpClient.getInstInfo(InstType.SWAP, this.symbol);
        if (result?.length === 0) {
            return;
        }
        this.instInfo = result[0];
        conlog("this.instInfo = ", this.instInfo);
    }

    /**
     * 创建websocket连接
     *
     * @param onOpen - Callback function invoked when the WebSocket connection is opened.
     * @param onClose - Callback function invoked when the WebSocket connection is closed.
     * @param onMessage - Callback function invoked when a message is received from the WebSocket.
     * @returns The SocketClient instance.
     */
    public createSocketClient(
    ) {
        conlog("clientCallBackFuncs ...", this.clientCallBackFuncs);
        // private wss
        this.privateWss = new OkxSocketClient(this.privateEndpoint,
            () => {
                conlog(`socket ${this.privateEndpoint} opened.`);
                conlog("login ...");
                this.login();
            },
            async (message: MessageEvent) => {
                // conlog("message received ...", message);
                await this.handleMessage(message);
            },
            () => {
                conlog(`socket ${this.privateEndpoint} closed.`);
                if (this.running) {
                    conlog(`reconnecting ${this.privateEndpoint} ...`);
                    setTimeout(() => {
                        this.privateWss?.connect();
                    }, 1000);
                }
            },
            (event: ErrorEvent) => {
                conerr(`socket ${this.privateEndpoint} error:`, event);
                if (this.running) {
                    conlog(`reconnecting ${this.privateEndpoint} ...`);
                    setTimeout(() => {
                        this.privateWss?.connect();
                    }, 1000);
                }
            });
        this.privateWss.connect();

        // public wss
        this.publicWss = new OkxSocketClient(this.publicEndpoint,
            () => {
                conlog(`socket ${this.publicEndpoint} opened.`);
                // 订阅ticker
                if (this.clientCallBackFuncs.tickFunc) {
                    conlog("subscribed ticker ...");
                    const tickerChannel: TickersChannel = {
                        channel: 'tickers',
                        instId: this.symbol,
                    }
                    this.publicWss?.send({
                        op: 'subscribe',
                        args: [tickerChannel],
                    });
                }
            },
            async (message: MessageEvent) => {
                // conlog("message received ...", message);
                await this.handleMessage(message);
            },
            () => {
                conlog(`socket ${this.publicEndpoint} closed.`);
                if (this.running) {
                    conlog(`reconnecting ${this.publicEndpoint} ...`);
                    setTimeout(() => {
                        this.publicWss?.connect();
                    }, 1000);
                }
            },
            (event: ErrorEvent) => {
                conerr(`socket ${this.publicEndpoint} error:`, event);
                if (this.running) {
                    conlog(`reconnecting ${this.publicEndpoint} ...`);
                    setTimeout(() => {
                        this.publicWss?.connect();
                    }, 1000);
                }
            });
        this.publicWss.connect();

        // business
        this.businessWss = new OkxSocketClient(this.businessEndpoint,
            () => {
                conlog(`socket ${this.businessEndpoint} opened.`);
                // 订阅K线
                if (this.clientCallBackFuncs.candleFunc) {
                    conlog("clientCandleMap ...", this.clientCandleMap);
                    this.clientCandleMap?.forEach((_, resolution) => {
                        conlog("subscribed candle: ", resolution);
                        const c = convertResolution(resolution);
                        if (!c) {
                            conlog("error subscribing resolution: ", resolution);
                            return;
                        }
                        const candleChannel: CandlesticksChannel = {
                            channel: c,
                            instId: this.symbol,
                        }
                        this.businessWss?.send({
                            op: 'subscribe',
                            args: [candleChannel],
                        });
                    });
                }
            },
            async (message: MessageEvent) => {
                // conlog("message received ...", message);
                await this.handleMessage(message);
            },
            () => {
                conlog(`socket ${this.businessEndpoint} closed.`);
                if (this.running) {
                    conlog(`reconnecting ${this.businessEndpoint} ...`);
                    setTimeout(() => {
                        this.businessWss?.connect();
                    }, 1000);
                }
            },
            (event: ErrorEvent) => {
                conerr(`socket ${this.businessEndpoint} error:`, event);
                if (this.running) {
                    conlog(`reconnecting ${this.businessEndpoint} ...`);
                    setTimeout(() => {
                        this.businessWss?.connect();
                    }, 1000);
                }
            });
        this.businessWss.connect();
    }

    /**
     * 登录
     */
    public async login() {
        const timestamp = ('' + Date.now()).slice(0, -3);
        const payload = `${timestamp}GET/users/self/verify`;
        const sign = Base64.stringify(hmacSHA256(payload, this.okxAccInfo.secretKey ?? ''));
        const loginRequest = {
            op: 'login',
            args: [
                {
                    apiKey: this.okxAccInfo.apiKey ?? '',
                    passphrase: this.okxAccInfo.passphrase ?? '',
                    timestamp: timestamp,
                    sign: sign,
                },
            ],
        }
        // conlog(`loginRequest: `, loginRequest);
        this.privateWss.send(loginRequest);
    }

    // wss数据处理
    public async handleMessage(message: MessageEvent) {
        if (typeof message.data !== "string") {
            conerr('error message received: ', message);
            return;
        }
        const jsonString = message.data;
        try {
            const response = JSON.parse(jsonString);
            const event = response?.event;
            const code = response?.code;
            let error = false;
            if (typeof code === 'string') {
                error = code !== '0';
            } else if (event === EventType.Error) {
                error = true;
            }
            // 有错误
            if (error) {
                conerr(`error message received: `, jsonString);
                return;
            }
            // 有事件
            if (event) {
                conlog(`event message received: `, jsonString);
                switch (event) {
                    // 登录成功
                    case EventType.Login:
                        // 订阅
                        conlog("subscribe to okx account/positions ...");
                        const accountChannel: AccountChannel = {
                            channel: 'account',
                            ccy: this.ccy,
                            extraParams: `{
                                "updateInterval": "0"
                            }`
                        };
                        const positionsChannel: PositionsChannel = {
                            channel: "positions",
                            instType: "ANY",
                            // instFamily: this.symbol,
                            instId: this.symbol,
                            extraParams: `{
                                "updateInterval": "0"
                            }`
                        }
                        const ordersChannel: OrdersChannel = {
                            channel: 'orders',
                            instType: "ANY",
                            instId: this.symbol,
                        }
                        // const fillssChannel: FillsChannel = {
                        //     channel: 'fills',
                        //     instId: this.symbol,
                        // }
                        this.privateWss.send({
                            op: 'subscribe',
                            // args: [accountChannel, positionsChannel, ordersChannel, fillssChannel],
                            args: [accountChannel, positionsChannel, ordersChannel],
                        });
                        if (this.clientCallBackFuncs.orderBookFunc) {
                            conlog("orderbook not supported yet ...");
                        }
                        if (this.clientCallBackFuncs.tradesFunc) {
                            conlog("trade not supported yet ... ");
                        }
                        break;
                    default:
                        break;
                }
                return;
            }
            // 有数据
            const data = response.data;
            // opration
            const op = response.op;
            if (op) {
                conlog("op message received: ", data);
                switch (op) {
                    case OpType.Order:
                        this.accountHandler.resolveOpOrderOpen(data);
                        break;
                    case OpType.Cancel:
                        break;
                    default:
                        break;
                }
                return;
            }
            // conlog("response data: ", data);
            // channel
            const channel: string = response.arg.channel;
            const uid: string = response.arg.uid;
            // K线频道
            if (channel.startsWith(ChannelType.Candle)) {
                await this.candlesHandler.resolve(channel, data);
                return;
            }
            // conlog("channel: ", channel);
            switch (channel) {
                case ChannelType.Account:
                    this.accountHandler.resolveAccount(uid, data);
                    break;
                case ChannelType.Fills:
                    this.accountHandler.resolveFill(uid, data);
                    break;
                case ChannelType.Orders:
                    this.accountHandler.resolveOrder(uid, data);
                    break;
                case ChannelType.Positions:
                    this.accountHandler.resolvePostitions(uid, data);
                    break;
                case ChannelType.Tickers:
                    await this.tickerHandler.resolve(data)
                    break;
                default:
                    conerr("unexpected message received: ", data);
            }
        } catch (error) {
            conerr("error resolving websocket message:", error);
        }
    }

    // 获取价格
    public getPrice(): number {
        return this.tickerHandler.getPrice() || 0;
    }
    // 获取订单簿
    public getOrderbook(): Orderbook {
        return this.orderbookHandler.getOrderbook();
    }
    // 获取账户信息
    public getAccountInfo(): AccountInfo {
        return this.accountHandler.getAccountInfo();
    }
    // 获取K线列表
    public getCandles(resolution: CandleResolution): Candle[] {
        const c = convertResolution(resolution);
        return this.candlesHandler.getCandles(c);
    }

    /**
     * 下单
     * @param clientId 客户端id，clOrdId
     * @param side 买卖方向
     * @param ordType 订单类型market/limit
     * @param size 
     * @param px 
     * @param reduceOnly 
     * @param tdMode 交易模式，保证金模式 isolated
     */
    private async placeOrder(
        clientId: number,
        side: OrderSide,
        posSide: PositionSide,
        orderType: OrderType,
        price: number,
        size: string,
        reduceOnly: boolean,
        // 保证金模式：全仓
        tdMode: string = "cross",
    ) {
        conlog(`place order ****** clientId: ${clientId}, side : ${side}, posSide:${posSide}, orderType:${orderType}, price: ${price}, size: ${size}`);
        const payload = {
            "clOrdId": clientId.toString(),
            "side": side.toLowerCase(),
            "posSide": posSide.toLowerCase(),
            "instId": this.symbol,
            "tdMode": tdMode,
            "ordType": orderType.toLowerCase(),
            "px": price,
            "sz": size,
            "reduceOnly": reduceOnly,
        };
        const tradeRequest = {
            id: clientId,
            op: OpType.Order,
            args: [payload],
        };
        await this.privateWss.send(tradeRequest);
    }

    /**
     * 市价下单
     * @param clientId 
     * @param side 
     * @param size 
     * @param reduceOnly 
     */
    private async placeMarketOrder(
        clientId: number,
        side: OrderSide,
        posSide: PositionSide,
        size: number,
        reduceOnly: boolean,
    ) {
        const sz = this.calculateSize(size);
        if (sz === "0") {
            conerr(`calculated sz = ${sz}, ctVal=${this.instInfo.ctVal}/${this.instInfo.ctValCcy}, reject this order request.`)
            return;
        }
        await this.placeOrder(clientId, side, posSide, OrderType.MARKET, 0, sz, reduceOnly);
    }

    /**
     * 市价买
     * @param clientId 
     * @param size 
     */
    public async buy(clientId: number, price: number, size: number) {
        await this.placeMarketOrder(clientId, OrderSide.BUY, PositionSide.LONG, size, false);
    }

    /**
     * 市价卖
     * @param clientId 
     * @param size 
     */
    public async sell(clientId: number, price: number, size: number) {
        await this.placeMarketOrder(clientId, OrderSide.SELL, PositionSide.SHORT, size, false);
    }

    /**
     * 市价平仓
     * @param side 
     * @param price 
     * @param size 
     */
    public async close(
        clientId: number,
        side: PositionSide,
        price: number,
        size: number,
    ): Promise<void> {
        conlog("close order ... ");
        const sd = side == PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;
        const sz = fixedNumber(size, this.instInfo?.lotSz);
        await this.placeOrder(clientId, sd, side, OrderType.MARKET, price, sz, true);
    }

    /**
     * 限价下单
     * @param clientId 
     * @param side 
     * @param size 
     * @param reduceOnly 
     */
    private async placeLimitOrder(
        clientId: number,
        side: OrderSide,
        posSide: PositionSide,
        price: number,
        size: number,
        reduceOnly: boolean,
    ) {
        const sz = this.calculateSize(size);
        if (sz === "0") {
            conerr(`calculated sz = ${sz}, ctVal=${this.instInfo.ctVal}/${this.instInfo.ctValCcy}, reject this order request.`)
            return;
        }
        await this.placeOrder(clientId, side, posSide, OrderType.LIMIT, price, sz, reduceOnly);
    }

    /**
     * 限价买
     * @param price 
     * @param size 
     * @param goodTillTime 
     */
    public async buyLimit(clientId: number, price: number, size: number) {
        await this.placeLimitOrder(clientId, OrderSide.BUY, PositionSide.LONG, price, size, false);
    }
    /**
     * 限价买，不转换size
     * @param clientId
     * @param price 
     * @param size 
     */
    public async buyLimit2(clientId: number, price: number, size: number) {
        const sz = fixedNumber(size, this.instInfo?.lotSz);
        await this.placeOrder(clientId, OrderSide.BUY, PositionSide.LONG, OrderType.LIMIT, price, sz, false);
    }

    /**
     * 限价卖
     * @param price 
     * @param size 
     * @param clientId 
     * @param goodTillTime 
     */
    public async sellLimit(clientId: number, price: number, size: number) {
        await this.placeLimitOrder(clientId, OrderSide.SELL, PositionSide.SHORT, price, size, false);
    }

    /**
     * 限价卖，不转换size
     * @param clientId 
     * @param price 
     * @param size 
     */
    public async sellLimit2(clientId: number, price: number, size: number) {
        const sz = fixedNumber(size, this.instInfo?.lotSz);
        await this.placeOrder(clientId, OrderSide.SELL, PositionSide.SHORT, OrderType.LIMIT, price, sz, false);
    }

    /**
     * 限价平仓
     * 暂不支持
     * @param side 
     * @param price 
     * @param size 
     */
    public async closeLimit(
        clientId: number,
        side: PositionSide,
        price: number,
        size: number,
    ): Promise<void> {
        conlog("close order limit ... ");
        const sd = side == PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;
        const sz = fixedNumber(size, this.instInfo?.lotSz);
        await this.placeOrder(clientId, sd, side, OrderType.LIMIT, 0, sz, true);
    }

    /**
     * 撤单
     * @param order 原订单
     */
    public async cancel(
        order: Order
    ): Promise<void> {
        conlog(`cancel order ****** id : ${order.id}, clientId: ${order.clientId}, type: ${order.type} `);
        const payload = {
            "instId": order.ticker,
            "ordId": order.id,
        };
        const tradeRequest = {
            id: Date.now().toString(),
            op: OpType.Cancel,
            args: [payload],
        };
        await this.privateWss.send(tradeRequest);
    }

    // 获取下单size
    // 对于合约等品种，需通过lotSize换算
    // 此处，入参size表示面额
    private calculateSize(size: number): string {
        const type = this.instInfo?.instType;
        if ([InstType.SPOT, InstType.MARGIN].includes(type)) {
            return size.toString();
        }
        const ctVal = this.instInfo?.ctVal || 0;
        const lot = this.instInfo?.lotSz || 0;
        if (ctVal === 0 || lot === 0) {
            return "0";
        }
        const num1 = size / ctVal;
        // if (num1 < Number(lot)) {
        //     return lot;
        // }
        return fixedNumber(num1, lot);
    }

    // destroy
    public destroy() {
        conlog("okx client release ...");
        this.publicWss?.close();
        this.privateWss?.close();
        this.businessWss?.close();

        super.destroy();
        conlog("okx client released.");
    }
}
