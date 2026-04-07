import { Router } from 'express';
import { z } from 'zod';
import { categoryController } from '../controllers/category.controller.js';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable()
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      data: null,
      error: error.errors,
      message: 'Validation failed'
    });
  }
};

const validateId = z.string().uuid();

const validateParams = (req, res, next) => {
  try {
    validateId.parse(req.params.id);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      data: null,
      error: 'Invalid UUID format',
      message: 'Validation failed'
    });
  }
};

router.get('/', categoryController.getAll);
router.get('/:id', validateParams, categoryController.getById);
router.post('/', validate(categorySchema), categoryController.create);
router.put('/:id', validateParams, validate(categorySchema), categoryController.update);
router.delete('/:id', validateParams, categoryController.delete);

export default router;
