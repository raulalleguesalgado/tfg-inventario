// CORRECCIÓN MÍNIMA C6: añadido authenticate — Patrón 8
// El controller usa req.user.id pero el LLM no añadió el middleware en las rutas.
// Sin esto movements falla siempre con "Cannot read properties of undefined (reading 'id')".
import { Router } from 'express';
import { z } from 'zod';
import * as movementController from '../controllers/movement.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authenticate);

const createMovementSchema = z.object({
  body: z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    notes: z.string().optional(),
  }),
});

const getByProductSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      data: null,
      error: error.errors,
      message: 'Validation failed',
    });
  }
};

router.post('/', validate(createMovementSchema), movementController.registerMovement);
router.get('/product/:id', validate(getByProductSchema), movementController.getByProduct);

export default router;
