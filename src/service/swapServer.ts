// 策略执行器
// 对策略的启动、运行和停止进行管理
'use server'
import { ClientParams, DydxAccount, OkxAccount } from "@/service/client";
import { findDydxAccount, findOkxAccount, findStrategy, updateSwap } from "@/db/sqliteHandler";
import { instanse, generate, } from "@/service/swapHandler";
import { exist, generateName, get, remove, set } from "@/service/swapMapper";
import { conlog, conerr } from "@/utils/bchelper";

//启动策略
export const start = async (swap: API.Swap) => {
    conlog(`start to execute swap ${swap.name} ...`);
    // 若交易已存在，则不再启动新交易
    const s = exist(swap.exchange);
    if (s) {
        return { code: "9999", message: `swap for exchange ${swap.exchange} already exists.` }
    }

    const strategy = await findStrategy(swap.strategy);
    let jscontent = strategy?.jscontent;
    // 生成代码
    if (!jscontent) {
        return { code: "9999", message: "no strategy code exist." }
    }
    conlog(`jscontent:\n ${jscontent}`);
    const clientParams = await getClientParams(swap);
    if (!clientParams) {
        return { code: "9999", message: `no swap account info found.` }
    }
    conlog(`generating code ...`);
    const className = generateName(swap);
    const code = await generate(className, jscontent, strategy?.params);
    // execute
    let params = {};
    if (swap.params) {
        conlog(`params:\n`, swap.params);
        params = JSON.parse(swap.params);
    }
    // conlog(`clientParams:\n`, clientParams);
    const obj = await instanse(className, swap.exchange, code, params, clientParams);
    if (!obj) {
        return { code: "9999", message: "get no swap instanse." }
    }
    set(className, obj);
    conlog(`starting swap ... `, obj);
    await obj?.start();
    // 更新
    swap.status = true;
    updateSwap(swap);
    return { code: "0000", message: `swap with exchange ${swap.exchange} started.` }
}

//停止策略
export const stop = async (swap: API.Swap) => {
    const className = generateName(swap);
    conlog(`stop swap ${className} ...`);
    swap.status = false;
    updateSwap(swap);
    let s = get(className);
    if (!s) {
        return { code: "9999", message: `some thing wrong with swap ${className}` };
    }
    s.stop();
    s = null;
    remove(className);
    // 更新
    return { code: "0000", message: `swap ${className} stop.` };
}

// 获取 client params
const getClientParams = async (swap: API.Swap): Promise<ClientParams | null> => {
    switch (swap.exchange) {
        case "dydx":
            const dydxAcc = await findDydxAccount(swap.account);
            if (!dydxAcc) {
                return null;
            }
            const dydxAccount: DydxAccount = {
                address: dydxAcc.address,
                subaccount: swap.subaccount,
                mnemonic: dydxAcc.mnemonic,
            }
            return <ClientParams>{
                symbol: swap.symbol,
                ccy: swap.ccy,
                account: dydxAccount,
            };
        case "okx":
            const okxAcc = await findOkxAccount(swap.account);
            if (!okxAcc) {
                return null;
            }
            const okxAccount: OkxAccount = {
                apiKey: okxAcc.apiKey,
                passphrase: okxAcc.passphrase,
                secretKey: okxAcc.secretKey,
                formally: okxAcc.formally,
            }
            return <ClientParams>{
                symbol: swap.symbol,
                ccy: swap.ccy,
                account: okxAccount,
            };
    }
    return null;
}