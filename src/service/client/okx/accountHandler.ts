// accountHandler.ts
import { conerr, conlog } from "@/utils/bchelper";
import { AccountInfo, CallBackFuncs, Fill, Order, OrderStatus, OrderTimeInForce, PositionData, PositionSide } from "../context";
import { convertOrderSide, convertOrderStatus, convertOrderType } from "./okxContext";
import { stringToBoolean, timestampToISOString } from "@/utils/formatter";

export class AccountHandler {
    private readonly symbol: string;

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
        symbol: string = "ETH-USDT",
        clientCallBackFuncs: CallBackFuncs,
    ) {
        this.symbol = symbol;
        this.clientCallBackFuncs = clientCallBackFuncs;
    }

    // 账户数据解析
    public async resolveAccount(uid: string, data: any[]) {
        // conlog(`=== resolving account data: \n `, JSON.stringify(data));
        if (data?.length === 0) {
            return;
        }
        const d = data[0];
        this.accountInfo.account = uid;
        this.accountInfo.equity = d.totalEq;
        this.accountInfo.balance = d.adjEq;
        this.accountInfo.asset = d.isoEq;
        if (this.clientCallBackFuncs.accountFunc) {
            await this.clientCallBackFuncs.accountFunc(this.accountInfo);
        }
    }

    // 持仓数据解析
    public async resolvePostitions(uid: string, data: any[]) {
        if (data?.length === 0) {
            return;
        }
        // conlog(`=== resolving positions data: \n `, JSON.stringify(data));
        const d = data[0];
        if (d.instId !== this.symbol) {
            conerr("some thing wrong with the symbol: ", d.instId);
            return;
        }
        const positions: PositionData[] = [];
        const pd: PositionData = {
            symbol: this.symbol,
            side: this.getPositionSide(d.posSide),
            size: Number(d.pos),
        };
        positions.push(pd);
        this.accountInfo.positions = positions;
        if (this.clientCallBackFuncs.positionFunc) {
            await this.clientCallBackFuncs.positionFunc(positions);
        }
    }

    // 订单数据解析
    public async resolveOrder(uid: string, data: any[]) {
        if (data?.length === 0) {
            return;
        }
        // conlog(`=== resolving order data: \n `, JSON.stringify(data));
        const d = data[0];
        const order: Order = <Order>{
            id: d.ordId,
            account: uid,
            subaccountId: "",
            clientId: Number(d.clOrdId),
            side: convertOrderSide(d.side),
            size: Number(d.sz),
            ticker: d.instId,
            price: Number(d.px),
            type: convertOrderType(d.ordType),
            reduceOnly: stringToBoolean(d.reduceOnly),
            status: convertOrderStatus(d.state),
            orderFlags: d.tag,
            totalFilled: Number(d.accFillSz),
            fee: Number(d.fee),
            filledPrice: Number(d.fillPx),
            // timeInForce: OrderTimeInForce.GTT,
            clientMetadata: d.tag,
            updatedAt: timestampToISOString(d.uTime),
        };
        if (this.clientCallBackFuncs.orderFunc) {
            await this.clientCallBackFuncs.orderFunc(order);
        }
    }

    // 开仓回报
    public async resolveOpOrderOpen(data: any[]) {
        if (data?.length === 0) {
            return;
        }
        // conlog(`=== resolving order data: \n `, JSON.stringify(data));
        const d = data[0];
        const order: Order = <Order>{
            id: d.ordId,
            // account: this.accountInfo.account,
            clientId: Number(d.clOrdId),
            updatedAt: d.uTime,
            status: OrderStatus.BEST_EFFORT_OPENED,
        };
        if (this.clientCallBackFuncs.orderFunc) {
            await this.clientCallBackFuncs.orderFunc(order);
        }
    }

    // 成交数据解析
    public async resolveFill(uid: string, data: any[]) {
        if (data?.length === 0) {
            return;
        }
        // conlog(`=== resolving fill data: \n `, JSON.stringify(data));
        const d = data[0];
        const fill: Fill = <Fill>{
            id: d.tradeId,
            account: uid,
            orderId: d.ordId,
            side: convertOrderSide(d.side),
            size: Number(d.fillSz),
            ticker: d.instId,
            price: Number(d.fillPx),
        };
        if (this.clientCallBackFuncs.fillFunc) {
            await this.clientCallBackFuncs.fillFunc(fill);
        }
    }

    public getAccountInfo(): AccountInfo {
        return this.accountInfo;
    }

    // 获取PositionSide
    private getPositionSide(side: string) {
        if (side === "long") {
            return PositionSide.LONG;
        }
        if (side === "short") {
            return PositionSide.SHORT;
        }
        return null;
    }
}