
// 
import { Candle, CandleResolution, Order, OrderSide, OrderStatus, OrderType, PositionSide } from "@/service/client";
import { SwapUser } from "@/service/swapUser";
// start to edit typescript code for the strategy.
class KopGrid extends SwapUser {
    // 交易参数
    params!: Params;

    init = (): void => {
        this.subscribeTick();
        this.timer('*/5 * * * * *', () => {
            this.executeTimer();
        });
    };
    // 交易状态
    chasing = false;
    lastFillTime: number = 0;
    // 下单队列
    queue: Order[] = [];

    // 价格变化事件处理
    handleTick = async (price: number) => {
        if (this.params.current === 0) {
            this.params.current = price;
            this.log("init params: ", this.params);
        }
        //初始下单
        if (!this.chasing) {
            const accinfo = this.bcswap.getAccountInfo();
            if (accinfo?.equity == 0) {
                this.conlog2("waiting for account initializing ... ");
                return;
            }
            this.conlog2("init order... ");
            this.placeOrder(OrderSide.BUY);
            this.placeOrder(OrderSide.SELL);
            this.lastFillTime = Date.now();
            this.chasing = true;
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
        // 置空队列
        this.queue = [];
        this.lastFillTime = Date.now();
        this.params.current = Number(order.price);
        // 订单成交
        switch (order.side) {
            // 买单成交，撤卖单
            case OrderSide.BUY:
                this.clearLapseOrders(OrderSide.SELL);
                // 先挂买单，再挂卖单
                this.placeOrder(OrderSide.BUY);
                this.placeOrder(OrderSide.SELL);
                break;
            // 卖单成交，撤单买单
            case OrderSide.SELL:
                this.clearLapseOrders(OrderSide.BUY);
                // 先挂卖单，再挂买单
                this.placeOrder(OrderSide.SELL);
                this.placeOrder(OrderSide.BUY);
                break;
        }
        this.removeOrder(order.id);
    }

    // 下单
    placeOrder = async (side: OrderSide): Promise<void> => {
        switch (side) {
            //买单
            case OrderSide.BUY:
                const sb = this.params.current - this.params.DIFF;
                if (sb < this.params.bottom) {
                    this.conlog2(`price is smaller then bottom price ${this.params.bottom}`);
                    break;
                }
                const buyOrder: Order = <Order>{
                    side: OrderSide.BUY,
                    type: OrderType.LIMIT,
                    price: sb,
                    size: this.params.size,
                };
                this.queue.push(buyOrder);
                break;
            //卖单
            case OrderSide.SELL:
                if (!this.validPosition(PositionSide.LONG, this.params.size)) {
                    this.log(`there is no enough position for this sell order, size: ${this.params.size}`);
                    break;
                }
                const sp = Number(this.params.current) + Number(this.params.DIFF);
                if (sp > this.params.top) {
                    this.conlog2(`price is bigger then top price ${this.params.top}`);
                    break;
                }
                const sellOrder: Order = <Order>{
                    type: OrderType.LIMIT,
                    side: OrderSide.SELL,
                    price: sp,
                    size: this.params.size,
                }
                this.queue.push(sellOrder);
                break;
        }
    }

    // 执行序列
    executeTimer = () => {
        if (this.bcswap.existCanceling()) {
            this.conlog2(`canceling order exist in queue`);
            return;
        }
        // 下单
        if (this.queue?.length > 0) {
            const order = this.queue.shift();
            switch (order?.side) {
                case OrderSide.SELL:
                    this.bcswap.sellLimit(order.price, order.size);
                    break;
                case OrderSide.BUY:
                    this.bcswap.buyLimit(order.price, order.size);
                    break;
            }
            return;
        }
        // 3m内未有成交才检查
        if (Date.now() - this.lastFillTime < 1000 * 60 * 3) {
            return;
        }
        this.lastFillTime = Date.now();
        // 判断是否存在成交未回报导致的未驱动下单情况
        const diff = this.bcswap.getPrice() - this.params.current;
        // 可能存在卖单未回报
        if (diff > 2 * this.params.DIFF) {
            // 存在尝试的情况
            if (this.bcswap.existEffort(OrderSide.SELL)) {
                return;
            }
            // 下卖单
            this.log(`compensated to sell ... `);
            if (!this.validPosition(PositionSide.LONG, this.params.size)) {
                this.log(`there is no enough position for this sell order, size: ${this.params.size}`);
                return;
            }
            this.bcswap.sellLimit(this.params.current + 2 * this.params.DIFF, this.params.size);
            return;
        }
        // 可能存在买单未回报
        if (diff < -2 * this.params.DIFF) {
            // 存在尝试的情况
            if (this.bcswap.existEffort(OrderSide.BUY)) {
                return;
            }
            // 下买单
            this.log(`compensated to buy ... `);
            this.bcswap.buyLimit(this.params.current - 2 * this.params.DIFF, this.params.size);
            return;
        }
    }
}
class Params {
    top!: number;
    bottom!: number;
    current!: number;
    size!: number;
    DIFF!: number;
}