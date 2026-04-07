const supplierService = require('../services/supplier.service');

const getAllSuppliers = async (req, res, next) => {
  try {
    const suppliers = await supplierService.getAll();
    res.json({ success: true, data: suppliers, error: null, message: 'Suppliers retrieved' });
  } catch (error) {
    next(error);
  }
};

const getSupplierById = async (req, res, next) => {
  try {
    const supplier = await supplierService.getById(req.params.id);
    res.json({ success: true, data: supplier, error: null, message: 'Supplier retrieved' });
  } catch (error) {
    res.status(404).json({ success: false, data: null, error: error.message, message: 'Failed' });
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.create(req.body);
    res.status(201).json({ success: true, data: supplier, error: null, message: 'Supplier created' });
  } catch (error) {
    next(error);
  }
};

const updateSupplier = async (req, res, next) => {
  try {
    const supplier = await supplierService.update(req.params.id, req.body);
    res.json({ success: true, data: supplier, error: null, message: 'Supplier updated' });
  } catch (error) {
    next(error);
  }
};

const deleteSupplier = async (req, res, next) => {
  try {
    await supplierService.remove(req.params.id);
    res.json({ success: true, data: null, error: null, message: 'Supplier deleted' });
  } catch (error) {
    res.status(400).json({ success: false, data: null, error: error.message, message: 'Deletion failed' });
  }
};

module.exports = { getAllSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier };
