import { categoryService } from '../services/category.service.js';

export const categoryController = {
  getAll: async (req, res, next) => {
    try {
      const categories = await categoryService.getAll();
      res.json({ success: true, data: categories, error: null, message: 'Categories retrieved' });
    } catch (error) {
      next(error);
    }
  },

  getById: async (req, res, next) => {
    try {
      const category = await categoryService.getById(req.params.id);
      res.json({ success: true, data: category, error: null, message: 'Category retrieved' });
    } catch (error) {
      res.status(404).json({ success: false, data: null, error: error.message, message: 'Failed to retrieve' });
    }
  },

  create: async (req, res, next) => {
    try {
      const category = await categoryService.create(req.body);
      res.status(201).json({ success: true, data: category, error: null, message: 'Category created' });
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const category = await categoryService.update(req.params.id, req.body);
      res.json({ success: true, data: category, error: null, message: 'Category updated' });
    } catch (error) {
      next(error);
    }
  },

  delete: async (req, res, next) => {
    try {
      await categoryService.delete(req.params.id);
      res.json({ success: true, data: null, error: null, message: 'Category deleted' });
    } catch (error) {
      res.status(400).json({ success: false, data: null, error: error.message, message: 'Deletion failed' });
    }
  }
};
