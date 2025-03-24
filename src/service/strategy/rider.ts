// rider
// 以kx方向为大方向，ky方向为小方向，但两者一致时确立趋势，可开仓；反之，平仓
// 顺势操作，止盈止损
import { Candle, CandleResolution, Order, Fill, OrderSide, OrderStatus, PositionSide, AccountInfo } from "@/service/client";
import { SwapUser } from "@/service/swapUser";
class Rider extends SwapUser {
    // 交易参数
    params!: Params;
    // x周期
    kx!: Candle;
    // y周期
    ky!: Candle;
    // 下单数量，usd
    size: number = 0;
    // 步价
    step: number = 0;
    // 最近清仓时间
    lastCleanTime: number = 0;
    // 清仓次数，每次转势有限次清仓判断
    cleanTimes: number = 0;
    // 最近进行平仓的订单id
    profitOrderIds: Array<string> = new Array();

    init = (): void => {
        this.kx = <Candle>{ high: 10000000, startedAt: "0" };
        this.ky = <Candle>{ high: 10000000, startedAt: "0" };
        this.lastCleanTime = Date.now();
        this.subscribeTick();
        this.subscribeCandle(CandleResolution.HOUR1);
    };

    // 账号状态变化
    accountCallback = async (accountInfo: AccountInfo) => {
        this.conlog2("account: ", accountInfo);
    };

    // 价格变化事件处理
    handleTick = async (price: number) => {
        if (this.params.current === 0) {
            this.params.current = price;
            this.conlog2("init params: ", this.params);
            return;
        }
        if (this.step === 0) {
            this.step = this.params.current * this.params.DIFF;
            this.conlog2("init step: ", this.step);
            return;
        }
        if (this.size === 0) {
            this.size = this.calculateSize(this.params.current, this.params.N);
            this.conlog2("init size: ", this.size);
            return;
        }
        // 判断dy走势
        if (price > this.ky.high) {
            if (!this.params.dy) {
                this.params.dy = true;
                this.chaserReset(price);
                this.log(`dy changed to LONG, price: ${price}, step: ${this.step}, params: `, this.params);
            }
            this.chaserClean(PositionSide.SHORT, price);
        } else if (price < this.ky.low) {
            if (this.params.dy) {
                this.params.dy = false;
                this.chaserReset(price);
                this.log(`dy changed to SHORT, price: ${price}, step: ${this.step}, params: `, this.params);
            }
            this.chaserClean(PositionSide.LONG, price);
        }
        // 判断dx走势
        if (price > this.kx.high) {
            if (!this.params.dx) {
                this.params.dx = true;
                this.log(`dx changed to LONG, price: ${price}, step: ${this.step}, params: `, this.params);
            }
        } else if (price < this.kx.low) {
            if (this.params.dx) {
                this.params.dx = false;
                this.log(`dx changed to SHORT, price: ${price}, step: ${this.step}, params: `, this.params);
            }
        }
        // 判断direction
        if (this.params.dx && this.params.dy) {
            if (this.params.direction !== true) {
                this.params.direction = true;
                const temp = this.subNumber(price, this.step);
                if (temp > this.params.current) {
                    this.params.current = temp;
                }

                this.log(`start chasing long, price: ${price}, params: `, this.params);
                // 动态计算可开仓数量
                this.size = this.calculateSize(this.params.current, this.params.N);
                this.conlog2("long reset size: ", this.size);
            }
        } else if (!this.params.dx && !this.params.dy) {
            if (this.params.direction !== false) {
                this.params.direction = false;
                const temp = this.addNumber(price, this.step);
                if (temp < this.params.current) {
                    this.params.current = temp;
                }

                this.log(`start chasing short, price: ${price}, params: `, this.params);
                // 动态计算可开仓数量
                this.size = this.calculateSize(this.params.current, this.params.N);
                this.conlog2("short reset size: ", this.size);
            }
        } else {
            this.params.direction = null;
        }
        // 价差
        const diff = price - this.params.current;
        //顺势操作
        switch (this.params.direction) {
            //涨
            case true:
                // 追风
                // 每涨一步，买进
                if (diff >= this.step) {
                    // 计算price
                    const pc = this.addNumber(this.params.current, this.step);
                    this.params.current = pc;
                    this.conlog2(`params to open long, price: ${pc}, diff: ${diff}, params: `, this.params);
                    this.bcswap.buyLimit(pc, this.size);

                    this.cancelOpenedOrders(OrderSide.BUY, price, this.step * 5);
                    return;
                }
                // 回踩
                else if (diff <= -this.step) {
                    this.conlog2(`long back forword, price: ${price}, params: `, this.params);
                    // 清除准多单
                    this.clearLapseOrders(OrderSide.BUY);
                    // current 重置
                    const pc = this.subNumber(this.params.current, this.step);
                    this.params.current = pc;
                    // 了结获利，计算要卖出订单
                    const amount = this.calculateProfitAmount(OrderSide.BUY, pc);
                    if (amount === 0) {
                        return;
                    }
                    this.conlog2(`params to close long, price: ${pc}, amount: ${amount}, params: `, this.params);
                    const result = await this.bcswap.close(PositionSide.LONG, pc, amount);
                    // 下单错误，进行补偿
                    if (!result) {
                        this.params.current = this.addNumber(pc, this.step);
                    }
                    return;
                }
                // 若存在取消的平仓单，重新下单
                const ccob = this.getCancledClosingOrderWithPrice(OrderSide.SELL, price);
                if (ccob) {
                    const size = this.getReClosableSize(ccob);
                    this.conlog2(`order re- close long, price: ${price}, size: ${size}, order: `, ccob);
                    await this.clearCanceledClosingOrders(OrderSide.SELL);
                    const result = await this.bcswap.close(PositionSide.LONG, price, size);
                    // 若下单失败，回写order
                    if (!result) {
                        this.setOrder(ccob);
                    }
                }
                break;
            // 跌
            case false:
                // 每跌一步，卖出
                if (diff <= -this.step) {
                    // 计算price
                    const pc = this.subNumber(this.params.current, this.step);
                    this.params.current = pc;
                    this.conlog2(`params to open short, price: ${pc}, diff: ${diff}, params: `, this.params);
                    this.bcswap.sellLimit(pc, this.size);

                    this.cancelOpenedOrders(OrderSide.SELL, price, this.step * 5);
                    return;
                }
                // 回踩
                else if (diff >= this.step) {
                    this.conlog2(`short back forword, price: ${price}, params:`, this.params);
                    // 清除准空单
                    this.clearLapseOrders(OrderSide.SELL);

                    // current 重置
                    const pc = this.addNumber(this.params.current, this.step);
                    this.params.current = pc;
                    // 了结获利，计算要卖出订单
                    const amount = this.calculateProfitAmount(OrderSide.SELL, pc);
                    if (amount === 0) {
                        return;
                    }
                    this.conlog2(`params to close short, price: ${pc}, amount: ${amount}, params: `, this.params);
                    const result = await this.bcswap.close(PositionSide.SHORT, pc, amount);
                    // 下单错误，进行补偿
                    if (!result) {
                        this.params.current = this.subNumber(pc, this.step);
                    }
                    return;
                }
                //若存在取消的顺势平仓单，重新下单
                const ccos = this.getCancledClosingOrderWithPrice(OrderSide.BUY, price);
                if (ccos) {
                    const size = this.getReClosableSize(ccos);
                    this.conlog2(`order re- close short, price: ${price}, size: ${size}, order: `, ccos);
                    await this.clearCanceledClosingOrders(OrderSide.BUY);
                    const result = await this.bcswap.close(PositionSide.SHORT, price, size);
                    // 若下单失败，回写order
                    if (!result) {
                        this.setOrder(ccos);
                    }
                }
                break;
        }
    };

    // 根据方向、价格计算获利仓
    calculateProfitAmount = (side: OrderSide, pc: number): number => {
        const closeOrders = this.getProfitOpenedOrders(side, pc, this.step / 2);
        if (closeOrders?.length === 0) {
            this.conlog2(`===无获利${side}头寸=== price: ${pc}, step:${this.step}`);
            return 0;
        }
        // console.info(`获利${side}头寸: `, closeOrders);
        // order id 数组
        this.profitOrderIds = closeOrders.map(order => order.id);
        // 总额
        const amount = closeOrders.reduce((value, order) => {
            const t = Number(order.totalFilled || 0);
            return value + t;
        }, 0);
        if (amount === 0) {
            this.conlog2(`something wrong calculating profit positions: ${side}, price: ${pc}`);
            return 0;
        }
        return amount;
    }

    // 转向重置参数
    chaserReset = (price: number) => {
        this.step = price * this.params.DIFF;
        this.profitOrderIds = [];
        this.cleanTimes = 0;
        this.clearOrders();
    }

    // 策略清仓
    // 执行间隔、次数
    chaserClean = (side: PositionSide, price: number) => {
        // 清仓空单
        if (this.cleanTimes < 9 && Date.now() - this.lastCleanTime > 3000) {
            this.clean(side, price);
            this.lastCleanTime = Date.now();
            this.cleanTimes++;
        }
    }

    // 获取再次平仓时可平仓数量
    // size- totalFilled
    getReClosableSize = (order: Order): number => {
        let size = order.size;
        if (order.totalFilled) {
            const filled = Number(order.totalFilled || 0);
            size -= filled;
        }
        return size;
    }

    // K处理
    handleCandle = async (candle: Candle, resolution: CandleResolution) => {
        // console.log("resolution: ", resolution);
        // console.log("candle: ", candle);
        // 新的K线，进行一些计算
        if (candle.startedAt.localeCompare(this.kx.startedAt) > 0) {
            this.kx.startedAt = candle.startedAt;
            const candles = this.bcswap.getCandles(resolution);
            if (candles?.length < 26) {
                return;
            }
            // 周期x高低点计算
            const cx = candles.slice(1, 25);
            // this.conlog2(`candle ${resolution} cx: `, cx);
            const xhs = cx.map(c => c.high);
            const xls = cx.map(c => c.low);
            this.kx.high = Math.max(...xhs);
            this.kx.low = Math.min(...xls);
            this.conlog2(`candle ${resolution}: kx.high=${this.kx.high}, kx.low=${this.kx.low}`);

            // 周期y高低点计算
            const cy = candles.slice(1, 9);
            // this.conlog2(`candle ${resolution} cx: `, cx);
            const yhs = cy.map(c => c.high);
            const yls = cy.map(c => c.low);
            this.ky.high = Math.max(...yhs);
            this.ky.low = Math.min(...yls);
            this.conlog2(`candle ${resolution}: ky.high=${this.ky.high}, ky.low=${this.ky.low}`);
        }
    };

    // 订单状态变化
    orderCallback = async (order: Order) => {
        this.conlog2("order callback: ", order);
        // 减仓订单成交
        if (order.reduceOnly && order.status === OrderStatus.FILLED) {
            this.conlog2("order close filled remove ... ");
            this.profitOrderIds.forEach(async p => {
                await this.removeOrder(p);
            });
            this.removeOrder(order.id);
        }
    };
}
class Params {
    // 方向，true涨false跌
    direction!: boolean | null;
    dx!: boolean;
    dy!: boolean;
    current!: number;
    N!: number;
    DIFF!: number;
}