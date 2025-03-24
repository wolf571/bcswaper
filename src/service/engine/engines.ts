import { sleep } from '@/utils/bchelper';
import { Client, ClientSettings, Candle, CandleResolution, OrderSide, Order, Orderbook, SubTypes, AccountInfo, Fill, OrderType, PositionData, PositionSide } from "@/service/client";
import { conlog, conerr } from "@/utils/bchelper";

// 交易引擎
export interface Engine {
    // client
    client: Client;
    // 引擎参数
    settings: EngineSettings;
    // 当前价格
    getPrice(): number;
    // 订单簿
    getOrderbook(): Orderbook;
    // 获取蜡烛列表
    getCandles(resolution: CandleResolution): Candle[];
    // 获取账户信息
    getAccountInfo(): AccountInfo;

    //启动
    start(): Promise<void>;

    // 订阅tick数据
    subTick(callback: (price: number) => Promise<void>): void;
    // 订阅candle数据
    subCandle(resolution: CandleResolution, callback: (candle: Candle, resolution: CandleResolution) => Promise<void>): void
    // 订阅订单簿
    subOrderbook(callback: () => Promise<void>): void;
    // 订阅市场
    subMarket(callback: () => Promise<void>): void;
    // 账户变化
    subAccount(callback: (accountInfo: AccountInfo) => Promise<void>): void;
    // 持仓状态变化
    subPosition(callback: (positions: PositionData[]) => Promise<void>): void;
    // 订单状态变化
    subOrder(callback: (order: Order) => Promise<void>): void;
    // 订单成交状态变化
    subFill(callback: (fill: Fill) => Promise<void>): void;

    // 下单监控，可能出现无回单的情况
    ensureEffort(): Promise<boolean>;
    // 存在尝试下单的订单
    existEffort(side: OrderSide): boolean;
    // 重置effortOrders
    removeEffort(clientId: number): void;
    // 清除失效effortOrders
    clearEffort(side: OrderSide): void;
    // 撤单确认，若存在未成功撤销的订单，再次撤单
    ensureCanceling(): Promise<boolean>;
    // 是否存在撤单等待
    existCanceling(): boolean;
    // 撤单Canceled销号
    removeCanceling(id: string): void;
    // 市价买
    buy(price: number, size: number): Promise<boolean>;
    // 市价卖
    sell(price: number, size: number): Promise<boolean>;
    // 限价买
    buyLimit(price: number, size: number): Promise<boolean>;
    // 限价下单买，不转换size，与sellLimit对应
    buyLimit2(price: number, size: number): Promise<boolean>;
    // 限价卖
    sellLimit(price: number, size: number): Promise<boolean>;
    // 限价下单卖，不转换size，与buyLimit对应
    sellLimit2(price: number, size: number): Promise<boolean>;
    // 市价平仓
    close(side: PositionSide, price: number, size: number): Promise<boolean>;
    // 限价平仓
    closeLimit(side: PositionSide, price: number, size: number, goodTillTime?: number): Promise<boolean>;
    // 取消订单
    cancel(order: Order): Promise<boolean>;
    // 停止
    stop(): void;
    // 重启引擎
    restart(): void;
    // 错误处理
    onerror(err: any): void;
}

// 引擎参数设置
export interface EngineSettings {
    // engine name
    Name: string;
    // 下单间隔s
    OrderInterval: number;
    // 下单重试次数
    EffortTimes: number;
    // 下单重试间隔s
    EffortInterval: number;
    // 撤单重试次数
    CancelingTimes: number;
    // 撤单重试间隔s
    CancelingInterval: number;
    // 扫单时给出的溢/折价
    MarketSpreads: number;
}

// 错误
export type ErrorType = {
    code: string;
    message: string;
    result: any;
    remark: string;
};

// apis client engine
export abstract class AbstractEngine implements Engine {
    // client
    client!: Client;

    settings!: EngineSettings;
    // 
    getPrice(): number {
        return this.client.getPrice();
    }
    getOrderbook(): Orderbook {
        return this.client.getOrderbook();
    }
    getCandles(resolution: CandleResolution): Candle[] {
        return this.client.getCandles(resolution);
    }
    getAccountInfo(): AccountInfo {
        return this.client.getAccountInfo();
    }

    async start() {
        conlog(`${this.settings.Name} client starting ...`);
        await this.client.initialize();
        conlog(`${this.settings.Name} client started !`);
    }
    // engine method
    subTick(callback: (price: number) => Promise<void>): void {
        this.client.subscribe(SubTypes.Tick, callback);
    }
    subCandle(resolution: CandleResolution, callback: (candle: Candle, resolution: CandleResolution) => Promise<void>): void {
        this.client.subscribeCandle(resolution, callback);
    }
    subOrderbook(callback: () => Promise<void>): void {
        this.client.subscribe(SubTypes.Orderbook, callback);
    }
    subMarket(callback: () => Promise<void>): void {
        throw new Error("Method not implemented.");
    }
    subAccount(callback: (accountInfo: AccountInfo) => Promise<void>): void {
        this.client.subscribe(SubTypes.Account, callback);
    }
    subPosition(callback: (positions: PositionData[]) => Promise<void>): void {
        this.client.subscribe(SubTypes.Position, callback);
    }
    subOrder(callback: (order: Order) => Promise<void>): void {
        this.client.subscribe(SubTypes.Order, callback);
    }
    subFill(callback: (fill: Fill) => Promise<void>): void {
        this.client.subscribe(SubTypes.Deal, callback);
    }

    // 当前正试图开仓的单子
    // 若1分钟内还没有反馈，说明单子丢了，那么重新下单
    // id格式: side-type-clientId-readonly
    effortOrders: Map<number, Order> = new Map();
    effortArray: Order[] = new Array();
    // 下单次数限制
    effortTimes: Map<number, number> = new Map();

    setEffort = async (order: Order) => {
        this.effortOrders.set(order.clientId, order);
        this.resetEffort();
    }

    // 从effortOrders map中删除client order
    // 从effortTimes map中删除相应记录
    deleteEffort = async (clientId: number) => {
        this.effortOrders.delete(clientId);
        this.effortTimes.delete(clientId);
    }

    // 重置effortArray
    resetEffort = async () => {
        this.effortArray = [... this.effortOrders.values()];
    }

    // 确认是否超过3s没有反馈
    ensureEffort = async (): Promise<boolean> => {
        // 当设置重下单参数<0时，不启用重下单功能
        // 若存在下单后，超过一定时间无反馈，重启client
        if (this.settings.EffortTimes < 0) {
            // 查询超时未回报的订单，如果存在，则说明client可能有问题，进行重连
            // 超时时间设为28个下单间隔
            const order = this.effortArray.find(o => {
                const ss = Math.max(this.settings.OrderInterval, 3) * 28 * 1000;
                // 足够的时间差
                return Date.now() - (o.goodTilBlockTime || 0) > ss;
            });
            // 重启
            if (order) {
                conlog(`effort to restart client, effortTimes: ${this.settings.EffortTimes},  order: `, order);
                // 清空effort清单
                this.effortOrders.clear();
                this.effortArray = [];
                this.restart();
            }
            return false;
        }
        // 判断时间差
        const diff = Date.now() - this.lastOrderTime;
        if (diff < this.settings.OrderInterval * 1000) {
            return false;
        }
        if (this.effortArray.length === 0) {
            return false;
        }
        const price = this.getPrice();
        const order = this.effortArray.find(o => {
            const k = o.clientId;
            const times = this.effortTimes.get(k) || 1;
            if (times > this.settings.EffortTimes) {
                conlog(`${this.settings.EffortTimes} times effort to delete: clientId=${k}`);
                this.deleteEffort(o.clientId);
                this.resetEffort();
                return false;
            }
            // 价格判断
            if (o.side === OrderSide.BUY && price > o.price) {
                return false;
            }
            if (o.side === OrderSide.SELL && price < o.price) {
                return false;
            }
            // 衰减下单
            const ss = this.settings.EffortInterval * times * 1000;
            // 足够的时间差
            const result = Date.now() - (o.goodTilBlockTime || 0) > ss;
            if (!result) {
                return false;
            }
            this.effortTimes.set(k, times + 1);
            return true;

        });
        if (!order) {
            return false;
        }
        const clientId = order.clientId;
        conlog(`ensure order: clientId=${clientId}`);
        this.getClientId();
        switch (order.side) {
            // 买
            case OrderSide.BUY:
                switch (order.type) {
                    case OrderType.MARKET:
                        // 平仓
                        if (order.reduceOnly) {
                            conlog("re- buy close market: clientId=", clientId);
                            this.client.close(order.clientId, PositionSide.SHORT, price, order.size);
                            break;
                        }
                        // 开仓
                        conlog("re- buy open market: clientId=", clientId);
                        this.client.buy(order.clientId, price, order.size);
                        break;
                    case OrderType.LIMIT:
                        // 平仓
                        if (order.reduceOnly) {
                            conlog("re- buy close limit: clientId=", clientId);
                            this.client.closeLimit(order.clientId, PositionSide.SHORT, order.price, order.size, ClientSettings.GoodTillTime);
                            break;
                        }
                        // 开仓
                        conlog("re- buy open limit: clientId=", clientId);
                        this.client.buyLimit(order.clientId, order.price, order.size);
                        break;
                }
                break;
            // 卖
            case OrderSide.SELL:
                switch (order.type) {
                    case OrderType.MARKET:
                        // 平仓
                        if (order.reduceOnly) {
                            conlog("re- sell close market: clientId=", clientId);
                            this.client.close(order.clientId, PositionSide.LONG, price, order.size);
                            break;
                        }
                        // 开仓
                        conlog("re- sell open market: clientId=", clientId);
                        this.client.sell(order.clientId, price, order.size);
                        break;
                    case OrderType.LIMIT:
                        // 平仓
                        if (order.reduceOnly) {
                            conlog("re- sell close limit: clientId=", clientId);
                            this.client.closeLimit(order.clientId, PositionSide.LONG, order.price, order.size, ClientSettings.GoodTillTime);
                            break;
                        }
                        // 开仓
                        conlog("re- sell open limit: clientId=", clientId);
                        this.client.sellLimit(order.clientId, order.price, order.size);
                        break;
                }
                break;
        }
        return true;
    }

    // 判断是否存在撤单
    existEffort = (side: OrderSide): boolean => {
        const order = this.effortArray.find(o => o.side === side);
        if (order) {
            return true;
        }
        return false;
    }
    // 根据key重置effortOrders
    removeEffort = async (clientId: number) => {
        conlog(`remove effort order: clientId=${clientId}`);
        this.deleteEffort(Number(clientId));
        this.resetEffort();
    }

    // 清除失效effortOrders
    clearEffort = async (side: OrderSide) => {
        const efforts = this.effortArray.filter(o => o.side === side);
        if (efforts) {
            efforts.forEach(order => {
                this.deleteEffort(order.clientId);
            });
            this.resetEffort();
        }
    }

    // 设置effortOrder
    consetEffort = async (clientId: number, side: OrderSide, type: OrderType, price: number, size: number, reduceOnly: boolean) => {
        conlog(`conset effort order:  clientId=${clientId}`);
        const order: Order = <Order>{ clientId, side, type, price, size, reduceOnly, goodTilBlockTime: Date.now() };
        this.setEffort(order);
    }

    // 最近下单时间（ms），限流措施
    lastOrderTime: number = 0;
    // 待撤销订单
    cancelingOrders: Map<string, Order> = new Map();
    // cancelingArray:Order[] = new Array();
    // 撤单次数限制
    canclingTimes: Map<string, number> = new Map();
    // 撤单确认，若存在未成功撤销的订单，再次撤单
    ensureCanceling = async (): Promise<boolean> => {
        const diff = Date.now() - this.lastOrderTime;
        if (diff < this.settings.OrderInterval * 1000) {
            return false;
        }
        if (this.cancelingOrders.size == 0) {
            return false;
        }
        const value = this.cancelingOrders.entries().next().value;
        if (!value) {
            return false;
        }
        const [k, v] = value;
        // 衰减取消
        const times = this.canclingTimes.get(k) || 1;
        // 3次撤单失败，移除
        if (times > this.settings.CancelingTimes) {
            conlog(`${this.settings.CancelingTimes} times canceled to delete: id=${k}`);
            this.removeCanceling(k);
            return false;
        }
        if (diff < this.settings.CancelingInterval * times * 1000) {
            return false;
        }
        conlog(`ensure canceling order: id=${k}`);
        this.canclingTimes.set(k, times + 1);
        this.lastOrderTime = Date.now();
        this.client.cancel(v);
        return true;
    }

    // 判断是否存在撤单
    existCanceling = (): boolean => {
        return this.cancelingOrders.size > 0;
    }

    // 撤单Canceled销号
    removeCanceling = async (id: string) => {
        conlog(`remove canceling order: id=${id}`);
        this.cancelingOrders.delete(id);
        // this.cancelingArray = [... this.cancelingOrders.values()];
        this.canclingTimes.delete(id);
    }

    async buy(price: number, size: number): Promise<boolean> {
        const clientId = await this.getClientId();
        this.consetEffort(clientId, OrderSide.BUY, OrderType.MARKET, price, size, false);
        try {
            this.client.buy(clientId, price, size);
        } catch (e) {
            this.onerror(e);
            return false;
        }
        return true;
    }
    async sell(price: number, size: number): Promise<boolean> {
        const clientId = await this.getClientId();
        this.consetEffort(clientId, OrderSide.SELL, OrderType.MARKET, price, size, false);
        try {
            this.client.sell(clientId, price, size);
        } catch (e) {
            this.onerror(e);
            return false;
        }
        return true;
    }
    async close(side: PositionSide, price: number, size: number): Promise<boolean> {
        const clientId = await this.getClientId();
        const sd = side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;
        this.consetEffort(clientId, sd, OrderType.MARKET, price, size, true);
        try {
            this.client.close(clientId, side, price, size);
        } catch (e) {
            this.onerror(e);
            return false;
        }
        return true;
    }
    async buyLimit(price: number, size: number): Promise<boolean> {
        const clientId = await this.getClientId();
        this.consetEffort(clientId, OrderSide.BUY, OrderType.LIMIT, price, size, false);
        try {
            this.client.buyLimit(clientId, price, size);
        } catch (e) {
            this.onerror(e);
            return false;
        }
        return true;
    }
    async buyLimit2(price: number, size: number): Promise<boolean> {
        const clientId = await this.getClientId();
        this.consetEffort(clientId, OrderSide.BUY, OrderType.LIMIT, price, size, false);
        try {
            this.client.buyLimit2(clientId, price, size);
        } catch (e) {
            this.onerror(e);
            return false;
        }
        return true;
    }
    async sellLimit(price: number, size: number): Promise<boolean> {
        const clientId = await this.getClientId();
        this.consetEffort(clientId, OrderSide.SELL, OrderType.LIMIT, price, size, false);
        try {
            this.client.sellLimit(clientId, price, size);
        } catch (e) {
            this.onerror(e);
            return false;
        }
        return true;
    }
    async sellLimit2(price: number, size: number): Promise<boolean> {
        const clientId = await this.getClientId();
        this.consetEffort(clientId, OrderSide.SELL, OrderType.LIMIT, price, size, false);
        try {
            this.client.sellLimit2(clientId, price, size);
        } catch (e) {
            this.onerror(e);
            return false;
        }
        return true;
    }
    async closeLimit(side: PositionSide, price: number, size: number, goodTillTime: number): Promise<boolean> {
        const clientId = await this.getClientId();
        const sd = side === PositionSide.LONG ? OrderSide.SELL : OrderSide.BUY;
        this.consetEffort(clientId, sd, OrderType.LIMIT, price, size, true);
        try {
            this.client.closeLimit(clientId, side, price, size, goodTillTime);
        } catch (e) {
            this.onerror(e);
            return false;
        }
        return true;
    }
    async cancel(order: Order): Promise<boolean> {
        // 添加到待撤单列表
        this.cancelingOrders.set(order.id, order);
        // this.client.cancel(order);
        this.ensureCanceling();
        return true;
    }
    stop() {
        conlog(`${this.settings.Name} client stop ...`);
        this.client.destroy();
    }

    async restart(): Promise<void> {
        conlog(`${this.settings.Name} client restarting ...`);
        this.client.destroy();
        // 等待3s
        await sleep(1000);
        this.client.initialize();
    }

    abstract onerror(err: any): void;

    // 用时间戳作为clientid
    async getClientId(): Promise<number> {
        while (Date.now() - this.lastOrderTime < this.settings.OrderInterval * 1000) {
            await sleep(500);
        }
        this.lastOrderTime = Date.now();
        return Math.trunc(this.lastOrderTime / 1000);
    }
}