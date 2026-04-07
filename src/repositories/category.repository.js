import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const categoryRepository = {
  findAll: async () => {
    return await prisma.category.findMany({
      include: { _count: { select: { products: true } } }
    });
  },

  findById: async (id) => {
    return await prisma.category.findUnique({
      where: { id },
      include: { products: true }
    });
  },

  create: async (data) => {
    return await prisma.category.create({ data });
  },

  update: async (id, data) => {
    return await prisma.category.update({
      where: { id },
      data
    });
  },

  delete: async (id) => {
    return await prisma.category.delete({
      where: { id }
    });
  }
};
