// 

import { CandlesResolution } from "@dydxprotocol/v4-client-js/build/src/clients/socket-client";
import { CandleResolution } from "../context";

// dydx resolution 与自定义resolution关系
const resolutions: [CandlesResolution, CandleResolution][] = [
    [CandlesResolution.ONE_MINUTE, CandleResolution.MIN1],
    [CandlesResolution.FIVE_MINUTES, CandleResolution.MIN5],
    [CandlesResolution.FIFTEEN_MINUTES, CandleResolution.MIN15],
    [CandlesResolution.THIRTY_MINUTES, CandleResolution.MIN30],
    [CandlesResolution.ONE_HOUR, CandleResolution.HOUR1],
    [CandlesResolution.FOUR_HOURS, CandleResolution.HOUR4],
    [CandlesResolution.ONE_DAY, CandleResolution.DAY1],
];
// CandleResolution对应map
const resolutionMap: Map<CandlesResolution, CandleResolution> = new Map(resolutions);

// 将自定义resolution转换为api格式
export const convertResolution = (resolution: CandleResolution): CandlesResolution | null => {
    const rs = resolutions.find(([k, v], _) => v === resolution);
    if (!rs) {
        return null;
    }
    return rs[0];
}

// 将api格式resolution转换为自定义格式
export const reverseResolution = (resolution: CandlesResolution): CandleResolution | undefined => {
    return resolutionMap.get(resolution);
}