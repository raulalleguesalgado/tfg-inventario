import { ProductService } from '../services/product.service.js';

const service = new ProductService();

export class ProductController {
  async getAll(req, res, next) {
    try {
      const data = await service.getAll();
      res.json({ success: true, data, error: null, message: 'Products retrieved' });
    } catch (err) { next(err); }
  }

  async getById(req, res, next) {
    try {
      const data = await service.getById(req.params.id);
      res.json({ success: true, data, error: null, message: 'Product retrieved' });
    } catch (err) { next(err); }
  }

  async getLowStock(req, res, next) {
    try {
      const data = await service.getLowStock();
      res.json({ success: true, data, error: null, message: 'Low stock alerts retrieved' });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const data = await service.create(req.body);
      res.status(201).json({ success: true, data, error: null, message: 'Product created' });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const data = await service.update(req.params.id, req.body);
      res.json({ success: true, data, error: null, message: 'Product updated' });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await service.delete(req.params.id);
      res.json({ success: true, data: null, error: null, message: 'Product deleted' });
    } catch (err) { next(err); }
  }
}
