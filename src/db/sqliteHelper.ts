// 

import { createLog, createOrder, findLatelyOrders, findOrder, updateOrder } from "./sqliteHandler";
import { Order, OrderTimeInForce } from "@/service/client";
import { conlog, conerr } from "@/utils/bchelper";

// 保存订单
export const saveOrder2DB = async (order: Order) => {
    // 将订单转换格式为系统订单
    const odbc = <API.Order>{
        id: order.id,
        name: `${order.side}|${order.ticker}|${order.size}`,
        account: order.account,
        symbol: order.ticker,
        // OrderSide
        side: order.side,
        // OrderType
        type: order.type,
        // OrderStatus
        status: order.status,
        price: Number(order.price),
        size: Number(order.size),
        // 成交数
        filled: Number(order.totalFilled || 0),
        filledPrice: Number(order.filledPrice || 0),
        clientId: order.clientId.toString(),
        orderFlags: order.orderFlags,
        // goodTilBlock: order.,
        timeInForce: order.timeInForce ?? OrderTimeInForce.GTT,
        reduceOnly: order.reduceOnly,
    };
    try {
        conlog(`save order to db: ${order.id}`);
        const od = await findOrder(order.id);
        if (od) {
            updateOrder(odbc);
        } else {
            createOrder(odbc);
        }
    } catch (e) {
        conlog(`error: ${e}`);
    }
}

// 获取近30日订单
export const findLatelyOrderList = async () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);

    const orders = await findLatelyOrders(date);
    return orders;
}

// 写入日志
export const writeLog = async (swapName: string, symbol: string, ...message: any[]) => {
    const content = message.map(item => typeof item == "object" ? JSON.stringify(item) : item).join(" ");
    const log = <API.Log>{
        swapName,
        symbol,
        content,
    };
    createLog(log);
}

let cacheOrders: Map<string, Order[]> = new Map();
// 缓存order map
export const cacheOrderMap = async (name: string, orders: Order[]) => {
    cacheOrders.set(name, orders);
}

export const getCacheOrderMap = () => {
    return cacheOrders;
}
export const getCacheOrderArray = (name: string) => {
    return cacheOrders.get(name);
}