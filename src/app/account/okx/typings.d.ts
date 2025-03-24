// 
declare namespace API {
  //okx账户结构
  interface OkxAccount {
    id: string,
    // account name
    name: string,
    apiKey: string,
    passphrase: string,
    secretKey: string,
    // 是否正式账号
    formally: boolean,
    // 创建时间
    createAt?: Date,
    updateAt?: Date,
  }
}