import { Router } from 'express';
import { z } from 'zod';
import { ProductController } from '../controllers/product.controller.js';

const router = Router();
const controller = new ProductController();

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  reference: z.string().optional(),
  purchasePrice: z.number().positive(),
  salePrice: z.number().positive(),
  currentStock: z.number().int().nonnegative(),
  minStock: z.number().int().nonnegative(),
  categoryId: z.string().uuid(),
  supplierId: z.string().uuid()
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (err) {
    res.status(400).json({ success: false, data: null, error: err.errors, message: 'Validation failed' });
  }
};

router.get('/', controller.getAll);
router.get('/alerts', controller.getLowStock);
router.get('/:id', controller.getById);
router.post('/', validate(productSchema), controller.create);
router.put('/:id', validate(productSchema.partial()), controller.update);
router.delete('/:id', controller.delete);

export default router;
