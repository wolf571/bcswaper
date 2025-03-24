
// 用户策略结构
import { AccountInfo, Candle, CandleResolution, Fill, Order, OrderSide, OrderStatus, OrderType, PositionData, PositionSide } from "@/service/client";
import * as schedule from "node-schedule"
import { cacheOrderMap, saveOrder2DB, writeLog } from "@/db/sqliteHelper";
import { deleteLog, deleteOrderByDate, findConf } from "@/db/sqliteHandler";
import { Engine } from "@/service/engine";
import { conlog, conerr } from "@/utils/bchelper";
import { exist } from "./swapMapper";

// 定义用户方法
export interface ISwapUser {
    // 交易名
    name: string
    // 交易标的
    symbol: string;
    // 交易品种
    bcswap: Engine;
    // 交易参数
    params: any;
    // user method
    // 初始化方法
    init(): void;
    // 价格变化事件处理
    handleTick(price: number): Promise<void>;
    // 蜡烛变化事件处理
    handleCandle(candle: Candle, resolution: CandleResolution): Promise<void>;
    // 账号状态变化
    accountCallback(accountInfo: AccountInfo): Promise<void>;
    // 持仓状态变化
    positionCallback(positions: PositionData[]): Promise<void>;
    // 订单状态变化
    orderCallback(order: Order): Promise<void>;
    // 订单成交状态变化
    fillCallback(fill: Fill): Promise<void>;

    //启动
    start(): void;
    // 订阅ticker数据
    subscribeTick(): void;
    // 订阅candle数据
    subscribeCandle(resolution: CandleResolution): void;
    // 定时器
    timer(cron: string, f: () => void): void;
    // 停止
    stop(): void;
}

// 用户策略代码实现类
export class SwapUser implements ISwapUser {
    name!: string;
    // 交易品种
    symbol!: string;
    // 交易引擎
    bcswap!: Engine;
    // 交易参数
    params!: any;

    constructor() {
    }

    // 待删除标识
    private delwaiting = "DeleteWaitingFlag";

    // 行情推送时间
    private marketTime: number = Date.now();
    // 对于BEST_EFFORT_CANCELED状态的订单，至少等几秒确定状态
    private bestEffortSeconds: number = 3;
    private orderInterval: number = 0;
    // 下单确认机制
    // effortInterval > 0 表示开启该功能，<=0表示不启用
    // EffortTimes < 0重启，==0不操作，>0再次报单
    // 报单超时未接收到反馈时几s后再次报单
    private effortInterval: number = 0;
    private orderCacheDays: number = 0;
    private logKeepDays: number = 0;

    async start(): Promise<void> {
        // init
        this.init();
        this.bcswap.subAccount(this.accountCallback);
        this.bcswap.subPosition(this.positionCallback);
        this.bcswap.subOrder(this.orderFunc);
        this.bcswap.subFill(this.fillFunc);
        // start
        this.bcswap.start();

        // setting
        const conf = await findConf();
        this.bestEffortSeconds = conf?.bestEffortSeconds || 3;
        // 间隔不能太小
        this.orderInterval = conf?.orderInterval || 1;
        if (this.orderInterval < 1) {
            this.orderInterval = 1;
        }
        this.effortInterval = conf?.effortInterval || 20;
        this.orderCacheDays = conf?.orderCacheDays || 30;
        this.logKeepDays = conf?.logKeepDays || 10;

        this.marketTime = Date.now();
        // check market
        this.timer(`2/${this.orderInterval} * * * * *`, async () => {
            // 检查系统状态，策略是否在运行
            // 若未在运行列表，则停止
            if (!exist(this.name)) {
                this.stop();
                return;
            }
            // 每3秒钟检查重试机制一次
            if (!this.bcswap.client.running) {
                return;
            }
            // 监控撤单未成功的情况
            let effort = await this.bcswap.ensureCanceling();
            // 每次保证执行一次可能的任务
            if (!effort && this.effortInterval > 0) {
                // 执行下单确认机制
                this.bcswap.ensureEffort();
            }
        });
        // 每10分钟检查一次行情回报，若无回报，则重启client
        this.timer(`8 */10 * * * *`, async () => {
            // 输出check信息
            this.conlog2(`check market ... ${this.marketTime}`,);
            // 超过8分钟无回报
            const diff = (Date.now() - this.marketTime) / 1000 / 60;
            if (diff > 8) {
                this.log(`check to restart swaper ${this.name}...`);
                this.marketTime = Date.now();
                this.bcswap.restart();
                return;
            }
            // 每10分钟缓存一下order map
            cacheOrderMap(this.name, this.orderArray);
        });
        // 每天8点清理一次过期订单
        this.timer(`8 8 8 * * *`, async () => {
            // 超过1K条记录
            if (this.orderMap.size > 1024) {
                this.conlog2("clean order map ...");
                const resetables = this.orderArray.filter(order => {
                    const upd = order.updatedAt;
                    if (upd) {
                        const d = Date.parse(upd);
                        const df = (Date.now() - d) / (1000 * 60 * 60 * 24);
                        // 过期订单缓存的清理
                        if (df > this.orderCacheDays) {
                            return true;
                        }
                    }
                    return false;
                });
                if (resetables?.length > 0) {
                    resetables?.forEach(order => this.orderMap.delete(order.id));
                    this.resetOrderArray();
                }
            }
            //清理db order
            const date = new Date();
            date.setDate(date.getDate() - this.orderCacheDays);
            deleteOrderByDate(date);
        });
        // 每天16点清理一次过期日志
        this.timer(`16 16 16 * * *`, async () => {
            this.conlog2('clean log ...');
            const date = new Date();
            date.setDate(date.getDate() - this.logKeepDays);
            deleteLog(date);
        });
    }

    init(): void {
    }

    subscribeTick(): void {
        this.bcswap.subTick(this.tickFunc);
    }

    subscribeCandle(resolution: CandleResolution): void {
        this.bcswap.subCandle(resolution, this.candleFunc);
    }

    //定时器对象
    private jobs: any[] = [];
    timer(rule: string | Date | number, f: Function): void {
        const j = schedule.scheduleJob(rule, async () => {
            f();
        });
        this.jobs.push(j);
    }
    stop(): void {
        this.jobs.forEach(j => {
            j.cancel();
            j = null;
        })
        this.jobs = [];
        //release
        this.bcswap.stop();
    }

    // 已下单订单列表
    private orderMap: Map<string, Order> = new Map();
    // 缓存快照，便于查询
    private orderArray: Order[] = [];

    // 获取所有order map中的订单
    getOrders = () => {
        return this.orderArray;
    };

    // 设置orderMap，重置orderArray
    setOrder = async (order: Order) => {
        this.orderMap.set(order.id, order);
        this.resetOrderArray();
    }

    // 删除order
    deleteOrder = async (id: string) => {
        this.orderMap.delete(id);
        this.resetOrderArray();
    }

    clearOrders = async () => {
        this.orderMap.clear();
        this.orderArray = [];
    }

    // 重置order array
    resetOrderArray = async () => {
        this.orderArray = [...this.orderMap.values()];
    }

    // 根据方向获取订单
    getOrdersBySide = (side: OrderSide): Order[] => {
        // 转换为数组
        const orders = this.orderArray.filter(order => {
            if (order.clientMetadata === this.delwaiting) {
                return false;
            }
            if (order.side === side) {
                return true;
            }
            return false;
        });
        return orders;
    };

    // 获取盈利的开仓单
    // diff：需要拉开的获利价差
    getProfitOpenedOrders = (side: OrderSide, price: number, diff: number = 0): Order[] => {
        // conlog("current orders: ", this.orderArray);
        // 转换为数组
        const profitOrders: Order[] = this.orderArray.filter(order => {
            // 过滤平仓单
            if (order.reduceOnly) {
                return false;
            }
            // 过滤待删除单
            if (order.clientMetadata === this.delwaiting) {
                return false;
            }
            if (order.side !== side) {
                return false;
            }
            if (!order.totalFilled) {
                return false;
            }
            // conlog(`caculate profit order, price: ${price}, diff: ${diff}, order: `, order);
            if (diff === 0) {
                return side === OrderSide.BUY ? order.price < price : order.price > price;
            }
            return side === OrderSide.BUY ? this.addNumber(order.price, diff) <= price : this.subNumber(order.price, diff) >= price;
        });
        return profitOrders;
    };

    // 根据价格获取一个被取消的开仓单
    // BEST_EFFORT_CANCELED状态的订单仍有可能成交，bestEffortSeconds之内不作为取消单
    getCancledOpeningOrderWithPrice = (side: OrderSide, price: number): Order | null => {
        const order = this.orderArray.find(order => {
            // 过滤平仓单
            if (order.reduceOnly) {
                return false;
            }
            // 过滤待删除单
            if (order.clientMetadata === this.delwaiting) {
                return false;
            }
            if (order.side !== side) {
                return false;
            }
            if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.BEST_EFFORT_CANCELED) {
                if (order.status === OrderStatus.BEST_EFFORT_CANCELED) {
                    const confirm = this.confirmBestEffort(order.updatedAt);
                    if (!confirm) {
                        return false;
                    }
                }
                const p = Number(order.price);
                return (side === OrderSide.BUY ? p >= price : p <= price);
            }
            return false;
        });
        return order || null;
    };

    // 获取一个被取消的订单
    // BEST_EFFORT_CANCELED状态的订单仍有可能成交，bestEffortSeconds之内不作为取消单
    getCancledOrder = (side: OrderSide): Order | null => {
        const order = this.orderArray.find(order => {
            // 过滤待删除单
            if (order.clientMetadata === this.delwaiting) {
                return false;
            }
            if (order.side !== side) {
                return false;
            }
            if (order.status === OrderStatus.CANCELED) {
                return true;
            }
            // 对于BEST_EFFORT_CANCELED特殊处理
            if (order.status === OrderStatus.BEST_EFFORT_CANCELED) {
                return this.confirmBestEffort(order.updatedAt);
            }
            return false;
        });
        return order || null;
    };

    // 从order map中获取一个被取消的平仓订单
    // BEST_EFFORT_CANCELED状态的订单仍有可能成交，bestEffortSeconds之内不作为取消单
    getCancledClosingOrder = (side: OrderSide): Order | null => {
        const order = this.orderArray.find(order => {
            if (!order.reduceOnly) {
                return false;
            }
            if (order.clientMetadata === this.delwaiting) {
                return false;
            }
            if (order.side !== side) {
                return false;
            }
            if (order.status === OrderStatus.CANCELED) {
                return true;
            }
            // 对于BEST_EFFORT_CANCELED特殊处理
            if (order.status === OrderStatus.BEST_EFFORT_CANCELED) {
                return this.confirmBestEffort(order.updatedAt);
            }
            return false;
        });
        return order || null;
    };

    // 从order map中获取一个被取消的平仓订单
    // BEST_EFFORT_CANCELED状态的订单仍有可能成交，bestEffortSeconds之内不作为取消单
    getCancledClosingOrderWithPrice = (side: OrderSide, price: number): Order | null => {
        const order = this.orderArray.find(order => {
            if (!order.reduceOnly) {
                return false;
            }
            if (order.clientMetadata === this.delwaiting) {
                return false;
            }
            if (order.side !== side) {
                return false;
            }
            if (order.status === OrderStatus.CANCELED || order.status === OrderStatus.BEST_EFFORT_CANCELED) {
                if (order.status === OrderStatus.BEST_EFFORT_CANCELED) {
                    const confirm = this.confirmBestEffort(order.updatedAt);
                    if (!confirm) {
                        return false;
                    }
                }
                const p = Number(order.price);
                return (side === OrderSide.BUY ? p >= price : p <= price);
            }
            return false;
        });
        return order || null;
    };

    // 判断时间是否在bestEffortSeconds之内
    // 若在之内，返回false，否则返回true
    confirmBestEffort = (upd: string | undefined): boolean => {
        if (upd) {
            const d = Date.parse(upd);
            // bestEffortSeconds内不作处理，有可能成交
            if (isNaN(d) || Date.now() - d < this.bestEffortSeconds * 1000) {
                return false;
            }
        }
        return true;
    }

    // 清仓某个方向的仓位
    clean = async (side: PositionSide, price: number): Promise<boolean> => {
        const acc = this.bcswap.getAccountInfo();
        let size = acc.positions.filter(p => p.side === side)?.at(0)?.size;
        if (size && size !== 0) {
            size = Math.abs(size);
            this.conlog2(`clean ${side} orders: ${size}`);
            return this.bcswap.close(side, price, size);
        }
        return true;
    };

    // 清除order map中被取消的订单
    // 清除下单后还未反馈的订单
    // 撤单未成交订单
    clearLapseOrders = async (side: OrderSide) => {
        if (this.bcswap.existEffort(side)) {
            this.conlog2(`clear wished ${side} orders ...`);
            this.bcswap.clearEffort(side);
        }
        let dealed = false;
        this.orderArray.forEach(order => {
            if (order.side !== side) {
                return;
            }
            if (order.status === OrderStatus.BEST_EFFORT_OPENED
                || order.status === OrderStatus.OPEN
            ) {
                this.conlog2(`cancel opening ${side} order: `, order);
                this.bcswap.cancel(order);
                this.orderMap.delete(order.id);
                dealed = true;
                return;
            }
            if (order.status === OrderStatus.BEST_EFFORT_CANCELED
                || order.status === OrderStatus.CANCELED
            ) {
                this.conlog2(`clear cancled ${side} order: `, order);
                this.orderMap.delete(order.id);
                dealed = true;
            }
        });
        // 有变动，重置orderArray
        if (dealed) {
            this.resetOrderArray();
        }
    };

    // 撤单远离当前价位的开仓单
    // price 当前价
    // diff 价差
    cancelOpenedOrders = async (side: OrderSide, price: number, diff: number = 0) => {
        this.orderArray.forEach(order => {
            if (order.side !== side) {
                return;
            }
            if (order.status !== OrderStatus.BEST_EFFORT_OPENED
                && order.status !== OrderStatus.OPEN
            ) {
                return;
            }
            switch (order.side) {
                case OrderSide.BUY:
                    if (this.subNumber(price, diff) < order.price) {
                        return;
                    }
                    this.conlog2(`far cancel opened order: side = ${side}, price=${price}, diff=${diff}, order=`, order);
                    this.bcswap.cancel(order);
                    break;
                case OrderSide.SELL:
                    if (this.addNumber(price, diff) < order.price) {
                        return;
                    }
                    this.conlog2(`far cancel opened order: side = ${side}, price=${price}, diff=${diff}, order=`, order);
                    this.bcswap.cancel(order);
                    break;
            }
        });
    };

    // 删除已取消平仓单
    // 该操作在获取到已冷却订单重新下单后执行
    clearCanceledClosingOrders = async (side: OrderSide) => {
        let dealed = false;
        this.orderArray.forEach(order => {
            if (!order.reduceOnly) {
                return;
            }
            if (order.clientMetadata === this.delwaiting) {
                return;
            }
            if (order.side !== side) {
                return;
            }
            if (order.status === OrderStatus.BEST_EFFORT_CANCELED
                || order.status === OrderStatus.CANCELED
            ) {
                this.conlog2(`clear cancled ${side} closing order: `, order);
                this.orderMap.delete(order.id);
                dealed = true;
            }
        });
        // 有变动，重置orderArray
        if (dealed) {
            this.resetOrderArray();
        }
    };

    // 清除订单
    removeOrder = async (id: string) => {
        this.conlog2(`remove order in ${this.bestEffortSeconds} seconds: ${id} ...`);
        // this.deleteOrder(id);
        const order = this.orderArray.find(o => o.id === id);
        if (!order) {
            this.conlog2(`remove order: something wrong getting order by id: ${id}`);
            return;
        }
        order.clientMetadata = this.delwaiting;
        // 延迟bestEffortSeconds秒执行，防止出现成交后再有其他状态回报的问题
        setTimeout(() => this.deleteOrder(id), this.bestEffortSeconds * 1000);
    };

    // 价格变化处理
    handleTick = async (price: number) => {
        const date = new Date();
        if (date.getSeconds() === 0) {
            this.conlog2("price: ", price);
        }
    };

    // 价格变化处理
    tickFunc = async (price: number) => {
        // conlog("price: ", price);
        this.marketTime = Date.now();
        await this.handleTick(price);
    };

    // K线变化处理
    handleCandle = async (candle: Candle, resolution: CandleResolution) => {
        this.conlog2("candle: ", candle);
    };

    // 价格变化处理
    candleFunc = async (candle: Candle, resolution: CandleResolution) => {
        // conlog("candle: ", candle);
        this.marketTime = Date.now();
        await this.handleCandle(candle, resolution);
    };

    // 账号状态变化
    accountCallback = async (accountInfo: AccountInfo) => {
        this.conlog2("account: ", accountInfo);
    };

    // 持仓状态变化
    positionCallback = async (positions: PositionData[]) => {
        this.conlog2("positions: ", positions);
    };

    // 订单状态变化回调
    orderFunc = async (order: Order) => {
        if (!order.updatedAt || order.updatedAt.length == 0) {
            order.updatedAt = (new Date()).toISOString();
        }
        // 订单状态回调可能存在不同步的情况
        const id = order.id;
        switch (order.status) {
            // 可能出现BEST_EFFORT_CANCELED后又成交的情况
            case OrderStatus.BEST_EFFORT_CANCELED:
                const oc = this.orderMap.get(id);
                if (oc?.status === OrderStatus.FILLED) {
                    break;
                }
                this.setOrder(order);
                break;
            // 可能出现先后顺序问题
            case OrderStatus.BEST_EFFORT_OPENED:
                const op = this.orderMap.get(id);
                if (op?.status === OrderStatus.BEST_EFFORT_CANCELED) {
                    break;
                }
                this.setOrder(order);
                break;
            // 已取消
            case OrderStatus.CANCELED:
                this.bcswap.removeCanceling(id);
            // 成交
            case OrderStatus.FILLED:
            default:
                this.setOrder(order);
                break;
        }
        // 
        //order call back with status changed  
        await this.orderCallback(order);
        // 若成交，则保存
        if (order.status === OrderStatus.FILLED) {
            saveOrder2DB(order);
        }
        // 重置effort order
        if (this.effortInterval > 0) {
            this.bcswap.removeEffort(order.clientId);
        }
    };

    // 订单状态变化
    orderCallback = async (order: Order) => {
        this.conlog2("order callback: ", order);
    };

    // 订单成交状态变化回调
    fillFunc = async (fill: Fill) => {
        const order = this.orderMap.get(fill.orderId);
        // 无订单缓存
        if (!order) {
            this.conlog2("filled order not found: ", fill);
            return;
        }
        // 回报顺序问题
        if (order.status !== OrderStatus.FILLED) {
            return;
        }
        order.filledPrice = Number(fill.price);
        this.setOrder(order);
        // 回调处理
        await this.fillCallback(fill);
    };

    // 订单成交状态变化
    fillCallback = async (fill: Fill) => {
        this.conlog2("fill callback: ", fill);
    };

    //判断是否有足够仓位
    validPosition = (side: PositionSide, size: number): boolean => {
        const positions = this.bcswap.getAccountInfo().positions;
        const ps = positions?.find(p => p.symbol === this.symbol && p.side === side && p.size >= size);
        // console.log(`positions: ${JSON.stringify(positions)} ps: ${ps}`)
        if (ps) {
            return true;
        }
        return false;
    }

    // 日志
    async log(...message: any) {
        // this.
        writeLog(this.name, this.symbol, ...message);
        conlog(this.name, "-", ...message);
    };

    async conlog2(...message: any) {
        conlog(this.name, "-", ...message);
    }

    /**
     * 根据价格和本金计算每笔开仓size
     * @param price 当前价格
     * @param n 份数，默认10
     * @returns 
     */
    calculateSize(price: number, n: number): number {
        const accountInfo = this.bcswap.getAccountInfo();
        const equity = Number(accountInfo?.equity || 0);
        if (price === 0 || equity === 0) {
            return 0;
        }
        if (n < 1) {
            n = 10;
        }
        // 将可开仓数量分成N份
        const size = equity / price / n;
        return Math.round(size * 1000) / 1000;
    };

    // 两数相加
    addNumber = (price: number, diff: number): number => {
        return Number(price) + Number(diff);
    }

    // 两数相减
    subNumber = (price: number, diff: number): number => {
        return Number(price) - Number(diff);
    }
}