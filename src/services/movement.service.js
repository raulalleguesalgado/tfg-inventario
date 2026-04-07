import * as movementRepository from '../repositories/movement.repository.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const register = async (data) => {
  const product = await prisma.product.findUnique({
    where: { id: data.productId },
    select: { currentStock: true },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  if (data.type === 'OUT' && product.currentStock < data.quantity) {
    throw new Error('Insufficient stock for this movement');
  }

  return await movementRepository.createMovement(data);
};

export const getByProduct = async (productId) => {
  return await movementRepository.findByProduct(productId);
};
