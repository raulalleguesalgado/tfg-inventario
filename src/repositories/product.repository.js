import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ProductRepository {
  async findAll() {
    return prisma.product.findMany({
      include: { category: true, supplier: true }
    });
  }

  async findById(id) {
    return prisma.product.findUnique({
      where: { id },
      include: { category: true, supplier: true }
    });
  }

  async findLowStock() {
    return prisma.product.findMany({
      where: {
        currentStock: {
          lte: prisma.product.fields.minStock
        }
      },
      include: { category: true, supplier: true }
    });
  }

  async create(data) {
    return prisma.product.create({ data });
  }

  async update(id, data) {
    return prisma.product.update({
      where: { id },
      data
    });
  }

  async delete(id) {
    return prisma.product.delete({
      where: { id }
    });
  }
}
