// Corrección mínima C5: paso a ES Modules.
import { Router } from 'express';
import { z } from 'zod';
import * as supplierController from '../controllers/supplier.controller.js';
const router = Router();

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactName: z.string().optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().optional().nullable(),
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
      message: 'Validation Error'
    });
  }
};

router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', validate(supplierSchema), supplierController.createSupplier);
router.put('/:id', validate(supplierSchema.partial()), supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

export default router;
