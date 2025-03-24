
// 仅适配dydx，若想适配其他交易所，需在平仓操作上做些调整
import { AccountInfo, Candle, CandleResolution, Order, OrderSide, OrderStatus, OrderType, PositionData, PositionSide } from "@/service/client";
import { SwapUser } from "@/service/swapUser";
// 增强型网格，做多策略
// 以5min的方向为准绳
class Fucks extends SwapUser {
    // 交易参数
    params!: Params;
    // x周期
    kx!: Candle;
    // 当前仓位
    pos: number = 0;
    // 最近下单时间
    lastOrderTime: number = 0;

    init = (): void => {
        this.log("init params: ", this.params);
        this.kx = <Candle>{ high: 10000000, startedAt: "0" };
        this.subscribeTick();
        this.subscribeCandle(CandleResolution.MIN5);
    };

    // 账号状态变化
    accountCallback = async (accountInfo: AccountInfo) => {
        this.conlog2("account: ", accountInfo);
        const positions = accountInfo?.positions || [];
        this.pos = positions?.find(p => p.symbol === this.symbol && p.side === PositionSide.LONG)?.size ?? 0;
    };

    // 价格变化
    handleTick = async (price: number) => {
        if (this.params.current === 0) {
            this.params.current = price;
            this.conlog2("init current: ", this.params.current);
        }
        // 方向判断
        if (price > this.kx.high) {
            if (!this.params.direction) {
                this.params.direction = true;
                this.log(`direction changed to LONG, price: ${price}, params: `, this.params);
            }
        } else if (price < this.kx.low) {
            if (this.params.direction) {
                this.params.direction = false;
                this.log(`direction changed to SHORT, price: ${price}, params: `, this.params);
            }
        }
        if (Date.now() - this.lastOrderTime < 3000) {
            return;
        }
        switch (this.params.direction) {
            //涨
            case true:
                // 撤单卖单
                this.clearLapseOrders(OrderSide.SELL);

                const tb = this.subNumber(this.params.current, this.params.DIFF);
                if (price > tb) {
                    break;
                }

                this.params.current = tb;
                this.bcswap.buyLimit2(price, this.params.size);
                this.lastOrderTime = Date.now();
                return;
            //跌
            case false:
                // 撤单买单
                this.clearLapseOrders(OrderSide.BUY);

                const ts = this.addNumber(this.params.current, this.params.DIFF);
                if (price < ts) {
                    break;
                }
                if (this.bcswap.existCanceling()) {
                    this.conlog2(`canceling order exist in queue`);
                    return;
                }
                this.params.current = ts;
                if (this.pos < this.params.size) {
                    this.log(`there is no enough position for this sell order, size: ${this.params.size}`);
                    break;
                }
                this.lastOrderTime = Date.now();
                this.bcswap.sellLimit2(price, this.params.size);
                return;
        }
    };

    // K变化
    handleCandle = async (candle: Candle, resolution: CandleResolution) => {
        // console.log("resolution: ", resolution);
        // console.log("candle: ", candle);
        // 新的K线，进行一些计算
        if (candle.startedAt.localeCompare(this.kx.startedAt) > 0) {
            this.kx.startedAt = candle.startedAt;
            const candles = this.bcswap.getCandles(resolution);
            if (candles?.length < 2) {
                return;
            }
            this.kx = candles[1];
            this.conlog2(`candle ${resolution}: kx.high=${this.kx.high}, kx.low=${this.kx.low}`);
        }
    };

    // 订单状态变化
    orderCallback = async (order: Order) => {
        this.conlog2("order callback: ", order);
        if (order.status === OrderStatus.CANCELED) {
            this.removeOrder(order.id);
            return;
        }
        if (order.status !== OrderStatus.FILLED) {
            return;
        }
        // 未完全成交
        const filled = order.totalFilled || 0;
        if (filled < order.size) {
            this.conlog2(`order ${order.id} not full filled.`);
            return;
        }
        this.removeOrder(order.id);
    }
}
class Params {
    direction!: boolean;
    current!: number;
    size!: number;
    DIFF!: number;
}