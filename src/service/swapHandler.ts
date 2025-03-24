'use server'
// 策略执行器
// 对策略的启动、运行和停止进行管理
import { ClientParams } from "@/service/client";
import { EngineFactory } from "@/service/engine";
import { conlog, conerr, dynamicTsc } from "@/utils/bchelper";

// 生成代码
export const generate = async (className: string, code: string, params?: string) => {
    // 替换操作
    const regClass = /class[\t\s]+.+[\t\s]+extends[\s\t]+SwapUser[\s\t]*{/;
    code = code?.replace(regClass, `class ${className} extends SwapUser {
    constructor() {
        super();
    }
    `);

    code = importLibs + code;

    if (params) {
        const paramsClass = `
    class Params {
        ${params}
    }`;
        code += paramsClass
    }

    conlog(`code generated: `, code);
    return code;
};

// 生成代码并运行
export const instanse = async (className: string, exchange: string, code: string, params: {}, clientParams: ClientParams) => {
    const compiledText = await dynamicTsc(code);

    const { Candle, CandleResolution, Order, Fill, OrderSide, OrderStatus, OrderType,
        AccountInfo, PositionSide, PositionData } = require("@/service/client");
    const { SwapUser } = require("@/service/swapUser");
    let clazz!: any;
    const cc = compiledText.concat(`\nclazz = ${className};\nreturn clazz;`);
    // console.log("cc: ", cc)

    const executeCode = new Function("Candle", "CandleResolution", "Order", "Fill", "OrderSide", "OrderStatus", "OrderType",
        "AccountInfo", "PositionSide", "PositionData",
        "SwapUser", "clazz", cc);
    clazz = executeCode(Candle, CandleResolution, Order, Fill, OrderSide, OrderStatus, OrderType,
        AccountInfo, PositionSide, PositionData,
        SwapUser, clazz);
    // console.log("clazz:", clazz)

    const obj = new clazz();
    if (clazz == null || typeof clazz === undefined) {
        console.error("null clazz");
        return null;
    }

    obj.name = className;
    obj.symbol = clientParams.symbol;
    obj.params = params;
    obj.bcswap = await EngineFactory().get(exchange, clientParams);
    return obj;
};

// swapUser依赖包
const importLibs = `
// 
// import { Candle, CandleResolution, Order, Fill, OrderSide, OrderStatus, OrderType, PositionSide } from "@/service/client";
// import { SwapUser } from "@/service/swapUser";
`;