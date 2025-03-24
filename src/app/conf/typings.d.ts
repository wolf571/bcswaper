// 
declare namespace API {
  //配置
  interface Conf {
    // ===1
    id: number,
    // 语言
    locale: string,
    // 对于BEST_EFFORT_CANCELED状态的订单，至少等几秒再考虑重新报单
    // 至少3s内不作处理，还有可能成交3
    bestEffortSeconds: number,
    // 下单间隔s
    orderInterval: number,
    // 下单重试次数
    effortTimes: number,
    // 下单重试间隔s
    effortInterval: number,
    // 撤单重试次数
    cancelingTimes: number,
    // 撤单重试间隔s
    cancelingInterval: number,
    // 扫单时给出的溢/折价
    marketSpreads: number,
    // 订单缓存时间day
    orderCacheDays: number,
    // 日志保留时间day
    logKeepDays: number,
  }
}