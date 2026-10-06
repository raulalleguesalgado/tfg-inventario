// Corrección mínima C5: paso a ES Modules.
import * as supplierRepository from '../repositories/supplier.repository.js';

const getAll = async () => {
  return await supplierRepository.findAll();
};

const getById = async (id) => {
  const supplier = await supplierRepository.findById(id);
  if (!supplier) throw new Error('Supplier not found');
  return supplier;
};

const create = async (data) => {
  return await supplierRepository.create(data);
};

const update = async (id, data) => {
  await getById(id);
  return await supplierRepository.update(id, data);
};

const remove = async (id) => {
  const supplier = await getById(id);

  if (supplier._count && supplier._count.products > 0) {
    throw new Error('Cannot delete supplier with associated products');
  }

  return await supplierRepository.remove(id);
};

export { getAll, getById, create, update, remove };
