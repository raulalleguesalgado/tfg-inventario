import { Router } from 'express';
import { z } from 'zod';
import * as userController from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.enum(['ADMIN', 'OPERATOR']).optional(),
});

const validateUpdate = (req, res, next) => {
  try {
    updateUserSchema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.errors,
      message: 'Validation failed',
    });
  }
};

router.use(authenticate);

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.put('/:id', authorize('ADMIN'), validateUpdate, userController.update);

export default router;
