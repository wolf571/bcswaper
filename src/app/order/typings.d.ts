// 
declare namespace API {
  //订单结构
  interface Order {
    id: string,
    name: string,
    account: string,
    symbol: string,
    //PositionSide
    side: string,
    // OrderType
    type: string,
    // OrderStatus
    status: string,
    price: number,
    size: number,
    // 成交数
    filled: number,
    filledPrice: number,
    clientId: string,
    timeInForce: string,
    reduceOnly: boolean,
    orderFlags: string,
    goodTilBlock?: string,
    createAt?: Date,
    updateAt?: Date,
  }
}