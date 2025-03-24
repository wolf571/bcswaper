// 
declare namespace API {
  //账户结构
  interface DydxAccount {
    id: string,
    // account name
    name: string,
    // address
    address: string,
    // private key
    privateKey: string,
    // 提示词
    mnemonic: string,
    // 创建时间
    createAt?: Date,
    updateAt?: Date,
  }
}