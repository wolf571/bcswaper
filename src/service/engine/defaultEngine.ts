import { ClientParams } from "@/service/client";
import { AbstractEngine } from "./engines";
import { conerr } from "@/utils/bchelper";

// 
export class DefaultEngine extends AbstractEngine {
    constructor(clientParams: ClientParams) {
        super();
    }
    onerror(err: any): void {
        conerr(err);
    }
}