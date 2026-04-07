import { categoryRepository } from '../repositories/category.repository.js';

export const categoryService = {
  getAll: async () => {
    return await categoryRepository.findAll();
  },

  getById: async (id) => {
    const category = await categoryRepository.findById(id);
    if (!category) throw new Error('Category not found');
    return category;
  },

  create: async (data) => {
    return await categoryRepository.create(data);
  },

  update: async (id, data) => {
    await categoryService.getById(id);
    return await categoryRepository.update(id, data);
  },

  delete: async (id) => {
    const category = await categoryRepository.findById(id);
    if (!category) throw new Error('Category not found');

    if (category.products && category.products.length > 0) {
      throw new Error('Cannot delete category with associated products');
    }

    return await categoryRepository.delete(id);
  }
};
