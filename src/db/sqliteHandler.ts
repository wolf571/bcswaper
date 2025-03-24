// 
'use server'
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// account
// dydx
export const findDydxAccounts = async () => prisma.dydxAccount.findMany();
export const findDydxAccount = async (name: string) => prisma.dydxAccount.findFirst(
    {
        where: {
            name
        }
    }
);
export const findDydxAccountByAddress = async (address: string) => prisma.dydxAccount.findFirst(
    {
        where: {
            address
        }
    }
);
export const createDydxAccount = async (entity: API.DydxAccount) => prisma.dydxAccount.create(
    {
        data: entity,
    }
);
export const updateDydxAccount = async (entity: API.DydxAccount) => prisma.dydxAccount.update(
    {
        where: {
            id: entity.id
        },
        data: entity,
    }
);
export const deleteDydxAccount = async (id: string) => prisma.dydxAccount.delete(
    {
        where: {
            id
        }
    }
);
// okx
export const findOkxAccounts = async () => prisma.okxAccount.findMany();
export const findOkxAccount = async (name: string) => prisma.okxAccount.findFirst(
    {
        where: {
            name
        }
    }
);
export const createOkxAccount = async (entity: API.OkxAccount) => prisma.okxAccount.create(
    {
        data: entity,
    }
);
export const updateOkxAccount = async (entity: API.OkxAccount) => prisma.okxAccount.update(
    {
        where: {
            id: entity.id
        },
        data: entity,
    }
);
export const deleteOkxAccount = async (id: string) => prisma.okxAccount.delete(
    {
        where: {
            id
        }
    }
);

// conf
// id===1
export const findConf = async () => prisma.conf.findFirst(
    {
        where: {
            id: 1
        }
    }
);

export const createConf = async (entity: API.Conf) => prisma.conf.create(
    {
        data: entity,
    }
);

export const updateConf = async (entity: API.Conf) => prisma.conf.update(
    {
        where: {
            id: entity.id
        },
        data: entity,
    }
);

// strategy
export const findStrategys = async () => prisma.strategy.findMany();

export const findStrategy = async (name: string) => prisma.strategy.findFirst(
    {
        where: {
            name
        }
    }
);

export const createStrategy = async (entity: API.Strategy) => prisma.strategy.create(
    {
        data: entity,
    }
);

export const updateStrategy = async (entity: API.Strategy) => prisma.strategy.update(
    {
        where: {
            id: entity.id
        },
        data: entity,
    }
);

export const deleteStrategy = async (id: string) => prisma.strategy.delete(
    {
        where: {
            id
        }
    }
);

// swap
export const findSwaps = async () => prisma.swap.findMany();

export const findSwapById = async (id: string) => prisma.swap.findFirst(
    {
        where: {
            id
        }
    }
);

export const createSwap = async (entity: API.Swap) => prisma.swap.create(
    {
        data: entity,
    }
);

export const updateSwap = async (entity: API.Swap) => prisma.swap.update(
    {
        where: {
            id: entity.id
        },
        data: entity,
    }
);

export const deleteSwap = async (id: string) => prisma.swap.delete(
    {
        where: {
            id
        }
    }
);
// order
export const findOrder = async (id: string) => prisma.order.findFirst(
    {
        where: {
            id
        }
    }
);

export const findOrders = async (page = 0, pageSize = 10) => prisma.order.findMany({
    skip: page * pageSize,
    take: pageSize,
    orderBy: { createAt: "desc" }
});

export const findLatelyOrders = async (from: Date) => prisma.order.findMany({
    where: {
        createAt: {
            gt: from,
        },
    },
    orderBy: { createAt: "asc" }
});

export const countOrders = async () => prisma.order.count();

export const createOrder = async (entity: API.Order) => prisma.order.create(
    {
        data: entity,
    }
);

export const updateOrder = async (entity: API.Order) => prisma.order.update(
    {
        where: {
            id: entity.id
        },
        data: entity,
    }
);

export const deleteOrder = async (id: string) => prisma.order.delete(
    {
        where: {
            id
        }
    }
);

// 删除过期订单
export const deleteOrderByDate = async (date: Date) => prisma.log.deleteMany(
    {
        where: {
            createAt: {
                lt: date,
            },
        },
    }
);

// log
export const findLogs = async (page = 0, pageSize = 10) => prisma.log.findMany({
    skip: page * pageSize,
    take: pageSize,
    orderBy: { createAt: "desc" }
});

export const countLogs = async () => prisma.order.count();

export const createLog = async (entity: API.Log) => prisma.log.create(
    {
        data: entity,
    }
);

// 删除过期日志
export const deleteLog = async (date: Date) => prisma.log.deleteMany(
    {
        where: {
            createAt: {
                lt: date,
            },
        },
    }
);