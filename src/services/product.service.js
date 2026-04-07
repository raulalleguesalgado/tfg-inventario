import { ProductRepository } from '../repositories/product.repository.js';

const repository = new ProductRepository();

export class ProductService {
  async getAll() {
    return repository.findAll();
  }

  async getById(id) {
    const product = await repository.findById(id);
    if (!product) throw new Error('Product not found');
    return product;
  }

  async getLowStock() {
    return repository.findLowStock();
  }

  async create(data) {
    return repository.create(data);
  }

  async update(id, data) {
    await this.getById(id);
    return repository.update(id, data);
  }

  async delete(id) {
    await this.getById(id);
    return repository.delete(id);
  }
}
