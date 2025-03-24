"use server"

import { findDydxAccounts, findOkxAccounts } from "@/db/sqliteHandler";

// 获取账户信息，提取关键字段
export const findAccountInfos = async () => {
    const list: API.AccountInfo[] = new Array();
    // dydx
    const dydxs: API.DydxAccount[] = await findDydxAccounts();
    dydxs?.forEach(d => {
        const a = <API.AccountInfo>{
            id: d.id,
            account: d.address,
            name: d.name,
            // 交易所
            exchange: "dydx",
        };
        list.push(a);
    });
    // okx
    const okxs: API.OkxAccount[] = await findOkxAccounts();
    okxs?.forEach(d => {
        const a = <API.AccountInfo>{
            id: d.id,
            account: d.apiKey,
            name: d.name,
            // 交易所
            exchange: "okx",
        };
        list.push(a);
    });

    return list;
}