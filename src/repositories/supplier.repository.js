const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const findAll = async () => {
  return await prisma.supplier.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

const findById = async (id) => {
  return await prisma.supplier.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } }
  });
};

const create = async (data) => {
  return await prisma.supplier.create({ data });
};

const update = async (id, data) => {
  return await prisma.supplier.update({
    where: { id },
    data
  });
};

const remove = async (id) => {
  return await prisma.supplier.delete({
    where: { id }
  });
};

module.exports = { findAll, findById, create, update, remove };
