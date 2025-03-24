"use server"

import { findDydxAccounts, findOkxAccounts } from "@/db/sqliteHandler";
import { replaceWithStars } from "@/utils/formatter";

// 获取dydx账户信息，敏感数据脱敏
export const findDydxAccountList = async () => {
    const datas: API.DydxAccount[] = await findDydxAccounts();
    if (!datas || datas.length == 0) {
        return datas;
    }
    const list: API.DydxAccount[] = new Array();
    datas.forEach(d => {
        const d1 = d;
        const privateKey = d.privateKey;
        d1.privateKey = replaceWithStars(privateKey, 12, 48);
        const mnemonic = d.mnemonic;
        if (mnemonic?.length > 0) {
            const ms = mnemonic.split(' ');
            const msx = new Array<string>();
            ms.forEach(m => {
                const s = replaceWithStars(m, 1, m.length);
                msx.push(s);
            })
            d1.mnemonic = msx.join(" ");;
        }
        list.push(d1);
    })

    return list;
}

// 获取okx账户信息，敏感数据脱敏
export const findOkxAccountList = async () => {
    const datas: API.OkxAccount[] = await findOkxAccounts();
    if (!datas || datas.length == 0) {
        return datas;
    }
    const list: API.OkxAccount[] = new Array();
    datas.forEach(d => {
        const d1 = d;
        const apiKey = d.apiKey;
        const passphrase = d.passphrase;
        const secretKey = d.secretKey;
        d1.apiKey = replaceWithStars(apiKey, 5, apiKey.length);
        d1.passphrase = replaceWithStars(passphrase, 3, passphrase.length);
        d1.secretKey = replaceWithStars(secretKey, 5, secretKey.length);
        list.push(d1);
    })

    return list;
}