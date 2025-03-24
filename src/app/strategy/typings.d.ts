// 
declare namespace API {
  //策略结构
  interface Strategy {
    id: string,
    name: string,
    remark: string,
    // 交易所
    exchange: string,
    // 交易品种
    symbol: string,
    // 创建时间
    createAt?: Date,
    updateAt?: Date,
    // 策略代码
    jscontent: string,
    // 策略参数
    params: string,
  }
}