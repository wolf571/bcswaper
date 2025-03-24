// dydxClient.ts
import WebSocket, { MessageEvent } from "ws";
import {
    IndexerConfig,
    ValidatorConfig,
    Network,
    IndexerClient,
    SocketClient,
    ValidatorClient,
    CompositeClient,
    LocalWallet,
    BECH32_PREFIX,
    SubaccountInfo,
    Order_TimeInForce,
    OrderExecution,
    OrderSide,
    OrderTimeInForce,
    OrderType,
    MAINNET_CHAIN_ID,
    ValidatorApiHost,
    IndexerApiHost,
    IndexerWSHost
} from "@dydxprotocol/v4-client-js";
import { IncomingMessageTypes } from "@dydxprotocol/v4-client-js/build/src/clients/socket-client";
import { conerr, conlog } from "@/utils/bchelper";
import { AbstractClient } from "../clients";
import { AccountInfo, Candle, CandleResolution, ClientSettings, ClientParams, DydxAccount, Order, Orderbook, PositionSide } from "../context";
import { MarketsHandler } from "./marketsHandler";
import { AccountHandler } from "./accountHandler";
import { OrderbookHandler } from "./orderbookHandler";
import { CandlesHandler } from "./candlesHandler";
import { TradesHandler } from "./tradesHandler";
import { convertResolution } from "./dydxContext";

// dydx client
export class DydxClient extends AbstractClient {
    // 账户信息
    private dydxAccInfo!: DydxAccount;

    private indexerClient?: IndexerClient;
    private validatorClient?: ValidatorClient;
    private compositeClient?: CompositeClient;
    private localWallet?: LocalWallet;
    private subaccount!: SubaccountInfo;

    private socketClient?: SocketClient;

    // handler
    private accountHandler!: AccountHandler;
    private candlesHandler!: CandlesHandler;
    private marketsHandler!: MarketsHandler;
    private orderbookHandler!: OrderbookHandler;
    private tradesHandler!: TradesHandler;

    /**
     * Configuration for the dYdX Indexer API. This configuration specifies the endpoints
     * for the Indexer API and WebSocket connections.
     */
    private mainnetIndexerConfig: IndexerConfig = new IndexerConfig(
        IndexerApiHost.MAINNET,
        IndexerWSHost.MAINNET
    )

    /**
     * Configuration for the dYdX Validator API. This configuration includes the endpoint
     * for the Validator API and settings related to the blockchain network, such as
     * denominations and decimals for various tokens.
     */
    private mainnetValidatorConfig: ValidatorConfig = new ValidatorConfig(
        ValidatorApiHost.MAINNET,
        MAINNET_CHAIN_ID,
        {
            USDC_DENOM: "ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5",
            USDC_DECIMALS: 6,
            USDC_GAS_DENOM: "uusdc",
            CHAINTOKEN_DENOM: "adydx",
            CHAINTOKEN_DECIMALS: 18
        }
    )

    private mainnetNetwork: Network = new Network("mainnet", this.mainnetIndexerConfig, this.mainnetValidatorConfig);

    constructor(clientParams: ClientParams) {
        super(clientParams);
        this.dydxAccInfo = clientParams.account as DydxAccount;
    }

    // init
    public async initialize() {
        conlog("initializing ...");

        this.accountHandler = new AccountHandler(this.symbol, this.ccy, this.clientCallBackFuncs);
        this.candlesHandler = new CandlesHandler(this.symbol, this.clientCallBackFuncs);
        this.marketsHandler = new MarketsHandler(this.symbol);
        this.orderbookHandler = new OrderbookHandler(this.symbol);
        this.tradesHandler = new TradesHandler(this.symbol);

        this.indexerClient = new IndexerClient(this.mainnetNetwork.indexerConfig);
        this.validatorClient = await ValidatorClient.connect(this.mainnetNetwork.validatorConfig);
        this.compositeClient = await CompositeClient.connect(this.mainnetNetwork);
        this.localWallet = await LocalWallet.fromMnemonic(this.dydxAccInfo.mnemonic, BECH32_PREFIX);
        // set the subaccount 0 as the default
        this.subaccount = new SubaccountInfo(this.localWallet, this.dydxAccInfo.subaccount);

        this.createSocketClient();

        super.initialize();
        conlog("done.");
    }

    /**
     * Creates a Socket Client for real-time WebSocket communication with the dYdX API.
     *
     * @param onOpen - Callback function invoked when the WebSocket connection is opened.
     * @param onClose - Callback function invoked when the WebSocket connection is closed.
     * @param onMessage - Callback function invoked when a message is received from the WebSocket.
     * @returns The SocketClient instance.
     */
    public createSocketClient(
    ) {
        conlog("clientCallBackFuncs ...", this.clientCallBackFuncs);
        this.socketClient = new SocketClient(
            this.mainnetNetwork.indexerConfig,
            // open
            () => {
                conlog("socket client opened.");
                conlog("subscribe to dydx account ...");
                this.socketClient?.subscribeToSubaccount(this.dydxAccInfo.address, 0);
                if (this.clientCallBackFuncs.orderBookFunc) {
                    conlog("subscribe to dydx orderbook ...");
                    this.socketClient?.subscribeToOrderbook(this.symbol);
                }
                if (this.clientCallBackFuncs.tradesFunc) {
                    conlog("subscribe to trade ... ");
                    this.socketClient?.subscribeToTrades(this.symbol);
                }
                // 订阅K线
                if (this.clientCandleMap?.size === 0) {
                    this.clientCandleMap.set(CandleResolution.DAY1, 1);
                }
                conlog("clientCandleMap ...", this.clientCandleMap);
                this.clientCandleMap?.forEach((_, resolution) => {
                    conlog("subscribed candle: ", resolution);
                    const c = convertResolution(resolution);
                    if (!c) {
                        conerr("error subscribing resolution: ", resolution);
                        return;
                    }
                    this.socketClient?.subscribeToCandles(this.symbol, c);
                });
            },
            () => {
                conlog(`socket ${IndexerWSHost.MAINNET} closed.`);
                if (this.running) {
                    conlog("reconnecting ...");
                    setTimeout(() => {
                        this.socketClient?.connect();
                    }, 1000);
                }
            },
            // message resolver
            async (message: MessageEvent) => {
                if (typeof message.data !== "string") {
                    conerr('error data received ', message);
                    return;
                }
                // conlog("websocket message:\n", message);
                const jsonString = message.data;
                try {
                    const data = JSON.parse(jsonString);
                    const channel = data.channel;
                    // conlog(`========== type : ${data.type}, channel: ${channel}, data: \n ${jsonString}`);
                    switch (data.type) {
                        case IncomingMessageTypes.CONNECTED:
                            conlog("socket client connected.");
                            break;
                        case IncomingMessageTypes.SUBSCRIBED:
                            switch (channel) {
                                case ChannelTypes.Subaccounts:
                                    this.accountHandler.initialize(data);
                                    break;
                                case ChannelTypes.Markets:
                                    this.marketsHandler.initialize(data);
                                    break;
                                case ChannelTypes.Orderbook:
                                    this.orderbookHandler.initialize(data);
                                    break;
                                case ChannelTypes.Candles:
                                    this.candlesHandler.initialize(data);
                                    break;
                                case ChannelTypes.Trades:
                                    this.tradesHandler.initialize(data);
                                    break;
                                default:
                                    conerr("unexpected channel: ", channel);
                                    break;
                            }
                            break;
                        case IncomingMessageTypes.CHANNEL_DATA:
                            switch (channel) {
                                case ChannelTypes.Subaccounts:
                                    this.accountHandler.update(data);
                                    break;
                                default:
                                    conerr("unexpected channel data: ", channel);
                                    break;
                            }
                            break;
                        case IncomingMessageTypes.CHANNEL_BATCH_DATA:
                            switch (channel) {
                                case ChannelTypes.Markets:
                                    this.marketsHandler.update(data);
                                    break;
                                case ChannelTypes.Orderbook:
                                    this.orderbookHandler.update(data);
                                    break;
                                case ChannelTypes.Candles:
                                    await this.candlesHandler.update(data);
                                    break;
                                case ChannelTypes.Trades:
                                    this.tradesHandler.update(data);
                                    break;
                                default:
                                    conerr("unexpected channel batch data: ", channel);
                                    break;
                            }
                            break;
                        // 错误处理，进行重连
                        case IncomingMessageTypes.ERROR:
                            conlog("error message received: ", data);
                            conlog("restart client ...");
                            this.destroy();
                            setTimeout(() => {
                                this.initialize();
                            }, 3000)
                            break;
                        default:
                            conlog("unknown message received: ", data);
                    }
                } catch (error) {
                    conerr("error resolving websocket message:", error);
                }
            },
            // error
            (event: WebSocket.ErrorEvent) => {
                conerr('socket client error:', event);
            }
        );

        this.socketClient.connect();
    }

    // 获取价格
    public getPrice(): number {
        return this.candlesHandler.getPrice() || 0;
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
     * 计算短期单有效期切块数
     * @returns 最大+20
     */
    private async calculateGoodTilBlock(): Promise<number> {
        if (!this.validatorClient) {
            return 0;
        }
        const latestBlockHeight = await this.validatorClient.get.latestBlockHeight();
        return latestBlockHeight + 20;
    }

    /**
     * 下短期单
     * @param side 方向
     * @param price 价格
     * @param size 数量
     */
    public async shortTermOrder(
        clientId: number,
        side: OrderSide,
        price: number,
        size: number,
    ): Promise<void> {
        conlog(`open short term order ****** clientId: ${clientId}, side : ${side}, price: ${price}, size: ${size} `);
        await this.placeShortTermOrder(clientId, side, price, size, Order_TimeInForce.TIME_IN_FORCE_UNSPECIFIED, false);
    }

    /**
     * 下短期单
     * @param side 
     * @param price 
     * @param size 
     * @param timeInForce 
     * @param reduceOnly 
     */
    private async placeShortTermOrder(
        clientId: number,
        side: OrderSide,
        price: number,
        size: number,
        timeInForce: Order_TimeInForce,
        reduceOnly: boolean,
    ) {
        const goodTilBlock = await this.calculateGoodTilBlock();
        await this.compositeClient?.placeShortTermOrder(
            this.subaccount,
            this.symbol,
            side,
            price,
            size,
            clientId,
            goodTilBlock,
            timeInForce,
            reduceOnly
        );
    }

    /**
     * 市价下单
     * @param side 
     * @param price 
     * @param size 
     * @param timeInForce 
     * @param reduceOnly 
     */
    private async placeMarketOrder(
        clientId: number,
        side: OrderSide,
        price: number,
        size: number,
        timeInForce: OrderTimeInForce,
        reduceOnly: boolean,
    ) {
        conlog(`market order ****** clientId: ${clientId}, side: ${side}, price: ${price}, size: ${size} `);
        const type: OrderType = OrderType.MARKET;
        const goodTillTime: number = 600;
        const execution: OrderExecution = OrderExecution.DEFAULT;
        const postOnly: boolean = false;

        await this.compositeClient?.placeOrder(
            this.subaccount,
            this.symbol,
            type,
            side,
            price,
            size,
            clientId,
            timeInForce,
            goodTillTime,
            execution,
            postOnly,
            reduceOnly,
        );
    }

    /**
     * 市价买
     * @param price 
     * @param size 
     */
    public async buy(clientId: number, price: number, size: number) {
        await this.placeMarketOrder(clientId, OrderSide.BUY, price, size, OrderTimeInForce.GTT, false);
    }

    /**
     * 市价卖
     * @param price 
     * @param size 
     * @param clientId 
     */
    public async sell(clientId: number, price: number, size: number) {
        await this.placeMarketOrder(clientId, OrderSide.SELL, price, size, OrderTimeInForce.GTT, false);
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
        await this.placeMarketOrder(clientId, sd, price, size, OrderTimeInForce.GTT, true);
    }
    /**
     * 限价下单
     * @param side 方向
     * @param price 价格
     * @param size 数量
     * @param goodTillTime 
     */
    private async placeLimitOrder(
        clientId: number,
        side: OrderSide,
        price: number,
        size: number,
        goodTillTime: number,
        timeInForce: OrderTimeInForce = OrderTimeInForce.GTT,
        reduceOnly: boolean = false
    ) {
        conlog(`limit order ****** clientId: ${clientId}, side: ${side}, price: ${price}, size: ${size}, goodTillTime: ${goodTillTime} `);
        const type: OrderType = OrderType.LIMIT;
        const execution: OrderExecution = OrderExecution.DEFAULT;
        const postOnly: boolean = false;

        await this.compositeClient?.placeOrder(
            this.subaccount,
            this.symbol,
            type,
            side,
            price,
            size,
            clientId,
            timeInForce,
            goodTillTime,
            execution,
            postOnly,
            reduceOnly,
        );
    }

    /**
     * 限价买
     * @param price 
     * @param size 
     * @param goodTillTime 
     */
    public async buyLimit(clientId: number, price: number, size: number, goodTillTime: number = ClientSettings.GoodTillTime) {
        await this.placeLimitOrder(clientId, OrderSide.BUY, price, size, goodTillTime);
    }

    /**
     * 同buyLimit
     * @param clientId
     * @param price 
     * @param size 
     */
    public async buyLimit2(clientId: number, price: number, size: number) {
        this.buyLimit(clientId, price, size);
    }

    /**
     * 限价卖
     * @param price 
     * @param size 
     * @param clientId 
     * @param goodTillTime 
     */
    public async sellLimit(clientId: number, price: number, size: number, goodTillTime: number = ClientSettings.GoodTillTime) {
        await this.placeLimitOrder(clientId, OrderSide.SELL, price, size, goodTillTime);
    }

    /**
     * 同sellLimit2
     * @param clientId 
     * @param price 
     * @param size 
     */
    public async sellLimit2(clientId: number, price: number, size: number) {
        this.sellLimit(clientId, price, size);
    }

    /**
     * 限价平仓
     * @param side 
     * @param price 
     * @param size 
     */
    public async closeLimit(
        clientId: number,
        side: PositionSide,
        price: number,
        size: number,
        goodTillTime: number = ClientSettings.GoodTillTime
    ): Promise<void> {
        conlog("close order limit ... ");
        const sd = side == PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;
        await this.placeLimitOrder(clientId, sd, price, size, goodTillTime, OrderTimeInForce.GTT, true);
    }

    /**
     * 撤单
     * @param order 原订单
     */
    public async cancel(
        order: Order
    ): Promise<void> {
        conlog(`cancel order ****** id : ${order.id}, clientId: ${order.clientId}, type: ${order.type} `);
        let orderFlags: number = Number(order.orderFlags);
        let goodTilBlock: number = 0;
        let goodTilBlockTime: number = 0;

        switch (order.type) {
            case OrderType.LIMIT:
                switch (order.timeInForce) {
                    case OrderTimeInForce.IOC:
                    case OrderTimeInForce.FOK:
                        goodTilBlock = await this.calculateGoodTilBlock();
                        break;
                    default:
                        goodTilBlockTime = ClientSettings.GoodTillTime;
                        break;
                }
                break;
            case OrderType.MARKET:
                goodTilBlock = await this.calculateGoodTilBlock();
                break;
        }
        conlog(`goodTilBlockTime: ${goodTilBlockTime}, goodTilBlock: ${goodTilBlock} `)
        await this.compositeClient?.cancelOrder(
            this.subaccount,
            order.clientId,
            orderFlags,
            this.symbol,
            goodTilBlock,
            goodTilBlockTime
        );
    }

    // destroy
    public destroy() {
        conlog("dydx client release ...");
        delete this.indexerClient;
        delete this.validatorClient;
        delete this.compositeClient;
        delete this.localWallet;
        // delete this.subaccount;
        this.socketClient?.close();
        // delete this.socketClient;

        super.destroy();
        conlog("dydx client released.");
    }
}

// channels
export enum ChannelTypes {
    Subaccounts = "v4_subaccounts",
    Markets = "v4_markets",
    Orderbook = "v4_orderbook",
    Candles = "v4_candles",
    Trades = "v4_trades",
}
