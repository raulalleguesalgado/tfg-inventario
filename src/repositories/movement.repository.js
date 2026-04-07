import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const createMovement = async (data) => {
  return await prisma.$transaction(async (tx) => {
    const movement = await tx.stockMovement.create({
      data: {
        quantity: data.quantity,
        type: data.type,
        notes: data.notes,
        productId: data.productId,
        userId: data.userId,
      },
    });

    const stockAdjustment = data.type === 'OUT' ? -data.quantity : data.quantity;

    await tx.product.update({
      where: { id: data.productId },
      data: {
        currentStock: {
          increment: stockAdjustment,
        },
      },
    });

    return movement;
  });
};

export const findByProduct = async (productId) => {
  return await prisma.stockMovement.findMany({
    where: { productId },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};
