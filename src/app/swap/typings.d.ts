// 
declare namespace API {
  //交易结构
  interface Swap {
    id: string,
    name: string,
    // 策略id
    strategy: string,
    // 交易所
    exchange: string,
    // 账户
    account: string,
    //子账户
    subaccount: number,
    // 运行状态,true/false
    status: boolean;
    // 默认品种
    symbol: string,
    // 结算币种
    ccy: string,
    // 创建时间
    createAt?: Date,
    updateAt?: Date,
    // 策略参数，json
    params: string,
  }

  // account data pojo
  interface AccountInfo {
    id: string,
    account: string,
    name: string,
    // 交易所
    exchange: string
  }
}