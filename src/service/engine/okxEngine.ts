import { ClientParams, OkxClient } from "@/service/client";
import { AbstractEngine, ErrorType } from "./engines";
import { conerr } from "@/utils/bchelper";

// okx enchange
export class OkxEngine extends AbstractEngine {

    // 
    constructor(clientParams: ClientParams) {
        super();
        this.client = new OkxClient(clientParams);
    }
    // 错误处理
    onerror(err: any): void {
        const e: ErrorType = {
            code: err.code,
            message: err.msg,
            result: err.connId,
            remark: err.event,
        };
        conerr(e);
    }
}