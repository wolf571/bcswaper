// 
declare namespace API {
  //日志结构
  interface Log {
    id: string,
    swapName: string,
    symbol: string,
    content: string,
    createAt?: Date,
  }
}