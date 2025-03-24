// accountHandler.ts
import { AccountInfo, CallBackFuncs, Fill, IsoString, Order, OrderStatus, PositionData, PositionSide } from "../context";
import { OrderFlags, OrderSide, OrderTimeInForce, OrderType } from "@dydxprotocol/v4-client-js";

/**
 * Handles and processes account-related data and updates, including orders,
 * positions, and collateral for a given symbol and asset.
 */
export class AccountHandler {
    private readonly symbol: string;
    private readonly asset: string;
    private perpetualPositions!: PerpetualPositionSubaccountMessageContents[];
    private assetPosition!: AssetPositionSubaccountMessageContents;
    private orders!: OrderSubaccountMessageContents[];
    private fills!: FillSubaccountMessageContents[];
    private transfers!: TransferSubaccountMessageContents[];

    private clientCallBackFuncs: CallBackFuncs;
    // 账户信息
    private accountInfo: AccountInfo = {
        account: "",
        subaccount: 0,
        equity: 0,
        balance: 0,
        positions: [],
        asset: 0
    };

    constructor(
        symbol: string = "ETH-USD",
        asset: string = "USDC",
        clientCallBackFuncs: CallBackFuncs,
    ) {
        this.symbol = symbol;
        this.asset = asset;
        this.clientCallBackFuncs = clientCallBackFuncs;
        this.postConstruct();
    }

    /**
     * Initializes indexer client for fetching account data.
    */
    private postConstruct(): void {
        this.perpetualPositions = this.defaultPerpetualPositionsProperties();
        this.assetPosition = this.defaultAssetPositionProperties();
        this.orders = this.defaultOrderProperties();
        this.fills = this.defaultFillProperties();
        this.transfers = this.defaultTransferProperties();
    }

    // 账户数据初始化
    public async initialize(obj: any) {
        console.log(`=== initializing account data: \n `, JSON.stringify(obj));

        const subaccount = obj.contents.subaccount;
        this.accountInfo.account = subaccount?.address;
        this.accountInfo.subaccount = subaccount?.subaccountNumber;
        this.accountInfo.equity = subaccount?.equity;
        this.accountInfo.balance = subaccount?.freeCollateral;

        // Initialize perpetualPositions
        this.perpetualPositions = [];
        const perpetualPositions = subaccount?.openPerpetualPositions
        if (perpetualPositions) {
            const p = perpetualPositions[this.symbol];
            if (p) {
                this.perpetualPositions.push(p);
                this.calculatePositions();
            }
        }
        // Initialize assetPositions
        const assetPositions = obj.contents.subaccount?.assetPositions
        if (assetPositions) {
            this.assetPosition = assetPositions[this.asset];
            this.calculateAsset();
        }

        // Initialize open orders
        const orders = obj.contents.orders
        this.calculateOrders(orders);
    }

    // 账户数据变动
    public async update(obj: any) {
        console.log(`=== updating account data: \n `, JSON.stringify(obj));
        // Update position
        const perpetualPositions = obj.contents.perpetualPositions
        const pp = perpetualPositions?.filter(
            (p: PerpetualPositionSubaccountMessageContents) => p.market === this.symbol
        );
        if (pp?.length > 0) {
            // console.log(`=== update position:`, pp);
            this.perpetualPositions = pp;
            this.calculatePositions();
        }
        // Update collateral
        const assetPositions = obj.contents.assetPositions
        const ap = assetPositions?.filter(
            (a: AssetPositionSubaccountMessageContents) => a.symbol === this.asset);
        if (ap?.length > 0) {
            // console.log(`=== update asset:`, ap);
            this.assetPosition = ap.at(0);
            this.calculateAsset();
        }

        // Update orders
        const orders = obj.contents.orders
        this.calculateOrders(orders);

        // Update fills
        const fills = obj.contents.fills
        this.calculateFills(fills);
    }

    // 计算持仓
    private async calculatePositions() {
        // console.log(`=== calculate position ...`);
        const positions: PositionData[] = [];
        this.perpetualPositions.forEach(p => {
            const pd: PositionData = {
                symbol: this.symbol,
                side: p.side,
                size: Number(p.size),
            };
            positions.push(pd);
        });
        this.accountInfo.positions = positions;
        if (this.clientCallBackFuncs.positionFunc) {
            await this.clientCallBackFuncs.positionFunc(positions);
        }
    }

    // 计算可用资金
    private async calculateAsset() {
        // console.log(`=== calculate asset ...`);
        this.accountInfo.asset = parseFloat(this.assetPosition?.size || "0");
        if (this.clientCallBackFuncs.accountFunc) {
            await this.clientCallBackFuncs.accountFunc(this.accountInfo);
        }
    }

    // 计算订单
    private calculateOrders(orders: any) {
        this.orders = orders;
        this.orders?.forEach(async o => {
            const order: Order = <Order>{};
            Object.assign(order, o);
            order.account = this.accountInfo.account;
            if (this.clientCallBackFuncs.orderFunc) {
                await this.clientCallBackFuncs.orderFunc(order);
            }
        });
    }

    // 计算成交
    private calculateFills(fills: any) {
        this.fills = fills;
        this.fills?.forEach(async f => {
            const fill: Fill = <Fill>{};
            Object.assign(fill, f);
            fill.account = this.accountInfo.account;
            if (this.clientCallBackFuncs.fillFunc) {
                await this.clientCallBackFuncs.fillFunc(fill);
            }
        });
    }

    public getAccountInfo(): AccountInfo {
        return this.accountInfo;
    }

    private defaultPerpetualPositionsProperties() {
        return [];
    }
    private defaultAssetPositionProperties() {
        return <AssetPositionSubaccountMessageContents>{};
    }

    private defaultOrderProperties() {
        return [];
    }
    private defaultFillProperties() {
        return [];
    }
    private defaultTransferProperties() {
        return [];
    }
}

// 
export interface PerpetualPositionSubaccountMessageContents {
    address: string,
    subaccountNumber: number,
    positionId: string,
    market: string,
    side: PositionSide,
    status: PerpetualPositionStatus,
    size: string,
    maxSize: string,
    netFunding: string,
    entryPrice: string,
    exitPrice?: string,
    sumOpen: string,
    sumClose: string,
    realizedPnl?: string,
    unrealizedPnl?: string,
}

export enum PerpetualPositionStatus {
    OPEN = 'OPEN',
    CLOSED = 'CLOSED',
    LIQUIDATED = 'LIQUIDATED',
}

export interface AssetPositionSubaccountMessageContents {
    address: string,
    subaccountNumber: number,
    positionId: string,
    assetId: string,
    symbol: string,
    side: PositionSide,
    size: string,
}

export interface OrderSubaccountMessageContents {
    id: string;
    subaccountId: string;
    clientId: string;
    clobPairId: string;
    side: OrderSide;
    size: string;
    ticker: string,
    price: string;
    type: OrderType;
    timeInForce: APITimeInForce;
    postOnly: boolean;
    reduceOnly: boolean;
    status: APIOrderStatus;
    orderFlags: string;
    totalFilled?: string;
    totalOptimisticFilled?: string;
    goodTilBlock?: string;
    goodTilBlockTime?: string;
    removalReason?: string;
    createdAtHeight?: string;
    clientMetadata: string;
    triggerPrice?: string;
    updatedAt?: IsoString;
    updatedAtHeight?: string;
}

export enum APITimeInForce {
    // GTT represents Good-Til-Time, where an order will first match with existing orders on the book
    // and any remaining size will be added to the book as a maker order, which will expire at a
    // given expiry time.
    GTT = 'GTT',
    // FOK represents Fill-Or-KILl where it's enforced that an order will either be filled
    // completely and immediately by maker orders on the book or canceled if the entire amount can't
    // be filled.
    FOK = 'FOK',
    // IOC represents Immediate-Or-Cancel, where it's enforced that an order only be matched with
    // maker orders on the book. If the order has remaining size after matching with existing orders
    // on the book, the remaining size is not placed on the book.
    IOC = 'IOC',
}

export enum APIOrderStatus {
    OPEN = 'OPEN',
    FILLED = 'FILLED',
    CANCELED = 'CANCELED',
    BEST_EFFORT_CANCELED = 'BEST_EFFORT_CANCELED',
    BEST_EFFORT_OPENED = 'BEST_EFFORT_OPENED',
    UNTRIGGERED = "UNTRIGGERED"
}

export interface FillSubaccountMessageContents {
    id: string;
    subaccountId: string;
    side: OrderSide;
    liquidity: Liquidity;
    type: FillType;
    clobPairId: string;
    size: string;
    price: string;
    quoteAmount: string;
    eventId: string,
    transactionHash: string;
    createdAt: IsoString;
    createdAtHeight: string;
    orderId?: string;
    ticker: string;
}

export enum Liquidity {
    TAKER = 'TAKER',
    MAKER = 'MAKER',
}

export enum FillType {
    // LIMIT is the fill type for a fill with a limit taker order.
    LIMIT = 'LIMIT',
    // LIQUIDATED is for the taker side of the fill where the subaccount was liquidated.
    // The subaccountId associated with this fill is the liquidated subaccount.
    LIQUIDATED = 'LIQUIDATED',
    // LIQUIDATION is for the maker side of the fill, never used for orders
    LIQUIDATION = 'LIQUIDATION',
    // DELEVERAGED is for the subaccount that was deleveraged in a deleveraging event.
    // The fill type will be set to taker.
    DELEVERAGED = 'DELEVERAGED',
    // OFFSETTING is for the offsetting subaccount in a deleveraging event.
    // The fill type will be set to maker.
    OFFSETTING = 'OFFSETTING',
}

export interface TransferSubaccountMessageContents {
    sender: {
        address: string,
        subaccountNumber?: number,
    },
    recipient: {
        address: string,
        subaccountNumber?: number,
    },
    symbol: string,
    size: string,
    type: TransferType,
    createdAt: IsoString,
    createdAtHeight: string,
    transactionHash: string,
}

export enum TransferType {
    TRANSFER_IN = 'TRANSFER_IN',
    TRANSFER_OUT = 'TRANSFER_OUT',
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
}