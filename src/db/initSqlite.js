import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 初始化账户信息
async function main() {
  // await prisma.okxAccount.delete(
  //   {
  //     where: {
  //       name: "okx1"
  //     }
  //   }
  // );
  // const okx1 = {
  //   id: Date.now().toString(),
  //   name: "okx1",
  //   apiKey: "d7c1ee5e-f870-4f33-afc6-b59a52bf4784",
  //   passphrase: "Wolf571@126dotcom",
  //   secretKey: "2383FDE950D35A1EC9BC66DA15857B9E",
  //   formally: false,
  // }
  // await prisma.okxAccount.create({
  //   data: okx1,
  // });

  await prisma.okxAccount.delete(
    {
      where: {
        name: "okxd"
      }
    }
  );
  const okxd = {
    id: Date.now().toString(),
    name: "okxd",
    apiKey: "a57a080e-3fe3-4f2b-a8be-b28fcfcd8c06",
    passphrase: "wolf571AT126dotcom",
    secretKey: "80AEAF00B27BF01B89B91FA6E91E5D7C",
    formally: true,
  }
  await prisma.okxAccount.create({
    data: okxd,
  });

  // dydx
  // await prisma.dydxAccount.delete(
  //   {
  //     where: {
  //       name: "acc2"
  //     }
  //   }
  // );
  // await prisma.dydxAccount.delete(
  //   {
  //     where: {
  //       name: "acc3"
  //     }
  //   }
  // );
  // const acc2 = {
  //   id: Date.now().toString(),
  //   name: "acc2",
  //   address: "dydx1q4emmz7e45tq4s9lc4gcrxqxw9w50nmj9xdjt6",
  //   privateKey: "",
  //   mnemonic: "pool leader toast assume embrace easy forum track between agree valid lounge tourist present stone alpha urban can miss grow solar wife marine kitten",
  // }
  // await prisma.dydxAccount.create({
  //   data: acc2,
  // });

  // const acc3 = {
  //   id: Date.now().toString(),
  //   name: "acc3",
  //   address: "dydx15kuwh7sep9j6rjx22fdjypjtgcukvu0prvfyja",
  //   privateKey: "",
  //   mnemonic: "food account patient autumn sick science ceiling toilet scissors disease scissors huge feed improve season basic labor phrase legend release appear bag morning bulb",
  // }
  // await prisma.dydxAccount.create({
  //   data: acc3,
  // });

}

main()
  .catch(e => {
    throw e
  })
  .finally(async () => {
    await prisma.$disconnect()
  })